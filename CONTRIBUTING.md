# Contributing to Codebase MCP Server

Thank you for your interest in contributing to the Codebase MCP Server! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node.js version, editor)
- Relevant logs or error messages

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:
- A clear description of the feature
- Use cases and benefits
- Possible implementation approach (optional)
- Examples of similar features in other tools (optional)

### Pull Requests

1. **Fork the repository** and create your branch from `develop`
   ```bash
   git checkout -b feature/my-feature develop
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation

3. **Test your changes**
   ```bash
   npm install
   npm run build
   npm run dev
   ```

4. **Commit your changes**
   ```bash
   git commit -am 'Add new feature: description'
   ```
   
   Use clear commit messages:
   - `feat: Add support for Python requirements.txt`
   - `fix: Resolve path traversal security issue`
   - `docs: Update VS Code setup guide`
   - `refactor: Simplify language detection logic`

5. **Push to your fork**
   ```bash
   git push origin feature/my-feature
   ```

6. **Open a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Explain what changes you made and why

## Development Setup

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn
- Git

### Setup Steps
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/codebase-mcp-server.git
cd codebase-mcp-server

# Add upstream remote
git remote add upstream https://github.com/Borelli-7/codebase-mcp-server.git

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Check code coverage
npm run test:coverage
```

## Project Structure

```
codebase-mcp-server/
├── src/
│   ├── index.ts           # Main MCP server entry point
│   ├── codebaseLoader.ts  # Core codebase loading logic
│   └── config.ts          # Configuration management
├── examples/              # Example configurations and usage
├── dist/                  # Compiled JavaScript output
├── docs/                  # Additional documentation
├── tests/                 # Test files
└── README.md             # Main documentation
```

## Coding Standards

### TypeScript Style
- Use TypeScript strict mode
- Prefer interfaces over type aliases for objects
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use async/await over promises

Example:
```typescript
/**
 * Load file content from the codebase
 * @param relativePath - Relative path from codebase root
 * @returns File data including content and metadata
 */
async loadFile(relativePath: string): Promise<FileData> {
  // Implementation
}
```

### Error Handling
- Always handle errors gracefully
- Provide meaningful error messages
- Log errors to stderr (not stdout)

Example:
```typescript
try {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  throw new Error(`Failed to read file: ${errorMessage}`);
}
```

### Security
- Validate all user inputs
- Prevent path traversal attacks
- Don't log sensitive information
- Use secure defaults

Example:
```typescript
// Security check: ensure path is within codebase
const resolvedPath = path.resolve(fullPath);
const resolvedBase = path.resolve(baseDir);
if (!resolvedPath.startsWith(resolvedBase)) {
  throw new Error('Access denied: path is outside codebase directory');
}
```

## Documentation

### Code Documentation
- Add JSDoc comments for all public functions and classes
- Include parameter descriptions and return types
- Provide usage examples for complex functions

### User Documentation
- Update README.md for new features
- Add examples to USAGE_EXAMPLES.md
- Update setup guides if configuration changes

### Changelog
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format
- Categorize changes: Added, Changed, Deprecated, Removed, Fixed, Security

## Testing Guidelines

### Unit Tests
- Write tests for new features
- Test edge cases and error conditions
- Use descriptive test names

Example:
```typescript
describe('CodebaseLoader', () => {
  describe('loadFile', () => {
    it('should load file content successfully', async () => {
      // Test implementation
    });

    it('should throw error for path traversal attempts', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests
- Test MCP tool interactions
- Verify output schemas
- Test with different project types

## Adding New Features

### Adding a New Language
1. Add language mapping in `CodebaseLoader.LANGUAGE_MAP`
2. Update documentation
3. Add tests with sample files

### Adding a New Dependency Format
1. Add parsing logic in `getModuleDependencies()`
2. Handle file format-specific errors
3. Update documentation with examples
4. Add tests

### Adding a New MCP Tool
1. Define tool in `src/index.ts` using `server.registerTool()`
2. Implement handler function
3. Define input/output schemas with Zod
4. Add error handling
5. Update README.md with tool documentation
6. Add usage examples

Example:
```typescript
server.registerTool(
  'my-new-tool',
  {
    title: 'My New Tool',
    description: 'Description of what it does',
    inputSchema: {
      param: z.string().describe('Parameter description')
    },
    outputSchema: {
      result: z.string()
    }
  },
  async ({ param }) => {
    // Implementation
    const output = { result: 'value' };
    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
      structuredContent: output
    };
  }
);
```

## Performance Considerations

- Use streaming for large files when possible
- Implement caching for frequently accessed data
- Limit recursion depth in file traversal
- Use ignore patterns to skip unnecessary directories

## Debugging

### Enable Debug Logging
```typescript
// In development
console.error('Debug:', data);  // Logs to stderr
```

### Test Manually
```bash
# Run server and test with sample input
echo '{"method":"tools/list"}' | node dist/index.js
```

## Review Process

1. All pull requests require review before merging
2. Address review feedback promptly
3. Keep PRs focused and reasonably sized
4. Update your PR if the base branch changes

## Getting Help

- Open an issue for questions
- Join discussions in GitHub Discussions
- Check existing issues and documentation first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for specific contributions
- GitHub contributors page
- Release notes for significant features

Thank you for contributing to making Codebase MCP Server better!
