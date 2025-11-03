/**
 * Unused Variable and Import Cleaner
 * 
 * Handles TypeScript error code 6133 (unused variables and imports) specifically
 * for Chanuka project patterns. This fixer:
 * - Removes unused imports while preserving intentionally unused parameters
 * - Cleans up logger imports that are declared but never used
 * - Prefixes unused function parameters with underscore to indicate intentional non-use
 * - Handles Chanuka-specific patterns for shared/core utilities
 */

import * as ts from 'typescript';
import { ErrorFixer, TypeScriptError, FixResult, CodeChange, ProcessingContext } from '../types/core';

export class UnusedVariableCleaner implements ErrorFixer {
  private readonly UNUSED_ERROR_CODE = 6133;
  
  // Known shared/core utilities that are commonly imported but might be unused
  private readonly SHARED_CORE_UTILITIES = new Set([
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
    'validationMiddleware', 'createValidator'
  ]);

  // Parameters that should be prefixed with underscore instead of removed
  private readonly PRESERVE_PARAMETER_PATTERNS = [
    /^(req|res|next)$/, // Express.js parameters
    /^(request|response)$/, // HTTP parameters
    /^(ctx|context)$/, // Context parameters
    /^(err|error)$/, // Error parameters
    /^(data|result)$/, // Common data parameters
    /^(options|config)$/, // Configuration parameters
    /^(callback|cb)$/, // Callback parameters
    /^(event|evt)$/, // Event parameters
    /^(params|args)$/, // Parameter objects
  ];

  canHandle(error: TypeScriptError): boolean {
    return error.code === this.UNUSED_ERROR_CODE;
  }

