/**
 * Unit tests for ProgressTracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressTracker } from '../core/progress-tracker';
import {
  FixPhase,
  BatchResult,
  ValidationResult,
  ErrorCategory,
  Severity
} from '../types';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  describe('Phase Progress Recording', () => {
    it('should initialize all phases as not started', () => {
      const status = tracker.getStatus();
      
      expect(status.phaseProgress.size).toBe(6);
      
      for (const phaseStatus of status.phaseProgress.values()) {
        expect(phaseStatus.status).toBe('not_started');
        expect(phaseStatus.errorsAtStart).toBe(0);
        expect(phaseStatus.errorsFixed).toBe(0);
        expect(phaseStatus.errorsRemaining).toBe(0);
        expect(phaseStatus.batchesCompleted).toBe(0);
        expect(phaseStatus.batchesTotal).toBe(0);
      }
    });

    it('should start a phase and update status', () => {
      tracker.startPhase(FixPhase.MODULE_LOCATION_DISCOVERY, 23, 3);
      
      const status = tracker.getStatus();
      const phaseStatus = status.phaseProgress.get(FixPhase.MODULE_LOCATION_DISCOVERY);
      
      expect(phaseStatus).toBeDefined();
      expect(phaseStatus?.status).toBe('in_progress');
      expect(phaseStatus?.errorsAtStart).toBe(23);
      expect(phaseStatus?.errorsRemaining).toBe(23);
      expect(phaseStatus?.batchesTotal).toBe(3);
      expect(phaseStatus?.batchesCompleted).toBe(0);
    });

    it('should record batch progress and update error counts', () => {
      tracker.startPhase(FixPhase.MODULE_LOCATION_DISCOVERY, 23, 3);
      
      const batchResult: BatchResult = {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 5,
        errorsFixed: 10,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 13,
          errors: [],
          warnings: []
        }
      };
      
      tracker.recordPhaseProgress(FixPhase.MODULE_LOCATION_DISCOVERY, batchResult);
      
      const status = tracker.getStatus();
      const phaseStatus = status.phaseProgress.get(FixPhase.MODULE_LOCATION_DISCOVERY);
      
      expect(phaseStatus?.batchesCompleted).toBe(1);
      expect(phaseStatus?.errorsFixed).toBe(10);
      expect(phaseStatus?.errorsRemaining).toBe(13);
    });

    it('should handle new errors introduced during remediation', () => {
      tracker.startPhase(FixPhase.TYPE_STANDARDIZATION, 50, 2);
      
      const batchResult: BatchResult = {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 3,
        errorsFixed: 15,
        newErrors: 5,
        validationResult: {
          success: true,
          errorCount: 40,
          errors: [],
          warnings: []
        }
      };
      
      tracker.recordPhaseProgress(FixPhase.TYPE_STANDARDIZATION, batchResult);
      
      const status = tracker.getStatus();
      const phaseStatus = status.phaseProgress.get(FixPhase.TYPE_STANDARDIZATION);
      
      expect(phaseStatus?.errorsFixed).toBe(15);
      expect(phaseStatus?.errorsRemaining).toBe(40); // 50 - 15 + 5
    });

    it('should mark phase as completed when all batches finish successfully', () => {
      tracker.startPhase(FixPhase.IMPORT_PATH_UPDATES, 30, 2);
      
      // First batch
      tracker.recordPhaseProgress(FixPhase.IMPORT_PATH_UPDATES, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 5,
        errorsFixed: 15,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 15,
          errors: [],
          warnings: []
        }
      });
      
      // Second batch - completes phase
      tracker.recordPhaseProgress(FixPhase.IMPORT_PATH_UPDATES, {
        batchId: 'batch-2',
        success: true,
        fixesApplied: 5,
        errorsFixed: 15,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 0,
          errors: [],
          warnings: []
        }
      });
      
      const status = tracker.getStatus();
      const phaseStatus = status.phaseProgress.get(FixPhase.IMPORT_PATH_UPDATES);
      
      expect(phaseStatus?.status).toBe('completed');
      expect(phaseStatus?.batchesCompleted).toBe(2);
      expect(phaseStatus?.errorsRemaining).toBe(0);
    });

    it('should mark phase as failed when batch fails', () => {
      tracker.startPhase(FixPhase.INTERFACE_COMPLETION, 40, 2);
      
      tracker.recordPhaseProgress(FixPhase.INTERFACE_COMPLETION, {
        batchId: 'batch-1',
        success: false,
        fixesApplied: 0,
        errorsFixed: 0,
        newErrors: 10,
        validationResult: {
          success: false,
          errorCount: 50,
          errors: [],
          warnings: []
        }
      });
      
      // Complete the phase with failure
      tracker.completePhase(FixPhase.INTERFACE_COMPLETION, false);
      
      const status = tracker.getStatus();
      const phaseStatus = status.phaseProgress.get(FixPhase.INTERFACE_COMPLETION);
      
      expect(phaseStatus?.status).toBe('failed');
    });

    it('should throw error when recording progress for uninitialized phase', () => {
      const batchResult: BatchResult = {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 5,
        errorsFixed: 10,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 0,
          errors: [],
          warnings: []
        }
      };
      
      // Try to record progress without starting phase
      expect(() => {
        tracker.recordPhaseProgress(99 as FixPhase, batchResult);
      }).toThrow();
    });
  });

  describe('Status Reporting', () => {
    it('should return current remediation status', () => {
      tracker.startPhase(FixPhase.MODULE_LOCATION_DISCOVERY, 100, 5);
      
      tracker.recordPhaseProgress(FixPhase.MODULE_LOCATION_DISCOVERY, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 10,
        errorsFixed: 30,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 70,
          errors: [],
          warnings: []
        }
      });
      
      const status = tracker.getStatus();
      
      expect(status.currentPhase).toBe(FixPhase.MODULE_LOCATION_DISCOVERY);
      expect(status.totalErrors).toBe(100);
      expect(status.errorsFixed).toBe(0); // Not completed yet
      expect(status.errorsRemaining).toBe(100);
    });

    it('should calculate total errors fixed across completed phases', () => {
      // Phase 1
      tracker.startPhase(FixPhase.MODULE_LOCATION_DISCOVERY, 50, 1);
      tracker.recordPhaseProgress(FixPhase.MODULE_LOCATION_DISCOVERY, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 10,
        errorsFixed: 50,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 0,
          errors: [],
          warnings: []
        }
      });
      tracker.completePhase(FixPhase.MODULE_LOCATION_DISCOVERY, true);
      
      // Phase 2
      tracker.startPhase(FixPhase.IMPORT_PATH_UPDATES, 30, 1);
      tracker.recordPhaseProgress(FixPhase.IMPORT_PATH_UPDATES, {
        batchId: 'batch-2',
        success: true,
        fixesApplied: 8,
        errorsFixed: 30,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 0,
          errors: [],
          warnings: []
        }
      });
      tracker.completePhase(FixPhase.IMPORT_PATH_UPDATES, true);
      
      const status = tracker.getStatus();
      
      expect(status.errorsFixed).toBe(80); // 50 + 30
    });

    it('should track errors by category', () => {
      const errorsByCategory = new Map<ErrorCategory, number>([
        [ErrorCategory.MODULE_RESOLUTION, 23],
        [ErrorCategory.EXPORT_PATH, 35],
        [ErrorCategory.ID_TYPE, 15]
      ]);
      
      tracker.recordErrorsByCategory(errorsByCategory);
      
      const report = tracker.generateReport();
      
      expect(report.errorsByCategory.size).toBe(3);
      expect(report.errorsByCategory.get(ErrorCategory.MODULE_RESOLUTION)).toBe(23);
      expect(report.errorsByCategory.get(ErrorCategory.EXPORT_PATH)).toBe(35);
      expect(report.errorsByCategory.get(ErrorCategory.ID_TYPE)).toBe(15);
    });
  });

  describe('Report Generation', () => {
    it('should generate progress report with all details', () => {
      tracker.startPhase(FixPhase.MODULE_LOCATION_DISCOVERY, 100, 3);
      
      tracker.recordPhaseProgress(FixPhase.MODULE_LOCATION_DISCOVERY, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 10,
        errorsFixed: 40,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 60,
          errors: [
            {
              code: 'TS2307',
              message: 'Cannot find module',
              file: 'test.ts',
              line: 1,
              column: 1,
              severity: Severity.CRITICAL,
              category: ErrorCategory.MODULE_RESOLUTION
            }
          ],
          warnings: []
        }
      });
      
      const report = tracker.generateReport();
      
      expect(report.summary).toBeDefined();
      expect(report.phaseDetails).toHaveLength(6);
      expect(report.filesModified).toContain('test.ts');
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should generate formatted text report', () => {
      tracker.startPhase(FixPhase.TYPE_STANDARDIZATION, 50, 2);
      
      tracker.recordPhaseProgress(FixPhase.TYPE_STANDARDIZATION, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 5,
        errorsFixed: 25,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 25,
          errors: [],
          warnings: []
        }
      });
      
      const textReport = tracker.generateTextReport();
      
      expect(textReport).toContain('ERROR REMEDIATION PROGRESS REPORT');
      expect(textReport).toContain('SUMMARY');
      expect(textReport).toContain('PHASE PROGRESS');
      expect(textReport).toContain('Type Standardization');
      expect(textReport).toContain('FILES MODIFIED');
    });

    it('should export progress data as JSON', () => {
      tracker.startPhase(FixPhase.INTERFACE_COMPLETION, 30, 1);
      
      const errorsByCategory = new Map<ErrorCategory, number>([
        [ErrorCategory.INTERFACE_COMPLETION, 30]
      ]);
      tracker.recordErrorsByCategory(errorsByCategory);
      
      const json = tracker.exportJSON();
      const data = JSON.parse(json);
      
      expect(data.summary).toBeDefined();
      expect(data.phaseDetails).toBeDefined();
      expect(data.errorsByCategory).toBeDefined();
      expect(data.filesModified).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should list files when count is reasonable', () => {
      tracker.startPhase(FixPhase.TYPE_SAFETY, 20, 1);
      
      // Add a few files
      tracker.recordPhaseProgress(FixPhase.TYPE_SAFETY, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 5,
        errorsFixed: 10,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 10,
          errors: [
            {
              code: 'TS7006',
              message: 'Parameter implicitly has any type',
              file: 'file1.ts',
              line: 1,
              column: 1,
              severity: Severity.MEDIUM,
              category: ErrorCategory.EXPLICIT_TYPES
            },
            {
              code: 'TS7006',
              message: 'Parameter implicitly has any type',
              file: 'file2.ts',
              line: 1,
              column: 1,
              severity: Severity.MEDIUM,
              category: ErrorCategory.EXPLICIT_TYPES
            }
          ],
          warnings: []
        }
      });
      
      const textReport = tracker.generateTextReport();
      
      expect(textReport).toContain('file1.ts');
      expect(textReport).toContain('file2.ts');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset tracker to initial state', () => {
      tracker.startPhase(FixPhase.MODULE_LOCATION_DISCOVERY, 100, 5);
      tracker.recordPhaseProgress(FixPhase.MODULE_LOCATION_DISCOVERY, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 10,
        errorsFixed: 50,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 50,
          errors: [],
          warnings: []
        }
      });
      
      tracker.reset();
      
      const status = tracker.getStatus();
      
      expect(status.totalErrors).toBe(0);
      expect(status.errorsFixed).toBe(0);
      expect(status.errorsRemaining).toBe(0);
      
      for (const phaseStatus of status.phaseProgress.values()) {
        expect(phaseStatus.status).toBe('not_started');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero errors', () => {
      tracker.startPhase(FixPhase.MODULE_LOCATION_DISCOVERY, 0, 0);
      
      const status = tracker.getStatus();
      
      expect(status.totalErrors).toBe(0);
      expect(status.errorsFixed).toBe(0);
      expect(status.errorsRemaining).toBe(0);
    });

    it('should handle multiple phases in sequence', () => {
      // Phase 1
      tracker.startPhase(FixPhase.MODULE_LOCATION_DISCOVERY, 50, 1);
      tracker.recordPhaseProgress(FixPhase.MODULE_LOCATION_DISCOVERY, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 10,
        errorsFixed: 50,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 0,
          errors: [],
          warnings: []
        }
      });
      tracker.completePhase(FixPhase.MODULE_LOCATION_DISCOVERY, true);
      
      // Phase 2
      tracker.startPhase(FixPhase.IMPORT_PATH_UPDATES, 30, 1);
      tracker.recordPhaseProgress(FixPhase.IMPORT_PATH_UPDATES, {
        batchId: 'batch-2',
        success: true,
        fixesApplied: 8,
        errorsFixed: 30,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 0,
          errors: [],
          warnings: []
        }
      });
      tracker.completePhase(FixPhase.IMPORT_PATH_UPDATES, true);
      
      const status = tracker.getStatus();
      
      const phase1Status = status.phaseProgress.get(FixPhase.MODULE_LOCATION_DISCOVERY);
      const phase2Status = status.phaseProgress.get(FixPhase.IMPORT_PATH_UPDATES);
      
      expect(phase1Status?.status).toBe('completed');
      expect(phase2Status?.status).toBe('completed');
      expect(status.errorsFixed).toBe(80);
    });

    it('should handle large number of modified files', () => {
      tracker.startPhase(FixPhase.TYPE_SAFETY, 100, 1);
      
      // Create many errors to simulate many files
      const errors = Array.from({ length: 50 }, (_, i) => ({
        code: 'TS7006',
        message: 'Parameter implicitly has any type',
        file: `file${i}.ts`,
        line: 1,
        column: 1,
        severity: Severity.MEDIUM,
        category: ErrorCategory.EXPLICIT_TYPES
      }));
      
      tracker.recordPhaseProgress(FixPhase.TYPE_SAFETY, {
        batchId: 'batch-1',
        success: true,
        fixesApplied: 50,
        errorsFixed: 100,
        newErrors: 0,
        validationResult: {
          success: true,
          errorCount: 0,
          errors,
          warnings: []
        }
      });
      
      const report = tracker.generateReport();
      const textReport = tracker.generateTextReport();
      
      expect(report.filesModified.length).toBe(50);
      expect(textReport).toContain('50 files - too many to list');
    });
  });
});
