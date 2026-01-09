# Usage Examples

This document provides detailed examples of using the Codebase MCP Server with different types of projects.

## Example 1: TypeScript/Node.js Project

### Setup
```
Set codebase path to /home/user/projects/my-typescript-app
```

### Explore Structure
```
List the codebase structure with max depth 3
```

**Expected Output:**
```json
{
  "success": true,
  "structure": [
    { "path": "src", "type": "directory" },
    { "path": "src/index.ts", "type": "file", "size": 1234, "language": "typescript" },
    { "path": "src/utils", "type": "directory" },
    { "path": "package.json", "type": "file", "size": 2000, "language": "json" }
  ],
  "totalFiles": 45,
  "totalDirectories": 12
}
```

### Find API Routes
```
Search for TypeScript files containing "router"
```

### Load Entry Point
```
Load the content of src/index.ts
```

### Check Dependencies
```
Get module dependencies
```

**Expected Output:**
```json
{
  "success": true,
  "dependencies": [
    { "name": "express", "version": "^4.18.2", "type": "runtime" },
    { "name": "typescript", "version": "^5.0.0", "type": "dev" }
  ]
}
```

## Example 2: Java Spring Boot Application

### Setup
```
Set codebase path to /home/user/projects/spring-boot-app
```

### Find Controllers
```
Search for Java files containing "Controller"
```

**Expected Output:**
```json
{
  "success": true,
  "results": [
    {
      "path": "src/main/java/com/example/UserController.java",
      "matches": 3,
      "preview": "@RestController\npublic class UserController {\n  @GetMapping(\"/users\")"
    }
  ]
}
```

### Load Controller
```
Load src/main/java/com/example/UserController.java
```

### Get Maven Dependencies
```
Get module dependencies
```

## Example 3: Rust Project

### Setup
```
Set codebase path to /home/user/projects/rust-app
```

### Find Async Code
```
Search for Rust files containing "async fn"
```

### Load Main File
```
Load src/main.rs
```

### Get Cargo Dependencies
```
Get module dependencies
```

**Expected Output:**
```json
{
  "success": true,
  "dependencies": [
    { "name": "tokio", "version": "1.0", "type": "runtime" },
    { "name": "serde", "version": "1.0", "type": "runtime" }
  ]
}
```

## Example 4: Monorepo/Multi-Module Project

### Setup
```
Set codebase path to /home/user/projects/monorepo
```

### Explore Structure
```
List codebase structure with max depth 4
```

### Frontend Module Dependencies
```
Get module dependencies for ./packages/frontend
```

### Backend Module Dependencies
```
Get module dependencies for ./packages/backend
```

### Search Across All Modules
```
Search for files containing "authentication" with file pattern "*.ts"
```

## Example 5: Python Project

### Setup
```
Set codebase path to /home/user/projects/python-app
```

### Find Flask Routes
```
Search for Python files containing "@app.route"
```

### Load Main Application
```
Load app.py
```

### Find All Tests
```
Search for files with filename pattern "test_*.py"
```

## Example 6: Go Project

### Setup
```
Set codebase path to /home/user/projects/go-service
```

### Find HTTP Handlers
```
Search for Go files containing "http.Handler"
```

### Get Go Modules
```
Get module dependencies
```

### Load Main Package
```
Load cmd/server/main.go
```

## Example 7: Working with Ignore Patterns

### View Current Patterns
```
Configure ignore patterns with action "list"
```

### Add Custom Patterns
```
Configure ignore patterns to add ["*.test.ts", "*.spec.ts", "__mocks__", "coverage"]
```

### Remove Pattern
```
Configure ignore patterns to remove ["coverage"]
```

## Example 8: Complex Search Queries

### Find All Interfaces in TypeScript
```
Search for TypeScript files containing "interface" with max results 100
```

### Find Database Migrations
```
Search for files with pattern "*migration*.sql"
```

### Find Configuration Files
```
Search for files with pattern "*.config.*"
```

## Example 9: Loading Multiple Files

### Load Configuration
```
Load config/app.config.ts
```

### Load Types
```
Load src/types/User.ts
Load src/types/Product.ts
Load src/types/Order.ts
```

### Compare Implementations
```
Load src/services/UserService.ts
Load src/services/ProductService.ts
```

## Example 10: Analyzing Project Structure

### Get Overview
```
List codebase structure with max depth 2
```

### Count Files by Type
```
Search for TypeScript files
Search for JavaScript files
Search for CSS files
```

### Find Entry Points
```
Search for files containing "main" in filename
Load package.json
```

## Tips for Effective Usage

1. **Start Broad, Then Narrow**: Begin with structure listing, then search for specific patterns

2. **Use File Patterns**: When searching content, use file patterns to limit scope:
   ```
   Search for "error handling" in files matching "*.ts"
   ```

3. **Leverage Ignore Patterns**: Exclude build outputs and test files for faster searches:
   ```
   Configure ignore patterns to add ["dist", "build", "*.test.*"]
   ```

4. **Modular Dependency Analysis**: For monorepos, check dependencies per module:
   ```
   Get dependencies for ./packages/api
   Get dependencies for ./packages/web
   ```

5. **Preview Before Loading**: Use content search to preview matches, then load specific files:
   ```
   Search for "authentication logic"
   Load src/auth/AuthService.ts
   ```

## Common Workflows

### Onboarding to New Codebase
1. Set codebase path
2. List structure (depth 2-3)
3. Get dependencies
4. Search for README or docs
5. Load main entry point
6. Search for key features

### Bug Investigation
1. Search for error messages in code
2. Load affected files
3. Search for test files
4. Load related tests
5. Check dependencies for versions

### Feature Development
1. Search for similar features
2. Load example implementations
3. Find related types/interfaces
4. Check for existing utilities
5. Verify no conflicts with dependencies

### Code Review Preparation
1. List changed areas
2. Load modified files
3. Search for affected tests
4. Check dependency changes
5. Review related documentation

## Integration with AI Assistants

When using with GitHub Copilot or other AI assistants:

1. **Context Loading**: Load relevant files before asking questions
2. **Structured Queries**: Use search to find examples before asking for code
3. **Dependency Awareness**: Check dependencies before asking about libraries
4. **Multi-Step Analysis**: Combine tools for comprehensive understanding

Example:
```
1. Set codebase to /my/project
2. Search for "authentication"
3. Load src/auth/AuthService.ts
4. Now ask: "How does the authentication flow work in this codebase?"
```

The AI assistant will have full context to provide accurate answers!
