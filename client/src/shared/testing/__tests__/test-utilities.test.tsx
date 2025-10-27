import React from 'react';
// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as Response)
);

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import {
  MockDataGenerator,
  MockUserFactory,
  ComponentTestHelper,
  TestProvider,
  renderWithProviders,
  AsyncTestHelper,
  FormTestHelper,
  ErrorTestHelper,
  PerformanceTestHelper,
  AccessibilityTestHelper,
  IntegrationTestHelper,
  TestSuiteHelper,
} from '../test-utilities';
import { BaseValidationError } from '../../validation/base-validation';

describe('MockDataGenerator', () => {
  describe('generateRandomId', () => {
    it('should generate unique IDs', () => {
      const id1 = MockDataGenerator.generateRandomId();
      const id2 = MockDataGenerator.generateRandomId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });
  });

  describe('generateRandomEmail', () => {
    it('should generate valid email format', () => {
      const email = MockDataGenerator.generateRandomEmail();
      
      expect(email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
    });

    it('should generate unique emails', () => {
      const email1 = MockDataGenerator.generateRandomEmail();
      const email2 = MockDataGenerator.generateRandomEmail();
      
      expect(email1).not.toBe(email2);
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of specified length', () => {
      const length = 15;
      const str = MockDataGenerator.generateRandomString(length);
      
      expect(str).toHaveLength(length);
      expect(typeof str).toBe('string');
    });

    it('should generate different strings', () => {
      const str1 = MockDataGenerator.generateRandomString();
      const str2 = MockDataGenerator.generateRandomString();
      
      expect(str1).not.toBe(str2);
    });
  });

  describe('generateRandomNumber', () => {
    it('should generate number within range', () => {
      const min = 10;
      const max = 20;
      const num = MockDataGenerator.generateRandomNumber(min, max);
      
      expect(num).toBeGreaterThanOrEqual(min);
      expect(num).toBeLessThanOrEqual(max);
      expect(Number.isInteger(num)).toBe(true);
    });
  });

  describe('generateRandomBoolean', () => {
    it('should generate boolean value', () => {
      const bool = MockDataGenerator.generateRandomBoolean();
      expect(typeof bool).toBe('boolean');
    });
  });

  describe('generateRandomDate', () => {
    it('should generate date within range', () => {
      const start = new Date('2023-01-01');
      const end = new Date('2023-12-31');
      const date = MockDataGenerator.generateRandomDate(start, end);
      
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(end.getTime());
    });
  });

  describe('generateRandomUserRole', () => {
    it('should generate valid user role', () => {
      const validRoles = ['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate'];
      const role = MockDataGenerator.generateRandomUserRole();
      
      expect(validRoles).toContain(role);
    });
  });

  describe('generateRandomUrl', () => {
    it('should generate valid URL format', () => {
      const url = MockDataGenerator.generateRandomUrl();
      
      expect(url).toMatch(/^https?:\/\/[^\/]+\/[^\/]+$/);
    });
  });
});

describe('MockUserFactory', () => {
  describe('createMockUser', () => {
    it('should create user with default properties', () => {
      const user = MockUserFactory.createMockUser();
      
      expect(user.id).toBeTruthy();
      expect(user.email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
      expect(user.name).toBeTruthy();
      expect(user.role).toBeTruthy();
      expect(user.isActive).toBe(true);
      expect(user.verificationStatus).toBe('verified');
    });

    it('should apply overrides', () => {
      const overrides = {
        role: 'admin',
        isActive: false,
        name: 'Custom User',
      };
      const user = MockUserFactory.createMockUser(overrides);
      
      expect(user.role).toBe('admin');
      expect(user.isActive).toBe(false);
      expect(user.name).toBe('Custom User');
    });
  });

  describe('createMockUsers', () => {
    it('should create specified number of users', () => {
      const count = 5;
      const users = MockUserFactory.createMockUsers(count);
      
      expect(users).toHaveLength(count);
      expect(users.every(user => user.id && user.email)).toBe(true);
    });
  });

  describe('createMockAdminUser', () => {
    it('should create admin user', () => {
      const user = MockUserFactory.createMockAdminUser();
      
      expect(user.role).toBe('admin');
      expect(user.verificationStatus).toBe('verified');
      expect(user.isActive).toBe(true);
    });
  });

  describe('createMockCitizenUser', () => {
    it('should create citizen user', () => {
      const user = MockUserFactory.createMockCitizenUser();
      
      expect(user.role).toBe('citizen');
      expect(user.verificationStatus).toBe('verified');
      expect(user.isActive).toBe(true);
    });
  });

  describe('createMockUnauthenticatedUser', () => {
    it('should return null', () => {
      const user = MockUserFactory.createMockUnauthenticatedUser();
      expect(user).toBeNull();
    });
  });
});

describe('ComponentTestHelper', () => {
  describe('createMockProps', () => {
    it('should create props with defaults', () => {
      const props = ComponentTestHelper.createMockProps();
      
      expect(props.className).toBe('test-component');
      expect(props.disabled).toBe(false);
      expect(props.loading).toBe(false);
      expect(props.error).toBeNull();
    });

    it('should apply overrides', () => {
      const overrides = {
        disabled: true,
        loading: true,
        className: 'custom-class',
      };
      const props = ComponentTestHelper.createMockProps(overrides);
      
      expect(props.disabled).toBe(true);
      expect(props.loading).toBe(true);
      expect(props.className).toBe('custom-class');
    });
  });

  describe('createMockError', () => {
    it('should create BaseValidationError', () => {
      const error = ComponentTestHelper.createMockError();
      
      expect(error).toBeInstanceOf(BaseValidationError);
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.value).toBe('testValue');
    });
  });

  describe('createMockValidationError', () => {
    it('should create validation error with field', () => {
      const error = ComponentTestHelper.createMockValidationError('email');
      
      expect(error).toBeInstanceOf(BaseValidationError);
      expect(error.field).toBe('email');
      expect(error.type).toBe('VALIDATION_ERROR');
    });
  });
});

describe('TestProvider', () => {
  it('should render children with test attributes', () => {
    const TestComponent = () => <div data-testid="test-child">Test Content</div>;
    const user = MockUserFactory.createMockUser();
    
    render(
      <TestProvider user={user} theme="dark" locale="es">
        <TestComponent />
      </TestProvider>
    );
    
    const provider = screen.getByTestId('test-provider');
    expect(provider).toBeInTheDocument();
    expect(provider).toHaveAttribute('data-theme', 'dark');
    expect(provider).toHaveAttribute('data-locale', 'es');
    expect(provider).toHaveAttribute('data-user');
    
    const child = screen.getByTestId('test-child');
    expect(child).toBeInTheDocument();
  });

  it('should handle null user', () => {
    const TestComponent = () => <div data-testid="test-child">Test Content</div>;
    
    render(
      <TestProvider user={null}>
        <TestComponent />
      </TestProvider>
    );
    
    const provider = screen.getByTestId('test-provider');
    expect(provider).toHaveAttribute('data-user', 'null');
  });
});

describe('renderWithProviders', () => {
  it('should render component with providers', () => {
    const TestComponent = () => <div data-testid="test-component">Test</div>;
    const user = MockUserFactory.createMockUser();
    
    renderWithProviders(<TestComponent />, { user });
    
    expect(screen.getByTestId('test-provider')).toBeInTheDocument();
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });
});

describe('AsyncTestHelper', () => {
  describe('waitFor', () => {
    it('should wait for condition to be true', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };
      
      const result = await AsyncTestHelper.await waitFor(condition, { interval: 10 });
      expect(result).toBe(true);
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should timeout if condition never met', async () => {
      const condition = () => false;
      
      await expect(
        AsyncTestHelper.await waitFor(condition, { timeout: 100, interval: 10 })
      ).rejects.toThrow('Timeout after 100ms');
    });
  });

  describe('waitForElement', () => {
    it('should wait for element to appear', async () => {
      const container = document.createElement('div');
      
      // Add element after delay
      setTimeout(() => {
        const element = document.createElement('span');
        element.className = 'test-element';
        container.appendChild(element);
      }, 50);
      
      const element = await AsyncTestHelper.waitForElement('.test-element', container, 200);
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.className).toBe('test-element');
    });
  });
});

