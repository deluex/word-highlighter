import * as vscode from 'vscode';

interface HighlightInfo {
	word: string;
	color: string;
	decorations: vscode.TextEditorDecorationType[];
	requireWordBoundary: boolean;
}

class WordHighlighter implements vscode.Disposable {
	private static readonly WORKSPACE_STATE_HIGHLIGHTS: string = "wordHighlighter.highlights";

	private context: vscode.ExtensionContext;
	private subscriptions: vscode.Disposable[] = [];
	private highlights: Map<string, HighlightInfo> = new Map();
	private colorUsageCount: Map<string, number> = new Map();
	private defaultColors!: string[];
	private caseSensitive!: boolean;
	private useContrastColor!: boolean;
	private defaultTextColor!: string;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;

		this.registerCommands();
		this.registerEventListeners();
		this.loadConfiguration();
		this.loadSavedHighlights();
	}

	private registerCommands(): void {
		const toggleCommand = vscode.commands.registerCommand(
			'word-highlighter.toggleWordHighlight',
			() => this.toggleWordHighlight()
		);
		this.subscriptions.push(toggleCommand);

		const clearCommand = vscode.commands.registerCommand(
			'word-highlighter.clearAllHighlights',
			() => this.clearAllHighlights()
		);
		this.subscriptions.push(clearCommand);
	}

	private registerEventListeners(): void {
		const configDisposable = vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('wordHighlighter')) {
				this.loadConfiguration();
			}
		});
		this.subscriptions.push(configDisposable);

		const docDisposable = vscode.workspace.onDidChangeTextDocument(e => {
			this.updateHighlightsForDocument(e.document);
		});
		this.subscriptions.push(docDisposable);

		const editorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				this.updateHighlightsForEditor(editor);
			}
		});
		this.subscriptions.push(editorDisposable);
	}

	public applyInitialHighlights(): void {
		if (vscode.window.visibleTextEditors.length > 0) {
			this.updateAllHighlights();
		} else {
			const disposable = vscode.window.onDidChangeActiveTextEditor(() => {
				this.updateAllHighlights();
				disposable.dispose();
			});
			this.subscriptions.push(disposable);
		}
	}

	private loadConfiguration() {
		const config = vscode.workspace.getConfiguration('wordHighlighter');

		this.defaultColors = config.get<string[]>('defaultColors')!;
		this.caseSensitive = config.get<boolean>('caseSensitive')!;
		this.useContrastColor = config.get<boolean>('useContrastColor')!;
		this.defaultTextColor = config.get<string>('defaultTextColor')!;

		this.updateColorUsage();
	}

	private updateColorUsage() {
		this.colorUsageCount.clear();

		this.highlights.forEach(highlight => {
			const currentCount = this.colorUsageCount.get(highlight.color) || 0;
			this.colorUsageCount.set(highlight.color, currentCount + 1);
		});
	}

	private loadSavedHighlights() {
		const savedHighlights = this.context.workspaceState.get<HighlightInfo[]>(
			WordHighlighter.WORKSPACE_STATE_HIGHLIGHTS, []);
		savedHighlights.forEach(savedHighlight => {
			const highlightInfo = this.createHighlightInfo(
				savedHighlight.word,
				savedHighlight.color,
				savedHighlight.requireWordBoundary);
			this.highlights.set(highlightInfo.word, highlightInfo);
		});

		this.updateColorUsage();
		this.updateAllHighlights();
	}

	private saveHighlights() {
		const highlightsArray = Array.from(this.highlights.values());
		this.context.workspaceState.update(WordHighlighter.WORKSPACE_STATE_HIGHLIGHTS, highlightsArray);
	}

	private getNextColor(): string {
		let selectedColor = this.defaultColors[0];
		let minUsageCount = Infinity;

		for (const color of this.defaultColors) {
			const usageCount = this.colorUsageCount.get(color) || 0;
			if (usageCount < minUsageCount) {
				minUsageCount = usageCount;
				selectedColor = color;
				if (minUsageCount === 0) {
					break;
				}
			}
		}

		this.colorUsageCount.set(selectedColor, minUsageCount + 1);
		return selectedColor;
	}

	private createDecorationType(color: string): vscode.TextEditorDecorationType {
		const textColor = this.useContrastColor ? this.getContrastColor(color) : this.defaultTextColor;

		return vscode.window.createTextEditorDecorationType({
			backgroundColor: color,
			color: textColor,
			borderRadius: '2px',
			overviewRulerColor: color,
			overviewRulerLane: vscode.OverviewRulerLane.Right
		});
	}

	private getContrastColor(hexColor: string): string {
		const r = parseInt(hexColor.slice(1, 3), 16);
		const g = parseInt(hexColor.slice(3, 5), 16);
		const b = parseInt(hexColor.slice(5, 7), 16);

		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		return luminance > 0.5 ? '#000000' : '#FFFFFF';
	}

	private getWordAtCursor(editor: vscode.TextEditor): { word: string; isFromSelection: boolean; range: vscode.Range } | null {
		const document = editor.document;

		if (!editor.selection.isEmpty) {
			const text = document.getText(editor.selection);
			return {
				word: text,
				isFromSelection: true,
				range: editor.selection
			};
		}

		const position = editor.selection.active;
		const wordRange = document.getWordRangeAtPosition(position);

		if (!wordRange) {
			return null;
		}

		const word = document.getText(wordRange);
		return {
			word: word,
			isFromSelection: false,
			range: wordRange
		};
	}

	private findWordOccurrences(document: vscode.TextDocument, textToFind: string): vscode.Range[] {
		const text = document.getText();
		const ranges: vscode.Range[] = [];
		const searchText = this.caseSensitive ? textToFind : textToFind.toLowerCase();
		const documentText = this.caseSensitive ? text : text.toLowerCase();

		let index = 0;
		while (index < documentText.length) {
			const foundIndex = documentText.indexOf(searchText, index);
			if (foundIndex === -1) {
				break;
			}

			const startPos = document.positionAt(foundIndex);
			const endPos = document.positionAt(foundIndex + searchText.length);
			ranges.push(new vscode.Range(startPos, endPos));

			index = foundIndex + 1;
		}

		return ranges;
	}

	private findWordOccurrencesWithBoundary(document: vscode.TextDocument, word: string): vscode.Range[] {
		const ranges: vscode.Range[] = [];
		const textLength = document.getText().length;
		const normalizedTargetWord = this.caseSensitive ? word : word.toLowerCase();

		for (let i = 0; i < textLength; i++) {
			const position = document.positionAt(i);
			const wordRange = document.getWordRangeAtPosition(position);

			if (wordRange && !wordRange.isEmpty) {
				const currentWord = document.getText(wordRange);
				const normalizedCurrentWord = this.caseSensitive ? currentWord : currentWord.toLowerCase();

				if (normalizedCurrentWord === normalizedTargetWord) {
					// Avoid adding duplicate ranges
					if (!ranges.some(r => r.isEqual(wordRange))) {
						ranges.push(wordRange);
					}
					// Skip to the end of this word to avoid redundant checks
					i = document.offsetAt(wordRange.end);
				}
			}
		}

		return ranges;
	}

	public toggleWordHighlight() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const wordInfo = this.getWordAtCursor(editor);
		if (!wordInfo) {
			return;
		}

		const normalizedWord = this.caseSensitive ? wordInfo.word : wordInfo.word.toLowerCase();

		if (this.highlights.has(normalizedWord)) {
			this.removeHighlight(normalizedWord);
		} else {
			this.addHighlight(wordInfo);
		}
	}

	private createHighlightInfo(word: string, color: string, requireWordBoundary: boolean): HighlightInfo {
		const normalizedWord = this.caseSensitive ? word : word.toLowerCase();
		const decorationType = this.createDecorationType(color);

		return {
			word: normalizedWord,
			color: color,
			decorations: [decorationType],
			requireWordBoundary: requireWordBoundary
		};
	}

	private addHighlight(wordInfo: { word: string; isFromSelection: boolean; range: vscode.Range }) {
		const color = this.getNextColor();
		// requireWordBoundary is false when word is from selection, true when from cursor
		const requireWordBoundary = !wordInfo.isFromSelection;
		const highlightInfo = this.createHighlightInfo(wordInfo.word, color, requireWordBoundary);

		this.highlights.set(highlightInfo.word, highlightInfo);
		this.updateAllHighlights();
		this.saveHighlights();
	}

	private removeHighlight(normalizedWord: string) {
		const highlightInfo = this.highlights.get(normalizedWord);
		if (!highlightInfo) {
			return;
		}

		const currentCount = this.colorUsageCount.get(highlightInfo.color) || 0;
		if (currentCount > 0) {
			this.colorUsageCount.set(highlightInfo.color, currentCount - 1);
		}

		highlightInfo.decorations.forEach(decoration => decoration.dispose());
		this.highlights.delete(normalizedWord);
		this.updateAllHighlights();
		this.saveHighlights();
	}

	public clearAllHighlights() {
		this.highlights.forEach(highlightInfo => {
			highlightInfo.decorations.forEach(decoration => decoration.dispose());
		});
		this.highlights.clear();
		this.colorUsageCount.clear();
		this.updateAllHighlights();
		this.saveHighlights();
	}

	private updateHighlightsForDocument(document: vscode.TextDocument) {
		const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
		if (editor) {
			this.updateHighlightsForEditor(editor);
		}
	}

	private updateHighlightsForEditor(editor: vscode.TextEditor) {
		this.highlights.forEach((highlightInfo) => {
			const word = highlightInfo.word;
			const ranges = highlightInfo.requireWordBoundary
				? this.findWordOccurrencesWithBoundary(editor.document, word)
				: this.findWordOccurrences(editor.document, word);

			highlightInfo.decorations.forEach(decoration => {
				editor.setDecorations(decoration, ranges);
			});
		});
	}

	public updateAllHighlights() {
		vscode.window.visibleTextEditors.forEach(editor => {
			this.updateHighlightsForEditor(editor);
		});
	}

	public dispose(): void {
		this.subscriptions.forEach(disposable => disposable.dispose());
		this.subscriptions = [];
		this.clearAllHighlights();
	}
}

let highlighter: WordHighlighter | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Word Highlighter extension is now active!');

	highlighter = new WordHighlighter(context);
	context.subscriptions.push(highlighter);
	highlighter.applyInitialHighlights();
}

export function deactivate() {
	highlighter?.dispose();
	highlighter = undefined;
}
