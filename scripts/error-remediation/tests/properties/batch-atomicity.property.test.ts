/**
 * Property-Based Test: Batch Atomicity
 * 
 * Property 10: For any batch of related fixes, if validation fails after applying the batch, 
 * the Error_Remediation_System should roll back all changes in that batch, returning the 
 * codebase to its pre-batch state.
 * 
 * Feature: client-error-remediation, Property 10: Batch Atomicity
 * Validates: Requirements 19.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  Fix,
  FixBatch,
  ErrorCategory,
  FixPhase,
  FixResult,
  ValidationResult,
  Severity
} from '../../types';
import { BatchProcessor } from '../../core/batch-processor';
import { RemediationConfig } from '../../config';

describe('Property 10: Batch Atomicity', () => {
  let tempDir: string;
  let testConfig: RemediationConfig;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-atomicity-test-'));
    
    // Create a minimal tsconfig.json
    const tsconfigPath = path.join(tempDir, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }));

    // Create test configuration
    testConfig = {
      clientRoot: tempDir,
      tsconfigPath,
      batchProcessing: {
        maxBatchSize: 10,
        validateAfterEachBatch: true,
        rollbackOnFailure: true
      },
      validation: {
        failOnNewErrors: true,
        maxErrorsAllowed: 0
      },
      progressTracking: {
        reportDirectory: path.join(tempDir, 'reports')
      }
    } as RemediationConfig;

    // Create reports directory
    if (!fs.existsSync(testConfig.progressTracking.reportDirectory)) {
      fs.mkdirSync(testConfig.progressTracking.reportDirectory, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should rollback all changes when validation fails after applying a batch', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary number of files to modify
        fc.integer({ min: 1, max: 5 }),
        // Generate arbitrary number of fixes per file
        fc.integer({ min: 1, max: 3 }),
        // Generate whether validation should fail
        fc.boolean(),
        async (numFiles, fixesPerFile, shouldValidationFail) => {
          // Create test files
          const testFiles: string[] = [];
          const originalContents = new Map<string, string>();

          for (let i = 0; i < numFiles; i++) {
            const filePath = path.join(tempDir, `test-file-${i}.ts`);
            const originalContent = `export const value${i} = ${i};\n`;
            
            fs.writeFileSync(filePath, originalContent);
            testFiles.push(filePath);
            originalContents.set(filePath, originalContent);
          }

          // Create fixes that modify these files
          const fixes: Fix[] = [];
          let fixId = 0;

          for (const file of testFiles) {
            for (let j = 0; j < fixesPerFile; j++) {
              const currentFixId = fixId++;
              fixes.push(createTestFix(
                `fix-${currentFixId}`,
                file,
                ErrorCategory.TYPE_SAFETY,
                `// Fix ${currentFixId} applied\n`
              ));
            }
          }

          // Create a batch
          const batch: FixBatch = {
            id: 'test-batch',
            phase: FixPhase.TYPE_SAFETY,
            fixes,
            dependencies: []
          };

          // Create a batch processor with controlled validation
          const processor = new TestBatchProcessor(
            testConfig,
            shouldValidationFail
          );

          // Apply the batch
          const result = await processor.applyWithRollback(batch);

          // Property: If validation fails, all changes should be rolled back
          if (shouldValidationFail) {
            // Batch should report failure
            expect(result.success).toBe(false);

            // All files should be restored to original content
            for (const [file, originalContent] of originalContents) {
              const currentContent = fs.readFileSync(file, 'utf-8');
              expect(currentContent).toBe(originalContent);
            }

            // No fixes should be reported as applied
            expect(result.fixesApplied).toBe(0);
          } else {
            // Batch should succeed
            expect(result.success).toBe(true);

            // Files should contain modifications
            for (const file of testFiles) {
              const currentContent = fs.readFileSync(file, 'utf-8');
              const originalContent = originalContents.get(file)!;
              
              // Content should be different from original
              expect(currentContent).not.toBe(originalContent);
              
              // Should contain fix markers
              expect(currentContent).toContain('// Fix');
            }

            // Fixes should be reported as applied
            expect(result.fixesApplied).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should preserve file state atomically - either all changes apply or none do', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary batch of fixes
        fc.array(
          fc.record({
            fileName: fc.string({ minLength: 5, maxLength: 15 })
              .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
              .map(s => `${s}.ts`),
            modification: fc.string({ minLength: 10, maxLength: 50 })
          }),
          { minLength: 2, maxLength: 8 }
        ).map(items => {
          // Ensure unique file names
          const seen = new Set<string>();
          return items.filter(item => {
            if (seen.has(item.fileName)) return false;
            seen.add(item.fileName);
            return true;
          });
        }).filter(items => items.length >= 2),
        // Validation outcome
        fc.boolean(),
        async (fileModifications, validationSucceeds) => {
          // Create test files with initial content
          const fileStates = new Map<string, string>();

          for (const { fileName } of fileModifications) {
            const filePath = path.join(tempDir, fileName);
            const initialContent = `// Initial content for ${fileName}\nexport const initial = true;\n`;
            
            fs.writeFileSync(filePath, initialContent);
            fileStates.set(filePath, initialContent);
          }

          // Create fixes for each file
          const fixes: Fix[] = fileModifications.map((mod, idx) => {
            const filePath = path.join(tempDir, mod.fileName);
            return createTestFix(
              `fix-${idx}`,
              filePath,
              ErrorCategory.INTERFACE_COMPLETION,
              `// Modified: ${mod.modification}\n`
            );
          });

          // Create batch
          const batch: FixBatch = {
            id: 'atomicity-test-batch',
            phase: FixPhase.INTERFACE_COMPLETION,
            fixes,
            dependencies: []
          };

          // Capture file states before batch application
          const statesBeforeBatch = new Map<string, string>();
          for (const [file] of fileStates) {
            statesBeforeBatch.set(file, fs.readFileSync(file, 'utf-8'));
          }

          // Apply batch with controlled validation
          const processor = new TestBatchProcessor(
            testConfig,
            !validationSucceeds // Fail validation if validationSucceeds is false
          );

          const result = await processor.applyWithRollback(batch);

          // Capture file states after batch application
          const statesAfterBatch = new Map<string, string>();
          for (const [file] of fileStates) {
            statesAfterBatch.set(file, fs.readFileSync(file, 'utf-8'));
          }

          // Property: Atomicity - either all files are modified or none are
          if (validationSucceeds) {
            // All files should be modified
            let allModified = true;
            for (const [file, beforeContent] of statesBeforeBatch) {
              const afterContent = statesAfterBatch.get(file)!;
              if (beforeContent === afterContent) {
                allModified = false;
                break;
              }
            }
            expect(allModified).toBe(true);
          } else {
            // No files should be modified (all rolled back)
            let noneModified = true;
            for (const [file, beforeContent] of statesBeforeBatch) {
              const afterContent = statesAfterBatch.get(file)!;
              if (beforeContent !== afterContent) {
                noneModified = false;
                break;
              }
            }
            expect(noneModified).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle partial fix application failures with complete rollback', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate fixes where some may fail
        fc.array(
          fc.record({
            fileName: fc.string({ minLength: 5, maxLength: 15 })
              .filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s))
              .map(s => `${s}.ts`),
            shouldFixFail: fc.boolean(),
            content: fc.string({ minLength: 20, maxLength: 100 })
          }),
          { minLength: 3, maxLength: 6 }
        ).map(items => {
          // Ensure unique file names
          const seen = new Set<string>();
          return items.filter(item => {
            if (seen.has(item.fileName)) return false;
            seen.add(item.fileName);
            return true;
          });
        }).filter(items => items.length >= 3),
        async (fixSpecs) => {
          // Skip if all fixes succeed (we want to test failure scenarios)
          const hasFailingFix = fixSpecs.some(spec => spec.shouldFixFail);
          if (!hasFailingFix) return;

          // Create test files
          const originalStates = new Map<string, string>();

          for (const spec of fixSpecs) {
            const filePath = path.join(tempDir, spec.fileName);
            const originalContent = `// Original: ${spec.fileName}\nexport const original = true;\n`;
            
            fs.writeFileSync(filePath, originalContent);
            originalStates.set(filePath, originalContent);
          }

          // Create fixes (some will fail)
          const fixes: Fix[] = fixSpecs.map((spec, idx) => {
            const filePath = path.join(tempDir, spec.fileName);
            
            if (spec.shouldFixFail) {
              // Create a fix that will fail
              return createFailingFix(
                `failing-fix-${idx}`,
                filePath,
                ErrorCategory.TYPE_COMPARISON
              );
            } else {
              // Create a normal fix
              return createTestFix(
                `fix-${idx}`,
                filePath,
                ErrorCategory.TYPE_COMPARISON,
                `// Modified: ${spec.content}\n`
              );
            }
          });

          // Create batch
          const batch: FixBatch = {
            id: 'partial-failure-batch',
            phase: FixPhase.TYPE_SAFETY,
            fixes,
            dependencies: []
          };

          // Apply batch (validation will fail due to fix failures)
          const processor = new TestBatchProcessor(
            testConfig,
            true // Force validation failure
          );

          const result = await processor.applyWithRollback(batch);

          // Property: Even with partial fix failures, rollback should restore all files
          expect(result.success).toBe(false);

          for (const [file, originalContent] of originalStates) {
            const currentContent = fs.readFileSync(file, 'utf-8');
            
            // File should be restored to original state
            expect(currentContent).toBe(originalContent);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain file integrity across multiple batch applications with rollbacks', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate sequence of batches with varying success
        fc.array(
          fc.record({
            numFixes: fc.integer({ min: 1, max: 4 }),
            shouldSucceed: fc.boolean()
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (batchSpecs) => {
          // Create a single test file
          const testFile = path.join(tempDir, 'sequential-test.ts');
          const initialContent = '// Initial state\nexport const version = 0;\n';
          fs.writeFileSync(testFile, initialContent);

          let expectedContent = initialContent;

          // Apply batches sequentially
          for (let batchIdx = 0; batchIdx < batchSpecs.length; batchIdx++) {
            const spec = batchSpecs[batchIdx];
            
            // Create fixes for this batch
            const fixes: Fix[] = [];
            for (let fixIdx = 0; fixIdx < spec.numFixes; fixIdx++) {
              const modification = `// Batch ${batchIdx} Fix ${fixIdx}\n`;
              fixes.push(createTestFix(
                `batch-${batchIdx}-fix-${fixIdx}`,
                testFile,
                ErrorCategory.EXPLICIT_TYPES,
                modification
              ));
            }

            // Create batch
            const batch: FixBatch = {
              id: `sequential-batch-${batchIdx}`,
              phase: FixPhase.TYPE_SAFETY,
              fixes,
              dependencies: []
            };

            // Apply batch
            const processor = new TestBatchProcessor(
              testConfig,
              !spec.shouldSucceed // Fail validation if shouldSucceed is false
            );

            const result = await processor.applyWithRollback(batch);

            // Update expected content based on success
            if (spec.shouldSucceed && result.success) {
              // Content should be modified
              for (let fixIdx = 0; fixIdx < spec.numFixes; fixIdx++) {
                expectedContent += `// Batch ${batchIdx} Fix ${fixIdx}\n`;
              }
            }
            // If failed, content should remain unchanged (rolled back)

            // Verify current file state matches expected
            const currentContent = fs.readFileSync(testFile, 'utf-8');
            expect(currentContent).toBe(expectedContent);
          }

          // Property: File should only contain modifications from successful batches
          const finalContent = fs.readFileSync(testFile, 'utf-8');
          
          // Count successful batch markers in final content
          const successfulBatchMarkers = finalContent.match(/\/\/ Batch \d+ Fix \d+/g) || [];
          const expectedMarkers = batchSpecs
            .filter(spec => spec.shouldSucceed)
            .reduce((sum, spec) => sum + spec.numFixes, 0);
          
          expect(successfulBatchMarkers.length).toBe(expectedMarkers);
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test fix that modifies a file
 */
