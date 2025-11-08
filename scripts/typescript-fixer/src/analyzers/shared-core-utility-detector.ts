import * as fs from 'fs';
import * as path from 'path';
import { SourceFile, SyntaxKind, Node, createSourceFile, ScriptTarget } from 'typescript';

/**
 * Detects missing shared/core utilities by analyzing usage patterns in TypeScript files
 */
export class SharedCoreUtilityDetector {
  private readonly UTILITY_PATTERNS = new Map<string, RegExp[]>([
    // Logger patterns
    ['logger', [
      /logger\.(debug|info|warn|error)/g,
      /logger\s*\(/g,
      /const\s+logger\s*=/g,
      /import.*logger/g
    ]],
    
    // API Response patterns
    ['ApiSuccess', [
      /new\s+ApiSuccess/g,
      /ApiSuccess\s*\(/g,
      /return.*ApiSuccess/g
    ]],
    
    ['ApiError', [
      /new\s+ApiError/g,
      /ApiError\s*\(/g,
      /throw.*ApiError/g
    ]],
    
    ['ApiValidationError', [
      /new\s+ApiValidationError/g,
      /ApiValidationError\s*\(/g,
      /throw.*ApiValidationError/g
    ]],
    
    ['ApiResponseWrapper', [
      /ApiResponseWrapper\./g,
      /ApiResponseWrapper\.createMetadata/g
    ]],
    
    // Cache patterns
    ['cacheKeys', [
      /cacheKeys\./g,
      /cacheKeys\[/g,
      /cacheKeys\.USER_PROFILE/g,
      /cacheKeys\.BILL_DETAILS/g
    ]],
    
    ['CACHE_KEYS', [
      /CACHE_KEYS\./g,
      /CACHE_KEYS\[/g
    ]],
    
    // Validation patterns
    ['ValidationError', [
      /new\s+ValidationError/g,
      /ValidationError\s*\(/g,
      /throw.*ValidationError/g
    ]],
    
    ['validateRequest', [
      /validateRequest\s*\(/g,
      /await\s+validateRequest/g
    ]],
    
    // Performance patterns
    ['Performance', [
      /Performance\./g,
      /Performance\.startTimer/g,
      /Performance\.measure/g
    ]],
    
    ['PerformanceMonitor', [
      /new\s+PerformanceMonitor/g,
      /PerformanceMonitor\./g
    ]],
    
    // Rate limiting patterns
    ['RateLimit', [
      /RateLimit\./g,
      /RateLimit\.check/g,
      /RateLimit\.middleware/g
    ]],
    
    // Error handling patterns
    ['ErrorBoundary', [
      /<ErrorBoundary/g,
      /ErrorBoundary\s*>/g
    ]],
    
    ['AutomatedErrorRecoveryEngine', [
      /AutomatedErrorRecoveryEngine/g,
      /createErrorRecoveryEngine/g
    ]],
    
    // Configuration patterns
    ['ConfigManager', [
      /ConfigManager\./g,
      /new\s+ConfigManager/g
    ]],
    
    ['getConfig', [
      /getConfig\s*\(/g,
      /await\s+getConfig/g
    ]],
    
    // Middleware patterns
    ['authMiddleware', [
      /authMiddleware/g,
      /app\.use\(authMiddleware\)/g
    ]],
    
    ['rateLimitMiddleware', [
      /rateLimitMiddleware/g,
      /app\.use\(rateLimitMiddleware\)/g
    ]],
    
    ['errorHandlerMiddleware', [
      /errorHandlerMiddleware/g,
      /app\.use\(errorHandlerMiddleware\)/g
    ]],
    
    // Utility function patterns
    ['sanitizeInput', [
      /sanitizeInput\s*\(/g,
      /await\s+sanitizeInput/g
    ]],
    
    ['validateToken', [
      /validateToken\s*\(/g,
      /await\s+validateToken/g
    ]],
    
    ['asyncHandler', [
      /asyncHandler\s*\(/g,
      /router\.\w+\(.*asyncHandler/g
    ]],
    
    // Response helper patterns
    ['ApiSuccessResponse', [
      /ApiSuccessResponse\s*\(/g,
      /return\s+ApiSuccessResponse/g
    ]],
    
    ['ApiErrorResponse', [
      /ApiErrorResponse\s*\(/g,
      /return\s+ApiErrorResponse/g
    ]],
    
    ['ApiValidationErrorResponse', [
      /ApiValidationErrorResponse\s*\(/g,
      /return\s+ApiValidationErrorResponse/g
    ]]
  ]);

  /**
   * Detects missing shared/core utilities in a TypeScript file
   */
  detectMissingUtilities(filePath: string): DetectionResult {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = createSourceFile(
        filePath,
        content,
        ScriptTarget.Latest,
        true
      );

      const usedUtilities = this.findUsedUtilities(content);
      const importedUtilities = this.findImportedUtilities(sourceFile);
      const missingUtilities = this.findMissingUtilities(usedUtilities, importedUtilities);

      return {
        filePath,
        usedUtilities,
        importedUtilities,
        missingUtilities,
        suggestions: this.generateSuggestions(missingUtilities)
      };

    } catch (error) {
      return {
        filePath,
        usedUtilities: [],
        importedUtilities: [],
        missingUtilities: [],
        suggestions: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Finds utilities that are used in the code based on patterns
   */
  private findUsedUtilities(content: string): UsedUtility[] {
    const usedUtilities: UsedUtility[] = [];

    for (const [utility, patterns] of this.UTILITY_PATTERNS) {
      const usages: UtilityUsage[] = [];

      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex state
        
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = this.getLineNumber(content, match.index);
          const context = this.getContext(content, match.index);
          
          usages.push({
            pattern: pattern.source,
            position: match.index,
            lineNumber,
            matchedText: match[0],
            context
          });
        }
      }

      if (usages.length > 0) {
        usedUtilities.push({
          name: utility,
          usages,
          confidence: this.calculateConfidence(utility, usages)
        });
      }
    }

    return usedUtilities;
  }

  /**
   * Finds utilities that are already imported
   */
  private findImportedUtilities(sourceFile: SourceFile): ImportedUtility[] {
    const importedUtilities: ImportedUtility[] = [];

    const visitNode = (node: Node) => {
      if (node.kind === SyntaxKind.ImportDeclaration) {
        const importDecl = node as any;
        const moduleSpecifier = importDecl.moduleSpecifier?.text;
        
        if (this.isSharedCoreImport(moduleSpecifier)) {
          const importClause = importDecl.importClause;
          
          if (importClause?.namedBindings?.kind === SyntaxKind.NamedImports) {
            const namedImports = importClause.namedBindings;
            
            for (const element of namedImports.elements) {
              importedUtilities.push({
                name: element.name.text,
                importPath: moduleSpecifier,
                isNamedImport: true,
                position: element.pos
              });
            }
          }
          
          // Handle default imports
          if (importClause?.name) {
            importedUtilities.push({
              name: importClause.name.text,
              importPath: moduleSpecifier,
              isNamedImport: false,
              position: importClause.name.pos
            });
          }
        }
      }
      
      node.forEachChild(visitNode);
    };

    visitNode(sourceFile);
    return importedUtilities;
  }

  /**
   * Determines if an import path is from shared/core
   */
  private isSharedCoreImport(importPath: string): boolean {
    if (!importPath) return false;
    
    return importPath.startsWith('@shared/core') ||
           importPath.includes('shared/core') ||
           importPath === '@shared/core';
  }

  /**
   * Finds utilities that are used but not imported
   */
  private findMissingUtilities(
    usedUtilities: UsedUtility[],
    importedUtilities: ImportedUtility[]
  ): MissingUtility[] {
    const importedNames = new Set(importedUtilities.map(imp => imp.name));
    const missingUtilities: MissingUtility[] = [];

    for (const used of usedUtilities) {
      if (!importedNames.has(used.name)) {
        missingUtilities.push({
          name: used.name,
          usages: used.usages,
          confidence: used.confidence,
          suggestedImportPath: this.getSuggestedImportPath(used.name)
        });
      }
    }

    return missingUtilities;
  }

  /**
   * Generates suggestions for fixing missing utilities
   */
  private generateSuggestions(missingUtilities: MissingUtility[]): ImportSuggestion[] {
    return missingUtilities.map(utility => ({
      utility: utility.name,
      importPath: utility.suggestedImportPath,
      confidence: utility.confidence,
      reason: this.getImportReason(utility),
      example: this.getImportExample(utility.name, utility.suggestedImportPath)
    }));
  }

  /**
   * Gets the suggested import path for a utility
   */
  private getSuggestedImportPath(utilityName: string): string {
    const pathMappings: Record<string, string> = {
      // Core utilities (main index)
      'logger': '@shared/core',
      'ApiSuccess': '@shared/core',
      'ApiError': '@shared/core',
      'ApiValidationError': '@shared/core',
      'ApiResponseWrapper': '@shared/core',
      'cacheKeys': '@shared/core',
      'CACHE_KEYS': '@shared/core',
      'Performance': '@shared/core',
      'RateLimit': '@shared/core',
      'ErrorBoundary': '@shared/core',
      'AutomatedErrorRecoveryEngine': '@shared/core',
      'cache': '@shared/core',
      
      // Specific module utilities
      'ValidationError': '@shared/core/src/validation',
      'validateRequest': '@shared/core/src/validation',
      'PerformanceMonitor': '@shared/core/src/performance',
      'ConfigManager': '@shared/core/src/config',
      'getConfig': '@shared/core/src/config',
      'authMiddleware': '@shared/core/src/middleware/auth',
      'rateLimitMiddleware': '@shared/core/src/middleware/rate-limit',
      'errorHandlerMiddleware': '@shared/core/src/middleware/error-handler',
      'sanitizeInput': '@shared/core/src/utils/security',
      'validateToken': '@shared/core/src/utils/security',
      'asyncHandler': '@shared/core/src/utils/async',
      'ApiSuccessResponse': '@shared/core',
      'ApiErrorResponse': '@shared/core',
      'ApiValidationErrorResponse': '@shared/core'
    };

    return pathMappings[utilityName] || '@shared/core';
  }

  /**
   * Calculates confidence score for utility detection
   */
  private calculateConfidence(utility: string, usages: UtilityUsage[]): number {
    let confidence = 0;
    
    // Base confidence from number of usages
    confidence += Math.min(usages.length * 20, 60);
    
    // Bonus for specific patterns
    for (const usage of usages) {
      if (usage.pattern.includes('\\(')) confidence += 10; // Function call pattern
      if (usage.pattern.includes('\\.')) confidence += 15; // Property access pattern
      if (usage.pattern.includes('new\\s+')) confidence += 20; // Constructor pattern
      if (usage.pattern.includes('import')) confidence += 25; // Import pattern
    }
    
    return Math.min(confidence, 100);
  }

  /**
   * Gets the line number for a character position
   */
  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length;
  }

  /**
   * Gets context around a match position
   */
  private getContext(content: string, position: number, contextLength: number = 50): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(content.length, position + contextLength);
    return content.substring(start, end);
  }

  /**
   * Gets the reason for importing a utility
   */
  private getImportReason(utility: MissingUtility): string {
    const usageCount = utility.usages.length;
    const patterns = utility.usages.map(u => u.pattern).join(', ');
    
    return `Used ${usageCount} time(s) with patterns: ${patterns}`;
  }

  /**
   * Gets an example import statement
   */
  private getImportExample(utilityName: string, importPath: string): string {
    return `import { ${utilityName} } from '${importPath}';`;
  }
}

/**
 * Result of utility detection analysis
 */
export interface DetectionResult {
  filePath: string;
  usedUtilities: UsedUtility[];
  importedUtilities: ImportedUtility[];
  missingUtilities: MissingUtility[];
  suggestions: ImportSuggestion[];
  error?: string;
}

/**
 * Represents a utility that is used in the code
 */
export interface UsedUtility {
  name: string;
  usages: UtilityUsage[];
  confidence: number;
}

/**
 * Represents a specific usage of a utility
 */
export interface UtilityUsage {
  pattern: string;
  position: number;
  lineNumber: number;
  matchedText: string;
  context: string;
}

/**
 * Represents an imported utility
 */
export interface ImportedUtility {
  name: string;
  importPath: string;
  isNamedImport: boolean;
  position: number;
}

/**
 * Represents a utility that is used but not imported
 */
export interface MissingUtility {
  name: string;
  usages: UtilityUsage[];
  confidence: number;
  suggestedImportPath: string;
}

/**
 * Represents a suggestion for importing a utility
 */
export interface ImportSuggestion {
  utility: string;
  importPath: string;
  confidence: number;
  reason: string;
  example: string;
}