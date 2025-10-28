/**
 * Auth component testing utilities
 * Following navigation component testing patterns
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';
import { AuthMode, LoginFormData, RegisterFormData, AuthConfig } from '../types';
import { AUTH_CONFIG_DEFAULTS } from '../constants';

/**
 * Mock data generators
 */

export function createMockLoginData(overrides: Partial<LoginFormData> = {}): LoginFormData {
  return {
    email: 'test@example.com',
    password: 'testpassword123',
    ...overrides
  };
}

export function createMockRegisterData(overrides: Partial<RegisterFormData> = {}): RegisterFormData {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    ...overrides
  };
}

export function createMockAuthConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
  return {
    ...AUTH_CONFIG_DEFAULTS,
    ...overrides
  };
}

/**
 * Mock form data based on mode
 */
export function createMockAuthData(mode: AuthMode, overrides: Record<string, any> = {}) {
  if (mode === 'login') {
    return createMockLoginData(overrides);
  }
  return createMockRegisterData(overrides);
}

/**
 * Mock validation errors
 */
export function createMockValidationErrors(fields: string[] = ['email']) {
  const errors: Record<string, string> = {};
  
  fields.forEach(field => {
    switch (field) {
      case 'email':
        errors.email = 'Please enter a valid email address';
        break;
      case 'password':
        errors.password = 'Password must be at least 8 characters';
        break;
      case 'firstName':
        errors.firstName = 'First name is required';
        break;
      case 'lastName':
        errors.lastName = 'Last name is required';
        break;
      case 'confirmPassword':
        errors.confirmPassword = "Passwords don't match";
        break;
      default:
        errors[field] = `${field} is invalid`;
    }
  });
  
  return errors;
}

/**
 * Mock API responses
 */
export function createMockAuthResponse(success: boolean = true, data?: any) {
  if (success) {
    return {
      success: true,
      data: data || {
        user: {
          id: '1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe'
        },
        token: 'mock-jwt-token'
      }
    };
  }
  
  return {
    success: false,
    error: 'Authentication failed'
  };
}

/**
 * Mock useAuth hook
 */
export function createMockUseAuth(overrides: any = {}) {
  return {
    login: jest.fn().mockResolvedValue(createMockAuthResponse(true)),
    register: jest.fn().mockResolvedValue(createMockAuthResponse(true)),
    logout: jest.fn().mockResolvedValue({ success: true }),
    loading: false,
    user: null,
    isAuthenticated: false,
    ...overrides
  };
}

/**
 * Test event helpers
 */
export function createMockChangeEvent(name: string, value: string) {
  return {
    target: {
      name,
      value
    }
  } as React.ChangeEvent<HTMLInputElement>;
}

export function createMockBlurEvent(name: string, value: string) {
  return {
    target: {
      name,
      value
    }
  } as React.FocusEvent<HTMLInputElement>;
}

export function createMockSubmitEvent() {
  return {
    preventDefault: jest.fn()
  } as any as React.FormEvent;
}

/**
 * Custom render function with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authConfig?: Partial<AuthConfig>;
  mockAuth?: any;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { authConfig, mockAuth, ...renderOptions } = options;

  // Mock the useAuth hook if provided
  if (mockAuth) {
    jest.doMock('@/hooks/use-auth', () => ({
      useAuth: () => mockAuth
    }));
  }

  return render(ui, renderOptions);
}

/**
 * Wait for async operations
 */
