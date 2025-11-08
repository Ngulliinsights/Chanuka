import React, { createContext, useContext } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, Mock } from 'vitest';
import { BaseValidationError } from '../validation/base-validation';

/**
 * Standardized testing utilities following navigation component patterns
 * This module provides consistent test helpers for all client components
 */

// --- Mock data generators ---
export class MockDataGenerator {
  static generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  static generateRandomEmail(): string {
    const domains = ['example.com', 'test.org', 'demo.net'];
    const username = Math.random().toString(36).substring(7);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
  }

  static generateRandomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateRandomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateRandomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  static generateRandomDate(start?: Date, end?: Date): Date {
    const startTime = start ? start.getTime() : Date.now() - 365 * 24 * 60 * 60 * 1000;
    const endTime = end ? end.getTime() : Date.now();
    return new Date(startTime + Math.random() * (endTime - startTime));
  }

  static generateRandomUserRole(): string {
    const roles = ['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate'];
    return roles[Math.floor(Math.random() * roles.length)];
  }

  static generateRandomUrl(): string {
    const protocols = ['http', 'https'];
    const domains = ['example.com', 'test.org', 'demo.net'];
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const path = this.generateRandomString(8);
    return `${protocol}://${domain}/${path}`;
  }
}

// --- Mock user data ---
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  verification_status: string;
}

export class MockUserFactory {
  static createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
      id: MockDataGenerator.generateRandomId(),
      email: MockDataGenerator.generateRandomEmail(),
      name: `Test User ${MockDataGenerator.generateRandomString(5)}`,
      role: MockDataGenerator.generateRandomUserRole(),
      is_active: true,
      verification_status: 'verified',
      ...overrides,
    };
  }

  static createMockUsers(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
    return Array.from({ length: count }, () => this.createMockUser(overrides));
  }

  static createMockAdminUser(overrides: Partial<MockUser> = {}): MockUser {
    return this.createMockUser({
      role: 'admin',
      verification_status: 'verified',
      is_active: true,
      ...overrides,
    });
  }

  static createMockCitizenUser(overrides: Partial<MockUser> = {}): MockUser {
    return this.createMockUser({
      role: 'citizen',
      verification_status: 'verified',
      is_active: true,
      ...overrides,
    });
  }

  static createMockUnauthenticatedUser(): null {
    return null;
  }
}

// --- Component testing utilities ---
export interface TestComponentProps {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: Error | null;
}

export class ComponentTestHelper {
  static createMockProps<T extends TestComponentProps>(
    overrides: Partial<T> = {}
  ): T {
    return {
      className: 'test-component',
      disabled: false,
      loading: false,
      error: null,
      ...overrides,
    } as T;
  }

  static createMockError(
    message: string = 'Test error',
    field: string = 'testField',
    value: any = 'testValue'
  ): BaseValidationError {
    return new BaseValidationError(message, field, value);
  }

  static createMockValidationError(
    field: string,
    message: string = 'Validation failed'
  ): BaseValidationError {
    return new BaseValidationError(message, field, 'invalid-value', 'VALIDATION_ERROR');
  }
}

// --- Provider wrapper for testing ---

// Define context types for mock providers
interface MockAuthContextType {
  user: MockUser | null;
  isAuthenticated: boolean;
  login: Mock;
  logout: Mock;
  loading: boolean;
  error: Error | null;
}

interface MockThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: Mock;
}

interface MockLocaleContextType {
  locale: string;
  setLocale: Mock;
  t: (key: string) => string;
}

// Create mock contexts with proper initialization
// These contexts allow tests to simulate authentication, theming, and localization
const MockAuthContext = createContext<MockAuthContextType>({
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
  error: null,
});

const MockThemeContext = createContext<MockThemeContextType>({
  theme: 'light',
  toggleTheme: vi.fn(),
});

