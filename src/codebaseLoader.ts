import fs from 'fs/promises';
import path from 'path';
import type { Ignore } from 'ignore';
import { ConfigManager } from './config.js';
import { Neo4jService } from './neo4jService.js';
import { initializeIgnoreFilter, detectLanguage, matchesPattern } from './utils.js';

export interface FileInfo {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  language?: string;
}

export interface CodebaseStructure {
  items: FileInfo[];
  totalFiles: number;
  totalDirectories: number;
}

export interface FileData {
  path: string;
  content: string;
  language: string;
  lines: number;
  size: number;
}

export interface SearchResult {
  path: string;
  matches?: number;
  preview?: string;
}

export interface ModuleDependencies {
  dependencies: Array<{
    name: string;
    version?: string;
    type: 'runtime' | 'dev' | 'peer' | 'optional';
  }>;
  devDependencies?: string[];
}

export class CodebaseLoader {
  private configManager: ConfigManager;
  private neo4jService: Neo4jService | null = null;
  private ignoreFilter: Ignore | null = null;

  constructor(configManager: ConfigManager, neo4jService?: Neo4jService) {
    this.configManager = configManager;
    this.neo4jService = neo4jService || null;
  }

  /**
   * Validate if a path exists and is a directory
   */
  async validatePath(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Initialize ignore filter from .gitignore and custom patterns
   */
  private async initializeIgnoreFilter(baseDir: string): Promise<void> {
    this.ignoreFilter = await initializeIgnoreFilter(
      baseDir,
      this.configManager.getIgnorePatterns()
    );
  }

  /**
   * Get codebase structure (Neo4j-aware with filesystem fallback)
   */
  async getStructure(maxDepth: number = 3, includeHidden: boolean = false): Promise<CodebaseStructure> {
    const baseDir = this.configManager.getCodebasePath();
    if (!baseDir) {
      throw new Error('No codebase path configured');
    }

    // Try Neo4j first if available
    if (this.neo4jService?.isConnected()) {
      try {
        return await this.getStructureFromGraph(maxDepth);
      } catch (error) {
        console.error('[CodebaseLoader] Neo4j query failed, falling back to filesystem');
      }
    }

    // Fallback to filesystem
    return await this.getStructureFromFilesystem(maxDepth, includeHidden);
  }

  /**
   * Get structure from Neo4j graph
   */
  private async getStructureFromGraph(maxDepth: number): Promise<CodebaseStructure> {
    const baseDir = this.configManager.getCodebasePath();
    if (!baseDir || !this.neo4jService) {
      throw new Error('Neo4j not available');
    }

    const result = await this.neo4jService.executeRead(
      `MATCH path = (c:Codebase { path: $basePath })-[:ROOT_DIR|CONTAINS*1..${maxDepth}]->(n)
       WHERE n:File OR n: Directory
       RETURN n.path as path, n.name as name, 
              CASE WHEN n:File THEN 'file' ELSE 'directory' END as type,
              n.size as size, n.language as language,
              length(path) - 1 as depth
       ORDER BY depth, path`,
      { basePath: baseDir }
    );

    const items: FileInfo[] = result.records.map(record => {
      const item: FileInfo = {
        path: record.get('path'),
        type: record.get('type') as 'file' | 'directory'
      };
      
      if (item.type === 'file') {
        item.size = record.get('size')?.toNumber() || 0;
        item.language = record.get('language') || 'unknown';
      }
      
      return item;
    });

    const totalFiles = items.filter(i => i.type === 'file').length;
    const totalDirectories = items.filter(i => i.type === 'directory').length;

    return { items, totalFiles, totalDirectories };
  }

  /**
   * Get structure from filesystem
   */
  private async getStructureFromFilesystem(maxDepth: number, includeHidden: boolean): Promise<CodebaseStructure> {
    const baseDir = this.configManager.getCodebasePath();
    if (!baseDir) {
      throw new Error('No codebase path configured');
    }

    await this.initializeIgnoreFilter(baseDir);

    const items: FileInfo[] = [];
    let totalFiles = 0;
    let totalDirectories = 0;

    const traverse = async (currentPath: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return;

      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files/folders if not included
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        // Check if path should be ignored
        if (this.ignoreFilter && this.ignoreFilter.ignores(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          totalDirectories++;
          items.push({
            path: relativePath,
            type: 'directory'
          });

          // Recursively traverse subdirectories
          await traverse(fullPath, depth + 1);
        } else if (entry.isFile()) {
          totalFiles++;
          const stats = await fs.stat(fullPath);
          items.push({
            path: relativePath,
            type: 'file',
            size: stats.size,
            language: detectLanguage(entry.name)
          });
        }
      }
    };

    await traverse(baseDir, 0);

    return {
      items,
      totalFiles,
      totalDirectories
    };
  }

  /**
   * Load file content
   */
  async loadFile(relativePath: string): Promise<FileData> {
    const baseDir = this.configManager.getCodebasePath();
    if (!baseDir) {
      throw new Error('No codebase path configured');
    }

    const fullPath = path.join(baseDir, relativePath);

    // Security check: ensure the path is within the codebase directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedBase = path.resolve(baseDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error('Access denied: path is outside codebase directory');
    }

    // Check if file exists
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    // Read file content
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n').length;

    return {
      path: relativePath,
      content,
      language: detectLanguage(relativePath),
      lines,
      size: stats.size
    };
  }

