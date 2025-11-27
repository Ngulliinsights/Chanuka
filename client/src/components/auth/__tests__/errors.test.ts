import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Auth error handling tests
 */

import {
  AuthError,
  AuthValidationError,
  AuthCredentialsError,
  AuthRegistrationError,
  AuthNetworkError,
  AuthRateLimitError,
  AuthConfigurationError,
  AuthSessionError,
  AuthErrorType,
  isAuthError,
  isRetryableError,
  isValidationError,
  isCredentialsError,
  isNetworkError,
  isRateLimitError,
  getErrorMessage,
  getErrorDetails,
  getUserFriendlyMessage
} from '@client/errors';

describe('Auth Errors', () => {
  describe('AuthError base class', () => {
    it('should create basic auth error', () => {
      const error = new AuthError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AuthError');
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(AuthErrorType.AUTH_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.canRetry).toBe(false);
    });

    it('should create auth error with custom properties', () => {
      const error = new AuthError(
        'Custom error',
        AuthErrorType.AUTH_NETWORK_ERROR,
        503,
        { custom: 'data' },
        true
      );
      
      expect(error.message).toBe('Custom error');
      expect(error.type).toBe(AuthErrorType.AUTH_NETWORK_ERROR);
      expect(error.statusCode).toBe(503);
      expect(error.details).toEqual({ custom: 'data' });
      expect(error.canRetry).toBe(true);
    });

    it('should maintain proper stack trace', () => {
      const error = new AuthError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AuthError');
    });
  });

  describe('AuthValidationError', () => {
    it('should create validation error with field info', () => {
      const error = new AuthValidationError('Invalid email', 'email', 'invalid-email');
      
      expect(error).toBeInstanceOf(AuthError);
      expect(error.type).toBe(AuthErrorType.AUTH_VALIDATION_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.canRetry).toBe(false);
      expect(error.details?.field).toBe('email');
      expect(error.details?.value).toBe('invalid-email');
    });

    it('should include additional details', () => {
      const zodError = { errors: [{ message: 'Zod error' }] };
      const error = new AuthValidationError(
        'Validation failed',
        'password',
        'weak',
        { zodError }
      );
      
      expect(error.details?.zodError).toBe(zodError);
    });
  });

  describe('AuthCredentialsError', () => {
    it('should create credentials error with default message', () => {
      const error = new AuthCredentialsError();
      
      expect(error.message).toBe('Invalid credentials');
      expect(error.type).toBe(AuthErrorType.AUTH_CREDENTIALS_ERROR);
      expect(error.statusCode).toBe(401);
      expect(error.canRetry).toBe(true);
    });

    it('should create credentials error with custom message', () => {
      const error = new AuthCredentialsError('Wrong password');
      
      expect(error.message).toBe('Wrong password');
    });
  });

  describe('AuthRegistrationError', () => {
    it('should create registration error', () => {
      const error = new AuthRegistrationError('Email already exists', 'duplicate_email');
      
      expect(error.type).toBe(AuthErrorType.AUTH_REGISTRATION_ERROR);
      expect(error.statusCode).toBe(409);
      expect(error.canRetry).toBe(true);
      expect(error.details?.reason).toBe('duplicate_email');
    });
  });

  describe('AuthNetworkError', () => {
    it('should create network error with default message', () => {
      const error = new AuthNetworkError();
      
      expect(error.message).toBe('Network error occurred');
      expect(error.type).toBe(AuthErrorType.AUTH_NETWORK_ERROR);
      expect(error.statusCode).toBe(503);
      expect(error.canRetry).toBe(true);
    });
  });

  describe('AuthRateLimitError', () => {
    it('should create rate limit error with retry info', () => {
      const error = new AuthRateLimitError('Too many attempts', 300);
      
      expect(error.type).toBe(AuthErrorType.AUTH_RATE_LIMIT_ERROR);
      expect(error.statusCode).toBe(429);
      expect(error.canRetry).toBe(false);
      expect(error.details?.retryAfter).toBe(300);
    });
  });

  describe('AuthConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new AuthConfigurationError('Invalid config');
      
      expect(error.type).toBe(AuthErrorType.AUTH_CONFIGURATION_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.canRetry).toBe(false);
    });
  });

  describe('AuthSessionError', () => {
    it('should create session error with default message', () => {
      const error = new AuthSessionError();
      
      expect(error.message).toBe('Session expired or invalid');
      expect(error.type).toBe(AuthErrorType.AUTH_SESSION_ERROR);
      expect(error.statusCode).toBe(401);
      expect(error.canRetry).toBe(true);
    });
  });

  describe('Error type checking functions', () => {
    const authError = new AuthError('Test');
    const validationError = new AuthValidationError('Invalid', 'field', 'value');
    const credentialsError = new AuthCredentialsError();
    const networkError = new AuthNetworkError();
    const rateLimitError = new AuthRateLimitError();
    const regularError = new Error('Regular error');

    describe('isAuthError', () => {
      it('should identify auth errors', () => {
        expect(isAuthError(authError)).toBe(true);
        expect(isAuthError(validationError)).toBe(true);
        expect(isAuthError(credentialsError)).toBe(true);
        expect(isAuthError(regularError)).toBe(false);
        expect(isAuthError('string')).toBe(false);
        expect(isAuthError(null)).toBe(false);
      });
    });

    describe('isRetryableError', () => {
      it('should identify retryable errors', () => {
        expect(isRetryableError(credentialsError)).toBe(true);
        expect(isRetryableError(networkError)).toBe(true);
        expect(isRetryableError(validationError)).toBe(false);
        expect(isRetryableError(rateLimitError)).toBe(false);
        expect(isRetryableError(regularError)).toBe(false);
      });
    });

    describe('isValidationError', () => {
      it('should identify validation errors', () => {
        expect(isValidationError(validationError)).toBe(true);
        expect(isValidationError(credentialsError)).toBe(false);
        expect(isValidationError(regularError)).toBe(false);
      });
    });

    describe('isCredentialsError', () => {
      it('should identify credentials errors', () => {
        expect(isCredentialsError(credentialsError)).toBe(true);
        expect(isCredentialsError(validationError)).toBe(false);
        expect(isCredentialsError(regularError)).toBe(false);
      });
    });

    describe('isNetworkError', () => {
      it('should identify network errors', () => {
        expect(isNetworkError(networkError)).toBe(true);
        expect(isNetworkError(credentialsError)).toBe(false);
        expect(isNetworkError(regularError)).toBe(false);
      });
    });

    describe('isRateLimitError', () => {
      it('should identify rate limit errors', () => {
        expect(isRateLimitError(rateLimitError)).toBe(true);
        expect(isRateLimitError(networkError)).toBe(false);
        expect(isRateLimitError(regularError)).toBe(false);
      });
    });
  });

  describe('Error message helpers', () => {
    describe('getErrorMessage', () => {
      it('should get message from auth errors', () => {
        const error = new AuthError('Auth error message');
        expect(getErrorMessage(error)).toBe('Auth error message');
      });

      it('should get message from regular errors', () => {
        const error = new Error('Regular error message');
        expect(getErrorMessage(error)).toBe('Regular error message');
      });

      it('should handle non-error values', () => {
        expect(getErrorMessage('string')).toBe('An unexpected error occurred');
        expect(getErrorMessage(null)).toBe('An unexpected error occurred');
        expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      });
    });

    describe('getErrorDetails', () => {
      it('should get details from auth errors', () => {
        const details = { field: 'email', value: 'invalid' };
        const error = new AuthValidationError('Invalid email', 'email', 'invalid', details);
        
        const result = getErrorDetails(error);
        expect(result).toEqual(expect.objectContaining(details));
      });

      it('should return undefined for non-auth errors', () => {
        const error = new Error('Regular error');
        expect(getErrorDetails(error)).toBeUndefined();
      });
    });

    describe('getUserFriendlyMessage', () => {
      it('should return user-friendly message for validation errors', () => {
        const error = new AuthValidationError('Email is required', 'email', '');
        expect(getUserFriendlyMessage(error)).toBe('Email is required');
      });

      it('should return user-friendly message for credentials errors', () => {
        const error = new AuthCredentialsError();
        const message = getUserFriendlyMessage(error);
        expect(message).toContain('Invalid email or password');
      });

      it('should return user-friendly message for registration errors', () => {
        const error = new AuthRegistrationError('Email already exists');
        const message = getUserFriendlyMessage(error);
        expect(message).toContain('email already exists');
      });

      it('should return user-friendly message for network errors', () => {
        const error = new AuthNetworkError();
        const message = getUserFriendlyMessage(error);
        expect(message).toContain('Unable to connect');
      });

      it('should return user-friendly message for rate limit errors', () => {
        const error = new AuthRateLimitError();
        const message = getUserFriendlyMessage(error);
        expect(message).toContain('Too many login attempts');
      });

      it('should return user-friendly message for session errors', () => {
        const error = new AuthSessionError();
        const message = getUserFriendlyMessage(error);
        expect(message).toContain('session has expired');
      });

      it('should return generic message for configuration errors', () => {
        const error = new AuthConfigurationError('Config error');
        const message = getUserFriendlyMessage(error);
        expect(message).toContain('system error occurred');
      });

      it('should return generic message for unknown errors', () => {
        const error = new AuthError('Unknown error', AuthErrorType.AUTH_ERROR);
        const message = getUserFriendlyMessage(error);
        expect(message).toContain('error occurred during authentication');
      });

      it('should return generic message for non-auth errors', () => {
        const error = new Error('Regular error');
        const message = getUserFriendlyMessage(error);
        expect(message).toBe('An unexpected error occurred. Please try again.');
      });
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new AuthValidationError('Test', 'field', 'value');
      
      expect(validationError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(AuthError);
      expect(validationError).toBeInstanceOf(AuthValidationError);
    });

    it('should work with instanceof checks', () => {
      const errors = [
        new AuthValidationError('Test', 'field', 'value'),
        new AuthCredentialsError(),
        new AuthNetworkError(),
        new AuthRateLimitError()
      ];

      errors.forEach(error => {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AuthError).toBe(true);
      });
    });
  });

  describe('Error serialization', () => {
    it('should serialize auth errors properly', () => {
      const error = new AuthValidationError('Invalid email', 'email', 'invalid@');
      
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.message).toBe('Invalid email');
      expect(parsed.type).toBe(AuthErrorType.AUTH_VALIDATION_ERROR);
      expect(parsed.statusCode).toBe(422);
    });

    it('should handle circular references in details', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;
      
      const error = new AuthError('Test', AuthErrorType.AUTH_ERROR, 400, { circular });
      
      // Should not throw when stringifying
      expect(() => JSON.stringify(error)).not.toThrow();
    });
  });
});

