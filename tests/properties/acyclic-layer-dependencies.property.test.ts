/**
 * Property-Based Test: Acyclic Layer Dependencies
 * 
 * Property 4: For any import path in the codebase, following the import chain 
 * should never create a cycle between layers (client, server, shared, database).
 * 
 * Feature: full-stack-integration, Property 4: Acyclic Layer Dependencies
 * Validates: Requirements 1.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, SourceFile } from 'ts-morph';
import * as path from 'path';

type Layer = 'client' | 'server' | 'shared' | 'database' | 'unknown';

describe('Feature: full-stack-integration, Property 4: Acyclic Layer Dependencies', () => {
  it('should not have circular dependencies between layers', async () => {
    // Create project once outside the property test
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add all source files from all layers
    project.addSourceFilesAtPaths([
      'client/**/*.ts',
      'client/**/*.tsx',
      'server/**/*.ts',
      'shared/**/*.ts',
      '!**/*.test.ts',
      '!**/*.test.tsx',
      '!**/*.spec.ts',
      '!**/*.spec.tsx',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.next/**',
    ]);

    const sourceFiles = project.getSourceFiles();

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary source files to check
        fc.integer({ min: 0, max: Math.max(0, sourceFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sourceFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();
          const layer = getLayerFromPath(filePath);

          // Skip if layer is unknown
          if (layer === 'unknown') return;

          // Check all imports from this file
          const imports = sourceFile.getImportDeclarations();
          
          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            
            // Skip external modules
            if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/')) {
              continue;
            }

            // Resolve the imported file
            const importedFile = importDecl.getModuleSpecifierSourceFile();
            if (!importedFile) continue;

            const importedFilePath = importedFile.getFilePath();
            const importedLayer = getLayerFromPath(importedFilePath);

            // Property: Check for invalid layer dependencies
            const isValidDependency = isValidLayerDependency(layer, importedLayer);
            
            if (!isValidDependency) {
              // Provide detailed error message
              const errorMsg = `Invalid layer dependency detected: ${layer} -> ${importedLayer}\n` +
                `File: ${filePath}\n` +
                `Imports: ${importedFilePath}\n` +
                `Valid dependencies for ${layer}: ${getValidDependencies(layer).join(', ')}`;
              
              expect(isValidDependency).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should enforce that client layer only imports from shared', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'client/**/*.ts',
      'client/**/*.tsx',
      'server/**/*.ts',
      'shared/**/*.ts',
      '!**/*.test.ts',
      '!**/*.test.tsx',
      '!**/*.spec.ts',
      '!**/*.spec.tsx',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const clientFiles = project.getSourceFiles().filter(f => 
      f.getFilePath().includes('/client/')
    );

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, clientFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = clientFiles[fileIndex];
          if (!sourceFile) return;

          const imports = sourceFile.getImportDeclarations();

          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            
            // Skip external modules
            if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/')) {
              continue;
            }

            const importedFile = importDecl.getModuleSpecifierSourceFile();
            if (!importedFile) continue;

            const importedFilePath = importedFile.getFilePath();
            const importedLayer = getLayerFromPath(importedFilePath);

            // Property: Client should only import from shared
            if (importedLayer !== 'shared' && importedLayer !== 'client' && importedLayer !== 'unknown') {
              const errorMsg = `Client layer importing from ${importedLayer}: ${sourceFile.getFilePath()} -> ${importedFilePath}`;
              expect(importedLayer).toBe('shared');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should enforce that server layer only imports from shared', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'server/**/*.ts',
      'client/**/*.ts',
      'shared/**/*.ts',
      '!**/*.test.ts',
      '!**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const serverFiles = project.getSourceFiles().filter(f => 
      f.getFilePath().includes('/server/')
    );

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, serverFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = serverFiles[fileIndex];
          if (!sourceFile) return;

          const imports = sourceFile.getImportDeclarations();

          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            
            // Skip external modules
            if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/')) {
              continue;
            }

            const importedFile = importDecl.getModuleSpecifierSourceFile();
            if (!importedFile) continue;

            const importedFilePath = importedFile.getFilePath();
            const importedLayer = getLayerFromPath(importedFilePath);

            // Property: Server should only import from shared
            if (importedLayer !== 'shared' && importedLayer !== 'server' && importedLayer !== 'unknown') {
              const errorMsg = `Server layer importing from ${importedLayer}: ${sourceFile.getFilePath()} -> ${importedFilePath}`;
              expect(importedLayer).toBe('shared');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should enforce that shared layer does not import from client or server', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'shared/**/*.ts',
      'client/**/*.ts',
      'server/**/*.ts',
      '!**/*.test.ts',
      '!**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sharedFiles = project.getSourceFiles().filter(f => 
      f.getFilePath().includes('/shared/')
    );

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sharedFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sharedFiles[fileIndex];
          if (!sourceFile) return;

          const imports = sourceFile.getImportDeclarations();

          for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            
            // Skip external modules
            if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/')) {
              continue;
            }

            const importedFile = importDecl.getModuleSpecifierSourceFile();
            if (!importedFile) continue;

            const importedFilePath = importedFile.getFilePath();
            const importedLayer = getLayerFromPath(importedFilePath);

            // Property: Shared should not import from client or server
            if (importedLayer === 'client' || importedLayer === 'server') {
              const errorMsg = `Shared layer importing from ${importedLayer}: ${sourceFile.getFilePath()} -> ${importedFilePath}`;
              expect(importedLayer).not.toBe('client');
              expect(importedLayer).not.toBe('server');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect circular import chains within the same layer', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'client/**/*.ts',
      'client/**/*.tsx',
      'server/**/*.ts',
      'shared/**/*.ts',
      '!**/*.test.ts',
      '!**/*.test.tsx',
      '!**/*.spec.ts',
      '!**/*.spec.tsx',
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
          
          // Check for circular dependencies using DFS
          const visited = new Set<string>();
          const recursionStack = new Set<string>();
          
          const hasCycle = detectCycle(sourceFile, visited, recursionStack, project);
          
          // Property: No circular dependencies should exist
          if (hasCycle) {
            const errorMsg = `Circular dependency detected starting from: ${filePath}`;
            expect(hasCycle).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify layer dependency hierarchy is respected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fromLayer: fc.constantFrom('client', 'server', 'shared'),
          toLayer: fc.constantFrom('client', 'server', 'shared')
        }),
        async ({ fromLayer, toLayer }) => {
          // Property: Verify the dependency rules
          const isValid = isValidLayerDependency(fromLayer as Layer, toLayer as Layer);
          
          // Define expected rules
          const expectedRules: Record<string, boolean> = {
            'client->client': true,
            'client->shared': true,
            'client->server': false,
            'server->server': true,
            'server->shared': true,
            'server->client': false,
            'shared->shared': true,
            'shared->client': false,
            'shared->server': false,
          };

          const key = `${fromLayer}->${toLayer}`;
          const expected = expectedRules[key];

          expect(isValid).toBe(expected);
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
 * Determine which layer a file belongs to based on its path
 */
function getLayerFromPath(filePath: string): Layer {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (normalizedPath.includes('/client/')) return 'client';
  if (normalizedPath.includes('/server/')) return 'server';
  if (normalizedPath.includes('/shared/')) return 'shared';
  if (normalizedPath.includes('/drizzle/')) return 'database';
  
  return 'unknown';
}

/**
 * Check if a dependency from one layer to another is valid
 */
function isValidLayerDependency(fromLayer: Layer, toLayer: Layer): boolean {
  // Same layer dependencies are always valid
  if (fromLayer === toLayer) return true;
  
  // Unknown layer is always valid (external dependencies)
  if (fromLayer === 'unknown' || toLayer === 'unknown') return true;

  // Define valid layer dependencies
  const validDependencies: Record<Layer, Layer[]> = {
    client: ['shared'],
    server: ['shared', 'database'],
    shared: [], // Shared should not depend on other layers
    database: [], // Database should not depend on other layers
    unknown: ['client', 'server', 'shared', 'database'],
  };

  return validDependencies[fromLayer]?.includes(toLayer) ?? false;
}

/**
 * Get list of valid dependencies for a layer
 */
function getValidDependencies(layer: Layer): string[] {
  const validDependencies: Record<Layer, string[]> = {
    client: ['shared', 'client'],
    server: ['shared', 'database', 'server'],
    shared: ['shared'],
    database: ['database'],
    unknown: ['any'],
  };

  return validDependencies[layer] || [];
}

/**
 * Detect circular dependencies using DFS
 */
function detectCycle(
  sourceFile: SourceFile,
  visited: Set<string>,
  recursionStack: Set<string>,
  project: Project
): boolean {
  const filePath = sourceFile.getFilePath();
  
  // If already in recursion stack, we found a cycle
  if (recursionStack.has(filePath)) {
    return true;
  }
  
  // If already visited and not in recursion stack, no cycle from this node
  if (visited.has(filePath)) {
    return false;
  }
  
  // Mark as visited and add to recursion stack
  visited.add(filePath);
  recursionStack.add(filePath);
  
  // Check all imports
  const imports = sourceFile.getImportDeclarations();
  
  for (const importDecl of imports) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    
    // Skip external modules
    if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/')) {
      continue;
    }
    
    const importedFile = importDecl.getModuleSpecifierSourceFile();
    if (!importedFile) continue;
    
    // Recursively check for cycles
    if (detectCycle(importedFile, visited, recursionStack, project)) {
      return true;
    }
  }
  
  // Remove from recursion stack
  recursionStack.delete(filePath);
  
  return false;
}
