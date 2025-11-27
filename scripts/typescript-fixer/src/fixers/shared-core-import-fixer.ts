import { SourceFile, SyntaxKind, Node, ImportDeclaration, Identifier } from 'typescript';
import { ErrorFixer, TypeScriptError, FixResult, CodeChange, ProcessingContext } from '@shared/types/core';

/**
 * Fixes missing imports from shared/core utilities
 * Handles the complex nested structure of shared/core/src and resolves correct import paths
 */
export class SharedCoreImportFixer implements ErrorFixer {
  private readonly SHARED_CORE_ERROR_CODES = [
    2304, // Cannot find name
    2307, // Cannot find module
    2339, // Property does not exist on type
    6133, // Declared but never read (for cleanup)
  ];

  private readonly KNOWN_SHARED_UTILITIES = new Set([
    'logger', 'Logger', 'LogContext', 'LogLevel',
    'ApiSuccess', 'ApiError', 'ApiValidationError', 'ApiResponseWrapper',
    'cacheKeys', 'CACHE_KEYS', 'CacheManager', 'CacheFactory',
    'ValidationError', 'ValidationService', 'validateRequest',
    'MiddlewareFactory', 'createMiddleware',
    'ErrorHandler', 'ErrorBoundary', 'createErrorHandler',
    'PerformanceMonitor', 'measurePerformance',
    'ConfigManager', 'loadConfig', 'getConfig',
    'RateLimiter', 'TokenBucket',
    'authMiddleware', 'rateLimitMiddleware', 'errorHandlerMiddleware',
    'sanitizeInput', 'validateToken', 'hashPassword',
    'asyncHandler', 'promiseTimeout', 'retryAsync',
    'createResponse', 'formatError', 'handleApiResponse',
    'MetricsCollector', 'PerformanceMetrics',
    'HealthChecker', 'HealthStatus',
    'TraceContext', 'createTracer',
    'validationMiddleware', 'createValidator',
    'ApiSuccessResponse', 'ApiErrorResponse', 'ApiValidationErrorResponse',
    'ErrorBoundary', 'AutomatedErrorRecoveryEngine',
    'Performance', 'RateLimit', 'cache'
  ]);

  canHandle(error: TypeScriptError): boolean {
    if (!this.SHARED_CORE_ERROR_CODES.includes(error.code)) {
      return false;
    }

    const errorText = error.context?.errorText || error.message;
    
    // Handle module import errors for shared/core
    if (error.code === 2307 && (
      errorText.includes('@shared/core') || 
      errorText.includes('shared/core')
    )) {
      return true;
    }

    // Handle unused import cleanup (error code 6133)
    if (error.code === 6133) {
      // For unused imports, we need to check if it's from a shared/core import
      // We'll handle this in the fix method by examining the source file
      return true;
    }

    // Check if the error involves a known shared utility
    return Array.from(this.KNOWN_SHARED_UTILITIES).some(utility => 
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
            ? 'Removed unused import'
            : 'No unused imports to remove'
        };
      }

      // Handle module import errors (error code 2307) - these might be relative path issues
      if (error.code === 2307) {
        const relativePathFixes = this.fixRelativePathIssues(sourceFile, context);
        if (relativePathFixes.length > 0) {
          return {
            success: true,
            changes: relativePathFixes,
            message: 'Fixed relative path issues'
          };
        }
      }

      // Identify the missing utility from the error
      const missingUtility = this.identifyMissingUtility(error);
      if (!missingUtility) {
        return {
          success: false,
          changes: [],
          message: 'Could not identify missing shared utility',
          error: 'Unable to determine which shared utility is missing'
        };
      }

