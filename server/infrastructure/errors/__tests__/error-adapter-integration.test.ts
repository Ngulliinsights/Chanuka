// ============================================================================
// ERROR ADAPTER INTEGRATION TESTS
// ============================================================================
// Tests integration between ErrorAdapter and existing error handling patterns

import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorAdapter } from '../error-adapter.js';
import { 
  StandardizedErrorHandler, 
  ErrorCategory, 
  ErrorContext 
} from '../error-standardization.js';

describe('ErrorAdapter Integration', () => {
  let errorAdapter: ErrorAdapter;
  let legacyHandler: StandardizedErrorHandler;
  const mockContext: Partial<ErrorContext> = {
    service: 'integration-test',
    operation: 'test-operation',
    user_id: 'user-123',
    requestId: 'req-456'
  };

  beforeEach(() => {
    errorAdapter = new ErrorAdapter();
    legacyHandler = StandardizedErrorHandler.getInstance();
  });

  describe('API Compatibility', () => {
    it('should produce identical ErrorResponse format as legacy handler', () => {
      // Create validation error with both systems
      const validationErrors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ];

      const legacyError = legacyHandler.createValidationError(validationErrors, mockContext);
      const legacyResponse = legacyHandler.toErrorResponse(legacyError);

      const adapterResult = errorAdapter.createValidationError(validationErrors, mockContext);
      if (adapterResult.isErr()) {
        const adapterResponse = errorAdapter.toErrorResponse(adapterResult.error);

        // Compare structure (ignoring unique IDs and timestamps)
        expect(adapterResponse.success).toBe(legacyResponse.success);
        expect(adapterResponse.error.code).toBe(legacyResponse.error.code);
        expect(adapterResponse.error.message).toBe(legacyResponse.error.message);
        expect(adapterResponse.error.category).toBe(legacyResponse.error.category);
        expect(adapterResponse.error.retryable).toBe(legacyResponse.error.retryable);
        expect(adapterResponse.metadata.service).toBe(legacyResponse.metadata.service);
        expect(adapterResponse.metadata.requestId).toBe(legacyResponse.metadata.requestId);
      }
    });

    it('should produce compatible authentication errors', () => {
      const legacyError = legacyHandler.createAuthenticationError('invalid_token', mockContext);
      const legacyResponse = legacyHandler.toErrorResponse(legacyError);

      const adapterResult = errorAdapter.createAuthenticationError('invalid_token', mockContext);
      if (adapterResult.isErr()) {
        const adapterResponse = errorAdapter.toErrorResponse(adapterResult.error);

        expect(adapterResponse.error.code).toBe(legacyResponse.error.code);
        // Both should provide appropriate user messages for authentication errors
        expect(adapterResponse.error.message).toContain('log in');
        expect(legacyResponse.error.message).toContain('log in');
        expect(adapterResponse.error.category).toBe(legacyResponse.error.category);
      }
    });

    it('should produce compatible not found errors', () => {
      const legacyError = legacyHandler.createNotFoundError('Bill', 'bill-123', mockContext);
      const legacyResponse = legacyHandler.toErrorResponse(legacyError);

      const adapterResult = errorAdapter.createNotFoundError('Bill', 'bill-123', mockContext);
      if (adapterResult.isErr()) {
        const adapterResponse = errorAdapter.toErrorResponse(adapterResult.error);

        expect(adapterResponse.error.code).toBe(legacyResponse.error.code);
        expect(adapterResponse.error.message).toBe(legacyResponse.error.message);
        expect(adapterResponse.error.category).toBe(legacyResponse.error.category);
      }
    });
  });

  describe('Result Type Integration', () => {
    it('should work with Result type patterns', async () => {
      // Simulate a service method that might fail
      const simulateUserLookup = async (user_id: string) => {
        if (user_id === 'invalid') {
          return errorAdapter.createNotFoundError('User', user_id, mockContext);
        }
        return { ok: true, value: { id: user_id, name: 'Test User' } };
      };

      // Test success case
      const successResult = await simulateUserLookup('valid-user');
      expect(successResult).toHaveProperty('value');

      // Test error case
      const errorResult = await simulateUserLookup('invalid');
      expect(errorResult.isErr()).toBe(true);
      
      if (errorResult.isErr()) {
        const errorResponse = errorAdapter.toErrorResponse(errorResult.error);
        expect(errorResponse.error.code).toBe('RESOURCE_NOT_FOUND');
        expect(errorResponse.error.category).toBe(ErrorCategory.NOT_FOUND);
      }
    });

    it('should handle function wrapping for error conversion', async () => {
      const riskyFunction = async () => {
        throw new Error('Database connection failed');
      };

      const result = await errorAdapter.wrapFunction(riskyFunction);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const errorResponse = errorAdapter.toErrorResponse(result.error);
        expect(errorResponse.success).toBe(false);
        expect(errorResponse.error.message).toContain('system error');
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should convert Boom errors to StandardizedError format', () => {
      const adapterResult = errorAdapter.createBusinessLogicError(
        'age_requirement',
        'User must be 18 or older',
        mockContext
      );

      if (adapterResult.isErr()) {
        const standardizedError = errorAdapter.toStandardizedError(adapterResult.error);

        // Should have all required StandardizedError fields
        expect(standardizedError).toHaveProperty('id');
        expect(standardizedError).toHaveProperty('code');
        expect(standardizedError).toHaveProperty('category');
        expect(standardizedError).toHaveProperty('severity');
        expect(standardizedError).toHaveProperty('message');
        expect(standardizedError).toHaveProperty('userMessage');
        expect(standardizedError).toHaveProperty('context');
        expect(standardizedError).toHaveProperty('retryable');
        expect(standardizedError).toHaveProperty('httpStatusCode');

        expect(standardizedError.category).toBe(ErrorCategory.BUSINESS_LOGIC);
        expect(standardizedError.httpStatusCode).toBe(400);
      }
    });

    it('should maintain error tracking and alerting compatibility', () => {
      // Create multiple errors to test tracking
      for (let i = 0; i < 5; i++) {
        errorAdapter.createValidationError(
          [{ field: 'test', message: 'test error' }],
          mockContext
        );
      }

      // Create a critical error
      const criticalResult = errorAdapter.createDatabaseError(
        'connection',
        new Error('Connection timeout'),
        mockContext
      );

      if (criticalResult.isErr()) {
        // Should trigger alert for database errors
        const shouldAlert = errorAdapter.shouldAlert(criticalResult.error);
        expect(shouldAlert).toBe(false); // Database errors are HIGH severity, not CRITICAL
      }

      // Test system error (critical severity)
      const systemResult = errorAdapter.wrapFunction(() => {
        throw new Error('System failure');
      });

      systemResult.then(result => {
        if (result.isErr()) {
          const shouldAlert = errorAdapter.shouldAlert(result.error);
          expect(shouldAlert).toBe(true); // System errors should trigger alerts
        }
      });
    });
  });

  describe('Performance Comparison', () => {
    it('should have similar performance to legacy error handler', () => {
      const iterations = 1000;
      const validationErrors = [{ field: 'email', message: 'Invalid' }];

      // Measure legacy handler performance
      const legacyStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const error = legacyHandler.createValidationError(validationErrors, mockContext);
        legacyHandler.toErrorResponse(error);
      }
      const legacyTime = performance.now() - legacyStart;

      // Measure adapter performance
      const adapterStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const result = errorAdapter.createValidationError(validationErrors, mockContext);
        if (result.isErr()) {
          errorAdapter.toErrorResponse(result.error);
        }
      }
      const adapterTime = performance.now() - adapterStart;

      // Adapter should not be significantly slower (allow 50% overhead for Result wrapping)
      expect(adapterTime).toBeLessThan(legacyTime * 1.5);
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve all context information through the error chain', () => {
      const richContext: Partial<ErrorContext> = {
        service: 'user-service',
        operation: 'create-user',
        user_id: 'admin-123',
        requestId: 'req-789',
        correlationId: 'corr-456',
        metadata: {
          userAgent: 'test-client',
          ipAddress: '127.0.0.1',
          feature: 'user-registration'
        }
      };

      const result = errorAdapter.createConflictError(
        'User',
        'Email already exists',
        richContext
      );

      if (result.isErr()) {
        const errorResponse = errorAdapter.toErrorResponse(result.error);
        const standardizedError = errorAdapter.toStandardizedError(result.error);

        // Check ErrorResponse format
        expect(errorResponse.metadata.service).toBe('user-service');
        expect(errorResponse.metadata.requestId).toBe('req-789');
        expect(errorResponse.metadata.correlationId).toBe('corr-456');

        // Check StandardizedError format
        expect(standardizedError.context.service).toBe('user-service');
        expect(standardizedError.context.operation).toBe('create-user');
        expect(standardizedError.context.user_id).toBe('admin-123');
        expect(standardizedError.context.requestId).toBe('req-789');
        expect(standardizedError.context.correlationId).toBe('corr-456');
        expect(standardizedError.context.metadata).toEqual(richContext.metadata);
      }
    });
  });
});