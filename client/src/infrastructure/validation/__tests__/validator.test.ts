/**
 * Validator Tests
 *
 * Tests for the core validator implementation and error handling integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { validator, validateField, validateForm, validateSchema } from '../validator';
import { coreErrorHandler } from '../../error/handler';
import { ErrorDomain } from '../../error/constants';

describe('Validator', () => {
  beforeEach(() => {
    // Clear any previous errors
    coreErrorHandler.clearErrors();
  });

  describe('validateField', () => {
    it('should validate required field', () => {
      const result = validateField('email', '', { required: true });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].field).toBe('email');
      expect(result.errors?.[0].code).toBe('REQUIRED');
    });

    it('should validate email format', () => {
      const result = validateField('email', 'invalid-email', { email: true });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].code).toBe('INVALID_FORMAT');
    });

    it('should validate string length', () => {
      const result = validateField('username', 'ab', { minLength: 3, maxLength: 20 });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].code).toBe('MIN_LENGTH');
    });

    it('should validate number range', () => {
      const result = validateField('age', 15, { min: 18, max: 120 });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].code).toBe('MIN_VALUE');
    });

    it('should validate pattern', () => {
      const result = validateField('username', 'user name', {
        pattern: /^[a-zA-Z0-9_-]+$/,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].code).toBe('PATTERN_MISMATCH');
    });

    it('should validate custom rules', () => {
      const result = validateField('username', 'admin', {
        custom: [
          {
            name: 'noReservedWords',
            test: value => !['admin', 'root'].includes(String(value).toLowerCase()),
            message: 'This username is reserved',
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].message).toBe('This username is reserved');
    });

    it('should pass valid field', () => {
      const result = validateField('email', 'user@example.com', {
        required: true,
        email: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('user@example.com');
      expect(result.errors).toBeUndefined();
    });
  });

  describe('validateForm', () => {
    it('should validate entire form', () => {
      const formData = {
        email: 'invalid',
        password: '123',
        age: 15,
      };

      const schema = {
        email: { required: true, email: true },
        password: { required: true, minLength: 8 },
        age: { required: true, min: 18 },
      };

      const result = validateForm(formData, schema);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors?.map(e => e.field)).toContain('email');
      expect(result.errors?.map(e => e.field)).toContain('password');
      expect(result.errors?.map(e => e.field)).toContain('age');
    });

    it('should pass valid form', () => {
      const formData = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        age: 25,
      };

      const schema = {
        email: { required: true, email: true },
        password: { required: true, minLength: 8 },
        age: { required: true, min: 18 },
      };

      const result = validateForm(formData, schema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(formData);
      expect(result.errors).toBeUndefined();
    });

    it('should integrate with error handler', () => {
      const formData = {
        email: 'invalid',
      };

      const schema = {
        email: { required: true, email: true },
      };

      const result = validateForm(formData, schema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(ErrorDomain.VALIDATION);

      // Check that error was tracked
      const recentErrors = coreErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].type).toBe(ErrorDomain.VALIDATION);
    });
  });

  describe('validateSchema', () => {
    it('should validate with Zod schema', () => {
      const userSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        age: z.number().min(18).max(120),
      });

      const invalidData = {
        id: 'not-a-uuid',
        email: 'invalid-email',
        age: 15,
      };

      const result = validateSchema(userSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should pass valid Zod schema', () => {
      const userSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        age: z.number().min(18).max(120),
      });

      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        age: 25,
      };

      const result = validateSchema(userSchema, validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should integrate Zod errors with error handler', () => {
      const userSchema = z.object({
        email: z.string().email(),
      });

      const result = validateSchema(userSchema, { email: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(ErrorDomain.VALIDATION);

      // Check that error was tracked
      const recentErrors = coreErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].type).toBe(ErrorDomain.VALIDATION);
    });
  });

  describe('async validation', () => {
    it('should perform async validation', async () => {
      const checkUsernameExists = vi.fn().mockResolvedValue(true);

      const result = await validator.validateAsync('existinguser', {
        required: true,
        custom: [
          {
            name: 'uniqueUsername',
            test: async value => {
              const exists = await checkUsernameExists(value);
              return !exists;
            },
            message: 'Username is already taken',
            async: true,
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].message).toBe('Username is already taken');
      expect(checkUsernameExists).toHaveBeenCalledWith('existinguser');
    });

    it('should pass async validation', async () => {
      const checkUsernameExists = vi.fn().mockResolvedValue(false);

      const result = await validator.validateAsync('newuser', {
        required: true,
        custom: [
          {
            name: 'uniqueUsername',
            test: async value => {
              const exists = await checkUsernameExists(value);
              return !exists;
            },
            message: 'Username is already taken',
            async: true,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('newuser');
    });
  });

  describe('error tracking', () => {
    it('should track validation errors in observability', () => {
      const result = validateField('email', 'invalid', { email: true });

      expect(result.success).toBe(false);

      // Validation errors should be tracked
      const stats = coreErrorHandler.getErrorStats();
      expect(stats.byType[ErrorDomain.VALIDATION]).toBeGreaterThan(0);
    });

    it('should include field information in error context', () => {
      validateField('email', 'invalid', { email: true });

      const recentErrors = coreErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].details?.fields).toBeDefined();
    });
  });
});
