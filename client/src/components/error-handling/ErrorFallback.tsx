import { useMemo } from "react";
import { AlertTriangle, RefreshCw, Building } from 'lucide-react';
import { ResponsiveButton as Button } from "../../shared/design-system/components";
import { Logo } from "../ui/logo";
import { ErrorFallbackProps } from "./ErrorBoundary";
import { logger as baseLogger } from "../../utils/browser-logger";

// Import shared error types and classes
import { 
  BaseError, 
  ErrorSeverity, 
  ErrorDomain,
  NetworkError,
  ExternalServiceError 
} from "../../shared/errors";

// Import extracted utilities
import { createErrorReporter } from "./utils/error-reporter";
import { normalizeError } from "./utils/error-normalizer";
import { getContextualMessage } from "./utils/contextual-messages";
import { getErrorIcon } from "./utils/error-icons";

// Simple logger wrapper to handle type issues
const logger = {
  error: (message: string, context?: any, metadata?: any) => {
    if (metadata) {
      baseLogger.error(message, context, metadata);
    } else {
      baseLogger.error(message, { component: 'ErrorFallback' }, context);
    }
  },
  warn: (message: string, context?: any, metadata?: any) => {
    if (metadata) {
      baseLogger.warn(message, context, metadata);
    } else {
      baseLogger.warn(message, { component: 'ErrorFallback' }, context);
    }
  },
  info: (message: string, context?: any, metadata?: any) => {
    if (metadata) {
      baseLogger.info(message, context, metadata);
    } else {
      baseLogger.info(message, { component: 'ErrorFallback' }, context);
    }
  },
};

// All utility functions have been extracted to separate files for better maintainability

