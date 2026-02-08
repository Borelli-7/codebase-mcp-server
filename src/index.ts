#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CodebaseLoader } from './codebaseLoader.js';
import { ConfigManager } from './config.js';
import { Neo4jService } from './neo4jService.js';
import { Neo4jIndexer } from './neo4jIndexer.js';

// Initialize configuration manager
const configManager = new ConfigManager();

// Initialize Neo4j service if configured
let neo4jService: Neo4jService | null = null;
let neo4jIndexer: Neo4jIndexer | null = null;

const neo4jConfig = configManager.getNeo4jConfig();
if (neo4jConfig) {
  neo4jService = new Neo4jService(neo4jConfig);
  // Connect asynchronously - don't block server startup
  neo4jService.connect().then(connected => {
    if (connected) {
      console.error('[Main] Neo4j integration enabled');
      neo4jIndexer = new Neo4jIndexer(neo4jService!, configManager);
    } else {
      console.error('[Main] Neo4j connection failed, running in filesystem-only mode');
    }
  }).catch(error => {
    console.error('[Main] Neo4j initialization error:', error);
  });
} else {
  console.error('[Main] Neo4j not configured, running in filesystem-only mode');
}

// Initialize codebase loader with optional Neo4j service
const codebaseLoader = new CodebaseLoader(configManager, neo4jService || undefined);

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
      
      // Trigger Neo4j indexing if available
      let indexResults = null;
      if (neo4jIndexer && neo4jService?.isConnected()) {
        try {
          console.error('[set-codebase-path] Starting Neo4j indexing...');
          indexResults = await neo4jIndexer.indexCodebase(path);
          console.error(`[set-codebase-path] Indexing completed: ${indexResults.totalFiles} files, ${indexResults.totalDirectories} dirs in ${indexResults.duration}ms`);
        } catch (error) {
          console.error('[set-codebase-path] Indexing failed:', error);
          // Non-fatal - continue without indexing
        }
      }
      
      const message = indexResults
        ? `Codebase path set and indexed successfully (${indexResults.totalFiles} files, ${indexResults.totalDirectories} dirs, ${indexResults.totalDependencies} deps in ${indexResults.duration}ms)`
        : 'Codebase path set successfully';
      
      const output = {
        success: true,
        message,
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

// Tool: Index Codebase (Manual trigger)
server.registerTool(
  'index-codebase',
  {
    title: 'Index Codebase',
    description: 'Manually trigger re-indexing of the codebase into Neo4j',
    inputSchema: {
      force: z.boolean().optional().describe('Force re-indexing even if already indexed')
    },
    outputSchema: {
      success: z.boolean(),
      totalFiles: z.number(),
      totalDirectories: z.number(),
      totalDependencies: z.number(),
      duration: z.number(),
      message: z.string()
    }
  },
  async ({ force = false }) => {
    try {
      const codebasePath = configManager.getCodebasePath();
      if (!codebasePath) {
        const output = {
          success: false,
          totalFiles: 0,
          totalDirectories: 0,
          totalDependencies: 0,
          duration: 0,
          message: 'No codebase path set. Use set-codebase-path tool first.'
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output
        };
     }

      if (!neo4jService?.isConnected() || !neo4jIndexer) {
        const output = {
          success: false,
          totalFiles: 0,
          totalDirectories: 0,
          totalDependencies: 0,
          duration: 0,
          message: 'Neo4j is not available. Ensure NEO4J_URI is configured.'
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output
        };
      }

      const results = await neo4jIndexer.indexCodebase(codebasePath);
      const output = {
        success: true,
        totalFiles: results.totalFiles,
        totalDirectories: results.totalDirectories,
        totalDependencies: results.totalDependencies,
        duration: results.duration,
        message: `Indexing completed successfully in ${results.duration}ms`
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        totalFiles: 0,
        totalDirectories: 0,
        totalDependencies: 0,
        duration: 0,
        message: `Indexing failed: ${errorMessage}`
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  }
);

// Tool: Get Codebase Stats
server.registerTool(
  'get-codebase-stats',
  {
    title: 'Get Codebase Statistics',
    description: 'Get aggregate statistics about the indexed codebase from Neo4j',
    inputSchema: {},
    outputSchema: {
      success: z.boolean(),
      indexedAt: z.string().optional(),
      totalFiles: z.number(),
      totalDirectories: z.number(),
      totalDependencies: z.number(),
      topLanguages: z.array(z.object({
        language: z.string(),
        count: z.number()
      })),
      message: z.string()
    }
  },
  async () => {
    try {
      const codebasePath = configManager.getCodebasePath();
      if (!codebasePath) {
        const output = {
          success: false,
          totalFiles: 0,
          totalDirectories: 0,
          totalDependencies: 0,
          topLanguages: [],
          message: 'No codebase path set.'
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output
        };
      }

      if (!neo4jService?.isConnected()) {
        const output = {
          success: false,
          totalFiles: 0,
          totalDirectories: 0,
          totalDependencies: 0,
          topLanguages: [],
          message: 'Neo4j is not available.'
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output
        };
      }

      const statsResult = await neo4jService.executeRead(
        `MATCH (c:Codebase { path: $path })
         OPTIONAL MATCH (c)-[:ROOT_DIR|CONTAINS*]->(f:File)
         OPTIONAL MATCH (c)-[:ROOT_DIR|CONTAINS*]->(d:Directory)
         OPTIONAL MATCH (c)-[:HAS_DEPENDENCY]->(dep:Dependency)
         WITH c, count(DISTINCT f) as fileCount, count(DISTINCT d) as dirCount, count(DISTINCT dep) as depCount
         OPTIONAL MATCH (c)-[:ROOT_DIR|CONTAINS*]->(f2:File)
         RETURN c.indexedAt as indexedAt, fileCount, dirCount, depCount,
                collect(DISTINCT {language: f2.language, count: 1}) as languages`,
        { path: codebasePath }
      );

      if (statsResult.records.length === 0) {
        const output = {
          success: false,
          totalFiles: 0,
          totalDirectories: 0,
          totalDependencies: 0,
          topLanguages: [],
          message: 'Codebase not indexed yet. Use index-codebase tool or set-codebase-path.'
        };
        return {
          content: [{ type: 'text', text: output.message }],
          structuredContent: output
        };
      }

      const record = statsResult.records[0];
      const languageGroups = new Map<string, number>();
      
      // Aggregate language counts
      const languages = record.get('languages') || [];
      for (const lang of languages) {
        const current = languageGroups.get(lang.language) || 0;
        languageGroups.set(lang.language, current + 1);
      }

      const topLanguages = Array.from(languageGroups.entries())
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const output = {
        success: true,
        indexedAt: record.get('indexedAt')?.toString(),
        totalFiles: record.get('fileCount')?.toNumber() || 0,
        totalDirectories: record.get('dirCount')?.toNumber() || 0,
        totalDependencies: record.get('depCount')?.toNumber() || 0,
        topLanguages,
        message: 'Statistics retrieved successfully'
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = {
        success: false,
        totalFiles: 0,
        totalDirectories: 0,
        totalDependencies: 0,
        topLanguages: [],
        message: `Failed to get statistics: ${errorMessage}`
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  }
);

// Tool: Get Dependency Graph
server.registerTool(
  'get-dependency-graph',
  {
    title: 'Get Dependency Graph',
    description: 'Get the complete dependency graph from Neo4j',
    inputSchema: {
      depth: z.number().optional().describe('Maximum depth to traverse (default: 1)')
    },
    outputSchema: {
      success: z.boolean(),
      nodes: z.array(z.object({
        name: z.string(),
        version: z.string(),
        type: z.string()
      })),
      totalNodes: z.number()
    }
  },
  async ({ depth = 1 }) => {
    try {
      const codebasePath = configManager.getCodebasePath();
      if (!codebasePath) {
        const output = { success: false, nodes: [], totalNodes: 0 };
        return {
          content: [{ type: 'text', text: 'No codebase path set.' }],
          structuredContent: output
        };
      }

      if (!neo4jService?.isConnected()) {
        const output = { success: false, nodes: [], totalNodes: 0 };
        return {
          content: [{ type: 'text', text: 'Neo4j is not available.' }],
          structuredContent: output
        };
      }

      const result = await neo4jService.executeRead(
        `MATCH (c:Codebase { path: $path })-[:HAS_DEPENDENCY]->(d:Dependency)
         RETURN d.name as name, d.version as version, d.type as type`,
        { path: codebasePath }
      );

      const nodes = result.records.map(record => ({
        name: record.get('name'),
        version: record.get('version') || 'unknown',
        type: record.get('type')
      }));

      const output = {
        success: true,
        nodes,
        totalNodes: nodes.length
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = { success: false, nodes: [], totalNodes: 0 };
      return {
        content: [{ type: 'text', text: `Failed: ${errorMessage}` }],
        structuredContent: output
      };
    }
  }
);

// Tool: Get Directory Summary
server.registerTool(
  'get-directory-summary',
  {
    title: 'Get Directory Summary',
    description: 'Get aggregate statistics for a directory subtree',
    inputSchema: {
      dirPath: z.string().describe('Relative path to directory')
    },
    outputSchema: {
      success: z.boolean(),
      path: z.string(),
      totalFiles: z.number(),
      totalSize: z.number(),
      languages: z.record(z.number())
    }
  },
  async ({ dirPath }) => {
    try {
      const codebasePath = configManager.getCodebasePath();
      if (!codebasePath) {
        const output = { success: false, path: dirPath, totalFiles: 0, totalSize: 0, languages: {} };
        return {
          content: [{ type: 'text', text: 'No codebase path set.' }],
          structuredContent: output
        };
      }

      if (!neo4jService?.isConnected()) {
        const output = { success: false, path: dirPath, totalFiles: 0, totalSize: 0, languages: {} };
        return {
          content: [{ type: 'text', text: 'Neo4j is not available.' }],
          structuredContent: output
        };
      }

      const result = await neo4jService.executeRead(
        `MATCH (d:Directory { path: $dirPath })-[:CONTAINS*0..]->(f:File)
         RETURN count(f) as totalFiles, sum(f.size) as totalSize, 
                collect(f.language) as languages`,
        { dirPath }
      );

      if (result.records.length === 0) {
        const output = { success: false, path: dirPath, totalFiles: 0, totalSize: 0, languages: {} };
        return {
          content: [{ type: 'text', text: 'Directory not found in graph.' }],
          structuredContent: output
        };
      }

      const record = result.records[0];
      const languagesList = record.get('languages') || [];
      const languageCounts: Record<string, number> = {};
      
      for (const lang of languagesList) {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }

      const output = {
        success: true,
        path: dirPath,
        totalFiles: record.get('totalFiles')?.toNumber() || 0,
        totalSize: record.get('totalSize')?.toNumber() || 0,
        languages: languageCounts
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const output = { success: false, path: dirPath, totalFiles: 0, totalSize: 0, languages: {} };
      return {
        content: [{ type: 'text', text: `Failed: ${errorMessage}` }],
        structuredContent: output
      };
    }
  }
);

// Main function to start the server
async function main() {
  // Graceful shutdown handler
  const shutdown = async () => {
    console.error('[Main] Shutting down gracefully...');
    if (neo4jService) {
      await neo4jService.close();
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

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
