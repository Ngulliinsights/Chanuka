// ============================================================================
// ERROR ADAPTER UNIT TESTS
// ============================================================================
// Tests for Boom + Neverthrow error adapter functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Boom from '@hapi/boom';
import { Result } from 'neverthrow';
import { ErrorAdapter, errorAdapter } from '../error-adapter.js';
import { ErrorCategory, ErrorSeverity, ErrorContext } from '../error-standardization.js';

// Mock logger
vi.mock('../../../shared/core/src/index.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('ErrorAdapter', () => {
  let adapter: ErrorAdapter;
  const mockContext: Partial<ErrorContext> = {
    service: 'test-service',
    operation: 'test-operation',
    userId: 'user-123',
    requestId: 'req-456',
    correlationId: 'corr-789'
  };

  beforeEach(() => {
    adapter = ErrorAdapter.getInstance();
  });

  describe('Validation Errors', () => {
    it('should create validation error with Boom', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ];

      const result = adapter.createValidationError(validationErrors, mockContext);

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(Boom.isBoom(boomError)).toBe(true);
        expect(boomError.output.statusCode).toBe(400);
        expect(boomError.message).toContain('Validation failed');
        expect(boomError.message).toContain('email: Invalid email format');
        expect(boomError.message).toContain('password: Password too short');
        expect(boomError.data.validationErrors).toEqual(validationErrors);
        expect(boomError.data.category).toBe(ErrorCategory.VALIDATION);
        expect(boomError.data.retryable).toBe(false);
      }
    });

    it('should convert validation error to ErrorResponse format', () => {
      const validationErrors = [{ field: 'email', message: 'Invalid email' }];
      const result = adapter.createValidationError(validationErrors, mockContext);

      if (result.isErr()) {
        const errorResponse = adapter.toErrorResponse(result.error);

        expect(errorResponse.success).toBe(false);
        expect(errorResponse.error.code).toBe('VALIDATION_FAILED');
        expect(errorResponse.error.message).toBe('Please check your input and try again.');
        expect(errorResponse.error.category).toBe(ErrorCategory.VALIDATION);
        expect(errorResponse.error.retryable).toBe(false);
        expect(errorResponse.metadata.service).toBe('test-service');
        expect(errorResponse.metadata.requestId).toBe('req-456');
      }
    });
  });

  describe('Authentication Errors', () => {
    it('should create authentication error for invalid token', () => {
      const result = adapter.createAuthenticationError('invalid_token', mockContext);

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.output.statusCode).toBe(401);
        expect(boomError.message).toBe('Invalid authentication token');
        expect(boomError.data.reason).toBe('invalid_token');
        expect(boomError.data.category).toBe(ErrorCategory.AUTHENTICATION);
      }
    });

    it('should create authentication error for expired token', () => {
      const result = adapter.createAuthenticationError('expired_token', mockContext);

      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.message).toBe('Authentication token has expired');
        expect(boomError.data.reason).toBe('expired_token');
      }
    });

    it('should convert authentication error to ErrorResponse format', () => {
      const result = adapter.createAuthenticationError('invalid_credentials', mockContext);

      if (result.isErr()) {
        const errorResponse = adapter.toErrorResponse(result.error);

        expect(errorResponse.error.code).toBe('AUTH_INVALID_TOKEN');
        expect(errorResponse.error.message).toBe('Please log in to continue.');
        expect(errorResponse.error.category).toBe(ErrorCategory.AUTHENTICATION);
      }
    });
  });

  describe('Authorization Errors', () => {
    it('should create authorization error', () => {
      const result = adapter.createAuthorizationError('bills', 'delete', mockContext);

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.output.statusCode).toBe(403);
        expect(boomError.message).toBe('Access denied: insufficient permissions to delete bills');
        expect(boomError.data.resource).toBe('bills');
        expect(boomError.data.action).toBe('delete');
        expect(boomError.data.category).toBe(ErrorCategory.AUTHORIZATION);
      }
    });

    it('should convert authorization error to ErrorResponse format', () => {
      const result = adapter.createAuthorizationError('users', 'create', mockContext);

      if (result.isErr()) {
        const errorResponse = adapter.toErrorResponse(result.error);

        expect(errorResponse.error.code).toBe('ACCESS_DENIED');
        expect(errorResponse.error.message).toBe('You do not have permission to perform this action.');
        expect(errorResponse.error.category).toBe(ErrorCategory.AUTHORIZATION);
      }
    });
  });

  describe('Not Found Errors', () => {
    it('should create not found error', () => {
      const result = adapter.createNotFoundError('Bill', 'bill-123', mockContext);

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.output.statusCode).toBe(404);
        expect(boomError.message).toBe('Bill not found: bill-123');
        expect(boomError.data.resource).toBe('Bill');
        expect(boomError.data.identifier).toBe('bill-123');
        expect(boomError.data.category).toBe(ErrorCategory.NOT_FOUND);
      }
    });

    it('should convert not found error to ErrorResponse format', () => {
      const result = adapter.createNotFoundError('User', 'user-456', mockContext);

      if (result.isErr()) {
        const errorResponse = adapter.toErrorResponse(result.error);

        expect(errorResponse.error.code).toBe('RESOURCE_NOT_FOUND');
        expect(errorResponse.error.message).toBe('The requested resource could not be found.');
        expect(errorResponse.error.category).toBe(ErrorCategory.NOT_FOUND);
      }
    });
  });

  describe('Conflict Errors', () => {
    it('should create conflict error', () => {
      const result = adapter.createConflictError('User', 'email already exists', mockContext);

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.output.statusCode).toBe(409);
        expect(boomError.message).toBe('Conflict with User: email already exists');
        expect(boomError.data.resource).toBe('User');
        expect(boomError.data.reason).toBe('email already exists');
        expect(boomError.data.category).toBe(ErrorCategory.CONFLICT);
      }
    });
  });

  describe('Rate Limit Errors', () => {
    it('should create rate limit error', () => {
      const result = adapter.createRateLimitError(100, '1 hour', mockContext);

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.output.statusCode).toBe(429);
        expect(boomError.message).toBe('Rate limit exceeded: 100 requests per 1 hour');
        expect(boomError.data.limit).toBe(100);
        expect(boomError.data.window).toBe('1 hour');
        expect(boomError.data.category).toBe(ErrorCategory.RATE_LIMIT);
        expect(boomError.data.retryable).toBe(true);
      }
    });
  });

  describe('External Service Errors', () => {
    it('should create external service error', () => {
      const originalError = new Error('Connection timeout');
      const result = adapter.createExternalServiceError('payment-service', originalError, mockContext);

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.output.statusCode).toBe(502);
        expect(boomError.message).toBe('External service error from payment-service: Connection timeout');
        expect(boomError.data.serviceName).toBe('payment-service');
        expect(boomError.data.originalError).toBe('Connection timeout');
        expect(boomError.data.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
        expect(boomError.data.retryable).toBe(true);
      }
    });
  });

  describe('Database Errors', () => {
    it('should create database error for connection issues', () => {
      const originalError = new Error('connection timeout');
      const result = adapter.createDatabaseError('user lookup', originalError, mockContext);

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.output.statusCode).toBe(500);
        expect(boomError.message).toBe('Database error during user lookup: connection timeout');
        expect(boomError.data.operation).toBe('user lookup');
        expect(boomError.data.isConnectionError).toBe(true);
        expect(boomError.data.retryable).toBe(true);
      }
    });

    it('should create database error for non-connection issues', () => {
      const originalError = new Error('constraint violation');
      const result = adapter.createDatabaseError('user creation', originalError, mockContext);

      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.data.isConnectionError).toBe(false);
        expect(boomError.data.retryable).toBe(false);
      }
    });
  });

  describe('Business Logic Errors', () => {
    it('should create business logic error', () => {
      const result = adapter.createBusinessLogicError(
        'minimum age requirement',
        'User must be at least 18 years old',
        mockContext
      );

      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const boomError = result.error;
        expect(boomError.output.statusCode).toBe(400);
        expect(boomError.message).toBe('Business rule violation: minimum age requirement - User must be at least 18 years old');
        expect(boomError.data.rule).toBe('minimum age requirement');
        expect(boomError.data.details).toBe('User must be at least 18 years old');
        expect(boomError.data.category).toBe(ErrorCategory.BUSINESS_LOGIC);
      }
    });
  });

  describe('Error Response Conversion', () => {
    it('should maintain existing ErrorResponse format', () => {
      const validationErrors = [{ field: 'email', message: 'Required' }];
      const result = adapter.createValidationError(validationErrors, mockContext);

      if (result.isErr()) {
        const errorResponse = adapter.toErrorResponse(result.error);

        // Verify structure matches existing format
        expect(errorResponse).toHaveProperty('success', false);
        expect(errorResponse).toHaveProperty('error');
        expect(errorResponse).toHaveProperty('metadata');

        expect(errorResponse.error).toHaveProperty('id');
        expect(errorResponse.error).toHaveProperty('code');
        expect(errorResponse.error).toHaveProperty('message');
        expect(errorResponse.error).toHaveProperty('category');
        expect(errorResponse.error).toHaveProperty('retryable');
        expect(errorResponse.error).toHaveProperty('timestamp');

        expect(errorResponse.metadata).toHaveProperty('service');
        expect(errorResponse.metadata.requestId).toBe('req-456');
        expect(errorResponse.metadata.correlationId).toBe('corr-789');
      }
    });

    it('should convert to StandardizedError format for backward compatibility', () => {
      const result = adapter.createNotFoundError('Bill', 'bill-123', mockContext);

      if (result.isErr()) {
        const standardizedError = adapter.toStandardizedError(result.error);

        expect(standardizedError).toHaveProperty('id');
        expect(standardizedError).toHaveProperty('code');
        expect(standardizedError).toHaveProperty('category');
        expect(standardizedError).toHaveProperty('severity');
        expect(standardizedError).toHaveProperty('message');
        expect(standardizedError).toHaveProperty('userMessage');
        expect(standardizedError).toHaveProperty('context');
        expect(standardizedError).toHaveProperty('retryable');
        expect(standardizedError).toHaveProperty('httpStatusCode');

        expect(standardizedError.category).toBe(ErrorCategory.NOT_FOUND);
        expect(standardizedError.severity).toBe(ErrorSeverity.LOW);
        expect(standardizedError.httpStatusCode).toBe(404);
      }
    });
  });

  describe('Function Wrapping', () => {
    it('should wrap successful function execution', async () => {
      const successFn = () => 'success result';
      const result = await adapter.wrapFunction(successFn);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('success result');
      }
    });

    it('should wrap failing function execution', async () => {
      const failFn = () => {
        throw new Error('Function failed');
      };
      const result = await adapter.wrapFunction(failFn);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(Boom.isBoom(result.error)).toBe(true);
        expect(result.error.message).toBe('Function failed');
      }
    });

    it('should wrap async function execution', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'async result';
      };
      const result = await adapter.wrapFunction(asyncFn);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('async result');
      }
    });

    it('should use custom error mapper', async () => {
      const failFn = () => {
        throw new Error('Custom error');
      };
      const customMapper = (error: unknown) => {
        return Boom.teapot('I am a teapot');
      };
      const result = await adapter.wrapFunction(failFn, customMapper);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.output.statusCode).toBe(418);
        expect(result.error.message).toBe('I am a teapot');
      }
    });
  });

  describe('Alert Detection', () => {
    it('should trigger alert for critical errors', () => {
      // Create a system error (maps to critical severity)
      const boomError = Boom.internal('System failure', {
        category: ErrorCategory.SYSTEM
      });

      const shouldAlert = adapter.shouldAlert(boomError);
      expect(shouldAlert).toBe(true);
    });

    it('should trigger alert for high frequency errors', () => {
      // Create a fresh adapter instance to avoid interference from other tests
      const freshAdapter = new ErrorAdapter();
      
      // Create multiple validation errors to trigger frequency alert
      for (let i = 0; i < 12; i++) {
        freshAdapter.createValidationError([{ field: 'frequency-test', message: 'test' }], mockContext);
      }

      const result = freshAdapter.createValidationError([{ field: 'frequency-test', message: 'test' }], mockContext);
      if (result.isErr()) {
        const shouldAlert = freshAdapter.shouldAlert(result.error);
        expect(shouldAlert).toBe(true);
      }
    });

    it('should not trigger alert for low frequency, non-critical errors', () => {
      // Create a fresh adapter instance to avoid interference from other tests
      const freshAdapter = new ErrorAdapter();
      const result = freshAdapter.createValidationError([{ field: 'low-freq-test', message: 'test' }], mockContext);
      
      if (result.isErr()) {
        const shouldAlert = freshAdapter.shouldAlert(result.error);
        expect(shouldAlert).toBe(false);
      }
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ErrorAdapter.getInstance();
      const instance2 = ErrorAdapter.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should use exported singleton', () => {
      const instance = ErrorAdapter.getInstance();
      expect(errorAdapter).toBe(instance);
    });
  });

  describe('Error Code Mapping', () => {
    it('should map status codes to appropriate error codes', () => {
      const testCases = [
        { statusCode: 400, expectedCode: 'VALIDATION_FAILED' },
        { statusCode: 401, expectedCode: 'AUTH_INVALID_TOKEN' },
        { statusCode: 403, expectedCode: 'ACCESS_DENIED' },
        { statusCode: 404, expectedCode: 'RESOURCE_NOT_FOUND' },
        { statusCode: 409, expectedCode: 'RESOURCE_CONFLICT' },
        { statusCode: 429, expectedCode: 'RATE_LIMIT_EXCEEDED' },
        { statusCode: 500, expectedCode: 'INTERNAL_ERROR' },
        { statusCode: 502, expectedCode: 'EXTERNAL_SERVICE_ERROR' },
        { statusCode: 503, expectedCode: 'SERVICE_UNAVAILABLE' }
      ];

      testCases.forEach(({ statusCode, expectedCode }) => {
        const boomError = new Boom.Boom('Test error', { statusCode });
        const errorResponse = adapter.toErrorResponse(boomError);
        expect(errorResponse.error.code).toBe(expectedCode);
      });
    });
  });

  describe('Context Handling', () => {
    it('should build complete context with defaults', () => {
      const partialContext = { userId: 'user-123' };
      const result = adapter.createValidationError(
        [{ field: 'test', message: 'test' }],
        partialContext
      );

      if (result.isErr()) {
        const context = result.error.data.context;
        expect(context.userId).toBe('user-123');
        expect(context.service).toBe('legislative-platform');
        expect(context.operation).toBe('unknown');
        expect(context.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should preserve all provided context fields', () => {
      const fullContext: Partial<ErrorContext> = {
        userId: 'user-123',
        requestId: 'req-456',
        correlationId: 'corr-789',
        service: 'custom-service',
        operation: 'custom-operation',
        metadata: { custom: 'data' }
      };

      const result = adapter.createValidationError(
        [{ field: 'test', message: 'test' }],
        fullContext
      );

      if (result.isErr()) {
        const context = result.error.data.context;
        expect(context.userId).toBe('user-123');
        expect(context.requestId).toBe('req-456');
        expect(context.correlationId).toBe('corr-789');
        expect(context.service).toBe('custom-service');
        expect(context.operation).toBe('custom-operation');
        expect(context.metadata).toEqual({ custom: 'data' });
      }
    });
  });
});