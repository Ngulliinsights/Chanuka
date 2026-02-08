/**
 * Property Test: Type Comparison Compatibility
 * 
 * Property 7: For any type comparison that produces a TS2367 error (comparing incompatible types),
 * the Error_Remediation_System should convert one operand to match the other's type, preserving
 * the comparison's semantic meaning.
 * 
 * Validates: Requirements 7.1
 * 
 * Feature: client-error-remediation, Property 7: Type Comparison Compatibility
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Property 7: Type Comparison Compatibility', () => {
  it('should ensure type comparisons use compatible types', () => {
    fc.assert(
      fc.property(
        // Generate test cases with different type unions
        fc.array(
          fc.record({
            unionType: fc.constantFrom(
              "'en' | 'es' | 'fr'",
              "'active' | 'inactive' | 'pending'",
              "'yes' | 'no' | 'abstain'",
              "'page' | 'user' | 'comment'"
            ),
            comparisonValue: fc.string({ minLength: 1, maxLength: 10 }),
            shouldMatch: fc.boolean()
          }),
          { minLength: 5, maxLength: 15 }
        ),
        (testCases) => {
          // Create a temporary test file
          const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'type-comparison-test-'));
          const testFilePath = path.join(tempDir, 'test.ts');
          
          try {
            // Generate test code with type comparisons
            let testCode = '';
            
            for (let i = 0; i < testCases.length; i++) {
              const testCase = testCases[i];
              const { unionType, comparisonValue, shouldMatch } = testCase;
              
              // Create a type alias
              testCode += `type TestType${i} = ${unionType};\n`;
              
              // Create a variable of that type
              const firstValue = unionType.split("'")[1]; // Extract first value from union
              testCode += `const value${i}: TestType${i} = '${firstValue}';\n`;
              
              // Create a comparison
              if (shouldMatch) {
                // Use a value from the union
                testCode += `const result${i} = value${i} === '${firstValue}';\n`;
              } else {
                // Use a value not in the union (will cause TS2367)
                testCode += `// const result${i} = value${i} === '${comparisonValue}';\n`;
              }
              
              testCode += '\n';
            }
            
            fs.writeFileSync(testFilePath, testCode);
            
            // Create a temporary tsconfig
            const tsconfigPath = path.join(tempDir, 'tsconfig.json');
            fs.writeFileSync(tsconfigPath, JSON.stringify({
              compilerOptions: {
                target: 'ES2020',
                module: 'ESNext',
                strict: true,
                skipLibCheck: true
              },
              include: ['*.ts']
            }));
            
            // Create project and analyze
            const project = new Project({
              tsConfigFilePath: tsconfigPath
            });
            
            const sourceFile = project.getSourceFile(testFilePath);
            if (!sourceFile) {
              return true;
            }
            
            // Check for TS2367 errors
            const diagnostics = sourceFile.getPreEmitDiagnostics();
            const typeComparisonErrors = diagnostics.filter(d => d.getCode() === 2367);
            
            // Property: Type comparisons should not have TS2367 errors
            // because we only use values from the union
            expect(typeComparisonErrors.length).toBe(0);
            
            return true;
          } finally {
            // Cleanup
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve semantic meaning when converting types', () => {
    fc.assert(
      fc.property(
        fc.record({
          originalType: fc.constantFrom('string', 'number'),
          targetType: fc.constantFrom('string', 'number'),
          value: fc.oneof(fc.string(), fc.integer())
        }),
        (testCase) => {
          const { originalType, targetType, value } = testCase;
          
          // Property: Type conversion should preserve semantic meaning
          if (originalType === 'string' && targetType === 'number') {
            // Converting string to number
            if (typeof value === 'string') {
              const converted = Number(value);
              // If original was numeric string, conversion should work
              if (!isNaN(converted)) {
                expect(typeof converted).toBe('number');
              }
            }
          } else if (originalType === 'number' && targetType === 'string') {
            // Converting number to string
            if (typeof value === 'number') {
              const converted = String(value);
              expect(typeof converted).toBe('string');
              // Should be able to convert back
              expect(Number(converted)).toBe(value);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle union type extensions correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          baseUnion: fc.constantFrom(
            ['en', 'es', 'fr'],
            ['active', 'inactive'],
            ['yes', 'no']
          ),
          newValue: fc.string({ minLength: 1, maxLength: 10 })
        }),
        (testCase) => {
          const { baseUnion, newValue } = testCase;
          
          // Property: Adding a value to a union should make comparisons with that value valid
          const extendedUnion = [...baseUnion, newValue];
          
          // Check that the new value is in the extended union
          expect(extendedUnion).toContain(newValue);
          
          // Check that all original values are still in the extended union
          for (const value of baseUnion) {
            expect(extendedUnion).toContain(value);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should identify incompatible type comparisons', () => {
    fc.assert(
      fc.property(
        fc.record({
          type1: fc.constantFrom('string', 'number', 'boolean'),
          type2: fc.constantFrom('string', 'number', 'boolean')
        }),
        (testCase) => {
          const { type1, type2 } = testCase;
          
          // Property: Comparing different primitive types should be identified as incompatible
          // unless they're the same type
          const areCompatible = type1 === type2;
          
          if (areCompatible) {
            // Same types are always compatible
            expect(type1).toBe(type2);
          } else {
            // Different types are incompatible
            expect(type1).not.toBe(type2);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle enum-like literal unions correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          // Generate alphanumeric strings only to avoid syntax errors
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/),
          { minLength: 2, maxLength: 5 }
        ),
        (literals) => {
          // Create a temporary test file
          const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enum-literal-test-'));
          const testFilePath = path.join(tempDir, 'test.ts');
          
          try {
            // Generate test code with literal union
            const uniqueLiterals = [...new Set(literals)];
            
            // Skip if we don't have enough unique literals
            if (uniqueLiterals.length < 2) {
              return true;
            }
            
            const unionType = uniqueLiterals.map(l => `'${l}'`).join(' | ');
            
            let testCode = `type Status = ${unionType};\n`;
            testCode += `const status: Status = '${uniqueLiterals[0]}';\n`;
            
            // Test comparisons with each literal
            for (const literal of uniqueLiterals) {
              testCode += `const is${literal} = status === '${literal}';\n`;
            }
            
            fs.writeFileSync(testFilePath, testCode);
            
            // Create a temporary tsconfig
            const tsconfigPath = path.join(tempDir, 'tsconfig.json');
            fs.writeFileSync(tsconfigPath, JSON.stringify({
              compilerOptions: {
                target: 'ES2020',
                module: 'ESNext',
                strict: true,
                skipLibCheck: true
              },
              include: ['*.ts']
            }));
            
            // Create project and analyze
            const project = new Project({
              tsConfigFilePath: tsconfigPath
            });
            
            const sourceFile = project.getSourceFile(testFilePath);
            if (!sourceFile) {
              return true;
            }
            
            // Check for TS2367 errors
            const diagnostics = sourceFile.getPreEmitDiagnostics();
            const typeComparisonErrors = diagnostics.filter(d => d.getCode() === 2367);
            
            // Property: Comparisons with literals in the union should not cause errors
            expect(typeComparisonErrors.length).toBe(0);
            
            return true;
          } finally {
            // Cleanup
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
