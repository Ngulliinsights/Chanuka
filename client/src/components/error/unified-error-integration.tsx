/**
 * Unified Error Handler Integration Layer
 * 
 * This module provides integration between the unified error handler
 * and the existing UI components (toasts, modals, etc.)
 */

import React, { useEffect, useCallback } from 'react';
import { errorHandler, AppError, ErrorSeverity, ErrorType } from '../../utils/unified-error-handler';
import { useErrorModal } from './ErrorModal';

// Simple toast implementation to replace react-hot-toast dependency
interface ToastOptions {
  duration?: number;
  position?: string;
}

class SimpleToast {
  private static toasts: Map<string, HTMLElement> = new Map();

  static show(content: React.ReactNode, options: ToastOptions = {}) {
    const { duration = 5000 } = options;
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create toast element
    const toastElement = document.createElement('div');
    toastElement.id = id;
    toastElement.className = `
      fixed top-4 right-4 z-50 max-w-sm w-full bg-white dark:bg-gray-800 
      border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4
      transform transition-all duration-300 ease-in-out
    `;
    
    // Add content
    if (typeof content === 'string') {
      toastElement.innerHTML = content;
    } else {
      // For React components, we'd need a more sophisticated approach
      toastElement.innerHTML = `<div class="text-sm">${String(content)}</div>`;
    }
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.className = 'absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg leading-none';
    closeButton.onclick = () => this.dismiss(id);
    toastElement.appendChild(closeButton);
    
    // Add to DOM
    document.body.appendChild(toastElement);
    this.toasts.set(id, toastElement);
    
    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    
    return id;
  }

  static dismiss(id: string) {
    const element = this.toasts.get(id);
    if (element) {
      element.style.transform = 'translateX(100%)';
      element.style.opacity = '0';
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        this.toasts.delete(id);
      }, 300);
    }
  }

  static dismissAll() {
    this.toasts.forEach((_, id) => this.dismiss(id));
  }
}

/**
 * Enhanced Error Toast System integrated with Unified Error Handler
 */
export class UnifiedErrorToast {
  private static getSeverityConfig(severity: ErrorSeverity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          iconColor: 'text-red-600 dark:text-red-400',
        };
      case ErrorSeverity.HIGH:
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          iconColor: 'text-red-600 dark:text-red-400',
        };
      case ErrorSeverity.MEDIUM:
        return {
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          textColor: 'text-orange-800 dark:text-orange-200',
          iconColor: 'text-orange-600 dark:text-orange-400',
        };
      case ErrorSeverity.LOW:
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-800 dark:text-blue-200',
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-800 dark:text-gray-200',
          iconColor: 'text-gray-600 dark:text-gray-400',
        };
    }
  }

  static show(error: AppError, options: { onRetry?: () => void; showRetry?: boolean } = {}) {
    const { onRetry, showRetry = true } = options;
    const config = this.getSeverityConfig(error.severity);
    
    const toastContent = `
      <div class="${config.bgColor} ${config.borderColor} border rounded-lg p-4 shadow-lg">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <svg class="w-5 h-5 ${config.iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium ${config.textColor}">
              ${error.message}
            </p>
            <p class="text-xs ${config.textColor} opacity-75 mt-1">
              ID: ${error.id}
            </p>
          </div>
        </div>
        ${onRetry && showRetry ? `
          <div class="mt-3 flex justify-end">
            <button 
              onclick="window.retryError_${error.id}()"
              class="text-xs font-medium underline hover:no-underline transition-all ${config.textColor}"
            >
              Try Again
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // Store retry function globally for onclick access
    if (onRetry && showRetry) {
      (window as any)[`retryError_${error.id}`] = () => {
        onRetry();
        SimpleToast.dismiss(error.id);
      };
    }

    return SimpleToast.show(toastContent, {
      duration: error.severity === ErrorSeverity.CRITICAL ? 0 : 5000, // Critical errors don't auto-dismiss
    });
  }

  static success(message: string) {
    const toastContent = `
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-lg">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-green-800 dark:text-green-200">
              ${message}
            </p>
          </div>
        </div>
      </div>
    `;

    return SimpleToast.show(toastContent, { duration: 3000 });
  }

  static dismiss(id?: string) {
    if (id) {
      SimpleToast.dismiss(id);
    } else {
      SimpleToast.dismissAll();
    }
  }
}

/**
 * React Hook for Unified Error Handling Integration
 * 
 * This hook sets up listeners for the unified error handler and
 * automatically displays appropriate UI feedback (toasts, modals, etc.)
 */
export function useUnifiedErrorIntegration(options: {
  showToasts?: boolean;
  showModalsForCritical?: boolean;
  enableFeedback?: boolean;
} = {}) {
  const {
    showToasts = true,
    showModalsForCritical = true,
    enableFeedback = false,
  } = options;

  const { showError: showErrorModal } = useErrorModal();

  const handleError = useCallback((error: AppError) => {
    // Show toast for most errors
    if (showToasts && error.severity !== ErrorSeverity.CRITICAL) {
      UnifiedErrorToast.show(error, {
        showRetry: error.retryable,
        onRetry: error.retryable ? () => {
          // Trigger retry through error handler
          errorHandler.attemptRecovery(error);
        } : undefined,
      });
    }

    // Show modal for critical errors
    if (showModalsForCritical && error.severity === ErrorSeverity.CRITICAL) {
      showErrorModal({
        type: error.type,
        severity: error.severity,
        message: error.message,
        details: error.details,
        id: error.id,
      });
    }
  }, [showToasts, showModalsForCritical, showErrorModal]);

  useEffect(() => {
    // Add error listener to unified error handler
    errorHandler.addErrorListener(handleError);

    // Cleanup listener on unmount
    return () => {
      errorHandler.removeErrorListener(handleError);
    };
  }, [handleError]);

  return {
    showToast: UnifiedErrorToast.show,
    showSuccess: UnifiedErrorToast.success,
    dismissToast: UnifiedErrorToast.dismiss,
    showErrorModal,
  };
}

/**
 * Provider Component for Unified Error Integration
 * 
 * Wrap your app with this component to enable automatic error UI integration
 */
export function UnifiedErrorProvider({ 
  children,
  ...options 
}: { 
  children: React.ReactNode;
} & Parameters<typeof useUnifiedErrorIntegration>[0]) {
  useUnifiedErrorIntegration(options);
  
  return <>{children}</>;
}

/**
 * Hook for manual error handling with unified system
 */
export function useUnifiedErrorHandler() {
  return {
    handleError: errorHandler.handleError.bind(errorHandler),
    getRecentErrors: errorHandler.getRecentErrors.bind(errorHandler),
    getErrorStats: errorHandler.getErrorStats.bind(errorHandler),
    clearErrors: errorHandler.clearErrors.bind(errorHandler),
    addRecoveryStrategy: errorHandler.addRecoveryStrategy.bind(errorHandler),
    attemptRecovery: errorHandler.attemptRecovery.bind(errorHandler),
  };
}