# Codebase MCP Server

A Model Context Protocol (MCP) server that intelligently loads and contextualizes codebases from any application project, regardless of technology stack.

## 🚀 Features

- **Language-Agnostic**: Supports any programming language (TypeScript, Java, Rust, Go, Python, C++, and more)
- **Multi-Module Support**: Handles monorepos and complex project structures
- **Smart Traversal**: Respects `.gitignore` and custom ignore patterns
- **Dependency Analysis**: Automatically detects and parses dependencies from package.json, pom.xml, Cargo.toml, go.mod
- **Neo4j Graph Database** (Optional): Persistent graph-based indexing for advanced codebase analysis
  - Automatic indexing on codebase load
  - Graph-powered queries for relationships and dependencies
  - Graceful fallback to filesystem-only mode
- **IDE Integration**: Works seamlessly with VS Code and IntelliJ IDEA
- **Efficient Search**: Fast file and content search capabilities
- **Context-Aware**: Provides structured information about your codebase to AI assistants

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Tools Reference](#tools-reference)
- [Editor Integration](#editor-integration)
- [Examples](#examples)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 💾 Installation

### Global Installation

```bash
npm install -g codebase-mcp-server
```

### Local Installation

```bash
npm install codebase-mcp-server
```

### From Source

```bash
git clone https://github.com/Borelli-7/codebase-mcp-server.git
cd codebase-mcp-server
npm install
npm run build
```

## 🏃 Quick Start

### 1. Build the Server

```bash
npm install
npm run build
```

### 2. Run the Server

```bash
npm start
```

Or in development mode:

```bash
npm run dev
```

### 3. Configure Your Editor

Follow the setup guides for your preferred editor:

- [VS Code Setup Guide](VSCODE_SETUP.md)
- [IntelliJ IDEA Setup Guide](INTELLIJ_SETUP.md)

## ⚙️ Configuration

The server can be configured through MCP tool calls or environment variables.

### Neo4j Integration (Optional)

Enable persistent graph-based indexing by configuring Neo4j via environment variables:

```bash
# Quick setup with Docker
docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  neo4j:5

# Set environment variables
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=your-password
export NEO4J_DATABASE=neo4j  # Optional, default: neo4j
```

Or create a `.env` file in the project root:

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
```

See [.env.example](.env.example) for configuration templates.

**When Neo4j is enabled:**
- Codebase is automatically indexed on `set-codebase-path`
- Graph queries provide enhanced performance for structure and search operations
- New graph-powered tools become available

**When Neo4j is not configured:**
- Server runs in filesystem-only mode
- All original tools work unchanged
- No performance impact

### Default Ignore Patterns

The server automatically ignores common directories:

- `node_modules`
- `.git`
- `dist`, `build`, `out`, `target`
- `.next`, `.nuxt`
- `coverage`, `.nyc_output`
- Log files and OS-specific files

### Custom Ignore Patterns

Add custom patterns using the `configure-ignore-patterns` tool:

```typescript
{
  "action": "add",
  "patterns": ["*.test.ts", "__mocks__", "temp"]
}
```

## 🛠️ Tools Reference

The server exposes the following MCP tools:

### 1. set-codebase-path

Set the path to the codebase you want to analyze.

**Input Schema:**
```typescript
{
  path: string  // Absolute path to the codebase directory
}
```

**Output Schema:**
```typescript
{
  success: boolean
  message: string
  path: string
}
```

**Example:**
```json
{
  "path": "/home/user/projects/my-app"
}
```

### 2. list-codebase-structure

Get an overview of the codebase directory structure.

**Input Schema:**
```typescript
{
  maxDepth?: number        // Maximum depth to traverse (default: 3)
  includeHidden?: boolean  // Include hidden files/folders (default: false)
}
```

**Output Schema:**
```typescript
{
  success: boolean
  structure: Array<{
    path: string
    type: 'file' | 'directory'
    size?: number
    language?: string
  }>
  totalFiles: number
  totalDirectories: number
}
```

### 3. load-file-content

Load the content of a specific file from the codebase.

**Input Schema:**
```typescript
{
  relativePath: string  // Relative path from codebase root
}
```

**Output Schema:**
```typescript
{
  success: boolean
  path: string
  content?: string
  language?: string
  lines?: number
  size?: number
}
```

### 4. search-codebase

Search for files matching a pattern or containing specific content.

**Input Schema:**
```typescript
{
  query: string                    // Search query
  searchType: 'filename' | 'content'  // Type of search
  filePattern?: string             // File pattern filter (e.g., "*.ts")
  maxResults?: number              // Maximum results (default: 50)
}
```

**Output Schema:**
```typescript
{
  success: boolean
  results: Array<{
    path: string
    matches?: number
    preview?: string
  }>
  totalResults: number
}
```

### 5. get-module-dependencies

Analyze and retrieve dependencies of a module or project.

**Input Schema:**
```typescript
{
  modulePath?: string  // Relative path to module (default: root)
}
```

**Output Schema:**
```typescript
{
  success: boolean
  dependencies: Array<{
    name: string
    version?: string
    type: 'runtime' | 'dev' | 'peer' | 'optional'
  }>
  devDependencies?: string[]
}
```

**Supported Formats:**
- Node.js/TypeScript: `package.json`
- Java: `pom.xml`
- Rust: `Cargo.toml`
- Go: `go.mod`

### 6. configure-ignore-patterns

Add, remove, or list ignore patterns for file traversal.

**Input Schema:**
```typescript
{
  action: 'add' | 'remove' | 'list'
  patterns?: string[]  // Patterns to add or remove
}
```

**Output Schema:**
```typescript
{
  success: boolean
  currentPatterns: string[]
  message: string
}
```

---

## 🔷 Neo4j-Powered Tools

The following tools are available when Neo4j is configured:

### 7. index-codebase

Manually trigger re-indexing of the current codebase into Neo4j.

**Input Schema:**
```typescript
{
  force?: boolean  // Force re-index even if already indexed
}
```

**Output Schema:**
```typescript
{
  success: boolean
  totalFiles: number
  totalDirectories: number
  totalDependencies: number
  duration: number  // milliseconds
}
```

### 8. get-codebase-stats

Get aggregate statistics from the indexed codebase graph.

**Input Schema:**
```typescript
{}
```

**Output Schema:**
```typescript
{
  success: boolean
  indexedAt: string
  totalFiles: number
  totalDirectories: number
  totalDependencies: number
  topLanguages: Array<{
    language: string
    count: number
  }>
  totalSize: number
}
```

### 9. get-dependency-graph

Retrieve the complete dependency graph from Neo4j.

**Input Schema:**
```typescript
{
  depth?: number  // Maximum depth for dependency tree (default: all)
}
```

**Output Schema:**
```typescript
{
  success: boolean
  dependencies: Array<{
    name: string
    version: string
    type: 'runtime' | 'dev' | 'peer' | 'optional'
  }>
  totalCount: number
}
```

### 10. get-directory-summary

Get aggregate statistics for a specific directory from the graph.

**Input Schema:**
```typescript
{
  dirPath: string  // Relative path to directory
}
```

**Output Schema:**
```typescript
{
  success: boolean
  path: string
  totalFiles: number
  languages: Record<string, number>  // language -> file count
  totalSize: number
  totalLines: number
}
```

## 🖥️ Editor Integration

### VS Code

See the [VS Code Setup Guide](VSCODE_SETUP.md) for detailed instructions.

**Quick Config:**
```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": {
        "codebase": {
          "command": "node",
          "args": ["/absolute/path/to/codebase-mcp-server/dist/index.js"]
        }
      }
    }
  }
}
```

### IntelliJ IDEA

See the [IntelliJ IDEA Setup Guide](INTELLIJ_SETUP.md) for detailed instructions.

**Quick Config:**
```json
{
  "mcpServers": {
    "codebase": {
      "command": "node",
      "args": ["/absolute/path/to/codebase-mcp-server/dist/index.js"]
    }
  }
}
```

## 📚 Examples

### Example 1: Explore a TypeScript Project

```
1. Set codebase path: /home/user/projects/my-ts-app
2. List structure with max depth 2
3. Search for TypeScript files containing "interface"
4. Load src/types/User.ts
5. Get module dependencies
```

### Example 2: Analyze a Java Application

```
1. Set codebase path: /home/user/projects/my-java-app
2. List structure
3. Search for Java files with "Controller"
4. Load src/main/java/com/example/UserController.java
5. Get Maven dependencies
```

### Example 3: Working with Rust

```
1. Set codebase path: /home/user/projects/my-rust-project
2. Search for Rust files containing "async"
3. Load src/main.rs
4. Get Cargo dependencies
```

### Example 4: Multi-Module Project

```
1. Set codebase path: /home/user/projects/monorepo
2. List structure with max depth 4
3. Get dependencies for module ./packages/frontend
4. Get dependencies for module ./packages/backend
```

## 🏗️ Architecture

### Components

1. **MCP Server** (`src/index.ts`)
   - Handles MCP protocol communication
   - Registers and exposes tools
   - Uses stdio transport
   - Wires Neo4j integration (optional)

2. **Codebase Loader** (`src/codebaseLoader.ts`)
   - File system traversal with dual-source strategy
   - Neo4j graph queries (when available)
   - Automatic fallback to filesystem
   - Language detection
   - Content parsing
   - Dependency analysis

3. **Config Manager** (`src/config.ts`)
   - Configuration state management
   - Ignore pattern management
   - Neo4j configuration from environment

4. **Neo4j Service** (`src/neo4jService.ts`) *[Optional]*
   - Database connection management
   - Cypher query execution helpers
   - Schema initialization (constraints & indexes)
   - Graceful error handling

5. **Neo4j Indexer** (`src/neo4jIndexer.ts`) *[Optional]*
   - Batch indexing pipeline (500 items/batch)
   - Graph node/relationship creation
   - Dependency parsing integration
   - Performance-optimized for large codebases

6. **Utilities** (`src/utils.ts`)
   - Ignore filter initialization
   - Language detection (37+ extensions)
   - Pattern matching

### Supported Languages

The server detects 30+ programming languages:

- **Web**: TypeScript, JavaScript, HTML, CSS, SCSS
- **Backend**: Java, Python, Go, Rust, C++, C#, Ruby, PHP
- **Mobile**: Swift, Kotlin, Dart
- **Other**: Shell, SQL, R, MATLAB, Scala, and more

### Dependency Detection

Automatically parses dependency files:

| Language/Framework | File | Detected Info |
|-------------------|------|---------------|
| Node.js/TypeScript | package.json | dependencies, devDependencies, peerDependencies |
| Java (Maven) | pom.xml | artifactId, groupId |
| Rust | Cargo.toml | dependencies, dev-dependencies |
| Go | go.mod | require statements |

## 🔧 Development

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Neo4j 5.x (optional, for graph-based features)
  - Docker: `docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:5`
  - Or install locally from [neo4j.com/download](https://neo4j.com/download/)

### Setup

```bash
# Clone the repository
git clone https://github.com/Borelli-7/codebase-mcp-server.git
cd codebase-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Watch mode (auto-rebuild)
npm run watch
```

### Project Structure

```
codebase-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── codebaseLoader.ts     # Codebase loading logic (dual-source)
│   ├── config.ts             # Configuration management
│   ├── neo4jService.ts       # Neo4j connection & queries
│   ├── neo4jIndexer.ts       # Graph indexing pipeline
│   └── utils.ts              # Shared utilities
├── tests/
│   └── utils.test.ts         # Unit tests
├── dist/                     # Compiled output
├── .env.example              # Environment variable template
├── VSCODE_SETUP.md          # VS Code integration guide
├── INTELLIJ_SETUP.md        # IntelliJ IDEA integration guide
├── vitest.config.ts         # Test configuration
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with tsx
- `npm run watch` - Watch mode for development
- `npm start` - Run the compiled server
- `npm test` - Run tests with vitest
- `npm run test:watch` - Run tests in watch mode

