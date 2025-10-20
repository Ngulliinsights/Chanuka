/**
 * UI component testing utilities
 * Following navigation component testing patterns for consistency
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import { z } from 'zod';
import { 
  UIError, 
  UIValidationError, 
  UIInputError, 
  UIFormError,
  UIComponentError 
} from '../errors';
import { ValidationState } from '../types';
import { initializeUIRecoveryStrategies } from '../recovery';

/**
 * Test wrapper component for providing context
 */
interface TestWrapperProps {
  children: ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => {
  // Initialize recovery strategies for tests
  React.useEffect(() => {
    initializeUIRecoveryStrategies();
  }, []);

  return <div data-testid="test-wrapper">{children}</div>;
};

/**
 * Custom render function with test wrapper
 */
export const renderWithWrapper = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: TestWrapper, ...options });
};

/**
 * Mock validation state factory
 */
export const createMockValidationState = (
  overrides: Partial<ValidationState> = {}
): ValidationState => ({
  isValid: true,
  touched: false,
  ...overrides
});

/**
 * Mock error factories
 */
export const createMockUIError = (
  message = 'Test error',
  type = 'UI_ERROR' as any,
  statusCode = 400,
  details?: Record<string, any>
): UIError => new UIError(message, type, statusCode, details);

export const createMockValidationError = (
  message = 'Validation failed',
  field = 'testField',
  value: any = 'testValue',
  details?: Record<string, any>
): UIValidationError => new UIValidationError(message, field, value, details);

export const createMockInputError = (
  inputName = 'testInput',
  value: any = 'testValue',
  reason = 'Test reason',
  details?: Record<string, any>
): UIInputError => new UIInputError(inputName, value, reason, details);

export const createMockFormError = (
  formName = 'testForm',
  errors: Record<string, string> = { field: 'error' },
  details?: Record<string, any>
): UIFormError => new UIFormError(formName, errors, details);

export const createMockComponentError = (
  component = 'testComponent',
  action = 'testAction',
  reason = 'Test reason',
  details?: Record<string, any>
): UIComponentError => new UIComponentError(component, action, reason, details);

/**
 * Mock form data factory
 */
export const createMockFormData = (data: Record<string, string> = {}): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

/**
 * Mock Zod schema factory
 */
export const createMockSchema = (fields: Record<string, z.ZodTypeAny> = {}) => {
  const defaultFields = {
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    ...fields
  };
  return z.object(defaultFields);
};

/**
 * Mock event factories
 */
export const createMockChangeEvent = (
  value: string,
  name?: string
): React.ChangeEvent<HTMLInputElement> => ({
  target: {
    value,
    name: name || 'test',
    type: 'text'
  } as HTMLInputElement,
  currentTarget: {} as HTMLInputElement,
  bubbles: true,
  cancelable: true,
  defaultPrevented: false,
  eventPhase: 0,
  isTrusted: true,
  nativeEvent: {} as Event,
  preventDefault: vi.fn(),
  isDefaultPrevented: vi.fn().mockReturnValue(false),
  stopPropagation: vi.fn(),
  isPropagationStopped: vi.fn().mockReturnValue(false),
  persist: vi.fn(),
  timeStamp: Date.now(),
  type: 'change'
});

export const createMockBlurEvent = (
  value: string,
  name?: string
): React.FocusEvent<HTMLInputElement> => ({
  target: {
    value,
    name: name || 'test',
    type: 'text'
  } as HTMLInputElement,
  currentTarget: {} as HTMLInputElement,
  relatedTarget: null,
  bubbles: true,
  cancelable: true,
  defaultPrevented: false,
  eventPhase: 0,
  isTrusted: true,
  nativeEvent: {} as FocusEvent,
  preventDefault: vi.fn(),
  isDefaultPrevented: vi.fn().mockReturnValue(false),
  stopPropagation: vi.fn(),
  isPropagationStopped: vi.fn().mockReturnValue(false),
  persist: vi.fn(),
  timeStamp: Date.now(),
  type: 'blur'
});