export function waitForAuth(timeout: number = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Form interaction helpers
 */
export async function fillLoginForm(
  getByTestId: (testId: string) => HTMLElement,
  data: Partial<LoginFormData> = {}
) {
  const mockData = createMockLoginData(data);
  
  const emailInput = getByTestId('auth-email-input') as HTMLInputElement;
  const passwordInput = getByTestId('auth-password-input') as HTMLInputElement;
  
  // Simulate user input
  emailInput.value = mockData.email;
  emailInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  passwordInput.value = mockData.password;
  passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
}

export async function fillRegisterForm(
  getByTestId: (testId: string) => HTMLElement,
  data: Partial<RegisterFormData> = {}
) {
  const mockData = createMockRegisterData(data);
  
  const firstNameInput = getByTestId('auth-firstName-input') as HTMLInputElement;
  const lastNameInput = getByTestId('auth-lastName-input') as HTMLInputElement;
  const emailInput = getByTestId('auth-email-input') as HTMLInputElement;
  const passwordInput = getByTestId('auth-password-input') as HTMLInputElement;
  const confirmPasswordInput = getByTestId('auth-confirmPassword-input') as HTMLInputElement;
  
  // Simulate user input
  firstNameInput.value = mockData.firstName;
  firstNameInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  lastNameInput.value = mockData.lastName;
  lastNameInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  emailInput.value = mockData.email;
  emailInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  passwordInput.value = mockData.password;
  passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  confirmPasswordInput.value = mockData.confirmPassword;
  confirmPasswordInput.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Assertion helpers
 */
export function expectFormToBeValid(getByTestId: (testId: string) => HTMLElement) {
  const submitButton = getByTestId('auth-submit-button') as HTMLButtonElement;
  expect(submitButton).not.toBeDisabled();
}

export function expectFormToBeInvalid(getByTestId: (testId: string) => HTMLElement) {
  const submitButton = getByTestId('auth-submit-button') as HTMLButtonElement;
  expect(submitButton).toBeDisabled();
}

export function expectFieldToHaveError(
  getByTestId: (testId: string) => HTMLElement,
  fieldName: string,
  errorMessage?: string
) {
  const errorElement = getByTestId(`auth-${fieldName}-error`);
  expect(errorElement).toBeInTheDocument();
  
  if (errorMessage) {
    expect(errorElement).toHaveTextContent(errorMessage);
  }
}

export function expectFieldToBeValid(
  queryByTestId: (testId: string) => HTMLElement | null,
  fieldName: string
) {
  const errorElement = queryByTestId(`auth-${fieldName}-error`);
  expect(errorElement).not.toBeInTheDocument();
}

/**
 * Mock error generators
 */
export function createMockNetworkError() {
  return new Error('Network request failed');
}

export function createMockValidationError(field: string, message: string) {
  const error = new Error(message);
  (error as any).field = field;
  return error;
}

/**
 * Test data sets for comprehensive testing
 */
export const TEST_DATA_SETS = {
  validEmails: [
    'test@example.com',
    'user.name@domain.co.uk',
    'user+tag@example.org',
    'firstname.lastname@company.com'
  ],
  
  invalidEmails: [
    'invalid-email',
    '@example.com',
    'user@',
    'user..name@example.com',
    'user@.com'
  ],
  
  validPasswords: [
    'SecurePass123!',
    'MyP@ssw0rd2024',
    'C0mpl3x!P@ssw0rd'
  ],
  
  invalidPasswords: [
    'short',
    'nouppercase123!',
    'NOLOWERCASE123!',
    'NoNumbers!',
    'NoSpecialChars123'
  ],
  
  validNames: [
    'John',
    'Mary-Jane',
    "O'Connor",
    'Jean-Pierre'
  ],
  
  invalidNames: [
    'J',
    'John123',
    'John@Doe',
    'A'.repeat(51)
  ]
};

/**
 * Performance testing helpers
 */
export function measureRenderTime(renderFn: () => void): number {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
}

export function createLargeFormData(size: number = 1000) {
  return Array.from({ length: size }, (_, i) => ({
    email: `user${i}@example.com`,
    password: `Password${i}!`
  }));
}

/**
 * Accessibility testing helpers
 */
export function expectProperLabeling(getByLabelText: (text: string) => HTMLElement) {
  expect(getByLabelText('Email Address')).toBeInTheDocument();
  expect(getByLabelText('Password')).toBeInTheDocument();
}

export function expectProperAriaAttributes(getByTestId: (testId: string) => HTMLElement) {
  const form = getByTestId('auth-form');
  expect(form).toHaveAttribute('noValidate');
  
  const emailInput = getByTestId('auth-email-input');
  expect(emailInput).toHaveAttribute('aria-required', 'true');
}

/**
 * Cleanup helpers
 */
export function cleanupMocks() {
  jest.clearAllMocks();
  jest.resetModules();
}

