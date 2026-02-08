/**
 * Import Analyzer
 * 
 * Analyzes and identifies unused imports and incorrect import paths.
 */

import { Project, ImportDeclaration, SourceFile, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { RemediationConfig } from '../config';

export interface UnusedImport {
  file: string;
  importPath: string;
  importedNames: string[];
  line: number;
}

export interface IncorrectImportPath {
  file: string;
  importPath: string;
  reason: string;
  line: number;
  suggestedFix?: string;
}

export interface ImportAnalysisResult {
  unusedImports: UnusedImport[];
  incorrectPaths: IncorrectImportPath[];
  totalImports: number;
  filesAnalyzed: number;
}

export class ImportAnalyzer {
  private project: Project | null = null;
  private config: RemediationConfig;

  constructor(config: RemediationConfig) {
    this.config = config;
  }

  /**
   * Get or create the ts-morph Project
   */
  private getProject(): Project {
    if (!this.project) {
      this.project = new Project({
        tsConfigFilePath: this.config.tsconfigPath
      });
    }
    return this.project;
  }

  /**
   * Analyze all imports in the codebase
   */
  async analyzeImports(): Promise<ImportAnalysisResult> {
    const unusedImports: UnusedImport[] = [];
    const incorrectPaths: IncorrectImportPath[] = [];
    let totalImports = 0;
    let filesAnalyzed = 0;

    const sourceFiles = this.getProject().getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || 
          filePath.includes('.test.') || 
          filePath.includes('.spec.')) {
        continue;
      }

      filesAnalyzed++;

      // Analyze imports in this file
      const fileUnused = this.findUnusedImports(sourceFile);
      const fileIncorrect = this.findIncorrectImportPaths(sourceFile);

      unusedImports.push(...fileUnused);
      incorrectPaths.push(...fileIncorrect);

      // Count total imports
      totalImports += sourceFile.getImportDeclarations().length;
    }

    return {
      unusedImports,
      incorrectPaths,
      totalImports,
      filesAnalyzed
    };
  }

  /**
   * Find unused imports in a source file
   */
  private findUnusedImports(sourceFile: SourceFile): UnusedImport[] {
    const unused: UnusedImport[] = [];
    const importDeclarations = sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const namedImports = importDecl.getNamedImports();
      const defaultImport = importDecl.getDefaultImport();
      const namespaceImport = importDecl.getNamespaceImport();

      const unusedNames: string[] = [];

      // Check named imports
      for (const namedImport of namedImports) {
        const name = namedImport.getName();
        const alias = namedImport.getAliasNode()?.getText();
        const identifierToCheck = alias || name;

        if (!this.isIdentifierUsed(sourceFile, identifierToCheck, importDecl)) {
          unusedNames.push(name);
        }
      }

      // Check default import
      if (defaultImport) {
        const name = defaultImport.getText();
        if (!this.isIdentifierUsed(sourceFile, name, importDecl)) {
          unusedNames.push(`default as ${name}`);
        }
      }

      // Check namespace import
      if (namespaceImport) {
        const name = namespaceImport.getText();
        if (!this.isIdentifierUsed(sourceFile, name, importDecl)) {
          unusedNames.push(`* as ${name}`);
        }
      }

      // If all imports from this declaration are unused, record it
      if (unusedNames.length > 0) {
        const totalImports = namedImports.length + 
                           (defaultImport ? 1 : 0) + 
                           (namespaceImport ? 1 : 0);

        // Only record if ALL imports are unused
        if (unusedNames.length === totalImports) {
          unused.push({
            file: sourceFile.getFilePath(),
            importPath: moduleSpecifier,
            importedNames: unusedNames,
            line: importDecl.getStartLineNumber()
          });
        }
      }
    }

    return unused;
  }

  /**
   * Check if an identifier is used in the source file
   */
  private isIdentifierUsed(
    sourceFile: SourceFile,
    identifier: string,
    importDecl: ImportDeclaration
  ): boolean {
    // Get all identifiers in the file
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);

    // Get the import declaration's position range
    const importStart = importDecl.getStart();
    const importEnd = importDecl.getEnd();

    // Check if the identifier is used anywhere except in the import declaration
    for (const id of identifiers) {
      if (id.getText() === identifier) {
        // Make sure it's not part of the import declaration itself
        const idStart = id.getStart();
        const idEnd = id.getEnd();
        
        // If the identifier is outside the import declaration range, it's used
        if (idStart < importStart || idEnd > importEnd) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find incorrect import paths in a source file
   */
  private findIncorrectImportPaths(sourceFile: SourceFile): IncorrectImportPath[] {
    const incorrect: IncorrectImportPath[] = [];
    const importDeclarations = sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const filePath = sourceFile.getFilePath();

      // Check if the import path resolves to a valid module
      const resolvedPath = this.resolveImportPath(filePath, moduleSpecifier);

      if (!resolvedPath) {
        incorrect.push({
          file: filePath,
          importPath: moduleSpecifier,
          reason: 'Module not found',
          line: importDecl.getStartLineNumber()
        });
        continue;
      }

      // Check if the resolved file exists
      if (!this.fileExists(resolvedPath)) {
        incorrect.push({
          file: filePath,
          importPath: moduleSpecifier,
          reason: 'File does not exist',
          line: importDecl.getStartLineNumber(),
          suggestedFix: this.suggestCorrectPath(filePath, moduleSpecifier)
        });
      }
    }

    return incorrect;
  }

  /**
   * Resolve import path to absolute file path
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    try {
      // Handle path aliases
      if (importPath.startsWith('@client/')) {
        const relativePath = importPath.replace('@client/', '');
        return path.join(this.config.clientRoot, 'src', relativePath);
      } else if (importPath.startsWith('@/')) {
        const relativePath = importPath.replace('@/', '');
        return path.join(this.config.clientRoot, '..', relativePath);
      } else if (importPath.startsWith('.')) {
        // Relative path
        return path.resolve(path.dirname(fromFile), importPath);
      } else {
        // Node module - assume it exists
        return importPath;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a file exists (with common extensions)
   */
  private fileExists(filePath: string): boolean {
    // Try exact path
    if (fs.existsSync(filePath)) {
      return true;
    }

    // Try with common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
    for (const ext of extensions) {
      if (fs.existsSync(filePath + ext)) {
        return true;
      }
    }

    // Try as directory with index file
    const indexPaths = extensions.map(ext => path.join(filePath, `index${ext}`));
    for (const indexPath of indexPaths) {
      if (fs.existsSync(indexPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Suggest a correct path for an incorrect import
   */
  private suggestCorrectPath(fromFile: string, incorrectPath: string): string | undefined {
    // This is a simplified implementation
    // In a real implementation, this would use fuzzy matching to find similar paths
    
    const moduleName = path.basename(incorrectPath);
    
    // Search for files with similar names in the FSD structure
    const searchResults = this.searchForModule(moduleName);
    
    if (searchResults.length > 0) {
      // Return the first match as a suggestion
      return this.convertToImportPath(fromFile, searchResults[0]);
    }

    return undefined;
  }

  /**
   * Search for a module by name in the FSD structure
   */
  private searchForModule(moduleName: string): string[] {
    const results: string[] = [];

    // Search in each FSD layer
    for (const [layer, layerPath] of Object.entries(this.config.fsdLayers)) {
      if (fs.existsSync(layerPath)) {
        const found = this.searchDirectoryForModule(layerPath, moduleName, 3);
        results.push(...found);
      }
    }

    return results;
  }

  /**
   * Recursively search directory for a module
   */
  private searchDirectoryForModule(
    dirPath: string,
    moduleName: string,
    maxDepth: number,
    currentDepth: number = 0
  ): string[] {
    const results: string[] = [];

    if (currentDepth > maxDepth) {
      return results;
    }

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subResults = this.searchDirectoryForModule(
            fullPath,
            moduleName,
            maxDepth,
            currentDepth + 1
          );
          results.push(...subResults);
        } else if (entry.isFile()) {
          const fileName = path.basename(entry.name, path.extname(entry.name));
          if (fileName === moduleName || fileName === 'index') {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return results;
  }

  /**
   * Convert absolute file path to import path
   */
  private convertToImportPath(fromFile: string, toFile: string): string {
    // Convert to relative path
    let relativePath = path.relative(path.dirname(fromFile), toFile);

    // Remove extension
    relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Normalize path separators
    relativePath = relativePath.replace(/\\/g, '/');

    // Ensure it starts with ./
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    return relativePath;
  }

  /**
   * Generate import removal fixes
   */
  generateImportRemovalFixes(unusedImports: UnusedImport[]): Array<{
    file: string;
    importPath: string;
    action: 'remove_entire_import' | 'remove_specific_names';
    namesToRemove?: string[];
  }> {
    return unusedImports.map(unused => ({
      file: unused.file,
      importPath: unused.importPath,
      action: 'remove_entire_import' as const,
      namesToRemove: unused.importedNames
    }));
  }

  /**
   * Generate import correction fixes
   */
  generateImportCorrectionFixes(incorrectPaths: IncorrectImportPath[]): Array<{
    file: string;
    oldImportPath: string;
    newImportPath: string;
    reason: string;
  }> {
    return incorrectPaths
      .filter(incorrect => incorrect.suggestedFix)
      .map(incorrect => ({
        file: incorrect.file,
        oldImportPath: incorrect.importPath,
        newImportPath: incorrect.suggestedFix!,
        reason: incorrect.reason
      }));
  }

  /**
   * Apply import removal fixes in batches
   */
  async applyImportRemovalFixes(
    fixes: Array<{
      file: string;
      importPath: string;
      action: 'remove_entire_import' | 'remove_specific_names';
      namesToRemove?: string[];
    }>
  ): Promise<{
    success: boolean;
    filesModified: string[];
    fixesApplied: number;
    errors: string[];
  }> {
    const filesModified = new Set<string>();
    const errors: string[] = [];
    let fixesApplied = 0;

    // Group fixes by file
    const fixesByFile = new Map<string, typeof fixes>();
    for (const fix of fixes) {
      if (!fixesByFile.has(fix.file)) {
        fixesByFile.set(fix.file, []);
      }
      fixesByFile.get(fix.file)!.push(fix);
    }

    // Apply fixes file by file
    for (const [filePath, fileFixes] of fixesByFile.entries()) {
      try {
        const sourceFile = this.getProject().getSourceFile(filePath);
        if (!sourceFile) {
          errors.push(`Source file not found: ${filePath}`);
          continue;
        }

        for (const fix of fileFixes) {
          const importDecls = sourceFile.getImportDeclarations();
          const targetImport = importDecls.find(
            decl => decl.getModuleSpecifierValue() === fix.importPath
          );

          if (targetImport) {
            if (fix.action === 'remove_entire_import') {
              targetImport.remove();
              fixesApplied++;
            }
          }
        }

        await sourceFile.save();
        filesModified.add(filePath);
      } catch (error) {
        errors.push(`Error processing ${filePath}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      filesModified: Array.from(filesModified),
      fixesApplied,
      errors
    };
  }

  /**
   * Apply import correction fixes in batches
   */
  async applyImportCorrectionFixes(
    fixes: Array<{
      file: string;
      oldImportPath: string;
      newImportPath: string;
      reason: string;
    }>
  ): Promise<{
    success: boolean;
    filesModified: string[];
    fixesApplied: number;
    errors: string[];
  }> {
    const filesModified = new Set<string>();
    const errors: string[] = [];
    let fixesApplied = 0;

    // Group fixes by file
    const fixesByFile = new Map<string, typeof fixes>();
    for (const fix of fixes) {
      if (!fixesByFile.has(fix.file)) {
        fixesByFile.set(fix.file, []);
      }
      fixesByFile.get(fix.file)!.push(fix);
    }

    // Apply fixes file by file
    for (const [filePath, fileFixes] of fixesByFile.entries()) {
      try {
        const sourceFile = this.getProject().getSourceFile(filePath);
        if (!sourceFile) {
          errors.push(`Source file not found: ${filePath}`);
          continue;
        }

        for (const fix of fileFixes) {
          const importDecls = sourceFile.getImportDeclarations();
          const targetImport = importDecls.find(
            decl => decl.getModuleSpecifierValue() === fix.oldImportPath
          );

          if (targetImport) {
            targetImport.setModuleSpecifier(fix.newImportPath);
            fixesApplied++;
          }
        }

        await sourceFile.save();
        filesModified.add(filePath);
      } catch (error) {
        errors.push(`Error processing ${filePath}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      filesModified: Array.from(filesModified),
      fixesApplied,
      errors
    };
  }
}
