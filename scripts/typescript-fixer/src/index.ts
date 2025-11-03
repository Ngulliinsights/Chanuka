/**
 * TypeScript Error Fixer - Main Entry Point
 * 
 * This module exports the core functionality of the TypeScript error fixer
 * for programmatic use, while the CLI interface is handled separately.
 */

// Export core types
export * from './types/core';

// Export analyzers
export { ProjectAnalyzer } from './analyzers/project-analyzer';

// Export version information
export const VERSION = '1.0.0';

/**
 * Main TypeScript Error Fixer class for programmatic usage
 */
export class TypeScriptErrorFixer {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analyzes the project structure
   */
  async analyzeProject() {
    const { ProjectAnalyzer } = await import('./analyzers/project-analyzer');
    const analyzer = new ProjectAnalyzer(this.projectRoot);
    return await analyzer.analyzeProject();
  }

  /**
   * Gets the current version
   */
  getVersion(): string {
    return VERSION;
  }
}

// Default export
export default TypeScriptErrorFixer;