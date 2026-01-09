#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CodebaseLoader } from './codebaseLoader.js';
import { ConfigManager } from './config.js';

// Initialize configuration manager
const configManager = new ConfigManager();
const codebaseLoader = new CodebaseLoader(configManager);

// Create MCP server instance
const server = new McpServer({
  name: 'codebase-mcp-server',
  version: '1.0.0'
});

// Tool: Set Codebase Path
server.registerTool(
  'set-codebase-path',
  {
    title: 'Set Codebase Path',
    description: 'Set the path to the codebase you want to load into context',
    inputSchema: {
      path: z.string().describe('Absolute path to the codebase directory')
    },
    outputSchema: {
      success: z.boolean(),
      message: z.string(),
      path: z.string()
    }
  },
  async ({ path }) => {
    try {
      const isValid = await codebaseLoader.validatePath(path);
      if (!isValid) {
        const output = {
          success: false,
          message: 'Invalid path or path does not exist',
          path: path
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output
        };
      }

      configManager.setCodebasePath(path);
      const output = {
        success: true,
        message: `Codebase path set successfully`,
        path: path
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        message: `Failed to set codebase path: ${errorMessage}`,
        path: path
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  }
);

// Tool: List Codebase Structure
server.registerTool(
  'list-codebase-structure',
  {
    title: 'List Codebase Structure',
    description: 'Get an overview of the codebase directory structure',
    inputSchema: {
      maxDepth: z.number().optional().describe('Maximum depth to traverse (default: 3)'),
      includeHidden: z.boolean().optional().describe('Include hidden files/folders (default: false)')
    },
    outputSchema: {
      success: z.boolean(),
      structure: z.array(z.object({
        path: z.string(),
        type: z.enum(['file', 'directory']),
        size: z.number().optional(),
        language: z.string().optional()
      })),
      totalFiles: z.number(),
      totalDirectories: z.number()
    }
  },
  async ({ maxDepth = 3, includeHidden = false }) => {
    try {
      const codebasePath = configManager.getCodebasePath();
      if (!codebasePath) {
        const output = {
          success: false,
          structure: [],
          totalFiles: 0,
          totalDirectories: 0
        };
        return {
          content: [{
            type: 'text',
            text: 'No codebase path set. Use set-codebase-path tool first.'
          }],
          structuredContent: output
        };
      }

      const structure = await codebaseLoader.getStructure(maxDepth, includeHidden);
      const output = {
        success: true,
        structure: structure.items,
        totalFiles: structure.totalFiles,
        totalDirectories: structure.totalDirectories
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        structure: [],
        totalFiles: 0,
        totalDirectories: 0
      };
      return {
        content: [{
          type: 'text',
          text: `Failed to list codebase structure: ${errorMessage}`
        }],
        structuredContent: output
      };
    }
  }
);

// Tool: Load File Content
server.registerTool(
  'load-file-content',
  {
    title: 'Load File Content',
    description: 'Load the content of a specific file from the codebase',
    inputSchema: {
      relativePath: z.string().describe('Relative path to the file from codebase root')
    },
    outputSchema: {
      success: z.boolean(),
      path: z.string(),
      content: z.string().optional(),
      language: z.string().optional(),
      lines: z.number().optional(),
      size: z.number().optional()
    }
  },
  async ({ relativePath }) => {
    try {
      const codebasePath = configManager.getCodebasePath();
      if (!codebasePath) {
        const output = {
          success: false,
          path: relativePath
        };
        return {
          content: [{
            type: 'text',
            text: 'No codebase path set. Use set-codebase-path tool first.'
          }],
          structuredContent: output
        };
      }

      const fileData = await codebaseLoader.loadFile(relativePath);
      const output = {
        success: true,
        path: fileData.path,
        content: fileData.content,
        language: fileData.language,
        lines: fileData.lines,
        size: fileData.size
      };

      return {
        content: [{ type: 'text', text: fileData.content }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        path: relativePath
      };
      return {
        content: [{
          type: 'text',
          text: `Failed to load file: ${errorMessage}`
        }],
        structuredContent: output
      };
    }
  }
);

// Tool: Search Codebase
server.registerTool(
  'search-codebase',
  {
    title: 'Search Codebase',
    description: 'Search for files matching a pattern or containing specific content',
    inputSchema: {
      query: z.string().describe('Search query (file name pattern or content to search)'),
      searchType: z.enum(['filename', 'content']).describe('Type of search to perform'),
      filePattern: z.string().optional().describe('File pattern to filter (e.g., "*.ts", "*.java")'),
      maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
    },
    outputSchema: {
      success: z.boolean(),
      results: z.array(z.object({
        path: z.string(),
        matches: z.number().optional(),
        preview: z.string().optional()
      })),
      totalResults: z.number()
    }
  },
  async ({ query, searchType, filePattern, maxResults = 50 }) => {
    try {
      const codebasePath = configManager.getCodebasePath();
      if (!codebasePath) {
        const output = {
          success: false,
          results: [],
          totalResults: 0
        };
        return {
          content: [{
            type: 'text',
            text: 'No codebase path set. Use set-codebase-path tool first.'
          }],
          structuredContent: output
        };
      }

      const results = await codebaseLoader.search(query, searchType, filePattern, maxResults);
      const output = {
        success: true,
        results: results,
        totalResults: results.length
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        results: [],
        totalResults: 0
      };
      return {
        content: [{
          type: 'text',
          text: `Search failed: ${errorMessage}`
        }],
        structuredContent: output
      };
    }
  }
);

// Tool: Get Module Dependencies
server.registerTool(
  'get-module-dependencies',
  {
    title: 'Get Module Dependencies',
    description: 'Analyze and retrieve dependencies of a module or project',
    inputSchema: {
      modulePath: z.string().optional().describe('Relative path to module (defaults to root)')
    },
    outputSchema: {
      success: z.boolean(),
      dependencies: z.array(z.object({
        name: z.string(),
        version: z.string().optional(),
        type: z.enum(['runtime', 'dev', 'peer', 'optional'])
      })),
      devDependencies: z.array(z.string()).optional()
    }
  },
  async ({ modulePath = '.' }) => {
    try {
      const codebasePath = configManager.getCodebasePath();
      if (!codebasePath) {
        const output = {
          success: false,
          dependencies: []
        };
        return {
          content: [{
            type: 'text',
            text: 'No codebase path set. Use set-codebase-path tool first.'
          }],
          structuredContent: output
        };
      }

      const deps = await codebaseLoader.getModuleDependencies(modulePath);
      const output = {
        success: true,
        dependencies: deps.dependencies,
        devDependencies: deps.devDependencies
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        dependencies: []
      };
      return {
        content: [{
          type: 'text',
          text: `Failed to get dependencies: ${errorMessage}`
        }],
        structuredContent: output
      };
    }
  }
);

// Tool: Configure Ignore Patterns
server.registerTool(
  'configure-ignore-patterns',
  {
    title: 'Configure Ignore Patterns',
    description: 'Add or remove patterns for files/directories to ignore',
    inputSchema: {
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
      patterns: z.array(z.string()).optional().describe('Patterns to add or remove')
    },
    outputSchema: {
      success: z.boolean(),
      currentPatterns: z.array(z.string()),
      message: z.string()
    }
  },
  async ({ action, patterns = [] }) => {
    try {
      if (action === 'add') {
        patterns.forEach(pattern => configManager.addIgnorePattern(pattern));
      } else if (action === 'remove') {
        patterns.forEach(pattern => configManager.removeIgnorePattern(pattern));
      }

      const currentPatterns = configManager.getIgnorePatterns();
      const output = {
        success: true,
        currentPatterns,
        message: action === 'list' 
          ? 'Current ignore patterns retrieved' 
          : `Patterns ${action}ed successfully`
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        currentPatterns: [],
        message: `Failed to configure patterns: ${errorMessage}`
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  }
);

// Main function to start the server
async function main() {
  // Use stdio transport for communication
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);
  
  // Log to stderr (not stdout, as that would interfere with MCP protocol)
  console.error('Codebase MCP Server running on stdio');
}

// Start the server
main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
