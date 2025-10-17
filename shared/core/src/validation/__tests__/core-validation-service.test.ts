/**
 * Core Validation Service Tests
 *
 * Tests for the core validation service and adapter pattern implementation
 */

import { ZodSchema, z } from 'zod';
import { ValidationError } from '../types';
import { ZodValidationService, zodValidationService } from '../adapters/zod-adapter';
import { CustomValidationService, createCustomSchema } from '../adapters/custom-adapter';

describe('Core Validation Service', () => {
  describe('ZodValidationService', () => {
    const userSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      age: z.number().min(18),
    });

    let service: ZodValidationService;

    beforeEach(() => {
      service = new ZodValidationService();
    });

    describe('validate', () => {
      it('should validate valid data successfully', async () => {
        const validData = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        };

        const result = await service.validate(userSchema, validData);

        expect(result).toEqual(validData);
      });

      it('should throw ValidationError for invalid data', async () => {
        const invalidData = {
          name: 'J', // too short
          email: 'invalid-email',
          age: 15, // too young
        };

        await expect(service.validate(userSchema, invalidData)).rejects.toThrow(ValidationError);
      });

      it('should preprocess data when enabled', async () => {
        const stringData = {
          name: '  John Doe  ',
          email: 'john@example.com',
          age: '25', // string number
        };

        const result = await service.validate(userSchema, stringData);

        expect(result.name).toBe('John Doe'); // trimmed
        expect(result.age).toBe(25); // coerced to number
      });
    });

    describe('validateSafe', () => {
      it('should return success result for valid data', async () => {
        const validData = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        };

        const result = await service.validateSafe(userSchema, validData);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
        expect(result.error).toBeUndefined();
      });

      it('should return error result for invalid data', async () => {
        const invalidData = {
          name: 'J',
          email: 'invalid-email',
          age: 15,
        };

        const result = await service.validateSafe(userSchema, invalidData);

        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(ValidationError);
      });
    });

    describe('validateBatch', () => {
      it('should validate multiple items and separate valid/invalid', async () => {
        const batchData = [
          { name: 'John Doe', email: 'john@example.com', age: 25 }, // valid
          { name: 'J', email: 'invalid-email', age: 15 }, // invalid
          { name: 'Jane Smith', email: 'jane@example.com', age: 30 }, // valid
        ];

        const result = await service.validateBatch(userSchema, batchData);

        expect(result.totalCount).toBe(3);
        expect(result.validCount).toBe(2);
        expect(result.invalidCount).toBe(1);
        expect(result.valid).toHaveLength(2);
        expect(result.invalid).toHaveLength(1);
        expect(result.invalid[0].index).toBe(1);
      });
    });

    describe('schema registration', () => {
      it('should register and retrieve schemas', () => {
        service.registerSchema('user', userSchema, {
          description: 'User validation schema',
          tags: ['user', 'auth'],
        });

        const retrieved = service.getSchema('user');
        expect(retrieved).toBe(userSchema);

        const registered = service.getRegisteredSchemas();
        expect(registered).toHaveLength(1);
        expect(registered[0].name).toBe('user');
      });
    });

    describe('caching', () => {
      it('should cache validation results when enabled', async () => {
        const data = { name: 'John Doe', email: 'john@example.com', age: 25 };

        // First validation
        await service.validate(userSchema, data, { useCache: true });

        // Second validation should use cache
        const startTime = performance.now();
        await service.validate(userSchema, data, { useCache: true });
        const endTime = performance.now();

        // Should be very fast (cached)
        expect(endTime - startTime).toBeLessThan(1);

        const stats = service.getCacheStats();
        expect(stats.hitRate).toBeGreaterThan(0);
      });
    });

    describe('metrics', () => {
      it('should track validation metrics', async () => {
        const validData = { name: 'John Doe', email: 'john@example.com', age: 25 };
        const invalidData = { name: 'J', email: 'invalid-email', age: 15 };

        await service.validate(userSchema, validData);
        await expect(service.validate(userSchema, invalidData)).rejects.toThrow();

        const metrics = service.getMetrics();
        expect(metrics.totalValidations).toBe(2);
        expect(metrics.successfulValidations).toBe(1);
        expect(metrics.failedValidations).toBe(1);
      });
    });
  });

  describe('CustomValidationService', () => {
    const customValidateUser = (data: any) => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid user data');
      }

      if (!data.name || typeof data.name !== 'string' || data.name.length < 2) {
        throw new ValidationError('Invalid name', { field: 'name' });
      }

      if (!data.email || !data.email.includes('@')) {
        throw new ValidationError('Invalid email', { field: 'email' });
      }

      return {
        name: data.name,
        email: data.email,
        validated: true,
      };
    };

    let service: CustomValidationService;
    let customSchema: any;

    beforeEach(() => {
      service = new CustomValidationService();
      customSchema = createCustomSchema(customValidateUser, 'Custom user validation');
    });

    it('should validate using custom validation function', async () => {
      const validData = { name: 'John Doe', email: 'john@example.com' };

      const result = await service.validate(customSchema, validData);

      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        validated: true,
      });
    });

    it('should handle custom validation errors', async () => {
      const invalidData = { name: 'J', email: 'invalid' };

      await expect(service.validate(customSchema, invalidData)).rejects.toThrow(ValidationError);
    });
  });

  describe('Integration', () => {
    it('should work with default zodValidationService instance', async () => {
      const schema = z.object({
        message: z.string().min(1),
      });

      const result = await zodValidationService.validate(schema, { message: 'Hello' });

      expect(result).toEqual({ message: 'Hello' });
    });
  });
});