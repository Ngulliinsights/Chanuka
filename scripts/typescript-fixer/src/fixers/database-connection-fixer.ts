import { SourceFile, SyntaxKind, Node, ImportDeclaration, Identifier } from 'typescript';
import { ErrorFixer, TypeScriptError, FixResult, CodeChange, ProcessingContext } from '../types/core';

/**
 * Fixes database connection import issues in the Chanuka project
 * Handles missing imports from '@shared/database/connection' and database service patterns
 */
export class DatabaseConnectionFixer implements ErrorFixer {
  private readonly DATABASE_ERROR_CODES = [
    2304, // Cannot find name
    2307, // Cannot find module
    2339, // Property does not exist on type
    6133, // Declared but never read (for cleanup)
  ];

  private readonly DATABASE_CONNECTION_IMPORTS = new Set([
    'database', 'readDatabase', 'writeDatabase', 'pool',
    'operationalDb', 'analyticsDb', 'securityDb',
    'withTransaction', 'withReadConnection',
    'checkDatabaseHealth', 'closeDatabaseConnections',
    'DatabaseTransaction', 'DatabaseOperation', 'TransactionOptions',
    'getDatabase'
  ]);

  private readonly DATABASE_SERVICE_IMPORTS = new Set([
    'databaseService', 'DatabaseService', 'DatabaseResult', 
    'HealthCheckResult', 'TransactionCallback', 'RetryConfig'
  ]);

  private readonly DRIZZLE_ORM_IMPORTS = new Set([
    'eq', 'and', 'or', 'not', 'sql', 'desc', 'asc', 'count', 'sum', 'avg',
    'min', 'max', 'inArray', 'notInArray', 'like', 'ilike', 'between',
    'isNull', 'isNotNull', 'exists', 'notExists'
  ]);

  canHandle(error: TypeScriptError): boolean {
    if (!this.DATABASE_ERROR_CODES.includes(error.code)) {
      return false;
    }

    const errorText = error.context?.errorText || error.message;
    
    // Handle module import errors for database connections
    if (error.code === 2307 && (
      errorText.includes('@shared/database') || 
      errorText.includes('shared/database') ||
      errorText.includes('database/connection') ||
      errorText.includes('database-service')
    )) {
      return true;
    }

    // Handle unused import cleanup (error code 6133)
    if (error.code === 6133) {
      return true;
    }

    // Check if the error involves a known database utility
    return Array.from(this.DATABASE_CONNECTION_IMPORTS).some(utility => 
      errorText.includes(utility)
    ) || Array.from(this.DATABASE_SERVICE_IMPORTS).some(utility => 
      errorText.includes(utility)
    ) || Array.from(this.DRIZZLE_ORM_IMPORTS).some(utility => 
      errorText.includes(utility)
    );
  }

