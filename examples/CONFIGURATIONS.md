# Example Configurations

This directory contains example configuration files for different editors and use cases.

## VS Code Configuration

### Basic Configuration
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

### Using npx (Global)
```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": {
        "codebase": {
          "command": "npx",
          "args": ["-y", "codebase-mcp-server"]
        }
      }
    }
  }
}
```

## IntelliJ IDEA Configuration

### Basic Configuration (mcp-servers.json)
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

### Using Global Installation
```json
{
  "mcpServers": {
    "codebase": {
      "command": "codebase-mcp-server"
    }
  }
}
```

## Example Chat Commands

### Set Up
```
Set the codebase path to /home/user/projects/my-app
```

### Exploration
```
Show me the structure of the codebase with max depth 3
```

### Search
```
Search for TypeScript files containing "authentication"
```

### Load Files
```
Load the content of src/index.ts
```

### Dependencies
```
What are the dependencies of this project?
```

### Configure Ignore
```
Configure ignore patterns to add ["*.test.ts", "*.spec.ts"]
```

## Tips

1. Always use absolute paths in configuration files
2. Restart your editor after changing configurations
3. Check editor logs if the server doesn't appear
4. Use ignore patterns to exclude large directories
5. Limit search depth for large codebases
