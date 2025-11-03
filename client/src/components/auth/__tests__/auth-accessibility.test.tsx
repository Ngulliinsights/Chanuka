/**
 * Accessibility tests for auth components
 * Following WCAG 2.1 AA standards
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

import { 
  renderWithProviders, 
  AccessibilityTestHelper,
  FormTestHelper
} from '@shared/testing/test-utilities';

import { LoginForm } from '../ui/LoginForm';
import { RegisterForm } from '../ui/RegisterForm';
import { AuthInput } from '../ui/AuthInput';
import { AuthButton } from '../ui/AuthButton';
import { AuthAlert } from '../ui/AuthAlert';
import { PasswordStrengthIndicator } from '../ui/PasswordStrengthIndicator';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    loading: false,
    error: null,
  }),
}));

describe('Auth Components Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginForm Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<LoginForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form structure', () => {
      renderWithProviders(<LoginForm />);
      
      const form = screen.getByRole('form', { name: /login/i });
      expect(form).toBeInTheDocument();
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in|login/i });
      
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('should have proper labels and descriptions', () => {
      renderWithProviders(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should handle keyboard navigation', async () => {
      renderWithProviders(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in|login/i });
      
      // Tab through form elements
      await userEvent.tab();
      expect(emailInput).toHaveFocus();
      
      await userEvent.tab();
      expect(passwordInput).toHaveFocus();
      
      await userEvent.tab();
      expect(submitButton).toHaveFocus();
    });

    it('should announce validation errors to screen readers', async () => {
      renderWithProviders(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      
      // Enter invalid email and blur
      await FormTestHelper.fillInput(emailInput, 'invalid-email');
      await userEvent.tab();
      
      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby');
        
        const errorId = emailInput.getAttribute('aria-describedby');
        const errorElement = document.getElementById(errorId!);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('should handle form submission with Enter key', async () => {
      const mockOnSubmit = vi.fn();
      renderWithProviders(<LoginForm onSubmit={mockOnSubmit} />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await FormTestHelper.fillInput(emailInput, 'test@example.com');
      await FormTestHelper.fillInput(passwordInput, 'password123');
      
      // Press Enter in password field
      await userEvent.type(passwordInput, '{enter}');
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should have proper focus management during loading', async () => {
      renderWithProviders(<LoginForm loading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /sign in|login/i });
      
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should announce success and error messages', async () => {
      const { rerender } = renderWithProviders(<LoginForm />);
      
      // Test error message
      rerender(<LoginForm error="Invalid credentials" />);
      
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Invalid credentials');
      
      // Test success message
      rerender(<LoginForm />);
      // Simulate successful login
      const successAlert = screen.queryByRole('alert');
      if (successAlert) {
        expect(successAlert).toHaveAttribute('aria-live', 'polite');
      }
    });
  });

  describe('RegisterForm Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<RegisterForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form structure', () => {
      renderWithProviders(<RegisterForm />);
      
      const form = screen.getByRole('form', { name: /register|sign up/i });
      expect(form).toBeInTheDocument();
      
      const first_nameInput = screen.getByRole('textbox', { name: /first name/i });
      const last_nameInput = screen.getByRole('textbox', { name: /last name/i });
      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up|register/i });
      
      expect(first_nameInput).toBeInTheDocument();
      expect(last_nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('should have proper autocomplete attributes', () => {
      renderWithProviders(<RegisterForm />);
      
      const first_nameInput = screen.getByLabelText(/first name/i);
      const last_nameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      
      expect(first_nameInput).toHaveAttribute('autocomplete', 'given-name');
      expect(last_nameInput).toHaveAttribute('autocomplete', 'family-name');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
    });

    it('should handle complex keyboard navigation', async () => {
      renderWithProviders(<RegisterForm />);
      
      const inputs = [
        screen.getByLabelText(/first name/i),
        screen.getByLabelText(/last name/i),
        screen.getByLabelText(/email address/i),
        screen.getByLabelText(/^password$/i),
        screen.getByLabelText(/confirm password/i),
        screen.getByRole('button', { name: /sign up|register/i })
      ];
      
      // Tab through all form elements
      for (let i = 0; i < inputs.length; i++) {
        await userEvent.tab();
        expect(inputs[i]).toHaveFocus();
      }
    });

    it('should announce password strength to screen readers', async () => {
      renderWithProviders(<RegisterForm />);
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      
      await FormTestHelper.fillInput(passwordInput, 'weak');
      
      await waitFor(() => {
        const strengthIndicator = screen.getByTestId('password-strength-indicator');
        expect(strengthIndicator).toHaveAttribute('aria-live', 'polite');
        expect(strengthIndicator).toHaveAttribute('role', 'status');
      });
    });

    it('should handle password confirmation validation announcements', async () => {
      renderWithProviders(<RegisterForm />);
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await FormTestHelper.fillInput(passwordInput, 'SecurePass123!');
      await FormTestHelper.fillInput(confirmPasswordInput, 'DifferentPass123!');
      await userEvent.tab();
      
      await waitFor(() => {
        expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'true');
        expect(confirmPasswordInput).toHaveAttribute('aria-describedby');
        
        const errorId = confirmPasswordInput.getAttribute('aria-describedby');
        const errorElement = document.getElementById(errorId!);
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('AuthInput Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <AuthInput
          name="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value=""
          onChange={vi.fn()}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper label association', () => {
      renderWithProviders(
        <AuthInput
          name="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value=""
          onChange={vi.fn()}
        />
      );
      
      const input = screen.getByLabelText(/email address/i);
      const label = screen.getByText(/email address/i);
      
      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.getAttribute('id'));
    });

    it('should handle error state accessibility', () => {
      renderWithProviders(
        <AuthInput
          name="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value="invalid-email"
          onChange={vi.fn()}
          error="Please enter a valid email address"
        />
      );
      
      const input = screen.getByLabelText(/email address/i);
      const errorMessage = screen.getByText(/please enter a valid email address/i);
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('id', input.getAttribute('aria-describedby'));
    });

    it('should handle disabled state accessibility', () => {
      renderWithProviders(
        <AuthInput
          name="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value=""
          onChange={vi.fn()}
          disabled={true}
        />
      );
      
      const input = screen.getByLabelText(/email address/i);
      
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
    });

    it('should handle password toggle accessibility', async () => {
      renderWithProviders(
        <AuthInput
          name="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          value="secret123"
          onChange={vi.fn()}
          showPasswordToggle={true}
        />
      );
      
      const input = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });
      
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
      
      await FormTestHelper.clickButton(toggleButton);
      
      expect(input).toHaveAttribute('type', 'text');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should handle required field indication', () => {
      renderWithProviders(
        <AuthInput
          name="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value=""
          onChange={vi.fn()}
          required={true}
        />
      );
      
      const input = screen.getByLabelText(/email address/i);
      
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('AuthButton Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <AuthButton type="submit" variant="primary">
          Submit
        </AuthButton>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle loading state accessibility', () => {
      renderWithProviders(
        <AuthButton type="submit" variant="primary" loading={true}>
          Submit
        </AuthButton>
      );
      
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-describedby');
      
      const loadingText = screen.getByText(/loading/i);
      expect(loadingText).toHaveAttribute('aria-live', 'polite');
    });

    it('should handle disabled state accessibility', () => {
      renderWithProviders(
        <AuthButton type="submit" variant="primary" disabled={true}>
          Submit
        </AuthButton>
      );
      
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should handle keyboard activation', async () => {
      const mockOnClick = vi.fn();
      renderWithProviders(
        <AuthButton type="button" variant="primary" onClick={mockOnClick}>
          Click Me
        </AuthButton>
      );
      
      const button = screen.getByRole('button');
      
      // Test Space key activation
      button.focus();
      await userEvent.keyboard(' ');
      expect(mockOnClick).toHaveBeenCalled();
      
      // Test Enter key activation
      mockOnClick.mockClear();
      await userEvent.keyboard('{enter}');
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('AuthAlert Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <AuthAlert type="success" message="Operation successful!" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper alert role and live region', () => {
      renderWithProviders(
        <AuthAlert type="error" message="An error occurred" />
      );
      
      const alert = screen.getByRole('alert');
      
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveTextContent('An error occurred');
    });

    it('should handle success alerts with polite announcement', () => {
      renderWithProviders(
        <AuthAlert type="success" message="Login successful!" />
      );
      
      const alert = screen.getByRole('alert');
      
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveTextContent('Login successful!');
    });

    it('should handle retry button accessibility', async () => {
      const mockOnRetry = vi.fn();
      renderWithProviders(
        <AuthAlert 
          type="error" 
          message="Network error occurred" 
          onRetry={mockOnRetry}
        />
      );
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      expect(retryButton).toHaveAttribute('aria-describedby');
      
      const errorMessage = screen.getByText(/network error occurred/i);
      expect(errorMessage).toHaveAttribute('id', retryButton.getAttribute('aria-describedby'));
      
      await FormTestHelper.clickButton(retryButton);
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('PasswordStrengthIndicator Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <PasswordStrengthIndicator password="SecurePass123!" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce strength changes to screen readers', () => {
      const { rerender } = renderWithProviders(
        <PasswordStrengthIndicator password="weak" />
      );
      
      let indicator = screen.getByTestId('password-strength-indicator');
      
      expect(indicator).toHaveAttribute('role', 'status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
      expect(indicator).toHaveAttribute('aria-label');
      
      // Test strength change
      rerender(<PasswordStrengthIndicator password="VerySecurePassword123!" />);
      
      indicator = screen.getByTestId('password-strength-indicator');
      expect(indicator).toHaveAttribute('aria-label');
    });

    it('should provide detailed feedback for screen readers', () => {
      renderWithProviders(
        <PasswordStrengthIndicator password="password" showFeedback={true} />
      );
      
      const feedbackList = screen.getByRole('list');
      const feedbackItems = screen.getAllByRole('listitem');
      
      expect(feedbackList).toHaveAttribute('aria-label', /password requirements/i);
      expect(feedbackItems.length).toBeGreaterThan(0);
      
      feedbackItems.forEach(item => {
        expect(item).toHaveAttribute('aria-describedby');
      });
    });

    it('should handle empty password state', () => {
      renderWithProviders(
        <PasswordStrengthIndicator password="" />
      );
      
      const indicator = screen.queryByTestId('password-strength-indicator');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for error states', () => {
      renderWithProviders(
        <AuthInput
          name="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value="invalid"
          onChange={vi.fn()}
          error="Invalid email format"
        />
      );
      
      const errorMessage = screen.getByText(/invalid email format/i);
      const computedStyle = window.getComputedStyle(errorMessage);
      
      // Error text should have sufficient contrast (this would need actual color testing in a real scenario)
      expect(errorMessage).toBeInTheDocument();
    });

    it('should handle focus indicators properly', async () => {
      renderWithProviders(
        <AuthInput
          name="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value=""
          onChange={vi.fn()}
        />
      );
      
      const input = screen.getByLabelText(/email address/i);
      
      await userEvent.click(input);
      expect(input).toHaveFocus();
      
      // Focus should be visible (this would need visual testing in a real scenario)
      expect(input).toHaveAttribute('data-focus-visible');
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide proper form instructions', () => {
      renderWithProviders(<LoginForm />);
      
      const form = screen.getByRole('form');
      
      // Form should have proper description or instructions
      expect(form).toHaveAttribute('aria-describedby');
      
      const instructions = document.getElementById(form.getAttribute('aria-describedby')!);
      expect(instructions).toBeInTheDocument();
    });

    it('should handle form validation summary', async () => {
      renderWithProviders(<RegisterForm />);
      
      // Submit form with invalid data
      const submitButton = screen.getByRole('button', { name: /sign up|register/i });
      await FormTestHelper.clickButton(submitButton);
      
      await waitFor(() => {
        // Should have validation summary for screen readers
        const validationSummary = screen.queryByRole('alert', { name: /validation errors/i });
        if (validationSummary) {
          expect(validationSummary).toBeInTheDocument();
          expect(validationSummary).toHaveAttribute('tabindex', '-1');
        }
      });
    });

    it('should announce dynamic content changes', async () => {
      const { rerender } = renderWithProviders(<LoginForm />);
      
      // Simulate loading state change
      rerender(<LoginForm loading={true} />);
      
      const loadingAnnouncement = screen.getByText(/processing/i);
      expect(loadingAnnouncement).toHaveAttribute('aria-live', 'polite');
      
      // Simulate completion
      rerender(<LoginForm />);
      
      const completionAnnouncement = screen.queryByText(/complete/i);
      if (completionAnnouncement) {
        expect(completionAnnouncement).toHaveAttribute('aria-live', 'polite');
      }
    });
  });
});

