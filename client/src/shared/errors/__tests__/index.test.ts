import { describe, it, expect } from 'vitest';
import {
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  NetworkError,
  ExternalServiceError,
  ServiceUnavailableError,
  DatabaseError,
  CacheError,
  ConflictError,
  TooManyRequestsError,
  ErrorSeverity,
  ErrorDomain
} from '../index';

describe('Shared Error Classes', () => {
  describe('BaseError', () => {
    it('should create a base error with message and code', () => {
      const error = new BaseError('Test message', 'TEST_CODE');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('BaseError');
    });

    it('should create a base error with default code', () => {
      const error = new BaseError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('UNKNOWN_ERROR');
    });

    it('should include metadata when provided', () => {
      const metadata = { userId: '123', action: 'test' };
      const error = new BaseError('Test message', 'TEST_CODE', metadata);

      expect(error.metadata).toEqual(metadata);
    });

    it('should serialize to JSON correctly', () => {
      const metadata = { test: 'value' };
      const error = new BaseError('Test message', 'TEST_CODE', metadata);

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'BaseError',
        message: 'Test message',
        code: 'TEST_CODE',
        metadata: { test: 'value' }
      });
    });

    it('should maintain instanceof checks', () => {
      const error = new BaseError('Test message');

      expect(error instanceof BaseError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with fields', () => {
      const fields = { email: ['required'], password: ['min_length'] };
      const error = new ValidationError('Validation failed', fields);

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
      expect(error.fields).toEqual(fields);
    });

    it('should include validation domain and medium severity', () => {
      const error = new ValidationError('Validation failed');

      expect(error.metadata?.domain).toBe(ErrorDomain.VALIDATION);
      expect(error.metadata?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should handle undefined fields', () => {
      const error = new ValidationError('Validation failed');

      expect(error.fields).toBeUndefined();
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
      expect(error.metadata?.domain).toBe(ErrorDomain.SYSTEM);
      expect(error.metadata?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should accept custom code', () => {
      const error = new NotFoundError('User not found', 'USER_NOT_FOUND');

      expect(error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an unauthorized error', () => {
      const error = new UnauthorizedError('Not authenticated');

      expect(error.message).toBe('Not authenticated');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
      expect(error.metadata?.domain).toBe(ErrorDomain.AUTHENTICATION);
      expect(error.metadata?.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('ForbiddenError', () => {
    it('should create a forbidden error', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('ForbiddenError');
      expect(error.metadata?.domain).toBe(ErrorDomain.AUTHORIZATION);
      expect(error.metadata?.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('NetworkError', () => {
    it('should create a network error', () => {
      const error = new NetworkError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
      expect(error.metadata?.domain).toBe(ErrorDomain.NETWORK);
      expect(error.metadata?.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create an external service error', () => {
      const error = new ExternalServiceError('Third-party service failed');

      expect(error.message).toBe('Third-party service failed');
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.name).toBe('ExternalServiceError');
      expect(error.metadata?.domain).toBe(ErrorDomain.EXTERNAL_SERVICE);
      expect(error.metadata?.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create a service unavailable error', () => {
      const error = new ServiceUnavailableError('Service is down');

      expect(error.message).toBe('Service is down');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.name).toBe('ServiceUnavailableError');
      expect(error.metadata?.domain).toBe(ErrorDomain.EXTERNAL_SERVICE);
      expect(error.metadata?.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('DatabaseError', () => {
    it('should create a database error', () => {
      const error = new DatabaseError('Database connection failed');

      expect(error.message).toBe('Database connection failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.name).toBe('DatabaseError');
      expect(error.metadata?.domain).toBe(ErrorDomain.DATABASE);
      expect(error.metadata?.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('CacheError', () => {
    it('should create a cache error', () => {
      const error = new CacheError('Cache operation failed');

      expect(error.message).toBe('Cache operation failed');
      expect(error.code).toBe('CACHE_ERROR');
      expect(error.name).toBe('CacheError');
      expect(error.metadata?.domain).toBe(ErrorDomain.CACHE);
      expect(error.metadata?.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error', () => {
      const error = new ConflictError('Resource conflict');

      expect(error.message).toBe('Resource conflict');
      expect(error.code).toBe('CONFLICT_ERROR');
      expect(error.name).toBe('ConflictError');
      expect(error.metadata?.domain).toBe(ErrorDomain.BUSINESS_LOGIC);
      expect(error.metadata?.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('TooManyRequestsError', () => {
    it('should create a too many requests error', () => {
      const error = new TooManyRequestsError('Rate limit exceeded');

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('TOO_MANY_REQUESTS');
      expect(error.name).toBe('TooManyRequestsError');
      expect(error.metadata?.domain).toBe(ErrorDomain.NETWORK);
      expect(error.metadata?.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('ErrorSeverity enum', () => {
    it('should have correct severity values', () => {
      expect(ErrorSeverity.LOW).toBe('low');
      expect(ErrorSeverity.MEDIUM).toBe('medium');
      expect(ErrorSeverity.HIGH).toBe('high');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('ErrorDomain enum', () => {
    it('should have correct domain values', () => {
      expect(ErrorDomain.AUTHENTICATION).toBe('authentication');
      expect(ErrorDomain.AUTHORIZATION).toBe('authorization');
      expect(ErrorDomain.VALIDATION).toBe('validation');
      expect(ErrorDomain.NETWORK).toBe('network');
      expect(ErrorDomain.DATABASE).toBe('database');
      expect(ErrorDomain.EXTERNAL_SERVICE).toBe('external_service');
      expect(ErrorDomain.CACHE).toBe('cache');
      expect(ErrorDomain.BUSINESS_LOGIC).toBe('business_logic');
      expect(ErrorDomain.SECURITY).toBe('security');
      expect(ErrorDomain.SYSTEM).toBe('system');
      expect(ErrorDomain.UNKNOWN).toBe('unknown');
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new ValidationError('Test');
      const networkError = new NetworkError('Test');

      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof BaseError).toBe(true);
      expect(validationError instanceof Error).toBe(true);

      expect(networkError instanceof NetworkError).toBe(true);
      expect(networkError instanceof BaseError).toBe(true);
      expect(networkError instanceof Error).toBe(true);
    });

    it('should not be instanceof unrelated error types', () => {
      const validationError = new ValidationError('Test');
      const networkError = new NetworkError('Test');

      expect(validationError instanceof NetworkError).toBe(false);
      expect(networkError instanceof ValidationError).toBe(false);
    });
  });

  describe('Error serialization', () => {
    it('should serialize all error types to JSON', () => {
      const errors = [
        new BaseError('Base error'),
        new ValidationError('Validation error'),
        new NotFoundError('Not found'),
        new UnauthorizedError('Unauthorized'),
        new ForbiddenError('Forbidden'),
        new NetworkError('Network error'),
        new ExternalServiceError('External service error'),
        new ServiceUnavailableError('Service unavailable'),
        new DatabaseError('Database error'),
        new CacheError('Cache error'),
        new ConflictError('Conflict error'),
        new TooManyRequestsError('Too many requests')
      ];

      errors.forEach(error => {
        const json = error.toJSON();

        expect(json).toHaveProperty('name');
        expect(json).toHaveProperty('message');
        expect(json).toHaveProperty('code');
        expect(json.name).toBe(error.name);
        expect(json.message).toBe(error.message);
        expect(json.code).toBe(error.code);
      });
    });
  });

  describe('Error metadata', () => {
    it('should include appropriate metadata for each error type', () => {
      const testCases = [
        { error: new ValidationError('test'), expectedDomain: ErrorDomain.VALIDATION, expectedSeverity: ErrorSeverity.MEDIUM },
        { error: new NotFoundError('test'), expectedDomain: ErrorDomain.SYSTEM, expectedSeverity: ErrorSeverity.MEDIUM },
        { error: new UnauthorizedError('test'), expectedDomain: ErrorDomain.AUTHENTICATION, expectedSeverity: ErrorSeverity.HIGH },
        { error: new ForbiddenError('test'), expectedDomain: ErrorDomain.AUTHORIZATION, expectedSeverity: ErrorSeverity.HIGH },
        { error: new NetworkError('test'), expectedDomain: ErrorDomain.NETWORK, expectedSeverity: ErrorSeverity.MEDIUM },
        { error: new DatabaseError('test'), expectedDomain: ErrorDomain.DATABASE, expectedSeverity: ErrorSeverity.HIGH },
        { error: new CacheError('test'), expectedDomain: ErrorDomain.CACHE, expectedSeverity: ErrorSeverity.LOW },
        { error: new ConflictError('test'), expectedDomain: ErrorDomain.BUSINESS_LOGIC, expectedSeverity: ErrorSeverity.MEDIUM }
      ];

      testCases.forEach(({ error, expectedDomain, expectedSeverity }) => {
        expect(error.metadata?.domain).toBe(expectedDomain);
        expect(error.metadata?.severity).toBe(expectedSeverity);
      });
    });
  });
});