  fix(error: TypeScriptError, sourceFile: SourceFile, context?: ProcessingContext): FixResult {
    try {
      const changes: CodeChange[] = [];
      const warnings: string[] = [];

      // Handle unused import cleanup first (error code 6133)
      if (error.code === 6133) {
        const cleanupChanges = this.cleanupUnusedImports(sourceFile, error);
        return {
          success: cleanupChanges.length > 0,
          changes: cleanupChanges,
          message: cleanupChanges.length > 0 
            ? 'Removed unused database import'
            : 'No unused database imports to remove'
        };
      }

      // Handle module import errors (error code 2307)
      if (error.code === 2307) {
        const pathFixes = this.fixDatabaseImportPaths(sourceFile, error, context);
        if (pathFixes.length > 0) {
          return {
            success: true,
            changes: pathFixes,
            message: 'Fixed database import path issues'
          };
        }
      }

      // Identify the missing database utility from the error
      const missingUtility = this.identifyMissingDatabaseUtility(error);
      if (!missingUtility) {
        return {
          success: false,
          changes: [],
          message: 'Could not identify missing database utility',
          error: 'Unable to determine which database utility is missing'
        };
      }

      // Check if utility is already imported
      if (this.isUtilityAlreadyImported(sourceFile, missingUtility)) {
        return {
          success: false,
          changes: [],
          message: `Utility ${missingUtility} is already imported`,
          error: 'Utility already exists in imports'
        };
      }

      // Determine the correct import path
      const importPath = this.resolveImportPath(missingUtility, context);
      if (!importPath) {
        return {
          success: false,
          changes: [],
          message: `Could not resolve import path for database utility: ${missingUtility}`,
          error: 'Database import path resolution failed'
        };
      }

      // Check if import already exists
      const existingImport = this.findExistingImport(sourceFile, importPath);
      if (existingImport) {
        // Add to existing import
        const addToImportChange = this.addToExistingImport(
          sourceFile, 
          existingImport, 
          missingUtility
        );
        if (addToImportChange) {
          changes.push(addToImportChange);
        } else {
          // If we can't add to existing import (e.g., default import), create new import
          const newImportChange = this.createNewImport(
            sourceFile, 
            missingUtility, 
            importPath
          );
          if (newImportChange) {
            changes.push(newImportChange);
          }
        }
      } else {
        // Create new import
        const newImportChange = this.createNewImport(
          sourceFile, 
          missingUtility, 
          importPath
        );
        if (newImportChange) {
          changes.push(newImportChange);
        }
      }

      // Fix database transaction patterns if needed
      const transactionFixes = this.fixTransactionPatterns(sourceFile, context);
      changes.push(...transactionFixes);

      return {
        success: changes.length > 0,
        changes,
        message: changes.length > 0 
          ? `Added database import for ${missingUtility} from ${importPath}`
          : 'No changes needed',
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (err) {
      return {
        success: false,
        changes: [],
        message: 'Failed to fix database connection import',
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  getDescription(): string {
    return 'Fixes missing database connection imports and database service patterns';
  }

  getPriority(): number {
    return 75; // High priority for database connections
  }

  /**
   * Identifies which database utility is missing from the error
   */
  private identifyMissingDatabaseUtility(error: TypeScriptError): string | null {
    const errorText = error.context?.errorText || error.message;
    
    // Look for patterns like "Cannot find name 'database'"
    const nameMatch = errorText.match(/Cannot find name '([^']+)'/);
    if (nameMatch) {
      const name = nameMatch[1];
      if (this.DATABASE_CONNECTION_IMPORTS.has(name) || 
          this.DATABASE_SERVICE_IMPORTS.has(name) ||
          this.DRIZZLE_ORM_IMPORTS.has(name)) {
        return name;
      }
    }

    // Look for property access patterns
    const propertyMatch = errorText.match(/Property '([^']+)' does not exist/);
    if (propertyMatch) {
      const name = propertyMatch[1];
      if (this.DATABASE_CONNECTION_IMPORTS.has(name) || 
          this.DATABASE_SERVICE_IMPORTS.has(name) ||
          this.DRIZZLE_ORM_IMPORTS.has(name)) {
        return name;
      }
    }

    // Check if any known utility is mentioned in the error (exact match only)
    for (const utility of [...this.DATABASE_CONNECTION_IMPORTS, ...this.DATABASE_SERVICE_IMPORTS, ...this.DRIZZLE_ORM_IMPORTS]) {
      // Use word boundaries to ensure exact matches
      const regex = new RegExp(`\\b${utility}\\b`);
      if (regex.test(errorText)) {
        return utility;
      }
    }

    return null;
  }

  /**
   * Resolves the correct import path for a database utility
   */
  private resolveImportPath(utility: string, context?: ProcessingContext): string | null {
    // Use project structure information if available
    if (context?.project?.database) {
      const { commonImports } = context.project.database;
      if (commonImports[utility]) {
        return commonImports[utility];
      }
    }

    // Fallback to known mappings based on utility patterns
    return this.getKnownImportPath(utility);
  }

  /**
   * Returns known import paths for database utilities
   */
  private getKnownImportPath(utility: string): string | null {
    const utilityMappings: Record<string, string> = {
      // Database connection utilities
      'database': '@shared/database/connection',
      'readDatabase': '@shared/database/connection',
      'writeDatabase': '@shared/database/connection',
      'pool': '@shared/database/connection',
      'operationalDb': '@shared/database/connection',
      'analyticsDb': '@shared/database/connection',
      'securityDb': '@shared/database/connection',
      'getDatabase': '@shared/database/connection',

      // Transaction utilities
      'withTransaction': '@shared/database/connection',
      'withReadConnection': '@shared/database/connection',
      'DatabaseTransaction': '@shared/database/connection',
      'DatabaseOperation': '@shared/database/connection',
      'TransactionOptions': '@shared/database/connection',

      // Health and management utilities
      'checkDatabaseHealth': '@shared/database/connection',
      'closeDatabaseConnections': '@shared/database/connection',

      // Database service utilities
      'databaseService': '@shared/database',
      'DatabaseService': '@server/infrastructure/database/database-service',
      'DatabaseResult': '@server/infrastructure/database/database-service',
      'HealthCheckResult': '@server/infrastructure/database/database-service',
      'TransactionCallback': '@server/infrastructure/database/database-service',
      'RetryConfig': '@server/infrastructure/database/database-service',

      // Drizzle ORM utilities
      'eq': 'drizzle-orm',
      'and': 'drizzle-orm',
      'or': 'drizzle-orm',
      'not': 'drizzle-orm',
      'sql': 'drizzle-orm',
      'desc': 'drizzle-orm',
      'asc': 'drizzle-orm',
      'count': 'drizzle-orm',
      'sum': 'drizzle-orm',
      'avg': 'drizzle-orm',
      'min': 'drizzle-orm',
      'max': 'drizzle-orm',
      'inArray': 'drizzle-orm',
      'notInArray': 'drizzle-orm',
      'like': 'drizzle-orm',
      'ilike': 'drizzle-orm',
      'between': 'drizzle-orm',
      'isNull': 'drizzle-orm',
      'isNotNull': 'drizzle-orm',
      'exists': 'drizzle-orm',
      'notExists': 'drizzle-orm',
    };

    return utilityMappings[utility] || null;
  }

  /**
   * Fixes database import path issues
   */
  private fixDatabaseImportPaths(
    sourceFile: SourceFile,
    error: TypeScriptError,
    context?: ProcessingContext
  ): CodeChange[] {
    const changes: CodeChange[] = [];
    const errorText = error.context?.errorText || error.message;

    // Look for problematic import paths in the error
    for (const statement of sourceFile.statements) {
      if (statement.kind === SyntaxKind.ImportDeclaration) {
        const importDecl = statement as ImportDeclaration;
        const moduleSpecifier = importDecl.moduleSpecifier;
        
        if (moduleSpecifier && moduleSpecifier.kind === SyntaxKind.StringLiteral) {
          const importPath = (moduleSpecifier as any).text;
          
          // Fix relative paths to database connections
          if (this.shouldFixDatabasePath(importPath, errorText)) {
            const correctedPath = this.correctDatabasePath(importPath);
            if (correctedPath && correctedPath !== importPath) {
              changes.push({
                type: 'replace',
                start: moduleSpecifier.pos + 1, // +1 to skip the quote
                end: moduleSpecifier.end - 1,   // -1 to skip the quote
                newText: correctedPath,
                description: `Fix database import path: ${correctedPath}`,
                originalText: importPath
              });
            }
          }
        }
      }
    }

    return changes;
  }

  /**
   * Determines if a database import path should be fixed
   */
  private shouldFixDatabasePath(importPath: string, errorText: string): boolean {
    // Check for relative paths to database connections
    if (importPath.includes('../') && importPath.includes('database')) {
      return true;
    }

    // Check for incorrect database service paths
    if (importPath.includes('database-service') && !importPath.startsWith('@server/infrastructure/database/')) {
      return true;
    }

    // Check for incorrect shared database paths
    if (importPath.includes('shared/database') && !importPath.startsWith('@shared/database')) {
      return true;
    }

    return false;
  }

  /**
   * Corrects database import paths
   */
  private correctDatabasePath(importPath: string): string | null {
    // Fix relative paths to shared database connection
    if (importPath.includes('shared/database/connection')) {
      return '@shared/database/connection';
    }

    // Fix relative paths to shared database
    if (importPath.includes('shared/database') && !importPath.includes('/connection')) {
      return '@shared/database';
    }

    // Fix database service paths
    if (importPath.includes('database-service')) {
      return '@server/infrastructure/database/database-service';
    }

    // Fix infrastructure database paths
    if (importPath.includes('infrastructure/database') && !importPath.startsWith('@server/')) {
      return `@server/infrastructure/database/${importPath.split('/').pop()}`;
    }

    return null;
  }

  /**
   * Fixes database transaction patterns
   */
  private fixTransactionPatterns(
    sourceFile: SourceFile,
    context?: ProcessingContext
  ): CodeChange[] {
    const changes: CodeChange[] = [];
    
    // This would analyze the source file for common transaction pattern issues
    // For now, we'll focus on import fixes, but this could be expanded to handle:
    // - Missing transaction wrappers
    // - Incorrect database connection usage
    // - Missing error handling in transactions
    
    return changes;
  }

  /**
   * Finds existing import declaration for the given module path
   */
  private findExistingImport(sourceFile: SourceFile, importPath: string): ImportDeclaration | null {
    for (const statement of sourceFile.statements) {
      if (statement.kind === SyntaxKind.ImportDeclaration) {
        const importDecl = statement as ImportDeclaration;
        const moduleSpecifier = importDecl.moduleSpecifier;
        
        if (moduleSpecifier && moduleSpecifier.kind === SyntaxKind.StringLiteral) {
          const importPathText = (moduleSpecifier as any).text;
          if (importPathText === importPath) {
            return importDecl;
          }
        }
      }
    }
    return null;
  }

  /**
   * Adds a utility to an existing import statement
   */
  private addToExistingImport(
    sourceFile: SourceFile,
    importDecl: ImportDeclaration,
    utility: string
  ): CodeChange | null {
    const importClause = importDecl.importClause;
    if (!importClause) {
      return null;
    }

    // Handle named imports
    if (importClause.namedBindings && importClause.namedBindings.kind === SyntaxKind.NamedImports) {
      const namedImports = importClause.namedBindings as any;
      const elements = namedImports.elements;
      
      // Check if utility is already imported
      const alreadyImported = elements.some((element: any) => 
        element.name.text === utility
      );
      
      if (alreadyImported) {
        return null;
      }

      // Find the position to insert the new import
      const lastElement = elements[elements.length - 1];
      const insertPosition = lastElement.end;
      
      return {
        type: 'insert',
        start: insertPosition,
        end: insertPosition,
        newText: `, ${utility}`,
        description: `Add ${utility} to existing database import`
      };
    }

    // Handle default imports - can't add named imports to default imports
    if (importClause.name) {
      return null;
    }

    return null;
  }

  /**
   * Checks if a utility is already imported in the source file
   */
  private isUtilityAlreadyImported(sourceFile: SourceFile, utility: string): boolean {
    for (const statement of sourceFile.statements) {
      if (statement.kind === SyntaxKind.ImportDeclaration) {
        const importDecl = statement as ImportDeclaration;
        const importClause = importDecl.importClause;
        
        if (importClause?.namedBindings?.kind === SyntaxKind.NamedImports) {
          const namedImports = importClause.namedBindings as any;
          const elements = namedImports.elements;
          
          const isImported = elements.some((element: any) => 
            element.name.text === utility
          );
          
          if (isImported) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Creates a new import statement
   */
  private createNewImport(
    sourceFile: SourceFile,
    utility: string,
    importPath: string
  ): CodeChange | null {
    // Find the position to insert the new import (after existing imports)
    let insertPosition = 0;
    let hasImports = false;

    for (const statement of sourceFile.statements) {
      if (statement.kind === SyntaxKind.ImportDeclaration) {
        insertPosition = statement.end;
        hasImports = true;
      } else if (hasImports) {
        // Stop at the first non-import statement
        break;
      }
    }

    // If no imports exist, insert at the beginning
    if (!hasImports) {
      insertPosition = 0;
    }

    const importStatement = `import { ${utility} } from '${importPath}';\n`;
    
    return {
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newText: hasImports ? `\n${importStatement}` : importStatement,
      description: `Add database import for ${utility} from ${importPath}`
    };
  }

  /**
   * Cleans up unused database imports (for error code 6133)
   */
  private cleanupUnusedImports(sourceFile: SourceFile, error: TypeScriptError): CodeChange[] {
    const changes: CodeChange[] = [];
    
    // Extract the unused import name from the error message
    const unusedMatch = error.message.match(/'([^']+)' is declared but its value is never read/);
    if (!unusedMatch) {
      return changes;
    }

    const unusedName = unusedMatch[1];

    // Only handle database-related unused imports
    if (!this.DATABASE_CONNECTION_IMPORTS.has(unusedName) && 
        !this.DATABASE_SERVICE_IMPORTS.has(unusedName) &&
        !this.DRIZZLE_ORM_IMPORTS.has(unusedName)) {
      return changes;
    }

    // Find and remove the unused import
    for (const statement of sourceFile.statements) {
      if (statement.kind === SyntaxKind.ImportDeclaration) {
        const importDecl = statement as ImportDeclaration;
        const importClause = importDecl.importClause;
        
        if (importClause?.namedBindings?.kind === SyntaxKind.NamedImports) {
          const namedImports = importClause.namedBindings as any;
          const elements = namedImports.elements;
          
          // Find the unused import element
          const unusedIndex = elements.findIndex((element: any) => 
            element.name.text === unusedName
          );
          
          if (unusedIndex !== -1) {
            const unusedElement = elements[unusedIndex];
            
            if (elements.length === 1) {
              // Remove the entire import statement
              changes.push({
                type: 'delete',
                start: statement.pos,
                end: statement.end + 1, // Include the newline
                newText: '',
                description: `Remove unused database import statement for ${unusedName}`
              });
            } else {
              // Remove just this import from the list
              const start = unusedIndex === 0 
                ? unusedElement.pos 
                : elements[unusedIndex - 1].end;
              const end = unusedIndex === elements.length - 1
                ? unusedElement.end
                : elements[unusedIndex + 1].pos;
              
              changes.push({
                type: 'delete',
                start,
                end,
                newText: unusedIndex === 0 ? '' : '',
                description: `Remove unused database import ${unusedName}`
              });
            }
            break;
          }
        }
      }
    }

    return changes;
  }
}