/**
 * Unit Tests: Shared Utilities
 * 
 * Tests for shared utility functions:
 * - Date formatting utilities
 * - String manipulation utilities (correlation IDs)
 * - Validation utilities (transformer helpers)
 * 
 * Requirements: 7.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateCorrelationId,
  setCurrentCorrelationId,
  getCurrentCorrelationId,
  clearCurrentCorrelationId,
  withCorrelationId,
} from './errors/correlation-id';
import {
  dateToStringTransformer,
  optionalDateToStringTransformer,
  createIdentityTransformer,
  createEnumTransformer,
  createArrayTransformer,
  createOptionalArrayTransformer,
  createOptionalTransformer,
  createFieldMappingTransformer,
  composeTransformers,
  createValidatingTransformer,
  applyTransformationOptions,
  createSafeTransformer,
} from './transformers/base';

describe('Shared Utilities Unit Tests', () => {
  describe('Date Formatting Utilities', () => {
    describe('dateToStringTransformer', () => {
      it('should format Date to ISO 8601 string', () => {
        const date = new Date('2024-01-15T10:30:00.000Z');
        const result = dateToStringTransformer.transform(date);

        expect(result).toBe('2024-01-15T10:30:00.000Z');
        expect(typeof result).toBe('string');
      });

      it('should parse ISO 8601 string to Date', () => {
        const isoString = '2024-01-15T10:30:00.000Z';
        const result = dateToStringTransformer.reverse(isoString);

        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBe(new Date(isoString).getTime());
      });

      it('should handle dates with milliseconds precision', () => {
        const date = new Date('2024-01-15T10:30:00.123Z');
        const formatted = dateToStringTransformer.transform(date);
        const parsed = dateToStringTransformer.reverse(formatted);

        expect(formatted).toBe('2024-01-15T10:30:00.123Z');
        expect(parsed.getTime()).toBe(date.getTime());
      });

      it('should handle epoch date (1970-01-01)', () => {
        const epoch = new Date(0);
        const formatted = dateToStringTransformer.transform(epoch);
        const parsed = dateToStringTransformer.reverse(formatted);

        expect(formatted).toBe('1970-01-01T00:00:00.000Z');
        expect(parsed.getTime()).toBe(0);
      });

      it('should handle dates far in the future', () => {
        const futureDate = new Date('2099-12-31T23:59:59.999Z');
        const formatted = dateToStringTransformer.transform(futureDate);
        const parsed = dateToStringTransformer.reverse(formatted);

        expect(parsed.getTime()).toBe(futureDate.getTime());
      });

      it('should handle dates far in the past', () => {
        const pastDate = new Date('1900-01-01T00:00:00.000Z');
        const formatted = dateToStringTransformer.transform(pastDate);
        const parsed = dateToStringTransformer.reverse(formatted);

        expect(parsed.getTime()).toBe(pastDate.getTime());
      });

      it('should be reversible (round-trip)', () => {
        const original = new Date('2024-06-15T14:22:33.456Z');
        const roundTrip = dateToStringTransformer.reverse(
          dateToStringTransformer.transform(original)
        );

        expect(roundTrip.getTime()).toBe(original.getTime());
      });
    });

    describe('optionalDateToStringTransformer', () => {
      it('should format valid Date to ISO string', () => {
        const date = new Date('2024-01-15T10:30:00.000Z');
        const result = optionalDateToStringTransformer.transform(date);

        expect(result).toBe('2024-01-15T10:30:00.000Z');
      });

      it('should return null for null input', () => {
        const result = optionalDateToStringTransformer.transform(null);
        expect(result).toBeNull();
      });

      it('should return null for undefined input', () => {
        const result = optionalDateToStringTransformer.transform(undefined);
        expect(result).toBeNull();
      });

      it('should parse ISO string to Date', () => {
        const isoString = '2024-01-15T10:30:00.000Z';
        const result = optionalDateToStringTransformer.reverse(isoString);

        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).toBe(new Date(isoString).getTime());
      });

      it('should return null when reversing null', () => {
        const result = optionalDateToStringTransformer.reverse(null);
        expect(result).toBeNull();
      });

      it('should be reversible with valid dates', () => {
        const original = new Date('2024-06-15T14:22:33.456Z');
        const roundTrip = optionalDateToStringTransformer.reverse(
          optionalDateToStringTransformer.transform(original)
        );

        expect(roundTrip?.getTime()).toBe(original.getTime());
      });

      it('should be reversible with null', () => {
        const roundTrip = optionalDateToStringTransformer.reverse(
          optionalDateToStringTransformer.transform(null)
        );

        expect(roundTrip).toBeNull();
      });
    });
  });

  describe('String Manipulation Utilities', () => {
    describe('generateCorrelationId', () => {
      it('should generate a non-empty string', () => {
        const id = generateCorrelationId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      it('should generate unique IDs', () => {
        const id1 = generateCorrelationId();
        const id2 = generateCorrelationId();
        const id3 = generateCorrelationId();

        expect(id1).not.toBe(id2);
        expect(id2).not.toBe(id3);
        expect(id1).not.toBe(id3);
      });

      it('should generate UUID format (if crypto.randomUUID available)', () => {
        const id = generateCorrelationId();
        
        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const timestampRegex = /^\d+-[a-z0-9]+$/; // Fallback format
        
        // Should match either UUID or fallback format
        const isValid = uuidRegex.test(id) || timestampRegex.test(id);
        expect(isValid).toBe(true);
      });

      it('should generate many unique IDs without collision', () => {
        const ids = new Set<string>();
        const count = 1000;

        for (let i = 0; i < count; i++) {
          ids.add(generateCorrelationId());
        }

        expect(ids.size).toBe(count);
      });
    });

    describe('Correlation ID Context Management', () => {
      afterEach(() => {
        clearCurrentCorrelationId();
      });

      it('should set and get correlation ID', () => {
        const testId = 'test-correlation-id-123';
        setCurrentCorrelationId(testId);

        const retrieved = getCurrentCorrelationId();
        expect(retrieved).toBe(testId);
      });

      it('should return null when no correlation ID is set', () => {
        const result = getCurrentCorrelationId();
        expect(result).toBeNull();
      });

      it('should clear correlation ID', () => {
        setCurrentCorrelationId('test-id');
        expect(getCurrentCorrelationId()).toBe('test-id');

        clearCurrentCorrelationId();
        expect(getCurrentCorrelationId()).toBeNull();
      });

      it('should overwrite previous correlation ID', () => {
        setCurrentCorrelationId('first-id');
        setCurrentCorrelationId('second-id');

        expect(getCurrentCorrelationId()).toBe('second-id');
      });

      it('should handle empty string correlation ID', () => {
        setCurrentCorrelationId('');
        expect(getCurrentCorrelationId()).toBe('');
      });
    });

    describe('withCorrelationId', () => {
      afterEach(() => {
        clearCurrentCorrelationId();
      });

      it('should execute function with correlation ID context', async () => {
        const testId = 'test-correlation-id';
        let capturedId: string | null = null;

        await withCorrelationId(testId, async () => {
          capturedId = getCurrentCorrelationId();
        });

        expect(capturedId).toBe(testId);
      });

      it('should clear correlation ID after execution', async () => {
        const testId = 'test-correlation-id';

        await withCorrelationId(testId, async () => {
          expect(getCurrentCorrelationId()).toBe(testId);
        });

        expect(getCurrentCorrelationId()).toBeNull();
      });

      it('should clear correlation ID even if function throws', async () => {
        const testId = 'test-correlation-id';

        await expect(
          withCorrelationId(testId, async () => {
            throw new Error('Test error');
          })
        ).rejects.toThrow('Test error');

        expect(getCurrentCorrelationId()).toBeNull();
      });

      it('should return function result', async () => {
        const testId = 'test-correlation-id';
        const expectedResult = { data: 'test' };

        const result = await withCorrelationId(testId, async () => {
          return expectedResult;
        });

        expect(result).toBe(expectedResult);
      });

      it('should handle nested correlation ID contexts', async () => {
        const outerIds: Array<string | null> = [];
        const innerIds: Array<string | null> = [];

        await withCorrelationId('outer-id', async () => {
          outerIds.push(getCurrentCorrelationId());

          await withCorrelationId('inner-id', async () => {
            innerIds.push(getCurrentCorrelationId());
          });

          outerIds.push(getCurrentCorrelationId());
        });

        expect(outerIds[0]).toBe('outer-id');
        expect(innerIds[0]).toBe('inner-id');
        expect(outerIds[1]).toBeNull(); // Cleared after inner context
      });
    });
  });

  describe('Validation Utilities', () => {
    describe('createIdentityTransformer', () => {
      it('should return input unchanged in transform', () => {
        const transformer = createIdentityTransformer<string>();
        expect(transformer.transform('test')).toBe('test');
      });

      it('should return input unchanged in reverse', () => {
        const transformer = createIdentityTransformer<number>();
        expect(transformer.reverse(42)).toBe(42);
      });

      it('should work with complex objects', () => {
        const transformer = createIdentityTransformer<{ id: string; name: string }>();
        const obj = { id: '123', name: 'test' };
        
        expect(transformer.transform(obj)).toBe(obj);
        expect(transformer.reverse(obj)).toBe(obj);
      });
    });

    describe('createEnumTransformer', () => {
      it('should transform valid enum values', () => {
        const transformer = createEnumTransformer(['red', 'green', 'blue'] as const);
        
        expect(transformer.transform('red')).toBe('red');
        expect(transformer.transform('green')).toBe('green');
        expect(transformer.transform('blue')).toBe('blue');
      });

      it('should reverse valid enum values', () => {
        const transformer = createEnumTransformer(['red', 'green', 'blue'] as const);
        
        expect(transformer.reverse('red')).toBe('red');
        expect(transformer.reverse('green')).toBe('green');
        expect(transformer.reverse('blue')).toBe('blue');
      });

      it('should throw error for invalid enum value in reverse', () => {
        const transformer = createEnumTransformer(['red', 'green', 'blue'] as const);
        
        expect(() => transformer.reverse('yellow')).toThrow('Invalid enum value: yellow');
        expect(() => transformer.reverse('purple')).toThrow('Invalid enum value: purple');
      });

      it('should include valid values in error message', () => {
        const transformer = createEnumTransformer(['red', 'green', 'blue'] as const);
        
        expect(() => transformer.reverse('yellow')).toThrow('Expected one of: red, green, blue');
      });

      it('should work with single-value enum', () => {
        const transformer = createEnumTransformer(['only'] as const);
        
        expect(transformer.transform('only')).toBe('only');
        expect(transformer.reverse('only')).toBe('only');
      });
    });

    describe('createArrayTransformer', () => {
      it('should transform array of primitives', () => {
        const stringToUpper = {
          transform: (s: string) => s.toUpperCase(),
          reverse: (s: string) => s.toLowerCase(),
        };
        const transformer = createArrayTransformer(stringToUpper);

        const result = transformer.transform(['hello', 'world']);
        expect(result).toEqual(['HELLO', 'WORLD']);
      });

      it('should reverse array transformation', () => {
        const stringToUpper = {
          transform: (s: string) => s.toUpperCase(),
          reverse: (s: string) => s.toLowerCase(),
        };
        const transformer = createArrayTransformer(stringToUpper);

        const result = transformer.reverse(['HELLO', 'WORLD']);
        expect(result).toEqual(['hello', 'world']);
      });

      it('should handle empty arrays', () => {
        const transformer = createArrayTransformer(dateToStringTransformer);

        expect(transformer.transform([])).toEqual([]);
        expect(transformer.reverse([])).toEqual([]);
      });

      it('should transform array of dates', () => {
        const transformer = createArrayTransformer(dateToStringTransformer);
        const dates = [
          new Date('2024-01-01T00:00:00.000Z'),
          new Date('2024-06-15T12:30:00.000Z'),
        ];

        const result = transformer.transform(dates);
        expect(result).toEqual([
          '2024-01-01T00:00:00.000Z',
          '2024-06-15T12:30:00.000Z',
        ]);
      });

      it('should be reversible', () => {
        const transformer = createArrayTransformer(dateToStringTransformer);
        const original = [
          new Date('2024-01-01T00:00:00.000Z'),
          new Date('2024-06-15T12:30:00.000Z'),
        ];

        const roundTrip = transformer.reverse(transformer.transform(original));
        expect(roundTrip.map(d => d.getTime())).toEqual(original.map(d => d.getTime()));
      });
    });

    describe('createOptionalArrayTransformer', () => {
      it('should transform valid array', () => {
        const stringToUpper = {
          transform: (s: string) => s.toUpperCase(),
          reverse: (s: string) => s.toLowerCase(),
        };
        const transformer = createOptionalArrayTransformer(stringToUpper);

        const result = transformer.transform(['hello', 'world']);
        expect(result).toEqual(['HELLO', 'WORLD']);
      });

      it('should return null for null input', () => {
        const transformer = createOptionalArrayTransformer(dateToStringTransformer);
        expect(transformer.transform(null)).toBeNull();
      });

      it('should return null for undefined input', () => {
        const transformer = createOptionalArrayTransformer(dateToStringTransformer);
        expect(transformer.transform(undefined)).toBeNull();
      });

      it('should reverse valid array', () => {
        const stringToUpper = {
          transform: (s: string) => s.toUpperCase(),
          reverse: (s: string) => s.toLowerCase(),
        };
        const transformer = createOptionalArrayTransformer(stringToUpper);

        const result = transformer.reverse(['HELLO', 'WORLD']);
        expect(result).toEqual(['hello', 'world']);
      });

      it('should return null when reversing null', () => {
        const transformer = createOptionalArrayTransformer(dateToStringTransformer);
        expect(transformer.reverse(null)).toBeNull();
      });

      it('should handle empty arrays', () => {
        const transformer = createOptionalArrayTransformer(dateToStringTransformer);
        expect(transformer.transform([])).toEqual([]);
      });
    });

    describe('createOptionalTransformer', () => {
      const stringToUpper = {
        transform: (s: string) => s.toUpperCase(),
        reverse: (s: string) => s.toLowerCase(),
      };

      it('should transform valid value', () => {
        const transformer = createOptionalTransformer(stringToUpper);
        expect(transformer.transform('hello')).toBe('HELLO');
      });

      it('should return null for null input', () => {
        const transformer = createOptionalTransformer(stringToUpper);
        expect(transformer.transform(null)).toBeNull();
      });

      it('should return null for undefined input', () => {
        const transformer = createOptionalTransformer(stringToUpper);
        expect(transformer.transform(undefined)).toBeNull();
      });

      it('should reverse valid value', () => {
        const transformer = createOptionalTransformer(stringToUpper);
        expect(transformer.reverse('HELLO')).toBe('hello');
      });

      it('should return null when reversing null', () => {
        const transformer = createOptionalTransformer(stringToUpper);
        expect(transformer.reverse(null)).toBeNull();
      });

      it('should work with date transformer', () => {
        const transformer = createOptionalTransformer(dateToStringTransformer);
        const date = new Date('2024-01-15T10:30:00.000Z');

        const result = transformer.transform(date);
        expect(result).toBe('2024-01-15T10:30:00.000Z');

        const reversed = transformer.reverse(result);
        expect(reversed?.getTime()).toBe(date.getTime());
      });
    });

    describe('createFieldMappingTransformer', () => {
      it('should map fields according to mapping', () => {
        const transformer = createFieldMappingTransformer<
          { old_name: string; old_value: number },
          { newName: string; newValue: number }
        >({
          old_name: 'newName',
          old_value: 'newValue',
        });

        const result = transformer.transform({
          old_name: 'test',
          old_value: 42,
        });

        expect(result).toEqual({
          newName: 'test',
          newValue: 42,
        });
      });

      it('should handle partial mappings', () => {
        const transformer = createFieldMappingTransformer<
          { field1: string; field2: string; field3: string },
          { newField1: string }
        >({
          field1: 'newField1',
        });

        const result = transformer.transform({
          field1: 'value1',
          field2: 'value2',
          field3: 'value3',
        });

        expect(result).toEqual({
          newField1: 'value1',
        });
      });

      it('should handle missing source fields', () => {
        const transformer = createFieldMappingTransformer<
          { field1?: string },
          { newField1?: string }
        >({
          field1: 'newField1',
        });

        const result = transformer.transform({});
        expect(result).toEqual({});
      });
    });

    describe('composeTransformers', () => {
      it('should compose two transformers', () => {
        const addOne = {
          transform: (n: number) => n + 1,
          reverse: (n: number) => n - 1,
        };
        const double = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => n / 2,
        };

        const composed = composeTransformers(addOne, double);

        // (5 + 1) * 2 = 12
        expect(composed.transform(5)).toBe(12);
        // 12 / 2 - 1 = 5
        expect(composed.reverse(12)).toBe(5);
      });

      it('should compose string transformers', () => {
        const trim = {
          transform: (s: string) => s.trim(),
          reverse: (s: string) => s,
        };
        const upper = {
          transform: (s: string) => s.toUpperCase(),
          reverse: (s: string) => s.toLowerCase(),
        };

        const composed = composeTransformers(trim, upper);

        expect(composed.transform('  hello  ')).toBe('HELLO');
        expect(composed.reverse('HELLO')).toBe('hello');
      });

      it('should be reversible', () => {
        const addOne = {
          transform: (n: number) => n + 1,
          reverse: (n: number) => n - 1,
        };
        const double = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => n / 2,
        };

        const composed = composeTransformers(addOne, double);
        const original = 42;

        const roundTrip = composed.reverse(composed.transform(original));
        expect(roundTrip).toBe(original);
      });
    });

    describe('createValidatingTransformer', () => {
      it('should validate source before transformation', () => {
        const transformer = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => n / 2,
        };
        const validateSource = (n: number) => n > 0;

        const validating = createValidatingTransformer(transformer, validateSource);

        expect(validating.transform(5)).toBe(10);
        expect(() => validating.transform(-5)).toThrow('Source validation failed');
      });

      it('should validate target after transformation', () => {
        const transformer = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => n / 2,
        };
        const validateTarget = (n: number) => n < 100;

        const validating = createValidatingTransformer(transformer, undefined, validateTarget);

        expect(validating.transform(10)).toBe(20);
        expect(() => validating.transform(60)).toThrow('Target validation failed');
      });

      it('should validate both source and target', () => {
        const transformer = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => n / 2,
        };
        const validateSource = (n: number) => n > 0;
        const validateTarget = (n: number) => n < 100;

        const validating = createValidatingTransformer(transformer, validateSource, validateTarget);

        expect(validating.transform(10)).toBe(20);
        expect(() => validating.transform(-5)).toThrow('Source validation failed');
        expect(() => validating.transform(60)).toThrow('Target validation failed');
      });

      it('should validate in reverse direction', () => {
        const transformer = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => n / 2,
        };
        const validateSource = (n: number) => n > 0;
        const validateTarget = (n: number) => n < 100;

        const validating = createValidatingTransformer(transformer, validateSource, validateTarget);

        expect(validating.reverse(20)).toBe(10);
        expect(() => validating.reverse(200)).toThrow('Target validation failed');
        // 10/2 = 5, which passes validation (5 > 0), so this should succeed
        expect(validating.reverse(10)).toBe(5);
      });
    });

    describe('applyTransformationOptions', () => {
      it('should exclude specified fields', () => {
        const data = { id: '123', name: 'test', email: 'test@example.com', password: 'secret' };
        const result = applyTransformationOptions(data, {
          excludeFields: ['password', 'email'],
        });

        expect(result).toEqual({ id: '123', name: 'test' });
      });

      it('should include only specified fields', () => {
        const data = { id: '123', name: 'test', email: 'test@example.com', password: 'secret' };
        const result = applyTransformationOptions(data, {
          includeFields: ['id', 'name'],
        });

        expect(result).toEqual({ id: '123', name: 'test' });
      });

      it('should exclude null fields by default', () => {
        const data = { id: '123', name: 'test', email: null, bio: undefined };
        const result = applyTransformationOptions(data, {
          includeNullFields: false,
        });

        expect(result).toEqual({ id: '123', name: 'test' });
      });

      it('should include null fields when specified', () => {
        const data = { id: '123', name: 'test', email: null };
        const result = applyTransformationOptions(data, {
          includeNullFields: true,
        });

        expect(result).toEqual({ id: '123', name: 'test', email: null });
      });

      it('should return data unchanged when no options provided', () => {
        const data = { id: '123', name: 'test' };
        const result = applyTransformationOptions(data);

        expect(result).toEqual(data);
      });

      it('should handle empty object', () => {
        const result = applyTransformationOptions({}, {
          excludeFields: ['field1'],
        });

        expect(result).toEqual({});
      });
    });

    describe('createSafeTransformer', () => {
      it('should return transformed value on success', () => {
        const transformer = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => n / 2,
        };
        const safe = createSafeTransformer(transformer);

        expect(safe.transform(5)).toBe(10);
      });

      it('should return null on transformation error', () => {
        const transformer = {
          transform: (n: number) => {
            if (n < 0) throw new Error('Negative not allowed');
            return n * 2;
          },
          reverse: (n: number) => n / 2,
        };
        const safe = createSafeTransformer(transformer);

        expect(safe.transform(-5)).toBeNull();
      });

      it('should return null on reverse error', () => {
        const transformer = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => {
            if (n === 0) throw new Error('Cannot divide by zero');
            return n / 2;
          },
        };
        const safe = createSafeTransformer(transformer);

        expect(safe.reverse(0)).toBeNull();
      });

      it('should handle null input in reverse', () => {
        const transformer = {
          transform: (n: number) => n * 2,
          reverse: (n: number) => n / 2,
        };
        const safe = createSafeTransformer(transformer);

        expect(safe.reverse(null)).toBeNull();
      });

      it('should not throw errors', () => {
        const transformer = {
          transform: () => {
            throw new Error('Always fails');
          },
          reverse: () => {
            throw new Error('Always fails');
          },
        };
        const safe = createSafeTransformer(transformer);

        expect(() => safe.transform(5)).not.toThrow();
        expect(() => safe.reverse(10)).not.toThrow();
        expect(safe.transform(5)).toBeNull();
        expect(safe.reverse(10)).toBeNull();
      });
    });
  });
});
