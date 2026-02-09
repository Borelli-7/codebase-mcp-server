import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';
import type { Ignore } from 'ignore';

/**
 * Language mappings by file extension
 */
export const LANGUAGE_MAP: Record<string, string> = {
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

/**
 * Default patterns to ignore during codebase scanning
 */
export const DEFAULT_IGNORE_PATTERNS = [
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

/**
 * Initialize an ignore filter from default patterns, custom patterns, and .gitignore
 * 
 * @param baseDir - Base directory to look for .gitignore file
 * @param customPatterns - Additional custom patterns to add
 * @returns Configured ignore filter
 */
export async function initializeIgnoreFilter(
  baseDir: string,
  customPatterns: string[] = []
): Promise<Ignore> {
  const ignoreFilter = ignore.default();

  // Add default patterns
  ignoreFilter.add(DEFAULT_IGNORE_PATTERNS);

  // Add custom patterns
  if (customPatterns.length > 0) {
    ignoreFilter.add(customPatterns);
  }

  // Try to load .gitignore if it exists
  try {
    const gitignorePath = path.join(baseDir, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    ignoreFilter.add(gitignoreContent);
  } catch {
    // .gitignore doesn't exist or couldn't be read, continue without it
  }

  return ignoreFilter;
}

/**
 * Detect programming language from file extension
 * 
 * @param filePath - Path to the file
 * @returns Language name or 'unknown'
 */
export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || 'unknown';
}

/**
 * Check if filename matches a glob pattern
 * 
 * @param filename - Filename to check
 * @param pattern - Glob pattern (supports * and ?)
 * @returns True if matches
 */
export function matchesPattern(filename: string, pattern: string): boolean {
  // Simple glob pattern matching
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(filename);
}
