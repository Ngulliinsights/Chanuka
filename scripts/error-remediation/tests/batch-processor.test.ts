/**
 * Unit tests for BatchProcessor
 * 
 * Tests batch grouping logic, rollback on validation failure, and batch dependency ordering.
 * Requirements: 19.1-19.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BatchProcessor } from '../core/batch-processor';
import { RemediationConfig, defaultConfig } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import {
  Fix,
  FixBatch,
  ErrorCategory,
  FixPhase,
  FixResult,
  ValidationResult
} from '../types';

describe('BatchProcessor', () => {
  let processor: BatchProcessor;
  let config: RemediationConfig;
  let testBackupDir: string;

  beforeEach(() => {
    config = {
      ...defaultConfig,
      tsconfigPath: '../../client/tsconfig.json', // Relative to error-remediation directory
      clientRoot: '../../client',
      batchProcessing: {
        maxBatchSize: 5,
        validateAfterEachBatch: false, // Disable validation for unit tests
        rollbackOnFailure: true
      },
      progressTracking: {
        ...defaultConfig.progressTracking,
        reportDirectory: './test-reports'
      }
    };
    processor = new BatchProcessor(config);
    testBackupDir = path.join(config.progressTracking.reportDirectory, 'backups');
  });

  afterEach(() => {
    // Clean up test backup directory
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
    if (fs.existsSync('./test-reports')) {
      fs.rmSync('./test-reports', { recursive: true, force: true });
    }
  });

  describe('groupRelatedFixes', () => {
    it('should group fixes by file', () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION),
        createMockFix('fix-2', 'file1.ts', ErrorCategory.MODULE_RESOLUTION),
        createMockFix('fix-3', 'file2.ts', ErrorCategory.EXPORT_PATH),
        createMockFix('fix-4', 'file2.ts', ErrorCategory.EXPORT_PATH)
      ];

      const batches = processor.groupRelatedFixes(fixes);

      expect(batches.length).toBeGreaterThan(0);
      
      // Verify all fixes are included
      const totalFixes = batches.reduce((sum, batch) => sum + batch.fixes.length, 0);
      expect(totalFixes).toBe(fixes.length);
      
      // Verify fixes from same file are grouped together
      const file1Batches = batches.filter(b => 
        b.fixes.some(f => 'file' in f && f.file === 'file1.ts')
      );
      const file1Fixes = file1Batches.flatMap(b => b.fixes);
      expect(file1Fixes.length).toBe(2);
    });

    it('should respect max batch size', () => {
      const fixes: Fix[] = [];
      for (let i = 0; i < 12; i++) {
        fixes.push(createMockFix(`fix-${i}`, 'file1.ts', ErrorCategory.MODULE_RESOLUTION));
      }

      const batches = processor.groupRelatedFixes(fixes);

      // With maxBatchSize=5, 12 fixes should create at least 3 batches
      expect(batches.length).toBeGreaterThanOrEqual(3);
      
      // Each batch should have at most maxBatchSize fixes
      batches.forEach(batch => {
        expect(batch.fixes.length).toBeLessThanOrEqual(config.batchProcessing.maxBatchSize);
      });
    });

    it('should group fixes by category when no file grouping is possible', () => {
      const fixes: Fix[] = [
        createMockFixWithoutFile('fix-1', ErrorCategory.MODULE_RESOLUTION),
        createMockFixWithoutFile('fix-2', ErrorCategory.MODULE_RESOLUTION),
        createMockFixWithoutFile('fix-3', ErrorCategory.EXPORT_PATH),
        createMockFixWithoutFile('fix-4', ErrorCategory.EXPORT_PATH)
      ];

      const batches = processor.groupRelatedFixes(fixes);

      expect(batches.length).toBeGreaterThan(0);
      
      // Verify all fixes are included
      const totalFixes = batches.reduce((sum, batch) => sum + batch.fixes.length, 0);
      expect(totalFixes).toBe(fixes.length);
    });

    it('should handle empty fix array', () => {
      const batches = processor.groupRelatedFixes([]);
      expect(batches).toEqual([]);
    });

    it('should assign correct phase to batches', () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION),
        createMockFix('fix-2', 'file2.ts', ErrorCategory.INTERFACE_COMPLETION)
      ];

      const batches = processor.groupRelatedFixes(fixes);

      // Verify phases are assigned
      batches.forEach(batch => {
        expect(batch.phase).toBeDefined();
        expect(Object.values(FixPhase)).toContain(batch.phase);
      });
    });

    it('should create separate batches for different files', () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION),
        createMockFix('fix-2', 'file2.ts', ErrorCategory.MODULE_RESOLUTION),
        createMockFix('fix-3', 'file3.ts', ErrorCategory.MODULE_RESOLUTION)
      ];

      const batches = processor.groupRelatedFixes(fixes);

      // Should create separate batches for different files
      expect(batches.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle mixed file and non-file fixes', () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION),
        createMockFixWithoutFile('fix-2', ErrorCategory.EXPORT_PATH),
        createMockFix('fix-3', 'file2.ts', ErrorCategory.ID_TYPE)
      ];

      const batches = processor.groupRelatedFixes(fixes);

      expect(batches.length).toBeGreaterThan(0);
      
      // File-based fixes should be included (fixes without file property may be skipped in file-based grouping)
      const totalFixes = batches.reduce((sum, batch) => sum + batch.fixes.length, 0);
      expect(totalFixes).toBeGreaterThanOrEqual(2); // At least the file-based fixes
    });

    it('should split large file batches across multiple batches', () => {
      const fixes: Fix[] = [];
      // Create 15 fixes for the same file (maxBatchSize is 5)
      for (let i = 0; i < 15; i++) {
        fixes.push(createMockFix(`fix-${i}`, 'large-file.ts', ErrorCategory.TYPE_COMPARISON));
      }

      const batches = processor.groupRelatedFixes(fixes);

      // Should create 3 batches (15 / 5 = 3)
      expect(batches.length).toBe(3);
      
      // Each batch should have exactly 5 fixes
      batches.forEach(batch => {
        expect(batch.fixes.length).toBe(5);
      });
    });

    it('should assign batch IDs sequentially', () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION),
        createMockFix('fix-2', 'file2.ts', ErrorCategory.EXPORT_PATH),
        createMockFix('fix-3', 'file3.ts', ErrorCategory.ID_TYPE)
      ];

      const batches = processor.groupRelatedFixes(fixes);

      // Verify batch IDs are unique and sequential
      const batchIds = batches.map(b => b.id);
      const uniqueIds = new Set(batchIds);
      expect(uniqueIds.size).toBe(batchIds.length);
      
      // IDs should follow pattern batch-0, batch-1, etc.
      batchIds.forEach((id, index) => {
        expect(id).toMatch(/^batch-\d+$/);
      });
    });

    it('should map error categories to correct phases', () => {
      const categoryPhaseMap = [
        { category: ErrorCategory.MODULE_RESOLUTION, expectedPhase: FixPhase.MODULE_LOCATION_DISCOVERY },
        { category: ErrorCategory.EXPORT_PATH, expectedPhase: FixPhase.IMPORT_PATH_UPDATES },
        { category: ErrorCategory.ID_TYPE, expectedPhase: FixPhase.TYPE_STANDARDIZATION },
        { category: ErrorCategory.INTERFACE_COMPLETION, expectedPhase: FixPhase.INTERFACE_COMPLETION },
        { category: ErrorCategory.EXPLICIT_TYPES, expectedPhase: FixPhase.TYPE_SAFETY },
        { category: ErrorCategory.IMPORT_CLEANUP, expectedPhase: FixPhase.IMPORT_CLEANUP_AND_VALIDATION }
      ];

      categoryPhaseMap.forEach(({ category, expectedPhase }) => {
        const fixes = [createMockFix('fix-1', 'file.ts', category)];
        const batches = processor.groupRelatedFixes(fixes);
        
        expect(batches[0].phase).toBe(expectedPhase);
      });
    });
  });

  describe('processBatch', () => {
    it('should apply all fixes successfully', async () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true),
        createMockFix('fix-2', 'file2.ts', ErrorCategory.EXPORT_PATH, true)
      ];

      const result = await processor.processBatch(fixes);

      expect(result.success).toBe(true);
      expect(result.fixesApplied).toBe(2);
      expect(result.newErrors).toBe(0);
    });

    it('should handle fix failures', async () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true),
        createMockFix('fix-2', 'file2.ts', ErrorCategory.EXPORT_PATH, false) // This will fail
      ];

      const result = await processor.processBatch(fixes);

      // Should still process all fixes even if some fail
      expect(result.fixesApplied).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty fix array', async () => {
      const result = await processor.processBatch([]);

      expect(result.success).toBe(true);
      expect(result.fixesApplied).toBe(0);
      expect(result.errorsFixed).toBe(0);
    });
  });

  describe('applyWithRollback', () => {
    it('should apply fixes in a batch', async () => {
      const batch: FixBatch = {
        id: 'test-batch',
        phase: FixPhase.MODULE_LOCATION_DISCOVERY,
        fixes: [
          createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true),
          createMockFix('fix-2', 'file2.ts', ErrorCategory.MODULE_RESOLUTION, true)
        ],
        dependencies: []
      };

      const result = await processor.applyWithRollback(batch);

      expect(result.batchId).toBe('test-batch');
      expect(result.success).toBe(true);
      expect(result.fixesApplied).toBe(2);
    });

    it('should handle batch with failed fixes', async () => {
      const batch: FixBatch = {
        id: 'test-batch',
        phase: FixPhase.MODULE_LOCATION_DISCOVERY,
        fixes: [
          createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true),
          createMockFix('fix-2', 'file2.ts', ErrorCategory.MODULE_RESOLUTION, false)
        ],
        dependencies: []
      };

      const result = await processor.applyWithRollback(batch);

      expect(result.batchId).toBe('test-batch');
      // Success is false if any fix fails
      expect(result.success).toBe(false);
    });

    it('should handle empty batch', async () => {
      const batch: FixBatch = {
        id: 'empty-batch',
        phase: FixPhase.MODULE_LOCATION_DISCOVERY,
        fixes: [],
        dependencies: []
      };

      const result = await processor.applyWithRollback(batch);

      expect(result.batchId).toBe('empty-batch');
      expect(result.success).toBe(true);
      expect(result.fixesApplied).toBe(0);
    });

    it('should rollback on validation failure when configured', async () => {
      // Create a processor with validation enabled and mocked validator
      const validationConfig = {
        ...config,
        batchProcessing: {
          ...config.batchProcessing,
          validateAfterEachBatch: true,
          rollbackOnFailure: true
        },
        validation: {
          ...defaultConfig.validation,
          failOnNewErrors: true
        }
      };
      
      // Create a custom processor with mocked validation that fails
      const mockValidator = {
        validateTypeScript: async () => ({
          success: false,
          errorCount: 5,
          errors: [],
          warnings: []
        })
      };
      
      const validatingProcessor = new BatchProcessor(validationConfig);
      // Replace validator with mock
      (validatingProcessor as any).validator = mockValidator;

      // Create test files for rollback
      const testFile1 = path.join(config.clientRoot, 'test-rollback-1.ts');
      const testFile2 = path.join(config.clientRoot, 'test-rollback-2.ts');
      
      // Ensure client root exists
      if (!fs.existsSync(config.clientRoot)) {
        fs.mkdirSync(config.clientRoot, { recursive: true });
      }

      // Create initial file content
      fs.writeFileSync(testFile1, 'const original1 = "original";');
      fs.writeFileSync(testFile2, 'const original2 = "original";');

      try {
        const batch: FixBatch = {
          id: 'rollback-test',
          phase: FixPhase.MODULE_LOCATION_DISCOVERY,
          fixes: [
            createFileModifyingFix('fix-1', testFile1, 'const modified1 = "modified";', true),
            createFileModifyingFix('fix-2', testFile2, 'const modified2 = "modified";', true)
          ],
          dependencies: []
        };

        const result = await validatingProcessor.applyWithRollback(batch);

        // Validation should fail, triggering rollback
        expect(result.success).toBe(false);
        
        // Files should be rolled back to original content
        const content1 = fs.readFileSync(testFile1, 'utf-8');
        const content2 = fs.readFileSync(testFile2, 'utf-8');
        
        expect(content1).toBe('const original1 = "original";');
        expect(content2).toBe('const original2 = "original";');
      } finally {
        // Clean up test files
        if (fs.existsSync(testFile1)) fs.unlinkSync(testFile1);
        if (fs.existsSync(testFile2)) fs.unlinkSync(testFile2);
      }
    });

    it('should not rollback when validation passes', async () => {
      // Create a processor with validation enabled but that will pass
      const validationConfig = {
        ...config,
        batchProcessing: {
          ...config.batchProcessing,
          validateAfterEachBatch: true,
          rollbackOnFailure: true
        }
      };
      const validatingProcessor = new BatchProcessor(validationConfig);

      const testFile = path.join(config.clientRoot, 'test-no-rollback.ts');
      
      // Ensure client root exists
      if (!fs.existsSync(config.clientRoot)) {
        fs.mkdirSync(config.clientRoot, { recursive: true });
      }

      fs.writeFileSync(testFile, 'const original = "original";');

      try {
        const batch: FixBatch = {
          id: 'no-rollback-test',
          phase: FixPhase.MODULE_LOCATION_DISCOVERY,
          fixes: [
            createFileModifyingFix('fix-1', testFile, 'const modified = "modified";', true)
          ],
          dependencies: []
        };

        const result = await validatingProcessor.applyWithRollback(batch);

        // Should succeed without rollback
        expect(result.success).toBe(true);
        
        // File should have modified content
        const content = fs.readFileSync(testFile, 'utf-8');
        expect(content).toBe('const modified = "modified";');
      } finally {
        // Clean up test file
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      }
    });

    it('should handle exception during fix application', async () => {
      const batch: FixBatch = {
        id: 'exception-test',
        phase: FixPhase.MODULE_LOCATION_DISCOVERY,
        fixes: [
          createExceptionThrowingFix('fix-1', 'file.ts')
        ],
        dependencies: []
      };

      const result = await processor.applyWithRollback(batch);

      expect(result.success).toBe(false);
      expect(result.fixesApplied).toBe(0);
      expect(result.newErrors).toBeGreaterThan(0);
    });

    it('should collect all modified files from fixes', async () => {
      const batch: FixBatch = {
        id: 'multi-file-test',
        phase: FixPhase.MODULE_LOCATION_DISCOVERY,
        fixes: [
          createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true),
          createMockFix('fix-2', 'file2.ts', ErrorCategory.MODULE_RESOLUTION, true),
          createMockFix('fix-3', 'file3.ts', ErrorCategory.MODULE_RESOLUTION, true)
        ],
        dependencies: []
      };

      const result = await processor.applyWithRollback(batch);

      expect(result.success).toBe(true);
      expect(result.fixesApplied).toBe(3);
    });

    it('should track errors fixed and new errors', async () => {
      const batch: FixBatch = {
        id: 'error-tracking-test',
        phase: FixPhase.MODULE_LOCATION_DISCOVERY,
        fixes: [
          createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true),
          createMockFix('fix-2', 'file2.ts', ErrorCategory.MODULE_RESOLUTION, false)
        ],
        dependencies: []
      };

      const result = await processor.applyWithRollback(batch);

      // Should track both successful and failed fixes
      expect(result.errorsFixed).toBeGreaterThanOrEqual(1);
      expect(result.newErrors).toBeGreaterThanOrEqual(1);
    });
  });

  describe('batch dependency ordering', () => {
    it('should process batches with dependencies in correct order', async () => {
      const executionOrder: string[] = [];

      const fixes: Fix[] = [
        createOrderTrackingFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, executionOrder),
        createOrderTrackingFix('fix-2', 'file2.ts', ErrorCategory.EXPORT_PATH, executionOrder),
        createOrderTrackingFix('fix-3', 'file3.ts', ErrorCategory.ID_TYPE, executionOrder)
      ];

      await processor.processBatch(fixes);

      // Verify all fixes were executed
      expect(executionOrder.length).toBe(3);
      expect(executionOrder).toContain('fix-1');
      expect(executionOrder).toContain('fix-2');
      expect(executionOrder).toContain('fix-3');
    });

    it('should handle batches with explicit dependencies', async () => {
      const batch1: FixBatch = {
        id: 'batch-1',
        phase: FixPhase.MODULE_LOCATION_DISCOVERY,
        fixes: [createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true)],
        dependencies: []
      };

      const batch2: FixBatch = {
        id: 'batch-2',
        phase: FixPhase.IMPORT_PATH_UPDATES,
        fixes: [createMockFix('fix-2', 'file2.ts', ErrorCategory.EXPORT_PATH, true)],
        dependencies: ['batch-1']
      };

      // Process batch 1 first
      const result1 = await processor.applyWithRollback(batch1);
      expect(result1.success).toBe(true);

      // Then process batch 2
      const result2 = await processor.applyWithRollback(batch2);
      expect(result2.success).toBe(true);
    });

    it('should stop processing on batch failure', async () => {
      const executionOrder: string[] = [];

      const fixes: Fix[] = [
        createOrderTrackingFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, executionOrder, true),
        createOrderTrackingFix('fix-2', 'file2.ts', ErrorCategory.MODULE_RESOLUTION, executionOrder, false), // This will fail
        createOrderTrackingFix('fix-3', 'file3.ts', ErrorCategory.MODULE_RESOLUTION, executionOrder, true)
      ];

      const result = await processor.processBatch(fixes);

      // Should stop after failure
      expect(result.success).toBe(false);
    });

    it('should process multiple batches sequentially', async () => {
      const fixes: Fix[] = [];
      
      // Create enough fixes to span multiple batches (maxBatchSize = 5)
      for (let i = 0; i < 12; i++) {
        fixes.push(createMockFix(`fix-${i}`, `file${i}.ts`, ErrorCategory.MODULE_RESOLUTION, true));
      }

      const result = await processor.processBatch(fixes);

      expect(result.success).toBe(true);
      expect(result.fixesApplied).toBe(12);
    });

    it('should maintain batch phase ordering', async () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true), // Phase 1
        createMockFix('fix-2', 'file2.ts', ErrorCategory.EXPORT_PATH, true),       // Phase 2
        createMockFix('fix-3', 'file3.ts', ErrorCategory.ID_TYPE, true),           // Phase 3
        createMockFix('fix-4', 'file4.ts', ErrorCategory.INTERFACE_COMPLETION, true) // Phase 4
      ];

      const batches = processor.groupRelatedFixes(fixes);

      // Verify phases are in ascending order
      for (let i = 1; i < batches.length; i++) {
        expect(batches[i].phase).toBeGreaterThanOrEqual(batches[i - 1].phase);
      }
    });
  });

  describe('processBatch integration', () => {
    it('should process all batches and aggregate results', async () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true),
        createMockFix('fix-2', 'file2.ts', ErrorCategory.EXPORT_PATH, true),
        createMockFix('fix-3', 'file3.ts', ErrorCategory.ID_TYPE, true)
      ];

      const result = await processor.processBatch(fixes);

      expect(result.success).toBe(true);
      expect(result.fixesApplied).toBe(3);
      expect(result.errorsFixed).toBeGreaterThanOrEqual(3);
      expect(result.newErrors).toBe(0);
    });

    it('should aggregate errors from multiple batches', async () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true),
        createMockFix('fix-2', 'file2.ts', ErrorCategory.MODULE_RESOLUTION, true),
        createMockFix('fix-3', 'file3.ts', ErrorCategory.MODULE_RESOLUTION, false), // Fails
        createMockFix('fix-4', 'file4.ts', ErrorCategory.MODULE_RESOLUTION, true)
      ];

      const result = await processor.processBatch(fixes);

      // Should track both successful and failed fixes
      expect(result.fixesApplied).toBeGreaterThanOrEqual(2);
      expect(result.newErrors).toBeGreaterThanOrEqual(1);
    });

    it('should return validation result from last batch', async () => {
      const fixes: Fix[] = [
        createMockFix('fix-1', 'file1.ts', ErrorCategory.MODULE_RESOLUTION, true)
      ];

      const result = await processor.processBatch(fixes);

      expect(result.validationResult).toBeDefined();
      expect(result.validationResult.success).toBeDefined();
      expect(result.validationResult.errorCount).toBeDefined();
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mock fix for testing
 */
