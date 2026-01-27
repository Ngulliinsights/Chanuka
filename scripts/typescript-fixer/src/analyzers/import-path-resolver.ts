import * as path from 'path';
import * as fs from 'fs';
import { ProjectStructure } from '@shared/types/core';

/**
 * Result of import path resolution
 */
export interface ImportResolution {
  found: boolean;
  resolvedPath: string;
  confidence: number;
  source: string;
  module?: string;
  alternatives: string[];
}

/**
 * Utility mapping information
 */
export interface UtilityMapping {
  path: string;
  confidence: number;
  module: string;
  alternatives?: string[];
}

/**
 * Resolves correct import paths for shared/core utilities based on project structure
 */
export class ImportPathResolver {
  private projectStructure: ProjectStructure;
  private aliasMap: Map<string, string>;

  constructor(projectStructure: ProjectStructure) {
    this.projectStructure = projectStructure;
    this.aliasMap = this.buildAliasMap();
  }

  /**
   * Resolves the correct import path for a utility
   */
  resolveImportPath(
    utilityName: string,
    currentFilePath: string,
    preferAlias: boolean = true
  ): ImportResolution {
    // First, try to find the utility in the project structure
    const structureResult = this.resolveFromProjectStructure(utilityName);
    if (structureResult.found) {
      return {
        ...structureResult,
        resolvedPath: preferAlias
          ? this.convertToAlias(structureResult.resolvedPath) || structureResult.resolvedPath
          : structureResult.resolvedPath
      };
    }

    // Fallback to known mappings
    const knownResult = this.resolveFromKnownMappings(utilityName);
    if (knownResult.found) {
      return {
        ...knownResult,
        resolvedPath: preferAlias
          ? this.convertToAlias(knownResult.resolvedPath) || knownResult.resolvedPath
          : knownResult.resolvedPath
      };
    }

    // Generate relative path as last resort
    const relativePath = this.generateRelativePath(utilityName, currentFilePath);
    return {
      found: false,
      resolvedPath: relativePath,
      confidence: 30,
      source: 'relative-fallback',
      alternatives: []
    };
  }

  /**
   * Resolves import path from project structure analysis
   */
  private resolveFromProjectStructure(utilityName: string): ImportResolution {
    const { utilities, importPaths } = this.projectStructure.sharedCore;

    // Find the module that exports this utility
    for (const [module, exports] of Object.entries(utilities)) {
      if (exports.includes(utilityName)) {
        const importPath = importPaths[module];
        if (importPath) {
          return {
            found: true,
            resolvedPath: importPath,
            confidence: 95,
            source: 'project-structure',
            module,
            alternatives: this.findAlternatives(utilityName, module)
          };
        }
      }
    }

    return {
      found: false,
      resolvedPath: '',
      confidence: 0,
      source: 'project-structure',
      alternatives: []
    };
  }

  /**
   * Resolves import path from known utility mappings
   */
  private resolveFromKnownMappings(utilityName: string): ImportResolution {
    const knownMappings = this.getKnownUtilityMappings();
    const mapping = knownMappings.get(utilityName);

    if (mapping) {
      return {
        found: true,
        resolvedPath: mapping.path,
        confidence: mapping.confidence,
        source: 'known-mapping',
        module: mapping.module,
        alternatives: mapping.alternatives || []
      };
    }

    return {
      found: false,
      resolvedPath: '',
      confidence: 0,
      source: 'known-mapping',
      alternatives: []
    };
  }

  /**
   * Finds alternative import paths for a utility
   */
  private findAlternatives(utilityName: string, currentModule: string): string[] {
    const alternatives: string[] = [];
    const { utilities, importPaths } = this.projectStructure.sharedCore;

    // Look for the utility in other modules
    for (const [module, exports] of Object.entries(utilities)) {
      if (module !== currentModule && exports.includes(utilityName)) {
        const importPath = importPaths[module];
        if (importPath) {
          alternatives.push(importPath);
        }
      }
    }

    // Add common alternative paths
    const commonAlternatives = [
      '@shared/core',
      '@shared/core/src',
      `@shared/core/src/${this.guessModuleFromUtility(utilityName)}`
    ];

    alternatives.push(...commonAlternatives.filter(alt =>
      !alternatives.includes(alt)
    ));

    return alternatives;
  }

