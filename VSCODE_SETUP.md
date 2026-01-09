# VS Code Integration

This guide will help you integrate the Codebase MCP Server with VS Code.

## Prerequisites

- Node.js 18.0.0 or higher
- VS Code with GitHub Copilot extension
- The codebase-mcp-server installed

## Installation

1. Install the MCP server globally or in your project:

```bash
npm install -g codebase-mcp-server
# or
npm install codebase-mcp-server
```

2. Build the server:

```bash
cd /path/to/codebase-mcp-server
npm install
npm run build
```

## Configuration

### Option 1: Global Installation

If you installed globally, configure VS Code to use the MCP server:

1. Open VS Code settings (File > Preferences > Settings or `Cmd/Ctrl + ,`)
2. Search for "MCP" or "Model Context Protocol"
3. Add the server configuration to your `settings.json`:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": {
        "codebase": {
          "command": "codebase-mcp-server"
        }
      }
    }
  }
}
```

### Option 2: Local Installation

If you installed locally or are developing the server:

1. Create or edit your VS Code settings file at:
   - **macOS/Linux**: `~/.config/Code/User/settings.json`
   - **Windows**: `%APPDATA%\Code\User\settings.json`

2. Add the following configuration:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": {
        "codebase": {
          "command": "node",
          "args": [
            "/absolute/path/to/codebase-mcp-server/dist/index.js"
          ]
        }
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/codebase-mcp-server` with the actual absolute path to your installation.

### Option 3: Using npx

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": {
        "codebase": {
          "command": "npx",
          "args": [
            "-y",
            "codebase-mcp-server"
          ]
        }
      }
    }
  }
}
```

## Verify Installation

1. Restart VS Code
2. Open the Command Palette (`Cmd/Ctrl + Shift + P`)
3. Type "GitHub Copilot: Show MCP Servers"
4. You should see "codebase" listed as an available server

## Usage

Once configured, you can use the MCP server with GitHub Copilot Chat:

1. Open GitHub Copilot Chat (click the chat icon or use `Cmd/Ctrl + Shift + I`)
2. Use the following commands:

### Set Codebase Path
```
@workspace /codebase-set-path /path/to/your/project
```

### List Codebase Structure
```
@workspace Show me the structure of the codebase
```

### Load File Content
```
@workspace Load the content of src/index.ts
```

### Search Codebase
```
@workspace Search for files containing "authentication"
```

### Get Dependencies
```
@workspace What are the dependencies of this project?
```

## Example Workflow

Here's a typical workflow when working with a new codebase:

1. **Set the codebase path**:
   ```
   @workspace Set codebase to /home/user/projects/myapp
   ```

2. **Explore the structure**:
   ```
   @workspace Show me the codebase structure with max depth 2
   ```

3. **Search for specific files**:
   ```
   @workspace Search for TypeScript files containing "API"
   ```

4. **Load and analyze files**:
   ```
   @workspace Load src/services/api.ts
   @workspace Explain what this code does
   ```

5. **Check dependencies**:
   ```
   @workspace What are the module dependencies?
   ```

## Troubleshooting

### Server Not Found

If VS Code can't find the server:

1. Check that the path in your configuration is correct
2. Verify the server is built: `npm run build`
3. Try using the full path to the node executable:
   ```json
   {
     "command": "/usr/local/bin/node",
     "args": ["/absolute/path/to/codebase-mcp-server/dist/index.js"]
   }
   ```

### Permission Issues

On macOS/Linux, ensure the server file is executable:

```bash
chmod +x /path/to/codebase-mcp-server/dist/index.js
```

### Checking Logs

View MCP server logs in VS Code:

1. Open Output panel (View > Output or `Cmd/Ctrl + Shift + U`)
2. Select "GitHub Copilot" from the dropdown
3. Look for messages related to the MCP server

### Server Not Starting

If the server fails to start:

1. Test the server manually:
   ```bash
   node /path/to/codebase-mcp-server/dist/index.js
   ```

2. Check for TypeScript compilation errors:
   ```bash
   npm run build
   ```

3. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

## Advanced Configuration

### Custom Ignore Patterns

You can configure custom ignore patterns:

```
@workspace Configure ignore patterns to add ["*.test.ts", "*.spec.ts", "__mocks__"]
```

### Limiting Depth

Control how deep the structure traversal goes:

```
@workspace Show structure with max depth 5 and include hidden files
```

## Performance Tips

1. **Use ignore patterns**: Add patterns for large directories like `node_modules`, `dist`, `build`
2. **Limit search results**: Specify `maxResults` when searching large codebases
3. **Target specific directories**: Set the codebase path to a specific module instead of the entire project

## Integration with Copilot Chat

The Codebase MCP Server works seamlessly with GitHub Copilot Chat. Here are some example queries:

- "What is the architecture of this codebase?"
- "Find all API endpoints in the project"
- "Show me all TypeScript interfaces"
- "What dependencies does this project use?"
- "Load and explain the main entry point"

## Next Steps

- Check out the [IntelliJ IDEA Integration Guide](INTELLIJ_SETUP.md)
- Read the [README](../README.md) for API reference
- Report issues on [GitHub](https://github.com/Borelli-7/codebase-mcp-server/issues)
