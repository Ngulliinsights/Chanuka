import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  NetworkError,
  ExternalServiceError,
  BusinessLogicError,
  SystemError,
  RateLimitError,
  ConfigurationError,
  TimeoutError,
  ResourceNotFoundError,
  ConflictError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  InternalServerError,
} from '../errors/specialized';
import { ErrorDomain, ErrorSeverity } from '../../primitives/errors';

describe('Specialized Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.VALIDATION);
      expect(error.metadata.severity).toBe(ErrorSeverity.LOW);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new ValidationError('Email is required');
      expect(error.getUserMessage()).toBe('Validation failed: Email is required');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with correct properties', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.AUTHENTICATION);
      expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new AuthenticationError('Token expired');
      expect(error.getUserMessage()).toBe('Authentication failed: Token expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with correct properties', () => {
      const error = new AuthorizationError('Access denied');

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.AUTHORIZATION);
      expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new AuthorizationError('Insufficient permissions');
      expect(error.getUserMessage()).toBe('Access denied: Insufficient permissions');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with correct properties', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.DATABASE);
      expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata.retryable).toBe(true);
      expect(error.metadata.recoveryStrategies).toHaveLength(1);
    });

    it('should have user-friendly message', () => {
      const error = new DatabaseError('Query timeout');
      expect(error.getUserMessage()).toBe('A database error occurred. Please try again later.');
    });
  });

  describe('NetworkError', () => {
    it('should create network error with correct properties', () => {
      const error = new NetworkError('Connection timeout');

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.NETWORK);
      expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata.retryable).toBe(true);
      expect(error.metadata.recoveryStrategies).toHaveLength(1);
    });

    it('should have user-friendly message', () => {
      const error = new NetworkError('Network unreachable');
      expect(error.getUserMessage()).toBe('Network connection failed. Please check your connection and try again.');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error with correct properties', () => {
      const error = new ExternalServiceError('API unavailable');

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.EXTERNAL_SERVICE);
      expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata.retryable).toBe(true);
      expect(error.metadata.recoveryStrategies).toHaveLength(1);
    });

    it('should have user-friendly message', () => {
      const error = new ExternalServiceError('Third-party service down');
      expect(error.getUserMessage()).toBe('External service is currently unavailable. Please try again later.');
    });
  });

  describe('BusinessLogicError', () => {
    it('should create business logic error with correct properties', () => {
      const error = new BusinessLogicError('Invalid operation');

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.BUSINESS_LOGIC);
      expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new BusinessLogicError('Cannot delete active record');
      expect(error.getUserMessage()).toBe('Business rule violation: Cannot delete active record');
    });
  });

  describe('SystemError', () => {
    it('should create system error with correct properties', () => {
      const error = new SystemError('Critical system failure');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SYSTEM_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.SYSTEM);
      expect(error.metadata.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new SystemError('Memory leak detected');
      expect(error.getUserMessage()).toBe('A system error occurred. Our team has been notified.');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with correct properties', () => {
      const error = new RateLimitError('Too many requests', { retryAfter: 60 });

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.SYSTEM);
      expect(error.metadata.severity).toBe(ErrorSeverity.LOW);
      expect(error.metadata.retryable).toBe(true);
      expect(error.metadata.recoveryStrategies).toHaveLength(1);
    });

    it('should have user-friendly message', () => {
      const error = new RateLimitError('API limit exceeded');
      expect(error.getUserMessage()).toBe('Rate limit exceeded: API limit exceeded');
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error with correct properties', () => {
      const error = new ConfigurationError('Missing environment variable');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.SYSTEM);
      expect(error.metadata.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new ConfigurationError('Database URL not configured');
      expect(error.getUserMessage()).toBe('Configuration error detected. Please contact support.');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with correct properties', () => {
      const error = new TimeoutError('Operation timed out');

      expect(error.statusCode).toBe(408);
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.SYSTEM);
      expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.metadata.retryable).toBe(true);
      expect(error.metadata.recoveryStrategies).toHaveLength(1);
    });

    it('should have user-friendly message', () => {
      const error = new TimeoutError('Request timeout');
      expect(error.getUserMessage()).toBe('Operation timed out: Request timeout');
    });
  });

  describe('ResourceNotFoundError', () => {
    it('should create resource not found error with correct properties', () => {
      const error = new ResourceNotFoundError('User not found');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.metadata.domain).toBe(ErrorDomain.BUSINESS_LOGIC);
      expect(error.metadata.severity).toBe(ErrorSeverity.LOW);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new ResourceNotFoundError('Document does not exist');
      expect(error.getUserMessage()).toBe('Resource not found: Document does not exist');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with correct properties', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.BUSINESS_LOGIC);
      expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new ConflictError('Email already in use');
      expect(error.getUserMessage()).toBe('Conflict detected: Email already in use');
    });
  });

  describe('PayloadTooLargeError', () => {
    it('should create payload too large error with correct properties', () => {
      const error = new PayloadTooLargeError('File too big');

      expect(error.statusCode).toBe(413);
      expect(error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(error.metadata.domain).toBe(ErrorDomain.VALIDATION);
      expect(error.metadata.severity).toBe(ErrorSeverity.LOW);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new PayloadTooLargeError('Upload exceeds limit');
      expect(error.getUserMessage()).toBe('Payload too large: Upload exceeds limit');
    });
  });

  describe('UnsupportedMediaTypeError', () => {
    it('should create unsupported media type error with correct properties', () => {
      const error = new UnsupportedMediaTypeError('Invalid file format');

      expect(error.statusCode).toBe(415);
      expect(error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
      expect(error.metadata.domain).toBe(ErrorDomain.VALIDATION);
      expect(error.metadata.severity).toBe(ErrorSeverity.LOW);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new UnsupportedMediaTypeError('Format not supported');
      expect(error.getUserMessage()).toBe('Unsupported media type: Format not supported');
    });
  });

  describe('InternalServerError', () => {
    it('should create internal server error with correct properties', () => {
      const error = new InternalServerError('Unexpected error');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.SYSTEM);
      expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata.retryable).toBe(false);
    });

    it('should have user-friendly message', () => {
      const error = new InternalServerError('Database connection lost');
      expect(error.getUserMessage()).toBe('An internal server error occurred. Please try again later.');
    });
  });
});




































