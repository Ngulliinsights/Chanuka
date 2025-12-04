/**
 * Simple test helpers for auth component tests
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

// Mock user data
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
      id: Math.random().toString(36).substring(2, 15),
      email: `test${Math.random().toString(36).substring(7)}@example.com`,
      name: `Test User ${Math.random().toString(36).substring(7)}`,
      role: 'citizen',
      is_active: true,
      verification_status: 'verified',
      ...overrides,
    };
  }

  static createMockCitizenUser(overrides: Partial<MockUser> = {}): MockUser {
    return this.createMockUser({
      role: 'citizen',
      verification_status: 'verified',
      is_active: true,
      ...overrides,
    });
  }
}

// Simple test provider
interface TestProviderProps {
  children: React.ReactNode;
  user?: MockUser | null;
}

const TestProvider: React.FC<TestProviderProps> = ({ children, user = null }) => {
  return (
    <div data-testid="test-provider" data-user={user ? JSON.stringify(user) : 'null'}>
      {children}
    </div>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: MockUser | null;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { user, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProvider user={user}>{children}</TestProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Custom hook testing
interface CustomRenderHookOptions<TProps> extends Omit<RenderHookOptions<TProps>, 'wrapper'> {
  user?: MockUser | null;
}

export function renderHookWithProviders<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options: CustomRenderHookOptions<TProps> = {}
): RenderHookResult<TResult, TProps> {
  const { user, ...renderHookOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProvider user={user}>{children}</TestProvider>
  );

  return renderHook(hook, { wrapper: Wrapper, ...renderHookOptions });
}

// Form testing utilities
export class FormTestHelper {
  static async fillInput(
    input: HTMLElement,
    value: string,
    options: { clear?: boolean } = {}
  ): Promise<void> {
    const user = userEvent.setup();
    
    if (options.clear) {
      await users.clear(input);
    }
    
    await users.type(input, value);
  }

  static async clickButton(button: HTMLElement): Promise<void> {
    const user = userEvent.setup();
    await users.click(button);
  }
}

// Integration test helpers
export class IntegrationTestHelper {
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
        requestId: Math.random().toString(36).substring(2, 15),
      },
    };
  }

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
}

// Async test helpers
export class AsyncTestHelper {
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
        // Continue waiting
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    if (onTimeout) {
      onTimeout();
    }
    throw new Error(`Timeout after ${timeout}ms`);
  }
}

// Test suite helpers
export class TestSuiteHelper {
  static describeComponent(
    componentName: string,
    tests: () => void
  ): void {
    describe(`${componentName} Component`, tests);
  }

  static describeHook(
    hookName: string,
    tests: () => void
  ): void {
    describe(`${hookName} Hook`, tests);
  }

  static itShouldRender(
    description: string,
    test: () => void
  ): void {
    it(`should render ${description}`, test);
  }

  static itShouldHandle(
    scenario: string,
    test: () => void
  ): void {
    it(`should handle ${scenario}`, test);
  }

  static itShouldValidate(
    validation: string,
    test: () => void
  ): void {
    it(`should validate ${validation}`, test);
  }
}

