/**
 * Property 6: Error Context Enrichment
 * 
 * Validates: Requirements 1.4, 6.1
 * 
 * This property test verifies that all transformation errors include
 * proper error context with operation, layer, field, and value information.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  dateToStringTransformer, 
  optionalDateToStringTransformer,
  createEnumTransformer,
  createValidatingTransformer,
  createIdentityTransformer
} from '../../shared/utils/transformers/base';
import { TransformationError } from '../../shared/utils/errors/types';
import type { ErrorContext } from '../../shared/utils/errors/context';

describe('Property 6: Error Context Enrichment', () => {
  it('dateToStringTransformer.transform includes error context for invalid dates', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(new Date(NaN)),
          fc.constant(new Date('invalid')),
          fc.constant(new Date(undefined as unknown as string))
        ),
        (invalidDate) => {
          try {
            dateToStringTransformer.transform(invalidDate);
            // Should not reach here
            expect.fail('Expected TransformationError to be thrown');
          } catch (error) {
            // Verify it's a TransformationError
            expect(error).toBeInstanceOf(TransformationError);
            
            const transformError = error as TransformationError;
            const context: ErrorContext = transformError.context;
            
            // Verify error context is enriched
            expect(context.operation).toBe('dateToStringTransformer.transform');
            expect(context.layer).toBe('transformation');
            expect(context.field).toBe('date');
            expect(context.value).toBe(invalidDate);
            expect(context.severity).toBe('high');
            expect(context.timestamp).toBeInstanceOf(Date);
            expect(context.stackTrace).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('dateToStringTransformer.reverse includes error context for invalid date strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('invalid-date'),
          fc.constant('not-a-date'),
          fc.constant('2024-13-45'), // Invalid month/day
          fc.constant(''),
          fc.constant('abc123')
        ),
        (invalidDateString) => {
          try {
            dateToStringTransformer.reverse(invalidDateString);
            // Should not reach here
            expect.fail('Expected TransformationError to be thrown');
          } catch (error) {
            // Verify it's a TransformationError
            expect(error).toBeInstanceOf(TransformationError);
            
            const transformError = error as TransformationError;
            const context: ErrorContext = transformError.context;
            
            // Verify error context is enriched
            expect(context.operation).toBe('dateToStringTransformer.reverse');
            expect(context.layer).toBe('transformation');
            expect(context.field).toBe('date');
            expect(context.value).toBe(invalidDateString);
            expect(context.severity).toBe('high');
            expect(context.timestamp).toBeInstanceOf(Date);
            expect(context.stackTrace).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('optionalDateToStringTransformer.transform includes error context for invalid dates', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(new Date(NaN)),
          fc.constant(new Date('invalid'))
        ),
        (invalidDate) => {
          try {
            optionalDateToStringTransformer.transform(invalidDate);
            // Should not reach here
            expect.fail('Expected TransformationError to be thrown');
          } catch (error) {
            // Verify it's a TransformationError
            expect(error).toBeInstanceOf(TransformationError);
            
            const transformError = error as TransformationError;
            const context: ErrorContext = transformError.context;
            
            // Verify error context is enriched
            expect(context.operation).toBe('optionalDateToStringTransformer.transform');
            expect(context.layer).toBe('transformation');
            expect(context.field).toBe('date');
            expect(context.value).toBe(invalidDate);
            expect(context.severity).toBe('high');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createEnumTransformer includes error context for invalid enum values', () => {
    const validEnums = ['active', 'inactive', 'pending'] as const;
    const enumTransformer = createEnumTransformer(validEnums);

    fc.assert(
      fc.property(
        fc.string().filter(s => !validEnums.includes(s as any)),
        (invalidEnum) => {
          try {
            enumTransformer.reverse(invalidEnum);
            // Should not reach here
            expect.fail('Expected TransformationError to be thrown');
          } catch (error) {
            // Verify it's a TransformationError
            expect(error).toBeInstanceOf(TransformationError);
            
            const transformError = error as TransformationError;
            const context: ErrorContext = transformError.context;
            
            // Verify error context is enriched
            expect(context.operation).toBe('createEnumTransformer.reverse');
            expect(context.layer).toBe('transformation');
            expect(context.field).toBe('enum');
            expect(context.value).toBe(invalidEnum);
            expect(context.severity).toBe('medium');
            expect(context.metadata).toBeDefined();
            expect(context.metadata?.validValues).toEqual(['active', 'inactive', 'pending']);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createValidatingTransformer includes error context for validation failures', () => {
    const identityTransformer = createIdentityTransformer<number>();
    const validatingTransformer = createValidatingTransformer(
      identityTransformer,
      (n) => n > 0, // Source must be positive
      (n) => n < 100 // Target must be less than 100
    );

    fc.assert(
      fc.property(
        fc.integer({ max: 0 }), // Generate non-positive numbers
        (invalidSource) => {
          try {
            validatingTransformer.transform(invalidSource);
            // Should not reach here
            expect.fail('Expected TransformationError to be thrown');
          } catch (error) {
            // Verify it's a TransformationError
            expect(error).toBeInstanceOf(TransformationError);
            
            const transformError = error as TransformationError;
            const context: ErrorContext = transformError.context;
            
            // Verify error context is enriched
            expect(context.operation).toBe('createValidatingTransformer.transform');
            expect(context.layer).toBe('transformation');
            expect(context.field).toBe('source');
            expect(context.value).toBe(invalidSource);
            expect(context.severity).toBe('medium');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all error contexts include required fields', () => {
    fc.assert(
      fc.property(
        fc.constant(new Date(NaN)),
        (invalidDate) => {
          try {
            dateToStringTransformer.transform(invalidDate);
            expect.fail('Expected TransformationError to be thrown');
          } catch (error) {
            const transformError = error as TransformationError;
            const context: ErrorContext = transformError.context;
            
            // Verify all required fields are present
            expect(context).toHaveProperty('operation');
            expect(context).toHaveProperty('layer');
            expect(context).toHaveProperty('timestamp');
            expect(context).toHaveProperty('severity');
            expect(context).toHaveProperty('stackTrace');
            
            // Verify types
            expect(typeof context.operation).toBe('string');
            expect(['client', 'api', 'transformation', 'database']).toContain(context.layer);
            expect(context.timestamp).toBeInstanceOf(Date);
            expect(['low', 'medium', 'high', 'critical']).toContain(context.severity);
            expect(typeof context.stackTrace).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
