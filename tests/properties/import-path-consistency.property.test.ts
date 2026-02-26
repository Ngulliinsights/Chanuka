/**
 * Property-Based Test: Import Path Consistency
 * 
 * Property 7: For any import statement in the codebase, it should reference 
 * a valid consolidated module and an existing export from that module.
 * 
 * Feature: client-infrastructure-consolidation, Property 7: Import Path Consistency
 * Validates: Requirements 8.3, 14.1, 14.2, 14.3, 14.5, 18.2
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, ImportDeclaration } from 'ts-morph';
import * as path from 'path';

describe('Feature: client-infrastructure-consolidation, Property 7: Import Path Consistency', () => {
  it('should have all imports reference valid consolidated modules', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add client infrastructure source files
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
          
          // Skip non-infrastructure files for this test
          if (!filePath.includes('/infrastructure/') && !filePath.includes('client/src/')) {
            return;
          }

          const imports = sourceFile.getImportDeclarations();
          const violations: string[] = [];

          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();

            // Only check infrastructure imports
            if (!moduleSpecifier.includes('@/infrastructure/') && 
                !moduleSpecifier.includes('../infrastructure/') &&
                !moduleSpecifier.includes('./infrastructure/')) {
              continue;
            }

            // Property 1: Import should reference a valid module
            const isValidModule = checkValidModule(moduleSpecifier, project);
            if (!isValidModule) {
              violations.push(`  - Invalid module reference: ${moduleSpecifier}`);
            }

            // Property 2: Import should reference existing exports
            const invalidExports = checkExportsExist(importDecl, project);
            if (invalidExports.length > 0) {
              violations.push(`  - Non-existent exports from ${moduleSpecifier}: ${invalidExports.join(', ')}`);
            }

            // Property 3: Import should use public API (index.ts) not internal files
            const usesInternalPath = checkInternalPathUsage(moduleSpecifier);
            if (usesInternalPath) {
              violations.push(`  - Internal path usage (should use public API): ${moduleSpecifier}`);
            }
          }

          if (violations.length > 0) {
            throw new Error(
              `Import path consistency violations in ${filePath}:\n${violations.join('\n')}`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all infrastructure imports use consolidated module paths', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
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

    // Define consolidated modules
    const consolidatedModules = [
      'observability',
      'store',
      'api',
      'logging',
      'error',
      'validation',
      'auth',
      'cache',
      'browser',
      'command-palette',
      'community',
      'events',
      'hooks',
      'mobile',
      'personalization',
      'search',
      'security',
      'storage',
      'sync',
      'system',
      'workers',
      'asset-loading',
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

            // Only check infrastructure imports
            if (!moduleSpecifier.includes('@/infrastructure/') && 
                !moduleSpecifier.includes('../infrastructure/') &&
                !moduleSpecifier.includes('./infrastructure/')) {
              continue;
            }

            // Extract module name from path
            const moduleName = extractModuleName(moduleSpecifier);
            if (!moduleName) continue;

            // Property: Module should be in consolidated list
            if (!consolidatedModules.includes(moduleName)) {
              violations.push(`  - Import from non-consolidated module: ${moduleSpecifier}`);
            }
          }

          if (violations.length > 0) {
            throw new Error(
              `Non-consolidated module imports in ${filePath}:\n${violations.join('\n')}`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all imports reference exports through public API', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
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

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sourceFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sourceFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();
          
          // Skip files within infrastructure modules (they can use internal imports)
          if (filePath.includes('/infrastructure/') && 
              !filePath.includes('/infrastructure/index.ts')) {
            const moduleDir = extractModuleDirectory(filePath);
            
            const imports = sourceFile.getImportDeclarations();
            
            for (const importDecl of imports) {
              const moduleSpecifier = importDecl.getModuleSpecifierValue();
              
              // Only check infrastructure imports to OTHER modules
              if (!moduleSpecifier.includes('@/infrastructure/') && 
                  !moduleSpecifier.includes('../infrastructure/')) {
                continue;
              }

              // Property: Should use public API (index.ts) not internal paths
              const usesInternalPath = moduleSpecifier.includes('/types/') ||
                                      moduleSpecifier.includes('/utils/') ||
                                      moduleSpecifier.includes('/helpers/') ||
                                      (moduleSpecifier.match(/\//g) || []).length > 2;

              if (usesInternalPath) {
                expect(usesInternalPath).toBe(false);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a module specifier references a valid module
 */
