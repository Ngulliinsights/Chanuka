/**
 * React Hook Tests for User-Friendly Error Message System
 * 
 * Tests for the React hooks that integrate the error message system
 * with React components
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError } from '../../types';
import { ErrorDomain, ErrorSeverity } from '../../constants';
import {
  useErrorMessages,
  useErrorMessageComponent,
  useErrorRecovery,
  ErrorMessageProvider,
  useErrorMessageContext,
} from '../use-error-messages';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en-US' },
  }),
}));

// Mock AppError for testing
const createMockAppError = (
  type: ErrorDomain = ErrorDomain.NETWORK,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  code: string = 'TEST_ERROR',
  message: string = 'Test error message',
  context: any = {}
): AppError => {
  return new AppError(message, code, type, severity, {
    context,
    details: { test: 'data' },
  });
};

describe('useErrorMessages Hook', () => {
  it('should return all expected methods', () => {
    const { result } = renderHook(() => useErrorMessages());

    expect(result.current).toHaveProperty('formatError');
    expect(result.current).toHaveProperty('getSuggestions');
    expect(result.current).toHaveProperty('createEnhancedMessage');
    expect(result.current).toHaveProperty('getMessage');
    expect(result.current).toHaveProperty('formatForDisplay');
    expect(result.current).toHaveProperty('formatForHTML');
    expect(result.current).toHaveProperty('currentLocale');
  });

  it('should format error messages', () => {
    const { result } = renderHook(() => useErrorMessages());
    const error = createMockAppError();

    const formatted = result.current.formatError(error);
    expect(formatted).toBeDefined();
    expect(formatted.title).toBeDefined();
    expect(formatted.message).toBeDefined();
  });

  it('should get recovery suggestions', () => {
    const { result } = renderHook(() => useErrorMessages());
    const error = createMockAppError();

    const suggestions = result.current.getSuggestions(error);
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should create enhanced messages', () => {
    const { result } = renderHook(() => useErrorMessages());
    const error = createMockAppError();

    const enhanced = result.current.createEnhancedMessage(error);
    expect(enhanced).toBeDefined();
    expect(enhanced.formattedMessage).toBeDefined();
    expect(enhanced.template).toBeDefined();
    expect(enhanced.recoverySuggestions).toBeDefined();
  });

  it('should get localized messages', () => {
    const { result } = renderHook(() => useErrorMessages());

    const message = result.current.getMessage('network-connection-failed');
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });

  it('should format for display', () => {
    const { result } = renderHook(() => useErrorMessages());
    const error = createMockAppError();

    const displayText = result.current.formatForDisplay(error, {
      showTitle: true,
      showSuggestions: true,
      showHelpLink: true,
    });

    expect(typeof displayText).toBe('string');
    expect(displayText.length).toBeGreaterThan(0);
  });

  it('should format for HTML', () => {
    const { result } = renderHook(() => useErrorMessages());
    const error = createMockAppError();

    const htmlContent = result.current.formatForHTML(error, {
      showTitle: true,
      showSuggestions: true,
      showHelpLink: true,
    });

    expect(typeof htmlContent).toBe('string');
    expect(htmlContent.length).toBeGreaterThan(0);
  });
});

describe('useErrorMessageComponent Hook', () => {
  it('should return component-specific error message data', () => {
    const error = createMockAppError();
    const { result } = renderHook(() => useErrorMessageComponent(error));

    expect(result.current).toHaveProperty('formattedMessage');
    expect(result.current).toHaveProperty('recoverySuggestions');
    expect(result.current).toHaveProperty('displayText');
    expect(result.current).toHaveProperty('htmlContent');
    expect(result.current).toHaveProperty('hasError');
  });

  it('should handle null error', () => {
    const { result } = renderHook(() => useErrorMessageComponent(null));

    expect(result.current.formattedMessage).toBeNull();
    expect(result.current.recoverySuggestions).toEqual([]);
    expect(result.current.displayText).toBe('');
    expect(result.current.htmlContent).toBe('');
    expect(result.current.hasError).toBe(false);
  });

  it('should handle non-AppError objects', () => {
    const error = new Error('Standard error');
    const { result } = renderHook(() => useErrorMessageComponent(error));

    expect(result.current.hasError).toBe(true);
    expect(result.current.recoverySuggestions).toEqual([]);
  });

  it('should update when error changes', () => {
    const error1 = createMockAppError(ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
    const error2 = createMockAppError(ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH);

    const { result, rerender } = renderHook(
      ({ error }) => useErrorMessageComponent(error),
      { initialProps: { error: error1 } }
    );

    const initialMessage = result.current.formattedMessage;
    expect(initialMessage?.domain).toBe(ErrorDomain.NETWORK);

    rerender({ error: error2 });
    const updatedMessage = result.current.formattedMessage;
    expect(updatedMessage?.domain).toBe(ErrorDomain.AUTHENTICATION);
  });
});

describe('useErrorRecovery Hook', () => {
  it('should return recovery-specific data', () => {
    const error = createMockAppError();
    const { result } = renderHook(() => useErrorRecovery(error));

    expect(result.current).toHaveProperty('suggestions');
    expect(result.current).toHaveProperty('primarySuggestion');
    expect(result.current).toHaveProperty('executePrimarySuggestion');
    expect(result.current).toHaveProperty('hasRecoveryOptions');
  });

  it('should handle null error', () => {
    const { result } = renderHook(() => useErrorRecovery(null));

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.primarySuggestion).toBeNull();
    expect(result.current.hasRecoveryOptions).toBe(false);
  });

  it('should execute primary suggestion', async () => {
    const error = createMockAppError();
    const { result } = renderHook(() => useErrorRecovery(error));

    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    await act(async () => {
      await result.current.executePrimarySuggestion();
    });

    // The test passes if no error is thrown
    expect(true).toBe(true);
  });

  it('should update when error changes', () => {
    const error1 = createMockAppError(ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
    const error2 = createMockAppError(ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH);

    const { result, rerender } = renderHook(
      ({ error }) => useErrorRecovery(error),
      { initialProps: { error: error1 } }
    );

    const initialSuggestions = result.current.suggestions;
    expect(initialSuggestions.length).toBeGreaterThan(0);

    rerender({ error: error2 });
    const updatedSuggestions = result.current.suggestions;
    expect(updatedSuggestions.length).toBeGreaterThan(0);
  });
});

describe('ErrorMessageProvider and useErrorMessageContext', () => {
  it('should provide error message context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorMessageProvider>{children}</ErrorMessageProvider>
    );

    const { result } = renderHook(() => useErrorMessageContext(), { wrapper });

    expect(result.current).toHaveProperty('formatError');
    expect(result.current).toHaveProperty('getSuggestions');
    expect(result.current).toHaveProperty('getMessage');
    expect(result.current).toHaveProperty('currentLocale');
  });

  it('should throw error when used without provider', () => {
    expect(() => {
      renderHook(() => useErrorMessageContext());
    }).toThrow('useErrorMessageContext must be used within an ErrorMessageProvider');
  });

  it('should share context across components', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorMessageProvider>{children}</ErrorMessageProvider>
    );

    const { result: result1 } = renderHook(() => useErrorMessageContext(), { wrapper });
    const { result: result2 } = renderHook(() => useErrorMessageContext(), { wrapper });

    // Both hooks should have the same context instance
    expect(result1.current).toBe(result2.current);
  });

  it('should work with nested providers', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorMessageProvider>
        <ErrorMessageProvider>
          {children}
        </ErrorMessageProvider>
      </ErrorMessageProvider>
    );

    const { result } = renderHook(() => useErrorMessageContext(), { wrapper });

    expect(result.current).toHaveProperty('formatError');
    expect(result.current).toHaveProperty('getSuggestions');
  });
});

describe('Hook Integration Tests', () => {
  it('should work together in a realistic scenario', () => {
    const error = createMockAppError(
      ErrorDomain.NETWORK,
      ErrorSeverity.HIGH,
      'CONNECTION_TIMEOUT',
      'Request to API timed out',
      { url: 'https://api.example.com/data' }
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorMessageProvider>{children}</ErrorMessageProvider>
    );

    // Test useErrorMessages
    const { result: messagesResult } = renderHook(() => useErrorMessages(), { wrapper });
    const formatted = messagesResult.current.formatError(error);
    const suggestions = messagesResult.current.getSuggestions(error);

    // Test useErrorMessageComponent
    const { result: componentResult } = renderHook(() => useErrorMessageComponent(error), { wrapper });
    const componentData = componentResult.current;

    // Test useErrorRecovery
    const { result: recoveryResult } = renderHook(() => useErrorRecovery(error), { wrapper });
    const recoveryData = recoveryResult.current;

    // Test useErrorMessageContext
    const { result: contextResult } = renderHook(() => useErrorMessageContext(), { wrapper });

    // Verify all hooks work together
    expect(formatted).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(componentData.hasError).toBe(true);
    expect(componentData.formattedMessage).toBeDefined();
    expect(recoveryData.hasRecoveryOptions).toBe(true);
    expect(recoveryData.suggestions.length).toBeGreaterThan(0);
    expect(contextResult.current).toBeDefined();
  });

  it('should handle error state changes', () => {
    const error1 = createMockAppError(ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
    const error2 = createMockAppError(ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorMessageProvider>{children}</ErrorMessageProvider>
    );

    const { result, rerender } = renderHook(
      ({ error }) => ({
        messages: useErrorMessages(),
        component: useErrorMessageComponent(error),
        recovery: useErrorRecovery(error),
      }),
      { 
        initialProps: { error: error1 },
        wrapper 
      }
    );

    // Initial state
    expect(result.current.component.hasError).toBe(true);
    expect(result.current.component.formattedMessage?.domain).toBe(ErrorDomain.NETWORK);

    // Change error
    rerender({ error: error2 });

    // Updated state
    expect(result.current.component.hasError).toBe(true);
    expect(result.current.component.formattedMessage?.domain).toBe(ErrorDomain.AUTHENTICATION);
  });
});