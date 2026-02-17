import { expect } from 'vitest';
import type {
  CompilationError,
  CompilationResult,
  ErrorCategory,
  ErrorsByCategory,
} from './compilation-test.utils';
import {
  runTypeScriptCompilation,
  filterErrorsByCode,
  filterErrorsByCategory,
  countErrorsByCode,
  countErrorsByCategory,
} from './compilation-test.utils';

/**
 * Test helper to assert zero compilation errors
 * 
 * @param result - Compilation result
 */
export function expectNoCompilationErrors(result: CompilationResult): void {
  expect(result.totalErrors, `Expected zero compilation errors but found ${result.totalErrors}`).toBe(0);
  expect(result.success, 'Compilation should succeed').toBe(true);
  expect(result.exitCode, 'Exit code should be 0').toBe(0);
}

/**
 * Test helper to assert zero errors of specific codes
 * 
 * @param result - Compilation result
 * @param codes - Error codes that should have zero occurrences
 */
export function expectNoErrorsOfCodes(result: CompilationResult, codes: string[]): void {
  const filteredErrors = filterErrorsByCode(result.errors, codes);
  
  if (filteredErrors.length > 0) {
    const errorCounts = countErrorsByCode(filteredErrors);
    const summary = Array.from(errorCounts.entries())
      .map(([code, count]) => `${code}: ${count}`)
      .join(', ');
    
    expect(filteredErrors.length, `Expected zero errors for codes [${codes.join(', ')}] but found: ${summary}`).toBe(0);
  }
}

/**
 * Test helper to assert zero errors in a category
 * 
 * @param result - Compilation result
 * @param category - Error category that should have zero errors
 */
export function expectNoErrorsInCategory(result: CompilationResult, category: ErrorCategory): void {
  const categoryErrors = result.errorsByCategory[category];
  
  if (categoryErrors.length > 0) {
    const errorCounts = countErrorsByCode(categoryErrors);
    const summary = Array.from(errorCounts.entries())
      .map(([code, count]) => `${code}: ${count}`)
      .join(', ');
    
    expect(categoryErrors.length, `Expected zero ${category} errors but found: ${summary}`).toBe(0);
  }
}

/**
 * Test helper to assert error count is below threshold
 * 
 * @param result - Compilation result
 * @param maxErrors - Maximum allowed errors
 */
export function expectErrorCountBelow(result: CompilationResult, maxErrors: number): void {
  expect(result.totalErrors, `Expected fewer than ${maxErrors} errors but found ${result.totalErrors}`).toBeLessThanOrEqual(maxErrors);
}

/**
 * Test helper to assert error count for specific codes is below threshold
 * 
 * @param result - Compilation result
 * @param codes - Error codes to check
 * @param maxErrors - Maximum allowed errors for these codes
 */
export function expectErrorCountBelowForCodes(result: CompilationResult, codes: string[], maxErrors: number): void {
  const filteredErrors = filterErrorsByCode(result.errors, codes);
  expect(filteredErrors.length, `Expected fewer than ${maxErrors} errors for codes [${codes.join(', ')}] but found ${filteredErrors.length}`).toBeLessThanOrEqual(maxErrors);
}

/**
 * Test helper to assert error count decreased from baseline
 * 
 * @param current - Current compilation result
 * @param baseline - Baseline compilation result
 */
export function expectErrorCountDecreased(current: CompilationResult, baseline: CompilationResult): void {
  expect(current.totalErrors, `Expected error count to decrease from ${baseline.totalErrors} but got ${current.totalErrors}`).toBeLessThan(baseline.totalErrors);
}

/**
 * Test helper to assert no new errors introduced
 * 
 * @param current - Current compilation result
 * @param baseline - Baseline compilation result
 */
export function expectNoNewErrors(current: CompilationResult, baseline: CompilationResult): void {
  expect(current.totalErrors, `Expected no new errors (baseline: ${baseline.totalErrors}, current: ${current.totalErrors})`).toBeLessThanOrEqual(baseline.totalErrors);
}

/**
 * Test helper to compile with default settings
 * 
 * @returns Compilation result
 */
export function compileServer(): CompilationResult {
  return runTypeScriptCompilation({
    noEmit: true,
    strictNullChecks: false,
  });
}

