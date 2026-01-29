# Word Highlighter - VS Code Extension

A powerful VS Code extension that allows you to highlight words in code files with the F8 key. Perfect for code review, debugging, and focusing on specific terms in your codebase.

## Features

- **F8 Toggle Highlight**: Press F8 to highlight/unhighlight the word at cursor position
- **Multi-Word Support**: Highlight multiple different words simultaneously
- **Colorful Highlights**: Each word gets a distinct color from a configurable palette
- **Persistent Storage**: Highlights are saved and restored when you reopen the project
- **Case Sensitive**: Configurable case-sensitive matching
- **Whole Word Matching**: Only highlights whole words, not partial matches
- **Overview Ruler**: Highlights appear in the overview ruler for easy navigation

## Usage

1. **Basic Highlighting**:
   - Place cursor on any word in your code
   - Press `F8` to highlight all occurrences of that word in the current file
   - Press `F8` again on the same word to remove the highlight

2. **Multiple Words**:
   - You can highlight multiple different words
   - Each word gets a different color automatically

3. **Clear All Highlights**:
   - Use the command palette (`Ctrl+Shift+P`)
   - Search for "Clear All Highlights" command

## Commands

- `Word Highlighter: Toggle Word Highlight` - Toggle highlight for word at cursor (bound to F8)
- `Word Highlighter: Clear All Highlights` - Remove all highlights

## Installation

### From Source
1. Clone this repository
2. Run `pnpm install` in the extension directory
3. Press `F5` to start debugging in a new Extension Development Host window

### From VSIX (when published)
1. Download the `.vsix` file
2. In VS Code, go to Extensions view (`Ctrl+Shift+X`)
3. Click the "..." menu and select "Install from VSIX..."
4. Select the downloaded file

## Development

### Prerequisites
- Node.js (v14 or higher)
- pnpm (package manager)
- VS Code Extension Development environment

### Build
```bash
cd word-highlighter
pnpm install
pnpm run compile
```

### Debug
1. Open the project in VS Code
2. Press `F5` to start debugging
3. A new VS Code window will open with the extension loaded
4. Test the extension in the new window

### Package
```bash
pnpm run package
```

## Known Issues

- Large files with many highlights may experience performance impact
- Highlights are file-specific and don't work across multiple files simultaneously
- Unicode characters in words may not be highlighted correctly in some cases

## Release Notes

### 0.1.0
- Initial release
- Basic word highlighting with F8
- Multiple word support with different colors
- Persistent storage of highlights
- Configurable colors and case sensitivity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## License

This extension is licensed under the Apache 2.0 License.

## Support

If you encounter any issues or have feature requests, please file an issue on the GitHub repository.

---

**Enjoy highlighting your code!**