function checkValidModule(moduleSpecifier: string, project: Project): boolean {
  try {
    // Resolve the module path
    const resolvedPath = resolveModulePath(moduleSpecifier, project);
    if (!resolvedPath) return false;

    // Check if the file exists in the project
    const sourceFile = project.getSourceFile(resolvedPath);
    return sourceFile !== undefined;
  } catch {
    return false;
  }
}

/**
 * Checks if imported names exist in the target module
 */
function checkExportsExist(importDecl: ImportDeclaration, project: Project): string[] {
  const moduleSpecifier = importDecl.getModuleSpecifierValue();
  const namedImports = importDecl.getNamedImports();
  
  if (namedImports.length === 0) {
    return []; // Default import or namespace import
  }

  try {
    const resolvedPath = resolveModulePath(moduleSpecifier, project);
    if (!resolvedPath) return [];

    const targetFile = project.getSourceFile(resolvedPath);
    if (!targetFile) return [];

    const exports = targetFile.getExportedDeclarations();
    const exportNames = Array.from(exports.keys());

    const invalidExports: string[] = [];
    for (const namedImport of namedImports) {
      const importName = namedImport.getName();
      if (!exportNames.includes(importName)) {
        invalidExports.push(importName);
      }
    }

    return invalidExports;
  } catch {
    return [];
  }
}

/**
 * Checks if a module specifier uses internal paths instead of public API
 */
function checkInternalPathUsage(moduleSpecifier: string): boolean {
  // Internal paths include /types/, /utils/, /helpers/, or deep nesting
  if (moduleSpecifier.includes('/types/') ||
      moduleSpecifier.includes('/utils/') ||
      moduleSpecifier.includes('/helpers/') ||
      moduleSpecifier.includes('/internal/')) {
    return true;
  }

  // Check for deep nesting (more than 2 slashes after @/infrastructure/)
  const match = moduleSpecifier.match(/@\/infrastructure\/([^/]+)(\/.*)?/);
  if (match && match[2]) {
    const subPath = match[2];
    // Allow /slices/ for store module
    if (subPath.startsWith('/slices/')) {
      return false;
    }
    // Other sub-paths are considered internal
    return true;
  }

  return false;
}

/**
 * Extracts module name from import path
 */
function extractModuleName(moduleSpecifier: string): string | null {
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
 * Extracts module directory from file path
 */
function extractModuleDirectory(filePath: string): string | null {
  const match = filePath.match(/\/infrastructure\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Resolves a module specifier to an actual file path
 */
function resolveModulePath(moduleSpecifier: string, project: Project): string | null {
  try {
    // Handle @/infrastructure alias
    if (moduleSpecifier.startsWith('@/infrastructure/')) {
      const relativePath = moduleSpecifier.replace('@/infrastructure/', 'client/src/infrastructure/');
      
      // Try with index.ts
      let fullPath = path.resolve(process.cwd(), relativePath, 'index.ts');
      if (project.getSourceFile(fullPath)) {
        return fullPath;
      }

      // Try as direct file
      fullPath = path.resolve(process.cwd(), `${relativePath}.ts`);
      if (project.getSourceFile(fullPath)) {
        return fullPath;
      }

      fullPath = path.resolve(process.cwd(), `${relativePath}.tsx`);
      if (project.getSourceFile(fullPath)) {
        return fullPath;
      }
    }

    // Handle relative paths
    if (moduleSpecifier.startsWith('.')) {
      // Would need source file context to resolve properly
      return null;
    }

    return null;
  } catch {
    return null;
  }
}
