/**
 * Error Handling Utilities for Shared UI Components
 *
 * This module contains utility functions for error handling that extend
 * the core error handling system. These utilities are separated from
 * React components to support Fast Refresh.
 */

import { createError, coreErrorHandler, handleError as coreHandleError } from '@client/infrastructure/error';
import type { AppError, ErrorDomain, ErrorSeverity } from '@client/infrastructure/error';
import { logger } from '@lib/utils/logger';

// ============================================================================
// UI-Specific Error Types (extending core)
// ============================================================================

export interface UIErrorInfo {
  message: string;
  code?: string;
  component?: string;
  details?: Record<string, unknown>;
}

export interface UIErrorHandler {
  handleError: (error: Error, context?: string) => void;
  logError: (error: Error, context?: string) => void;
  displayError: (error: Error) => string;
  isRetryable: (error: Error) => boolean;
}

export interface UseUIErrorHandlerResult {
  error: Error | null;
  errorMessage: string | null;
  isRetryable: boolean;
  handleError: (error: Error, context?: string) => void;
  clearError: () => void;
  retry: (fn: () => Promise<void>) => Promise<void>;
}

// ============================================================================
// UI Error Classification (extending core types)
// ============================================================================

export const UIErrorTypes = {
  COMPONENT_ERROR: 'COMPONENT_ERROR',
  RENDER_ERROR: 'RENDER_ERROR',
  INTERACTION_ERROR: 'INTERACTION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type UIErrorType = (typeof UIErrorTypes)[keyof typeof UIErrorTypes];

// ============================================================================
// Error Classification Functions (extending core)
// ============================================================================

export const classifyUIError = (
  error: Error
): {
  domain: ErrorDomain;
  severity: ErrorSeverity;
  type: UIErrorType;
} => {
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return {
      domain: 'NETWORK' as ErrorDomain,
      severity: 'MEDIUM' as ErrorSeverity,
      type: UIErrorTypes.NETWORK_ERROR,
    };
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      domain: 'NETWORK' as ErrorDomain,
      severity: 'MEDIUM' as ErrorSeverity,
      type: UIErrorTypes.TIMEOUT_ERROR,
    };
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return {
      domain: 'VALIDATION' as ErrorDomain,
      severity: 'LOW' as ErrorSeverity,
      type: UIErrorTypes.VALIDATION_ERROR,
    };
  }

  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return {
      domain: 'AUTHORIZATION' as ErrorDomain,
      severity: 'HIGH' as ErrorSeverity,
      type: UIErrorTypes.PERMISSION_ERROR,
    };
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return {
      domain: 'RESOURCE' as ErrorDomain,
      severity: 'LOW' as ErrorSeverity,
      type: UIErrorTypes.NOT_FOUND_ERROR,
    };
  }

  // Configuration errors
  if (message.includes('configuration') || message.includes('config')) {
    return {
      domain: 'SYSTEM' as ErrorDomain,
      severity: 'HIGH' as ErrorSeverity,
      type: UIErrorTypes.CONFIGURATION_ERROR,
    };
  }

  // React/Component errors
  if (
    message.includes('render') ||
    message.includes('component') ||
    error.name === 'ChunkLoadError'
  ) {
    return {
      domain: 'SYSTEM' as ErrorDomain,
      severity: 'MEDIUM' as ErrorSeverity,
      type: UIErrorTypes.RENDER_ERROR,
    };
  }

  // Default classification
  return {
    domain: 'UNKNOWN' as ErrorDomain,
    severity: 'MEDIUM' as ErrorSeverity,
    type: UIErrorTypes.UNKNOWN_ERROR,
  };
};

export const isRetryableUIError = (error: Error): boolean => {
  const classification = classifyUIError(error);
  const retryableTypes: UIErrorType[] = [
    UIErrorTypes.NETWORK_ERROR,
    UIErrorTypes.TIMEOUT_ERROR,
    UIErrorTypes.UNKNOWN_ERROR,
  ];
  return retryableTypes.includes(classification.type);
};

// ============================================================================
// UI Error Handler Factory (extending core)
// ============================================================================

