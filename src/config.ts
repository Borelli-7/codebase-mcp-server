import type { Neo4jConfig } from './neo4jService.js';

export class ConfigManager {
  private codebasePath: string | null = null;
  private ignorePatterns: string[] = [];
  private neo4jConfig: Neo4jConfig | null = null;
  private neo4jEnabled: boolean = false;

  constructor() {
    // Initialize Neo4j configuration from environment variables
    this.initializeNeo4jConfig();
  }

  /**
   * Initialize Neo4j configuration from environment variables
   */
  private initializeNeo4jConfig(): void {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'neo4j';
    const database = process.env.NEO4J_DATABASE || 'neo4j';

    if (uri) {
      this.neo4jConfig = { uri, username, password, database };
      this.neo4jEnabled = true;
    } else {
      this.neo4jEnabled = false;
    }
  }

  /**
   * Get Neo4j configuration
   */
  getNeo4jConfig(): Neo4jConfig | null {
    return this.neo4jConfig;
  }

  /**
   * Check if Neo4j is enabled
   */
  isNeo4jEnabled(): boolean {
    return this.neo4jEnabled;
  }

  /**
   * Set the codebase path
   */
  setCodebasePath(path: string): void {
    this.codebasePath = path;
  }

  /**
   * Get the current codebase path
   */
  getCodebasePath(): string | null {
    return this.codebasePath;
  }

  /**
   * Add an ignore pattern
   */
  addIgnorePattern(pattern: string): void {
    if (!this.ignorePatterns.includes(pattern)) {
      this.ignorePatterns.push(pattern);
    }
  }

  /**
   * Remove an ignore pattern
   */
  removeIgnorePattern(pattern: string): void {
    this.ignorePatterns = this.ignorePatterns.filter(p => p !== pattern);
  }

  /**
   * Get all ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [...this.ignorePatterns];
  }

  /**
   * Clear all ignore patterns
   */
  clearIgnorePatterns(): void {
    this.ignorePatterns = [];
  }

  /**
   * Reset configuration
   */
  reset(): void {
    this.codebasePath = null;
    this.ignorePatterns = [];
  }
}
