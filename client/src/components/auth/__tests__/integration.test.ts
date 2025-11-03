import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Auth component integration tests
 */

import { renderHook, act } from '@testing-library/react';
import { useAuthForm } from '@/hooks/useAuthForm';
import {
  validateLoginData,
  validateRegisterData,
  safeValidateEmail,
  safeValidatePassword
} from '../validation';
import {
  getRecoveryStrategy,
  createRecoveryContext
} from '../recovery';
import {
  AuthCredentialsError,
  AuthNetworkError,
  AuthValidationError,
  getUserFriendlyMessage
} from '../errors';
import {
  checkPasswordStrength,
  validateFormBatch,
  sanitizeInput
} from '@/utils/auth-validation';
import {
  createMockUseAuth,
  createMockLoginData,
  createMockRegisterData,
  createMockChangeEvent,
  createMockSubmitEvent
} from '@/utils/test-utils';

// Mock the useAuth hook
const mockUseAuth = createMockUseAuth();
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth
}));

describe('Auth Component Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete login flow', () => {
    it('should handle successful login with validation and recovery', async () => {
      mockUseAuth.login.mockResolvedValue({ success: true, data: { user: { id: 1 } } });
      
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onSuccess }));
      
      // Fill form with valid data
      const loginData = createMockLoginData();
      
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', loginData.email));
        result.current.handleInputChange(createMockChangeEvent('password', loginData.password));
      });
      
      // Validate form is ready
      expect(result.current.isValid).toBe(true);
      expect(result.current.canSubmit).toBe(true);
      
      // Submit form
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      // Verify success
      expect(mockUseAuth.login).toHaveBeenCalledWith(loginData.email, loginData.password);
      expect(result.current.apiResponse?.success).toBe('Login successful!');
      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.errors).toEqual({});
    });

    it('should handle login failure with recovery strategy', async () => {
      mockUseAuth.login.mockResolvedValue({ success: false, error: 'Invalid credentials' });
      
      const onError = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onError }));
      
      // Fill form
      const loginData = createMockLoginData();
      
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', loginData.email));
        result.current.handleInputChange(createMockChangeEvent('password', 'wrongpassword'));
      });
      
      // Submit form
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      // Verify error handling
      expect(result.current.apiResponse?.error).toBe('Invalid credentials');
      expect(result.current.attemptCount).toBe(1);
      expect(result.current.recoveryStrategy).toBeDefined();
      expect(result.current.recoveryStrategy?.canRecover).toBe(true);
      expect(onError).toHaveBeenCalledWith('Invalid credentials');
    });

    it('should handle validation errors before submission', async () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Fill form with invalid data
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'invalid-email'));
        result.current.handleInputChange(createMockChangeEvent('password', 'short'));
      });
      
      // Trigger validation
      await act(() => {
        result.current.handleBlur(createMockChangeEvent('email', 'invalid-email'));
        result.current.handleBlur(createMockChangeEvent('password', 'short'));
      });
      
      // Verify validation errors
      expect(result.current.errors.email).toBeTruthy();
      expect(result.current.errors.password).toBeTruthy();
      expect(result.current.isValid).toBe(false);
      expect(result.current.canSubmit).toBe(false);
      
      // Submit should not call API
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(mockUseAuth.login).not.toHaveBeenCalled();
    });
  });

  describe('Complete registration flow', () => {
    it('should handle successful registration with comprehensive validation', async () => {
      mockUseAuth.register.mockResolvedValue({ success: true, data: { user: { id: 1 } } });
      
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useAuthForm({ 
        initialMode: 'register',
        onSuccess 
      }));
      
      // Fill form with valid registration data
      const registerData = createMockRegisterData();
      
      await act(() => {
        Object.entries(registerData).forEach(([key, value]) => {
          result.current.handleInputChange(createMockChangeEvent(key, value));
        });
      });
      
      // Validate form state
      expect(result.current.isValid).toBe(true);
      expect(result.current.mode).toBe('register');
      
      // Submit form
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      // Verify registration
      expect(mockUseAuth.register).toHaveBeenCalledWith({
        email: registerData.email,
        password: registerData.password,
        first_name: registerData.first_name,
        last_name: registerData.last_name
      });
      expect(result.current.apiResponse?.success).toBe('Account created successfully!');
      expect(onSuccess).toHaveBeenCalled();
      
      // Form should be reset after successful registration
      expect(result.current.formData.email).toBe('');
    });

    it('should validate password strength in registration mode', () => {
      const { result } = renderHook(() => useAuthForm({ initialMode: 'register' }));
      
      // Test weak password
      await act(() => {
        result.current.handleBlur(createMockChangeEvent('password', 'weakpass'));
      });
      
      expect(result.current.errors.password).toBeTruthy();
      
      // Test strong password
      await act(() => {
        result.current.handleBlur(createMockChangeEvent('password', 'StrongP@ssw0rd123!'));
      });
      
      expect(result.current.errors.password).toBeUndefined();
    });

    it('should validate confirm password matching', () => {
      const { result } = renderHook(() => useAuthForm({ initialMode: 'register' }));
      
      // Set password first
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('password', 'StrongP@ssw0rd123!'));
      });
      
      // Set mismatched confirm password
      await act(() => {
        result.current.handleBlur(createMockChangeEvent('confirmPassword', 'DifferentP@ssw0rd123!'));
      });
      
      expect(result.current.errors.confirmPassword).toContain("don't match");
      
      // Fix confirm password
      await act(() => {
        result.current.handleBlur(createMockChangeEvent('confirmPassword', 'StrongP@ssw0rd123!'));
      });
      
      expect(result.current.errors.confirmPassword).toBeUndefined();
    });
  });

  describe('Mode switching integration', () => {
    it('should switch between login and register modes cleanly', () => {
      const onModeChange = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onModeChange }));
      
      // Start in login mode
      expect(result.current.mode).toBe('login');
      expect(result.current.isLoginMode).toBe(true);
      
      // Fill some data and create errors
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleBlur(createMockChangeEvent('password', 'short'));
      });
      
      expect(result.current.formData.email).toBe('test@example.com');
      expect(result.current.errors.password).toBeTruthy();
      
      // Switch to register mode
      await act(() => {
        result.current.toggleMode();
      });
      
      expect(result.current.mode).toBe('register');
      expect(result.current.isRegisterMode).toBe(true);
      expect(result.current.formData.email).toBe(''); // Form reset
      expect(result.current.errors).toEqual({}); // Errors cleared
      expect(onModeChange).toHaveBeenCalledWith('register');
      
      // Switch back to login
      await act(() => {
        result.current.toggleMode();
      });
      
      expect(result.current.mode).toBe('login');
      expect(onModeChange).toHaveBeenCalledWith('login');
    });
  });

  describe('Error handling and recovery integration', () => {
    it('should integrate validation, errors, and recovery systems', async () => {
      // Test network error scenario
      mockUseAuth.login.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useAuthForm());
      
      // Fill valid form
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'password123'));
      });
      
      // Submit and get network error
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      // Verify error state
      expect(result.current.apiResponse?.error).toBe('Network error');
      expect(result.current.attemptCount).toBe(1);
      
      // Verify recovery strategy is created
      expect(result.current.recoveryStrategy).toBeDefined();
      
      // Test recovery context creation manually
      const networkError = new AuthNetworkError('Network error');
      const recoveryContext = createRecoveryContext(networkError, 1, result.current.formData, 'login');
      const strategy = getRecoveryStrategy(recoveryContext);
      
      expect(strategy.canRecover).toBe(true);
      expect(strategy.suggestions).toContain('Check your internet connection');
      expect(strategy.autoRecovery).toBeDefined();
    });

    it('should provide user-friendly error messages', () => {
      const errors = [
        new AuthValidationError('Email is required', 'email', ''),
        new AuthCredentialsError(),
        new AuthNetworkError()
      ];
      
      errors.forEach(error => {
        const message = getUserFriendlyMessage(error);
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(10); // Should be descriptive
      });
    });
  });

  describe('Validation utilities integration', () => {
    it('should integrate password strength checking with form validation', () => {
      const passwords = [
        'weak',
        'StrongP@ssw0rd123!',
        'password123',
        'MyVeryStr0ng!P@ssw0rd'
      ];
      
      passwords.forEach(password => {
        const strength = checkPasswordStrength(password);
        const validationResult = safeValidatePassword(password, true);
        
        // Strong passwords should pass both checks
        if (strength.isValid) {
          expect(validationResult.success).toBe(true);
        }
        
        // Weak passwords should fail validation
        if (!strength.isValid) {
          expect(validationResult.success).toBe(false);
        }
      });
    });

    it('should integrate batch validation with form state', () => {
      const formData = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123!',
        first_name: 'John',
        last_name: 'Doe',
        confirmPassword: 'StrongP@ssw0rd123!'
      };
      
      // Test login validation
      const loginResult = validateFormBatch(formData, 'login');
      expect(loginResult.isValid).toBe(true);
      
      // Test registration validation
      const registerResult = validateFormBatch(formData, 'register');
      expect(registerResult.isValid).toBe(true);
      
      // Test with invalid data
      const invalidData = { ...formData, email: 'invalid', password: 'weak' };
      const invalidResult = validateFormBatch(invalidData, 'register');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.email).toBeDefined();
      expect(invalidResult.errors.password).toBeDefined();
    });

    it('should integrate input sanitization with form handling', () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Test sanitization of different input types
      const inputs = [
        { name: 'email', value: '  TEST@EXAMPLE.COM  \x00', expected: 'test@example.com' },
        { name: 'first_name', value: '  John   Doe  \x1F', expected: 'John Doe' },
        { name: 'password', value: '  MyP@ss\x00w0rd!  ', expected: 'MyP@ssw0rd!' }
      ];
      
      inputs.forEach(({ name, value, expected }) => {
        await act(() => {
          result.current.handleInputChange(createMockChangeEvent(name, value));
        });
        
        // The hook should sanitize the input
        const sanitized = sanitizeInput(value, name as any);
        expect(sanitized).toBe(expected);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle rapid form interactions', async () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Simulate rapid typing and validation
      const actions = [
        () => result.current.handleInputChange(createMockChangeEvent('email', 't')),
        () => result.current.handleInputChange(createMockChangeEvent('email', 'te')),
        () => result.current.handleInputChange(createMockChangeEvent('email', 'test')),
        () => result.current.handleInputChange(createMockChangeEvent('email', 'test@')),
        () => result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com')),
        () => result.current.handleBlur(createMockChangeEvent('email', 'test@example.com'))
      ];
      
      // Execute actions rapidly
      await act(() => {
        actions.forEach(action => action());
      });
      
      // Should end up with valid email and no errors
      expect(result.current.formData.email).toBe('test@example.com');
      expect(result.current.errors.email).toBeUndefined();
    });

    it('should handle multiple failed login attempts with escalating recovery', async () => {
      mockUseAuth.login.mockResolvedValue({ success: false, error: 'Invalid credentials' });
      
      const { result } = renderHook(() => useAuthForm());
      
      // Fill form
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'wrongpassword'));
      });
      
      // First attempt
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(result.current.attemptCount).toBe(1);
      
      // Second attempt
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(result.current.attemptCount).toBe(2);
      
      // Third attempt - should offer password reset
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(result.current.attemptCount).toBe(3);
      expect(result.current.recoveryStrategy?.userActions?.length).toBeGreaterThan(1);
      
      // Should include password reset option
      const hasPasswordReset = result.current.recoveryStrategy?.userActions?.some(
        action => action.label.includes('Reset password')
      );
      expect(hasPasswordReset).toBe(true);
    });

    it('should handle form submission during loading state', async () => {
      mockUseAuth.loading = true;
      mockUseAuth.login.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ success: true, data: {} }), 1000);
      }));
      
      const { result } = renderHook(() => useAuthForm());
      
      // Fill form
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'password123'));
      });
      
      // Form should not be submittable during loading
      expect(result.current.canSubmit).toBe(false);
      
      // Attempt to submit should be ignored or handled gracefully
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      // Should maintain loading state
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Accessibility and usability integration', () => {
    it('should provide proper field props for accessibility', () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Fill form and create error
      await act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleBlur(createMockChangeEvent('email', 'invalid-email'));
      });
      
      const emailProps = result.current.getFieldProps('email');
      
      expect(emailProps.name).toBe('email');
      expect(emailProps.value).toBe('invalid-email');
      expect(emailProps.error).toBeTruthy();
      expect(emailProps.required).toBe(true);
      expect(emailProps.disabled).toBe(false);
      expect(typeof emailProps.onChange).toBe('function');
      expect(typeof emailProps.onBlur).toBe('function');
    });

    it('should provide consistent error messaging', () => {
      const { result } = renderHook(() => useAuthForm());
      
      const testCases = [
        { field: 'email', value: 'invalid', expectedError: 'email' },
        { field: 'password', value: 'short', expectedError: 'password' },
        { field: 'first_name', value: 'J', expectedError: 'name' }
      ];
      
      testCases.forEach(({ field, value, expectedError }) => {
        await act(() => {
          result.current.handleBlur(createMockChangeEvent(field, value));
        });
        
        const error = result.current.getFieldError(field);
        expect(error).toBeTruthy();
        expect(error.toLowerCase()).toContain(expectedError);
      });
    });
  });
});