describe('ErrorTestHelper', () => {
  describe('expectValidationError', () => {
    it('should validate BaseValidationError', () => {
      const error = new BaseValidationError('Test error', 'testField', 'testValue');
      
      expect(() => {
        ErrorTestHelper.expectValidationError(error, 'testField', 'Test error');
      }).not.toThrow();
    });

    it('should throw if not BaseValidationError', () => {
      const error = new Error('Regular error');
      
      expect(() => {
        ErrorTestHelper.expectValidationError(error);
      }).toThrow();
    });
  });

  describe('expectNoError', () => {
    it('should pass for successful result', () => {
      const result = { success: true };
      
      expect(() => {
        ErrorTestHelper.expectNoError(result);
      }).not.toThrow();
    });

    it('should fail for error result', () => {
      const result = { success: false, error: new Error('Test') };
      
      expect(() => {
        ErrorTestHelper.expectNoError(result);
      }).toThrow();
    });
  });

  describe('expectError', () => {
    it('should pass for error result', () => {
      const error = new BaseValidationError('Test', 'field', 'value', 'TEST_ERROR');
      const result = { success: false, error };
      
      expect(() => {
        ErrorTestHelper.expectError(result, 'TEST_ERROR');
      }).not.toThrow();
    });

    it('should fail for successful result', () => {
      const result = { success: true };
      
      expect(() => {
        ErrorTestHelper.expectError(result);
      }).toThrow();
    });
  });
});

