/**
 * Automated Migration Script Framework
 * 
 * Uses ts-morph to update import paths during module consolidation.
 * Preserves named imports and aliases during migration.
 * 
 * Requirements: 14.1, 14.2, 14.3
 */

import { Project, SourceFile, ImportDeclaration, SyntaxKind } from 'ts-morph';
import * as path from 'path';

/**
 * Represents an import statement to be migrated
 */
export interface ImportToMigrate {
  file: string;
  oldPath: string;
  newPath: string;
  namedImports: string[];
  defaultImport?: string;
  namespaceImport?: string;
}

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  success: boolean;
  filesModified: number;
  importsUpdated: number;
  errors: string[];
}

/**
 * Configuration for migration
 */
export interface MigrationConfig {
  /** Base directory to search for files */
  baseDir: string;
  /** File patterns to include (e.g., ['**/*.ts', '**/*.tsx']) */
  includePatterns: string[];
  /** File patterns to exclude (e.g., ['**/*.test.ts', '**/node_modules/**']) */
  excludePatterns: string[];
  /** Whether to save changes automatically */
  autoSave: boolean;
}

/**
 * Finds all files that import from a specific module
 * 
 * @param project - ts-morph Project instance
 * @param modulePath - Module path to search for (e.g., '@/infrastructure/monitoring')
 * @returns Array of source files that import from the module
 */
export function findFilesImportingFrom(
  project: Project,
  modulePath: string
): SourceFile[] {
  const importingFiles: SourceFile[] = [];
  
  for (const sourceFile of project.getSourceFiles()) {
    const imports = sourceFile.getImportDeclarations();
    
    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      if (moduleSpecifier === modulePath || moduleSpecifier.startsWith(modulePath + '/')) {
        importingFiles.push(sourceFile);
        break; // Only add file once
      }
    }
  }
  
  return importingFiles;
}

/**
 * Extracts import information from an import declaration
 * 
 * @param importDecl - Import declaration to analyze
 * @returns Import information including named imports and aliases
 */
export function extractImportInfo(importDecl: ImportDeclaration): {
  namedImports: Array<{ name: string; alias?: string }>;
  defaultImport?: string;
  namespaceImport?: string;
} {
  const result: {
    namedImports: Array<{ name: string; alias?: string }>;
    defaultImport?: string;
    namespaceImport?: string;
  } = {
    namedImports: [],
  };
  
  // Extract default import
  const defaultImport = importDecl.getDefaultImport();
  if (defaultImport) {
    result.defaultImport = defaultImport.getText();
  }
  
  // Extract namespace import (import * as name)
  const namespaceImport = importDecl.getNamespaceImport();
  if (namespaceImport) {
    result.namespaceImport = namespaceImport.getText();
  }
  
  // Extract named imports
  const namedImports = importDecl.getNamedImports();
  for (const namedImport of namedImports) {
    const name = namedImport.getName();
    const alias = namedImport.getAliasNode()?.getText();
    
    result.namedImports.push({
      name,
      alias,
    });
  }
  
  return result;
}

/**
 * Replaces old import path with new path in a source file
 * Preserves named imports and aliases
 * 
 * @param sourceFile - Source file to modify
 * @param oldPath - Old import path to replace
 * @param newPath - New import path
 * @returns Number of imports updated
 */
export function replaceImportPath(
  sourceFile: SourceFile,
  oldPath: string,
  newPath: string
): number {
  let updatedCount = 0;
  const imports = sourceFile.getImportDeclarations();
  
  for (const importDecl of imports) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    
    // Check if this import matches the old path
    if (moduleSpecifier === oldPath || moduleSpecifier.startsWith(oldPath + '/')) {
      // Extract import information to preserve it
      const importInfo = extractImportInfo(importDecl);
      
      // Calculate new module specifier
      let newModuleSpecifier = newPath;
      if (moduleSpecifier.startsWith(oldPath + '/')) {
        // Preserve sub-path
        const subPath = moduleSpecifier.substring(oldPath.length);
        newModuleSpecifier = newPath + subPath;
      }
      
      // Update the module specifier
      importDecl.setModuleSpecifier(newModuleSpecifier);
      updatedCount++;
    }
  }
  
  return updatedCount;
}

/**
 * Creates a migration script for updating import paths
 * 
 * @param config - Migration configuration
 * @returns Migration script function
 */