/**
 * Test helper to compile with strict null checks
 * 
 * @returns Compilation result
 */
export function compileServerWithStrictNullChecks(): CompilationResult {
  return runTypeScriptCompilation({
    noEmit: true,
    strictNullChecks: true,
  });
}

/**
 * Test helper to get module resolution errors
 * 
 * @param result - Compilation result
 * @returns Module resolution errors
 */
export function getModuleResolutionErrors(result: CompilationResult): CompilationError[] {
  return result.errorsByCategory.moduleResolution;
}

/**
 * Test helper to get type annotation errors
 * 
 * @param result - Compilation result
 * @returns Type annotation errors
 */
export function getTypeAnnotationErrors(result: CompilationResult): CompilationError[] {
  return result.errorsByCategory.typeAnnotations;
}

/**
 * Test helper to get null safety errors
 * 
 * @param result - Compilation result
 * @returns Null safety errors
 */
export function getNullSafetyErrors(result: CompilationResult): CompilationError[] {
  return result.errorsByCategory.nullSafety;
}

/**
 * Test helper to get unused code errors
 * 
 * @param result - Compilation result
 * @returns Unused code errors
 */
export function getUnusedCodeErrors(result: CompilationResult): CompilationError[] {
  return result.errorsByCategory.unusedCode;
}

/**
 * Test helper to get type mismatch errors
 * 
 * @param result - Compilation result
 * @returns Type mismatch errors
 */
export function getTypeMismatchErrors(result: CompilationResult): CompilationError[] {
  return result.errorsByCategory.typeMismatches;
}

/**
 * Test helper to create a snapshot of current error state
 * 
 * @param result - Compilation result
 * @returns Snapshot object for comparison
 */
export function createErrorSnapshot(result: CompilationResult): ErrorSnapshot {
  return {
    totalErrors: result.totalErrors,
    errorsByCategory: {
      moduleResolution: result.errorsByCategory.moduleResolution.length,
      typeAnnotations: result.errorsByCategory.typeAnnotations.length,
      nullSafety: result.errorsByCategory.nullSafety.length,
      unusedCode: result.errorsByCategory.unusedCode.length,
      typeMismatches: result.errorsByCategory.typeMismatches.length,
      other: result.errorsByCategory.other.length,
    },
    errorsByCode: Object.fromEntries(countErrorsByCode(result.errors)),
  };
}

/**
 * Error snapshot for baseline comparison
 */
export interface ErrorSnapshot {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByCode: Record<string, number>;
}

/**
 * Test helper to compare snapshots
 * 
 * @param current - Current snapshot
 * @param baseline - Baseline snapshot
 * @returns Comparison result
 */
export function compareSnapshots(current: ErrorSnapshot, baseline: ErrorSnapshot): SnapshotComparison {
  return {
    totalErrorsDelta: current.totalErrors - baseline.totalErrors,
    categoryDeltas: Object.fromEntries(
      Object.entries(current.errorsByCategory).map(([category, count]) => [
        category,
        count - (baseline.errorsByCategory[category as ErrorCategory] || 0),
      ])
    ) as Record<ErrorCategory, number>,
    improved: current.totalErrors < baseline.totalErrors,
    regressed: current.totalErrors > baseline.totalErrors,
  };
}

/**
 * Snapshot comparison result
 */
export interface SnapshotComparison {
  totalErrorsDelta: number;
  categoryDeltas: Record<ErrorCategory, number>;
  improved: boolean;
  regressed: boolean;
}

/**
 * Test helper to assert snapshot improved
 * 
 * @param comparison - Snapshot comparison
 */
export function expectSnapshotImproved(comparison: SnapshotComparison): void {
  expect(comparison.improved, `Expected improvement but total errors delta is ${comparison.totalErrorsDelta}`).toBe(true);
  expect(comparison.regressed, 'Expected no regression').toBe(false);
}

/**
 * Test helper to assert no snapshot regression
 * 
 * @param comparison - Snapshot comparison
 */
export function expectNoSnapshotRegression(comparison: SnapshotComparison): void {
  expect(comparison.regressed, `Expected no regression but total errors increased by ${comparison.totalErrorsDelta}`).toBe(false);
}
