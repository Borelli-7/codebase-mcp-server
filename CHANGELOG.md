# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-09

### Added
- Initial release of Codebase MCP Server
- MCP tools for codebase analysis:
  - `set-codebase-path` - Set the path to analyze
  - `list-codebase-structure` - Get directory structure
  - `load-file-content` - Load file contents
  - `search-codebase` - Search by filename or content
  - `get-module-dependencies` - Analyze dependencies
  - `configure-ignore-patterns` - Manage ignore patterns
- Language detection for 30+ programming languages
- Support for multiple dependency formats:
  - Node.js/TypeScript (package.json)
  - Java Maven (pom.xml)
  - Rust (Cargo.toml)
  - Go (go.mod)
- Automatic .gitignore parsing
- VS Code integration guide
- IntelliJ IDEA integration guide
- Comprehensive documentation and examples
- TypeScript implementation using MCP SDK 1.0.4

### Features
- Language-agnostic codebase loading
- Multi-module/monorepo support
- Smart file traversal with ignore patterns
- Efficient search capabilities
- Security: Path validation to prevent directory traversal
- Stdio transport for editor communication

### Documentation
- Complete README with API reference
- VS Code setup guide
- IntelliJ IDEA setup guide
- Example configurations
- Troubleshooting guide

[1.0.0]: https://github.com/Borelli-7/codebase-mcp-server/releases/tag/v1.0.0
