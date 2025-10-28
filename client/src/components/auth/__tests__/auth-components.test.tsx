/**
 * Comprehensive unit tests for auth components
 * Following navigation component testing patterns
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { 
  renderWithProviders, 
  MockUserFactory, 
  ComponentTestHelper,
  FormTestHelper,
  ErrorTestHelper,
  TestSuiteHelper 
} from '@shared/testing/test-utilities';

import { LoginForm } from '../ui/LoginForm';
import { RegisterForm } from '../ui/RegisterForm';
import { AuthInput } from '../ui/AuthInput';
import { AuthButton } from '../ui/AuthButton';
import { AuthAlert } from '../ui/AuthAlert';
import { PasswordStrengthIndicator } from '../ui/PasswordStrengthIndicator';

import { AuthError, AuthValidationError } from '../errors';
import { AuthInputProps, AuthButtonProps } from '@shared/types';

// Mock the auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    loading: false,
    error: null,
  }),
}));

interface LoginFormProps {
  className?: string;
  onSubmit?: (data: any) => Promise<any>;
  loading?: boolean;
  error?: string;
  onError?: (error: string) => void;
  onSuccess?: (data: any) => void;
}

interface RegisterFormProps {
  className?: string;
  onSubmit?: (data: any) => Promise<any>;
  loading?: boolean;
  error?: string;
  onError?: (error: string) => void;
  onSuccess?: (data: any) => void;
}

describe('LoginForm Component', () => {
  const defaultProps: LoginFormProps = {
    className: 'test-login-form',
    onSubmit: vi.fn(),
    loading: false,
    error: undefined,
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with all required fields', () => {
    renderWithProviders(<LoginForm {...defaultProps} />);
    
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-button')).toBeInTheDocument();
  });

  it('should handle form submission with valid data', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });
    const props = { ...defaultProps, onSubmit: mockOnSubmit };
    
    renderWithProviders(<LoginForm {...props} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByTestId('login-submit-button');

    await FormTestHelper.fillInput(emailInput, 'test@example.com');
    await FormTestHelper.fillInput(passwordInput, 'password123');
    await FormTestHelper.clickButton(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should handle loading state', () => {
    const props = { ...defaultProps, loading: true };
    renderWithProviders(<LoginForm {...props} />);
    
    const submitButton = screen.getByTestId('login-submit-button');
    expect(submitButton).toBeDisabled();
  });

  it('should handle error display', () => {
    const errorMessage = 'Invalid credentials';
    const props = { ...defaultProps, error: errorMessage };
    
    renderWithProviders(<LoginForm {...props} />);
    
    expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should validate email field on blur', async () => {
    renderWithProviders(<LoginForm {...defaultProps} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    
    await FormTestHelper.fillInput(emailInput, 'invalid-email');
    await userEvent.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should validate password field requirements', async () => {
    renderWithProviders(<LoginForm {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    
    await FormTestHelper.fillInput(passwordInput, '123');
    await userEvent.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should handle form reset on success', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });
    const props = { ...defaultProps, onSubmit: mockOnSubmit };
    
    renderWithProviders(<LoginForm {...props} />);
    
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    
    await FormTestHelper.fillInput(emailInput, 'test@example.com');
    await FormTestHelper.fillInput(passwordInput, 'password123');
    
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
    
    const submitButton = screen.getByTestId('login-submit-button');
    await FormTestHelper.clickButton(submitButton);
    
    await waitFor(() => {
      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });
  });
});

describe('RegisterForm Component', () => {
  const defaultProps: RegisterFormProps = {
    className: 'test-register-form',
    onSubmit: vi.fn(),
    loading: false,
    error: undefined,
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with all required fields', () => {
    renderWithProviders(<RegisterForm {...defaultProps} />);
    
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('should handle form submission with valid data', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });
    const props = { ...defaultProps, onSubmit: mockOnSubmit };
    
    renderWithProviders(<RegisterForm {...props} />);
    
    await FormTestHelper.fillInput(screen.getByLabelText(/first name/i), 'John');
    await FormTestHelper.fillInput(screen.getByLabelText(/last name/i), 'Doe');
    await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'john@example.com');
    await FormTestHelper.fillInput(screen.getByLabelText(/^password$/i), 'SecurePass123!');
    await FormTestHelper.fillInput(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
    
    const submitButton = screen.getByTestId('register-submit-button');
    await FormTestHelper.clickButton(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
      });
    });
  });

  it('should validate password confirmation match', async () => {
    renderWithProviders(<RegisterForm {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await FormTestHelper.fillInput(passwordInput, 'SecurePass123!');
    await FormTestHelper.fillInput(confirmPasswordInput, 'DifferentPass123!');
    await userEvent.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  it('should validate name field requirements', async () => {
    renderWithProviders(<RegisterForm {...defaultProps} />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    
    await FormTestHelper.fillInput(firstNameInput, 'A');
    await userEvent.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('should handle password strength indicator', () => {
    renderWithProviders(<RegisterForm {...defaultProps} />);
    
    expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument();
  });
});

describe('AuthInput Component', () => {
  const defaultProps: AuthInputProps = {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com',
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with correct attributes', () => {
    renderWithProviders(<AuthInput {...defaultProps} />);
    
    const input = screen.getByLabelText(/email address/i);
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@example.com');
  });

  it('should handle value changes', async () => {
    const mockOnChange = vi.fn();
    const props = { ...defaultProps, onChange: mockOnChange };
    
    renderWithProviders(<AuthInput {...props} />);
    
    const input = screen.getByLabelText(/email address/i);
    await FormTestHelper.fillInput(input, 'test@example.com');
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle blur events', async () => {
    const mockOnBlur = vi.fn();
    const props = { ...defaultProps, onBlur: mockOnBlur };
    
    renderWithProviders(<AuthInput {...props} />);
    
    const input = screen.getByLabelText(/email address/i);
    await userEvent.click(input);
    await userEvent.tab();
    
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('should handle error display', () => {
    const errorMessage = 'Invalid email format';
    const props = { ...defaultProps, error: errorMessage };
    
    renderWithProviders(<AuthInput {...props} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('should handle disabled state', () => {
    const props = { ...defaultProps, disabled: true };
    
    renderWithProviders(<AuthInput {...props} />);
    
    const input = screen.getByLabelText(/email address/i);
    expect(input).toBeDisabled();
  });

  it('should handle password toggle functionality', async () => {
    const props: AuthInputProps = {
      ...defaultProps,
      name: 'password',
      label: 'Password',
      type: 'password',
      showPasswordToggle: true,
    };
    
    renderWithProviders(<AuthInput {...props} />);
    
    const input = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    
    expect(input).toHaveAttribute('type', 'password');
    
    await FormTestHelper.clickButton(toggleButton);
    
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });

  it('should handle icon display', () => {
    const MockIcon = () => <span data-testid="mock-icon">Icon</span>;
    const props = { ...defaultProps, icon: MockIcon };
    
    renderWithProviders(<AuthInput {...props} />);
    
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });
});

describe('AuthButton Component', () => {
  const defaultProps: AuthButtonProps = {
    type: 'submit',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    children: 'Submit',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with correct attributes', () => {
    renderWithProviders(<AuthButton {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).not.toBeDisabled();
  });

  it('should handle click events', async () => {
    const mockOnClick = vi.fn();
    const props = { ...defaultProps, onClick: mockOnClick };
    
    renderWithProviders(<AuthButton {...props} />);
    
    const button = screen.getByRole('button', { name: /submit/i });
    await FormTestHelper.clickButton(button);
    
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('should handle loading state', () => {
    const props = { ...defaultProps, loading: true };
    
    renderWithProviders(<AuthButton {...props} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle disabled state', () => {
    const props = { ...defaultProps, disabled: true };
    
    renderWithProviders(<AuthButton {...props} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should handle different variants', () => {
    const { rerender } = renderWithProviders(<AuthButton {...defaultProps} variant="primary" />);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');
    
    rerender(<AuthButton {...defaultProps} variant="secondary" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('btn-secondary');
    
    rerender(<AuthButton {...defaultProps} variant="outline" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('btn-outline');
  });

  it('should handle different sizes', () => {
    const { rerender } = renderWithProviders(<AuthButton {...defaultProps} size="sm" />);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('btn-sm');
    
    rerender(<AuthButton {...defaultProps} size="md" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('btn-md');
    
    rerender(<AuthButton {...defaultProps} size="lg" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('btn-lg');
  });
});

describe('AuthAlert Component', () => {
  it('should render success alert', () => {
    renderWithProviders(
      <AuthAlert type="success" message="Login successful!" />
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('alert-success');
    expect(screen.getByText('Login successful!')).toBeInTheDocument();
  });

  it('should render error alert with retry button', () => {
    const mockOnRetry = vi.fn();
    
    renderWithProviders(
      <AuthAlert 
        type="error" 
        message="Login failed" 
        onRetry={mockOnRetry}
      />
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert-error');
    expect(screen.getByText('Login failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should handle retry button click', async () => {
    const mockOnRetry = vi.fn();
    
    renderWithProviders(
      <AuthAlert 
        type="error" 
        message="Login failed" 
        onRetry={mockOnRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await FormTestHelper.clickButton(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalled();
  });
});

describe('PasswordStrengthIndicator Component', () => {
  it('should render with weak password', () => {
    renderWithProviders(
      <PasswordStrengthIndicator password="123" />
    );
    
    expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument();
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  it('should render with strong password', () => {
    renderWithProviders(
      <PasswordStrengthIndicator password="SecurePass123!" />
    );
    
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('should handle password strength feedback', () => {
    renderWithProviders(
      <PasswordStrengthIndicator password="password" showFeedback />
    );
    
    expect(screen.getByText(/add numbers/i)).toBeInTheDocument();
    expect(screen.getByText(/add uppercase letters/i)).toBeInTheDocument();
  });

  it('should handle hidden state when password is empty', () => {
    renderWithProviders(
      <PasswordStrengthIndicator password="" />
    );
    
    const indicator = screen.queryByTestId('password-strength-indicator');
    expect(indicator).not.toBeInTheDocument();
  });
});