const MockLocaleContext = createContext<MockLocaleContextType>({
  locale: 'en',
  setLocale: vi.fn(),
  t: (key: string) => key,
});

// Export hooks for convenience in tests
export const useMockAuth = () => useContext(MockAuthContext);
export const useMockTheme = () => useContext(MockThemeContext);
export const useMockLocale = () => useContext(MockLocaleContext);

export interface TestProviderProps {
  children: React.ReactNode;
  user?: MockUser | null;
  theme?: 'light' | 'dark';
  locale?: string;
}

/**
 * TestProvider wraps components with all necessary context providers for testing
 * This ensures components have access to mock authentication, theme, and locale contexts
 */
export const TestProvider: React.FC<TestProviderProps> = ({
  children,
  user = null,
  theme = 'light',
  locale = 'en',
}) => {
  const mockAuthValue: MockAuthContextType = {
    user,
    isAuthenticated: !!user,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    error: null,
  };

  const mockThemeValue: MockThemeContextType = {
    theme,
    toggleTheme: vi.fn(),
  };

  const mockLocaleValue: MockLocaleContextType = {
    locale,
    setLocale: vi.fn(),
    t: (key: string) => key,
  };

  return (
    <div
      data-testid="test-provider"
      data-theme={theme}
      data-locale={locale}
      data-user={user ? 'authenticated' : 'null'}
    >
      <MockAuthContext.Provider value={mockAuthValue}>
        <MockThemeContext.Provider value={mockThemeValue}>
          <MockLocaleContext.Provider value={mockLocaleValue}>
            {children}
          </MockLocaleContext.Provider>
        </MockThemeContext.Provider>
      </MockAuthContext.Provider>
    </div>
  );
};

// --- Custom render functions ---
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: MockUser | null;
  theme?: 'light' | 'dark';
  locale?: string;
}

/**
 * Custom render function that wraps components with TestProvider
 * Use this instead of the standard render() from @testing-library/react
 * to ensure your components have access to all mock contexts
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { user, theme, locale, ...renderOptions } = options;

  // Create a wrapper component that includes the TestProvider
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProvider user={user} theme={theme} locale={locale}>
      {children}
    </TestProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// --- Custom hook testing utilities ---
export interface CustomRenderHookOptions<TProps> extends Omit<RenderHookOptions<TProps>, 'wrapper'> {
  user?: MockUser | null;
  theme?: 'light' | 'dark';
  locale?: string;
}

/**
 * Custom renderHook function that wraps hooks with TestProvider
 * Use this to test custom hooks that depend on contexts
 */
export function renderHookWithProviders<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options: CustomRenderHookOptions<TProps> = {}
): RenderHookResult<TResult, TProps> {
  const { user, theme, locale, ...renderHookOptions } = options;

  // Create a wrapper component for hook testing
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProvider user={user} theme={theme} locale={locale}>
      {children}
    </TestProvider>
  );

  return renderHook(hook, { wrapper: Wrapper, ...renderHookOptions });
}

// --- Async testing utilities ---
export class AsyncTestHelper {
  /**
   * Wait for a condition to be true or a callback to succeed
   * This is useful for testing async operations and state updates
   */
  static async waitFor<T>(
    callback: () => T | Promise<T>,
    options: {
      timeout?: number;
      interval?: number;
      onTimeout?: () => void;
    } = {}
  ): Promise<T> {
    const { timeout = 5000, interval = 50, onTimeout } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await callback();
        if (result) {
          return result;
        }
      } catch (error) {
        // Continue waiting if callback throws
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    if (onTimeout) {
      onTimeout();
    }
    throw new Error(`Timeout after ${timeout}ms`);
  }

  /**
   * Wait for an element to appear in the DOM
   */
  static async waitForElement(
    selector: string,
    container: HTMLElement = document.body,
    timeout: number = 5000
  ): Promise<HTMLElement> {
    return this.waitFor(
      () => {
        const element = container.querySelector(selector) as HTMLElement;
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        return element;
      },
      { timeout }
    );
  }