export function createMigrationScript(config: MigrationConfig) {
  return {
    /**
     * Migrates imports from old path to new path
     * 
     * @param oldPath - Old module path
     * @param newPath - New module path
     * @returns Migration result
     */
    migrate: async (oldPath: string, newPath: string): Promise<MigrationResult> => {
      const result: MigrationResult = {
        success: true,
        filesModified: 0,
        importsUpdated: 0,
        errors: [],
      };
      
      try {
        // Create ts-morph project
        const project = new Project({
          tsConfigFilePath: path.join(config.baseDir, 'tsconfig.json'),
        });
        
        // Add source files based on patterns
        for (const pattern of config.includePatterns) {
          project.addSourceFilesAtPaths(path.join(config.baseDir, pattern));
        }
        
        // Find all files importing from old path
        const importingFiles = findFilesImportingFrom(project, oldPath);
        
        // Update imports in each file
        for (const sourceFile of importingFiles) {
          const updatedCount = replaceImportPath(sourceFile, oldPath, newPath);
          
          if (updatedCount > 0) {
            result.filesModified++;
            result.importsUpdated += updatedCount;
            
            // Save changes if auto-save is enabled
            if (config.autoSave) {
              await sourceFile.save();
            }
          }
        }
        
        // If not auto-saving, caller needs to save manually
        if (!config.autoSave) {
          // Project can be accessed for manual save
          result.success = true;
        }
        
      } catch (error) {
        result.success = false;
        result.errors.push(
          error instanceof Error ? error.message : String(error)
        );
      }
      
      return result;
    },
    
    /**
     * Finds all files that would be affected by a migration
     * 
     * @param oldPath - Old module path to search for
     * @returns Array of file paths that import from the old path
     */
    findAffectedFiles: (oldPath: string): string[] => {
      try {
        const project = new Project({
          tsConfigFilePath: path.join(config.baseDir, 'tsconfig.json'),
        });
        
        for (const pattern of config.includePatterns) {
          project.addSourceFilesAtPaths(path.join(config.baseDir, pattern));
        }
        
        const importingFiles = findFilesImportingFrom(project, oldPath);
        return importingFiles.map(file => file.getFilePath());
      } catch (error) {
        console.error('Error finding affected files:', error);
        return [];
      }
    },
    
    /**
     * Generates a migration report without making changes
     * 
     * @param oldPath - Old module path
     * @param newPath - New module path
     * @returns Report of what would be changed
     */
    generateReport: (oldPath: string, newPath: string): {
      affectedFiles: string[];
      totalImports: number;
      importsByFile: Map<string, number>;
    } => {
      const report = {
        affectedFiles: [] as string[],
        totalImports: 0,
        importsByFile: new Map<string, number>(),
      };
      
      try {
        const project = new Project({
          tsConfigFilePath: path.join(config.baseDir, 'tsconfig.json'),
        });
        
        for (const pattern of config.includePatterns) {
          project.addSourceFilesAtPaths(path.join(config.baseDir, pattern));
        }
        
        const importingFiles = findFilesImportingFrom(project, oldPath);
        
        for (const sourceFile of importingFiles) {
          const filePath = sourceFile.getFilePath();
          const imports = sourceFile.getImportDeclarations();
          let importCount = 0;
          
          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            if (moduleSpecifier === oldPath || moduleSpecifier.startsWith(oldPath + '/')) {
              importCount++;
            }
          }
          
          if (importCount > 0) {
            report.affectedFiles.push(filePath);
            report.importsByFile.set(filePath, importCount);
            report.totalImports += importCount;
          }
        }
      } catch (error) {
        console.error('Error generating report:', error);
      }
      
      return report;
    },
  };
}

/**
 * Updates import paths across the entire codebase
 * 
 * @param mappings - Array of old path to new path mappings
 * @param config - Migration configuration
 * @returns Overall migration result
 */
export async function updateImportPaths(
  mappings: Array<{ from: string; to: string }>,
  config: MigrationConfig
): Promise<MigrationResult> {
  const overallResult: MigrationResult = {
    success: true,
    filesModified: 0,
    importsUpdated: 0,
    errors: [],
  };
  
  const migrationScript = createMigrationScript(config);
  
  for (const mapping of mappings) {
    const result = await migrationScript.migrate(mapping.from, mapping.to);
    
    overallResult.filesModified += result.filesModified;
    overallResult.importsUpdated += result.importsUpdated;
    overallResult.errors.push(...result.errors);
    
    if (!result.success) {
      overallResult.success = false;
    }
  }
  
  return overallResult;
}

/**
 * Validates that all imports reference existing exports
 * 
 * @param project - ts-morph Project instance
 * @returns Validation errors (empty if all imports are valid)
 */
export function validateImports(project: Project): string[] {
  const errors: string[] = [];
  
  for (const sourceFile of project.getSourceFiles()) {
    const imports = sourceFile.getImportDeclarations();
    
    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Try to resolve the module
      const resolvedModule = importDecl.getModuleSpecifierSourceFile();
      
      if (!resolvedModule && !moduleSpecifier.startsWith('.')) {
        // Could not resolve non-relative import
        errors.push(
          `${sourceFile.getFilePath()}: Cannot resolve import '${moduleSpecifier}'`
        );
      }
    }
  }
  
  return errors;
}
