/**
 * Error Serialization Tests
 *
 * Tests for HTTP boundary serialization (toApiError/fromApiError).
 * Verifies no data loss and type safety across boundaries.
 *
 * Requirements: 22.11
 */

import { describe, it, expect } from 'vitest';
import { ErrorDomain, ErrorSeverity } from '@shared/core';
import { ERROR_CODES } from '@shared/constants';
import {
  createValidationError,
  createNetworkError,
  createAuthenticationError,
  createAuthorizationError,
  createBusinessError,
  createSystemError,
  createNotFoundError,
  createTimeoutError,
  toApiError,
  fromApiError,
  serializeError,
  deserializeError,
  isValidApiErrorResponse,
} from '../index';

describe('Error Serialization', () => {
  describe('toApiError', () => {
    it('should serialize validation error correctly', () => {
      const error = createValidationError(
        [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' },
        ],
        { component: 'RegistrationForm', operation: 'validateInput', userId: 'user123' }
      );

      const apiError = toApiError(error);

      expect(apiError.success).toBe(false);
      expect(apiError.error.id).toBe(error.id);
      expect(apiError.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(apiError.error.message).toContain('Validation failed');
      expect(apiError.error.type).toBe(ErrorDomain.VALIDATION);
      expect(apiError.error.timestamp).toBe(error.timestamp.toISOString());
      expect(apiError.error.statusCode).toBe(400);
      expect(apiError.error.correlationId).toBe(error.correlationId);
      expect(apiError.error.details).toBeDefined();
      expect(apiError.error.details?.severity).toBe(ErrorSeverity.LOW);
      expect(apiError.error.details?.recoverable).toBe(true);
      expect(apiError.error.details?.retryable).toBe(false);
    });

    it('should serialize network error correctly', () => {
      const error = createNetworkError(
        'Request failed',
        500,
        { component: 'APIClient', operation: 'fetchData', requestId: 'req123' }
      );

      const apiError = toApiError(error);

      expect(apiError.success).toBe(false);
      expect(apiError.error.code).toBe(ERROR_CODES.NETWORK_ERROR);
      expect(apiError.error.type).toBe(ErrorDomain.NETWORK);
      expect(apiError.error.statusCode).toBe(500);
      expect(apiError.error.details?.severity).toBe(ErrorSeverity.MEDIUM);
      expect(apiError.error.details?.recoverable).toBe(true);
      expect(apiError.error.details?.retryable).toBe(true);
    });

    it('should serialize authentication error correctly', () => {
      const error = createAuthenticationError(
        'Invalid credentials',
        { component: 'AuthService', operation: 'login' }
      );

      const apiError = toApiError(error);

      expect(apiError.error.code).toBe(ERROR_CODES.NOT_AUTHENTICATED);
      expect(apiError.error.type).toBe(ErrorDomain.AUTHENTICATION);
      expect(apiError.error.statusCode).toBe(401);
      expect(apiError.error.details?.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should serialize authorization error correctly', () => {
      const error = createAuthorizationError(
        'Insufficient permissions',
        ['admin', 'moderator'],
        { component: 'AdminPanel', operation: 'accessSettings' }
      );

      const apiError = toApiError(error);

      expect(apiError.error.code).toBe(ERROR_CODES.AUTHORIZATION_FAILED);
      expect(apiError.error.type).toBe(ErrorDomain.AUTHORIZATION);
      expect(apiError.error.statusCode).toBe(403);
      expect(apiError.error.details?.requiredPermissions).toEqual(['admin', 'moderator']);
    });

    it('should preserve all error context', () => {
      const error = createNetworkError(
        'Request failed',
        500,
        {
          component: 'APIClient',
          operation: 'fetchData',
          userId: 'user123',
          sessionId: 'session456',
          requestId: 'req789',
          metadata: { endpoint: '/api/users', method: 'GET' },
        }
      );

      const apiError = toApiError(error);
      const context = apiError.error.details?.context as Record<string, unknown>;

      expect(context.component).toBe('APIClient');
      expect(context.operation).toBe('fetchData');
      expect(context.userId).toBe('user123');
      expect(context.sessionId).toBe('session456');
      expect(context.requestId).toBe('req789');
      expect(context.metadata).toEqual({ endpoint: '/api/users', method: 'GET' });
    });
  });

  describe('fromApiError', () => {
    it('should deserialize validation error correctly', () => {
      const originalError = createValidationError(
        [{ field: 'email', message: 'Invalid email' }],
        { component: 'Form', operation: 'validate' }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.id).toBe(originalError.id);
      expect(deserializedError.code).toBe(originalError.code);
      expect(deserializedError.type).toBe(originalError.type);
      expect(deserializedError.severity).toBe(originalError.severity);
      expect(deserializedError.message).toBe(originalError.message);
      expect(deserializedError.timestamp.toISOString()).toBe(originalError.timestamp.toISOString());
      expect(deserializedError.correlationId).toBe(originalError.correlationId);
      expect(deserializedError.statusCode).toBe(originalError.statusCode);
      expect(deserializedError.recoverable).toBe(originalError.recoverable);
      expect(deserializedError.retryable).toBe(originalError.retryable);
    });

    it('should deserialize network error correctly', () => {
      const originalError = createNetworkError('Request failed', 500);
      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.code).toBe(ERROR_CODES.NETWORK_ERROR);
      expect(deserializedError.type).toBe(ErrorDomain.NETWORK);
      expect(deserializedError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(deserializedError.recoverable).toBe(true);
      expect(deserializedError.retryable).toBe(true);
    });

    it('should preserve error context during deserialization', () => {
      const originalError = createNetworkError(
        'Request failed',
        500,
        {
          component: 'APIClient',
          operation: 'fetchData',
          userId: 'user123',
          metadata: { endpoint: '/api/users' },
        }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.context.component).toBe('APIClient');
      expect(deserializedError.context.operation).toBe('fetchData');
      expect(deserializedError.context.userId).toBe('user123');
      expect(deserializedError.context.metadata).toEqual({ endpoint: '/api/users' });
    });
  });

  describe('Round-trip serialization', () => {
    it('should preserve validation error through round-trip', () => {
      const originalError = createValidationError(
        [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Too short' },
        ],
        { component: 'Form', operation: 'validate', userId: 'user123' }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      // Verify no data loss
      expect(deserializedError.id).toBe(originalError.id);
      expect(deserializedError.code).toBe(originalError.code);
      expect(deserializedError.type).toBe(originalError.type);
      expect(deserializedError.severity).toBe(originalError.severity);
      expect(deserializedError.message).toBe(originalError.message);
      expect(deserializedError.correlationId).toBe(originalError.correlationId);
      expect(deserializedError.statusCode).toBe(originalError.statusCode);
      expect(deserializedError.recoverable).toBe(originalError.recoverable);
      expect(deserializedError.retryable).toBe(originalError.retryable);
      expect(deserializedError.context.component).toBe(originalError.context.component);
      expect(deserializedError.context.operation).toBe(originalError.context.operation);
      expect(deserializedError.context.userId).toBe(originalError.context.userId);
    });

    it('should preserve network error through round-trip', () => {
      const originalError = createNetworkError(
        'Request failed',
        503,
        { component: 'API', operation: 'fetch', requestId: 'req123' }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.code).toBe(originalError.code);
      expect(deserializedError.type).toBe(originalError.type);
      expect(deserializedError.severity).toBe(originalError.severity);
      expect(deserializedError.statusCode).toBe(originalError.statusCode);
      expect(deserializedError.context.requestId).toBe(originalError.context.requestId);
    });

    it('should preserve authentication error through round-trip', () => {
      const originalError = createAuthenticationError(
        'Token expired',
        { component: 'Auth', operation: 'verify' }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.type).toBe(ErrorDomain.AUTHENTICATION);
      expect(deserializedError.severity).toBe(ErrorSeverity.HIGH);
      expect(deserializedError.statusCode).toBe(401);
    });

    it('should preserve authorization error through round-trip', () => {
      const originalError = createAuthorizationError(
        'Access denied',
        ['admin'],
        { component: 'AdminPanel', operation: 'access' }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.type).toBe(ErrorDomain.AUTHORIZATION);
      expect(deserializedError.statusCode).toBe(403);
      expect(deserializedError.details?.requiredPermissions).toEqual(['admin']);
    });

    it('should preserve system error through round-trip', () => {
      const cause = new Error('Original error');
      const originalError = createSystemError(
        'System failure',
        cause,
        { component: 'System', operation: 'process' }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.type).toBe(ErrorDomain.SYSTEM);
      expect(deserializedError.severity).toBe(ErrorSeverity.HIGH);
      expect(deserializedError.details?.cause).toBeDefined();
    });

    it('should preserve not found error through round-trip', () => {
      const originalError = createNotFoundError(
        'User',
        { component: 'UserService', operation: 'find', userId: '123' }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.type).toBe(ErrorDomain.RESOURCE);
      expect(deserializedError.statusCode).toBe(404);
      expect(deserializedError.details?.resource).toBe('User');
    });

    it('should preserve timeout error through round-trip', () => {
      const originalError = createTimeoutError(
        'fetchData',
        5000,
        { component: 'API', operation: 'fetch' }
      );

      const apiError = toApiError(originalError);
      const deserializedError = fromApiError(apiError);

      expect(deserializedError.type).toBe(ErrorDomain.NETWORK);
      expect(deserializedError.statusCode).toBe(408);
      expect(deserializedError.details?.timeout).toBe(5000);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize and deserialize to/from JSON string', () => {
      const originalError = createValidationError(
        [{ field: 'email', message: 'Invalid' }],
        { component: 'Form', operation: 'validate' }
      );

      const jsonString = serializeError(originalError);
      expect(typeof jsonString).toBe('string');

      const deserializedError = deserializeError(jsonString);
      expect(deserializedError.id).toBe(originalError.id);
      expect(deserializedError.code).toBe(originalError.code);
      expect(deserializedError.type).toBe(originalError.type);
    });
  });

  describe('isValidApiErrorResponse', () => {
    it('should validate correct API error response', () => {
      const error = createNetworkError('Request failed', 500);
      const apiError = toApiError(error);

      expect(isValidApiErrorResponse(apiError)).toBe(true);
    });

    it('should reject invalid API error response', () => {
      expect(isValidApiErrorResponse(null)).toBe(false);
      expect(isValidApiErrorResponse(undefined)).toBe(false);
      expect(isValidApiErrorResponse({})).toBe(false);
      expect(isValidApiErrorResponse({ success: true })).toBe(false);
      expect(isValidApiErrorResponse({ success: false })).toBe(false);
      expect(isValidApiErrorResponse({ success: false, error: {} })).toBe(false);
    });

    it('should validate API error response with all required fields', () => {
      const validResponse = {
        success: false,
        error: {
          id: 'err123',
          code: 'TEST_ERROR',
          message: 'Test error',
          type: 'system',
          timestamp: new Date().toISOString(),
        },
      };

      expect(isValidApiErrorResponse(validResponse)).toBe(true);
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety through serialization', () => {
      const error = createValidationError(
        [{ field: 'email', message: 'Invalid' }],
        { component: 'Form', operation: 'validate' }
      );

      const apiError = toApiError(error);
      const deserializedError = fromApiError(apiError);

      // TypeScript should recognize these as the correct types
      expect(deserializedError.type).toBe(ErrorDomain.VALIDATION);
      expect(deserializedError.severity).toBe(ErrorSeverity.LOW);
      expect(typeof deserializedError.recoverable).toBe('boolean');
      expect(typeof deserializedError.retryable).toBe('boolean');
    });
  });

  describe('All error domains', () => {
    it('should handle all error domains correctly', () => {
      const domains = [
        ErrorDomain.VALIDATION,
        ErrorDomain.NETWORK,
        ErrorDomain.AUTHENTICATION,
        ErrorDomain.AUTHORIZATION,
        ErrorDomain.BUSINESS_LOGIC,
        ErrorDomain.SYSTEM,
        ErrorDomain.RESOURCE,
      ];

      domains.forEach(domain => {
        const error = createNetworkError('Test error', 500);
        error.type = domain;

        const apiError = toApiError(error);
        const deserializedError = fromApiError(apiError);

        expect(deserializedError.type).toBe(domain);
      });
    });
  });
});