  /**
   * Wait for an element to be removed from the DOM
   */
  static async waitForElementToDisappear(
    selector: string,
    container: HTMLElement = document.body,
    timeout: number = 5000
  ): Promise<void> {
    return this.waitFor(
      () => {
        const element = container.querySelector(selector);
        if (element) {
          throw new Error(`Element still exists: ${selector}`);
        }
        // Return undefined to satisfy Promise<void>
        return undefined;
      },
      { timeout }
    );
  }
}

// --- Form testing utilities ---
export class FormTestHelper {
  /**
   * Fill an input field with a value
   * Simulates real user typing behavior
   */
  static async fillInput(
    input: HTMLElement,
    value: string,
    options: { clear?: boolean } = {}
  ): Promise<void> {
    const user = userEvent.setup();
    
    if (options.clear) {
      await user.clear(input);
    }
    
    await user.type(input, value);
  }

  /**
   * Select an option from a select element
   */
  static async selectOption(
    select: HTMLElement,
    value: string
  ): Promise<void> {
    const user = userEvent.setup();
    await user.selectOptions(select, value);
  }

  /**
   * Click a button element
   */
  static async clickButton(button: HTMLElement): Promise<void> {
    const user = userEvent.setup();
    await user.click(button);
  }

  /**
   * Submit a form by clicking its submit button or dispatching a submit event
   */
  static async submitForm(form: HTMLElement): Promise<void> {
    const user = userEvent.setup();
    const submitButton = form.querySelector('button[type="submit"]') as HTMLElement;
    if (submitButton) {
      const user = userEvent.setup();
      await user.click(submitButton);
    } else {
      // Fallback: trigger form submission event directly
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }

  /**
   * Validate that form data contains expected field values
   */
  static validateFormData(
    formData: FormData,
    expectedFields: Record<string, string>
  ): void {
    Object.entries(expectedFields).forEach(([field, expectedValue]) => {
      const actualValue = formData.get(field);
      expect(actualValue).toBe(expectedValue);
    });
  }
}

// --- Error testing utilities ---
export class ErrorTestHelper {
  /**
   * Assert that an error is a validation error with specific properties
   */
  static expectValidationError(
    error: unknown,
    expectedField?: string,
    expectedMessage?: string
  ): void {
    expect(error).toBeInstanceOf(BaseValidationError);
    
    const validationError = error as BaseValidationError;
    
    if (expectedField) {
      expect(validationError.field).toBe(expectedField);
    }
    
    if (expectedMessage) {
      expect(validationError.message).toContain(expectedMessage);
    }
    
    expect(validationError.isOperational).toBe(true);
  }

  /**
   * Assert that a result object indicates success with no errors
   */
  static expectNoError(result: { success: boolean; error?: unknown }): void {
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  }

  /**
   * Assert that a result object indicates failure with an error
   */
  static expectError(
    result: { success: boolean; error?: unknown },
    expectedErrorType?: string
  ): void {
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    
    if (expectedErrorType && result.error instanceof BaseValidationError) {
      expect(result.error.type).toBe(expectedErrorType);
    }
  }
}

// --- Performance testing utilities ---
export class PerformanceTestHelper {
  /**
   * Measure how long a render operation takes
   */
  static measureRenderTime<T>(
    renderFunction: () => T
  ): { result: T; renderTime: number } {
    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();
    
    return {
      result,
      renderTime: endTime - startTime,
    };
  }

  /**
   * Measure how long an async operation takes to complete
   */
  static async measureAsyncOperation<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    
    return {
      result,
      duration: endTime - startTime,
    };
  }

