/**
 * Property-Based Test: Error Structure Consistency
 * 
 * Property 11: For any error that occurs in any layer, it should be transformed 
 * to a standard error structure with consistent classification (validation, 
 * authorization, server, network), include correlation IDs, and maintain this 
 * structure as it propagates through layers.
 * 
 * Feature: full-stack-integration, Property 11: Error Structure Consistency
 * Validates: Requirements 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ZodError, z } from 'zod';
import {
  StandardError,
  ErrorClassification,
  isStandardError,
  getHttpStatusFromClassification,
  getClassificationFromErrorCode,
} from '../../shared/types/core/errors';
import {
  transformDatabaseError,
  transformValidationError,
  transformNetworkError,
  toStandardError,
  createStandardError,
} from '../../shared/utils/errors/transform';
import {
  generateCorrelationId,
  setCurrentCorrelationId,
  getCurrentCorrelationId,
  clearCurrentCorrelationId,
} from '../../shared/utils/errors/correlation-id';
import { ERROR_CODES, type ErrorCode } from '../../shared/constants';

describe('Feature: full-stack-integration, Property 11: Error Structure Consistency', () => {
  beforeEach(() => {
    // Clear correlation ID before each test
    clearCurrentCorrelationId();
  });

  it('should transform database errors to StandardError with consistent structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary database error scenarios
        fc.record({
          errorType: fc.constantFrom(
            'unique_violation',
            'foreign_key_violation',
            'not_null_violation',
            'check_constraint_violation',
            'generic_db_error'
          ),
          constraint: fc.string({ minLength: 3, maxLength: 50 }),
          table: fc.string({ minLength: 3, maxLength: 50 }),
          column: fc.string({ minLength: 2, maxLength: 30 }),
          detail: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        async ({ errorType, constraint, table, column, detail }) => {
          // Create database error based on type
          let dbError: any;
          switch (errorType) {
            case 'unique_violation':
              dbError = { code: '23505', constraint, table, detail };
              break;
            case 'foreign_key_violation':
              dbError = { code: '23503', constraint, table, detail };
              break;
            case 'not_null_violation':
              dbError = { code: '23502', column, table };
              break;
            case 'check_constraint_violation':
              dbError = { code: '23514', constraint, table };
              break;
            default:
              dbError = new Error('Database connection failed');
          }

          // Transform the error
          const standardError = transformDatabaseError(dbError);

          // Property 1: Result should be a StandardError
          expect(isStandardError(standardError)).toBe(true);

          // Property 2: Should have all required fields
          expect(standardError).toHaveProperty('code');
          expect(standardError).toHaveProperty('message');
          expect(standardError).toHaveProperty('classification');
          expect(standardError).toHaveProperty('correlationId');
          expect(standardError).toHaveProperty('timestamp');

          // Property 3: Classification should be valid
          expect(Object.values(ErrorClassification)).toContain(standardError.classification);

          // Property 4: Correlation ID should be a non-empty string
          expect(typeof standardError.correlationId).toBe('string');
          expect(standardError.correlationId.length).toBeGreaterThan(0);

          // Property 5: Timestamp should be a Date object
          expect(standardError.timestamp).toBeInstanceOf(Date);

          // Property 6: Code should be a valid ErrorCode
          expect(typeof standardError.code).toBe('string');

          // Property 7: Message should be a non-empty string
          expect(typeof standardError.message).toBe('string');
          expect(standardError.message.length).toBeGreaterThan(0);

          // Property 8: Validation errors should have Validation classification
          if (errorType === 'unique_violation' || errorType === 'foreign_key_violation' || 
              errorType === 'not_null_violation' || errorType === 'check_constraint_violation') {
            expect(standardError.classification).toBe(ErrorClassification.Validation);
          }

          // Property 9: Server errors should have Server classification
          if (errorType === 'generic_db_error') {
            expect(standardError.classification).toBe(ErrorClassification.Server);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should transform validation errors to StandardError with consistent structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary validation error scenarios
        fc.record({
          fieldName: fc.string({ minLength: 1, maxLength: 30 }),
          errorMessage: fc.string({ minLength: 5, maxLength: 100 }),
          errorCode: fc.constantFrom('invalid_type', 'too_small', 'too_big', 'invalid_string'),
        }),
        async ({ fieldName, errorMessage, errorCode }) => {
          // Create a Zod validation error
          const schema = z.object({
            [fieldName]: z.string().min(10),
          });

          let zodError: ZodError;
          try {
            schema.parse({ [fieldName]: 'short' });
            // If validation passes, create a manual error
            zodError = new ZodError([
              {
                code: errorCode as any,
                path: [fieldName],
                message: errorMessage,
              },
            ]);
          } catch (error) {
            zodError = error as ZodError;
          }

          // Transform the error
          const standardError = transformValidationError(zodError);

          // Property 1: Result should be a StandardError
          expect(isStandardError(standardError)).toBe(true);

          // Property 2: Should have all required fields
          expect(standardError).toHaveProperty('code');
          expect(standardError).toHaveProperty('message');
          expect(standardError).toHaveProperty('classification');
          expect(standardError).toHaveProperty('correlationId');
          expect(standardError).toHaveProperty('timestamp');

          // Property 3: Classification should be Validation
          expect(standardError.classification).toBe(ErrorClassification.Validation);

          // Property 4: Code should be VALIDATION_ERROR
          expect(standardError.code).toBe(ERROR_CODES.VALIDATION_ERROR);

          // Property 5: Should have details with field errors
          expect(standardError.details).toBeDefined();
          expect(standardError.details).toHaveProperty('fields');
          expect(standardError.details).toHaveProperty('errors');

          // Property 6: Correlation ID should be present
          expect(typeof standardError.correlationId).toBe('string');
          expect(standardError.correlationId.length).toBeGreaterThan(0);

          // Property 7: Timestamp should be a Date
          expect(standardError.timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should transform network errors to StandardError with consistent structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary network error scenarios
        fc.record({
          errorType: fc.constantFrom('timeout', 'service_unavailable', 'generic_network'),
          status: fc.constantFrom(503, 504, 502),
          statusText: fc.string({ minLength: 5, maxLength: 50 }),
        }),
        async ({ errorType, status, statusText }) => {
          // Create network error based on type
          let networkError: any;
          switch (errorType) {
            case 'timeout':
              networkError = new Error('Request timeout');
              networkError.name = 'TimeoutError';
              break;
            case 'service_unavailable':
              networkError = { status, statusText };
              break;
            default:
              networkError = new Error('Network connection failed');
          }

          // Transform the error
          const standardError = transformNetworkError(networkError);

          // Property 1: Result should be a StandardError
          expect(isStandardError(standardError)).toBe(true);

          // Property 2: Should have all required fields
          expect(standardError).toHaveProperty('code');
          expect(standardError).toHaveProperty('message');
          expect(standardError).toHaveProperty('classification');
          expect(standardError).toHaveProperty('correlationId');
          expect(standardError).toHaveProperty('timestamp');

          // Property 3: Classification should be Network
          expect(standardError.classification).toBe(ErrorClassification.Network);

          // Property 4: Code should be a network-related error code
          expect([
            ERROR_CODES.TIMEOUT,
            ERROR_CODES.SERVICE_UNAVAILABLE,
          ]).toContain(standardError.code);

          // Property 5: Correlation ID should be present
          expect(typeof standardError.correlationId).toBe('string');
          expect(standardError.correlationId.length).toBeGreaterThan(0);

          // Property 6: Timestamp should be a Date
          expect(standardError.timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve correlation IDs across error transformations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary correlation ID
        fc.uuid(),
        async (correlationId) => {
          // Set correlation ID in context
          setCurrentCorrelationId(correlationId);

          // Create various error types
          const dbError = { code: '23505', constraint: 'unique_email', table: 'users' };
          const zodError = new ZodError([
            { code: 'invalid_type', path: ['email'], message: 'Invalid email' },
          ]);
          const networkError = new Error('Timeout');
          networkError.name = 'TimeoutError';

          // Transform all errors
          const standardDbError = transformDatabaseError(dbError);
          const standardValidationError = transformValidationError(zodError);
          const standardNetworkError = transformNetworkError(networkError);

          // Property: All transformed errors should have the same correlation ID
          expect(standardDbError.correlationId).toBe(correlationId);
          expect(standardValidationError.correlationId).toBe(correlationId);
          expect(standardNetworkError.correlationId).toBe(correlationId);

          // Clean up
          clearCurrentCorrelationId();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain error structure through toStandardError transformation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary error scenarios
        fc.oneof(
          // Database error
          fc.record({
            type: fc.constant('database'),
            code: fc.constantFrom('23505', '23503', '23502'),
            constraint: fc.string(),
            table: fc.string(),
          }),
          // Validation error
          fc.record({
            type: fc.constant('validation'),
            fieldName: fc.string(),
            message: fc.string(),
          }),
          // HTTP error
          fc.record({
            type: fc.constant('http'),
            status: fc.constantFrom(400, 401, 403, 404, 500, 503),
          }),
          // Generic error
          fc.record({
            type: fc.constant('generic'),
            message: fc.string({ minLength: 5, maxLength: 100 }),
          })
        ),
        async (errorScenario) => {
          let error: any;

          // Create error based on scenario
          switch (errorScenario.type) {
            case 'database':
              error = {
                code: errorScenario.code,
                constraint: errorScenario.constraint,
                table: errorScenario.table,
              };
              break;
            case 'validation':
              error = new ZodError([
                {
                  code: 'invalid_type',
                  path: [errorScenario.fieldName],
                  message: errorScenario.message,
                },
              ]);
              break;
            case 'http':
              error = { status: errorScenario.status };
              break;
            case 'generic':
              error = new Error(errorScenario.message);
              break;
          }

          // Transform using toStandardError
          const standardError = toStandardError(error);

          // Property 1: Result should always be a StandardError
          expect(isStandardError(standardError)).toBe(true);

          // Property 2: Should have all required fields
          expect(standardError).toHaveProperty('code');
          expect(standardError).toHaveProperty('message');
          expect(standardError).toHaveProperty('classification');
          expect(standardError).toHaveProperty('correlationId');
          expect(standardError).toHaveProperty('timestamp');

          // Property 3: Classification should be valid
          expect(Object.values(ErrorClassification)).toContain(standardError.classification);

          // Property 4: Code should be a string
          expect(typeof standardError.code).toBe('string');

          // Property 5: Message should be a non-empty string
          expect(typeof standardError.message).toBe('string');
          expect(standardError.message.length).toBeGreaterThan(0);

          // Property 6: Correlation ID should be present
          expect(typeof standardError.correlationId).toBe('string');
          expect(standardError.correlationId.length).toBeGreaterThan(0);

          // Property 7: Timestamp should be a Date
          expect(standardError.timestamp).toBeInstanceOf(Date);

          // Property 8: Classification should match error type
          if (errorScenario.type === 'validation') {
            expect(standardError.classification).toBe(ErrorClassification.Validation);
          }
          if (errorScenario.type === 'http' && errorScenario.status >= 500) {
            expect([ErrorClassification.Server, ErrorClassification.Network]).toContain(
              standardError.classification
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should map error classifications to correct HTTP status codes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate all error classifications
        fc.constantFrom(
          ErrorClassification.Validation,
          ErrorClassification.Authorization,
          ErrorClassification.Server,
          ErrorClassification.Network
        ),
        async (classification) => {
          // Get HTTP status for classification
          const httpStatus = getHttpStatusFromClassification(classification);

          // Property 1: HTTP status should be a valid status code
          expect(typeof httpStatus).toBe('number');
          expect(httpStatus).toBeGreaterThanOrEqual(400);
          expect(httpStatus).toBeLessThan(600);

          // Property 2: Classification should map to expected status ranges
          switch (classification) {
            case ErrorClassification.Validation:
              expect(httpStatus).toBe(400);
              break;
            case ErrorClassification.Authorization:
              expect(httpStatus).toBe(403);
              break;
            case ErrorClassification.Server:
              expect(httpStatus).toBe(500);
              break;
            case ErrorClassification.Network:
              expect(httpStatus).toBe(503);
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create StandardError with createStandardError utility', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary error code and message
        fc.record({
          message: fc.string({ minLength: 5, maxLength: 100 }),
          details: fc.option(
            fc.record({
              field: fc.string(),
              value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            }),
            { nil: undefined }
          ),
        }),
        async ({ message, details }) => {
          // Pick a random error code
          const errorCodes = Object.values(ERROR_CODES);
          const randomCode = errorCodes[Math.floor(Math.random() * errorCodes.length)] as ErrorCode;

          // Create standard error
          const standardError = createStandardError(randomCode, message, details);

          // Property 1: Result should be a StandardError
          expect(isStandardError(standardError)).toBe(true);

          // Property 2: Should have the specified code
          expect(standardError.code).toBe(randomCode);

          // Property 3: Should have the specified message
          expect(standardError.message).toBe(message);

          // Property 4: Should have correct classification for the code
          const expectedClassification = getClassificationFromErrorCode(randomCode);
          expect(standardError.classification).toBe(expectedClassification);

          // Property 5: Should have correlation ID
          expect(typeof standardError.correlationId).toBe('string');
          expect(standardError.correlationId.length).toBeGreaterThan(0);

          // Property 6: Should have timestamp
          expect(standardError.timestamp).toBeInstanceOf(Date);

          // Property 7: Should include details if provided
          if (details) {
            expect(standardError.details).toEqual(details);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate unique correlation IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a number of iterations
        fc.integer({ min: 10, max: 50 }),
        async (iterations) => {
          const correlationIds = new Set<string>();

          // Generate multiple correlation IDs
          for (let i = 0; i < iterations; i++) {
            const correlationId = generateCorrelationId();
            correlationIds.add(correlationId);
          }

          // Property: All correlation IDs should be unique
          expect(correlationIds.size).toBe(iterations);

          // Property: All correlation IDs should be non-empty strings
          for (const id of correlationIds) {
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain error structure when already a StandardError', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary StandardError
        fc.record({
          code: fc.string(),
          message: fc.string({ minLength: 5, maxLength: 100 }),
          classification: fc.constantFrom(
            ErrorClassification.Validation,
            ErrorClassification.Authorization,
            ErrorClassification.Server,
            ErrorClassification.Network
          ),
          correlationId: fc.uuid(),
          timestamp: fc.date(),
          details: fc.option(
            fc.record({
              field: fc.string(),
              value: fc.string(),
            }),
            { nil: undefined }
          ),
        }),
        async (errorData) => {
          const standardError: StandardError = {
            code: errorData.code as ErrorCode,
            message: errorData.message,
            classification: errorData.classification,
            correlationId: errorData.correlationId,
            timestamp: errorData.timestamp,
            details: errorData.details,
          };

          // Transform an already-standard error
          const result = toStandardError(standardError);

          // Property: Should return the same error unchanged
          expect(result).toEqual(standardError);
          expect(result.code).toBe(standardError.code);
          expect(result.message).toBe(standardError.message);
          expect(result.classification).toBe(standardError.classification);
          expect(result.correlationId).toBe(standardError.correlationId);
          expect(result.timestamp).toBe(standardError.timestamp);
          expect(result.details).toEqual(standardError.details);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify error codes correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async () => {
          // Test validation error codes
          const validationCodes = [
            ERROR_CODES.VALIDATION_ERROR,
            ERROR_CODES.INVALID_EMAIL,
            ERROR_CODES.INVALID_PASSWORD,
            ERROR_CODES.INVALID_INPUT,
            ERROR_CODES.MISSING_REQUIRED_FIELD,
          ];

          for (const code of validationCodes) {
            const classification = getClassificationFromErrorCode(code);
            expect(classification).toBe(ErrorClassification.Validation);
          }

          // Test authorization error codes
          const authCodes = [
            ERROR_CODES.NOT_AUTHENTICATED,
            ERROR_CODES.ACCESS_DENIED,
            ERROR_CODES.TOKEN_EXPIRED,
            ERROR_CODES.INVALID_TOKEN,
          ];

          for (const code of authCodes) {
            const classification = getClassificationFromErrorCode(code);
            expect(classification).toBe(ErrorClassification.Authorization);
          }

          // Test network error codes
          const networkCodes = [
            ERROR_CODES.SERVICE_UNAVAILABLE,
            ERROR_CODES.TIMEOUT,
          ];

          for (const code of networkCodes) {
            const classification = getClassificationFromErrorCode(code);
            expect(classification).toBe(ErrorClassification.Network);
          }

          // Test server error codes (default)
          const serverCodes = [
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            ERROR_CODES.DATABASE_ERROR,
          ];

          for (const code of serverCodes) {
            const classification = getClassificationFromErrorCode(code);
            expect(classification).toBe(ErrorClassification.Server);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