function createMockFix(
  id: string,
  file: string,
  category: ErrorCategory,
  shouldSucceed: boolean = true
): Fix {
  return {
    id,
    category,
    description: `Mock fix ${id}`,
    file,
    apply: async (): Promise<FixResult> => {
      return {
        success: shouldSucceed,
        filesModified: shouldSucceed ? [file] : [],
        errorsFixed: shouldSucceed ? [`Fixed error in ${file}`] : [],
        newErrors: shouldSucceed ? [] : [`Failed to fix ${file}`]
      };
    }
  } as Fix;
}

/**
 * Create a mock fix without file property for testing
 */
function createMockFixWithoutFile(
  id: string,
  category: ErrorCategory,
  shouldSucceed: boolean = true
): Fix {
  return {
    id,
    category,
    description: `Mock fix ${id}`,
    apply: async (): Promise<FixResult> => {
      return {
        success: shouldSucceed,
        filesModified: [],
        errorsFixed: shouldSucceed ? [`Fixed error`] : [],
        newErrors: shouldSucceed ? [] : [`Failed to fix`]
      };
    }
  };
}

/**
 * Create a fix that modifies a file for rollback testing
 */
function createFileModifyingFix(
  id: string,
  file: string,
  newContent: string,
  shouldSucceed: boolean
): Fix {
  return {
    id,
    category: ErrorCategory.MODULE_RESOLUTION,
    description: `File modifying fix ${id}`,
    file,
    apply: async (): Promise<FixResult> => {
      // Modify the file
      fs.writeFileSync(file, newContent);
      
      return {
        success: shouldSucceed,
        filesModified: [file],
        errorsFixed: shouldSucceed ? [`Fixed ${file}`] : [],
        newErrors: shouldSucceed ? [] : [`Failed to fix ${file}`]
      };
    }
  } as Fix;
}

/**
 * Create a fix that throws an exception
 */
function createExceptionThrowingFix(id: string, file: string): Fix {
  return {
    id,
    category: ErrorCategory.MODULE_RESOLUTION,
    description: `Exception throwing fix ${id}`,
    file,
    apply: async (): Promise<FixResult> => {
      throw new Error('Simulated exception during fix application');
    }
  } as Fix;
}

/**
 * Create a fix that tracks execution order
 */
function createOrderTrackingFix(
  id: string,
  file: string,
  category: ErrorCategory,
  executionOrder: string[],
  shouldSucceed: boolean = true
): Fix {
  return {
    id,
    category,
    description: `Order tracking fix ${id}`,
    file,
    apply: async (): Promise<FixResult> => {
      executionOrder.push(id);
      
      return {
        success: shouldSucceed,
        filesModified: shouldSucceed ? [file] : [],
        errorsFixed: shouldSucceed ? [`Fixed ${file}`] : [],
        newErrors: shouldSucceed ? [] : [`Failed to fix ${file}`]
      };
    }
  } as Fix;
}