## 🐛 Troubleshooting

### Server Not Starting

1. Verify Node.js version:
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. Rebuild the project:
   ```bash
   npm install
   npm run build
   ```

3. Check for errors:
   ```bash
   node dist/index.js
   ```

### Path Issues

Always use absolute paths in configuration. Get the absolute path:

**macOS/Linux:**
```bash
cd /path/to/codebase-mcp-server
pwd
```

**Windows:**
```cmd
cd C:\path\to\codebase-mcp-server
cd
```

### Permission Errors

On macOS/Linux, ensure execute permissions:
```bash
chmod +x dist/index.js
```

### Large Codebase Performance

For large codebases:

1. **Enable Neo4j** for persistent indexing and faster queries
2. Add more ignore patterns
3. Limit `maxDepth` when listing structure
4. Use specific file patterns in searches
5. Set codebase path to specific modules

### Neo4j Connection Issues

**Server not connecting to Neo4j:**

1. Verify Neo4j is running:
   ```bash
   docker ps | grep neo4j
   # or
   neo4j status
   ```

2. Test connection:
   ```bash
   # Check Neo4j browser at http://localhost:7474
   ```

3. Verify environment variables:
   ```bash
   echo $NEO4J_URI
   echo $NEO4J_USER
   echo $NEO4J_PASSWORD
   ```

4. Check server logs (stderr):
   - Look for `[Neo4j] Connected successfully` or connection errors
   - Server will fall back to filesystem-only mode on connection failure

**Indexing performance:**

- First indexing may take time for large codebases (10k+ files: ~20-30s)
- Subsequent queries use the graph and are much faster
- Use `index-codebase` tool to manually re-index after major changes

### Debug Logging

The server logs to stderr (not stdout). Check your editor's MCP logs:

- **VS Code**: Output panel > GitHub Copilot
- **IntelliJ**: Help > Show Log in Finder/Explorer

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Use meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Inspired by the MCP specification: https://modelcontextprotocol.io
- Thanks to the open-source community

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Borelli-7/codebase-mcp-server/issues)
- **Documentation**: [Model Context Protocol Docs](https://modelcontextprotocol.io/docs)
- **Discussions**: [GitHub Discussions](https://github.com/Borelli-7/codebase-mcp-server/discussions)

## 🔗 Links

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Server Development Guide](https://modelcontextprotocol.io/docs/develop/build-server)
- [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [VS Code MCP Integration](VSCODE_SETUP.md)
- [IntelliJ IDEA MCP Integration](INTELLIJ_SETUP.md)

---

**Made with ❤️ for developers working with AI assistants**