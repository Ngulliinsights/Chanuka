import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Auth recovery system tests
 */

import {
  getRecoveryStrategy,
  canAutoRecover,
  shouldShowRecovery,
  getRecoveryDelay,
  createRecoveryContext,
  updateRecoveryContext
} from '../recovery';
import {
  AuthError,
  AuthValidationError,
  AuthCredentialsError,
  AuthRegistrationError,
  AuthNetworkError,
  AuthRateLimitError,
  AuthSessionError,
  AuthErrorType
} from '../errors';

// Mock window.location for tests
const mockLocation = {
  href: '',
  reload: vi.fn()
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock window.open
Object.defineProperty(window, 'open', {
  value: vi.fn(),
  writable: true
});

describe('Auth Recovery System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  describe('getRecoveryStrategy', () => {
    describe('Validation error recovery', () => {
      it('should provide email validation recovery', () => {
        const error = new AuthValidationError('Invalid email', 'email', 'invalid@');
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Check that your email address is correctly formatted');
        expect(strategy.userActions).toHaveLength(1);
        expect(strategy.userActions![0].label).toBe('Fix and retry');
      });

      it('should provide password validation recovery for register mode', () => {
        const error = new AuthValidationError('Password too weak', 'password', 'weak');
        const context = createRecoveryContext(error, 1, {}, 'register');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.suggestions).toContain('Password must be at least 12 characters long');
        expect(strategy.suggestions).toContain('Include uppercase, lowercase, number, and special character');
      });

      it('should provide name validation recovery', () => {
        const error = new AuthValidationError('Invalid name', 'firstName', 'J');
        const context = createRecoveryContext(error, 1, {}, 'register');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.suggestions).toContain('Names can only contain letters, hyphens, and apostrophes');
        expect(strategy.suggestions).toContain('Must be between 2-50 characters');
      });

      it('should provide confirm password recovery', () => {
        const error = new AuthValidationError('Passwords do not match', 'confirmPassword', 'different');
        const context = createRecoveryContext(error, 1, {}, 'register');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.suggestions).toContain('Make sure both password fields match exactly');
      });
    });

    describe('Credentials error recovery', () => {
      it('should provide basic credentials recovery', () => {
        const error = new AuthCredentialsError();
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Double-check your email address and password');
        expect(strategy.userActions).toHaveLength(1);
        expect(strategy.userActions![0].label).toBe('Try again');
      });

      it('should add password reset option after multiple attempts', () => {
        const error = new AuthCredentialsError();
        const context = createRecoveryContext(error, 3, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.suggestions).toContain('If you forgot your password, use the reset option');
        expect(strategy.userActions).toHaveLength(2);
        expect(strategy.userActions![1].label).toBe('Reset password');
      });

      it('should navigate to password reset when action is triggered', () => {
        const error = new AuthCredentialsError();
        const context = createRecoveryContext(error, 3, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        const resetAction = strategy.userActions!.find(action => action.label === 'Reset password');
        
        resetAction!.action();
        expect(mockLocation.href).toBe('/auth/reset-password');
      });
    });

    describe('Registration error recovery', () => {
      it('should handle email already exists error', () => {
        const error = new AuthRegistrationError('Email already exists');
        const context = createRecoveryContext(error, 1, {}, 'register');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.suggestions).toContain('This email is already registered');
        expect(strategy.suggestions).toContain('Try logging in instead');
        expect(strategy.userActions![0].label).toBe('Switch to login');
      });

      it('should handle general registration errors', () => {
        const error = new AuthRegistrationError('Registration failed');
        const context = createRecoveryContext(error, 1, {}, 'register');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.suggestions).toContain('Check all required fields are filled correctly');
        expect(strategy.userActions![0].label).toBe('Try again');
      });
    });

    describe('Network error recovery', () => {
      it('should provide network recovery with auto-recovery', () => {
        const error = new AuthNetworkError();
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Check your internet connection');
        expect(strategy.autoRecovery).toBeDefined();
        expect(strategy.userActions).toHaveLength(2);
        expect(strategy.userActions![0].label).toBe('Retry');
        expect(strategy.userActions![1].label).toBe('Refresh page');
      });

      it('should refresh page when refresh action is triggered', () => {
        const error = new AuthNetworkError();
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        const refreshAction = strategy.userActions!.find(action => action.label === 'Refresh page');
        
        refreshAction!.action();
        expect(mockLocation.reload).toHaveBeenCalled();
      });

      it('should test server connectivity in auto-recovery', async () => {
        // Mock fetch for health check
        global.fetch = vi.fn().mockResolvedValue({ ok: true });
        
        const error = new AuthNetworkError();
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        const result = await strategy.autoRecovery!();
        
        expect(result).toBe(true);
        expect(fetch).toHaveBeenCalledWith('/api/health', { method: 'HEAD' });
      });
    });

    describe('Rate limit error recovery', () => {
      it('should provide rate limit recovery with time info', () => {
        const error = new AuthRateLimitError('Too many attempts', 300);
        const context = createRecoveryContext(error, 5, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions[0]).toContain('Too many attempts. Please wait until');
        expect(strategy.userActions).toHaveLength(1);
        expect(strategy.userActions![0].label).toBe('Reset password');
      });
    });

    describe('Session error recovery', () => {
      it('should provide session recovery with auto-cleanup', () => {
        const error = new AuthSessionError();
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Your session has expired for security reasons');
        expect(strategy.autoRecovery).toBeDefined();
        expect(strategy.userActions![0].label).toBe('Log in again');
      });

      it('should clear session data in auto-recovery', async () => {
        // Mock localStorage and sessionStorage
        const mockLocalStorage = {
          removeItem: vi.fn()
        };
        const mockSessionStorage = {
          clear: vi.fn()
        };
        
        Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
        Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
        
        const error = new AuthSessionError();
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        const result = await strategy.autoRecovery!();
        
        expect(result).toBe(true);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
        expect(mockSessionStorage.clear).toHaveBeenCalled();
      });
    });

    describe('Default error recovery', () => {
      it('should provide default recovery for unknown errors', () => {
        const error = new AuthError('Unknown error');
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        
        expect(strategy.canRecover).toBe(false); // Unknown errors are not retryable by default
        expect(strategy.suggestions).toContain('An unexpected error occurred');
        expect(strategy.userActions).toHaveLength(2);
        expect(strategy.userActions![1].label).toBe('Contact support');
      });

      it('should open support page when contact support is triggered', () => {
        const error = new AuthError('Unknown error');
        const context = createRecoveryContext(error, 1, {}, 'login');
        
        const strategy = getRecoveryStrategy(context);
        const supportAction = strategy.userActions!.find(action => action.label === 'Contact support');
        
        supportAction!.action();
        expect(window.open).toHaveBeenCalledWith('/support', '_blank');
      });
    });
  });

  describe('Recovery utility functions', () => {
    describe('canAutoRecover', () => {
      it('should identify auto-recoverable errors', () => {
        expect(canAutoRecover(new AuthNetworkError())).toBe(true);
        expect(canAutoRecover(new AuthSessionError())).toBe(true);
        expect(canAutoRecover(new AuthValidationError('Invalid', 'field', 'value'))).toBe(false);
        expect(canAutoRecover(new AuthCredentialsError())).toBe(false);
      });
    });

    describe('shouldShowRecovery', () => {
      it('should always show recovery for validation errors', () => {
        const error = new AuthValidationError('Invalid', 'field', 'value');
        expect(shouldShowRecovery(error, 1)).toBe(true);
        expect(shouldShowRecovery(error, 0)).toBe(true);
      });

      it('should show recovery for credentials errors after first attempt', () => {
        const error = new AuthCredentialsError();
        expect(shouldShowRecovery(error, 0)).toBe(false);
        expect(shouldShowRecovery(error, 1)).toBe(true);
        expect(shouldShowRecovery(error, 3)).toBe(true);
      });

      it('should always show recovery for network and rate limit errors', () => {
        expect(shouldShowRecovery(new AuthNetworkError(), 0)).toBe(true);
        expect(shouldShowRecovery(new AuthRateLimitError(), 0)).toBe(true);
      });

      it('should not show recovery for other error types by default', () => {
        expect(shouldShowRecovery(new AuthError('Unknown'), 1)).toBe(false);
      });
    });

    describe('getRecoveryDelay', () => {
      it('should return rate limit delay', () => {
        const error = new AuthRateLimitError('Too many attempts', 300);
        expect(getRecoveryDelay(error, 1)).toBe(300);
      });

      it('should return exponential backoff for network errors', () => {
        const error = new AuthNetworkError();
        expect(getRecoveryDelay(error, 1)).toBe(1000);
        expect(getRecoveryDelay(error, 2)).toBe(2000);
        expect(getRecoveryDelay(error, 3)).toBe(4000);
        expect(getRecoveryDelay(error, 10)).toBe(30000); // Max 30 seconds
      });

      it('should return 0 for other error types', () => {
        expect(getRecoveryDelay(new AuthValidationError('Invalid', 'field', 'value'), 1)).toBe(0);
        expect(getRecoveryDelay(new AuthCredentialsError(), 1)).toBe(0);
      });
    });
  });

  describe('Recovery context management', () => {
    describe('createRecoveryContext', () => {
      it('should create recovery context with defaults', () => {
        const error = new AuthError('Test error');
        const context = createRecoveryContext(error);
        
        expect(context.error).toBe(error);
        expect(context.attemptCount).toBe(1);
        expect(context.lastAttempt).toBeInstanceOf(Date);
        expect(context.formData).toBeUndefined();
        expect(context.mode).toBeUndefined();
      });

      it('should create recovery context with custom values', () => {
        const error = new AuthError('Test error');
        const formData = { email: 'test@example.com' };
        const context = createRecoveryContext(error, 3, formData, 'login');
        
        expect(context.attemptCount).toBe(3);
        expect(context.formData).toBe(formData);
        expect(context.mode).toBe('login');
      });
    });

    describe('updateRecoveryContext', () => {
      it('should update context with new error', () => {
        const originalError = new AuthError('Original error');
        const newError = new AuthCredentialsError();
        const originalContext = createRecoveryContext(originalError, 1);
        
        const updatedContext = updateRecoveryContext(originalContext, newError);
        
        expect(updatedContext.error).toBe(newError);
        expect(updatedContext.attemptCount).toBe(2);
        expect(updatedContext.lastAttempt.getTime()).toBeGreaterThan(originalContext.lastAttempt.getTime());
      });

      it('should update context without new error', () => {
        const error = new AuthError('Test error');
        const originalContext = createRecoveryContext(error, 2);
        
        const updatedContext = updateRecoveryContext(originalContext);
        
        expect(updatedContext.error).toBe(error);
        expect(updatedContext.attemptCount).toBe(3);
      });

      it('should preserve other context properties', () => {
        const error = new AuthError('Test error');
        const formData = { email: 'test@example.com' };
        const originalContext = createRecoveryContext(error, 1, formData, 'register');
        
        const updatedContext = updateRecoveryContext(originalContext);
        
        expect(updatedContext.formData).toBe(formData);
        expect(updatedContext.mode).toBe('register');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete recovery flow for network error', async () => {
      // Mock successful health check
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      const error = new AuthNetworkError();
      let context = createRecoveryContext(error, 1, {}, 'login');
      
      // Get initial strategy
      let strategy = getRecoveryStrategy(context);
      expect(strategy.canRecover).toBe(true);
      expect(strategy.autoRecovery).toBeDefined();
      
      // Test auto-recovery
      const recovered = await strategy.autoRecovery!();
      expect(recovered).toBe(true);
      
      // Update context after failed recovery attempt
      context = updateRecoveryContext(context);
      strategy = getRecoveryStrategy(context);
      
      expect(context.attemptCount).toBe(2);
      expect(getRecoveryDelay(error, 2)).toBe(2000); // Exponential backoff
    });

    it('should handle escalating credentials error recovery', () => {
      const error = new AuthCredentialsError();
      
      // First attempt - no recovery shown
      let context = createRecoveryContext(error, 0, {}, 'login');
      expect(shouldShowRecovery(error, 0)).toBe(false);
      
      // Second attempt - basic recovery
      context = updateRecoveryContext(context);
      let strategy = getRecoveryStrategy(context);
      expect(strategy.userActions).toHaveLength(1);
      expect(strategy.userActions![0].label).toBe('Try again');
      
      // Third attempt - password reset option appears
      context = updateRecoveryContext(context);
      strategy = getRecoveryStrategy(context);
      expect(strategy.userActions).toHaveLength(2);
      expect(strategy.userActions![1].label).toBe('Reset password');
    });
  });
});

