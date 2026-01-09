/**
 * Comprehensive Tests for User-Friendly Error Message System
 *
 * Tests all components of the error message system including templates,
 * formatting, localization, recovery suggestions, and React hooks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AppError } from '../../types';
import { ErrorDomain, ErrorSeverity } from '../../constants';
import {
  ErrorMessageTemplate,
  getTemplateById,
  getTemplatesByDomain,
  getTemplatesBySeverity,
  getBestMatchTemplate,
  getLocalizedMessage,
  addLocalizedMessages,
  FormattedErrorMessage,
  formatErrorMessage,
  formatMessageWithContext,
  createAppErrorFromError,
  formatMemoryUsage,
  formatErrorForDisplay,
  formatErrorForHTML,
  escapeHtml,
  getErrorSeverityClass,
  getErrorIconClass,
  RecoverySuggestion,
  RECOVERY_SUGGESTIONS,
  getRecoverySuggestions,
  isSuggestionApplicable,
  convertSuggestionsToRecoveryStrategies,
  enhanceSuggestionsWithContext,
  trackSuggestionUsage,
  getSuggestionAnalytics,
  clearSuggestionAnalytics,
  getBestRecoverySuggestion,
  getSuggestionById,
  addCustomRecoverySuggestion,
  removeRecoverySuggestion,
  EnhancedErrorMessage,
  createEnhancedErrorMessage,
  ErrorMessageService,
  errorMessageService,
} from '../index';

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

describe('Error Message Templates', () => {
  it('should have valid template structure', () => {
    const templates = [
      'network-connection-failed',
      'auth-session-expired',
      'validation-invalid-input',
      'database-connection-failed',
      'system-unexpected-error',
      'external-service-unavailable',
      'business-rule-violation',
      'cache-invalid',
      'generic-error',
    ];

    templates.forEach(templateId => {
      const template = getTemplateById(templateId);
      expect(template).toBeDefined();
      expect(template?.id).toBe(templateId);
      expect(template?.domain).toBeDefined();
      expect(template?.severity).toBeDefined();
      expect(template?.title).toBeDefined();
      expect(template?.message).toBeDefined();
      expect(template?.priority).toBeDefined();
    });
  });

  it('should find templates by domain', () => {
    const networkTemplates = getTemplatesByDomain(ErrorDomain.NETWORK);
    expect(networkTemplates.length).toBeGreaterThan(0);
    expect(networkTemplates.every(t => t.domain === ErrorDomain.NETWORK)).toBe(true);
  });

  it('should find templates by severity', () => {
    const mediumTemplates = getTemplatesBySeverity(ErrorSeverity.MEDIUM);
    expect(mediumTemplates.length).toBeGreaterThan(0);
    expect(mediumTemplates.every(t => t.severity === ErrorSeverity.MEDIUM)).toBe(true);
  });

  it('should find best match template', () => {
    const template = getBestMatchTemplate(ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
    expect(template).toBeDefined();
    expect(template.domain).toBe(ErrorDomain.NETWORK);
  });
});

describe('Localization', () => {
  beforeEach(() => {
    clearSuggestionAnalytics();
  });

  it('should provide default English messages', () => {
    const message = getLocalizedMessage('network-connection-failed', 'en-US');
    expect(message).toContain('connect to the server');
  });

  it('should provide Spanish translations', () => {
    const message = getLocalizedMessage('network-connection-failed', 'es-ES');
    expect(message).toContain('conectarnos al servidor');
  });

  it('should provide French translations', () => {
    const message = getLocalizedMessage('network-connection-failed', 'fr-FR');
    expect(message).toContain('Nous n\'avons pas pu nous connecter');
  });

  it('should fallback to English for unknown locales', () => {
    const message = getLocalizedMessage('network-connection-failed', 'xx-XX');
    expect(message).toContain('connect to the server');
  });

  it('should add custom localized messages', () => {
    addLocalizedMessages('test-locale', {
      'network-connection-failed': 'Custom test message',
    });

    const message = getLocalizedMessage('network-connection-failed', 'test-locale');
    expect(message).toBe('Custom test message');
  });
});

describe('Error Message Formatting', () => {
  it('should format error messages correctly', () => {
    const error = createMockAppError();
    const formatted = formatErrorMessage(error);

    expect(formatted).toBeDefined();
    expect(formatted.title).toBeDefined();
    expect(formatted.message).toBeDefined();
    expect(formatted.severity).toBe(error.severity);
    expect(formatted.domain).toBe(error.type);
  });

  it('should format messages with context', () => {
    const error = createMockAppError(
      ErrorDomain.NETWORK,
      ErrorSeverity.MEDIUM,
      'NETWORK_TIMEOUT',
      'Request timed out',
      { url: 'https://api.example.com' }
    );

    const template = getTemplateById('network-timeout');
    const formatted = formatMessageWithContext(template!.message, error);

    expect(formatted).toContain('https://api.example.com');
  });

  it('should create AppError from standard Error', () => {
    const standardError = new Error('Standard error message');
    const appError = createAppErrorFromError(standardError);

    expect(appError).toBeInstanceOf(AppError);
    expect(appError.message).toBe('Standard error message');
    expect(appError.type).toBe(ErrorDomain.SYSTEM);
  });

  it('should format memory usage correctly', () => {
    expect(formatMemoryUsage(1024)).toBe('1.00 KB');
    expect(formatMemoryUsage(1024 * 1024)).toBe('1.00 MB');
    expect(formatMemoryUsage(1024 * 1024 * 1024)).toBe('1.00 GB');
  });

  it('should format error for display', () => {
    const error = createMockAppError();
    const displayText = formatErrorForDisplay(error, {
      showTitle: true,
      showSuggestions: true,
      showHelpLink: true,
    });

    expect(displayText).toContain('**');
    expect(displayText).toContain('Suggestions:');
  });

  it('should format error for HTML', () => {
    const error = createMockAppError();
    const htmlContent = formatErrorForHTML(error, {
      showTitle: true,
      showSuggestions: true,
      showHelpLink: true,
    });

    expect(htmlContent).toContain('<h3');
    expect(htmlContent).toContain('<p');
    expect(htmlContent).toContain('<ul');
  });

  it('should escape HTML correctly', () => {
    const text = '<script>alert("xss")</script>';
    const escaped = escapeHtml(text);
    expect(escaped).toBe('<script>alert("xss")</script>');
  });

  it('should get severity class', () => {
    expect(getErrorSeverityClass(ErrorSeverity.CRITICAL)).toBe('error-critical');
    expect(getErrorSeverityClass(ErrorSeverity.HIGH)).toBe('error-high');
    expect(getErrorSeverityClass(ErrorSeverity.MEDIUM)).toBe('error-medium');
    expect(getErrorSeverityClass(ErrorSeverity.LOW)).toBe('error-low');
  });

  it('should get error icon class', () => {
    expect(getErrorIconClass(ErrorDomain.NETWORK)).toBe('wifi-off');
    expect(getErrorIconClass(ErrorDomain.AUTHENTICATION)).toBe('log-out');
    expect(getErrorIconClass(ErrorDomain.SYSTEM)).toBe('alert-octagon');
  });
});

describe('Recovery Suggestions', () => {
  it('should have recovery suggestions', () => {
    expect(RECOVERY_SUGGESTIONS.length).toBeGreaterThan(0);
    expect(RECOVERY_SUGGESTIONS[0]).toHaveProperty('id');
    expect(RECOVERY_SUGGESTIONS[0]).toHaveProperty('title');
    expect(RECOVERY_SUGGESTIONS[0]).toHaveProperty('description');
    expect(RECOVERY_SUGGESTIONS[0]).toHaveProperty('priority');
  });

  it('should get recovery suggestions for errors', () => {
    const error = createMockAppError(ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
    const suggestions = getRecoverySuggestions(error);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toHaveProperty('id');
    expect(suggestions[0]).toHaveProperty('title');
  });

  it('should check if suggestion is applicable', () => {
    const error = createMockAppError(ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
    const suggestion = RECOVERY_SUGGESTIONS[0];

    const applicable = isSuggestionApplicable(suggestion, error);
    expect(typeof applicable).toBe('boolean');
  });

  it('should convert suggestions to recovery strategies', () => {
    const suggestions = RECOVERY_SUGGESTIONS.slice(0, 2);
    const strategies = convertSuggestionsToRecoveryStrategies(suggestions);

    expect(strategies.length).toBe(2);
    expect(strategies[0]).toHaveProperty('id');
    expect(strategies[0]).toHaveProperty('condition');
    expect(strategies[0]).toHaveProperty('action');
  });

  it('should enhance suggestions with context', () => {
    const error = createMockAppError(ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
    const suggestions = getRecoverySuggestions(error);

    const enhanced = enhanceSuggestionsWithContext(suggestions, error, {
      isOnline: false,
      connectionType: 'slow',
    });

    expect(enhanced.length).toBe(suggestions.length);
  });

  it('should track suggestion usage', () => {
    clearSuggestionAnalytics();

    trackSuggestionUsage('test-suggestion', 'test-error', true, true);

    const analytics = getSuggestionAnalytics();
    expect(analytics.length).toBe(1);
    expect(analytics[0].suggestionId).toBe('test-suggestion');
    expect(analytics[0].wasUsed).toBe(true);
    expect(analytics[0].success).toBe(true);
  });

  it('should get best recovery suggestion', () => {
    const error = createMockAppError(ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
    const bestSuggestion = getBestRecoverySuggestion(error);

    expect(bestSuggestion).toBeDefined();
    expect(bestSuggestion?.priority).toBe(1);
  });

  it('should get suggestion by ID', () => {
    const suggestion = getSuggestionById('retry-network-request');
    expect(suggestion).toBeDefined();
    expect(suggestion?.id).toBe('retry-network-request');
  });

  it('should add and remove custom recovery suggestions', () => {
    const customSuggestion: RecoverySuggestion = {
      id: 'custom-suggestion',
      title: 'Custom Suggestion',
      description: 'A custom recovery suggestion',
      priority: 1,
      applicableDomains: [ErrorDomain.NETWORK],
      applicableSeverities: [ErrorSeverity.MEDIUM],
    };

    addCustomRecoverySuggestion(customSuggestion);

    const found = getSuggestionById('custom-suggestion');
    expect(found).toBeDefined();
    expect(found?.title).toBe('Custom Suggestion');

    const removed = removeRecoverySuggestion('custom-suggestion');
    expect(removed).toBe(true);
  });
});

describe('Enhanced Error Messages', () => {
  it('should create enhanced error message', () => {
    const error = createMockAppError();
    const enhanced = createEnhancedErrorMessage(error);

    expect(enhanced).toBeDefined();
    expect(enhanced.formattedMessage).toBeDefined();
    expect(enhanced.template).toBeDefined();
    expect(enhanced.recoverySuggestions).toBeDefined();
  });

  it('should create enhanced message with options', () => {
    const error = createMockAppError();
    const enhanced = createEnhancedErrorMessage(error, {
      locale: 'es-ES',
      maxSuggestions: 2,
    });

    expect(enhanced.recoverySuggestions.length).toBeLessThanOrEqual(2);
  });
});

describe('Error Message Service', () => {
  it('should be a singleton', () => {
    const service1 = ErrorMessageService.getInstance();
    const service2 = ErrorMessageService.getInstance();

    expect(service1).toBe(service2);
    expect(service1).toBe(errorMessageService);
  });

  it('should format errors', () => {
    const error = createMockAppError();
    const service = ErrorMessageService.getInstance();

    const formatted = service.formatError(error);
    expect(formatted).toBeDefined();
    expect(formatted.severity).toBe(error.severity);
  });

  it('should get recovery suggestions', () => {
    const error = createMockAppError();
    const service = ErrorMessageService.getInstance();

    const suggestions = service.getRecoverySuggestions(error);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should create enhanced messages', () => {
    const error = createMockAppError();
    const service = ErrorMessageService.getInstance();

    const enhanced = service.createEnhancedMessage(error);
    expect(enhanced).toBeDefined();
    expect(enhanced.formattedMessage).toBeDefined();
  });

  it('should get localized messages', () => {
    const service = ErrorMessageService.getInstance();

    const message = service.getLocalizedMessage('network-connection-failed', 'en-US');
    expect(message).toContain('connect to the server');
  });

  it('should add localized messages', () => {
    const service = ErrorMessageService.getInstance();

    service.addLocalizedMessages('test-locale', {
      'network-connection-failed': 'Test message',
    });

    const message = service.getLocalizedMessage('network-connection-failed', 'test-locale');
    expect(message).toBe('Test message');
  });
});

describe('Integration Tests', () => {
  it('should handle complete error message workflow', () => {
    // Create an error
    const error = createMockAppError(
      ErrorDomain.NETWORK,
      ErrorSeverity.HIGH,
      'CONNECTION_TIMEOUT',
      'Request to API timed out',
      { url: 'https://api.example.com/data' }
    );

    // Format the error
    const formatted = formatErrorMessage(error, {
      locale: 'en-US',
      showTechnicalDetails: true,
    });

    // Get recovery suggestions
    const suggestions = getRecoverySuggestions(error, 3);

    // Create enhanced message
    const enhanced = createEnhancedErrorMessage(error, {
      locale: 'en-US',
      maxSuggestions: 3,
    });

    // Verify all components work together
    expect(formatted.title).toBeDefined();
    expect(formatted.message).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(enhanced.formattedMessage).toBeDefined();
    expect(enhanced.template).toBeDefined();
    expect(enhanced.recoverySuggestions.length).toBeGreaterThan(0);
  });

  it('should handle different error domains consistently', () => {
    const domains = [
      ErrorDomain.NETWORK,
      ErrorDomain.AUTHENTICATION,
      ErrorDomain.VALIDATION,
      ErrorDomain.DATABASE,
      ErrorDomain.SYSTEM,
    ];

    domains.forEach(domain => {
      const error = createMockAppError(domain, ErrorSeverity.MEDIUM);
      const formatted = formatErrorMessage(error);
      const suggestions = getRecoverySuggestions(error);
      const enhanced = createEnhancedErrorMessage(error);

      expect(formatted.domain).toBe(domain);
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
      expect(enhanced.formattedMessage.domain).toBe(domain);
    });
  });

  it('should handle localization across all components', () => {
    const locales = ['en-US', 'es-ES', 'fr-FR'];
    const error = createMockAppError();

    locales.forEach(locale => {
      const formatted = formatErrorMessage(error, { locale });
      const enhanced = createEnhancedErrorMessage(error, { locale });

      expect(formatted.message).toBeDefined();
      expect(enhanced.formattedMessage.message).toBeDefined();
    });
  });
});
