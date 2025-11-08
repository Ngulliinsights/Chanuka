import React from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { ErrorType, ErrorSeverity } from '../../utils/unified-error-handler';

interface ErrorToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  onRetry?: () => void;
  showRetry?: boolean;
}

/**
 * Standardized Error Toast System
 * Provides consistent toast notifications for different error types
 */
export class ErrorToast {
  private static getSeverityConfig(severity: ErrorSeverity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return {
          icon: X,
          className: 'bg-red-50 border-red-200 text-red-800',
          iconClass: 'text-red-600',
        };
      case ErrorSeverity.HIGH:
        return {
          icon: X,
          className: 'bg-red-50 border-red-200 text-red-800',
          iconClass: 'text-red-600',
        };
      case ErrorSeverity.MEDIUM:
        return {
          icon: AlertTriangle,
          className: 'bg-orange-50 border-orange-200 text-orange-800',
          iconClass: 'text-orange-600',
        };
      case ErrorSeverity.LOW:
        return {
          icon: Info,
          className: 'bg-blue-50 border-blue-200 text-blue-800',
          iconClass: 'text-blue-600',
        };
      default:
        return {
          icon: Info,
          className: 'bg-gray-50 border-gray-200 text-gray-800',
          iconClass: 'text-gray-600',
        };
    }
  }

  static show(error: {
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    id?: string;
  }, options: ErrorToastOptions = {}) {
    const { duration = 5000, position = 'top-right', onRetry, showRetry = true } = options;
    const config = this.getSeverityConfig(error.severity);
    const Icon = config.icon;

    toast.custom(
      (t) => (
        <div
          className={`${config.className} border rounded-lg p-4 shadow-lg max-w-sm w-full pointer-events-auto`}
        >
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconClass}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {error.message}
              </p>
              {error.id && (
                <p className="text-xs opacity-75 mt-1">
                  ID: {error.id}
                </p>
              )}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>

          {onRetry && showRetry && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  onRetry();
                  toast.dismiss(t.id);
                }}
                className="text-xs font-medium underline hover:no-underline transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      ),
      {
        duration,
        position,
        id: error.id,
      }
    );
  }

  static success(message: string, options: Omit<ErrorToastOptions, 'onRetry' | 'showRetry'> = {}) {
    const { duration = 3000, position = 'top-right' } = options;

    toast.custom(
      (t) => (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 shadow-lg max-w-sm w-full pointer-events-auto">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {message}
              </p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      ),
      {
        duration,
        position,
      }
    );
  }

  static dismiss(id?: string) {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  }
}

/**
 * React hook for error toast management
 */
export function useErrorToast() {
  return {
    showError: (error: Parameters<typeof ErrorToast.show>[0], options?: Parameters<typeof ErrorToast.show>[1]) =>
      ErrorToast.show(error, options),
    showSuccess: (message: string, options?: Parameters<typeof ErrorToast.success>[1]) =>
      ErrorToast.success(message, options),
    dismiss: (id?: string) => ErrorToast.dismiss(id),
  };
}