import React from 'react';
import { ErrorFallbackProps } from './ErrorBoundary';
import { SharedErrorDisplay, ErrorDisplayConfig } from './utils/shared-error-display';
import { ErrorSeverity } from '@client/core/error';

/**
 * Consolidated Error Fallback Component
 *
 * This component provides a unified error display interface that works with
 * the enhanced ErrorBoundary. It uses shared display utilities to reduce
 * code duplication and ensure consistent error UI patterns.
 *
 * @param props - Error fallback properties including error details and recovery options
 * @returns React component displaying error information with recovery actions
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  recoveryOptions,
  onRetry,
  onFeedback,
  onReload,
  onContactSupport,
  recoveryAttempted,
  recoverySuccessful,
  userFeedbackSubmitted,
  showTechnicalDetails,
}) => {
  // Determine severity for styling
  const severity = error.metadata?.severity || ErrorSeverity.HIGH;
  const severityMap = {
    [ErrorSeverity.LOW]: 'low' as const,
    [ErrorSeverity.MEDIUM]: 'medium' as const,
    [ErrorSeverity.HIGH]: 'high' as const,
    [ErrorSeverity.CRITICAL]: 'critical' as const,
  };

  const displaySeverity = severityMap[severity] || 'high';

  // Create display config
  const displayConfig: ErrorDisplayConfig = {
    variant: 'page',
    severity: displaySeverity,
    showIcon: true,
    showRetry: recoveryOptions.some(opt => !opt.automatic),
    showReport: true,
    showGoHome: true,
    customMessage: error.message,
  };

  // Create custom actions from recovery options
  const customActions = recoveryOptions
    .filter(opt => !opt.automatic)
    .slice(0, 2) // Limit to 2 manual options
    .map(option => (
      <button
        key={option.id}
        onClick={() => option.action()}
        className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        <div className="text-sm font-medium">{option.label}</div>
        <div className="text-xs text-gray-600 mt-1">{option.description}</div>
      </button>
    ));

  return (
    <SharedErrorDisplay
      error={error}
      config={{
        ...displayConfig,
        customActions: customActions.length > 0 ? (
          <div className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-700">Recovery Options:</div>
            {customActions}
          </div>
        ) : undefined,
      }}
      onRetry={onRetry}
      onReport={onContactSupport}
      onGoHome={onReload}
      context={`Error ID: ${errorId}`}
    />
  );
};

// Export additional specialized fallback components for backward compatibility
// These now use the shared display utilities

/**
 * Network Error Fallback Component
 *
 * @deprecated Use ErrorFallback with appropriate error type instead.
 * This component is maintained for backward compatibility.
 *
 * @param props - Error fallback properties
 * @returns React component for network error display
 */
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  return <ErrorFallback {...props} />;
};

/**
 * API Error Fallback Component
 *
 * @deprecated Use ErrorFallback with appropriate error type instead.
 * This component is maintained for backward compatibility.
 *
 * @param props - Error fallback properties
 * @returns React component for API error display
 */
export const ApiErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  return <ErrorFallback {...props} />;
};

/**
 * Component Error Fallback Component
 *
 * @deprecated Use ErrorFallback with appropriate error type instead.
 * This component is maintained for backward compatibility.
 *
 * @param props - Error fallback properties
 * @returns React component for component error display
 */
export const ComponentErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  return <ErrorFallback {...props} />;
};

/**
 * Chunk Error Fallback Component
 *
 * @deprecated Use ErrorFallback with appropriate error type instead.
 * This component is maintained for backward compatibility.
 *
 * @param props - Error fallback properties
 * @returns React component for chunk loading error display
 */
export const ChunkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  return <ErrorFallback {...props} />;
};

/**
 * Critical Error Fallback Component
 *
 * @deprecated Use ErrorFallback with appropriate error type instead.
 * This component is maintained for backward compatibility.
 *
 * @param props - Error fallback properties
 * @returns React component for critical error display
 */
export const CriticalErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  return <ErrorFallback {...props} />;
};