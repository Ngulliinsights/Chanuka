/**
 * Property-Based Test: Module Boundary Enforcement
 * 
 * Property 11: For any import statement in the codebase, it should only
 * import from public APIs (index.ts) of infrastructure modules, not from
 * internal implementation files. This ensures module encapsulation and
 * prevents tight coupling.
 * 
 * Feature: client-infrastructure-consolidation, Property 11: Module Boundary Enforcement
 * Validates: Requirements 18.2, 18.3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, SourceFile } from 'ts-morph';
import * as path from 'path';

describe('Feature: client-infrastructure-consolidation, Property 11: Module Boundary Enforcement', () => {
  it('should enforce public API imports only for infrastructure modules', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), '../../tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add all source files
    project.addSourceFilesAtPaths([
      'client/src/**/*.ts',
      'client/src/**/*.tsx',
      '!client/src/**/*.test.ts',
      '!client/src/**/*.test.tsx',
      '!client/src/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sourceFiles = project.getSourceFiles();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sourceFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sourceFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();
          
          // Skip files within infrastructure modules (they can use internal imports within their own module)
          const isInfrastructureFile = filePath.includes('/infrastructure/');
          const currentModule = isInfrastructureFile ? extractModuleName(filePath) : null;

          const imports = sourceFile.getImportDeclarations();
          const violations: string[] = [];

          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();

            // Only check infrastructure imports
            if (!isInfrastructureImport(moduleSpecifier)) {
              continue;
            }

            const targetModule = extractModuleNameFromImport(moduleSpecifier);
            
            // Allow internal imports within the same module
            if (currentModule && targetModule === currentModule) {
              continue;
            }

            // Check for boundary violations
            const violation = checkBoundaryViolation(moduleSpecifier, filePath);
            if (violation) {
              violations.push(violation);
            }
          }

          if (violations.length > 0) {
            throw new Error(
              `Module boundary violations in ${filePath}:\n${violations.join('\n')}`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent direct imports from sub-modules', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), '../../tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'client/src/**/*.ts',
      'client/src/**/*.tsx',
      '!client/src/**/*.test.ts',
      '!client/src/**/*.test.tsx',
      '!client/src/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sourceFiles = project.getSourceFiles();

    // Sub-modules that should not be imported directly
    const protectedSubModules = [
      'observability/error-monitoring',
      'observability/performance',
      'observability/telemetry',
      'observability/analytics',
      'store/slices',
      'api/http',
      'api/websocket',
      'api/realtime',
      'error/factory',
      'error/handler',
      'error/serialization',
      'error/recovery',
      'logging/client-logger',
      'logging/config',
      'logging/formatters',
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sourceFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sourceFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();
          const imports = sourceFile.getImportDeclarations();
          const violations: string[] = [];

          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();

            // Check if importing from protected sub-module
            for (const subModule of protectedSubModules) {
              if (moduleSpecifier.includes(subModule)) {
                // Allow if the file is within the parent module
                const parentModule = subModule.split('/')[0];
                if (!filePath.includes(`/infrastructure/${parentModule}/`)) {
                  violations.push(
                    `  - Direct sub-module import: ${moduleSpecifier} (use parent module public API instead)`
                  );
                }
              }
            }
          }

          if (violations.length > 0) {
            throw new Error(
              `Sub-module boundary violations in ${filePath}:\n${violations.join('\n')}`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should enforce architectural layering rules', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), '../../tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'client/src/infrastructure/**/*.ts',
      'client/src/infrastructure/**/*.tsx',
      '!client/src/infrastructure/**/*.test.ts',
      '!client/src/infrastructure/**/*.test.tsx',
      '!client/src/infrastructure/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sourceFiles = project.getSourceFiles();

    // Define architectural layers
    const layers = {
      TYPES: ['error/types', 'logging/types', 'observability/types', 'validation/types'],
      PRIMITIVES: ['events', 'storage', 'cache'],
      SERVICES: ['api', 'observability', 'error', 'logging', 'validation'],
      INTEGRATION: ['store', 'auth', 'sync', 'search', 'security', 'personalization', 'recovery'],
      PRESENTATION: ['command-palette', 'community', 'mobile', 'system', 'workers', 'asset-loading', 'browser', 'navigation', 'hooks'],
    };

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sourceFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sourceFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();
          const sourceLayer = getModuleLayer(filePath, layers);
          
          if (!sourceLayer) return; // Not in a defined layer

          const imports = sourceFile.getImportDeclarations();
          const violations: string[] = [];

          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();

            if (!isInfrastructureImport(moduleSpecifier)) {
              continue;
            }

            const targetModule = extractModuleNameFromImport(moduleSpecifier);
            if (!targetModule) continue;

            const targetLayer = getModuleLayerByName(targetModule, layers);
            if (!targetLayer) continue;

            // Check for upward dependencies (not allowed)
            if (isUpwardDependency(sourceLayer, targetLayer)) {
              violations.push(
                `  - Upward dependency: ${sourceLayer} layer cannot depend on ${targetLayer} layer (${moduleSpecifier})`
              );
            }
          }

          if (violations.length > 0) {
            throw new Error(
              `Architectural layering violations in ${filePath}:\n${violations.join('\n')}`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate random import attempts and verify only public API imports are allowed', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Define infrastructure modules
    const modules = [
      'observability',
      'store',
      'api',
      'logging',
      'error',
      'validation',
      'auth',
      'cache',
      'events',
      'storage',
    ];

    // Define internal paths that should not be importable
    const internalPaths = [
      '/utils/',
      '/helpers/',
      '/internal/',
      '/private/',
      '/impl/',
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...modules),
        fc.constantFrom(...internalPaths),
        fc.string({ minLength: 3, maxLength: 20 }),
        async (moduleName, internalPath, fileName) => {
          // Generate a random internal import path
          const importPath = `@/infrastructure/${moduleName}${internalPath}${fileName}`;

          // Property: Internal paths should not be allowed
          const isPublicAPI = isPublicAPIImport(importPath);
          
          // Internal paths should always be rejected
          expect(isPublicAPI).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if an import is from infrastructure
 */
function isInfrastructureImport(moduleSpecifier: string): boolean {
  return moduleSpecifier.includes('@/infrastructure/') ||
         moduleSpecifier.includes('../infrastructure/') ||
         moduleSpecifier.includes('./infrastructure/');
}

/**
 * Extracts module name from file path
 */
function extractModuleName(filePath: string): string | null {
  const match = filePath.match(/\/infrastructure\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts module name from import specifier
 */
function extractModuleNameFromImport(moduleSpecifier: string): string | null {
  // Handle @/infrastructure/moduleName format
  const aliasMatch = moduleSpecifier.match(/@\/infrastructure\/([^/]+)/);
  if (aliasMatch) {
    return aliasMatch[1];
  }

  // Handle relative paths like ../infrastructure/moduleName
  const relativeMatch = moduleSpecifier.match(/infrastructure\/([^/]+)/);
  if (relativeMatch) {
    return relativeMatch[1];
  }

  return null;
}

/**
 * Checks for boundary violations in import path
 */
function checkBoundaryViolation(moduleSpecifier: string, filePath: string): string | null {
  // Allowed patterns:
  // - @/infrastructure/moduleName (public API)
  // - @/infrastructure/moduleName/types (types are public)
  // - @/infrastructure/index (root index)
  // - @/infrastructure/init (initialization)

  // Check for internal path usage
  if (moduleSpecifier.includes('/utils/') ||
      moduleSpecifier.includes('/helpers/') ||
      moduleSpecifier.includes('/internal/') ||
      moduleSpecifier.includes('/private/') ||
      moduleSpecifier.includes('/impl/') ||
      moduleSpecifier.includes('/factory/') ||
      moduleSpecifier.includes('/handler/') ||
      moduleSpecifier.includes('/serialization/') ||
      moduleSpecifier.includes('/recovery/') ||
      moduleSpecifier.includes('/client-logger') ||
      moduleSpecifier.includes('/config/') ||
      moduleSpecifier.includes('/formatters/')) {
    return `  - Internal path import: ${moduleSpecifier} (use public API instead)`;
  }

  // Check for sub-module imports (more than one level deep)
  const match = moduleSpecifier.match(/@\/infrastructure\/([^/]+)\/([^/]+)/);
  if (match) {
    const moduleName = match[1];
    const subPath = match[2];

    // Allow types imports
    if (subPath === 'types' || subPath.startsWith('types/')) {
      return null;
    }

    // Allow slices for store module (special case)
    if (moduleName === 'store' && subPath.startsWith('slices')) {
      // But only from within store module
      if (!filePath.includes('/infrastructure/store/')) {
        return `  - Direct slice import: ${moduleSpecifier} (use store public API instead)`;
      }
      return null;
    }

    // Other sub-paths are violations
    return `  - Sub-module import: ${moduleSpecifier} (use parent module public API instead)`;
  }

  return null;
}

/**
 * Checks if an import path is a public API import
 */
function isPublicAPIImport(importPath: string): boolean {
  // Public API patterns:
  // - @/infrastructure/moduleName (index.ts)
  // - @/infrastructure/moduleName/types
  // - @/infrastructure/index
  // - @/infrastructure/init

  if (importPath === '@/infrastructure' ||
      importPath === '@/infrastructure/index' ||
      importPath === '@/infrastructure/init') {
    return true;
  }

  const match = importPath.match(/@\/infrastructure\/([^/]+)(\/.*)?/);
  if (!match) return false;

  const subPath = match[2];
  
  // No sub-path means importing from index.ts (public API)
  if (!subPath) return true;

  // Types are public
  if (subPath === '/types' || subPath.startsWith('/types/')) return true;

  // Everything else is internal
  return false;
}

/**
 * Gets the architectural layer of a module from file path
 */
function getModuleLayer(filePath: string, layers: Record<string, string[]>): string | null {
  for (const [layerName, modules] of Object.entries(layers)) {
    for (const module of modules) {
      if (filePath.includes(`/infrastructure/${module}/`)) {
        return layerName;
      }
    }
  }
  return null;
}

/**
 * Gets the architectural layer of a module by name
 */
function getModuleLayerByName(moduleName: string, layers: Record<string, string[]>): string | null {
  for (const [layerName, modules] of Object.entries(layers)) {
    if (modules.includes(moduleName)) {
      return layerName;
    }
  }
  return null;
}

/**
 * Checks if a dependency is upward (not allowed)
 */
function isUpwardDependency(sourceLayer: string, targetLayer: string): boolean {
  const layerOrder = ['TYPES', 'PRIMITIVES', 'SERVICES', 'INTEGRATION', 'PRESENTATION'];
  const sourceIndex = layerOrder.indexOf(sourceLayer);
  const targetIndex = layerOrder.indexOf(targetLayer);

  // Upward dependency if source is lower than target
  return sourceIndex < targetIndex;
}
