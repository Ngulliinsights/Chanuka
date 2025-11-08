import React from 'react';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AppError, ErrorSeverity } from '../../utils/unified-error-handler';

interface ErrorFallbackProps {
  error?: Error;
  errorId?: string;
  appError?: AppError; // Enhanced with unified error handler support
  onRetry?: () => void;
  className?: string;
  showHomeButton?: boolean;
  title?: string;
  message?: string;
  enableFeedback?: boolean; // New feedback capability
}

/**
 * Enhanced Error Fallback UI Component - Integrated with Unified Error Handler
 * Displays error information with enhanced features from the unified error system
 */
export function ErrorFallback({
  error,
  errorId,
  appError,
  onRetry,
  className = '',
  showHomeButton = true,
  title,
  message,
  enableFeedback = false,
}: ErrorFallbackProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);
  
  const handleHomeClick = () => {
    window.location.href = '/';
  };

  const handleFeedback = (rating: number) => {
    // In a real implementation, this would send feedback to analytics
    console.log('User feedback:', { errorId, rating, appError });
    setFeedbackSubmitted(true);
  };

  // Use enhanced error information if available
  const displayTitle = title || (appError?.severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Something went wrong');
  const displayMessage = message || appError?.message || 'An unexpected error occurred. Please try again.';
  
  const getSeverityColor = (severity?: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-700';
      case ErrorSeverity.HIGH:
        return 'text-red-600';
      case ErrorSeverity.MEDIUM:
        return 'text-orange-600';
      case ErrorSeverity.LOW:
        return 'text-yellow-600';
      default:
        return 'text-red-500';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] p-6 text-center ${className}`}>
      <div className="mb-6">
        <AlertTriangle className={`w-16 h-16 mx-auto mb-4 ${getSeverityColor(appError?.severity)}`} />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {displayTitle}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
          {displayMessage}
        </p>
        
        {/* Enhanced error information */}
        {appError && (
          <div className="text-sm text-gray-500 dark:text-gray-500 mb-4 space-y-1">
            <p>Error ID: {appError.id}</p>
            <p>Type: {appError.type} | Severity: {appError.severity}</p>
            {appError.recoverable && (
              <p className="text-blue-600 dark:text-blue-400">
                ✓ This error may be recoverable
              </p>
            )}
            {appError.recovered && (
              <p className="text-green-600 dark:text-green-400">
                ✓ Automatic recovery attempted
              </p>
            )}
          </div>
        )}
        
        {errorId && !appError && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Error ID: {errorId}
          </p>
        )}
        
        {process.env.NODE_ENV === 'development' && (error || appError) && (
          <details className="mt-4 text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg max-w-2xl">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
              Error Details (Development)
            </summary>
            <div className="mt-2 text-sm text-red-600 dark:text-red-400 space-y-2">
              {error?.stack && (
                <pre className="whitespace-pre-wrap">{error.stack}</pre>
              )}
              {appError?.details && (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(appError.details, null, 2)}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="flex gap-3 flex-wrap justify-center mb-6">
        {onRetry && (
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

        {showHomeButton && (
          <Button
            type="button"
            onClick={handleHomeClick}
            variant="outline"
            className="flex items-center gap-2"
          >
            Go Home
          </Button>
        )}
      </div>

      {/* Enhanced feedback system */}
      {enableFeedback && !feedbackSubmitted && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 max-w-md">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            How was this error experience?
          </h3>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleFeedback(rating)}
                className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                aria-label={`Rate ${rating} star${rating !== 1 ? 's' : ''}`}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedbackSubmitted && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ Thank you for your feedback!
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Inline Error Display Component
 * For showing errors within forms or specific sections
 */
export function InlineError({
  error,
  className = '',
  showIcon = true,
}: {
  error?: string | Error;
  className?: string;
  showIcon?: boolean;
}) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className={`flex items-center gap-2 text-red-600 dark:text-red-400 text-sm ${className}`}>
      {showIcon && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

/**
 * Toast Error Component
 * For displaying errors in toast notifications
 */
export function ToastError({
  error,
  title = 'Error',
}: {
  error: string | Error;
  title?: string;
}) {
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{message}</p>
      </div>
    </div>
  );
}