  /**
   * Guesses the module name from utility name
   */
  private guessModuleFromUtility(utilityName: string): string {
    const moduleGuesses: Record<string, string> = {
      // Logger utilities
      'logger': 'observability/logging',
      'Logger': 'observability/logging',
      'LogContext': 'observability/logging',

      // API utilities
      'ApiSuccess': 'utils/api',
      'ApiError': 'utils/api',
      'ApiValidationError': 'utils/api',
      'ApiResponseWrapper': 'utils/api',

      // Cache utilities
      'cacheKeys': 'caching',
      'CacheManager': 'caching',
      'CacheFactory': 'caching',

      // Validation utilities
      'ValidationError': 'validation',
      'validateRequest': 'validation',
      'ValidationService': 'validation',

      // Performance utilities
      'PerformanceMonitor': 'performance',
      'measurePerformance': 'performance',

      // Configuration utilities
      'ConfigManager': 'config',
      'getConfig': 'config',

      // Middleware utilities
      'authMiddleware': 'middleware/auth',
      'rateLimitMiddleware': 'middleware/rate-limit',
      'errorHandlerMiddleware': 'middleware/error-handler',

      // Error handling utilities
      'ErrorHandler': 'observability/error-management',
      'ErrorBoundary': 'observability/error-management',

      // Rate limiting utilities
      'RateLimiter': 'rate-limiting',
      'TokenBucket': 'rate-limiting',

      // Security utilities
      'sanitizeInput': 'utils/security',
      'validateToken': 'utils/security',
      'hashPassword': 'utils/security',

      // Async utilities
      'asyncHandler': 'utils/async',
      'promiseTimeout': 'utils/async',
      'retryAsync': 'utils/async',
    };

    return moduleGuesses[utilityName] || 'utils';
  }

  /**
   * Generates a relative path as fallback
   */
  private generateRelativePath(utilityName: string, currentFilePath: string): string {
    const projectRoot = this.projectStructure.rootPath;
    const sharedCorePath = path.join(projectRoot, 'shared', 'core');

    // Calculate relative path from current file to shared/core
    const relativePath = path.relative(path.dirname(currentFilePath), sharedCorePath);
    const normalizedPath = relativePath.replace(/\\/g, '/');

    // Prefer alias if available
    return this.convertToAlias(normalizedPath) || normalizedPath;
  }

  /**
   * Converts a path to use TypeScript path aliases
   */
  private convertToAlias(importPath: string): string | null {
    // Handle shared/core aliases
    if (importPath.includes('shared/core')) {
      const afterCore = importPath.match(/shared\/core\/(.+)/);
      if (afterCore) {
        return `@shared/core/${afterCore[1]}`;
      }
      if (importPath.endsWith('shared/core')) {
        return '@shared/core';
      }
    }

    // Handle relative paths that should use aliases
    if (importPath.startsWith('../') && importPath.includes('shared')) {
      const sharedMatch = importPath.match(/shared\/(.+)/);
      if (sharedMatch) {
        return `@shared/${sharedMatch[1]}`;
      }
    }

    return null;
  }

  /**
   * Builds a map of TypeScript path aliases
   */
  private buildAliasMap(): Map<string, string> {
    const aliasMap = new Map<string, string>();

    // Default aliases for Chanuka project
    aliasMap.set('@shared/core', path.join(this.projectStructure.rootPath, 'shared/core'));
    aliasMap.set('@shared/core/src', path.join(this.projectStructure.rootPath, 'shared/core/src'));
    aliasMap.set('@server/infrastructure/schema', path.join(this.projectStructure.rootPath, 'shared/schema'));
    aliasMap.set('@server/infrastructure/database', path.join(this.projectStructure.rootPath, 'shared/database'));
    aliasMap.set('@server', path.join(this.projectStructure.rootPath, 'server'));
    aliasMap.set('@client', path.join(this.projectStructure.rootPath, 'client'));

    // Try to load from tsconfig.json
    try {
      const tsConfig = JSON.parse(fs.readFileSync(this.projectStructure.tsConfigPath, 'utf-8'));
      const paths = tsConfig.compilerOptions?.paths;

      if (paths) {
        for (const [alias, pathArray] of Object.entries(paths)) {
          if (Array.isArray(pathArray) && pathArray.length > 0) {
            const resolvedPath = path.resolve(
              path.dirname(this.projectStructure.tsConfigPath),
              pathArray[0].replace('/*', '')
            );
            aliasMap.set(alias.replace('/*', ''), resolvedPath);
          }
        }
      }
    } catch (error) {
      console.warn('Could not load TypeScript path aliases:', error);
    }

    return aliasMap;
  }

