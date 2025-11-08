import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { ErrorType, ErrorSeverity, AppError, errorHandler } from '../../utils/unified-error-handler';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error?: AppError | {
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    details?: any;
    id?: string;
  };
  title?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  enableFeedback?: boolean; // Enhanced feedback capability
}

/**
 * Enhanced Error Modal Component - Integrated with Unified Error Handler
 * Displays detailed error information with enhanced features from the unified error system
 */
export function ErrorModal({
  isOpen,
  onClose,
  error,
  title = 'Error',
  onRetry,
  showRetry = true,
  enableFeedback = false,
}: ErrorModalProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);

  const handleFeedback = (rating: number) => {
    if (error && 'id' in error && error.id) {
      // Log feedback through unified error handler
      console.log('User feedback for error:', { errorId: error.id, rating });
      setFeedbackSubmitted(true);
    }
  };
  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20';
      case ErrorSeverity.HIGH:
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case ErrorSeverity.MEDIUM:
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case ErrorSeverity.LOW:
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    return <AlertTriangle className="w-6 h-6" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {error?.severity && (
              <div className={`p-2 rounded-full ${getSeverityColor(error.severity)}`}>
                {getSeverityIcon(error.severity)}
              </div>
            )}
            <div>
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              {error?.id && (
                <DialogDescription className="text-sm text-gray-500">
                  Error ID: {error.id}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error?.message && (
            <p className="text-gray-700 dark:text-gray-300">
              {error.message}
            </p>
          )}

          {error?.details && process.env.NODE_ENV === 'development' && (
            <details className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                Technical Details (Development)
              </summary>
              <pre className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-32">
                {typeof error.details === 'string'
                  ? error.details
                  : JSON.stringify(error.details, null, 2)
                }
              </pre>
            </details>
          )}

          {/* Enhanced feedback system */}
          {enableFeedback && !feedbackSubmitted && error && 'id' in error && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Rate this error experience:
              </h4>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleFeedback(rating)}
                    className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          )}

          {feedbackSubmitted && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <p className="text-sm text-green-600 dark:text-green-400 text-center">
                ✓ Thank you for your feedback!
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            {onRetry && showRetry && (
              <Button
                type="button"
                onClick={onRetry}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing error modal state
 */
export function useErrorModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [error, setError] = React.useState<ErrorModalProps['error']>();

  const showError = React.useCallback((errorData: ErrorModalProps['error']) => {
    setError(errorData);
    setIsOpen(true);
  }, []);

  const hideError = React.useCallback(() => {
    setIsOpen(false);
    setError(undefined);
  }, []);

  return {
    isOpen,
    error,
    showError,
    hideError,
  };
}