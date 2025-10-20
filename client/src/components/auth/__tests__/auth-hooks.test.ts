/**
 * Comprehensive unit tests for auth hooks
 * Following navigation component testing patterns
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  renderHookWithProviders,
  MockUserFactory,
  TestSuiteHelper
} from './test-helpers';

import { useAuthForm } from '../hooks/useAuthForm';
import { usePasswordStrength, usePasswordVisibility, usePasswordValidation } from '../hooks/usePasswordUtils';
import { AuthError, AuthValidationError } from '../errors';
import { AuthMode } from '../types';

// Mock the auth hook
const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    loading: false,
    error: null,
  }),
}));

// Mock the recovery hook
const mockRecover = vi.fn();
const mockUpdateError = vi.fn();

vi.mock('../recovery', () => ({
  useAuthRecovery: () => ({
    recoveryState: {
      canRecover: true,
      isRecovering: false,
      lastError: null,
      recoveryAttempts: 0,
    },
    updateError: mockUpdateError,
    recover: mockRecover,
  }),
  getRecoveryStrategy: vi.fn(() => ({ canRecover: true })),
  createRecoveryContext: vi.fn(() => ({ error: null, attempts: 0 })),
}));

interface UseAuthFormOptions {
  initialMode?: AuthMode;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onModeChange?: (mode: AuthMode) => void;
  autoFocus?: boolean;
  realTimeValidation?: boolean;
}

describe('useAuthForm Hook', () => {
  const defaultOptions: UseAuthFormOptions = {
    initialMode: 'login',
    realTimeValidation: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({ success: true });
    mockRegister.mockResolvedValue({ success: true });
    mockRecover.mockResolvedValue(true);
  });

  it('should handle initial state correctly', () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

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
  });

  it('should handle field updates', () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    act(() => {
      const event = {
        target: { name: 'email', value: 'test@example.com' }
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleInputChange(event);
    });

    expect(result.current.formData.email).toBe('test@example.com');
  });

  it('should handle field validation', async () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    act(() => {
      result.current.validateField('email', 'invalid-email');
    });

    await waitFor(() => {
      expect(result.current.errors.email).toContain('valid email');
    }, { timeout: 200 });
  });

  it('should handle form reset', () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    act(() => {
      const emailEvent = {
        target: { name: 'email', value: 'test@example.com' }
      } as React.ChangeEvent<HTMLInputElement>;
      const passwordEvent = {
        target: { name: 'password', value: 'password123' }
      } as React.ChangeEvent<HTMLInputElement>;

      result.current.handleInputChange(emailEvent);
      result.current.handleInputChange(passwordEvent);
    });

    expect(result.current.formData.email).toBe('test@example.com');

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData.email).toBe('');
    expect(result.current.formData.password).toBe('');
  });

  it('should handle error clearing', () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    // Simulate errors
    act(() => {
      result.current.validateField('email', 'invalid');
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.apiResponse).toBeNull();
  });

  it('should handle successful login submission', async () => {
    const mockOnSuccess = vi.fn();
    const options = { ...defaultOptions, onSuccess: mockOnSuccess };
    const { result } = renderHookWithProviders(() => useAuthForm(options));

    act(() => {
      const emailEvent = {
        target: { name: 'email', value: 'test@example.com' }
      } as React.ChangeEvent<HTMLInputElement>;
      const passwordEvent = {
        target: { name: 'password', value: 'password123' }
      } as React.ChangeEvent<HTMLInputElement>;

      result.current.handleInputChange(emailEvent);
      result.current.handleInputChange(passwordEvent);
    });

    await act(async () => {
      const event = { preventDefault: vi.fn() } as any;
      await result.current.handleSubmit(event);
    });

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(result.current.apiResponse?.success).toBe('Login successful!');
  });

  it('should handle failed login submission', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    const mockOnError = vi.fn();
    const options = { ...defaultOptions, onError: mockOnError };
    const { result } = renderHookWithProviders(() => useAuthForm(options));

    act(() => {
      const emailEvent = {
        target: { name: 'email', value: 'test@example.com' }
      } as React.ChangeEvent<HTMLInputElement>;
      const passwordEvent = {
        target: { name: 'password', value: 'wrongpassword' }
      } as React.ChangeEvent<HTMLInputElement>;

      result.current.handleInputChange(emailEvent);
      result.current.handleInputChange(passwordEvent);
    });

    await act(async () => {
      const event = { preventDefault: vi.fn() } as any;
      await result.current.handleSubmit(event);
    });

    expect(mockOnError).toHaveBeenCalledWith('Invalid credentials');
    expect(result.current.apiResponse?.error).toBe('Invalid credentials');
  });

  it('should handle successful register submission', async () => {
    const mockOnSuccess = vi.fn();
    const options = { ...defaultOptions, onSuccess: mockOnSuccess };
    const { result } = renderHookWithProviders(() => useAuthForm(options));

    act(() => {
      result.current.toggleMode(); // Switch to register mode

      const firstNameEvent = {
        target: { name: 'firstName', value: 'John' }
      } as React.ChangeEvent<HTMLInputElement>;
      const lastNameEvent = {
        target: { name: 'lastName', value: 'Doe' }
      } as React.ChangeEvent<HTMLInputElement>;
      const emailEvent = {
        target: { name: 'email', value: 'john@example.com' }
      } as React.ChangeEvent<HTMLInputElement>;
      const passwordEvent = {
        target: { name: 'password', value: 'SecurePass123!' }
      } as React.ChangeEvent<HTMLInputElement>;
      const confirmPasswordEvent = {
        target: { name: 'confirmPassword', value: 'SecurePass123!' }
      } as React.ChangeEvent<HTMLInputElement>;

      result.current.handleInputChange(firstNameEvent);
      result.current.handleInputChange(lastNameEvent);
      result.current.handleInputChange(emailEvent);
      result.current.handleInputChange(passwordEvent);
      result.current.handleInputChange(confirmPasswordEvent);
    });

    await act(async () => {
      const event = { preventDefault: vi.fn() } as any;
      await result.current.handleSubmit(event);
    });

    expect(mockRegister).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
    });
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should validate login form validation errors', async () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    act(() => {
      const emailEvent = {
        target: { name: 'email', value: 'invalid-email' }
      } as React.ChangeEvent<HTMLInputElement>;
      const passwordEvent = {
        target: { name: 'password', value: '123' }
      } as React.ChangeEvent<HTMLInputElement>;

      result.current.handleInputChange(emailEvent);
      result.current.handleInputChange(passwordEvent);
    });

    await act(async () => {
      const event = { preventDefault: vi.fn() } as any;
      await result.current.handleSubmit(event);
    });

    expect(result.current.errors.email).toContain('valid email');
    expect(result.current.errors.password).toContain('at least 8 characters');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should validate register form validation errors', async () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    act(() => {
      result.current.toggleMode(); // Switch to register mode

      const firstNameEvent = {
        target: { name: 'firstName', value: 'A' }
      } as React.ChangeEvent<HTMLInputElement>;
      const lastNameEvent = {
        target: { name: 'lastName', value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      const emailEvent = {
        target: { name: 'email', value: 'invalid-email' }
      } as React.ChangeEvent<HTMLInputElement>;
      const passwordEvent = {
        target: { name: 'password', value: 'weak' }
      } as React.ChangeEvent<HTMLInputElement>;
      const confirmPasswordEvent = {
        target: { name: 'confirmPassword', value: 'different' }
      } as React.ChangeEvent<HTMLInputElement>;

      result.current.handleInputChange(firstNameEvent);
      result.current.handleInputChange(lastNameEvent);
      result.current.handleInputChange(emailEvent);
      result.current.handleInputChange(passwordEvent);
      result.current.handleInputChange(confirmPasswordEvent);
    });

    await act(async () => {
      const event = { preventDefault: vi.fn() } as any;
      await result.current.handleSubmit(event);
    });

    expect(result.current.errors.firstName).toContain('at least 2 characters');
    expect(result.current.errors.lastName).toBeDefined();
    expect(result.current.errors.email).toContain('valid email');
    expect(result.current.errors.password).toBeDefined();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should handle mode switching', () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    expect(result.current.mode).toBe('login');

    act(() => {
      result.current.toggleMode();
    });

    expect(result.current.mode).toBe('register');
  });

  it('should handle retry functionality', async () => {
    mockRecover.mockResolvedValue(true);
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    act(() => {
      result.current.retry();
    });

    expect(result.current.apiResponse).toBeNull();
  });

  it('should handle input sanitization', () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    act(() => {
      const event = {
        target: { name: 'email', value: 'test@example.com\x00\x1F' }
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleInputChange(event);
    });

    expect(result.current.formData.email).toBe('test@example.com');
  });

  it('should handle field props generation', () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    const fieldProps = result.current.getFieldProps('email');

    expect(fieldProps.name).toBe('email');
    expect(fieldProps.value).toBe('');
    expect(fieldProps.onChange).toBeDefined();
    expect(fieldProps.onBlur).toBeDefined();
    expect(fieldProps.disabled).toBe(false);
    expect(fieldProps.required).toBe(true);
  });

  it('should handle form validation state', () => {
    const { result } = renderHookWithProviders(() => useAuthForm(defaultOptions));

    // Initially invalid (empty fields)
    expect(result.current.isValid).toBe(false);
    expect(result.current.canSubmit).toBe(false);

    act(() => {
      const emailEvent = {
        target: { name: 'email', value: 'test@example.com' }
      } as React.ChangeEvent<HTMLInputElement>;
      const passwordEvent = {
        target: { name: 'password', value: 'password123' }
      } as React.ChangeEvent<HTMLInputElement>;

      result.current.handleInputChange(emailEvent);
      result.current.handleInputChange(passwordEvent);
    });

    // Should be valid with proper email and password
    expect(result.current.isValid).toBe(true);
    expect(result.current.canSubmit).toBe(true);
  });
});

describe('usePasswordStrength Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle password strength calculation', () => {
    const { result } = renderHookWithProviders(() => usePasswordStrength('password123'));

    expect(result.current.strength.score).toBeGreaterThan(0);
    expect(result.current.feedback).toBeInstanceOf(Array);
  });

  it('should handle empty password', () => {
    const { result } = renderHookWithProviders(() => usePasswordStrength(''));

    expect(result.current.strength.score).toBe(0);
    expect(result.current.isStrong).toBe(false);
  });

  it('should handle strong password', () => {
    const { result } = renderHookWithProviders(() => usePasswordStrength('SecurePass123!'));

    expect(result.current.isStrong).toBe(true);
    expect(result.current.strength.score).toBeGreaterThan(2);
  });
});

describe('usePasswordVisibility Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle initial visibility state', () => {
    const { result } = renderHookWithProviders(() => usePasswordVisibility(false));

    expect(result.current.isVisible).toBe(false);
    expect(result.current.type).toBe('password');
  });

  it('should handle visibility toggle', () => {
    const { result } = renderHookWithProviders(() => usePasswordVisibility(false));

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.type).toBe('text');
  });

  it('should handle show and hide methods', () => {
    const { result } = renderHookWithProviders(() => usePasswordVisibility(false));

    act(() => {
      result.current.show();
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.hide();
    });

    expect(result.current.isVisible).toBe(false);
  });
});

describe('usePasswordValidation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle password validation', () => {
    const { result } = renderHookWithProviders(() => usePasswordValidation('SecurePass123!'));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should handle weak password validation', () => {
    const { result } = renderHookWithProviders(() => usePasswordValidation('weak'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it('should handle password confirmation validation', () => {
    const { result } = renderHookWithProviders(() =>
      usePasswordValidation('password123', 'password123')
    );

    expect(result.current.isValid).toBe(true);

    const { result: result2 } = renderHookWithProviders(() =>
      usePasswordValidation('password123', 'different123')
    );

    expect(result2.current.isValid).toBe(false);
    expect(result2.current.errors).toContain("Passwords don't match");
  });

  it('should handle custom password requirements', () => {
    const customConfig = {
      security: {
        passwordMinLength: 16,
        requireSpecialChars: true,
        requireNumbers: true,
        requireUppercase: true,
        requireLowercase: true,
      },
    };

    const { result } = renderHookWithProviders(() =>
      usePasswordValidation('ShortPass1!', undefined, customConfig)
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain('Password must be at least 16 characters');
  });
});