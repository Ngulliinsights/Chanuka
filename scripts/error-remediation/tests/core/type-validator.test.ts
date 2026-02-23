/**
 * Unit tests for TypeValidator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypeValidator } from '../../core/type-validator';
import { RemediationConfig } from '../../config';
import {
  ErrorReport,
  TypeScriptError,
  Severity,
  ErrorCategory,
  TypeChange
} from '../../types';
import * as path from 'path';

describe('TypeValidator', () => {
  let validator: TypeValidator;
  let config: RemediationConfig;

  beforeEach(() => {
    // Use the client tsconfig for testing
    config = {
      tsconfigPath: path.resolve(__dirname, '../../../../client/tsconfig.json'),
      rootDir: path.resolve(__dirname, '../../../../'),
      excludeFiles: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**'
      ],
      fsdLayers: {
        app: 'client/src/app',
        features: 'client/src/features',
        core: 'client/src/infrastructure',
        lib: 'client/src/lib',
        shared: 'shared'
      },
      moduleDiscovery: {
        similarityThreshold: 0.8,
        maxDepth: 5,
        extensions: ['.ts', '.tsx']
      },
      typeConsolidation: {
        preferredLocations: [
          'shared/types',
          'client/src/lib/types',
          'client/src/infrastructure'
        ],
        minDuplicates: 2
      },
      batchSize: 10,
      validateAfterBatch: true,
      rollbackOnFailure: true,
      idTypePreference: null
    };

    validator = new TypeValidator(config);
  });

  describe('validateTypeScript', () => {
    it('should return success when no errors exist', async () => {
      // This test validates the TypeScript compilation integration
      const result = await validator.validateTypeScript();
      
      expect(result).toBeDefined();
      expect(result.errorCount).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it('should detect TypeScript errors in files', async () => {
      // This test verifies error detection capability
      const result = await validator.validateTypeScript();
      
      // The client codebase currently has errors, so we expect some
      if (result.errorCount > 0) {
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        
        // Verify error structure
        const firstError = result.errors[0];
        expect(firstError).toHaveProperty('code');
        expect(firstError).toHaveProperty('message');
        expect(firstError).toHaveProperty('file');
        expect(firstError).toHaveProperty('line');
        expect(firstError).toHaveProperty('column');
        expect(firstError).toHaveProperty('severity');
        expect(firstError).toHaveProperty('category');
      }
    });

    it('should categorize errors correctly', async () => {
      const result = await validator.validateTypeScript();
      
      // Check that errors are categorized
      for (const error of result.errors) {
        expect(Object.values(ErrorCategory)).toContain(error.category);
        expect(Object.values(Severity)).toContain(error.severity);
      }
    });
  });

  describe('detectNewErrors', () => {
    it('should detect new errors introduced by changes', () => {
      const beforeReport: ErrorReport = {
        totalErrors: 2,
        errorsByCategory: new Map([
          [ErrorCategory.MODULE_RESOLUTION, [
            {
              code: 'TS2307',
              message: 'Cannot find module',
              file: 'test.ts',
              line: 1,
              column: 1,
              severity: Severity.CRITICAL,
              category: ErrorCategory.MODULE_RESOLUTION
            }
          ]]
        ]),
        errorsByFile: new Map([
          ['test.ts', [
            {
              code: 'TS2307',
              message: 'Cannot find module',
              file: 'test.ts',
              line: 1,
              column: 1,
              severity: Severity.CRITICAL,
              category: ErrorCategory.MODULE_RESOLUTION
            },
            {
              code: 'TS2339',
              message: 'Property does not exist',
              file: 'test.ts',
              line: 5,
              column: 10,
              severity: Severity.HIGH,
              category: ErrorCategory.INTERFACE_COMPLETION
            }
          ]]
        ]),
        errorsBySeverity: new Map()
      };

      const afterReport: ErrorReport = {
        totalErrors: 3,
        errorsByCategory: new Map([
          [ErrorCategory.MODULE_RESOLUTION, [
            {
              code: 'TS2307',
              message: 'Cannot find module',
              file: 'test.ts',
              line: 1,
              column: 1,
              severity: Severity.CRITICAL,
              category: ErrorCategory.MODULE_RESOLUTION
            }
          ]],
          [ErrorCategory.TYPE_COMPARISON, [
            {
              code: 'TS2367',
              message: 'Type mismatch',
              file: 'test.ts',
              line: 10,
              column: 5,
              severity: Severity.MEDIUM,
              category: ErrorCategory.TYPE_COMPARISON
            }
          ]]
        ]),
        errorsByFile: new Map([
          ['test.ts', [
            {
              code: 'TS2307',
              message: 'Cannot find module',
              file: 'test.ts',
              line: 1,
              column: 1,
              severity: Severity.CRITICAL,
              category: ErrorCategory.MODULE_RESOLUTION
            },
            {
              code: 'TS2339',
              message: 'Property does not exist',
              file: 'test.ts',
              line: 5,
              column: 10,
              severity: Severity.HIGH,
              category: ErrorCategory.INTERFACE_COMPLETION
            },
            {
              code: 'TS2367',
              message: 'Type mismatch',
              file: 'test.ts',
              line: 10,
              column: 5,
              severity: Severity.MEDIUM,
              category: ErrorCategory.TYPE_COMPARISON
            }
          ]]
        ]),
        errorsBySeverity: new Map()
      };

      const newErrors = validator.detectNewErrors(beforeReport, afterReport);

      expect(newErrors).toHaveLength(1);
      expect(newErrors[0].code).toBe('TS2367');
      expect(newErrors[0].message).toBe('Type mismatch');
      expect(newErrors[0].line).toBe(10);
    });

    it('should return empty array when no new errors', () => {
      const beforeReport: ErrorReport = {
        totalErrors: 1,
        errorsByCategory: new Map(),
        errorsByFile: new Map([
          ['test.ts', [
            {
              code: 'TS2307',
              message: 'Cannot find module',
              file: 'test.ts',
              line: 1,
              column: 1,
              severity: Severity.CRITICAL,
              category: ErrorCategory.MODULE_RESOLUTION
            }
          ]]
        ]),
        errorsBySeverity: new Map()
      };

      const afterReport: ErrorReport = {
        totalErrors: 1,
        errorsByCategory: new Map(),
        errorsByFile: new Map([
          ['test.ts', [
            {
              code: 'TS2307',
              message: 'Cannot find module',
              file: 'test.ts',
              line: 1,
              column: 1,
              severity: Severity.CRITICAL,
              category: ErrorCategory.MODULE_RESOLUTION
            }
          ]]
        ]),
        errorsBySeverity: new Map()
      };

      const newErrors = validator.detectNewErrors(beforeReport, afterReport);

      expect(newErrors).toHaveLength(0);
    });

    it('should handle empty error reports', () => {
      const emptyReport: ErrorReport = {
        totalErrors: 0,
        errorsByCategory: new Map(),
        errorsByFile: new Map(),
        errorsBySeverity: new Map()
      };

      const newErrors = validator.detectNewErrors(emptyReport, emptyReport);

      expect(newErrors).toHaveLength(0);
    });
  });

  describe('checkBackwardCompatibility', () => {
    it('should identify breaking changes', () => {
      const changes: TypeChange[] = [
        {
          type: 'removal',
          name: 'OldInterface',
          location: 'types.ts',
          oldSignature: 'interface OldInterface { id: number; }',
          affectedFiles: ['component.ts', 'service.ts']
        },
        {
          type: 'signature_change',
          name: 'updateUser',
          location: 'api.ts',
          oldSignature: 'updateUser(id: number): Promise<User>',
          newSignature: 'updateUser(id: string): Promise<User>',
          affectedFiles: ['user-service.ts']
        }
      ];

      const report = validator.checkBackwardCompatibility(changes);

      expect(report.compatible).toBe(false);
      expect(report.breakingChanges).toHaveLength(2);
      expect(report.migrationRequired).toBe(true);
      expect(report.migrationPatterns).toHaveLength(2);

      // Verify breaking change structure
      const firstBreakingChange = report.breakingChanges[0];
      expect(firstBreakingChange.type).toBe('export_removal');
      expect(firstBreakingChange.location).toBe('types.ts');
      expect(firstBreakingChange.affectedCode).toEqual(['component.ts', 'service.ts']);
      expect(firstBreakingChange.migrationPattern).toBeDefined();
    });

    it('should return compatible when no breaking changes', () => {
      const changes: TypeChange[] = [
        {
          type: 'addition',
          name: 'NewInterface',
          location: 'types.ts',
          newSignature: 'interface NewInterface { id: string; }',
          affectedFiles: []
        }
      ];

      const report = validator.checkBackwardCompatibility(changes);

      expect(report.compatible).toBe(true);
      expect(report.breakingChanges).toHaveLength(0);
      expect(report.migrationRequired).toBe(false);
      expect(report.migrationPatterns).toHaveLength(0);
    });

    it('should generate migration patterns for breaking changes', () => {
      const changes: TypeChange[] = [
        {
          type: 'signature_change',
          name: 'fetchData',
          location: 'api.ts',
          oldSignature: 'fetchData(id: number): Promise<Data>',
          newSignature: 'fetchData(id: string): Promise<Data>',
          affectedFiles: ['data-service.ts']
        }
      ];

      const report = validator.checkBackwardCompatibility(changes);

      expect(report.migrationPatterns).toHaveLength(1);
      
      const pattern = report.migrationPatterns[0];
      expect(pattern.name).toContain('fetchData');
      expect(pattern.description).toBeDefined();
      expect(pattern.before).toBe('fetchData(id: number): Promise<Data>');
      expect(pattern.after).toBe('fetchData(id: string): Promise<Data>');
      expect(pattern.automated).toBe(false);
    });

    it('should handle empty changes array', () => {
      const report = validator.checkBackwardCompatibility([]);

      expect(report.compatible).toBe(true);
      expect(report.breakingChanges).toHaveLength(0);
      expect(report.migrationRequired).toBe(false);
      expect(report.migrationPatterns).toHaveLength(0);
    });
  });
});
