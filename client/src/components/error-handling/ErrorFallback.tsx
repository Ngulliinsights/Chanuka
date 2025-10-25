import React from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { ResponsiveButton as Button } from "../../shared/design-system/components/ResponsiveButton";
import { ResponsiveContainer } from "../../shared/design-system/components/ResponsiveContainer";
import { Logo } from "../ui/logo";
import { ErrorFallbackProps } from "./PageErrorBoundary";
import { logger } from "../../utils/browser-logger";
import { ErrorSeverity } from "@shared/core/src/observability/error-management/errors/base-error";
import {
  UserErrorReporter,
  createUserErrorReporter,
} from "@shared/core/src/observability/error-management/reporting/user-error-reporter";
import {
  BaseError,
  ErrorDomain,
} from "@shared/core/src/observability/error-management/errors/base-error";
import {
  ValidationError,
  NetworkError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
} from "@shared/core/src/observability/error-management/errors/specialized-errors";

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  context,
  retryCount,
  errorType,
  errorSeverity,
  canRecover,
  onReportError,
}) => {
  const maxRetries = 3;

  // Initialize UserErrorReporter for consistent error reporting
  const userReporter = React.useMemo(
    () =>
      createUserErrorReporter({
        enableFeedback: true,
        enableTechnicalDetails: process.env.NODE_ENV === "development",
      }),
    []
  );

  // Convert error to BaseError if needed
  const baseError = React.useMemo(() => {
    if (error instanceof BaseError) {
      return error;
    }

    // Map error types to appropriate BaseError subclasses
    switch (errorType) {
      case "network":
        return new NetworkError(error.message, {
          context: {
            component: "ErrorFallback",
            errorContext: context,
            originalError: error,
          },
        });
      case "chunk":
        return new ExternalServiceError(error.message, "code-splitting", 503, {
          context: {
            component: "ErrorFallback",
            errorContext: context,
            originalError: error,
          },
        });
      case "timeout":
        return new ServiceUnavailableError(error.message, undefined, {
          context: {
            component: "ErrorFallback",
            errorContext: context,
            originalError: error,
          },
        });
      case "memory":
        return new BaseError(error.message, {
          code: "MEMORY_ERROR",
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.CRITICAL,
          context: {
            component: "ErrorFallback",
            errorContext: context,
            originalError: error,
          },
        });
      case "security":
        return new BaseError(error.message, {
          code: "SECURITY_ERROR",
          domain: ErrorDomain.SECURITY,
          severity: ErrorSeverity.CRITICAL,
          context: {
            component: "ErrorFallback",
            errorContext: context,
            originalError: error,
          },
        });
      default:
        return new BaseError(error.message, {
          code: "UNKNOWN_ERROR",
          domain: ErrorDomain.SYSTEM,
          severity:
            errorSeverity === ErrorSeverity.CRITICAL
              ? ErrorSeverity.CRITICAL
              : errorSeverity === ErrorSeverity.HIGH
              ? ErrorSeverity.HIGH
              : errorSeverity === ErrorSeverity.MEDIUM
              ? ErrorSeverity.MEDIUM
              : ErrorSeverity.LOW,
          context: {
            component: "ErrorFallback",
            errorContext: context,
            originalError: error,
          },
        });
    }
  }, [error, errorType, errorSeverity, context]);

  // Generate user report for consistent error handling
  const errorReport = React.useMemo(() => {
    return userReporter.generateReport(baseError, {
      userId: "anonymous", // Would come from auth context
      metadata: {
        sessionId: "unknown", // Would come from session management
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    });
  }, [baseError, userReporter]);

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleReportBug = async () => {
    try {
      // Use UserErrorReporter for consistent error reporting
      if (onReportError) {
        onReportError();
      } else {
        // Generate comprehensive error report using UserErrorReporter
        const recoveryOptions = userReporter.generateRecoveryOptions(baseError);
        const report = userReporter.generateReport(
          baseError,
          {
            userId: "anonymous",
            metadata: {
              sessionId: "unknown",
              userAgent: navigator.userAgent,
              url: window.location.href,
              timestamp: new Date().toISOString(),
              errorContext: context,
              retryCount,
            },
          },
          recoveryOptions
        );

        // Submit feedback if available (could be enhanced with user input)
        await userReporter.submitFeedback(report.errorId, {
          comment: `User reported error from ${context} context`,
          rating: 1, // Indicates user dissatisfaction
        });

        // Fallback to email with enhanced details
        const subject = encodeURIComponent(
          `Error Report: ${baseError.code} [${errorType}/${errorSeverity}]`
        );
        const body = encodeURIComponent(`
Error Report ID: ${report.errorId}
User Message: ${report.userMessage}

Technical Details:
- Error Code: ${baseError.code}
- Domain: ${baseError.metadata.domain}
- Severity: ${baseError.metadata.severity}
- Context: ${context}
- Retry Count: ${retryCount}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}
- Timestamp: ${new Date().toISOString()}

Recovery Options Suggested: ${recoveryOptions.length}

${
  report.technicalDetails
    ? `Technical Details:\n${report.technicalDetails}`
    : ""
}

Stack Trace:
${error.stack}
        `);

        window.open(
          `mailto:support@example.com?subject=${subject}&body=${body}`
        );
      }
    } catch (reportError) {
      logger.error("Failed to generate error report", {
        error: reportError,
        originalError: error,
      });
      // Fallback to basic email reporting
      const subject = encodeURIComponent(
        `Error Report: ${error.name} [${errorType}/${errorSeverity}]`
      );
      const body = encodeURIComponent(
        `Error: ${error.message}\nContext: ${context}\nURL: ${window.location.href}`
      );
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
    }
  };

  const getContextualMessage = () => {
    // Use BaseError's user message if available and more specific
    if (baseError.getUserMessage() !== baseError.message) {
      return baseError.getUserMessage();
    }

    // Customize message based on error type and severity using shared error patterns
    if (errorType === "network") {
      return "There was a problem connecting to our services. Please check your internet connection.";
    }

    if (errorType === "chunk") {
      return "Failed to load part of the application. This might be due to a network issue or an outdated cache.";
    }

    if (errorType === "timeout") {
      return "The operation took too long to complete. Please try again.";
    }

    if (errorType === "memory") {
      return "The application is using too much memory. Please close other tabs and try again.";
    }

    if (errorType === "security") {
      return "A security restriction prevented the operation from completing.";
    }

    // Context-based messages using consistent patterns
    switch (context) {
      case "page":
        return "This page encountered an unexpected error and cannot be displayed.";
      case "component":
        return "A component on this page failed to load properly.";
      case "api":
        return "There was a problem connecting to our services.";
      case "navigation":
        return "Navigation failed. Please try refreshing the page.";
      case "authentication":
        return "Authentication failed. Please try logging in again.";
      case "data-loading":
        return "Failed to load data. Please check your connection and try again.";
      default:
        return "An unexpected error occurred.";
    }
  };

  const getContextualIcon = () => {
    // Icon based on error severity using shared error patterns
    if (errorSeverity === ErrorSeverity.CRITICAL) {
      return <AlertTriangle className="h-12 w-12 text-red-600" />;
    }

    if (errorSeverity === ErrorSeverity.HIGH) {
      return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }

    if (errorSeverity === ErrorSeverity.MEDIUM) {
      return <AlertTriangle className="h-12 w-12 text-orange-500" />;
    }

    // Low severity or context-based using BaseError domain information
    if (
      baseError.metadata.domain === ErrorDomain.NETWORK ||
      baseError.metadata.domain === ErrorDomain.EXTERNAL_SERVICE
    ) {
      return <AlertTriangle className="h-12 w-12 text-orange-400" />;
    }

    return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg">
        <div className="text-center p-6">
          <div className="flex justify-center mb-4">
            <Logo size="md" showText={true} />
          </div>
          <div className="flex justify-center mb-4">{getContextualIcon()}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600">{getContextualMessage()}</p>
        </div>

        <div className="space-y-4 p-6">
          {/* Error details (only in development) */}
          {process.env.NODE_ENV === "development" && (
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Error Details:
              </p>
              <p className="text-xs text-gray-600 font-mono break-all mb-2">
                {baseError.message}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Error ID: {errorReport.errorId}</p>
                <p>Code: {baseError.code}</p>
                <p>Domain: {baseError.metadata.domain}</p>
                <p>Type: {errorType}</p>
                <p>Severity: {errorSeverity}</p>
                <p>Context: {context}</p>
                {retryCount > 0 && (
                  <p>
                    Retry attempt: {retryCount}/{maxRetries}
                  </p>
                )}
                <p>
                  Recovery Options: {errorReport.recoveryOptions?.length || 0}
                </p>
              </div>
            </div>
          )}

          {/* Error type specific information */}
          {errorType === "chunk" && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                💡 Try clearing your browser cache or hard refreshing the page
                (Ctrl+F5).
              </p>
            </div>
          )}

          {errorType === "network" && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <p className="text-sm text-orange-800">
                🌐 Check your internet connection and try again.
              </p>
            </div>
          )}

          {errorSeverity === ErrorSeverity.CRITICAL && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                ⚠️ This is a critical error that requires immediate attention.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {canRecover && (
              <Button onClick={resetError} className="w-full" variant="primary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
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

            {context !== "page" && (
              <Button
                onClick={handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </Button>
            )}

            <Button
              onClick={handleReportBug}
              className="w-full"
              variant="ghost"
              size="small"
            >
              <Bug className="h-4 w-4 mr-2" />
              Report this issue
            </Button>
          </div>

          {/* Recovery status message */}
          {!canRecover && errorSeverity !== "critical" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                Maximum retry attempts reached. Please reload the page or
                contact support if the problem persists.
              </p>
            </div>
          )}

          {errorSeverity === ErrorSeverity.CRITICAL && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                This is a critical error that cannot be automatically recovered.
                Please contact support immediately.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for API errors
export const ApiErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const isNetworkError =
    props.errorType === "network" || props.errorType === "timeout";

  // Initialize UserErrorReporter for API errors
  const userReporter = React.useMemo(
    () =>
      createUserErrorReporter({
        enableFeedback: true,
        enableTechnicalDetails: process.env.NODE_ENV === "development",
      }),
    []
  );

  // Convert to BaseError for consistent handling
  const baseError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    return isNetworkError
      ? new NetworkError(props.error.message, {
          context: {
            component: "ApiErrorFallback",
            errorContext: props.context,
          },
        })
      : new ExternalServiceError(props.error.message, "api", 500, {
          context: {
            component: "ApiErrorFallback",
            errorContext: props.context,
          },
        });
  }, [props.error, isNetworkError, props.context]);

  // Generate report for API errors
  const errorReport = React.useMemo(() => {
    return userReporter.generateReport(baseError, {
      userId: "anonymous",
      metadata: {
        sessionId: "unknown",
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        errorContext: props.context,
        retryCount: props.retryCount,
      },
    });
  }, [baseError, userReporter, props.context, props.retryCount]);

  const handleApiReportError = async () => {
    try {
      if (props.onReportError) {
        props.onReportError();
      } else {
        // Use UserErrorReporter for consistent API error reporting
        await userReporter.submitFeedback(errorReport.errorId, {
          comment: `API Error reported from ${props.context} context`,
          rating: 2,
        });
      }
    } catch (reportError) {
      logger.error("Failed to report API error", {
        error: reportError,
        originalError: props.error,
      });
    }
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-md p-4 m-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            {isNetworkError ? "Connection Problem" : "API Error"}
          </h3>
          <p className="text-sm text-orange-700 mt-1">
            {isNetworkError
              ? "Unable to connect to our services. Please check your internet connection and try again."
              : baseError.getUserMessage() ||
                "There was a problem processing your request. Please try again."}
          </p>
          {props.errorSeverity === ErrorSeverity.HIGH && (
            <p className="text-xs text-orange-600 mt-1">
              Error: {baseError.message}
            </p>
          )}
          <div className="mt-3 flex space-x-2">
            {props.canRecover && (
              <Button
                onClick={props.resetError}
                size="small"
                variant="outline"
                className="text-orange-800 border-orange-300 hover:bg-orange-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            <Button
              onClick={handleApiReportError}
              size="small"
              variant="ghost"
              className="text-orange-700 hover:bg-orange-100"
            >
              <Bug className="h-3 w-3 mr-1" />
              Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for component errors
export const ComponentErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  // Initialize UserErrorReporter for component errors
  const userReporter = React.useMemo(
    () =>
      createUserErrorReporter({
        enableFeedback: true,
        enableTechnicalDetails: process.env.NODE_ENV === "development",
      }),
    []
  );

  // Convert to BaseError for consistent handling
  const baseError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    return props.errorType === "chunk"
      ? new ExternalServiceError(props.error.message, "code-splitting", 503, {
          context: {
            component: "ComponentErrorFallback",
            errorContext: props.context,
          },
        })
      : new BaseError(props.error.message, {
          code: "COMPONENT_ERROR",
          domain: ErrorDomain.SYSTEM,
          severity: props.errorSeverity,
          context: {
            component: "ComponentErrorFallback",
            errorContext: props.context,
          },
        });
  }, [props.error, props.errorType, props.errorSeverity, props.context]);

  // Generate report for component errors
  const errorReport = React.useMemo(() => {
    return userReporter.generateReport(baseError, {
      userId: "anonymous",
      metadata: {
        sessionId: "unknown",
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        errorContext: props.context,
        retryCount: props.retryCount,
      },
    });
  }, [baseError, userReporter, props.context, props.retryCount]);

  const handleComponentReportError = async () => {
    try {
      if (props.onReportError) {
        props.onReportError();
      } else {
        await userReporter.submitFeedback(errorReport.errorId, {
          comment: `Component Error reported from ${props.context} context`,
          rating: 2,
        });
      }
    } catch (reportError) {
      logger.error("Failed to report component error", {
        error: reportError,
        originalError: props.error,
      });
    }
  };

  const getSeverityStyles = () => {
    switch (props.errorSeverity) {
      case ErrorSeverity.CRITICAL:
        return {
          container: "bg-red-50 border border-red-200 rounded-md p-4 m-2",
          icon: "h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0",
          title: "text-sm text-red-800 font-medium",
          description: "text-xs text-red-700 mt-1",
          errorText: "text-xs text-red-600 mt-1 font-mono break-all",
          retryButton: "text-red-800 hover:bg-red-100",
          reportButton: "text-red-700 hover:bg-red-100",
        };
      case ErrorSeverity.HIGH:
        return {
          container: "bg-red-50 border border-red-200 rounded-md p-4 m-2",
          icon: "h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0",
          title: "text-sm text-red-800 font-medium",
          description: "text-xs text-red-700 mt-1",
          errorText: "text-xs text-red-600 mt-1 font-mono break-all",
          retryButton: "text-red-800 hover:bg-red-100",
          reportButton: "text-red-700 hover:bg-red-100",
        };
      case ErrorSeverity.MEDIUM:
        return {
          container: "bg-orange-50 border border-orange-200 rounded-md p-4 m-2",
          icon: "h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0",
          title: "text-sm text-orange-800 font-medium",
          description: "text-xs text-orange-700 mt-1",
          errorText: "text-xs text-orange-600 mt-1 font-mono break-all",
          retryButton: "text-orange-800 hover:bg-orange-100",
          reportButton: "text-orange-700 hover:bg-orange-100",
        };
      case ErrorSeverity.LOW:
        return {
          container: "bg-yellow-50 border border-yellow-200 rounded-md p-4 m-2",
          icon: "h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0",
          title: "text-sm text-yellow-800 font-medium",
          description: "text-xs text-yellow-700 mt-1",
          errorText: "text-xs text-yellow-600 mt-1 font-mono break-all",
          retryButton: "text-yellow-800 hover:bg-yellow-100",
          reportButton: "text-yellow-700 hover:bg-yellow-100",
        };
      default:
        return {
          container: "bg-gray-50 border border-gray-200 rounded-md p-4 m-2",
          icon: "h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0",
          title: "text-sm text-gray-800 font-medium",
          description: "text-xs text-gray-700 mt-1",
          errorText: "text-xs text-gray-600 mt-1 font-mono break-all",
          retryButton: "text-gray-800 hover:bg-gray-100",
          reportButton: "text-gray-700 hover:bg-gray-100",
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className={styles.container}>
      <div className="flex items-start">
        <AlertTriangle className={styles.icon} />
        <div className="flex-1 min-w-0">
          <p className={styles.title}>Component Error ({props.errorType})</p>
          <p className={styles.description}>
            {props.errorType === "chunk"
              ? "Failed to load component code. Try refreshing the page."
              : baseError.getUserMessage() ||
                "This component failed to render properly."}
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className={styles.errorText}>{baseError.message}</p>
          )}
        </div>
        <div className="flex space-x-1 ml-2">
          {props.canRecover && (
            <Button
              onClick={props.resetError}
              size="small"
              variant="ghost"
              className={styles.retryButton}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          <Button
            onClick={handleComponentReportError}
            size="small"
            variant="ghost"
            className={styles.reportButton}
          >
            <Bug className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for chunk loading errors
export const ChunkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  // Initialize UserErrorReporter for chunk errors
  const userReporter = React.useMemo(
    () =>
      createUserErrorReporter({
        enableFeedback: true,
        enableTechnicalDetails: process.env.NODE_ENV === "development",
      }),
    []
  );

  // Convert to BaseError for consistent handling
  const baseError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    return new ExternalServiceError(
      props.error.message,
      "code-splitting",
      503,
      {
        context: {
          component: "ChunkErrorFallback",
          errorContext: props.context,
        },
      }
    );
  }, [props.error, props.context]);

  // Generate report for chunk errors
  const errorReport = React.useMemo(() => {
    return userReporter.generateReport(baseError, {
      userId: "anonymous",
      metadata: {
        sessionId: "unknown",
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        errorContext: props.context,
        retryCount: props.retryCount,
      },
    });
  }, [baseError, userReporter, props.context, props.retryCount]);

  const handleHardRefresh = () => {
    window.location.reload();
  };

  const handleChunkReportError = async () => {
    try {
      if (props.onReportError) {
        props.onReportError();
      } else {
        await userReporter.submitFeedback(errorReport.errorId, {
          comment: `Chunk loading error reported from ${props.context} context`,
          rating: 3, // Medium dissatisfaction for loading issues
        });
      }
    } catch (reportError) {
      logger.error("Failed to report chunk error", {
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
            {baseError.getUserMessage() ||
              "Failed to load part of the application. This usually happens when the app has been updated."}
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
              <Bug className="h-3 w-3 mr-1" />
              Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for network errors
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const isOnline = navigator.onLine;

  // Initialize UserErrorReporter for network errors
  const userReporter = React.useMemo(
    () =>
      createUserErrorReporter({
        enableFeedback: true,
        enableTechnicalDetails: process.env.NODE_ENV === "development",
      }),
    []
  );

  // Convert to BaseError for consistent handling
  const baseError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    return new NetworkError(props.error.message, {
      context: {
        component: "NetworkErrorFallback",
        errorContext: props.context,
        isOnline,
      },
    });
  }, [props.error, props.context, isOnline]);

  // Generate report for network errors
  const errorReport = React.useMemo(() => {
    return userReporter.generateReport(baseError, {
      userId: "anonymous",
      metadata: {
        sessionId: "unknown",
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        errorContext: props.context,
        retryCount: props.retryCount,
        isOnline,
      },
    });
  }, [baseError, userReporter, props.context, props.retryCount, isOnline]);

  const handleNetworkReportError = async () => {
    try {
      if (props.onReportError) {
        props.onReportError();
      } else {
        await userReporter.submitFeedback(errorReport.errorId, {
          comment: `Network error reported from ${props.context} context. Online: ${isOnline}`,
          rating: isOnline ? 2 : 4, // Higher rating if offline
        });
      }
    } catch (reportError) {
      logger.error("Failed to report network error", {
        error: reportError,
        originalError: props.error,
      });
    }
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-md p-4 m-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-orange-800">Network Error</h3>
          <p className="text-sm text-orange-700 mt-1">
            {!isOnline
              ? "You appear to be offline. Please check your internet connection."
              : baseError.getUserMessage() ||
                "Unable to connect to our servers. Please try again."}
          </p>
          <div className="mt-3 flex space-x-2">
            {props.canRecover && (
              <Button
                onClick={props.resetError}
                size="small"
                variant="outline"
                className="text-orange-800 border-orange-300 hover:bg-orange-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            <Button
              onClick={handleNetworkReportError}
              size="small"
              variant="ghost"
              className="text-orange-700 hover:bg-orange-100"
            >
              <Bug className="h-3 w-3 mr-1" />
              Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for critical errors
export const CriticalErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  // Initialize UserErrorReporter for critical errors
  const userReporter = React.useMemo(
    () =>
      createUserErrorReporter({
        enableFeedback: true,
        enableTechnicalDetails: true, // Always show technical details for critical errors
      }),
    []
  );

  // Convert to BaseError for consistent handling
  const baseError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    return new BaseError(props.error.message, {
      code: "CRITICAL_ERROR",
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      context: {
        component: "CriticalErrorFallback",
        errorContext: props.context,
      },
    });
  }, [props.error, props.context]);

  // Generate report for critical errors
  const errorReport = React.useMemo(() => {
    return userReporter.generateReport(baseError, {
      userId: "anonymous",
      metadata: {
        sessionId: "unknown",
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        errorContext: props.context,
        retryCount: props.retryCount,
      },
    });
  }, [baseError, userReporter, props.context, props.retryCount]);

  const handleContactSupport = async () => {
    try {
      if (props.onReportError) {
        props.onReportError();
      } else {
        // For critical errors, always submit feedback with high priority
        await userReporter.submitFeedback(errorReport.errorId, {
          comment: `Critical error reported from ${props.context} context - requires immediate attention`,
          rating: 1, // Maximum dissatisfaction
        });

        // Also send email for critical errors
        const subject = encodeURIComponent(
          `CRITICAL ERROR: ${baseError.code} [${props.errorType}]`
        );
        const body = encodeURIComponent(`
Critical Error Report ID: ${errorReport.errorId}
Error Code: ${baseError.code}
Domain: ${baseError.metadata.domain}
Severity: ${baseError.metadata.severity}
Context: ${props.context}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}

${errorReport.technicalDetails || baseError.message}

Stack Trace:
${props.error.stack}
        `);
        window.open(
          `mailto:support@example.com?subject=${subject}&body=${body}`
        );
      }
    } catch (reportError) {
      logger.error("Failed to report critical error", {
        error: reportError,
        originalError: props.error,
      });
      // Fallback email for critical errors
      const subject = encodeURIComponent(`CRITICAL ERROR: ${props.errorType}`);
      const body = encodeURIComponent(
        `Critical error: ${props.error.message}\nContext: ${props.context}\nURL: ${window.location.href}`
      );
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
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
            {baseError.getUserMessage() ||
              "A critical error has occurred that prevents the application from functioning properly."}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800 font-medium">
              Error ID: {errorReport.errorId}
            </p>
            <p className="text-sm text-red-800 font-medium">
              Error Type: {props.errorType}
            </p>
            <p className="text-xs text-red-700 mt-1">{baseError.message}</p>
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
              <Bug className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
