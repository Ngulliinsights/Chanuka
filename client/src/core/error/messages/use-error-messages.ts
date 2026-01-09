/**
 * React Hook for User-Friendly Error Messages
 *
 * React hook that integrates the error message system with React components
 * for easy access to formatted error messages and recovery suggestions
 */

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppError } from '../types';
import {
  formatErrorMessage,
  getRecoverySuggestions,
  createEnhancedErrorMessage,
  getLocalizedMessage,
  formatErrorForDisplay,
  formatErrorForHTML
} from './index';

// ============================================================================
// Main Error Messages Hook
// ============================================================================

export function useErrorMessages() {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language || 'en-US';

  // Format error message with current locale
  const formatError = useCallback((error: AppError | Error, options = {}) => {
    return formatErrorMessage(error, {
      locale: currentLocale,
      ...options
    });
  }, [currentLocale]);

  // Get recovery suggestions
  const getSuggestions = useCallback((error: AppError, maxSuggestions = 3) => {
    return getRecoverySuggestions(error, {}, maxSuggestions);
  }, []);

  // Create enhanced error message
  const createEnhancedMessage = useCallback((error: AppError | Error, options = {}) => {
    return createEnhancedErrorMessage(error, {
      locale: currentLocale,
      ...options
    });
  }, [currentLocale]);

  // Get localized message by template ID
  const getMessage = useCallback((templateId: string) => {
    return getLocalizedMessage(templateId, currentLocale);
  }, [currentLocale]);

  // Format error for display (text)
  const formatForDisplay = useCallback((error: AppError | Error, options = {}) => {
    return formatErrorForDisplay(error, {
      locale: currentLocale,
      ...options
    });
  }, [currentLocale]);

  // Format error for HTML
  const formatForHTML = useCallback((error: AppError | Error, options = {}) => {
    return formatErrorForHTML(error, {
      locale: currentLocale,
      ...options
    });
  }, [currentLocale]);

  return useMemo(() => ({
    formatError,
    getSuggestions,
    createEnhancedMessage,
    getMessage,
    formatForDisplay,
    formatForHTML,
    currentLocale,
  }), [formatError, getSuggestions, createEnhancedMessage, getMessage, formatForDisplay, formatForHTML, currentLocale]);
}

// ============================================================================
// Error Message Component Hook
// ============================================================================

export function useErrorMessageComponent(error: AppError | Error | null) {
  const { formatError, getSuggestions, formatForDisplay, formatForHTML } = useErrorMessages();

  const formattedMessage = useMemo(() => {
    if (!error) return null;
    return formatError(error);
  }, [error, formatError]);

  const recoverySuggestions = useMemo(() => {
    if (!error || !(error instanceof AppError)) return [];
    return getSuggestions(error);
  }, [error, getSuggestions]);

  const displayText = useMemo(() => {
    if (!error) return '';
    return formatForDisplay(error, {
      showTitle: true,
      showSuggestions: true,
      showHelpLink: true,
    });
  }, [error, formatForDisplay]);

  const htmlContent = useMemo(() => {
    if (!error) return '';
    return formatForHTML(error, {
      showTitle: true,
      showSuggestions: true,
      showHelpLink: true,
    });
  }, [error, formatForHTML]);

  return {
    formattedMessage,
    recoverySuggestions,
    displayText,
    htmlContent,
    hasError: !!error,
  };
}

// ============================================================================
// Error Recovery Hook
// ============================================================================

export function useErrorRecovery(error: AppError | null) {
  const { getSuggestions } = useErrorMessages();

  const suggestions = useMemo(() => {
    if (!error) return [];
    return getSuggestions(error, 3);
  }, [error, getSuggestions]);

  const primarySuggestion = useMemo(() => {
    return suggestions.length > 0 ? suggestions[0] : null;
  }, [suggestions]);

  const executePrimarySuggestion = useCallback(() => {
    if (primarySuggestion && primarySuggestion.action) {
      try {
        const result = primarySuggestion.action();
        if (result instanceof Promise) {
          return result.catch(() => {
            // Handle action failure silently
          });
        }
      } catch {
        // Handle action failure silently
      }
    }
    return Promise.resolve();
  }, [primarySuggestion]);

  return {
    suggestions,
    primarySuggestion,
    executePrimarySuggestion,
    hasRecoveryOptions: suggestions.length > 0,
  };
}

// ============================================================================
// Error Message Context Provider
// ============================================================================

import React, { createContext, useContext } from 'react';

interface ErrorMessageContextValue {
  formatError: ReturnType<typeof useErrorMessages>['formatError'];
  getSuggestions: ReturnType<typeof useErrorMessages>['getSuggestions'];
  getMessage: ReturnType<typeof useErrorMessages>['getMessage'];
  currentLocale: string;
}

const ErrorMessageContext = createContext<ErrorMessageContextValue | null>(null);

export function ErrorMessageProvider({ children }: { children: React.ReactNode }) {
  const { formatError, getSuggestions, getMessage, currentLocale } = useErrorMessages();

  const contextValue = useMemo(() => ({
    formatError,
    getSuggestions,
    getMessage,
    currentLocale,
  }), [formatError, getSuggestions, getMessage, currentLocale]);

  return (
    <ErrorMessageContext.Provider value={contextValue}>
      {children}
    </ErrorMessageContext.Provider>
  );
}

export function useErrorMessageContext() {
  const context = useContext(ErrorMessageContext);
  if (!context) {
    throw new Error('useErrorMessageContext must be used within an ErrorMessageProvider');
  }
  return context;
}
