/**
 * Property-Based Test: Shared Layer Single Source of Truth
 * 
 * Property 1: For any domain entity, enum, validation schema, or error type, 
 * there should exist exactly one canonical definition in the shared layer, 
 * and all other layers should reference this definition rather than creating duplicates.
 * 
 * Feature: full-stack-integration, Property 1: Shared Layer Single Source of Truth
 * Validates: Requirements 1.1, 1.6, 3.1, 5.1, 8.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, SyntaxKind, InterfaceDeclaration, TypeAliasDeclaration, EnumDeclaration } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

describe('Feature: full-stack-integration, Property 1: Shared Layer Single Source of Truth', () => {
  it('should have exactly one definition for each domain entity in the shared layer', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary entity names to check
        fc.constantFrom(
          'User',
          'Bill',
          'Committee',
          'Comment',
          'Vote',
          'UserRole',
          'BillStatus',
          'ErrorCode',
          'ErrorClassification',
          'StandardError'
        ),
        async (entityName) => {
          // Create a project to analyze the codebase
          const project = new Project({
            tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
          });

          // Manually add source files from key directories
          project.addSourceFilesAtPaths([
            'shared/types/**/*.ts',
            'client/src/**/*.ts',
            'server/**/*.ts',
            '!**/*.test.ts',
            '!**/*.spec.ts',
            '!**/node_modules/**',
            '!**/dist/**',
          ]);

          // Find all definitions of this entity across the codebase
          const definitions = findEntityDefinitions(project, entityName);

          // Property 1: There should be at least one definition
          expect(definitions.length).toBeGreaterThan(0);

          // Property 2: All definitions in shared layer should be in the same file
          const sharedDefinitions = definitions.filter(d => d.filePath.includes('/shared/'));
          
          if (sharedDefinitions.length > 0) {
            const sharedPaths = new Set(sharedDefinitions.map(d => d.filePath));
            
            // All shared definitions should be in the same canonical file
            expect(sharedPaths.size).toBeLessThanOrEqual(1);
          }

          // Property 3: Definitions outside shared layer should be minimal
          // (Only type re-exports or extensions are allowed)
          const nonSharedDefinitions = definitions.filter(d => !d.filePath.includes('/shared/'));
          
          for (const def of nonSharedDefinitions) {
            // Check if it's a re-export or extension
            const sourceFile = project.getSourceFile(def.filePath);
            if (!sourceFile) continue;

            const isReExport = checkIfReExport(sourceFile, entityName);
            const isExtension = checkIfExtension(sourceFile, entityName);

            // Non-shared definitions should either be re-exports or extensions
            expect(isReExport || isExtension).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all enum definitions in shared/types/core/enums.ts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary enum names to check
        fc.constantFrom(
          'UserRole',
          'BillStatus',
          'ErrorCode',
          'ErrorClassification',
          'CommitteeType'
        ),
        async (enumName) => {
          const project = new Project({
            tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
          });

          // Manually add source files from key directories
          project.addSourceFilesAtPaths([
            'shared/types/**/*.ts',
            'client/src/**/*.ts',
            'server/**/*.ts',
            '!**/*.test.ts',
            '!**/*.spec.ts',
            '!**/node_modules/**',
            '!**/dist/**',
          ]);

          // Find all enum definitions
          const enumDefinitions = findEnumDefinitions(project, enumName);

          if (enumDefinitions.length === 0) {
            // Enum might not exist yet, skip
            return;
          }

          // Property: All enum definitions should be in shared layer
          const sharedEnums = enumDefinitions.filter(d => 
            d.filePath.includes('/shared/types/core/enums.ts')
          );

          // At least one definition should be in the canonical location
          expect(sharedEnums.length).toBeGreaterThan(0);

          // Property: Non-shared enum definitions should be re-exports only
          const nonSharedEnums = enumDefinitions.filter(d => 
            !d.filePath.includes('/shared/types/core/enums.ts')
          );

          for (const enumDef of nonSharedEnums) {
            const sourceFile = project.getSourceFile(enumDef.filePath);
            if (!sourceFile) continue;

            // Check if it's a re-export
            const hasImportFromShared = sourceFile.getImportDeclarations().some(imp => {
              const moduleSpecifier = imp.getModuleSpecifierValue();
              return moduleSpecifier.includes('shared/types') && 
                     imp.getNamedImports().some(ni => ni.getName() === enumName);
            });

            // Non-canonical enum definitions should import from shared
            expect(hasImportFromShared).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all validation schemas in shared/validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary schema names to check
        fc.constantFrom(
          'UserSchema',
          'BillSchema',
          'CreateUserRequestSchema',
          'UpdateBillRequestSchema'
        ),
        async (schemaName) => {
          const project = new Project({
            tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
          });

          // Manually add source files from key directories
          project.addSourceFilesAtPaths([
            'shared/validation/**/*.ts',
            'client/src/**/*.ts',
            'server/**/*.ts',
            '!**/*.test.ts',
            '!**/*.spec.ts',
            '!**/node_modules/**',
            '!**/dist/**',
          ]);

          // Find all validation schema definitions
          const schemaDefinitions = findValidationSchemas(project, schemaName);

          if (schemaDefinitions.length === 0) {
            // Schema might not exist yet, skip
            return;
          }

          // Property: All validation schemas should be in shared/validation
          const sharedSchemas = schemaDefinitions.filter(d => 
            d.filePath.includes('/shared/validation/')
          );

          // At least one definition should be in the canonical location
          expect(sharedSchemas.length).toBeGreaterThan(0);

          // Property: Schemas outside shared should import from shared
          const nonSharedSchemas = schemaDefinitions.filter(d => 
            !d.filePath.includes('/shared/validation/')
          );

          for (const schemaDef of nonSharedSchemas) {
            const sourceFile = project.getSourceFile(schemaDef.filePath);
            if (!sourceFile) continue;

            // Check if it imports from shared
            const hasImportFromShared = sourceFile.getImportDeclarations().some(imp => {
              const moduleSpecifier = imp.getModuleSpecifierValue();
              return moduleSpecifier.includes('shared/validation');
            });

            // Non-canonical schemas should import from shared
            expect(hasImportFromShared).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all error types in shared/types/core/errors.ts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary error type names to check
        fc.constantFrom(
          'StandardError',
          'ErrorCode',
          'ErrorClassification',
          'ValidationError',
          'AuthorizationError'
        ),
        async (errorTypeName) => {
          const project = new Project({
            tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
          });

          // Manually add source files from key directories
          project.addSourceFilesAtPaths([
            'shared/types/**/*.ts',
            'client/src/**/*.ts',
            'server/**/*.ts',
            '!**/*.test.ts',
            '!**/*.spec.ts',
            '!**/node_modules/**',
            '!**/dist/**',
          ]);

          // Find all error type definitions
          const errorDefinitions = findEntityDefinitions(project, errorTypeName);

          if (errorDefinitions.length === 0) {
            // Error type might not exist yet, skip
            return;
          }

          // Property: All error types should be in shared/types/core/errors.ts
          const sharedErrors = errorDefinitions.filter(d => 
            d.filePath.includes('/shared/types/core/errors.ts') ||
            d.filePath.includes('/shared/types/api/error-types.ts')
          );

          // At least one definition should be in the canonical location
          expect(sharedErrors.length).toBeGreaterThan(0);

          // Property: Error types outside shared should be re-exports
          const nonSharedErrors = errorDefinitions.filter(d => 
            !d.filePath.includes('/shared/types/core/errors.ts') &&
            !d.filePath.includes('/shared/types/api/error-types.ts')
          );

          for (const errorDef of nonSharedErrors) {
            const sourceFile = project.getSourceFile(errorDef.filePath);
            if (!sourceFile) continue;

            // Check if it's a re-export
            const isReExport = checkIfReExport(sourceFile, errorTypeName);

            // Non-canonical error types should be re-exports
            expect(isReExport).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent duplicate type definitions across layers', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary type names
        fc.constantFrom(
          'User',
          'Bill',
          'Committee',
          'UserRole',
          'BillStatus'
        ),
        async (typeName) => {
          const project = new Project({
            tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
          });

          // Manually add source files from key directories
          project.addSourceFilesAtPaths([
            'shared/types/**/*.ts',
            'client/src/**/*.ts',
            'server/**/*.ts',
            '!**/*.test.ts',
            '!**/*.spec.ts',
            '!**/node_modules/**',
            '!**/dist/**',
          ]);

          // Find all definitions
          const definitions = findEntityDefinitions(project, typeName);

          if (definitions.length === 0) {
            return;
          }

          // Group definitions by layer
          const definitionsByLayer = {
            shared: definitions.filter(d => d.filePath.includes('/shared/')),
            client: definitions.filter(d => d.filePath.includes('/client/')),
            server: definitions.filter(d => d.filePath.includes('/server/')),
          };

          // Property: If shared layer has a definition, other layers should not duplicate it
          if (definitionsByLayer.shared.length > 0) {
            // Check client layer
            for (const clientDef of definitionsByLayer.client) {
              const sourceFile = project.getSourceFile(clientDef.filePath);
              if (!sourceFile) continue;

              const isReExportOrExtension = 
                checkIfReExport(sourceFile, typeName) || 
                checkIfExtension(sourceFile, typeName);

              // Client definitions should be re-exports or extensions
              expect(isReExportOrExtension).toBe(true);
            }

            // Check server layer
            for (const serverDef of definitionsByLayer.server) {
              const sourceFile = project.getSourceFile(serverDef.filePath);
              if (!sourceFile) continue;

              const isReExportOrExtension = 
                checkIfReExport(sourceFile, typeName) || 
                checkIfExtension(sourceFile, typeName);

              // Server definitions should be re-exports or extensions
              expect(isReExportOrExtension).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to find all definitions of an entity
 */
function findEntityDefinitions(
  project: Project,
  entityName: string
): Array<{ filePath: string; kind: string }> {
  const definitions: Array<{ filePath: string; kind: string }> = [];
  const sourceFiles = project.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    // Skip node_modules and dist directories
    if (filePath.includes('node_modules') || filePath.includes('/dist/')) {
      continue;
    }

    // Find interfaces
    const interfaces = sourceFile.getInterfaces();
    for (const iface of interfaces) {
      if (iface.getName() === entityName) {
        definitions.push({ filePath, kind: 'interface' });
      }
    }

    // Find type aliases
    const typeAliases = sourceFile.getTypeAliases();
    for (const typeAlias of typeAliases) {
      if (typeAlias.getName() === entityName) {
        definitions.push({ filePath, kind: 'type' });
      }
    }

    // Find enums
    const enums = sourceFile.getEnums();
    for (const enumDecl of enums) {
      if (enumDecl.getName() === entityName) {
        definitions.push({ filePath, kind: 'enum' });
      }
    }
  }

  return definitions;
}

/**
 * Helper function to find enum definitions
 */
function findEnumDefinitions(
  project: Project,
  enumName: string
): Array<{ filePath: string }> {
  const definitions: Array<{ filePath: string }> = [];
  const sourceFiles = project.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    // Skip node_modules and dist directories
    if (filePath.includes('node_modules') || filePath.includes('/dist/')) {
      continue;
    }

    const enums = sourceFile.getEnums();
    for (const enumDecl of enums) {
      if (enumDecl.getName() === enumName) {
        definitions.push({ filePath });
      }
    }
  }

  return definitions;
}

/**
 * Helper function to find validation schemas
 */
function findValidationSchemas(
  project: Project,
  schemaName: string
): Array<{ filePath: string }> {
  const definitions: Array<{ filePath: string }> = [];
  const sourceFiles = project.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    // Skip node_modules and dist directories
    if (filePath.includes('node_modules') || filePath.includes('/dist/')) {
      continue;
    }

    // Look for variable declarations with the schema name
    const variables = sourceFile.getVariableDeclarations();
    for (const variable of variables) {
      if (variable.getName() === schemaName) {
        // Check if it's a Zod schema
        const initializer = variable.getInitializer();
        if (initializer && initializer.getText().includes('z.')) {
          definitions.push({ filePath });
        }
      }
    }
  }

  return definitions;
}

/**
 * Check if a type is a re-export from shared layer
 */
function checkIfReExport(sourceFile: any, typeName: string): boolean {
  // Check for export statements that re-export from shared
  const exportDeclarations = sourceFile.getExportDeclarations();
  
  for (const exportDecl of exportDeclarations) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    if (moduleSpecifier.includes('shared/types') || moduleSpecifier.includes('shared/validation')) {
      const namedExports = exportDecl.getNamedExports();
      if (namedExports.some((ne: any) => ne.getName() === typeName)) {
        return true;
      }

      // Check for export * from
      if (namedExports.length === 0 && exportDecl.isNamespaceExport()) {
        return true;
      }
    }
  }

  // Check for import + export pattern
  const imports = sourceFile.getImportDeclarations();
  const exports = sourceFile.getExportedDeclarations();

  for (const imp of imports) {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    if (moduleSpecifier.includes('shared/types') || moduleSpecifier.includes('shared/validation')) {
      const namedImports = imp.getNamedImports();
      if (namedImports.some((ni: any) => ni.getName() === typeName)) {
        // Check if it's also exported
        if (exports.has(typeName)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if a type is an extension of a shared type
 */
function checkIfExtension(sourceFile: any, typeName: string): boolean {
  // Check interfaces that extend other interfaces
  const interfaces = sourceFile.getInterfaces();
  
  for (const iface of interfaces) {
    if (iface.getName() === typeName) {
      const extendsClauses = iface.getExtends();
      if (extendsClauses.length > 0) {
        // This is an extension
        return true;
      }
    }
  }

  // Check type aliases that use intersection or union with shared types
  const typeAliases = sourceFile.getTypeAliases();
  
  for (const typeAlias of typeAliases) {
    if (typeAlias.getName() === typeName) {
      const typeNode = typeAlias.getTypeNode();
      if (typeNode) {
        const text = typeNode.getText();
        // Check for intersection (&) or union (|) types
        if (text.includes('&') || text.includes('|')) {
          return true;
        }
      }
    }
  }

  return false;
}