describe('PerformanceTestHelper', () => {
  describe('measureRenderTime', () => {
    it('should measure render time', () => {
      const renderFunction = () => {
        // Simulate some work
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait
        }
        return 'result';
      };
      
      const { result, renderTime } = PerformanceTestHelper.measureRenderTime(renderFunction);
      
      expect(result).toBe('result');
      expect(renderTime).toBeGreaterThan(0);
    });
  });

  describe('measureAsyncOperation', () => {
    it('should measure async operation time', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'async result';
      };
      
      const { result, duration } = await PerformanceTestHelper.measureAsyncOperation(operation);
      
      expect(result).toBe('async result');
      expect(duration).toBeGreaterThan(40); // Allow some variance
    });
  });

  describe('expectPerformanceWithinThreshold', () => {
    it('should pass for time within threshold', () => {
      expect(() => {
        PerformanceTestHelper.expectPerformanceWithinThreshold(50, 100);
      }).not.toThrow();
    });

    it('should fail for time exceeding threshold', () => {
      expect(() => {
        PerformanceTestHelper.expectPerformanceWithinThreshold(150, 100);
      }).toThrow();
    });
  });
});

describe('AccessibilityTestHelper', () => {
  describe('expectAriaLabel', () => {
    it('should validate aria-label', () => {
      const element = document.createElement('button');
      element.setAttribute('aria-label', 'Test Button');
      
      expect(() => {
        AccessibilityTestHelper.expectAriaLabel(element, 'Test Button');
      }).not.toThrow();
    });
  });

  describe('expectFocusable', () => {
    it('should validate focusable element', () => {
      const element = document.createElement('button');
      element.tabIndex = 0;
      
      expect(() => {
        AccessibilityTestHelper.expectFocusable(element);
      }).not.toThrow();
    });
  });
});

describe('IntegrationTestHelper', () => {
  describe('createMockApiResponse', () => {
    it('should create successful response', () => {
      const data = { id: 1, name: 'Test' };
      const response = IntegrationTestHelper.createMockApiResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeUndefined();
      expect(response.meta.timestamp).toBeTruthy();
    });

    it('should create error response', () => {
      const error = { message: 'Test error', code: 'ERR_001' };
      const response = IntegrationTestHelper.createMockApiResponse(null, false, error);
      
      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error).toEqual(error);
    });
  });

  describe('mockFetch', () => {
    afterEach(() => {
    cleanup();
      vi.restoreAllMocks();
    
  });

    it('should mock fetch with response', async () => {
      const mockData = { test: 'data' };
      const mockFetch = IntegrationTestHelper.mockFetch(mockData, 200);

      const response = await fetch('/test');
      const data = await response.json();

      expect(data).toEqual(mockData);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith('/test');
    });
  });
});

describe('TestSuiteHelper', () => {
  describe('utility methods', () => {
    it('should provide describe wrappers', () => {
      expect(typeof TestSuiteHelper.describeComponent).toBe('function');
      expect(typeof TestSuiteHelper.describeHook).toBe('function');
      expect(typeof TestSuiteHelper.describeUtility).toBe('function');
    });

    it('should provide it wrappers', () => {
      expect(typeof TestSuiteHelper.itShouldRender).toBe('function');
      expect(typeof TestSuiteHelper.itShouldHandle).toBe('function');
      expect(typeof TestSuiteHelper.itShouldValidate).toBe('function');
    });
  });
});