  /**
   * Gets known utility mappings with confidence scores
   */
  private getKnownUtilityMappings(): Map<string, UtilityMapping> {
    const mappings = new Map<string, UtilityMapping>();

    // High confidence mappings (main exports from @shared/core)
    const mainExports = [
      'logger', 'Logger', 'LogContext', 'LogLevel',
      'ApiSuccess', 'ApiError', 'ApiValidationError', 'ApiResponseWrapper',
      'cacheKeys', 'CACHE_KEYS', 'cache',
      'Performance', 'RateLimit',
      'ErrorBoundary', 'AutomatedErrorRecoveryEngine',
      'ApiSuccessResponse', 'ApiErrorResponse', 'ApiValidationErrorResponse'
    ];

    for (const utility of mainExports) {
      mappings.set(utility, {
        path: '@shared/core',
        confidence: 90,
        module: 'core',
        alternatives: [`@shared/core/src`]
      });
    }

    // Medium confidence mappings (specific modules)
    const specificMappings: Record<string, UtilityMapping> = {
      'ValidationError': {
        path: '@shared/core/src/validation',
        confidence: 85,
        module: 'validation',
        alternatives: ['@shared/core/src/validation/types', '@shared/core']
      },
      'validateRequest': {
        path: '@shared/core/src/validation',
        confidence: 85,
        module: 'validation',
        alternatives: ['@shared/core/src/validation/middleware']
      },
      'PerformanceMonitor': {
        path: '@shared/core/src/performance',
        confidence: 85,
        module: 'performance',
        alternatives: ['@shared/core/src/observability/metrics']
      },
      'ConfigManager': {
        path: '@shared/core/src/config',
        confidence: 85,
        module: 'config',
        alternatives: ['@shared/core']
      },
      'getConfig': {
        path: '@shared/core/src/config',
        confidence: 85,
        module: 'config',
        alternatives: ['@shared/core']
      },
      'authMiddleware': {
        path: '@shared/core/src/middleware/auth',
        confidence: 80,
        module: 'middleware-auth',
        alternatives: ['@shared/core/src/middleware']
      },
      'rateLimitMiddleware': {
        path: '@shared/core/src/middleware/rate-limit',
        confidence: 80,
        module: 'middleware-rate-limit',
        alternatives: ['@shared/core/src/middleware']
      },
      'errorHandlerMiddleware': {
        path: '@shared/core/src/middleware/error-handler',
        confidence: 80,
        module: 'middleware-error-handler',
        alternatives: ['@shared/core/src/middleware']
      },
      'sanitizeInput': {
        path: '@shared/core/src/utils/security',
        confidence: 75,
        module: 'utils-security',
        alternatives: ['@shared/core/src/utils']
      },
      'validateToken': {
        path: '@shared/core/src/utils/security',
        confidence: 75,
        module: 'utils-security',
        alternatives: ['@shared/core/src/utils']
      },
      'asyncHandler': {
        path: '@shared/core/src/utils/async',
        confidence: 75,
        module: 'utils-async',
        alternatives: ['@shared/core/src/utils']
      }
    };

    for (const [utility, mapping] of Object.entries(specificMappings)) {
      mappings.set(utility, mapping);
    }

    return mappings;
  }

  /**
   * Corrects relative paths for nested directories
   */
  correctRelativePath(
    currentPath: string,
    targetPath: string,
    currentFilePath: string
  ): string {
    // If it's already an alias, return as-is
    if (currentPath.startsWith('@')) {
      return currentPath;
    }

    // Calculate the correct relative path
    const currentDir = path.dirname(currentFilePath);
    const projectRoot = this.projectStructure.rootPath;

    // Resolve the target path
    let resolvedTarget: string;
    if (path.isAbsolute(targetPath)) {
      resolvedTarget = targetPath;
    } else {
      resolvedTarget = path.resolve(projectRoot, targetPath);
    }

    // Calculate the correct relative path
    const correctRelativePath = path.relative(currentDir, resolvedTarget);
    const normalizedPath = correctRelativePath.replace(/\\/g, '/');

    // Prefer alias if available
    return this.convertToAlias(normalizedPath) || normalizedPath;
  }
}