function createTestFix(
  id: string,
  file: string,
  category: ErrorCategory,
  modification: string
): Fix & { file: string } {
  return {
    id,
    category,
    description: `Test fix ${id}`,
    file, // Expose file property for getAffectedFiles
    apply: async (): Promise<FixResult> => {
      try {
        // Read current content
        const currentContent = fs.readFileSync(file, 'utf-8');
        
        // Append modification
        const newContent = currentContent + modification;
        
        // Write modified content
        fs.writeFileSync(file, newContent);

        return {
          success: true,
          filesModified: [file],
          errorsFixed: [`Applied fix ${id}`],
          newErrors: []
        };
      } catch (error) {
        return {
          success: false,
          filesModified: [],
          errorsFixed: [],
          newErrors: [`Failed to apply fix ${id}: ${error}`]
        };
      }
    }
  };
}

/**
 * Create a fix that will fail
 */
function createFailingFix(
  id: string,
  file: string,
  category: ErrorCategory
): Fix & { file: string } {
  return {
    id,
    category,
    description: `Failing test fix ${id}`,
    file, // Expose file property for getAffectedFiles
    apply: async (): Promise<FixResult> => {
      return {
        success: false,
        filesModified: [],
        errorsFixed: [],
        newErrors: [`Fix ${id} intentionally failed`]
      };
    }
  };
}

/**
 * Test implementation of BatchProcessor with controlled validation
 */
class TestBatchProcessor extends BatchProcessor {
  private shouldValidationFail: boolean;

  constructor(config: RemediationConfig, shouldValidationFail: boolean) {
    super(config);
    this.shouldValidationFail = shouldValidationFail;
    
    // Replace validator immediately after construction
    (this as any).validator = {
      validateTypeScript: async (files: string[]): Promise<ValidationResult> => {
        if (this.shouldValidationFail) {
          return {
            success: false,
            errorCount: 1,
            errors: [{
              code: 'TS9999',
              message: 'Test validation failure',
              file: files[0] || 'unknown',
              line: 1,
              column: 1,
              severity: Severity.CRITICAL,
              category: ErrorCategory.TYPE_SAFETY
            }],
            warnings: []
          };
        }

        return {
          success: true,
          errorCount: 0,
          errors: [],
          warnings: []
        };
      }
    };
  }
}