export const createMockSubmitEvent = (): React.FormEvent<HTMLFormElement> => ({
  target: {} as HTMLFormElement,
  currentTarget: {
    elements: [],
    checkValidity: vi.fn().mockReturnValue(true),
    reportValidity: vi.fn().mockReturnValue(true),
    requestSubmit: vi.fn(),
    reset: vi.fn(),
    submit: vi.fn()
  } as any,
  bubbles: true,
  cancelable: true,
  defaultPrevented: false,
  eventPhase: 0,
  isTrusted: true,
  nativeEvent: {} as Event,
  preventDefault: vi.fn(),
  isDefaultPrevented: vi.fn().mockReturnValue(false),
  stopPropagation: vi.fn(),
  isPropagationStopped: vi.fn().mockReturnValue(false),
  persist: vi.fn(),
  timeStamp: Date.now(),
  type: 'submit'
});

/**
 * Mock function factories
 */
export const createMockValidationFunction = (
  shouldPass = true,
  errorMessage = 'Validation failed'
) => vi.fn().mockImplementation((value: any) => {
  return shouldPass ? undefined : errorMessage;
});

export const createMockAsyncFunction = <T = any>(
  result: T,
  delay = 0,
  shouldReject = false
) => vi.fn().mockImplementation(() => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldReject) {
        reject(new Error('Async operation failed'));
      } else {
        resolve(result);
      }
    }, delay);
  });
});

/**
 * Test data generators
 */
export const generateTestUsers = (count = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    age: 20 + i,
    role: ['admin', 'user', 'moderator'][i % 3]
  }));
};

export const generateTestTableData = (rows = 5, columns = 3) => {
  return Array.from({ length: rows }, (_, rowIndex) => {
    const row: Record<string, any> = {};
    for (let colIndex = 0; colIndex < columns; colIndex++) {
      row[`col${colIndex}`] = `Row ${rowIndex + 1}, Col ${colIndex + 1}`;
    }
    return row;
  });
};

/**
 * Assertion helpers
 */
export const expectValidationError = (
  element: HTMLElement,
  errorMessage?: string
) => {
  expect(element).toHaveAttribute('aria-invalid', 'true');
  if (errorMessage) {
    expect(element.closest('div')).toHaveTextContent(errorMessage);
  }
};

export const expectNoValidationError = (element: HTMLElement) => {
  expect(element).not.toHaveAttribute('aria-invalid', 'true');
};

export const expectLoadingState = (element: HTMLElement) => {
  expect(element).toBeDisabled();
  expect(element).toHaveAttribute('aria-busy', 'true');
};

export const expectErrorAlert = (container: HTMLElement, message?: string) => {
  const alert = container.querySelector('[role="alert"]');
  expect(alert).toBeInTheDocument();
  if (message) {
    expect(alert).toHaveTextContent(message);
  }
};

/**
 * Wait helpers
 */
export const waitForValidation = async (timeout = 1000) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export const waitForRecovery = async (timeout = 2000) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

/**
 * Mock localStorage for testing
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
};

/**
 * Console spy helpers
 */
export const spyOnConsole = () => {
  const originalConsole = { ...console };
  
  return {
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    restore: () => {
      Object.assign(console, originalConsole);
    }
  };
};

/**
 * Performance testing helpers
 */
export const measureRenderTime = (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const expectRenderTimeUnder = (renderFn: () => void, maxTime: number) => {
  const renderTime = measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxTime);
};

/**
 * Accessibility testing helpers
 */
export const expectProperLabeling = (input: HTMLElement, labelText: string) => {
  const label = document.querySelector(`label[for="${input.id}"]`);
  expect(label).toBeInTheDocument();
  expect(label).toHaveTextContent(labelText);
};

export const expectKeyboardNavigation = (elements: HTMLElement[]) => {
  elements.forEach(element => {
    expect(element).toHaveAttribute('tabindex');
    expect(parseInt(element.getAttribute('tabindex') || '0')).toBeGreaterThanOrEqual(0);
  });
};

/**
 * Component testing presets
 */
export const getInputTestProps = (overrides = {}) => ({
  id: 'test-input',
  name: 'testInput',
  label: 'Test Input',
  placeholder: 'Enter test value',
  ...overrides
});

export const getFormTestProps = (overrides = {}) => ({
  schema: createMockSchema(),
  onSubmit: vi.fn(),
  onValidationError: vi.fn(),
  ...overrides
});

export const getDialogTestProps = (overrides = {}) => ({
  title: 'Test Dialog',
  open: true,
  onOpenChange: vi.fn(),
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  ...overrides
});

// Re-export commonly used testing utilities
export { vi, expect } from 'vitest';
export { 
  render, 
  screen, 
  fireEvent, 
  waitFor,
  cleanup,
  act
} from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';