/**
 * Main Error Fallback Component
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  context,
  retryCount = 0,
  errorType,
  errorSeverity,
  canRecover,
  onReportError,
}) => {
  const maxRetries = 3;
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorReporter = useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: isDevelopment,
    }),
    [isDevelopment]
  );

  const normalizedError = useMemo(
    () => normalizeError(error, errorType, errorSeverity, context),
    [error, errorType, errorSeverity, context]
  );

  const errorReport = useMemo(
    () => errorReporter.generateReport(normalizedError, context),
    [errorReporter, normalizedError, context]
  );

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleReportError = async () => {
    try {
      if (onReportError) {
        await onReportError();
        return;
      }

      const errorSev = (normalizedError.metadata?.severity as ErrorSeverity | undefined);
      await errorReporter.submitFeedback({
        errorId: errorReport.id,
        comment: `Error reported from ${context} context`,
        rating: errorSev === ErrorSeverity.CRITICAL ? 1 : 2,
        userContext: { 
          retryCount, 
          canRecover, 
          errorType,
          url: window.location.href,
          user_agent: navigator.userAgent
        }
      });

      const subject = encodeURIComponent(
        `Error Report: ${errorReport.code} [${errorType}/${errorSev}]`
      );
      
      const body = encodeURIComponent(`
Error Report ID: ${errorReport.id}
Timestamp: ${errorReport.timestamp}

User-Facing Message:
${errorReport.userMessage}

Technical Details:
- Error Code: ${errorReport.code}
- Domain: ${errorReport.domain}
- Severity: ${errorReport.severity}
- Context: ${context}
- Retry Count: ${retryCount}/${maxRetries}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}

${errorReport.technicalDetails ? `\nStack Trace:\n${errorReport.technicalDetails}` : ''}

Recovery Options Available:
${errorReport.recoveryOptions.map(opt => `- ${opt.label}: ${opt.description || opt.action}`).join('\n')}
      `);

      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
      
    } catch (reportError) {
      logger.error('Failed to submit error report', {
        component: 'ErrorFallback'
      }, {
        error: reportError,
        originalError: normalizedError
      });
      
      const subject = encodeURIComponent(`Error Report: ${errorType}`);
      const body = encodeURIComponent(
        `Error: ${normalizedError.message}\nContext: ${context}\nURL: ${window.location.href}`
      );
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
    }
  };

  const errorDomain = (normalizedError.metadata?.domain as ErrorDomain | undefined);
  const errorSev = (normalizedError.metadata?.severity as ErrorSeverity | undefined);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg">
        <div className="text-center p-6">
          <div className="flex justify-center mb-4">
            <Logo size="md" showText={true} />
          </div>
          <div className="flex justify-center mb-4">
            {getErrorIcon(normalizedError)}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600">
            {getContextualMessage(normalizedError, errorType, context)}
          </p>
        </div>

        <div className="space-y-4 p-6">
          {isDevelopment && (
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Development Error Details:
              </p>
              <p className="text-xs text-gray-600 font-mono break-all mb-2">
                {normalizedError.message}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Error ID: {errorReport.id}</p>
                <p>Code: {errorReport.code}</p>
                <p>Domain: {errorReport.domain}</p>
                <p>Severity: {errorReport.severity}</p>
                <p>Type: {errorType || 'unknown'}</p>
                <p>Context: {context || 'unknown'}</p>
                {retryCount > 0 && (
                  <p>Retry: {retryCount}/{maxRetries}</p>
                )}
              </div>
            </div>
          )}

          {errorType === 'chunk' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Try clearing your browser cache or hard refreshing 
                the page (Ctrl+F5 or Cmd+Shift+R). This usually happens after app updates 
                when your browser has cached an older version.
              </p>
            </div>
          )}

          {errorDomain === ErrorDomain.NETWORK && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <p className="text-sm text-orange-800">
                🌐 <strong>Network Issue:</strong> Check your internet connection and 
                try again. If the problem persists, our servers might be experiencing issues.
              </p>
            </div>
          )}

          {errorSev === ErrorSeverity.CRITICAL && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                ⚠️ <strong>Critical Error:</strong> This error requires immediate attention 
                and may indicate a serious system problem. Please contact support with 
                Error ID <code className="font-mono text-xs">{errorReport.id}</code>.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {canRecover && (
              <Button onClick={resetError} className="w-full" variant="primary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </Button>
            )}

            <Button
              onClick={handleReload}
              className="w-full"
              variant={canRecover ? "outline" : "primary"}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>

            {context !== 'page' && (
              <Button
                onClick={handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Building className="h-4 w-4 mr-2" />
                Go to Homepage
              </Button>
            )}

            <Button
              onClick={handleReportError}
              className="w-full"
              variant="ghost"
              size="small"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report this issue
            </Button>
          </div>

          {!canRecover && errorSev !== ErrorSeverity.CRITICAL && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                Maximum retry attempts reached. Please reload the page or contact 
                support if the problem persists. Reference Error ID: <code className="font-mono text-xs">{errorReport.id}</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Network Error Fallback Component
 */
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const isOnline = navigator.onLine;

  const errorReporter = useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: process.env.NODE_ENV === 'development',
    }),
    []
  );

  const normalizedError = useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    const errorMessage = (props.error as any)?.message || 'Network error occurred';
    return new NetworkError(errorMessage);
  }, [props.error, props.context, isOnline]);

  const errorReport = useMemo(() => {
    return errorReporter.generateReport(normalizedError);
  }, [normalizedError, errorReporter]);

  const handleContactSupport = async () => {
    try {
      if (props.onReportError) {
        await props.onReportError();
      } else {
        await errorReporter.submitFeedback({
          errorId: errorReport.id,
          comment: `CRITICAL ERROR from ${props.context} - requires immediate attention`,
          rating: 1,
          userContext: { 
            errorType: props.errorType,
            severity: 'CRITICAL'
          }
        });

        const subject = encodeURIComponent(
          `CRITICAL ERROR: ${normalizedError.code} [${props.errorType}]`
        );
        const body = encodeURIComponent(`
CRITICAL ERROR REPORT

Error ID: ${errorReport.id}
Timestamp: ${errorReport.timestamp}
Error Code: ${normalizedError.code}
Domain: ${errorReport.domain}
Severity: CRITICAL
Context: ${props.context}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

${errorReport.technicalDetails || normalizedError.message}

Stack Trace:
${props.error.stack || 'No stack trace available'}
        `);
        window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
      }
    } catch (reportError) {
      logger.error('Failed to report critical error', {
        component: 'CriticalErrorFallback',
        error: reportError,
        originalError: props.error,
      });
    }
  };

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="bg-white border border-red-200 rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">
            Critical Error
          </h2>
          <p className="text-red-700 mb-4">
            {getContextualMessage(normalizedError, props.errorType, props.context)}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800 font-medium">
              Error ID: {errorReport.id}
            </p>
            <p className="text-sm text-red-800 font-medium">
              Code: {normalizedError.code}
            </p>
            <p className="text-xs text-red-700 mt-1">{normalizedError.message}</p>
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Application
            </Button>
            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="w-full border-red-300 text-red-700 hover:bg-red-50"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * API Error Fallback Component
 */