export const createUIErrorHandler = (componentName?: string): UIErrorHandler => {
  const handleError = (error: Error, context?: string): void => {
    const classification = classifyUIError(error);

    // Create AppError using core system
    const appError = createError(classification.domain, classification.severity, error.message, {
      details: {
        originalError: error.name,
        stack: error.stack,
        uiErrorType: classification.type,
      },
      context: {
        component: componentName,
        operation: context,
        timestamp: Date.now(),
      },
      recoverable: isRetryableUIError(error),
      retryable: isRetryableUIError(error),
    });

    // Handle through core system
    coreErrorHandler.handleError(appError);

    // Additional UI-specific logging
    logger.error(`[${componentName || 'SharedUI'}] Error:`, {
      errorType: classification.type,
      domain: classification.domain,
      severity: classification.severity,
      context,
      error: error.message,
    });
  };

  const logError = (error: Error, context?: string): void => {
    logger.error(`[${componentName || 'SharedUI'}] ${context || 'Error'}:`, {
      message: error.message,
      stack: error.stack,
    });
  };

  const displayError = (error: Error): string => {
    const classification = classifyUIError(error);

    switch (classification.type) {
      case UIErrorTypes.NETWORK_ERROR:
        return 'Network connection issue. Please check your internet connection and try again.';

      case UIErrorTypes.TIMEOUT_ERROR:
        return 'The operation is taking longer than expected. Please try again.';

      case UIErrorTypes.VALIDATION_ERROR:
        return 'Invalid data provided. Please check your input and try again.';

      case UIErrorTypes.PERMISSION_ERROR:
        return 'You do not have permission to perform this action.';

      case UIErrorTypes.NOT_FOUND_ERROR:
        return 'The requested resource was not found.';

      case UIErrorTypes.CONFIGURATION_ERROR:
        return 'Configuration error. Please contact support.';

      case UIErrorTypes.RENDER_ERROR:
        return 'A display error occurred. Please refresh the page.';

      case UIErrorTypes.COMPONENT_ERROR:
        return 'A component error occurred. Please try again.';

      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return {
    handleError,
    logError,
    displayError,
    isRetryable: isRetryableUIError,
  };
};

// ============================================================================
// Integration with Dashboard Errors (extending core)
// ============================================================================

export const createDashboardError = (
  type: string,
  message: string,
  details?: Record<string, unknown>
): AppError => {
  return createError('BUSINESS_LOGIC' as ErrorDomain, 'MEDIUM' as ErrorSeverity, message, {
    details: {
      dashboardErrorType: type,
      ...details,
    },
    context: {
      component: 'Dashboard',
      domain: 'dashboard',
    },
    recoverable: true,
    retryable: false,
  });
};

// ============================================================================
// Integration with Store Error Handling (extending core)
// ============================================================================

export const reportStoreError = (
  source: string,
  category: string,
  error: Error,
  context?: Record<string, unknown>
): AppError => {
  const classification = classifyUIError(error);

  return coreHandleError({
    type: classification.domain,
    severity: classification.severity,
    message: error.message,
    code: `STORE_${classification.type}`,
    context: {
      source,
      category,
      store: true,
      ...context,
    },
    details: {
      originalError: error.name,
      stack: error.stack,
    },
    recoverable: isRetryableUIError(error),
    retryable: isRetryableUIError(error),
  });
};

// ============================================================================
// Monitoring Integration (extending core)
// ============================================================================

export const integrateWithMonitoring = (): void => {
  // Add UI-specific error reporter to core system
  const uiErrorReporter = {
    async report(error: AppError): Promise<void> {
      // UI-specific error reporting logic
      if (error.context?.component) {
        logger.warn('UI Component Error', {
          component: error.context.component,
          errorId: error.id,
          type: error.type,
          severity: error.severity,
          message: error.message,
        });
      }
    },
  };

  // Register with core error system
  coreErrorHandler.addReporter(uiErrorReporter);
};

// ============================================================================
// Re-exports from Core (for convenience)
// ============================================================================

export { coreErrorHandler, createError, coreHandleError as handleError };

// ============================================================================
// Default Export
// ============================================================================

export default {
  createHandler: createUIErrorHandler,
  classify: classifyUIError,
  isRetryable: isRetryableUIError,
  integrate: integrateWithMonitoring,
  createDashboardError,
  reportStoreError,
};
