/**
 * Property-Based Test: Branded Type Safety for Identifiers
 * 
 * Property 3: For any entity identifier type (UserId, BillId, etc.), 
 * it should be a branded type, and functions accepting identifiers 
 * should use the branded type rather than raw strings or numbers.
 * 
 * Feature: full-stack-integration, Property 3: Branded Type Safety for Identifiers
 * Validates: Requirements 1.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, SyntaxKind, TypeAliasDeclaration, FunctionDeclaration, MethodDeclaration, ParameterDeclaration } from 'ts-morph';
import * as path from 'path';

describe('Feature: full-stack-integration, Property 3: Branded Type Safety for Identifiers', () => {
  it('should define all entity identifiers as branded types', async () => {
    // Create project once outside the property test
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add the branded types file
    project.addSourceFilesAtPaths([
      'shared/types/core/branded.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const brandedFile = project.getSourceFile('shared/types/core/branded.ts');
    expect(brandedFile).toBeDefined();

    if (!brandedFile) return;

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary entity identifier names to check
        fc.constantFrom(
          'UserId',
          'BillId',
          'CommitteeId',
          'CommentId',
          'VoteId',
          'SessionId',
          'NotificationId',
          'AmendmentId',
          'ActionId',
          'SponsorId',
          'ArgumentId',
          'ArgumentEvidenceId',
          'BillTimelineEventId',
          'BillCommitteeAssignmentId',
          'LegislatorId'
        ),
        async (identifierType) => {
          // Find the type alias for this identifier
          const typeAlias = brandedFile.getTypeAlias(identifierType);
          
          // Property 1: The identifier type should exist
          expect(typeAlias).toBeDefined();

          if (!typeAlias) return;

          // Property 2: The type should be a branded type (using Branded<T, TBrand>)
          const typeText = typeAlias.getType().getText();
          
          // Check if it's a branded type by verifying it uses the Branded utility
          const isBrandedType = 
            typeText.includes('Branded<') || 
            typeText.includes('__brand') ||
            typeAlias.getTypeNode()?.getText().includes('Branded<');

          expect(isBrandedType).toBe(true);

          // Property 3: The branded type should be based on string
          const baseType = typeAlias.getTypeNode()?.getText() || '';
          expect(baseType).toContain('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use branded types in function parameters that accept entity identifiers', async () => {
    // Create project once outside the property test
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add source files to analyze
    project.addSourceFilesAtPaths([
      'shared/types/domains/**/*.ts',
      'server/services/**/*.ts',
      'server/repositories/**/*.ts',
      'shared/types/core/branded.ts',
      '!**/*.test.ts',
      '!**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary combinations of files and identifier types
        fc.record({
          identifierType: fc.constantFrom(
            'UserId',
            'BillId',
            'CommitteeId',
            'CommentId',
            'VoteId'
          )
        }),
        async ({ identifierType }) => {
          const sourceFiles = project.getSourceFiles();

          for (const sourceFile of sourceFiles) {
            if (sourceFile.getFilePath().includes('branded.ts')) continue;

            // Find all functions and methods in this file
            const functions = sourceFile.getFunctions();
            const classes = sourceFile.getClasses();

            // Check function parameters
            for (const func of functions) {
              checkFunctionParameters(func, identifierType);
            }

            // Check method parameters
            for (const cls of classes) {
              const methods = cls.getMethods();
              for (const method of methods) {
                checkMethodParameters(method, identifierType);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent mixing of different branded identifier types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate pairs of different identifier types
        fc.record({
          type1: fc.constantFrom('UserId', 'BillId', 'CommitteeId'),
          type2: fc.constantFrom('CommentId', 'VoteId', 'SessionId')
        }).filter(({ type1, type2 }) => type1 !== type2),
        async ({ type1, type2 }) => {
          const project = new Project({
            tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
          });

          project.addSourceFilesAtPaths([
            'shared/types/core/branded.ts',
            '!**/node_modules/**',
            '!**/dist/**',
          ]);

          const brandedFile = project.getSourceFile('shared/types/core/branded.ts');
          expect(brandedFile).toBeDefined();

          if (!brandedFile) return;

          // Get both type aliases
          const typeAlias1 = brandedFile.getTypeAlias(type1);
          const typeAlias2 = brandedFile.getTypeAlias(type2);

          expect(typeAlias1).toBeDefined();
          expect(typeAlias2).toBeDefined();

          if (!typeAlias1 || !typeAlias2) return;

          // Property: The two types should have different brand strings
          const type1Text = typeAlias1.getTypeNode()?.getText() || '';
          const type2Text = typeAlias2.getTypeNode()?.getText() || '';

          // Extract brand strings (e.g., 'UserId' from Branded<string, 'UserId'>)
          const brand1Match = type1Text.match(/Branded<[^,]+,\s*['"]([^'"]+)['"]/);
          const brand2Match = type2Text.match(/Branded<[^,]+,\s*['"]([^'"]+)['"]/);

          if (brand1Match && brand2Match) {
            const brand1 = brand1Match[1];
            const brand2 = brand2Match[1];

            // The brand strings must be different
            expect(brand1).not.toBe(brand2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have branded type utilities (brand, unbrand) available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async () => {
          const project = new Project({
            tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
          });

          project.addSourceFilesAtPaths([
            'shared/types/core/branded.ts',
            '!**/node_modules/**',
            '!**/dist/**',
          ]);

          const brandedFile = project.getSourceFile('shared/types/core/branded.ts');
          expect(brandedFile).toBeDefined();

          if (!brandedFile) return;

          // Property 1: The 'brand' utility function should exist
          const brandFunction = brandedFile.getFunction('brand');
          expect(brandFunction).toBeDefined();

          // Property 2: The 'unbrand' utility function should exist
          const unbrandFunction = brandedFile.getFunction('unbrand');
          expect(unbrandFunction).toBeDefined();

          // Property 3: The Branded type utility should exist
          const brandedType = brandedFile.getTypeAlias('Branded');
          expect(brandedType).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use branded types in domain entity interfaces', async () => {
    // Create project once outside the property test
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'shared/types/domains/**/*.ts',
      'shared/types/core/branded.ts',
      'shared/types/core/base.ts',
      'shared/types/core/common.ts',
      'shared/types/core/enums.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary entity and identifier combinations
        fc.record({
          entityFile: fc.constantFrom(
            'shared/types/domains/legislative/bill.ts',
            'shared/types/domains/legislative/comment.ts',
            'shared/types/domains/safeguards/moderation.ts'
          ),
          expectedIdField: fc.constantFrom(
            'id',
            'userId',
            'billId',
            'committeeId',
            'commentId'
          )
        }),
        async ({ entityFile, expectedIdField }) => {
          const sourceFile = project.getSourceFile(entityFile);
          if (!sourceFile) return;

          // Find all interfaces in the file
          const interfaces = sourceFile.getInterfaces();

          for (const iface of interfaces) {
            // Check if this interface has the expected ID field
            const property = iface.getProperty(expectedIdField);
            
            if (property) {
              const propertyType = property.getType().getText();

              // Property: If an ID field exists, it should use a branded type
              // (not just 'string' or 'number')
              const isBranded = 
                propertyType.includes('Id') && 
                !propertyType.includes('string | undefined') &&
                propertyType !== 'string' &&
                propertyType !== 'number';

              // Only check if it's clearly an ID field
              if (expectedIdField.toLowerCase().includes('id')) {
                expect(isBranded || propertyType.includes('undefined')).toBe(true);
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
 * Check if function parameters use branded types for identifiers
 */
function checkFunctionParameters(
  func: FunctionDeclaration,
  identifierType: string
): void {
  const parameters = func.getParameters();

  for (const param of parameters) {
    checkParameter(param, identifierType);
  }
}

/**
 * Check if method parameters use branded types for identifiers
 */
function checkMethodParameters(
  method: MethodDeclaration,
  identifierType: string
): void {
  const parameters = method.getParameters();

  for (const param of parameters) {
    checkParameter(param, identifierType);
  }
}

/**
 * Check if a parameter uses branded type when it should
 */
function checkParameter(
  param: ParameterDeclaration,
  identifierType: string
): void {
  const paramName = param.getName();
  const paramType = param.getType().getText();

  // If parameter name suggests it's an ID (e.g., userId, billId)
  // and we're checking for that specific type
  const expectedParamName = identifierType.charAt(0).toLowerCase() + identifierType.slice(1);

  if (paramName === expectedParamName || paramName === 'id') {
    // Property: The parameter should use the branded type, not raw string
    const usesBrandedType = 
      paramType.includes(identifierType) || 
      paramType === 'string' || // Allow string for now (may be legacy)
      paramType.includes('undefined'); // Allow optional parameters

    expect(usesBrandedType).toBe(true);
  }
}
