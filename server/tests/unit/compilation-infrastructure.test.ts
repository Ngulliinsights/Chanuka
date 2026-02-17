import { describe, it, expect } from 'vitest';
import {
  runTypeScriptCompilation,
  parseCompilerOutput,
  categorizeErrorCode,
  categorizeErrors,
  countErrorsByCode,
  countErrorsByCategory,
  filterErrorsByCode,
  filterErrorsByCategory,
  generateErrorSummary,
  type CompilationError,
} from '../utils/compilation-test.utils';
import {
  expectNoErrorsOfCodes,
  expectNoErrorsInCategory,
  compileServer,
  createErrorSnapshot,
  compareSnapshots,
} from '../utils/compilation-test.helpers';

// Feature: server-typescript-errors-remediation, Property 1: Module Resolution Completeness
describe('Compilation Test Infrastructure', () => {
  describe('parseCompilerOutput', () => {
    it('should parse TypeScript error output correctly', () => {
      const output = `
server/features/test.ts(10,5): error TS2307: Cannot find module './missing'.
server/features/test.ts(20,10): error TS7006: Parameter 'x' implicitly has an 'any' type.
server/features/test.ts(30,15): warning TS6133: 'unused' is declared but its value is never read.
      `.trim();

      const errors = parseCompilerOutput(output);

      expect(errors).toHaveLength(3);
      
      expect(errors[0]).toMatchObject({
        code: 'TS2307',
        file: 'server/features/test.ts',
        line: 10,
        column: 5,
        severity: 'error',
        category: 'moduleResolution',
      });
      
      expect(errors[1]).toMatchObject({
        code: 'TS7006',
        file: 'server/features/test.ts',
        line: 20,
        column: 10,
        severity: 'error',
        category: 'typeAnnotations',
      });
      
      expect(errors[2]).toMatchObject({
        code: 'TS6133',
        file: 'server/features/test.ts',
        line: 30,
        column: 15,
        severity: 'warning',
        category: 'unusedCode',
      });
    });

    it('should handle empty output', () => {
      const errors = parseCompilerOutput('');
      expect(errors).toHaveLength(0);
    });

    it('should handle output with no errors', () => {
      const output = 'Compilation complete. No errors found.';
      const errors = parseCompilerOutput(output);
      expect(errors).toHaveLength(0);
    });
  });

  describe('categorizeErrorCode', () => {
    it('should categorize module resolution errors', () => {
      expect(categorizeErrorCode('TS2307')).toBe('moduleResolution');
      expect(categorizeErrorCode('TS2305')).toBe('moduleResolution');
      expect(categorizeErrorCode('TS2614')).toBe('moduleResolution');
      expect(categorizeErrorCode('TS2724')).toBe('moduleResolution');
    });

    it('should categorize type annotation errors', () => {
      expect(categorizeErrorCode('TS7006')).toBe('typeAnnotations');
      expect(categorizeErrorCode('TS7031')).toBe('typeAnnotations');
      expect(categorizeErrorCode('TS7053')).toBe('typeAnnotations');
    });

    it('should categorize null safety errors', () => {
      expect(categorizeErrorCode('TS18046')).toBe('nullSafety');
      expect(categorizeErrorCode('TS18048')).toBe('nullSafety');
      expect(categorizeErrorCode('TS2532')).toBe('nullSafety');
    });

    it('should categorize unused code errors', () => {
      expect(categorizeErrorCode('TS6133')).toBe('unusedCode');
      expect(categorizeErrorCode('TS6138')).toBe('unusedCode');
    });

    it('should categorize type mismatch errors', () => {
      expect(categorizeErrorCode('TS2339')).toBe('typeMismatches');
      expect(categorizeErrorCode('TS2322')).toBe('typeMismatches');
      expect(categorizeErrorCode('TS2345')).toBe('typeMismatches');
      expect(categorizeErrorCode('TS2304')).toBe('typeMismatches');
    });

    it('should categorize unknown errors as other', () => {
      expect(categorizeErrorCode('TS9999')).toBe('other');
      expect(categorizeErrorCode('TS1234')).toBe('other');
    });
  });

  describe('categorizeErrors', () => {
    it('should group errors by category', () => {
      const errors: CompilationError[] = [
        {
          code: 'TS2307',
          file: 'test.ts',
          line: 1,
          column: 1,
          message: 'Cannot find module',
          category: 'moduleResolution',
          severity: 'error',
        },
        {
          code: 'TS7006',
          file: 'test.ts',
          line: 2,
          column: 1,
          message: 'Implicit any',
          category: 'typeAnnotations',
          severity: 'error',
        },
        {
          code: 'TS2307',
          file: 'test.ts',
          line: 3,
          column: 1,
          message: 'Cannot find module',
          category: 'moduleResolution',
          severity: 'error',
        },
      ];

      const categorized = categorizeErrors(errors);

      expect(categorized.moduleResolution).toHaveLength(2);
      expect(categorized.typeAnnotations).toHaveLength(1);
      expect(categorized.nullSafety).toHaveLength(0);
      expect(categorized.unusedCode).toHaveLength(0);
      expect(categorized.typeMismatches).toHaveLength(0);
      expect(categorized.other).toHaveLength(0);
    });
  });

  describe('countErrorsByCode', () => {
    it('should count errors by code', () => {
      const errors: CompilationError[] = [
        { code: 'TS2307', file: 'test.ts', line: 1, column: 1, message: '', category: 'moduleResolution', severity: 'error' },
        { code: 'TS2307', file: 'test.ts', line: 2, column: 1, message: '', category: 'moduleResolution', severity: 'error' },
        { code: 'TS7006', file: 'test.ts', line: 3, column: 1, message: '', category: 'typeAnnotations', severity: 'error' },
      ];

      const counts = countErrorsByCode(errors);

      expect(counts.get('TS2307')).toBe(2);
      expect(counts.get('TS7006')).toBe(1);
      expect(counts.get('TS9999')).toBeUndefined();
    });
  });

  describe('filterErrorsByCode', () => {
    it('should filter errors by code', () => {
      const errors: CompilationError[] = [
        { code: 'TS2307', file: 'test.ts', line: 1, column: 1, message: '', category: 'moduleResolution', severity: 'error' },
        { code: 'TS7006', file: 'test.ts', line: 2, column: 1, message: '', category: 'typeAnnotations', severity: 'error' },
        { code: 'TS2307', file: 'test.ts', line: 3, column: 1, message: '', category: 'moduleResolution', severity: 'error' },
      ];

      const filtered = filterErrorsByCode(errors, ['TS2307']);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.code === 'TS2307')).toBe(true);
    });
  });

  describe('filterErrorsByCategory', () => {
    it('should filter errors by category', () => {
      const errors: CompilationError[] = [
        { code: 'TS2307', file: 'test.ts', line: 1, column: 1, message: '', category: 'moduleResolution', severity: 'error' },
        { code: 'TS7006', file: 'test.ts', line: 2, column: 1, message: '', category: 'typeAnnotations', severity: 'error' },
        { code: 'TS2307', file: 'test.ts', line: 3, column: 1, message: '', category: 'moduleResolution', severity: 'error' },
      ];

      const filtered = filterErrorsByCategory(errors, 'moduleResolution');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.category === 'moduleResolution')).toBe(true);
    });
  });

  describe('generateErrorSummary', () => {
    it('should generate a summary report', () => {
      const errors: CompilationError[] = [
        { code: 'TS2307', file: 'test.ts', line: 1, column: 1, message: '', category: 'moduleResolution', severity: 'error' },
        { code: 'TS7006', file: 'test.ts', line: 2, column: 1, message: '', category: 'typeAnnotations', severity: 'error' },
      ];

      const result = {
        success: false,
        errors,
        errorsByCategory: categorizeErrors(errors),
        totalErrors: 2,
        output: '',
        exitCode: 1,
      };

      const summary = generateErrorSummary(result);

      expect(summary).toContain('Total Errors: 2');
      expect(summary).toContain('Exit Code: 1');
      expect(summary).toContain('Success: false');
      expect(summary).toContain('moduleResolution: 1');
      expect(summary).toContain('typeAnnotations: 1');
      expect(summary).toContain('TS2307: 1');
      expect(summary).toContain('TS7006: 1');
    });
  });

  describe('Test Helpers', () => {
    it('should create error snapshots', () => {
      const errors: CompilationError[] = [
        { code: 'TS2307', file: 'test.ts', line: 1, column: 1, message: '', category: 'moduleResolution', severity: 'error' },
        { code: 'TS7006', file: 'test.ts', line: 2, column: 1, message: '', category: 'typeAnnotations', severity: 'error' },
      ];

      const result = {
        success: false,
        errors,
        errorsByCategory: categorizeErrors(errors),
        totalErrors: 2,
        output: '',
        exitCode: 1,
      };

      const snapshot = createErrorSnapshot(result);

      expect(snapshot.totalErrors).toBe(2);
      expect(snapshot.errorsByCategory.moduleResolution).toBe(1);
      expect(snapshot.errorsByCategory.typeAnnotations).toBe(1);
      expect(snapshot.errorsByCode['TS2307']).toBe(1);
      expect(snapshot.errorsByCode['TS7006']).toBe(1);
    });

    it('should compare snapshots', () => {
      const baseline = {
        totalErrors: 10,
        errorsByCategory: {
          moduleResolution: 5,
          typeAnnotations: 3,
          nullSafety: 2,
          unusedCode: 0,
          typeMismatches: 0,
          other: 0,
        },
        errorsByCode: { 'TS2307': 5, 'TS7006': 3, 'TS18046': 2 },
      };

      const current = {
        totalErrors: 7,
        errorsByCategory: {
          moduleResolution: 3,
          typeAnnotations: 2,
          nullSafety: 2,
          unusedCode: 0,
          typeMismatches: 0,
          other: 0,
        },
        errorsByCode: { 'TS2307': 3, 'TS7006': 2, 'TS18046': 2 },
      };

      const comparison = compareSnapshots(current, baseline);

      expect(comparison.totalErrorsDelta).toBe(-3);
      expect(comparison.improved).toBe(true);
      expect(comparison.regressed).toBe(false);
      expect(comparison.categoryDeltas.moduleResolution).toBe(-2);
      expect(comparison.categoryDeltas.typeAnnotations).toBe(-1);
    });
  });

  describe('Integration - Actual Compilation', () => {
    it('should run TypeScript compilation on server codebase', () => {
      const result = compileServer();

      // Verify result structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('errorsByCategory');
      expect(result).toHaveProperty('totalErrors');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('exitCode');

      // Verify errors are parsed
      expect(Array.isArray(result.errors)).toBe(true);
      
      // Verify categorization
      expect(result.errorsByCategory).toHaveProperty('moduleResolution');
      expect(result.errorsByCategory).toHaveProperty('typeAnnotations');
      expect(result.errorsByCategory).toHaveProperty('nullSafety');
      expect(result.errorsByCategory).toHaveProperty('unusedCode');
      expect(result.errorsByCategory).toHaveProperty('typeMismatches');
      expect(result.errorsByCategory).toHaveProperty('other');

      // Log summary for visibility
      console.log('\n' + generateErrorSummary(result));
    }, 30000); // 30 second timeout for compilation
  });
});
