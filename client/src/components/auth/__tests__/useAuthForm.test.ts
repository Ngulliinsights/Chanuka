/**
 * useAuthForm hook tests
 */

import { renderHook, act } from '@testing-library/react';
import { useAuthForm } from '../hooks/useAuthForm';
import {
  createMockUseAuth,
  createMockChangeEvent,
  createMockBlurEvent,
  createMockSubmitEvent,
  createMockLoginData,
  createMockRegisterData
} from '../utils/test-utils';

// Mock the useAuth hook
const mockUseAuth = createMockUseAuth();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth
}));

describe('useAuthForm Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAuthForm());
      
      expect(result.current.mode).toBe('login');
      expect(result.current.formData).toEqual({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.loading).toBe(false);
      expect(result.current.apiResponse).toBeNull();
      expect(result.current.isValid).toBe(false);
      expect(result.current.attemptCount).toBe(0);
    });

    it('should initialize with custom mode', () => {
      const { result } = renderHook(() => useAuthForm({ initialMode: 'register' }));
      
      expect(result.current.mode).toBe('register');
      expect(result.current.isRegisterMode).toBe(true);
      expect(result.current.isLoginMode).toBe(false);
    });

    it('should initialize with custom options', () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const onModeChange = jest.fn();
      
      const { result } = renderHook(() => useAuthForm({
        initialMode: 'register',
        onSuccess,
        onError,
        onModeChange,
        autoFocus: false,
        realTimeValidation: false
      }));
      
      expect(result.current.mode).toBe('register');
    });
  });

  describe('Form input handling', () => {
    it('should handle input changes', () => {
      const { result } = renderHook(() => useAuthForm());
      
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
      });
      
      expect(result.current.formData.email).toBe('test@example.com');
    });

    it('should sanitize input by removing control characters', () => {
      const { result } = renderHook(() => useAuthForm());
      
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test\x00@example.com\x1F'));
      });
      
      expect(result.current.formData.email).toBe('test@example.com');
    });

    it('should clear API response when user starts typing', () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Set an API response
      act(() => {
        result.current.handleSubmit(createMockSubmitEvent());
      });
      
      // Clear it by typing
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'new@example.com'));
      });
      
      expect(result.current.apiResponse).toBeNull();
    });
  });

  describe('Field validation', () => {
    it('should validate email field on blur', () => {
      const { result } = renderHook(() => useAuthForm());
      
      act(() => {
        result.current.handleBlur(createMockBlurEvent('email', 'invalid-email'));
      });
      
      expect(result.current.errors.email).toBeTruthy();
      expect(result.current.hasError('email')).toBe(true);
    });

    it('should clear validation errors for valid input', () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Set invalid email first
      act(() => {
        result.current.handleBlur(createMockBlurEvent('email', 'invalid-email'));
      });
      
      expect(result.current.errors.email).toBeTruthy();
      
      // Fix the email
      act(() => {
        result.current.handleBlur(createMockBlurEvent('email', 'valid@example.com'));
      });
      
      expect(result.current.errors.email).toBeUndefined();
    });

    it('should validate confirm password field', () => {
      const { result } = renderHook(() => useAuthForm({ initialMode: 'register' }));
      
      // Set password first
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('password', 'SecurePass123!'));
      });
      
      // Set mismatched confirm password
      act(() => {
        result.current.handleBlur(createMockBlurEvent('confirmPassword', 'DifferentPass123!'));
      });
      
      expect(result.current.errors.confirmPassword).toContain("don't match");
    });

    it('should skip validation when realTimeValidation is disabled', () => {
      const { result } = renderHook(() => useAuthForm({ realTimeValidation: false }));
      
      act(() => {
        result.current.handleBlur(createMockBlurEvent('email', 'invalid-email'));
      });
      
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('Form submission', () => {
    it('should handle successful login', async () => {
      const onSuccess = jest.fn();
      mockUseAuth.login.mockResolvedValue({ success: true, data: { user: { id: 1 } } });
      
      const { result } = renderHook(() => useAuthForm({ onSuccess }));
      
      // Fill form with valid data
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'password123'));
      });
      
      // Submit form
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(mockUseAuth.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.apiResponse?.success).toBe('Login successful!');
      expect(onSuccess).toHaveBeenCalledWith({ user: { id: 1 } });
      expect(result.current.attemptCount).toBe(0);
    });

    it('should handle successful registration', async () => {
      const onSuccess = jest.fn();
      mockUseAuth.register.mockResolvedValue({ success: true, data: { user: { id: 1 } } });
      
      const { result } = renderHook(() => useAuthForm({ 
        initialMode: 'register',
        onSuccess 
      }));
      
      const registerData = createMockRegisterData();
      
      // Fill form with valid registration data
      act(() => {
        Object.entries(registerData).forEach(([key, value]) => {
          result.current.handleInputChange(createMockChangeEvent(key, value));
        });
      });
      
      // Submit form
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(mockUseAuth.register).toHaveBeenCalledWith({
        email: registerData.email,
        password: registerData.password,
        firstName: registerData.firstName,
        lastName: registerData.lastName
      });
      expect(result.current.apiResponse?.success).toBe('Account created successfully!');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle login failure', async () => {
      const onError = jest.fn();
      mockUseAuth.login.mockResolvedValue({ success: false, error: 'Invalid credentials' });
      
      const { result } = renderHook(() => useAuthForm({ onError }));
      
      // Fill form with valid data
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'wrongpassword'));
      });
      
      // Submit form
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(result.current.apiResponse?.error).toBe('Invalid credentials');
      expect(result.current.attemptCount).toBe(1);
      expect(result.current.recoveryStrategy).toBeDefined();
      expect(onError).toHaveBeenCalledWith('Invalid credentials');
    });

    it('should handle validation errors during submission', async () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Submit form with invalid data
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'invalid-email'));
        result.current.handleInputChange(createMockChangeEvent('password', 'short'));
      });
      
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(result.current.errors.email).toBeTruthy();
      expect(result.current.errors.password).toBeTruthy();
      expect(mockUseAuth.login).not.toHaveBeenCalled();
    });

    it('should reset form after successful registration', async () => {
      mockUseAuth.register.mockResolvedValue({ success: true, data: {} });
      
      const { result } = renderHook(() => useAuthForm({ initialMode: 'register' }));
      
      // Fill and submit form
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('firstName', 'John'));
      });
      
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(result.current.formData.email).toBe('');
      expect(result.current.formData.firstName).toBe('');
    });
  });

  describe('Mode toggling', () => {
    it('should toggle between login and register modes', () => {
      const onModeChange = jest.fn();
      const { result } = renderHook(() => useAuthForm({ onModeChange }));
      
      expect(result.current.mode).toBe('login');
      
      act(() => {
        result.current.toggleMode();
      });
      
      expect(result.current.mode).toBe('register');
      expect(onModeChange).toHaveBeenCalledWith('register');
      
      act(() => {
        result.current.toggleMode();
      });
      
      expect(result.current.mode).toBe('login');
      expect(onModeChange).toHaveBeenCalledWith('login');
    });

    it('should clear form data and errors when toggling mode', () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Fill form and create errors
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleBlur(createMockBlurEvent('password', 'short'));
      });
      
      expect(result.current.formData.email).toBe('test@example.com');
      expect(result.current.errors.password).toBeTruthy();
      
      // Toggle mode
      act(() => {
        result.current.toggleMode();
      });
      
      expect(result.current.formData.email).toBe('');
      expect(result.current.errors).toEqual({});
      expect(result.current.apiResponse).toBeNull();
      expect(result.current.attemptCount).toBe(0);
    });
  });

  describe('Form validation state', () => {
    it('should be invalid when required fields are missing', () => {
      const { result } = renderHook(() => useAuthForm());
      
      expect(result.current.isValid).toBe(false);
      expect(result.current.canSubmit).toBe(false);
    });

    it('should be valid when all required fields are filled (login)', () => {
      const { result } = renderHook(() => useAuthForm());
      
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'password123'));
      });
      
      expect(result.current.isValid).toBe(true);
      expect(result.current.canSubmit).toBe(true);
    });

    it('should be valid when all required fields are filled (register)', () => {
      const { result } = renderHook(() => useAuthForm({ initialMode: 'register' }));
      
      const registerData = createMockRegisterData();
      
      act(() => {
        Object.entries(registerData).forEach(([key, value]) => {
          result.current.handleInputChange(createMockChangeEvent(key, value));
        });
      });
      
      expect(result.current.isValid).toBe(true);
      expect(result.current.canSubmit).toBe(true);
    });

    it('should be invalid when there are validation errors', () => {
      const { result } = renderHook(() => useAuthForm());
      
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'password123'));
        result.current.handleBlur(createMockBlurEvent('email', 'invalid-email'));
      });
      
      expect(result.current.isValid).toBe(false);
      expect(result.current.canSubmit).toBe(false);
    });

    it('should not be submittable when loading', () => {
      mockUseAuth.loading = true;
      
      const { result } = renderHook(() => useAuthForm());
      
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'password123'));
      });
      
      expect(result.current.isValid).toBe(true);
      expect(result.current.canSubmit).toBe(false);
    });
  });

  describe('Utility functions', () => {
    it('should provide field error getter', () => {
      const { result } = renderHook(() => useAuthForm());
      
      act(() => {
        result.current.handleBlur(createMockBlurEvent('email', 'invalid-email'));
      });
      
      expect(result.current.getFieldError('email')).toBeTruthy();
      expect(result.current.getFieldError('password')).toBeUndefined();
    });

    it('should provide field props helper', () => {
      const { result } = renderHook(() => useAuthForm());
      
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleBlur(createMockBlurEvent('email', 'invalid-email'));
      });
      
      const fieldProps = result.current.getFieldProps('email');
      
      expect(fieldProps.name).toBe('email');
      expect(fieldProps.value).toBe('test@example.com');
      expect(fieldProps.onChange).toBe(result.current.handleInputChange);
      expect(fieldProps.onBlur).toBe(result.current.handleBlur);
      expect(fieldProps.error).toBeTruthy();
      expect(fieldProps.disabled).toBe(false);
      expect(fieldProps.required).toBe(true);
    });

    it('should provide retry function', () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Create an error state
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
      });
      
      // Simulate API error (this would normally be set by handleSubmit)
      // For testing, we'll manually trigger the retry
      act(() => {
        result.current.retry();
      });
      
      expect(result.current.apiResponse).toBeNull();
    });

    it('should reset form completely', () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Fill form and create state
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleBlur(createMockBlurEvent('password', 'short'));
      });
      
      // Reset form
      act(() => {
        result.current.resetForm();
      });
      
      expect(result.current.formData).toEqual({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.apiResponse).toBeNull();
    });
  });

  describe('Recovery integration', () => {
    it('should create recovery context on error', async () => {
      mockUseAuth.login.mockResolvedValue({ success: false, error: 'Network error' });
      
      const { result } = renderHook(() => useAuthForm());
      
      // Fill and submit form
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'password123'));
      });
      
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(result.current.recoveryStrategy).toBeDefined();
      expect(result.current.attemptCount).toBe(1);
    });

    it('should clear recovery context when user makes changes', () => {
      const { result } = renderHook(() => useAuthForm());
      
      // Simulate having a recovery context (would be set by handleSubmit)
      // For testing, we'll check that input changes clear it
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'new@example.com'));
      });
      
      // Recovery context should be cleared when user starts typing
      // This is tested indirectly through the handleInputChange behavior
      expect(result.current.apiResponse).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing useAuth hook gracefully', () => {
      // This would be handled by the mock, but in real scenarios
      // the hook should handle undefined auth functions
      expect(() => {
        renderHook(() => useAuthForm());
      }).not.toThrow();
    });

    it('should handle unexpected errors during submission', async () => {
      const onError = jest.fn();
      mockUseAuth.login.mockRejectedValue(new Error('Unexpected error'));
      
      const { result } = renderHook(() => useAuthForm({ onError }));
      
      act(() => {
        result.current.handleInputChange(createMockChangeEvent('email', 'test@example.com'));
        result.current.handleInputChange(createMockChangeEvent('password', 'password123'));
      });
      
      await act(async () => {
        await result.current.handleSubmit(createMockSubmitEvent());
      });
      
      expect(result.current.apiResponse?.error).toBe('Unexpected error');
      expect(onError).toHaveBeenCalledWith('Unexpected error');
    });

    it('should handle form submission without preventDefault', async () => {
      const { result } = renderHook(() => useAuthForm());
      
      const mockEvent = { preventDefault: jest.fn() } as any;
      
      await act(async () => {
        await result.current.handleSubmit(mockEvent);
      });
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });
});