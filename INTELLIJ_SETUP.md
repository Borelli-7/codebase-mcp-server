# IntelliJ IDEA Integration

This guide will help you integrate the Codebase MCP Server with IntelliJ IDEA.

## Prerequisites

- Node.js 18.0.0 or higher
- IntelliJ IDEA with GitHub Copilot plugin
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

### Step 1: Install GitHub Copilot Plugin

1. Open IntelliJ IDEA
2. Go to Settings/Preferences (`Cmd + ,` on macOS, `Ctrl + Alt + S` on Windows/Linux)
3. Navigate to Plugins
4. Search for "GitHub Copilot"
5. Install and restart IntelliJ IDEA

### Step 2: Configure MCP Server

IntelliJ IDEA's GitHub Copilot plugin supports MCP servers through configuration files.

1. Create or edit the MCP configuration file:
   - **macOS/Linux**: `~/.config/github-copilot/mcp-servers.json`
   - **Windows**: `%APPDATA%\github-copilot\mcp-servers.json`

2. Add the server configuration:

```json
{
  "mcpServers": {
    "codebase": {
      "command": "node",
      "args": [
        "/absolute/path/to/codebase-mcp-server/dist/index.js"
      ]
    }
  }
}
```

**Important**: Replace `/absolute/path/to/codebase-mcp-server` with the actual absolute path.

### Alternative: Global Installation

If you installed the server globally:

```json
{
  "mcpServers": {
    "codebase": {
      "command": "codebase-mcp-server"
    }
  }
}
```

### Alternative: Using npx

```json
{
  "mcpServers": {
    "codebase": {
      "command": "npx",
      "args": [
        "-y",
        "codebase-mcp-server"
      ]
    }
  }
}
```

## Verify Installation

1. Restart IntelliJ IDEA
2. Open the GitHub Copilot settings:
   - Go to Settings/Preferences > Tools > GitHub Copilot
3. Check the "MCP Servers" section
4. You should see "codebase" listed as an available server

## Usage

Once configured, you can use the MCP server with GitHub Copilot Chat in IntelliJ IDEA:

1. Open GitHub Copilot Chat panel (usually on the right side)
2. Or use the keyboard shortcut to open Chat (varies by platform)

### Available Commands

#### Set Codebase Path
```
Set the codebase path to /path/to/your/project
```

#### List Codebase Structure
```
Show me the structure of the codebase
```

#### Load File Content
```
Load the content of src/main/java/com/example/Main.java
```

#### Search Codebase
```
Search for files containing "database connection"
```

#### Get Dependencies
```
What are the dependencies of this project?
```

## Example Workflow

Here's a typical workflow when working with a Java project:

1. **Set the codebase path**:
   ```
   Set codebase to /Users/john/projects/my-java-app
   ```

2. **Explore the structure**:
   ```
   Show me the project structure
   ```

3. **Search for specific files**:
   ```
   Search for Java files containing "Controller"
   ```

4. **Load and analyze files**:
   ```
   Load src/main/java/com/example/controller/UserController.java
   Explain what this controller does
   ```

5. **Check dependencies**:
   ```
   What are the Maven dependencies?
   ```

## Language-Specific Examples

### Java (Maven/Gradle)

The server automatically detects Maven and Gradle dependencies:

```
What dependencies does this Java project use?
```

### Kotlin

Works the same as Java projects:

```
Load src/main/kotlin/com/example/Application.kt
```

### Scala

```
Show me the structure of the Scala project
Search for Scala files with "actor"
```

### Go

The server reads `go.mod` files:

```
What are the Go module dependencies?
```

### Rust

The server reads `Cargo.toml` files:

```
What are the Rust crate dependencies?
```

## Troubleshooting

### Server Not Showing Up

If the MCP server doesn't appear in IntelliJ IDEA:

1. Verify the configuration file location is correct
2. Check the JSON syntax is valid
3. Ensure the path to the server is absolute and correct
4. Restart IntelliJ IDEA completely

### Server Fails to Start

1. Test the server manually from terminal:
   ```bash
   node /path/to/codebase-mcp-server/dist/index.js
   ```

2. Check the IntelliJ IDEA logs:
   - Go to Help > Show Log in Finder/Explorer
   - Look for errors related to MCP or GitHub Copilot

3. Verify dependencies are installed:
   ```bash
   cd /path/to/codebase-mcp-server
   npm install
   ```

### Permission Issues

On macOS/Linux, ensure the server has execute permissions:

```bash
chmod +x /path/to/codebase-mcp-server/dist/index.js
```

### Path Resolution Issues

If using relative paths doesn't work, always use absolute paths:

**macOS/Linux**:
```bash
# Get absolute path
pwd
# Use in configuration: /Users/username/dev/codebase-mcp-server/dist/index.js
```

**Windows**:
```cmd
cd
REM Use in configuration: C:\Users\username\dev\codebase-mcp-server\dist\index.js
```

## Advanced Configuration

### Environment Variables

You can set environment variables in the MCP configuration:

```json
{
  "mcpServers": {
    "codebase": {
      "command": "node",
      "args": [
        "/absolute/path/to/codebase-mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Custom Ignore Patterns

Configure ignore patterns through chat:

```
Configure ignore patterns to add ["*.class", "target", "build"]
```

### Multiple Codebases

You can switch between different codebases:

```
Set codebase to /path/to/project-a
# Work with project-a

Set codebase to /path/to/project-b
# Work with project-b
```

## Performance Tips for IntelliJ IDEA

1. **Index smaller scopes**: Set the codebase path to specific modules:
   ```
   Set codebase to /path/to/project/backend-module
   ```

2. **Use ignore patterns**: Exclude build outputs and test directories:
   ```
   Configure ignore patterns to add ["target", "build", "out", "*.class"]
   ```

3. **Limit search depth**: When querying structure, limit the depth:
   ```
   Show structure with max depth 3
   ```

## Integration with IntelliJ Features

### Works Well With:

- **Code Navigation**: Ask Copilot to load files, then use IntelliJ's navigation
- **Refactoring**: Get context about the codebase before refactoring
- **Code Review**: Load and analyze specific files
- **Documentation**: Generate documentation based on codebase structure

### Example Queries:

- "What is the package structure of this Java project?"
- "Find all Spring Boot controllers"
- "Show me the main entry point of this application"
- "What external libraries does this project depend on?"

## Multiple Projects in Workspace

If you have multiple projects open in IntelliJ IDEA:

1. Set the codebase path to the specific project you want to analyze
2. Switch between projects by setting different paths
3. Each chat session can work with a different codebase

## Next Steps

- Check out the [VS Code Integration Guide](VSCODE_SETUP.md)
- Read the [README](../README.md) for complete API reference
- Report issues on [GitHub](https://github.com/Borelli-7/codebase-mcp-server/issues)

## Known Limitations

1. The MCP server runs as a separate process and doesn't have direct access to IntelliJ's project index
2. Large codebases may take time to traverse initially
3. Binary files and very large files are skipped during content search

## Support

For IntelliJ IDEA-specific issues:
- Check the [GitHub Copilot plugin documentation](https://docs.github.com/en/copilot)
- Visit the [IntelliJ IDEA support forum](https://intellij-support.jetbrains.com/hc)
- Open an issue on the [project repository](https://github.com/Borelli-7/codebase-mcp-server/issues)