      // Determine the correct import path
      const importPath = this.resolveImportPath(missingUtility, context);
      if (!importPath) {
        return {
          success: false,
          changes: [],
          message: `Could not resolve import path for utility: ${missingUtility}`,
          error: 'Import path resolution failed'
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

      // Fix relative path issues if needed
      const relativePathFixes = this.fixRelativePathIssues(sourceFile, context);
      changes.push(...relativePathFixes);

      return {
        success: changes.length > 0,
        changes,
        message: changes.length > 0 
          ? `Added import for ${missingUtility} from ${importPath}`
          : 'No changes needed',
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (err) {
      return {
        success: false,
        changes: [],
        message: 'Failed to fix shared/core import',
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  getDescription(): string {
    return 'Fixes missing imports from shared/core utilities and resolves import path issues';
  }

  getPriority(): number {
    return 80; // High priority for shared utilities
  }

  /**
   * Identifies which shared utility is missing from the error
   */
  private identifyMissingUtility(error: TypeScriptError): string | null {
    const errorText = error.context?.errorText || error.message;
    
    // Look for patterns like "Cannot find name 'logger'"
    const nameMatch = errorText.match(/Cannot find name '([^']+)'/);
    if (nameMatch && this.KNOWN_SHARED_UTILITIES.has(nameMatch[1])) {
      return nameMatch[1];
    }

    // Look for property access patterns
    const propertyMatch = errorText.match(/Property '([^']+)' does not exist/);
    if (propertyMatch && this.KNOWN_SHARED_UTILITIES.has(propertyMatch[1])) {
      return propertyMatch[1];
    }

    // Check if any known utility is mentioned in the error
    for (const utility of this.KNOWN_SHARED_UTILITIES) {
      if (errorText.includes(utility)) {
        return utility;
      }
    }

    return null;
  }

  /**
   * Resolves the correct import path for a shared utility
   */
  private resolveImportPath(utility: string, context?: ProcessingContext): string | null {
    // Use project structure information if available
    if (context?.project?.sharedCore) {
      const { utilities, importPaths } = context.project.sharedCore;
      
      // Find the module that exports this utility
      for (const [module, exports] of Object.entries(utilities)) {
        if (exports.includes(utility)) {
          return importPaths[module] || `@shared/core/src/${module}`;
        }
      }
    }

    // Fallback to known mappings based on utility patterns
    return this.getKnownImportPath(utility);
  }

  /**
   * Returns known import paths for common utilities
   */
  private getKnownImportPath(utility: string): string | null {
    const utilityMappings: Record<string, string> = {
      // Logging utilities
      'logger': '@shared/core',
      'Logger': '@shared/core',
      'LogContext': '@shared/core',
      'LogLevel': '@shared/core',

      // API utilities
      'ApiSuccess': '@shared/core',
      'ApiError': '@shared/core',
      'ApiValidationError': '@shared/core',
      'ApiResponseWrapper': '@shared/core',
      'ApiSuccessResponse': '@shared/core',
      'ApiErrorResponse': '@shared/core',
      'ApiValidationErrorResponse': '@shared/core',

      // Cache utilities
      'cacheKeys': '@shared/core',
      'CACHE_KEYS': '@shared/core',
      'cache': '@shared/core',
      'CacheManager': '@shared/core/src/caching',
      'CacheFactory': '@shared/core/src/caching',

      // Validation utilities
      'ValidationError': '@shared/core/src/validation',
      'ValidationService': '@shared/core/src/validation',
      'validateRequest': '@shared/core/src/validation',
      'validationMiddleware': '@shared/core/src/validation/middleware',
      'createValidator': '@shared/core/src/validation',

      // Middleware utilities
      'MiddlewareFactory': '@shared/core/src/middleware',
      'createMiddleware': '@shared/core/src/middleware',
      'authMiddleware': '@shared/core/src/middleware/auth',
      'rateLimitMiddleware': '@shared/core/src/middleware/rate-limit',
      'errorHandlerMiddleware': '@shared/core/src/middleware/error-handler',

      // Error handling utilities
      'ErrorHandler': '@shared/core/src/observability/error-management',
      'ErrorBoundary': '@shared/core/src/observability/error-management',
      'ErrorBoundary': '@shared/core',
      'createErrorHandler': '@shared/core/src/observability/error-management',
      'AutomatedErrorRecoveryEngine': '@shared/core',

      // Performance utilities
      'PerformanceMonitor': '@shared/core/src/performance',
      'measurePerformance': '@shared/core/src/performance',
      'Performance': '@shared/core',
      'PerformanceMetrics': '@shared/core/src/observability/metrics',

      // Configuration utilities
      'ConfigManager': '@shared/core/src/config',
      'loadConfig': '@shared/core/src/config',
      'getConfig': '@shared/core/src/config',

      // Rate limiting utilities
      'RateLimiter': '@shared/core/src/rate-limiting',
      'RateLimit': '@shared/core',
      'TokenBucket': '@shared/core/src/rate-limiting',

      // Security utilities
      'sanitizeInput': '@shared/core/src/utils/security',
      'validateToken': '@shared/core/src/utils/security',
      'hashPassword': '@shared/core/src/utils/security',

      // Async utilities
      'asyncHandler': '@shared/core/src/utils/async',
      'promiseTimeout': '@shared/core/src/utils/async',
      'retryAsync': '@shared/core/src/utils/async',

      // Response helpers
      'createResponse': '@shared/core/src/utils/response-helpers',
      'formatError': '@shared/core/src/utils/response-helpers',
      'handleApiResponse': '@shared/core/src/utils/response-helpers',

      // Observability utilities
      'MetricsCollector': '@shared/core/src/observability/metrics',
      'HealthChecker': '@shared/core/src/observability/health',
      'HealthStatus': '@shared/core/src/observability/health',
      'TraceContext': '@shared/core/src/observability/tracing',
      'createTracer': '@shared/core/src/observability/tracing',
    };

    return utilityMappings[utility] || null;
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
    if (!importClause || !importClause.namedBindings) {
      return null;
    }

    if (importClause.namedBindings.kind === SyntaxKind.NamedImports) {
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
        description: `Add ${utility} to existing import`
      };
    }

    return null;
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
      description: `Add import for ${utility} from ${importPath}`
    };
  }

  /**
   * Fixes relative path issues for nested directories accessing shared/core
   */
  private fixRelativePathIssues(
    sourceFile: SourceFile,
    context?: ProcessingContext
  ): CodeChange[] {
    const changes: CodeChange[] = [];
    
    if (!context?.filePath) {
      return changes;
    }

    // Check for problematic relative imports to shared/core
    for (const statement of sourceFile.statements) {
      if (statement.kind === SyntaxKind.ImportDeclaration) {
        const importDecl = statement as ImportDeclaration;
        const moduleSpecifier = importDecl.moduleSpecifier;
        
        if (moduleSpecifier && moduleSpecifier.kind === SyntaxKind.StringLiteral) {
          const importPath = (moduleSpecifier as any).text;
          
          // Look for relative paths that should use alias
          if (this.shouldUseAlias(importPath, context.filePath)) {
            const aliasPath = this.convertToAlias(importPath);
            if (aliasPath) {
              changes.push({
                type: 'replace',
                start: moduleSpecifier.pos + 1, // +1 to skip the quote
                end: moduleSpecifier.end - 1,   // -1 to skip the quote
                newText: aliasPath,
                description: `Convert relative path to alias: ${aliasPath}`,
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
   * Determines if a relative path should use an alias instead
   */
  private shouldUseAlias(importPath: string, currentFilePath: string): boolean {
    // Check for deeply nested relative paths to shared/core
    if (importPath.includes('../') && importPath.includes('shared/core')) {
      return true;
    }

    // Check for paths that go up multiple levels
    const upLevels = (importPath.match(/\.\.\//g) || []).length;
    if (upLevels >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Converts a relative path to use the @shared/core alias
   */
  private convertToAlias(relativePath: string): string | null {
    // Extract the part after shared/core
    const sharedCoreMatch = relativePath.match(/shared\/core\/(.+)/);
    if (sharedCoreMatch) {
      const pathAfterCore = sharedCoreMatch[1];
      return `@shared/core/${pathAfterCore}`;
    }

    // Handle direct shared/core references
    if (relativePath.includes('shared/core') && !relativePath.includes('/src/')) {
      return '@shared/core';
    }

    return null;
  }

  /**
   * Cleans up unused imports (for error code 6133)
   */
  private cleanupUnusedImports(sourceFile: SourceFile, error: TypeScriptError): CodeChange[] {
    const changes: CodeChange[] = [];
    
    // Extract the unused import name from the error message
    const unusedMatch = error.message.match(/'([^']+)' is declared but its value is never read/);
    if (!unusedMatch) {
      return changes;
    }

    const unusedName = unusedMatch[1];

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
                description: `Remove unused import statement for ${unusedName}`
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
                description: `Remove unused import ${unusedName}`
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