  /**
   * Search codebase
   */
  async search(
    query: string,
    searchType: 'filename' | 'content',
    filePattern?: string,
    maxResults: number = 50
  ): Promise<SearchResult[]> {
    const baseDir = this.configManager.getCodebasePath();
    if (!baseDir) {
      throw new Error('No codebase path configured');
    }

    await this.initializeIgnoreFilter(baseDir);

    const results: SearchResult[] = [];

    const searchInDirectory = async (currentPath: string): Promise<void> => {
      if (results.length >= maxResults) return;

      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        // Check if path should be ignored
        if (this.ignoreFilter && this.ignoreFilter.ignores(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await searchInDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check file pattern filter
          if (filePattern && !matchesPattern(entry.name, filePattern)) {
            continue;
          }

          if (searchType === 'filename') {
            // Search by filename
            if (entry.name.toLowerCase().includes(query.toLowerCase())) {
              results.push({ path: relativePath });
            }
          } else if (searchType === 'content') {
            // Search by content
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n');
              let matches = 0;
              let preview = '';

              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                  matches++;
                  if (!preview) {
                    // Get preview of first match with context
                    const start = Math.max(0, i - 1);
                    const end = Math.min(lines.length, i + 2);
                    preview = lines.slice(start, end).join('\n');
                  }
                }
              }

              if (matches > 0) {
                results.push({
                  path: relativePath,
                  matches,
                  preview
                });
              }
            } catch {
              // Skip files that can't be read as text
            }
          }
        }
      }
    };

    await searchInDirectory(baseDir);
    return results;
  }



  /**
   * Get module dependencies
   */
  async getModuleDependencies(modulePath: string = '.'): Promise<ModuleDependencies> {
    const baseDir = this.configManager.getCodebasePath();
    if (!baseDir) {
      throw new Error('No codebase path configured');
    }

    const result: ModuleDependencies = {
      dependencies: [],
      devDependencies: []
    };

    const moduleDir = path.join(baseDir, modulePath);

    // Check for package.json (Node.js/TypeScript)
    try {
      const packageJsonPath = path.join(moduleDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          result.dependencies.push({
            name,
            version: version as string,
            type: 'runtime'
          });
        });
      }

      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          result.dependencies.push({
            name,
            version: version as string,
            type: 'dev'
          });
          result.devDependencies?.push(name);
        });
      }

      if (packageJson.peerDependencies) {
        Object.entries(packageJson.peerDependencies).forEach(([name, version]) => {
          result.dependencies.push({
            name,
            version: version as string,
            type: 'peer'
          });
        });
      }

      return result;
    } catch {
      // package.json doesn't exist, try other formats
    }

    // Check for pom.xml (Java/Maven)
    try {
      const pomPath = path.join(moduleDir, 'pom.xml');
      const pomContent = await fs.readFile(pomPath, 'utf-8');
      // Simple XML parsing for dependencies (for demo purposes)
      const dependencyRegex = /<artifactId>(.*?)<\/artifactId>/g;
      let match;
      while ((match = dependencyRegex.exec(pomContent)) !== null) {
        result.dependencies.push({
          name: match[1],
          type: 'runtime'
        });
      }
      return result;
    } catch {
      // pom.xml doesn't exist
    }

    // Check for Cargo.toml (Rust)
    try {
      const cargoPath = path.join(moduleDir, 'Cargo.toml');
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
            result.dependencies.push({
              name,
              type: 'runtime'
            });
          }
        }
      }
      return result;
    } catch {
      // Cargo.toml doesn't exist
    }

    // Check for go.mod (Go)
    try {
      const goModPath = path.join(moduleDir, 'go.mod');
      const goModContent = await fs.readFile(goModPath, 'utf-8');
      const lines = goModContent.split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('require')) {
          const match = line.match(/require\s+([^\s]+)\s+([^\s]+)/);
          if (match) {
            result.dependencies.push({
              name: match[1],
              version: match[2],
              type: 'runtime'
            });
          }
        }
      }
      return result;
    } catch {
      // go.mod doesn't exist
    }

    throw new Error('No dependency file found (package.json, pom.xml, Cargo.toml, go.mod)');
  }
}