export const ApiErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const isNetworkError = props.errorType === 'network' || props.errorType === 'timeout';

  const errorReporter = useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: process.env.NODE_ENV === 'development',
    }),
    []
  );

  const normalizedError = useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    const errorMessage = (props.error as any)?.message || 'API error occurred';
    return isNetworkError
      ? new NetworkError(errorMessage)
      : new ExternalServiceError(errorMessage);
  }, [props.error, isNetworkError, props.context]);

  const errorReport = useMemo(() => {
    return errorReporter.generateReport(normalizedError);
  }, [normalizedError, errorReporter]);

  const handleApiReportError = async () => {
    try {
      if (props.onReportError) {
        await props.onReportError();
      } else {
        await errorReporter.submitFeedback({
          errorId: errorReport.id,
          comment: `API Error from ${props.context} context`,
          rating: 2,
          userContext: { isNetworkError }
        });
      }
    } catch (reportError) {
      logger.error('Failed to report API error', {
        component: 'ApiErrorFallback',
        error: reportError,
        originalError: props.error,
      });
    }
  };

  const errorSev = (normalizedError.metadata?.severity as ErrorSeverity | undefined);
  const severityColor = errorSev === ErrorSeverity.HIGH ? 'red' : 'orange';
  const bgColor = severityColor === 'red' ? 'bg-red-50' : 'bg-orange-50';
  const borderColor = severityColor === 'red' ? 'border-red-200' : 'border-orange-200';
  const iconColor = severityColor === 'red' ? 'text-red-500' : 'text-orange-500';
  const titleColor = severityColor === 'red' ? 'text-red-800' : 'text-orange-800';
  const descColor = severityColor === 'red' ? 'text-red-700' : 'text-orange-700';
  const errorColor = severityColor === 'red' ? 'text-red-600' : 'text-orange-600';
  const buttonBorder = severityColor === 'red' ? 'border-red-300' : 'border-orange-300';
  const buttonHover = severityColor === 'red' ? 'hover:bg-red-100' : 'hover:bg-orange-100';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-md p-4 m-4`}>
      <div className="flex items-start">
        <AlertTriangle className={`h-5 w-5 ${iconColor} mt-0.5 mr-3 flex-shrink-0`} />
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${titleColor}`}>
            {isNetworkError ? 'Connection Problem' : 'API Error'}
          </h3>
          <p className={`text-sm ${descColor} mt-1`}>
            {getContextualMessage(normalizedError, props.errorType, props.context)}
          </p>
          {errorSev === ErrorSeverity.HIGH && (
            <p className={`text-xs ${errorColor} mt-1`}>
              Error: {normalizedError.message}
            </p>
          )}
          <div className="mt-3 flex space-x-2">
            {props.canRecover && (
              <Button
                onClick={props.resetError}
                size="small"
                variant="outline"
                className={`${titleColor} ${buttonBorder} ${buttonHover}`}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            <Button
              onClick={handleApiReportError}
              size="small"
              variant="ghost"
              className={`${descColor} ${buttonHover}`}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component Error Fallback
 */
export const ComponentErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const errorReporter = useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: process.env.NODE_ENV === 'development',
    }),
    []
  );

  const normalizedError = useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    const errorMessage = (props.error as any)?.message || 'Component error occurred';
    return props.errorType === 'chunk'
      ? new ExternalServiceError(errorMessage)
      : new BaseError(errorMessage, 'COMPONENT_ERROR');
  }, [props.error, props.errorType, props.errorSeverity, props.context]);

  const errorReport = useMemo(() => {
    return errorReporter.generateReport(normalizedError);
  }, [normalizedError, errorReporter]);

  const handleComponentReportError = async () => {
    try {
      if (props.onReportError) {
        await props.onReportError();
      } else {
        await errorReporter.submitFeedback({
          errorId: errorReport.id,
          comment: `Component error from ${props.context} context`,
          rating: 2,
          userContext: { errorType: props.errorType }
        });
      }
    } catch (reportError) {
      logger.error('Failed to report component error', {
        component: 'ComponentErrorFallback',
        error: reportError,
        originalError: props.error,
      });
    }
  };

  const getSeverityStyles = () => {
    const severity = (normalizedError.metadata?.severity as ErrorSeverity | undefined) || ErrorSeverity.MEDIUM;
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-500',
          title: 'text-red-800',
          desc: 'text-red-700',
          button: 'text-red-800 hover:bg-red-100'
        };
      case ErrorSeverity.MEDIUM:
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-500',
          title: 'text-orange-800',
          desc: 'text-orange-700',
          button: 'text-orange-800 hover:bg-orange-100'
        };
      case ErrorSeverity.LOW:
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-500',
          title: 'text-yellow-800',
          desc: 'text-yellow-700',
          button: 'text-yellow-800 hover:bg-yellow-100'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-500',
          title: 'text-gray-800',
          desc: 'text-gray-700',
          button: 'text-gray-800 hover:bg-gray-100'
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className={`${styles.container} border rounded-md p-4 m-2`}>
      <div className="flex items-start">
        <AlertTriangle className={`h-4 w-4 ${styles.icon} mr-2 mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.title}`}>
            Component Error
          </p>
          <p className={`text-xs ${styles.desc} mt-1`}>
            {getContextualMessage(normalizedError, props.errorType, props.context)}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className={`text-xs ${styles.desc} mt-1 font-mono break-all`}>
              {normalizedError.message}
            </p>
          )}
        </div>
        <div className="flex space-x-1 ml-2">
          {props.canRecover && (
            <Button
              onClick={props.resetError}
              size="small"
              variant="ghost"
              className={styles.button}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          <Button
            onClick={handleComponentReportError}
            size="small"
            variant="ghost"
            className={styles.button}
          >
            <AlertTriangle className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Chunk Error Fallback Component
 */
export const ChunkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const errorReporter = useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: process.env.NODE_ENV === 'development',
    }),
    []
  );

  const normalizedError = useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    const errorMessage = (props.error as any)?.message || 'Chunk loading error occurred';
    return new ExternalServiceError(errorMessage);
  }, [props.error, props.context]);

  const errorReport = useMemo(() => {
    return errorReporter.generateReport(normalizedError);
  }, [normalizedError, errorReporter]);

  const handleHardRefresh = () => {
    window.location.reload();
  };

  const handleChunkReportError = async () => {
    try {
      if (props.onReportError) {
        await props.onReportError();
      } else {
        await errorReporter.submitFeedback({
          errorId: errorReport.id,
          comment: `Chunk loading error from ${props.context} context`,
          rating: 3,
          userContext: { errorType: 'chunk' }
        });
      }
    } catch (reportError) {
      logger.error('Failed to report chunk error', {
        component: 'ChunkErrorFallback',
        error: reportError,
        originalError: props.error,
      });
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 m-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800">Loading Error</h3>
          <p className="text-sm text-blue-700 mt-1">
            {getContextualMessage(normalizedError, props.errorType, props.context)}
          </p>
          <div className="mt-3 flex space-x-2">
            <Button
              onClick={handleHardRefresh}
              size="small"
              variant="outline"
              className="text-blue-800 border-blue-300 hover:bg-blue-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Page
            </Button>
            {props.canRecover && (
              <Button
                onClick={props.resetError}
                size="small"
                variant="ghost"
                className="text-blue-700 hover:bg-blue-100"
              >
                Try Again
              </Button>
            )}
            <Button
              onClick={handleChunkReportError}
              size="small"
              variant="ghost"
              className="text-blue-700 hover:bg-blue-100"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Critical Error Fallback Component
 */
export const CriticalErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const errorReporter = useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: true,
    }),
    []
  );

  const normalizedError = useMemo(() => {
    if (props.error instanceof BaseError) {
      const errorSev = props.error.metadata?.severity as ErrorSeverity | undefined;
      if (errorSev === ErrorSeverity.CRITICAL) {
        return props.error;
      }
    }
    return new BaseError(props.error.message, 'CRITICAL_ERROR');
  }, [props.error, props.context]);

  const errorReport = useMemo(() => {
    return errorReporter.generateReport(normalizedError);
  }, [normalizedError, errorReporter]);

  const handleContactSupport = async () => {
    try {
      if (props.onReportError) {
        await props.onReportError();
      } else {
        await errorReporter.submitFeedback({
          errorId: errorReport.id,
          comment: `CRITICAL ERROR from ${props.context} - requires immediate attention`,
          rating: 1,
          userContext: { 
            errorType: props.errorType,
            severity: 'CRITICAL'
          }
        });

        const subject = encodeURIComponent(
          `CRITICAL ERROR: ${normalizedError.code} [${props.errorType}]`
        );
        const body = encodeURIComponent(`
CRITICAL ERROR REPORT

Error ID: ${errorReport.id}
Timestamp: ${errorReport.timestamp}
Error Code: ${normalizedError.code}
Domain: ${errorReport.domain}
Severity: CRITICAL
Context: ${props.context}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

${errorReport.technicalDetails || normalizedError.message}

Stack Trace:
${props.error.stack || 'No stack trace available'}
        `);
        window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
      }
    } catch (reportError) {
      logger.error('Failed to report critical error', {
        component: 'CriticalErrorFallback',
        error: reportError,
        originalError: props.error,
      });
    }
  };

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="bg-white border border-red-200 rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">
            Critical Error
          </h2>
          <p className="text-red-700 mb-4">
            {getContextualMessage(normalizedError, props.errorType, props.context)}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800 font-medium">
              Error ID: <code className="font-mono text-xs">{errorReport.id}</code>
            </p>
            <p className="text-sm text-red-800 mt-1">
              This error requires immediate attention. Please contact support.
            </p>
          </div>
          <div className="space-y-2">
            <Button
              onClick={handleContactSupport}
              className="w-full"
              variant="primary"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Application
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};