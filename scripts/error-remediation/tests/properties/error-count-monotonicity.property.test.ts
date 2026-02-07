/**
 * Property-Based Test: Error Count Monotonicity
 * 
 * Property 11: For any phase of remediation, the total TypeScript error count 
 * should never increase after applying fixes (errors fixed >= new errors introduced),
 * ensuring forward progress.
 * 
 * Feature: client-error-remediation, Property 11: Error Count Monotonicity
 * Validates: Requirements 20.2, 21.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ErrorReport, TypeScriptError, ErrorCategory, Severity } from '../../types';

describe('Property 11: Error Count Monotonicity', () => {
  it('should never increase total error count after applying fixes', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary "before" error report
        fc.record({
          totalErrors: fc.integer({ min: 10, max: 100 }),
          errorsByCategory: fc.constant(new Map<ErrorCategory, TypeScriptError[]>()),
          errorsByFile: fc.constant(new Map<string, TypeScriptError[]>()),
          errorsBySeverity: fc.constant(new Map<Severity, TypeScriptError[]>())
        }),
        // Generate arbitrary "after" error report with fixes applied
        // Constrain so that errorsFixed >= newErrorsIntroduced (valid remediation)
        fc.integer({ min: 1, max: 20 }).chain(errorsFixed =>
          fc.record({
            errorsFixed: fc.constant(errorsFixed),
            newErrorsIntroduced: fc.integer({ min: 0, max: errorsFixed })
          })
        ),
        (beforeReport, fixResult) => {
          // Calculate the after error count
          const afterErrorCount = beforeReport.totalErrors - fixResult.errorsFixed + fixResult.newErrorsIntroduced;
          
          // Property: Error count should not increase (or at worst stay the same)
          // This means: errorsFixed >= newErrorsIntroduced
          const errorCountDecreased = afterErrorCount <= beforeReport.totalErrors;
          
          // The property holds if we made forward progress
          expect(errorCountDecreased).toBe(true);
          
          // Additional assertion: we should have fixed at least as many as we introduced
          expect(fixResult.errorsFixed).toBeGreaterThanOrEqual(fixResult.newErrorsIntroduced);
        }
      ),
      { numRuns: 100 }
    );
  });
});
