/**
 * Property-Based Test: Public API Completeness
 * 
 * Property 3: For any module in the infrastructure, all exports should have JSDoc comments
 * and all exports should be accessible through the module's index.ts file.
 * 
 * Feature: client-infrastructure-consolidation, Property 3: Public API Completeness
 * **Validates: Requirements 5.1, 5.2, 5.4**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import * as path from 'path';

describe('Feature: client-infrastructure-consolidation, Property 3: Public API Completeness', () => {
  it('should verify all exports have JSDoc comments in observability module', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add observability module source files
    project.addSourceFilesAtPaths([
      'client/src/infrastructure/observability/**/*.ts',
      '!client/src/infrastructure/observability/**/*.test.ts',
      '!client/src/infrastructure/observability/**/*.spec.ts',
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
          const violations: string[] = [];

          // Property 1: All exported functions should have JSDoc comments
          const exportedFunctions = sourceFile.getFunctions().filter(fn => fn.isExported());
          for (const fn of exportedFunctions) {
            const jsDocs = fn.getJsDocs();
            if (jsDocs.length === 0) {
              violations.push(`  - Function '${fn.getName()}' is exported but has no JSDoc comment`);
            }
          }

          // Property 2: All exported classes should have JSDoc comments
          const exportedClasses = sourceFile.getClasses().filter(cls => cls.isExported());
          for (const cls of exportedClasses) {
            const jsDocs = cls.getJsDocs();
            if (jsDocs.length === 0) {
              violations.push(`  - Class '${cls.getName()}' is exported but has no JSDoc comment`);
            }
          }

          // Property 3: All exported interfaces should have JSDoc comments
          const exportedInterfaces = sourceFile.getInterfaces().filter(iface => iface.isExported());
          for (const iface of exportedInterfaces) {
            const jsDocs = iface.getJsDocs();
            if (jsDocs.length === 0) {
              violations.push(`  - Interface '${iface.getName()}' is exported but has no JSDoc comment`);
            }
          }

          // Property 4: All exported type aliases should have JSDoc comments
          const exportedTypes = sourceFile.getTypeAliases().filter(type => type.isExported());
          for (const type of exportedTypes) {
            const jsDocs = type.getJsDocs();
            if (jsDocs.length === 0) {
              violations.push(`  - Type '${type.getName()}' is exported but has no JSDoc comment`);
            }
          }

          // Property 5: All exported variables/constants should have JSDoc comments
          const exportedVariables = sourceFile.getVariableStatements().filter(stmt => stmt.isExported());
          for (const varStmt of exportedVariables) {
            const declarations = varStmt.getDeclarations();
            for (const decl of declarations) {
              const jsDocs = varStmt.getJsDocs();
              if (jsDocs.length === 0) {
                violations.push(`  - Variable '${decl.getName()}' is exported but has no JSDoc comment`);
              }
            }
          }

          // If violations found, fail with detailed message
          if (violations.length > 0) {
            const errorMsg = `Public API documentation violations in ${filePath}:\n${violations.join('\n')}`;
            expect(violations.length).withContext(errorMsg).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify all exports are accessible through index.ts', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add observability module source files
    project.addSourceFilesAtPaths([
      'client/src/infrastructure/observability/**/*.ts',
      '!client/src/infrastructure/observability/**/*.test.ts',
      '!client/src/infrastructure/observability/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const indexFile = project.getSourceFile('client/src/infrastructure/observability/index.ts');
    if (!indexFile) {
      throw new Error('index.ts not found in observability module');
    }

    // Get all exports from index.ts
    const indexExports = extractExportsFromIndexFile(indexFile);

    // Get all source files except index.ts
    const sourceFiles = project.getSourceFiles().filter(
      sf => !sf.getFilePath().includes('index.ts') && 
            !sf.getFilePath().includes('__tests__')
    );

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sourceFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sourceFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();
          const violations: string[] = [];

          // Property: All public exports from sub-modules should be accessible through index.ts
          const publicExports = extractPublicExports(sourceFile);

          for (const exportName of publicExports) {
            // Check if this export is re-exported through index.ts
            const isAccessible = indexExports.has(exportName) || 
                                isReExportedViaWildcard(indexFile, sourceFile);

            if (!isAccessible) {
              violations.push(`  - Export '${exportName}' is not accessible through index.ts`);
            }
          }

          // If violations found, fail with detailed message
          if (violations.length > 0) {
            const errorMsg = `Public API accessibility violations in ${filePath}:\n${violations.join('\n')}`;
            expect(violations.length).withContext(errorMsg).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify JSDoc comments contain required information', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add observability module source files
    project.addSourceFilesAtPaths([
      'client/src/infrastructure/observability/**/*.ts',
      '!client/src/infrastructure/observability/**/*.test.ts',
      '!client/src/infrastructure/observability/**/*.spec.ts',
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
          const violations: string[] = [];

          // Property: JSDoc comments should contain meaningful descriptions
          const exportedFunctions = sourceFile.getFunctions().filter(fn => fn.isExported());
          for (const fn of exportedFunctions) {
            const jsDocs = fn.getJsDocs();
            if (jsDocs.length > 0) {
              const description = jsDocs[0].getDescription().trim();
              
              // Check if description is meaningful (not empty, not just the function name)
              if (description.length === 0) {
                violations.push(`  - Function '${fn.getName()}' has empty JSDoc description`);
              } else if (description.length < 10) {
                violations.push(`  - Function '${fn.getName()}' has too short JSDoc description: "${description}"`);
              }
            }
          }

          // Check interfaces
          const exportedInterfaces = sourceFile.getInterfaces().filter(iface => iface.isExported());
          for (const iface of exportedInterfaces) {
            const jsDocs = iface.getJsDocs();
            if (jsDocs.length > 0) {
              const description = jsDocs[0].getDescription().trim();
              
              if (description.length === 0) {
                violations.push(`  - Interface '${iface.getName()}' has empty JSDoc description`);
              } else if (description.length < 10) {
                violations.push(`  - Interface '${iface.getName()}' has too short JSDoc description: "${description}"`);
              }
            }
          }

          // If violations found, fail with detailed message
          if (violations.length > 0) {
            const errorMsg = `JSDoc quality violations in ${filePath}:\n${violations.join('\n')}`;
            expect(violations.length).withContext(errorMsg).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify all public interfaces have documented properties', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add observability module source files
    project.addSourceFilesAtPaths([
      'client/src/infrastructure/observability/**/*.ts',
      '!client/src/infrastructure/observability/**/*.test.ts',
      '!client/src/infrastructure/observability/**/*.spec.ts',
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
          const violations: string[] = [];

          // Property: All properties in exported interfaces should have JSDoc comments
          const exportedInterfaces = sourceFile.getInterfaces().filter(iface => iface.isExported());
          for (const iface of exportedInterfaces) {
            const properties = iface.getProperties();
            
            for (const prop of properties) {
              const jsDocs = prop.getJsDocs();
              if (jsDocs.length === 0) {
                violations.push(`  - Property '${prop.getName()}' in interface '${iface.getName()}' has no JSDoc comment`);
              }
            }

            const methods = iface.getMethods();
            for (const method of methods) {
              const jsDocs = method.getJsDocs();
              if (jsDocs.length === 0) {
                violations.push(`  - Method '${method.getName()}' in interface '${iface.getName()}' has no JSDoc comment`);
              }
            }
          }

          // If violations found, fail with detailed message
          if (violations.length > 0) {
            const errorMsg = `Interface property documentation violations in ${filePath}:\n${violations.join('\n')}`;
            expect(violations.length).withContext(errorMsg).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify exported functions have parameter documentation (when JSDoc exists)', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add observability module source files
    project.addSourceFilesAtPaths([
      'client/src/infrastructure/observability/**/*.ts',
      '!client/src/infrastructure/observability/**/*.test.ts',
      '!client/src/infrastructure/observability/**/*.spec.ts',
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
          const violations: string[] = [];

          // Property: Exported functions with parameters should document them (if JSDoc exists)
          // Note: This is a quality check - the main requirement (5.1, 5.2) is that JSDoc exists,
          // not necessarily that it has @param tags. This test checks for completeness when
          // documentation is present.
          const exportedFunctions = sourceFile.getFunctions().filter(fn => fn.isExported());
          for (const fn of exportedFunctions) {
            const parameters = fn.getParameters();
            
            if (parameters.length > 0) {
              const jsDocs = fn.getJsDocs();
              
              // Only check parameter documentation if JSDoc exists and has @param tags
              if (jsDocs.length > 0) {
                const paramTags = jsDocs[0].getTags().filter(tag => tag.getTagName() === 'param');
                
                // If there are @param tags, verify all parameters are documented
                if (paramTags.length > 0) {
                  for (const param of parameters) {
                    const paramName = param.getName();
                    const hasParamDoc = paramTags.some(tag => 
                      tag.getComment()?.toString().includes(paramName)
                    );
                    
                    if (!hasParamDoc && paramName !== 'this') {
                      violations.push(`  - Parameter '${paramName}' in function '${fn.getName()}' is not documented (but other params are)`);
                    }
                  }
                }
              }
            }
          }

          // If violations found, fail with detailed message
          if (violations.length > 0) {
            const errorMsg = `Function parameter documentation violations in ${filePath}:\n${violations.join('\n')}`;
            expect(violations.length).withContext(errorMsg).toBe(0);
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
 * Extract all exports from the index.ts file
 */
function extractExportsFromIndexFile(indexFile: SourceFile): Set<string> {
  const exports = new Set<string>();

  // Get named exports
  const exportDeclarations = indexFile.getExportDeclarations();
  for (const exportDecl of exportDeclarations) {
    const namedExports = exportDecl.getNamedExports();
    for (const namedExport of namedExports) {
      exports.add(namedExport.getName());
    }
  }

  // Get direct exports (export const, export function, etc.)
  const exportedFunctions = indexFile.getFunctions().filter(fn => fn.isExported());
  for (const fn of exportedFunctions) {
    const name = fn.getName();
    if (name) exports.add(name);
  }

  const exportedClasses = indexFile.getClasses().filter(cls => cls.isExported());
  for (const cls of exportedClasses) {
    const name = cls.getName();
    if (name) exports.add(name);
  }

  const exportedVariables = indexFile.getVariableStatements().filter(stmt => stmt.isExported());
  for (const varStmt of exportedVariables) {
    const declarations = varStmt.getDeclarations();
    for (const decl of declarations) {
      exports.add(decl.getName());
    }
  }

  // Get type exports
  const exportedInterfaces = indexFile.getInterfaces().filter(iface => iface.isExported());
  for (const iface of exportedInterfaces) {
    const name = iface.getName();
    if (name) exports.add(name);
  }

  const exportedTypes = indexFile.getTypeAliases().filter(type => type.isExported());
  for (const type of exportedTypes) {
    const name = type.getName();
    if (name) exports.add(name);
  }

  return exports;
}

/**
 * Extract public exports from a source file
 */
function extractPublicExports(sourceFile: SourceFile): Set<string> {
  const exports = new Set<string>();

  // Get exported functions
  const exportedFunctions = sourceFile.getFunctions().filter(fn => fn.isExported());
  for (const fn of exportedFunctions) {
    const name = fn.getName();
    if (name) exports.add(name);
  }

  // Get exported classes
  const exportedClasses = sourceFile.getClasses().filter(cls => cls.isExported());
  for (const cls of exportedClasses) {
    const name = cls.getName();
    if (name) exports.add(name);
  }

  // Get exported variables/constants
  const exportedVariables = sourceFile.getVariableStatements().filter(stmt => stmt.isExported());
  for (const varStmt of exportedVariables) {
    const declarations = varStmt.getDeclarations();
    for (const decl of declarations) {
      exports.add(decl.getName());
    }
  }

  // Get exported interfaces
  const exportedInterfaces = sourceFile.getInterfaces().filter(iface => iface.isExported());
  for (const iface of exportedInterfaces) {
    const name = iface.getName();
    if (name) exports.add(name);
  }

  // Get exported types
  const exportedTypes = sourceFile.getTypeAliases().filter(type => type.isExported());
  for (const type of exportedTypes) {
    const name = type.getName();
    if (name) exports.add(name);
  }

  return exports;
}

/**
 * Check if a source file is re-exported via wildcard in index.ts
 */
function isReExportedViaWildcard(indexFile: SourceFile, sourceFile: SourceFile): boolean {
  const exportDeclarations = indexFile.getExportDeclarations();
  const sourceFilePath = sourceFile.getFilePath();
  
  for (const exportDecl of exportDeclarations) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    
    // Check if this is a wildcard export (export * from './module')
    if (moduleSpecifier && exportDecl.getNamedExports().length === 0) {
      // Resolve the module path
      const resolvedPath = path.resolve(
        path.dirname(indexFile.getFilePath()),
        moduleSpecifier
      );
      
      // Check if the source file matches this export
      if (sourceFilePath.includes(resolvedPath) || 
          sourceFilePath.replace(/\.ts$/, '') === resolvedPath ||
          sourceFilePath === resolvedPath + '.ts') {
        return true;
      }
    }
  }
  
  return false;
}