  /**
   * Assert that an operation completes within a performance threshold
   * Warns if approaching the threshold
   */
  static expectPerformanceWithinThreshold(
    actualTime: number,
    maxTime: number,
    operation: string = 'Operation'
  ): void {
    expect(actualTime).toBeLessThanOrEqual(maxTime);
    
    // Warn if we're using more than 80% of allowed time
    if (actualTime > maxTime * 0.8) {
      console.warn(`${operation} took ${actualTime}ms, approaching threshold of ${maxTime}ms`);
    }
  }
}

// --- Accessibility testing utilities ---
export class AccessibilityTestHelper {
  /**
   * Verify an element has the expected aria-label
   */
  static expectAriaLabel(element: HTMLElement, expectedLabel: string): void {
    const ariaLabel = element.getAttribute('aria-label');
    expect(ariaLabel).toBe(expectedLabel);
  }

  /**
   * Verify an element references another element via aria-describedby
   */
  static expectAriaDescribedBy(element: HTMLElement, expectedId: string): void {
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    expect(ariaDescribedBy).toBe(expectedId);
  }

  /**
   * Verify an element is keyboard focusable
   */
  static expectFocusable(element: HTMLElement): void {
    expect(element.tabIndex).toBeGreaterThanOrEqual(0);
  }

  /**
   * Test that an element responds to keyboard navigation
   */
  static expectKeyboardNavigation(
    element: HTMLElement,
    key: string,
    expectedAction: () => void
  ): void {
    const mockAction = vi.fn(expectedAction);
    
    // Attach event listener to the element
    element.addEventListener('keydown', (e) => {
      if (e.key === key) {
        mockAction();
      }
    });

    // Simulate keyboard event
    element.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true }));
    
    expect(mockAction).toHaveBeenCalled();
  }
}

// --- Integration testing utilities ---
export class IntegrationTestHelper {
  /**
   * Create a standardized mock API response structure
   */
  static createMockApiResponse<T>(
    data: T,
    success: boolean = true,
    error?: { message: string; code?: string }
  ) {
    return {
      success,
      data: success ? data : undefined,
      error: !success ? error : undefined,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: MockDataGenerator.generateRandomId(),
      },
    };
  }

  /**
   * Mock the global fetch function with a custom response
   * Useful for testing components that make API calls
   */
  static mockFetch(
    response: any,
    status: number = 200,
    delay: number = 0
  ): any {
    return vi.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: status >= 200 && status < 300,
                status,
                json: () => Promise.resolve(response),
                text: () => Promise.resolve(JSON.stringify(response)),
              } as Response),
            delay
          )
        )
    );
  }

  /**
   * Verify that a mocked fetch was called with expected parameters
   */
  static expectApiCall(
    mockFetch: any,
    expectedUrl: string,
    expectedOptions?: RequestInit
  ): void {
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
  }
}

// --- Test suite utilities ---
export class TestSuiteHelper {
  /**
   * Create a describe block for component tests with consistent naming
   */
  static describeComponent(
    componentName: string,
    tests: () => void
  ): void {
    describe(`${componentName} Component`, tests);
  }

  /**
   * Create a describe block for hook tests with consistent naming
   */
  static describeHook(
    hookName: string,
    tests: () => void
  ): void {
    describe(`${hookName} Hook`, tests);
  }

  /**
   * Create a describe block for utility tests with consistent naming
   */
  static describeUtility(
    utilityName: string,
    tests: () => void
  ): void {
    describe(`${utilityName} Utility`, tests);
  }

  /**
   * Create an it block for render tests with consistent naming
   */
  static itShouldRender(
    description: string,
    test: () => void
  ): void {
    it(`should render ${description}`, test);
  }

  /**
   * Create an it block for behavior tests with consistent naming
   */
  static itShouldHandle(
    scenario: string,
    test: () => void
  ): void {
    it(`should handle ${scenario}`, test);
  }

  /**
   * Create an it block for validation tests with consistent naming
   */
  static itShouldValidate(
    validation: string,
    test: () => void
  ): void {
    it(`should validate ${validation}`, test);
  }
}

