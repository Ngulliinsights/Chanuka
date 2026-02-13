/**
 * Unit Tests for Error Transformation
 *
 * Tests the transformation of various error types into StandardError format.
 * Validates: Requirements 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ZodError, z } from 'zod';
import {
  transformDatabaseError,
  transformValidationError,
  transformNetworkError,
  toStandardError,
  createStandardError,
} from '@shared/utils/errors/transform';
import {
  setCurrentCorrelationId,
  clearCurrentCorrelationId,
  generateCorrelationId,
} from '@shared/utils/errors/correlation-id';
import { ERROR_CODES } from '@shared/constants';
import { ErrorClassification } from '@shared/types/core/errors';

describe('Error Transformation Unit Tests', () => {
  // Clean up correlation ID after each test
  afterEach(() => {
    clearCurrentCorrelationId();
  });

  describe('transformDatabaseError', () => {
    it('should transform PostgreSQL unique constraint violation (23505)', () => {
      const pgError = {
        code: '23505',
        constraint: 'users_email_unique',
        table: 'users',
        detail: 'Key (email)=(test@example.com) already exists.',
      };

      const result = transformDatabaseError(pgError);

      expect(result.code).toBe(ERROR_CODES.DUPLICATE_RESOURCE);
      expect(result.classification).toBe(ErrorClassification.Validation);
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.details).toEqual({
        constraint: 'users_email_unique',
        table: 'users',
        detail: 'Key (email)=(test@example.com) already exists.',
      });
    });

    it('should transform PostgreSQL foreign key violation (23503)', () => {
      const pgError = {
        code: '23503',
        constraint: 'bills_sponsor_id_fkey',
        table: 'bills',
        detail: 'Key (sponsor_id)=(123) is not present in table "users".',
      };

      const result = transformDatabaseError(pgError);

      expect(result.code).toBe(ERROR_CODES.INVALID_INPUT);
      expect(result.message).toBe('Referenced resource does not exist');
      expect(result.classification).toBe(ErrorClassification.Validation);
      expect(result.details).toEqual({
        constraint: 'bills_sponsor_id_fkey',
        table: 'bills',
        detail: 'Key (sponsor_id)=(123) is not present in table "users".',
      });
    });

    it('should transform PostgreSQL not null violation (23502)', () => {
      const pgError = {
        code: '23502',
        column: 'email',
        table: 'users',
      };

      const result = transformDatabaseError(pgError);

      expect(result.code).toBe(ERROR_CODES.MISSING_REQUIRED_FIELD);
      expect(result.classification).toBe(ErrorClassification.Validation);
      expect(result.details).toEqual({
        column: 'email',
        table: 'users',
      });
    });

    it('should transform PostgreSQL check constraint violation (23514)', () => {
      const pgError = {
        code: '23514',
        constraint: 'users_age_check',
        table: 'users',
      };

      const result = transformDatabaseError(pgError);

      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.classification).toBe(ErrorClassification.Validation);
      expect(result.details).toEqual({
        constraint: 'users_age_check',
        table: 'users',
      });
    });

    it('should transform generic database error', () => {
      const genericError = new Error('Connection timeout');

      const result = transformDatabaseError(genericError);

      expect(result.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(result.classification).toBe(ErrorClassification.Server);
      expect(result.details).toEqual({
        originalError: 'Connection timeout',
      });
    });

    it('should transform unknown database error', () => {
      const unknownError = { unknown: 'error' };

      const result = transformDatabaseError(unknownError);

      expect(result.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(result.classification).toBe(ErrorClassification.Server);
      expect(result.details?.originalError).toBeDefined();
    });

    it('should use existing correlation ID when available', () => {
      const testCorrelationId = 'test-correlation-123';
      setCurrentCorrelationId(testCorrelationId);

      const pgError = { code: '23505', constraint: 'test', table: 'test', detail: 'test' };
      const result = transformDatabaseError(pgError);

      expect(result.correlationId).toBe(testCorrelationId);
    });

    it('should generate new correlation ID when none exists', () => {
      const pgError = { code: '23505', constraint: 'test', table: 'test', detail: 'test' };
      const result = transformDatabaseError(pgError);

      expect(result.correlationId).toBeDefined();
      expect(typeof result.correlationId).toBe('string');
      expect(result.correlationId.length).toBeGreaterThan(0);
    });
  });

  describe('transformValidationError', () => {
    it('should transform Zod validation error with single field', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid' });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = transformValidationError(zodError!);

      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.classification).toBe(ErrorClassification.Validation);
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.details?.fields).toBeDefined();
      expect(result.details?.errors).toBeDefined();
    });

    it('should transform Zod validation error with multiple fields', () => {
      const schema = z.object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(8),
      });

      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid', username: 'ab', password: '123' });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = transformValidationError(zodError!);

      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.classification).toBe(ErrorClassification.Validation);
      expect(result.details?.fields).toBeDefined();
      
      const fields = result.details?.fields as Record<string, string[]>;
      expect(Object.keys(fields).length).toBeGreaterThan(0);
    });

    it('should transform Zod validation error with nested fields', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            firstName: z.string().min(1),
          }),
        }),
      });

      let zodError: ZodError;
      try {
        schema.parse({ user: { profile: { firstName: '' } } });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = transformValidationError(zodError!);

      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.details?.errors).toBeDefined();
      
      const errors = result.details?.errors as Array<{ path: string; message: string; code: string }>;
      expect(errors.some(err => err.path.includes('user.profile.firstName'))).toBe(true);
    });

    it('should group multiple errors for the same field', () => {
      const schema = z.object({
        password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
      });

      let zodError: ZodError;
      try {
        schema.parse({ password: 'short' });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = transformValidationError(zodError!);

      const fields = result.details?.fields as Record<string, string[]>;
      expect(fields.password).toBeDefined();
      expect(Array.isArray(fields.password)).toBe(true);
    });

    it('should use existing correlation ID when available', () => {
      const testCorrelationId = 'test-correlation-456';
      setCurrentCorrelationId(testCorrelationId);

      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid' });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = transformValidationError(zodError!);

      expect(result.correlationId).toBe(testCorrelationId);
    });
  });

  describe('transformNetworkError', () => {
    it('should transform timeout error by name', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      const result = transformNetworkError(timeoutError);

      expect(result.code).toBe(ERROR_CODES.TIMEOUT);
      expect(result.classification).toBe(ErrorClassification.Network);
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.details?.originalError).toBe('Request timeout');
    });

    it('should transform timeout error by message', () => {
      const timeoutError = new Error('Connection timeout after 30s');

      const result = transformNetworkError(timeoutError);

      expect(result.code).toBe(ERROR_CODES.TIMEOUT);
      expect(result.classification).toBe(ErrorClassification.Network);
      expect(result.details?.originalError).toBe('Connection timeout after 30s');
    });

    it('should transform service unavailable error (503)', () => {
      const serviceError = {
        status: 503,
        statusText: 'Service Unavailable',
      };

      const result = transformNetworkError(serviceError);

      expect(result.code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(result.classification).toBe(ErrorClassification.Network);
      expect(result.details).toEqual({
        status: 503,
        statusText: 'Service Unavailable',
      });
    });

    it('should transform generic network error', () => {
      const networkError = new Error('Network connection failed');

      const result = transformNetworkError(networkError);

      expect(result.code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(result.classification).toBe(ErrorClassification.Network);
      expect(result.details?.originalError).toBe('Network connection failed');
    });

    it('should transform unknown network error', () => {
      const unknownError = { unknown: 'network issue' };

      const result = transformNetworkError(unknownError);

      expect(result.code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(result.classification).toBe(ErrorClassification.Network);
      expect(result.details?.originalError).toBeDefined();
    });

    it('should use existing correlation ID when available', () => {
      const testCorrelationId = 'test-correlation-789';
      setCurrentCorrelationId(testCorrelationId);

      const networkError = new Error('Network error');
      const result = transformNetworkError(networkError);

      expect(result.correlationId).toBe(testCorrelationId);
    });
  });

  describe('toStandardError', () => {
    it('should return StandardError unchanged', () => {
      const standardError = {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Test error',
        classification: ErrorClassification.Validation,
        correlationId: 'test-123',
        timestamp: new Date(),
      };

      const result = toStandardError(standardError);

      expect(result).toEqual(standardError);
    });

    it('should transform ZodError', () => {
      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid' });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = toStandardError(zodError!);

      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.classification).toBe(ErrorClassification.Validation);
    });

    it('should transform PostgreSQL error', () => {
      const pgError = {
        code: '23505',
        constraint: 'test_unique',
        table: 'test',
        detail: 'Duplicate key',
      };

      const result = toStandardError(pgError);

      expect(result.code).toBe(ERROR_CODES.DUPLICATE_RESOURCE);
      expect(result.classification).toBe(ErrorClassification.Validation);
    });

    it('should transform HTTP 401 error', () => {
      const httpError = {
        status: 401,
        statusText: 'Unauthorized',
      };

      const result = toStandardError(httpError);

      expect(result.code).toBe(ERROR_CODES.NOT_AUTHENTICATED);
      expect(result.classification).toBe(ErrorClassification.Authorization);
    });

    it('should transform HTTP 403 error', () => {
      const httpError = {
        status: 403,
        statusText: 'Forbidden',
      };

      const result = toStandardError(httpError);

      expect(result.code).toBe(ERROR_CODES.ACCESS_DENIED);
      expect(result.classification).toBe(ErrorClassification.Authorization);
    });

    it('should transform HTTP 404 error', () => {
      const httpError = {
        status: 404,
        statusText: 'Not Found',
      };

      const result = toStandardError(httpError);

      expect(result.code).toBe(ERROR_CODES.BILL_NOT_FOUND);
      expect(result.classification).toBe(ErrorClassification.Validation);
    });

    it('should transform HTTP 500+ error', () => {
      const httpError = {
        status: 500,
        statusText: 'Internal Server Error',
      };

      const result = toStandardError(httpError);

      expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.classification).toBe(ErrorClassification.Server);
    });

    it('should transform error with known error code', () => {
      const errorWithCode = {
        code: ERROR_CODES.INVALID_EMAIL,
        message: 'Invalid email format',
      };

      const result = toStandardError(errorWithCode);

      expect(result.code).toBe(ERROR_CODES.INVALID_EMAIL);
      expect(result.classification).toBe(ErrorClassification.Validation);
    });

    it('should transform generic Error object', () => {
      const error = new Error('Something went wrong');

      const result = toStandardError(error);

      expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.message).toBe('Something went wrong');
      expect(result.classification).toBe(ErrorClassification.Server);
      expect(result.stack).toBeDefined();
    });

    it('should transform unknown error', () => {
      const unknownError = 'string error';

      const result = toStandardError(unknownError);

      expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.classification).toBe(ErrorClassification.Server);
      expect(result.details?.originalError).toBe('string error');
    });
  });

  describe('createStandardError', () => {
    it('should create StandardError with code and default message', () => {
      const result = createStandardError(ERROR_CODES.VALIDATION_ERROR);

      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.message).toBeDefined();
      expect(result.classification).toBe(ErrorClassification.Validation);
      expect(result.correlationId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should create StandardError with custom message', () => {
      const customMessage = 'Custom validation error message';
      const result = createStandardError(ERROR_CODES.VALIDATION_ERROR, customMessage);

      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.message).toBe(customMessage);
      expect(result.classification).toBe(ErrorClassification.Validation);
    });

    it('should create StandardError with details', () => {
      const details = { field: 'email', value: 'invalid' };
      const result = createStandardError(ERROR_CODES.INVALID_EMAIL, undefined, details);

      expect(result.code).toBe(ERROR_CODES.INVALID_EMAIL);
      expect(result.details).toEqual(details);
    });

    it('should use existing correlation ID when available', () => {
      const testCorrelationId = 'test-correlation-create';
      setCurrentCorrelationId(testCorrelationId);

      const result = createStandardError(ERROR_CODES.VALIDATION_ERROR);

      expect(result.correlationId).toBe(testCorrelationId);
    });
  });

  describe('Correlation ID Propagation', () => {
    it('should propagate correlation ID through database error transformation', () => {
      const correlationId = generateCorrelationId();
      setCurrentCorrelationId(correlationId);

      const pgError = { code: '23505', constraint: 'test', table: 'test', detail: 'test' };
      const result = transformDatabaseError(pgError);

      expect(result.correlationId).toBe(correlationId);
    });

    it('should propagate correlation ID through validation error transformation', () => {
      const correlationId = generateCorrelationId();
      setCurrentCorrelationId(correlationId);

      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid' });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = transformValidationError(zodError!);

      expect(result.correlationId).toBe(correlationId);
    });

    it('should propagate correlation ID through network error transformation', () => {
      const correlationId = generateCorrelationId();
      setCurrentCorrelationId(correlationId);

      const networkError = new Error('Network error');
      const result = transformNetworkError(networkError);

      expect(result.correlationId).toBe(correlationId);
    });

    it('should propagate correlation ID through toStandardError', () => {
      const correlationId = generateCorrelationId();
      setCurrentCorrelationId(correlationId);

      const error = new Error('Test error');
      const result = toStandardError(error);

      expect(result.correlationId).toBe(correlationId);
    });

    it('should generate unique correlation IDs for different errors', () => {
      const error1 = transformDatabaseError(new Error('Error 1'));
      const error2 = transformDatabaseError(new Error('Error 2'));

      expect(error1.correlationId).not.toBe(error2.correlationId);
    });

    it('should maintain same correlation ID across multiple transformations', () => {
      const correlationId = generateCorrelationId();
      setCurrentCorrelationId(correlationId);

      const dbError = transformDatabaseError(new Error('DB error'));
      const networkError = transformNetworkError(new Error('Network error'));
      const genericError = toStandardError(new Error('Generic error'));

      expect(dbError.correlationId).toBe(correlationId);
      expect(networkError.correlationId).toBe(correlationId);
      expect(genericError.correlationId).toBe(correlationId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error', () => {
      const result = toStandardError(null);

      expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.classification).toBe(ErrorClassification.Server);
    });

    it('should handle undefined error', () => {
      const result = toStandardError(undefined);

      expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.classification).toBe(ErrorClassification.Server);
    });

    it('should handle error with circular references', () => {
      const circularError: any = { message: 'Circular' };
      circularError.self = circularError;

      const result = toStandardError(circularError);

      expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.classification).toBe(ErrorClassification.Server);
    });

    it('should handle error with empty message', () => {
      const error = new Error('');

      const result = toStandardError(error);

      expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.message).toBeDefined();
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should handle database error with missing properties', () => {
      const incompleteError = { code: '23505' };

      const result = transformDatabaseError(incompleteError);

      expect(result.code).toBe(ERROR_CODES.DUPLICATE_RESOURCE);
      expect(result.classification).toBe(ErrorClassification.Validation);
    });

    it('should handle network error with non-503 status', () => {
      const networkError = { status: 502 };

      const result = transformNetworkError(networkError);

      expect(result.code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(result.classification).toBe(ErrorClassification.Network);
    });
  });
});