  fix(error: TypeScriptError, sourceFile: ts.SourceFile, context?: ProcessingContext): FixResult {
    try {
      const changes: CodeChange[] = [];
      const warnings: string[] = [];

      // Extract the unused identifier from the error message
      const unusedName = this.extractUnusedName(error.message);
      if (!unusedName) {
        return {
          success: false,
          changes: [],
          message: 'Could not extract unused identifier from error message',
          error: 'Failed to parse error message'
        };
      }

      // Determine the type of unused item and handle accordingly
      const unusedItem = this.findUnusedItem(sourceFile, unusedName, error);
      if (!unusedItem) {
        return {
          success: false,
          changes: [],
          message: `Could not locate unused item: ${unusedName}`,
          error: 'Item not found in source file'
        };
      }

      switch (unusedItem.type) {
        case 'import':
          const importChanges = this.handleUnusedImport(sourceFile, unusedItem, context);
          changes.push(...importChanges.changes);
          if (importChanges.warnings) {
            warnings.push(...importChanges.warnings);
          }
          break;

        case 'variable':
          const variableChanges = this.handleUnusedVariable(sourceFile, unusedItem);
          changes.push(...variableChanges.changes);
          if (variableChanges.warnings) {
            warnings.push(...variableChanges.warnings);
          }
          break;

        case 'parameter':
          const parameterChanges = this.handleUnusedParameter(sourceFile, unusedItem);
          changes.push(...parameterChanges.changes);
          if (parameterChanges.warnings) {
            warnings.push(...parameterChanges.warnings);
          }
          break;

        default:
          return {
            success: false,
            changes: [],
            message: `Unsupported unused item type: ${unusedItem.type}`
          };
      }

      return {
        success: changes.length > 0,
        changes,
        message: changes.length > 0 
          ? `Cleaned up unused ${unusedItem.type}: ${unusedName}`
          : `No cleanup needed for ${unusedName}`,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (err) {
      return {
        success: false,
        changes: [],
        message: 'Failed to clean up unused variable/import',
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  getDescription(): string {
    return 'Cleans up unused variables and imports, with special handling for Chanuka project patterns';
  }

  getPriority(): number {
    return 30; // Lower priority - cleanup is important but not critical
  }

  /**
   * Extracts the unused identifier name from the error message
   */
  private extractUnusedName(message: string): string | null {
    // Pattern: "'identifier' is declared but its value is never read"
    const match = message.match(/'([^']+)' is declared but its value is never read/);
    return match ? match[1] : null;
  }

  /**
   * Finds the unused item in the source file and determines its type
   */
  private findUnusedItem(
    sourceFile: ts.SourceFile, 
    unusedName: string, 
    error: TypeScriptError
  ): UnusedItem | null {
    // Search the entire file for the unused item - this is more reliable than position-based search
    return this.searchForUnusedItem(sourceFile, unusedName);
  }

  /**
   * Finds a node at the specified position in the source file
   */
  private findNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | null {
    let targetNode: ts.Node | null = null;

    function visit(node: ts.Node) {
      if (node.pos <= position && position < node.end) {
        targetNode = node;
        ts.forEachChild(node, visit);
      }
    }

    visit(sourceFile);
    return targetNode;
  }

  /**
   * Determines the type of unused item based on the node
   */
  private determineItemType(node: ts.Node, unusedName: string): UnusedItemType | null {
    // Check if it's part of an import statement
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isImportDeclaration(current)) {
        return 'import';
      }
      if (ts.isParameter(current)) {
        return 'parameter';
      }
      if (ts.isVariableDeclaration(current)) {
        return 'variable';
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * Searches the entire file for the unused item
   */
  private searchForUnusedItem(sourceFile: ts.SourceFile, unusedName: string): UnusedItem | null {
    let foundItem: UnusedItem | null = null;

    function visit(node: ts.Node) {
      // Check imports
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        
        // Handle named imports: import { name1, name2 } from 'module'
        if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
          for (const element of importClause.namedBindings.elements) {
            if (element.name.text === unusedName) {
              foundItem = {
                type: 'import',
                name: unusedName,
                node: element,
                position: element.pos,
                importDeclaration: node
              };
              return;
            }
          }
        }
        
        // Handle namespace imports: import * as name from 'module'
        if (importClause?.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
          if (importClause.namedBindings.name.text === unusedName) {
            foundItem = {
              type: 'import',
              name: unusedName,
              node: importClause.namedBindings,
              position: importClause.namedBindings.pos,
              importDeclaration: node
            };
            return;
          }
        }
        
        // Handle default imports: import name from 'module'
        if (importClause?.name && importClause.name.text === unusedName) {
          foundItem = {
            type: 'import',
            name: unusedName,
            node: importClause.name,
            position: importClause.name.pos,
            importDeclaration: node
          };
          return;
        }
      }

      // Check parameters
      if (ts.isParameter(node) && ts.isIdentifier(node.name) && node.name.text === unusedName) {
        foundItem = {
          type: 'parameter',
          name: unusedName,
          node: node,
          position: node.pos
        };
        return;
      }

      // Check variable declarations
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === unusedName) {
        foundItem = {
          type: 'variable',
          name: unusedName,
          node: node,
          position: node.pos
        };
        return;
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return foundItem;
  }

  /**
   * Handles unused import cleanup
   */
  private handleUnusedImport(
    sourceFile: ts.SourceFile, 
    unusedItem: UnusedItem, 
    context?: ProcessingContext
  ): { changes: CodeChange[]; warnings?: string[] } {
    const changes: CodeChange[] = [];
    const warnings: string[] = [];

    const importDecl = unusedItem.importDeclaration || this.findContainingImport(unusedItem.node);
    if (!importDecl) {
      return { changes: [], warnings: ['Could not find containing import declaration'] };
    }

    // Check if this is a shared/core utility import
    const isSharedCoreImport = this.isSharedCoreImport(importDecl);
    
    // Get the module path for context
    const moduleSpecifier = importDecl.moduleSpecifier;
    const modulePath = ts.isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : 'unknown';

    // Handle named imports
    if (importDecl.importClause?.namedBindings && ts.isNamedImports(importDecl.importClause.namedBindings)) {
      const namedImports = importDecl.importClause.namedBindings;
      const elements = namedImports.elements;

      if (elements.length === 1 && elements[0].name.text === unusedItem.name) {
        // Remove the entire import statement
        changes.push({
          type: 'delete',
          start: importDecl.getFullStart(),
          end: importDecl.getEnd() + 1, // Include newline
          newText: '',
          description: `Remove unused import statement for ${unusedItem.name} from ${modulePath}`
        });

        if (isSharedCoreImport) {
          warnings.push(`Removed shared/core import: ${unusedItem.name}. Verify this is not needed for side effects.`);
        }
      } else {
        // Remove just this import from the named imports list
        const elementIndex = elements.findIndex(el => el.name.text === unusedItem.name);
        if (elementIndex !== -1) {
          const element = elements[elementIndex];
          
          let start: number;
          let end: number;
          
          if (elementIndex === 0) {
            // First element - remove element and following comma
            start = element.getFullStart();
            end = elementIndex < elements.length - 1 ? elements[1].getFullStart() : element.getEnd();
          } else {
            // Not first element - remove preceding comma and element
            start = elements[elementIndex - 1].getEnd();
            end = element.getEnd();
          }

          changes.push({
            type: 'delete',
            start,
            end,
            newText: '',
            description: `Remove unused import ${unusedItem.name} from ${modulePath}`
          });

          if (isSharedCoreImport) {
            warnings.push(`Removed shared/core import: ${unusedItem.name} from existing import statement.`);
          }
        }
      }
    }

    // Handle namespace imports: import * as name from 'module'
    if (importDecl.importClause?.namedBindings && ts.isNamespaceImport(importDecl.importClause.namedBindings)) {
      if (importDecl.importClause.namedBindings.name.text === unusedItem.name) {
        // Remove the entire import statement
        changes.push({
          type: 'delete',
          start: importDecl.getFullStart(),
          end: importDecl.getEnd() + 1, // Include newline
          newText: '',
          description: `Remove unused import statement for ${unusedItem.name} from ${modulePath}`
        });

        if (isSharedCoreImport) {
          warnings.push(`Removed shared/core import: ${unusedItem.name}. Verify this is not needed for side effects.`);
        }
      }
    }

    // Handle default imports: import name from 'module'
    if (importDecl.importClause?.name && importDecl.importClause.name.text === unusedItem.name) {
      // Remove the entire import statement
      changes.push({
        type: 'delete',
        start: importDecl.getFullStart(),
        end: importDecl.getEnd() + 1, // Include newline
        newText: '',
        description: `Remove unused import statement for ${unusedItem.name} from ${modulePath}`
      });

      if (isSharedCoreImport) {
        warnings.push(`Removed shared/core import: ${unusedItem.name}. Verify this is not needed for side effects.`);
      }
    }

    return { changes, warnings };
  }

  /**
   * Handles unused variable cleanup
   */
  private handleUnusedVariable(
    sourceFile: ts.SourceFile, 
    unusedItem: UnusedItem
  ): { changes: CodeChange[]; warnings?: string[] } {
    const changes: CodeChange[] = [];
    const warnings: string[] = [];

    if (!ts.isVariableDeclaration(unusedItem.node)) {
      return { changes: [], warnings: ['Node is not a variable declaration'] };
    }

    const variableDecl = unusedItem.node;
    const variableStatement = this.findContainingVariableStatement(variableDecl);
    
    if (!variableStatement) {
      return { changes: [], warnings: ['Could not find containing variable statement'] };
    }

    // Check if this is the only declaration in the statement
    if (variableStatement.declarationList.declarations.length === 1) {
      // Remove the entire variable statement
      changes.push({
        type: 'delete',
        start: variableStatement.getFullStart(),
        end: variableStatement.getEnd() + 1, // Include newline
        newText: '',
        description: `Remove unused variable declaration: ${unusedItem.name}`
      });
    } else {
      // Remove just this declaration from the list
      const declarations = variableStatement.declarationList.declarations;
      const declIndex = declarations.findIndex(decl => 
        ts.isIdentifier(decl.name) && decl.name.text === unusedItem.name
      );
      
      if (declIndex !== -1) {
        const decl = declarations[declIndex];
        
        let start: number;
        let end: number;
        
        if (declIndex === 0) {
          // First declaration - remove declaration and following comma
          start = decl.getFullStart();
          end = declIndex < declarations.length - 1 ? declarations[1].getFullStart() : decl.getEnd();
        } else {
          // Not first declaration - remove preceding comma and declaration
          start = declarations[declIndex - 1].getEnd();
          end = decl.getEnd();
        }

        changes.push({
          type: 'delete',
          start,
          end,
          newText: '',
          description: `Remove unused variable ${unusedItem.name} from declaration list`
        });
      }
    }

    return { changes, warnings };
  }

  /**
   * Handles unused parameter by prefixing with underscore
   */
  private handleUnusedParameter(
    sourceFile: ts.SourceFile, 
    unusedItem: UnusedItem
  ): { changes: CodeChange[]; warnings?: string[] } {
    const changes: CodeChange[] = [];
    const warnings: string[] = [];

    if (!ts.isParameter(unusedItem.node)) {
      return { changes: [], warnings: ['Node is not a parameter'] };
    }

    const parameter = unusedItem.node;
    
    // Check if this parameter should be preserved (common patterns)
    const shouldPreserve = this.shouldPreserveParameter(unusedItem.name);
    
    if (shouldPreserve) {
      // Prefix with underscore to indicate intentional non-use
      if (!unusedItem.name.startsWith('_')) {
        const nameNode = parameter.name;
        if (ts.isIdentifier(nameNode)) {
          changes.push({
            type: 'replace',
            start: nameNode.getStart(),
            end: nameNode.getEnd(),
            newText: `_${nameNode.text}`,
            description: `Prefix unused parameter ${unusedItem.name} with underscore`,
            originalText: nameNode.text
          });
        }
      }
    } else {
      // For non-essential parameters, we could remove them, but this is risky
      // Instead, we'll just prefix with underscore as a safer approach
      const nameNode = parameter.name;
      if (ts.isIdentifier(nameNode) && !nameNode.text.startsWith('_')) {
        changes.push({
          type: 'replace',
          start: nameNode.getStart(),
          end: nameNode.getEnd(),
          newText: `_${nameNode.text}`,
          description: `Prefix unused parameter ${unusedItem.name} with underscore`,
          originalText: nameNode.text
        });
        
        warnings.push(`Parameter ${unusedItem.name} prefixed with underscore. Consider if it can be removed entirely.`);
      }
    }

    return { changes, warnings };
  }

  /**
   * Checks if an import is from shared/core
   */
  private isSharedCoreImport(importDecl: ts.ImportDeclaration): boolean {
    const moduleSpecifier = importDecl.moduleSpecifier;
    if (ts.isStringLiteral(moduleSpecifier)) {
      const modulePath = moduleSpecifier.text;
      return modulePath.includes('@shared/core') || modulePath.includes('shared/core');
    }
    return false;
  }

  /**
   * Finds the containing import declaration for a node
   */
  private findContainingImport(node: ts.Node): ts.ImportDeclaration | null {
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isImportDeclaration(current)) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  /**
   * Finds the containing variable statement for a variable declaration
   */
  private findContainingVariableStatement(node: ts.VariableDeclaration): ts.VariableStatement | null {
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isVariableStatement(current)) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  /**
   * Determines if a parameter should be preserved (prefixed with underscore) rather than removed
   */
  private shouldPreserveParameter(parameterName: string): boolean {
    return this.PRESERVE_PARAMETER_PATTERNS.some(pattern => pattern.test(parameterName));
  }
}

/**
 * Types for unused item handling
 */
type UnusedItemType = 'import' | 'variable' | 'parameter';

interface UnusedItem {
  type: UnusedItemType;
  name: string;
  node: ts.Node;
  position: number;
  importDeclaration?: ts.ImportDeclaration;
}