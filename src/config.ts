export class ConfigManager {
  private codebasePath: string | null = null;
  private ignorePatterns: string[] = [];

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
