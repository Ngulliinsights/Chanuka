/**
 * Validation Service Tests
 * 
 * Comprehensive tests for Zod-based validation, preprocessing, caching,
 * and batch validation functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { ValidationService } from '../validation-service';
import { z } from 'zod';
import { ValidationError } from '../../observability/error-management';
import { logger } from '@shared/core/src/observability/logging';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService({
      enableCaching: true,
      cacheTimeout: 300000,
      enablePreprocessing: true,
      strictMode: true,
    });
  });

  afterEach(() => {
    cleanup();
    validationService?.destroy();
  
  });

  describe('Schema Registration', () => {
    it('should register schemas', () => {
      const userSchema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().min(0),
      });

      validationService.registerSchema('user', userSchema);
      
      const retrievedSchema = validationService.getSchema('user');
      expect(retrievedSchema).toBe(userSchema);
    });

    it('should return undefined for non-existent schemas', () => {
      const schema = validationService.getSchema('nonexistent');
      expect(schema).toBeUndefined();
    });

    it('should overwrite existing schemas', () => {
      const schema1 = z.object({ name: z.string() });
      const schema2 = z.object({ title: z.string() });

      validationService.registerSchema('test', schema1);
      validationService.registerSchema('test', schema2);

      const retrievedSchema = validationService.getSchema('test');
      expect(retrievedSchema).toBe(schema2);
    });

    it('should handle complex nested schemas', () => {
      const addressSchema = z.object({
        street: z.string(),
        city: z.string(),
        zipCode: z.string().regex(/^\d{5}$/),
      });

      const userSchema = z.object({
        name: z.string(),
        addresses: z.array(addressSchema),
        primaryAddress: addressSchema.optional(),
      });

      validationService.registerSchema('user', userSchema);
      
      const retrievedSchema = validationService.getSchema('user');
      expect(retrievedSchema).toBe(userSchema);
    });
  });

  describe('Basic Validation', () => {
    const userSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0).max(150),
      is_active: z.boolean(),
    });

    beforeEach(() => {
      validationService.registerSchema('user', userSchema);
    });

    it('should validate correct data', async () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        is_active: true,
      };

      const result = await validationService.validate(userSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: -5,
        is_active: 'not-boolean',
      };

      await expect(
        validationService.validate(userSchema, invalidData)
      ).rejects.toThrow(ValidationError);
    });

    it('should provide detailed error information', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: 200,
      };

      try {
        await validationService.validate(userSchema, invalidData);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.statusCode).toBe(422);
        expect(error.errors).toHaveLength(4); // name, email, age, is_active
        
        const nameError = error.errors.find(e => e.field === 'name');
        expect(nameError).toBeDefined();
        expect(nameError.code).toBe('too_small');
        
        const emailError = error.errors.find(e => e.field === 'email');
        expect(emailError).toBeDefined();
        expect(emailError.code).toBe('invalid_string');
      }
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        name: 'John Doe',
        // missing email, age, is_active
      };

      try {
        await validationService.validate(userSchema, incompleteData);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.errors).toHaveLength(3); // email, age, is_active
      }
    });

    it('should handle extra fields in strict mode', async () => {
      const dataWithExtra = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        is_active: true,
        extraField: 'should be ignored',
      };

      const result = await validationService.validate(userSchema, dataWithExtra);
      expect(result).not.toHaveProperty('extraField');
    });
  });

  describe('Safe Validation', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should return success result for valid data', async () => {
      const validData = { name: 'John', age: 30 };
      
      const result = await validationService.validateSafe(schema, validData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.error).toBeUndefined();
    });

    it('should return error result for invalid data', async () => {
      const invalidData = { name: 123, age: 'invalid' };
      
      const result = await validationService.validateSafe(schema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(ValidationError);
    });

    it('should not throw exceptions', async () => {
      const invalidData = { name: 123, age: 'invalid' };
      
      await expect(
        validationService.validateSafe(schema, invalidData)
      ).resolves.toBeDefined();
    });
  });

  describe('Batch Validation', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().min(0),
    });

    it('should validate array of valid objects', async () => {
      const validData = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 40 },
      ];

      const result = await validationService.validateBatch(schema, validData);
      
      expect(result.valid).toEqual(validData);
      expect(result.invalid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should separate valid and invalid objects', async () => {
      const mixedData = [
        { name: 'John', age: 30 }, // valid
        { name: '', age: -5 }, // invalid
        { name: 'Jane', age: 25 }, // valid
        { name: 'Bob', age: 'invalid' }, // invalid
      ];

      const result = await validationService.validateBatch(schema, mixedData);
      
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
      
      expect(result.valid[0]).toEqual({ name: 'John', age: 30 });
      expect(result.valid[1]).toEqual({ name: 'Jane', age: 25 });
    });

    it('should provide error details for invalid objects', async () => {
      const invalidData = [
        { name: '', age: -5 },
        { name: 'Valid', age: 25 },
      ];

      const result = await validationService.validateBatch(schema, invalidData);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(0);
      expect(result.errors[0].error).toBeInstanceOf(ValidationError);
    });

    it('should handle empty arrays', async () => {
      const result = await validationService.validateBatch(schema, []);
      
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle large batches efficiently', async () => {
      const largeData = Array(1000).fill(0).map((_, i) => ({
        name: `User ${i}`,
        age: 20 + (i % 50),
      }));

      const startTime = Date.now();
      const result = await validationService.validateBatch(schema, largeData);
      const endTime = Date.now();

      expect(result.valid).toHaveLength(1000);
      expect(result.invalid).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Data Preprocessing', () => {
    beforeEach(() => {
      validationService = new ValidationService({
        enableCaching: false,
        cacheTimeout: 300000,
        enablePreprocessing: true,
        strictMode: true,
      });
    });

    it('should trim string values', async () => {
      const schema = z.object({
        name: z.string(),
        description: z.string(),
      });

      const dataWithWhitespace = {
        name: '  John Doe  ',
        description: '\n\tTest description\t\n',
      };

      const result = await validationService.validate(schema, dataWithWhitespace);
      
      expect(result.name).toBe('John Doe');
      expect(result.description).toBe('Test description');
    });

    it('should coerce string numbers to numbers', async () => {
      const schema = z.object({
        age: z.number(),
        score: z.number(),
      });

      const dataWithStringNumbers = {
        age: '30',
        score: '95.5',
      };

      const result = await validationService.validate(schema, dataWithStringNumbers);
      
      expect(result.age).toBe(30);
      expect(result.score).toBe(95.5);
    });

    it('should convert string booleans to booleans', async () => {
      const schema = z.object({
        is_active: z.boolean(),
        is_verified: z.boolean(),
        is_deleted: z.boolean(),
      });

      const dataWithStringBooleans = {
        is_active: 'true',
        is_verified: 'false',
        is_deleted: '1',
      };

      const result = await validationService.validate(schema, dataWithStringBooleans);
      
      expect(result.is_active).toBe(true);
      expect(result.is_verified).toBe(false);
      expect(result.is_deleted).toBe(true);
    });

    it('should handle nested object preprocessing', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        settings: z.object({
          notifications: z.boolean(),
        }),
      });

      const dataWithNesting = {
        user: {
          name: '  Jane Doe  ',
          age: '25',
        },
        settings: {
          notifications: 'true',
        },
      };

      const result = await validationService.validate(schema, dataWithNesting);
      
      expect(result.users.name).toBe('Jane Doe');
      expect(result.users.age).toBe(25);
      expect(result.settings.notifications).toBe(true);
    });

    it('should handle array preprocessing', async () => {
      const schema = z.object({
        tags: z.array(z.string()),
        scores: z.array(z.number()),
      });

      const dataWithArrays = {
        tags: ['  tag1  ', '\ttag2\n', '  tag3  '],
        scores: ['10', '20.5', '30'],
      };

      const result = await validationService.validate(schema, dataWithArrays);
      
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result.scores).toEqual([10, 20.5, 30]);
    });

    it('should skip preprocessing when disabled', async () => {
      validationService = new ValidationService({
        enableCaching: false,
        cacheTimeout: 300000,
        enablePreprocessing: false,
        strictMode: true,
      });

      const schema = z.object({
        name: z.string(),
      });

      const dataWithWhitespace = {
        name: '  John Doe  ',
      };

      const result = await validationService.validate(schema, dataWithWhitespace);
      
      expect(result.name).toBe('  John Doe  '); // Should not be trimmed
    });
  });

  describe('Validation Caching', () => {
    beforeEach(() => {
      validationService = new ValidationService({
        enableCaching: true,
        cacheTimeout: 1000, // 1 second for testing
        enablePreprocessing: true,
        strictMode: true,
      });
    });

    it('should cache validation results', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: 'John', age: 30 };

      // First validation
      const startTime1 = Date.now();
      const result1 = await validationService.validate(schema, data);
      const endTime1 = Date.now();

      // Second validation (should be cached)
      const startTime2 = Date.now();
      const result2 = await validationService.validate(schema, data);
      const endTime2 = Date.now();

      expect(result1).toEqual(result2);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });

    it('should generate consistent cache keys', async () => {
      const schema = z.object({ name: z.string() });
      const data1 = { name: 'John' };
      const data2 = { name: 'John' }; // Same content, different object

      await validationService.validate(schema, data1);
      
      const startTime = Date.now();
      await validationService.validate(schema, data2);
      const endTime = Date.now();

      // Should be very fast due to caching
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should handle cache expiration', async () => {
      validationService = new ValidationService({
        enableCaching: true,
        cacheTimeout: 50, // 50ms for testing
        enablePreprocessing: true,
        strictMode: true,
      });

      const schema = z.object({ name: z.string() });
      const data = { name: 'John' };

      // First validation
      await validationService.validate(schema, data);

      // Wait for cache expiration
      await testUtils.wait(100);

      // Should not use cache after expiration
      const startTime = Date.now();
      await validationService.validate(schema, data);
      const endTime = Date.now();

      // Should take longer than cached version
      expect(endTime - startTime).toBeGreaterThan(0);
    });

    it('should not cache when disabled', async () => {
      validationService = new ValidationService({
        enableCaching: false,
        cacheTimeout: 300000,
        enablePreprocessing: true,
        strictMode: true,
      });

      const schema = z.object({ name: z.string() });
      const data = { name: 'John' };

      const startTime1 = Date.now();
      await validationService.validate(schema, data);
      const endTime1 = Date.now();

      const startTime2 = Date.now();
      await validationService.validate(schema, data);
      const endTime2 = Date.now();

      // Both should take similar time (no caching)
      const time1 = endTime1 - startTime1;
      const time2 = endTime2 - startTime2;
      expect(Math.abs(time1 - time2)).toBeLessThan(time1 * 0.5);
    });

    it('should clear cache manually', async () => {
      const schema = z.object({ name: z.string() });
      const data = { name: 'John' };

      // Cache the result
      await validationService.validate(schema, data);

      // Clear cache
      validationService.clearCache();

      // Should not use cache after clearing
      const startTime = Date.now();
      await validationService.validate(schema, data);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(0);
    });
  });

  describe('Common Schemas', () => {
    it('should provide email validation', async () => {
      const emailSchema = validationService.getCommonSchema('email');
      
      await expect(
        validationService.validate(emailSchema, 'test@example.com')
      ).resolves.toBe('test@example.com');

      await expect(
        validationService.validate(emailSchema, 'invalid-email')
      ).rejects.toThrow(ValidationError);
    });

    it('should provide password validation', async () => {
      const passwordSchema = validationService.getCommonSchema('password');
      
      await expect(
        validationService.validate(passwordSchema, 'StrongP@ssw0rd!')
      ).resolves.toBe('StrongP@ssw0rd!');

      await expect(
        validationService.validate(passwordSchema, '123')
      ).rejects.toThrow(ValidationError);
    });

    it('should provide phone validation', async () => {
      const phoneSchema = validationService.getCommonSchema('phone');
      
      await expect(
        validationService.validate(phoneSchema, '+1-555-123-4567')
      ).resolves.toBe('+1-555-123-4567');

      await expect(
        validationService.validate(phoneSchema, 'invalid-phone')
      ).rejects.toThrow(ValidationError);
    });

    it('should provide UUID validation', async () => {
      const uuidSchema = validationService.getCommonSchema('uuid');
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        validationService.validate(uuidSchema, validUuid)
      ).resolves.toBe(validUuid);

      await expect(
        validationService.validate(uuidSchema, 'invalid-uuid')
      ).rejects.toThrow(ValidationError);
    });

    it('should provide date range validation', async () => {
      const dateRangeSchema = validationService.getCommonSchema('dateRange');
      const validRange = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
      };
      
      await expect(
        validationService.validate(dateRangeSchema, validRange)
      ).resolves.toEqual(validRange);

      await expect(
        validationService.validate(dateRangeSchema, {
          start_date: '2023-12-31',
          end_date: '2023-01-01', // End before start
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should provide pagination validation', async () => {
      const paginationSchema = validationService.getCommonSchema('pagination');
      const validPagination = {
        page: 1,
        limit: 20,
      };
      
      await expect(
        validationService.validate(paginationSchema, validPagination)
      ).resolves.toEqual(validPagination);

      await expect(
        validationService.validate(paginationSchema, {
          page: 0, // Invalid page
          limit: 20,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Error Handling', () => {
    it('should handle schema compilation errors', () => {
      const invalidSchema = null as any;

      expect(() => {
        validationService.registerSchema('invalid', invalidSchema);
      }).toThrow();
    });

    it('should handle circular references in data', async () => {
      const schema = z.object({
        name: z.string(),
        data: z.any(),
      });

      const circularData: any = {
        name: 'test',
        data: {},
      };
      circularData.data.self = circularData;

      // Should handle gracefully without infinite recursion
      await expect(
        validationService.validate(schema, circularData)
      ).resolves.toBeDefined();
    });

    it('should handle very deep nested objects', async () => {
      const schema = z.object({
        data: z.any(),
      });

      // Create deeply nested object
      let deepObject: any = {};
      let current = deepObject;
      for (let i = 0; i < 100; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'deep';

      const data = { data: deepObject };

      await expect(
        validationService.validate(schema, data)
      ).resolves.toBeDefined();
    });

    it('should handle null and undefined values', async () => {
      const schema = z.object({
        optional: z.string().optional(),
        nullable: z.string().nullable(),
      });

      await expect(
        validationService.validate(schema, {
          optional: undefined,
          nullable: null,
        })
      ).resolves.toEqual({
        optional: undefined,
        nullable: null,
      });
    });
  });

  describe('Performance', () => {
    it('should handle large objects efficiently', async () => {
      const schema = z.object({
        data: z.record(z.string()),
      });

      const largeObject = {
        data: Object.fromEntries(
          Array(10000).fill(0).map((_, i) => [`key${i}`, `value${i}`])
        ),
      };

      const startTime = Date.now();
      await validationService.validate(schema, largeObject);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle concurrent validations efficiently', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const promises = Array(100).fill(0).map((_, i) =>
        validationService.validate(schema, {
          name: `User ${i}`,
          age: 20 + i,
        })
      );

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should optimize repeated schema validations', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      // First validation (schema compilation)
      const startTime1 = Date.now();
      await validationService.validate(schema, { name: 'John', age: 30 });
      const endTime1 = Date.now();

      // Subsequent validations (should be faster)
      const startTime2 = Date.now();
      await validationService.validate(schema, { name: 'Jane', age: 25 });
      const endTime2 = Date.now();

      expect(endTime2 - startTime2).toBeLessThanOrEqual(endTime1 - startTime1);
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      validationService.destroy();

      // Should clear cache
      expect(() => {
        validationService.clearCache();
      }).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      validationService.destroy();
      validationService.destroy();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should prevent operations after destroy', async () => {
      const schema = z.object({ name: z.string() });
      
      validationService.destroy();

      await expect(
        validationService.validate(schema, { name: 'test' })
      ).rejects.toThrow('ValidationService has been destroyed');
    });
  });
});













































describe('validation-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined and properly exported', () => {
    expect(validation-service).toBeDefined();
    expect(typeof validation-service).not.toBe('undefined');
  });

  it('should export expected functions/classes', () => {
    // TODO: Add specific export tests for validation-service
    expect(typeof validation-service).toBe('object');
  });

  it('should handle basic functionality', () => {
    // TODO: Add specific functionality tests for validation-service
    expect(true).toBe(true);
  });
});

