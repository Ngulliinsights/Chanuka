/**
 * Property Test: Date Validation in Transformers
 * Feature: comprehensive-bug-fixes, Property 1: Date Validation in Transformers
 * 
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * This property test verifies that:
 * - Date transformers reject invalid dates with descriptive error messages
 * - Valid dates are transformed correctly to ISO strings
 * - ISO strings are transformed back to valid Date objects
 * - Error messages include the invalid value for debugging
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  dateToStringTransformer,
  optionalDateToStringTransformer,
} from '@shared/utils/transformers/base';

describe('Feature: comprehensive-bug-fixes, Property 1: Date Validation in Transformers', () => {
  
  it('should reject invalid dates with descriptive error messages', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(new Date('invalid')),
          fc.constant(new Date(NaN)),
          fc.constant(new Date('not a date')),
        ),
        (invalidDate: Date) => {
          // Invalid dates should throw an error
          expect(() => dateToStringTransformer.transform(invalidDate)).toThrow();
          
          // Error message should include the invalid value
          try {
            dateToStringTransformer.transform(invalidDate);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain('Invalid Date');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should transform valid dates to ISO strings', () => {
    fc.assert(
      fc.property(
        fc.date().filter(date => !isNaN(date.getTime())),
        (validDate: Date) => {
          // Valid dates should transform successfully
          const isoString = dateToStringTransformer.transform(validDate);
          
          // Result should be a valid ISO string
          expect(typeof isoString).toBe('string');
          // ISO string format can have +/- prefix and 4-6 digit years for extreme dates
          expect(isoString).toMatch(/^[+-]?\d{4,6}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          
          // ISO string should represent the same date
          expect(new Date(isoString).getTime()).toBe(validDate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should transform ISO strings back to valid Date objects', () => {
    fc.assert(
      fc.property(
        fc.date().filter(date => !isNaN(date.getTime())),
        (originalDate: Date) => {
          // Transform to ISO string and back
          const isoString = dateToStringTransformer.transform(originalDate);
          const restoredDate = dateToStringTransformer.reverse(isoString);
          
          // Restored date should be a Date object
          expect(restoredDate).toBeInstanceOf(Date);
          
          // Restored date should have the same timestamp
          expect(restoredDate.getTime()).toBe(originalDate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle optional dates correctly', () => {
    fc.assert(
      fc.property(
        fc.option(fc.date(), { nil: null }),
        (optionalDate: Date | null) => {
          if (optionalDate === null) {
            // Null should transform to null
            const result = optionalDateToStringTransformer.transform(optionalDate);
            expect(result).toBeNull();
            
            // Null should reverse to null
            const reversed = optionalDateToStringTransformer.reverse(result);
            expect(reversed).toBeNull();
          } else if (isNaN(optionalDate.getTime())) {
            // Invalid dates should throw an error
            expect(() => optionalDateToStringTransformer.transform(optionalDate)).toThrow();
          } else {
            // Valid date should transform correctly
            const isoString = optionalDateToStringTransformer.transform(optionalDate);
            expect(typeof isoString).toBe('string');
            
            // Should reverse correctly
            const restoredDate = optionalDateToStringTransformer.reverse(isoString);
            expect(restoredDate).toBeInstanceOf(Date);
            expect(restoredDate?.getTime()).toBe(optionalDate.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid dates in optional transformer', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(new Date('invalid')),
          fc.constant(new Date(NaN)),
        ),
        (invalidDate: Date) => {
          // Invalid dates should throw an error even in optional transformer
          expect(() => optionalDateToStringTransformer.transform(invalidDate)).toThrow();
          
          // Error message should be descriptive
          try {
            optionalDateToStringTransformer.transform(invalidDate);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain('Invalid Date');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle edge case dates correctly', () => {
    const edgeCases = [
      new Date(0), // Unix epoch
      new Date('1970-01-01T00:00:00.000Z'), // Epoch as ISO string
      new Date('2099-12-31T23:59:59.999Z'), // Far future
      new Date('1900-01-01T00:00:00.000Z'), // Far past
    ];

    edgeCases.forEach(edgeDate => {
      // Should transform successfully
      const isoString = dateToStringTransformer.transform(edgeDate);
      expect(typeof isoString).toBe('string');
      
      // Should reverse correctly
      const restoredDate = dateToStringTransformer.reverse(isoString);
      expect(restoredDate.getTime()).toBe(edgeDate.getTime());
    });
  });

  it('should preserve millisecond precision', () => {
    fc.assert(
      fc.property(
        fc.date().filter(date => !isNaN(date.getTime())),
        (date: Date) => {
          // Transform and reverse
          const isoString = dateToStringTransformer.transform(date);
          const restoredDate = dateToStringTransformer.reverse(isoString);
          
          // Milliseconds should be preserved
          expect(restoredDate.getMilliseconds()).toBe(date.getMilliseconds());
          expect(restoredDate.getTime()).toBe(date.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});
