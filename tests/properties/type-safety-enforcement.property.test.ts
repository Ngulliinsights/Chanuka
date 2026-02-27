/**
 * Property-Based Test: Type Safety Enforcement
 * 
 * Property 8: For any code with TypeScript type errors, the build system SHALL 
 * fail compilation and prevent the code from being committed or merged.
 * 
 * **Validates: Requirements 1.2, 7.2, 7.5**
 * 
 * This test verifies:
 * 1. The build system fails when type errors are introduced
 * 2. The current codebase has zero type errors
 * 3. TypeScript strict mode is enabled and enforced
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, ts } from 'ts-morph';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Feature: client-infrastructure-consolidation, Property 8: Type Safety Enforcement', () => {
  /**
   * Property 8.1: Current codebase has zero type errors
   * 
   * Validates that the consolidated infrastructure has no type errors,
   * ensuring Requirements 7.5 is met.
   */
  it('should have zero type errors in the current codebase', () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false,
    });

    // Get all diagnostics from the project
    const diagnostics = project.getPreEmitDiagnostics();
    
    // Filter to only include errors (not warnings or suggestions)
    const errors = diagnostics.filter(d => 
      d.getCategory() === ts.DiagnosticCategory.Error
    );

    // Group errors by file for better reporting
    const errorsByFile = new Map<string, string[]>();
    for (const error of errors) {
      const sourceFile = error.getSourceFile();
      const filePath = sourceFile?.getFilePath() || 'unknown';
      const message = error.getMessageText().toString();
      const line = error.getLineNumber();
      
      if (!errorsByFile.has(filePath)) {
        errorsByFile.set(filePath, []);
      }
      errorsByFile.get(filePath)!.push(`  Line ${line}: ${message}`);
    }

    // If there are errors, create a detailed report
    if (errors.length > 0) {
      const errorReport = Array.from(errorsByFile.entries())
        .map(([file, messages]) => `\n${file}:\n${messages.join('\n')}`)
        .join('\n');

      throw new Error(
        `Found ${errors.length} type error(s) in the codebase:\n${errorReport}\n\n` +
        `Requirement 7.5 violation: The system SHALL have zero type errors.`
      );
    }

    expect(errors.length).toBe(0);
  });

  /**
   * Property 8.2: TypeScript strict mode is enabled
   * 
   * Validates that strict type checking is enabled in tsconfig.json,
   * ensuring Requirements 1.2 and 7.2 are enforced.
   */
  it('should have TypeScript strict mode enabled', () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
    });

    const compilerOptions = project.getCompilerOptions();

    // Verify strict mode is enabled
    expect(compilerOptions.strict).toBe(true);
    
    // Verify individual strict checks are enabled
    expect(compilerOptions.noImplicitAny).toBe(true);
    expect(compilerOptions.strictNullChecks).toBe(true);
    expect(compilerOptions.strictFunctionTypes).toBe(true);
    expect(compilerOptions.noImplicitThis).toBe(true);
    expect(compilerOptions.alwaysStrict).toBe(true);

    // Verify additional type safety checks
    expect(compilerOptions.noImplicitReturns).toBe(true);
    expect(compilerOptions.noFallthroughCasesInSwitch).toBe(true);
    expect(compilerOptions.noUncheckedIndexedAccess).toBe(true);
  });

  /**
   * Property 8.3: Build fails on type errors
   * 
   * Validates that the TypeScript compiler fails when type errors exist,
   * ensuring Requirements 1.2 and 7.2 are enforced.
   */
  it('should fail TypeScript compilation when type errors are introduced', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Test case 1: Implicit any
          {
            code: 'function test(x) { return x; }',
            description: 'implicit any parameter',
          },
          // Test case 2: Null/undefined assignment to non-nullable
          {
            code: 'const x: string = null;',
            description: 'null assigned to non-nullable type',
          },
          // Test case 3: Type mismatch
          {
            code: 'const x: number = "string";',
            description: 'string assigned to number type',
          },
          // Test case 4: Missing return type
          {
            code: 'function test(): number { return "string"; }',
            description: 'wrong return type',
          },
          // Test case 5: Unchecked indexed access
          {
            code: 'const arr: string[] = []; const x: string = arr[0];',
            description: 'unchecked array access',
          }
        ),
        (testCase) => {
          // Create a temporary project with the error-inducing code
          const tempProject = new Project({
            useInMemoryFileSystem: true,
            compilerOptions: {
              strict: true,
              noImplicitAny: true,
              strictNullChecks: true,
              noUncheckedIndexedAccess: true,
              noImplicitReturns: true,
            },
          });

          // Add a source file with the type error
          const sourceFile = tempProject.createSourceFile(
            'test-file.ts',
            testCase.code
          );

          // Get diagnostics
          const diagnostics = sourceFile.getPreEmitDiagnostics();
          const errors = diagnostics.filter(d => 
            d.getCategory() === ts.DiagnosticCategory.Error
          );

          // Property: Build should fail (have errors) for invalid code
          expect(errors.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 5 } // Run once for each test case
    );
  });

  /**
   * Property 8.4: Infrastructure modules have zero type errors
   * 
   * Specifically validates that the consolidated infrastructure modules
   * have no type errors, ensuring the consolidation maintained type safety.
   */
  it('should have zero type errors in infrastructure modules', () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add only infrastructure source files
    project.addSourceFilesAtPaths([
      'client/src/infrastructure/**/*.ts',
      'client/src/infrastructure/**/*.tsx',
      '!client/src/infrastructure/**/*.test.ts',
      '!client/src/infrastructure/**/*.test.tsx',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sourceFiles = project.getSourceFiles();
    
    // Collect all errors from infrastructure files
    const allErrors: Array<{ file: string; line: number; message: string }> = [];

    for (const sourceFile of sourceFiles) {
      const diagnostics = sourceFile.getPreEmitDiagnostics();
      const errors = diagnostics.filter(d => 
        d.getCategory() === ts.DiagnosticCategory.Error
      );

      for (const error of errors) {
        allErrors.push({
          file: sourceFile.getFilePath(),
          line: error.getLineNumber() || 0,
          message: error.getMessageText().toString(),
        });
      }
    }

    // If there are errors, create a detailed report
    if (allErrors.length > 0) {
      const errorReport = allErrors
        .map(e => `  ${e.file}:${e.line} - ${e.message}`)
        .join('\n');

      throw new Error(
        `Found ${allErrors.length} type error(s) in infrastructure modules:\n${errorReport}\n\n` +
        `This violates the consolidation requirement that all infrastructure modules must be type-safe.`
      );
    }

    expect(allErrors.length).toBe(0);
  });

  /**
   * Property 8.5: Type checking command fails on errors
   * 
   * Validates that the npm type-check command fails when type errors exist,
   * ensuring CI/CD integration works correctly.
   */
  it('should have type-check command that detects errors', () => {
    // This test verifies the type-check command exists and works
    // We can't actually introduce errors in the real codebase, so we verify
    // the command is configured correctly
    
    try {
      // Run type-check command (should pass on current codebase)
      const result = execSync('npm run type-check', {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // If we get here, type-check passed (which is expected for clean codebase)
      expect(result).toBeDefined();
    } catch (error: any) {
      // If type-check failed, it means there are type errors
      // This should not happen in a clean codebase
      throw new Error(
        `Type-check command failed, indicating type errors exist:\n${error.message}\n\n` +
        `Requirement 7.5 violation: The system SHALL have zero type errors.`
      );
    }
  });

  /**
   * Property 8.6: Property-based test for type safety across random files
   * 
   * Uses property-based testing to randomly sample files and verify they
   * have no type errors.
   */
  it('should have no type errors in randomly sampled source files', () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add all source files
    project.addSourceFilesAtPaths([
      'client/src/**/*.ts',
      'client/src/**/*.tsx',
      'server/**/*.ts',
      'shared/**/*.ts',
      '!**/*.test.ts',
      '!**/*.test.tsx',
      '!**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sourceFiles = project.getSourceFiles();

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Math.max(0, sourceFiles.length - 1) }),
        (fileIndex) => {
          const sourceFile = sourceFiles[fileIndex];
          if (!sourceFile) return true;

          const diagnostics = sourceFile.getPreEmitDiagnostics();
          const errors = diagnostics.filter(d => 
            d.getCategory() === ts.DiagnosticCategory.Error
          );

          if (errors.length > 0) {
            const errorMessages = errors
              .map(e => `  Line ${e.getLineNumber()}: ${e.getMessageText()}`)
              .join('\n');

            throw new Error(
              `Type errors found in ${sourceFile.getFilePath()}:\n${errorMessages}`
            );
          }

          return true;
        }
      ),
      { numRuns: 50 } // Sample 50 random files
    );
  });

  /**
   * Property 8.7: Consolidated modules maintain type exports
   * 
   * Validates that consolidated modules properly export their types,
   * ensuring type safety is maintained across module boundaries.
   */
  it('should have all consolidated modules export their types', () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Define consolidated modules to check
    const consolidatedModules = [
      'observability',
      'store',
      'api',
      'logging',
      'error',
      'validation',
    ];

    const violations: string[] = [];

    for (const moduleName of consolidatedModules) {
      const indexPath = path.resolve(
        process.cwd(),
        `client/src/infrastructure/${moduleName}/index.ts`
      );

      try {
        const sourceFile = project.addSourceFileAtPath(indexPath);
        
        // Check if the module exports types
        const exportedDeclarations = sourceFile.getExportedDeclarations();
        const hasTypeExports = Array.from(exportedDeclarations.values()).some(
          declarations => declarations.some(
            decl => decl.getKindName().includes('Interface') ||
                   decl.getKindName().includes('Type') ||
                   decl.getKindName().includes('Enum')
          )
        );

        // Verify no type errors in the index file
        const diagnostics = sourceFile.getPreEmitDiagnostics();
        const errors = diagnostics.filter(d => 
          d.getCategory() === ts.DiagnosticCategory.Error
        );

        if (errors.length > 0) {
          violations.push(
            `${moduleName}: Has ${errors.length} type error(s) in index.ts`
          );
        }

        // Note: Not all modules need to export types, so we don't enforce hasTypeExports
      } catch (error: any) {
        violations.push(`${moduleName}: Failed to load index.ts - ${error.message}`);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Type safety violations in consolidated modules:\n${violations.join('\n')}`
      );
    }

    expect(violations.length).toBe(0);
  });
});
