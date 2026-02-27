/**
 * Automated Migration Script Framework
 * 
 * Uses ts-morph to update import paths during module consolidation.
 * Preserves named imports and aliases during migration.
 * 
 * Requirements: 14.1, 14.2, 14.3
 */

import { Project, SourceFile, ImportDeclaration } from 'ts-morph';
import * as path from 'path';

export interface ImportToMigrate {
  file: string;
  oldPath: string;
  newPath: string;
  namedImports: string[];
  defaultImport?: string;
  namespaceImport?: string;
}

export interface MigrationResult {
  success: boolean;
  filesModified: number;
  importsUpdated: number;
  errors: string[];
}

export interface MigrationConfig {
  baseDir: string;
  includePatterns: string[];
  excludePatterns: string[];
  autoSave: boolean;
}

export interface ImportInfo {
  namedImports: Array<{ name: string; alias?: string }>;
  defaultImport?: string;
  namespaceImport?: string;
}

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
        break;
      }
    }
  }
  
  return importingFiles;
}

export function extractImportInfo(importDecl: ImportDeclaration): ImportInfo {
  const result: ImportInfo = {
    namedImports: [],
  };
  
  const defaultImport = importDecl.getDefaultImport();
  if (defaultImport) {
    result.defaultImport = defaultImport.getText();
  }
  
  const namespaceImport = importDecl.getNamespaceImport();
  if (namespaceImport) {
    result.namespaceImport = namespaceImport.getText();
  }
  
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

export function replaceImportPath(
  sourceFile: SourceFile,
  oldPath: string,
  newPath: string
): number {
  let updatedCount = 0;
  const imports = sourceFile.getImportDeclarations();
  
  for (const importDecl of imports) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    
    if (moduleSpecifier === oldPath || moduleSpecifier.startsWith(oldPath + '/')) {
      const importInfo = extractImportInfo(importDecl);
      
      let newModuleSpecifier = newPath;
      if (moduleSpecifier.startsWith(oldPath + '/')) {
        const subPath = moduleSpecifier.substring(oldPath.length);
        newModuleSpecifier = newPath + subPath;
      }
      
      importDecl.setModuleSpecifier(newModuleSpecifier);
      updatedCount++;
    }
  }
  
  return updatedCount;
}

export function createMigrationScript(config: MigrationConfig) {
  return {
    migrate: async (oldPath: string, newPath: string): Promise<MigrationResult> => {
      const result: MigrationResult = {
        success: true,
        filesModified: 0,
        importsUpdated: 0,
        errors: [],
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
          const updatedCount = replaceImportPath(sourceFile, oldPath, newPath);
          
          if (updatedCount > 0) {
            result.filesModified++;
            result.importsUpdated += updatedCount;
            
            if (config.autoSave) {
              await sourceFile.save();
            }
          }
        }
        
      } catch (error) {
        result.success = false;
        result.errors.push(
          error instanceof Error ? error.message : String(error)
        );
      }
      
      return result;
    },
    
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
    
    generateReport: (oldPath: string, newPath: string) => {
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

export function validateImports(project: Project): string[] {
  const errors: string[] = [];
  
  for (const sourceFile of project.getSourceFiles()) {
    const imports = sourceFile.getImportDeclarations();
    
    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const resolvedModule = importDecl.getModuleSpecifierSourceFile();
      
      if (!resolvedModule && !moduleSpecifier.startsWith('.')) {
        errors.push(
          `${sourceFile.getFilePath()}: Cannot resolve import '${moduleSpecifier}'`
        );
      }
    }
  }
  
  return errors;
}
