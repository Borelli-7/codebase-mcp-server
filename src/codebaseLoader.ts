import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';
import type { Ignore } from 'ignore';
import { ConfigManager } from './config.js';

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
  private ignoreFilter: Ignore | null = null;

  // Language mappings by file extension
  private static readonly LANGUAGE_MAP: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.md': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sql': 'sql',
    '.r': 'r',
    '.m': 'matlab',
    '.dart': 'dart',
    '.vue': 'vue',
    '.svelte': 'svelte'
  };

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
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
    this.ignoreFilter = ignore.default();

    // Add default patterns
    const defaultPatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'out',
      'target',
      '.next',
      '.nuxt',
      'coverage',
      '.nyc_output',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ];

    this.ignoreFilter.add(defaultPatterns);

    // Add custom patterns from config
    const customPatterns = this.configManager.getIgnorePatterns();
    if (customPatterns.length > 0) {
      this.ignoreFilter.add(customPatterns);
    }

    // Try to load .gitignore if it exists
    try {
      const gitignorePath = path.join(baseDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      this.ignoreFilter.add(gitignoreContent);
    } catch {
      // .gitignore doesn't exist or couldn't be read, continue without it
    }
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return CodebaseLoader.LANGUAGE_MAP[ext] || 'unknown';
  }

  /**
   * Get codebase structure
   */
  async getStructure(maxDepth: number = 3, includeHidden: boolean = false): Promise<CodebaseStructure> {
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
            language: this.detectLanguage(entry.name)
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
      language: this.detectLanguage(relativePath),
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
          if (filePattern && !this.matchesPattern(entry.name, filePattern)) {
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
   * Check if filename matches pattern
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
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
