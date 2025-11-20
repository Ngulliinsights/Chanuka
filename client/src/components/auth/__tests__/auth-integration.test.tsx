/**
 * Integration tests for auth form workflows
 * Following navigation component testing patterns
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  renderWithProviders,
  MockUserFactory,
  FormTestHelper,
  AsyncTestHelper,
  IntegrationTestHelper,
  TestSuiteHelper
} from '../../../shared/testing/test-utilities';

import { LoginForm } from '../ui/LoginForm';
import { RegisterForm } from '../ui/RegisterForm';
import { AuthError, AuthValidationError } from '../errors';

// Mock the auth service
const mockAuthService = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockAuthService.login,
    register: mockAuthService.register,
    loading: false,
    error: null,
  }),
}));

// Mock fetch for API calls
const mockFetch = IntegrationTestHelper.mockFetch;

describe('Auth Integration Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Login Workflow', () => {
    it('should handle successful login flow', async () => {
      const mockUser = MockUserFactory.createMockCitizenUser();
      const mockResponse = IntegrationTestHelper.createMockApiResponse(mockUser);
      
      mockAuthService.login.mockResolvedValue({ success: true, data: mockUser });
      mockFetch(mockResponse);

      renderWithProviders(
        <LoginForm />
      );

      // Fill in the form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByTestId('login-submit-button');

      await FormTestHelper.fillInput(emailInput, 'test@example.com');
      await FormTestHelper.fillInput(passwordInput, 'password123');

      // Submit the form
      await FormTestHelper.clickButton(submitButton);

      // Verify the login was called
      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Verify success message is displayed
      expect(screen.getByTestId('login-success-alert')).toBeInTheDocument();
      expect(screen.getByText('Login successful!')).toBeInTheDocument();
    });

    it('should handle failed login with invalid credentials', async () => {
      const errorResponse = IntegrationTestHelper.createMockApiResponse(
        null,
        false,
        { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
      );
      
      mockAuthService.login.mockResolvedValue({ 
        success: false, 
        error: 'Invalid email or password' 
      });
      mockFetch(errorResponse, 401);

      const mockOnError = vi.fn();
      
      renderWithProviders(
        <LoginForm onError={mockOnError} />
      );

      // Fill in the form with invalid credentials
      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), 'wrongpassword');
      
      // Submit the form
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      // Verify error handling
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Invalid email or password');
      });

      // Verify error message is displayed
      expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });

    it('should handle network error during login', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Network error'));

      const mockOnError = vi.fn();
      
      renderWithProviders(
        <LoginForm onError={mockOnError} />
      );

      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), 'password123');
      
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error');
      });
    });

    it('should handle login with validation errors', async () => {
      renderWithProviders(<LoginForm />);

      // Try to submit with invalid data
      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'invalid-email');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), '123');
      
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      // Verify validation errors are displayed
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      // Verify login was not called
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle login retry functionality', async () => {
      // First attempt fails
      mockAuthService.login
        .mockResolvedValueOnce({ success: false, error: 'Server error' })
        .mockResolvedValueOnce({ success: true, data: MockUserFactory.createMockCitizenUser() });

      renderWithProviders(<LoginForm />);

      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), 'password123');
      
      // First submission fails
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
      });

      // Retry the login
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await FormTestHelper.clickButton(retryButton);

      // Verify retry was successful
      await waitFor(() => {
        expect(screen.getByTestId('login-success-alert')).toBeInTheDocument();
      });

      expect(mockAuthService.login).toHaveBeenCalledTimes(2);
    });
  });

  describe('Registration Workflow', () => {
    it('should handle successful registration flow', async () => {
      const mockUser = MockUserFactory.createMockCitizenUser({
        email: 'john@example.com',
        name: 'John Doe',
      });
      
      const mockResponse = IntegrationTestHelper.createMockApiResponse(mockUser);
      
      mockAuthService.register.mockResolvedValue({ success: true, data: mockUser });
      mockFetch(mockResponse);

      renderWithProviders(
        <RegisterForm />
      );

      // Fill in the registration form
      await FormTestHelper.fillInput(screen.getByLabelText(/first name/i), 'John');
      await FormTestHelper.fillInput(screen.getByLabelText(/last name/i), 'Doe');
      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'john@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await FormTestHelper.fillInput(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
      
      // Submit the form
      await FormTestHelper.clickButton(screen.getByTestId('register-submit-button'));

      // Verify the registration was called
      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'SecurePass123!',
        });
      });

      // Verify success message is displayed
      expect(screen.getByTestId('register-success-alert')).toBeInTheDocument();
      expect(screen.getByText('Account created successfully!')).toBeInTheDocument();
    });

    it('should handle registration with existing email', async () => {
      const errorResponse = IntegrationTestHelper.createMockApiResponse(
        null,
        false,
        { message: 'Email already exists', code: 'EMAIL_EXISTS' }
      );
      
      mockAuthService.register.mockResolvedValue({ 
        success: false, 
        error: 'Email already exists' 
      });
      mockFetch(errorResponse, 409);

      const mockOnError = vi.fn();
      
      renderWithProviders(
        <RegisterForm onError={mockOnError} />
      );

      // Fill in the form
      await FormTestHelper.fillInput(screen.getByLabelText(/first name/i), 'John');
      await FormTestHelper.fillInput(screen.getByLabelText(/last name/i), 'Doe');
      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'existing@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/^password$/i), 'SecurePass123!');
      await FormTestHelper.fillInput(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
      
      await FormTestHelper.clickButton(screen.getByTestId('register-submit-button'));

      // Verify error handling
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Email already exists');
      });

      expect(screen.getByTestId('register-error-alert')).toBeInTheDocument();
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });

    it('should handle registration validation errors', async () => {
      renderWithProviders(<RegisterForm />);

      // Try to submit with invalid data
      await FormTestHelper.fillInput(screen.getByLabelText(/first name/i), 'A');
      await FormTestHelper.fillInput(screen.getByLabelText(/last name/i), '');
      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'invalid-email');
      await FormTestHelper.fillInput(screen.getByLabelText(/^password$/i), 'weak');
      await FormTestHelper.fillInput(screen.getByLabelText(/confirm password/i), 'different');
      
      await FormTestHelper.clickButton(screen.getByTestId('register-submit-button'));

      // Verify validation errors are displayed
      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });

      // Verify registration was not called
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should handle password strength validation during registration', async () => {
      renderWithProviders(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      
      // Test weak password
      await FormTestHelper.fillInput(passwordInput, 'weak');
      
      await waitFor(() => {
        const strengthIndicator = screen.getByTestId('password-strength-indicator');
        expect(strengthIndicator).toBeInTheDocument();
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });

      // Test strong password
      await FormTestHelper.fillInput(passwordInput, 'VerySecurePassword123!', { clear: true });
      
      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form State Management', () => {
    it('should handle real-time validation during typing', async () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      
      // Type invalid email
      await FormTestHelper.fillInput(emailInput, 'invalid');
      
      // Trigger blur to validate
      await userEvent.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Fix the email
      await FormTestHelper.fillInput(emailInput, '@example.com');
      
      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
      });
    });

    it('should handle form reset after successful submission', async () => {
      mockAuthService.login.mockResolvedValue({ 
        success: true, 
        data: MockUserFactory.createMockCitizenUser() 
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      // Fill and submit form
      await FormTestHelper.fillInput(emailInput, 'test@example.com');
      await FormTestHelper.fillInput(passwordInput, 'password123');
      
      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');
      
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      // Verify form is reset after success
      await waitFor(() => {
        expect(emailInput.value).toBe('');
        expect(passwordInput.value).toBe('');
      });
    });

    it('should handle error clearing when user starts typing', async () => {
      mockAuthService.login.mockResolvedValue({ 
        success: false, 
        error: 'Invalid credentials' 
      });

      renderWithProviders(<LoginForm />);

      // Submit form to get error
      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), 'wrongpassword');
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
      });

      // Start typing in email field
      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, 'x');

      // Verify error is cleared
      await waitFor(() => {
        expect(screen.queryByTestId('login-error-alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should handle loading state during submission', async () => {
      // Create a promise that we can control
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });
      
      mockAuthService.login.mockReturnValue(loginPromise);

      renderWithProviders(<LoginForm />);

      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), 'password123');
      
      // Submit form
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      // Verify loading state
      const submitButton = screen.getByTestId('login-submit-button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Resolve the login
      resolveLogin!({ success: true, data: MockUserFactory.createMockCitizenUser() });

      // Verify loading state is cleared
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should handle concurrent submission prevention', async () => {
      let resolveCount = 0;
      mockAuthService.login.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolveCount++;
            resolve({ success: true, data: MockUserFactory.createMockCitizenUser() });
          }, 100);
        });
      });

      renderWithProviders(<LoginForm />);

      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), 'password123');
      
      const submitButton = screen.getByTestId('login-submit-button');
      
      // Try to submit multiple times quickly
      await FormTestHelper.clickButton(submitButton);
      await FormTestHelper.clickButton(submitButton);
      await FormTestHelper.clickButton(submitButton);

      // Wait for all promises to resolve
      await waitFor(() => resolveCount > 0, { timeout: 200 });

      // Should only have been called once
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery', () => {
    it('should handle automatic retry on network failure', async () => {
      // First call fails, second succeeds
      mockAuthService.login
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ success: true, data: MockUserFactory.createMockCitizenUser() });

      renderWithProviders(<LoginForm />);

      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), 'password123');
      
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await FormTestHelper.clickButton(retryButton);

      // Verify success after retry
      await waitFor(() => {
        expect(screen.getByTestId('login-success-alert')).toBeInTheDocument();
      });

      expect(mockAuthService.login).toHaveBeenCalledTimes(2);
    });

    it('should handle retry limit enforcement', async () => {
      // All calls fail
      mockAuthService.login.mockRejectedValue(new Error('Persistent error'));

      renderWithProviders(<LoginForm />);

      await FormTestHelper.fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
      await FormTestHelper.fillInput(screen.getByLabelText(/password/i), 'password123');
      
      // Initial submission
      await FormTestHelper.clickButton(screen.getByTestId('login-submit-button'));

      // Retry multiple times
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          const retryButton = screen.queryByRole('button', { name: /retry/i });
          if (retryButton) {
            return FormTestHelper.clickButton(retryButton);
          }
        });
      }

      // Should eventually disable retry
      await waitFor(() => {
        const retryButton = screen.queryByRole('button', { name: /retry/i });
        expect(retryButton).toBeNull();
      });
    });
  });
});

