import fs from 'fs/promises';
import path from 'path';
import type { Ignore } from 'ignore';
import { Neo4jService } from './neo4jService.js';
import { ConfigManager } from './config.js';
import { initializeIgnoreFilter, detectLanguage } from './utils.js';

export interface IndexResult {
  totalFiles: number;
  totalDirectories: number;
  totalDependencies: number;
  duration: number;
}

interface FileNode {
  path: string;
  name: string;
  size: number;
  language: string;
  mtime: string;
  lines: number;
  parentPath: string;
}

interface DirectoryNode {
  path: string;
  name: string;
  parentPath: string | null;
}

/**
 * Neo4j Indexer - Handles codebase indexing into graph database
 */
export class Neo4jIndexer {
  private neo4jService: Neo4jService;
  private configManager: ConfigManager;

  constructor(neo4jService: Neo4jService, configManager: ConfigManager) {
    this.neo4jService = neo4jService;
    this.configManager = configManager;
  }

  /**
   * Index entire codebase into Neo4j
   * 
   * @param basePath - Root path of the codebase
   * @returns Indexing results
   */
  async indexCodebase(basePath: string): Promise<IndexResult> {
    const startTime = Date.now();
    
    try {
      console.error(`[Neo4j Indexer] Starting indexing for: ${basePath}`);

      // Step 1: Clear existing graph
      await this.neo4jService.clearDatabase();

      // Step 2: Create Codebase root node
      await this.neo4jService.executeWrite(
        `CREATE (:Codebase { 
          path: $path, 
          indexedAt: datetime(),
          name: $name
        })`,
        { 
          path: basePath,
          name: path.basename(basePath)
        }
      );

      // Step 3: Build ignore filter
      const ignoreFilter = await initializeIgnoreFilter(
        basePath,
        this.configManager.getIgnorePatterns()
      );

      // Step 4: Traverse filesystem and collect nodes
      const files: FileNode[] = [];
      const directories: DirectoryNode[] = [];
      
      await this.traverseDirectory(basePath, basePath, ignoreFilter, files, directories);

      // Step 5: Batch insert directories
      await this.batchInsertDirectories(basePath, directories);

      // Step 6: Batch insert files
      await this.batchInsertFiles(basePath, files);

      // Step 7: Index dependencies
      const dependencyCount = await this.indexDependencies(basePath);

      const duration = Date.now() - startTime;
      
      console.error(`[Neo4j Indexer] Completed in ${duration}ms: ${files.length} files, ${directories.length} dirs, ${dependencyCount} deps`);

      return {
        totalFiles: files.length,
        totalDirectories: directories.length,
        totalDependencies: dependencyCount,
        duration
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Neo4j Indexer] Indexing failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Recursively traverse directory and collect file/directory nodes
   */
  private async traverseDirectory(
    basePath: string,
    currentPath: string,
    ignoreFilter: Ignore,
    files: FileNode[],
    directories: DirectoryNode[]
  ): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      // Check if path should be ignored
      if (ignoreFilter.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        const parentPath = path.relative(basePath, currentPath) || '';
        
        directories.push({
          path: relativePath,
          name: entry.name,
          parentPath: parentPath || null
        });

        // Recursively traverse subdirectories
        await this.traverseDirectory(basePath, fullPath, ignoreFilter, files, directories);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        const parentPath = path.relative(basePath, currentPath) || '';

        // Read file to count lines (for text files)
        let lines = 0;
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          lines = content.split('\n').length;
        } catch {
          // Binary file or read error, skip line count
        }

        files.push({
          path: relativePath,
          name: entry.name,
          size: stats.size,
          language: detectLanguage(entry.name),
          mtime: stats.mtime.toISOString(),
          lines,
          parentPath: parentPath || ''
        });
      }
    }
  }

  /**
   * Batch insert directories into Neo4j
   */
  private async batchInsertDirectories(basePath: string, directories: DirectoryNode[]): Promise<void> {
    if (directories.length === 0) return;

    const BATCH_SIZE = 500;
    
    // First, create root directory if not exists and link to Codebase
    const rootDirs = directories.filter(d => !d.parentPath);
    if (rootDirs.length > 0) {
      for (const rootDir of rootDirs) {
        await this.neo4jService.executeWrite(
          `MATCH (c:Codebase { path: $basePath })
           MERGE (d:Directory { path: $path, name: $name })
           MERGE (c)-[:ROOT_DIR]->(d)`,
          {
            basePath,
            path: rootDir.path,
            name: rootDir.name
          }
        );
      }
    }

    // Then batch insert all other directories with CONTAINS relationships
    const nonRootDirs = directories.filter(d => d.parentPath);
    
    for (let i = 0; i < nonRootDirs.length; i += BATCH_SIZE) {
      const batch = nonRootDirs.slice(i, i + BATCH_SIZE);
      
      await this.neo4jService.executeWrite(
        `UNWIND $batch AS item
         MERGE (d:Directory { path: item.path, name: item.name })
         WITH d, item
         MATCH (parent:Directory { path: item.parentPath })
         MERGE (parent)-[:CONTAINS]->(d)`,
        { batch }
      );
    }

    console.error(`[Neo4j Indexer] Inserted ${directories.length} directories`);
  }

  /**
   * Batch insert files into Neo4j
   */
  private async batchInsertFiles(basePath: string, files: FileNode[]): Promise<void> {
    if (files.length === 0) return;

    const BATCH_SIZE = 500;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      
      await this.neo4jService.executeWrite(
        `UNWIND $batch AS item
         CREATE (f:File {
           path: item.path,
           name: item.name,
           size: item.size,
           language: item.language,
           mtime: datetime(item.mtime),
           lines: item.lines
         })
         WITH f, item
         OPTIONAL MATCH (parent:Directory { path: item.parentPath })
         OPTIONAL MATCH (c:Codebase { path: $basePath })
         FOREACH (_ IN CASE WHEN parent IS NOT NULL THEN [1] ELSE [] END |
           MERGE (parent)-[:CONTAINS]->(f)
         )
         FOREACH (_ IN CASE WHEN parent IS NULL THEN [1] ELSE [] END |
           MERGE (c)-[:CONTAINS]->(f)
         )`,
        { batch, basePath }
      );
    }

    console.error(`[Neo4j Indexer] Inserted ${files.length} files`);
  }

  /**
   * Index dependencies from manifest files
   */
  private async indexDependencies(basePath: string): Promise<number> {
    const dependencies = await this.parseDependencies(basePath);
    
    if (dependencies.length === 0) return 0;

    await this.neo4jService.executeWrite(
      `MATCH (c:Codebase { path: $basePath })
       UNWIND $deps AS dep
       MERGE (d:Dependency { name: dep.name, version: COALESCE(dep.version, 'unknown'), type: dep.type })
       MERGE (c)-[:HAS_DEPENDENCY]->(d)`,
      { basePath, deps: dependencies }
    );

    console.error(`[Neo4j Indexer] Indexed ${dependencies.length} dependencies`);
    return dependencies.length;
  }

  /**
   * Parse dependencies from package.json, pom.xml, Cargo.toml, or go.mod
   */
  private async parseDependencies(basePath: string): Promise<Array<{ name: string; version?: string; type: string }>> {
    const deps: Array<{ name: string; version?: string; type: string }> = [];

    // Try package.json (Node.js/TypeScript)
    try {
      const packageJsonPath = path.join(basePath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          deps.push({ name, version: version as string, type: 'runtime' });
        });
      }

      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          deps.push({ name, version: version as string, type: 'dev' });
        });
      }

      if (packageJson.peerDependencies) {
        Object.entries(packageJson.peerDependencies).forEach(([name, version]) => {
          deps.push({ name, version: version as string, type: 'peer' });
        });
      }

      return deps;
    } catch {
      // package.json doesn't exist, try other formats
    }

    // Try pom.xml (Java/Maven)
    try {
      const pomPath = path.join(basePath, 'pom.xml');
      const pomContent = await fs.readFile(pomPath, 'utf-8');
      const dependencyRegex = /<artifactId>(.*?)<\/artifactId>/g;
      let match;
      while ((match = dependencyRegex.exec(pomContent)) !== null) {
        deps.push({ name: match[1], type: 'runtime' });
      }
      return deps;
    } catch {
      // pom.xml doesn't exist
    }

    // Try Cargo.toml (Rust)
    try {
      const cargoPath = path.join(basePath, 'Cargo.toml');
      const cargoContent = await fs.readFile(cargoPath, 'utf-8');
      const lines = cargoContent.split('\n');
      let inDependencies = false;

      for (const line of lines) {
        if (line.trim() === '[dependencies]') {
          inDependencies = true;
          continue;
        }
        if (line.trim().startsWith('[')) {
          inDependencies = false;
        }
        if (inDependencies && line.includes('=')) {
          const [name] = line.split('=').map(s => s.trim());
          if (name && !name.startsWith('#')) {
            deps.push({ name, type: 'runtime' });
          }
        }
      }
      return deps;
    } catch {
      // Cargo.toml doesn't exist
    }

    // Try go.mod (Go)
    try {
      const goModPath = path.join(basePath, 'go.mod');
      const goModContent = await fs.readFile(goModPath, 'utf-8');
      const lines = goModContent.split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('require')) {
          const match = line.match(/require\s+([^\s]+)\s+([^\s]+)/);
          if (match) {
            deps.push({ name: match[1], version: match[2], type: 'runtime' });
          }
        }
      }
      return deps;
    } catch {
      // go.mod doesn't exist
    }

    return deps;
  }
}
