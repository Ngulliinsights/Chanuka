import React from "react";
import { AlertTriangle, RefreshCw, Home, Bug, WifiOff, Server, Database, Shield } from "lucide-react";
import { ResponsiveButton as Button } from "../../shared/design-system/components";
import { ResponsiveContainer } from "../../shared/design-system/components";
import { Logo } from "../ui/logo";
import { ErrorFallbackProps } from "./EnhancedErrorBoundary";
import { logger as baseLogger } from "../../utils/browser-logger";

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
import { 
  BaseError,
  ErrorDomain,
  ErrorSeverity,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  NetworkError,
  ExternalServiceError,
  ServiceUnavailableError,
  DatabaseError,
  CacheError,
  ConflictError,
  TooManyRequestsError
} from "@shared/core";

/**
 * Error Report Structure
 * 
 * This interface defines the shape of our error reports, providing a consistent
 * format for displaying error information to users and logging it to our systems.
 * The structure captures both user-facing information and technical details needed
 * for debugging, with the technical details only included in development environments.
 */
interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  userMessage: string;
  code: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  context?: any;
  technicalDetails?: string;
  recoveryOptions: Array<{ label: string; action: string; description?: string }>;
}

/**
 * User Feedback Submission
 * 
 * When users report errors, we want to capture their perspective and any additional
 * context they can provide. The rating system helps us understand impact severity
 * from the user's viewpoint, which often differs from our technical severity assessment.
 */
interface FeedbackSubmission {
  errorId: string;
  comment: string;
  rating: number;
  userContext?: Record<string, any>;
}

/**
 * Error Reporter Factory
 * 
 * This factory creates a consistent error reporting interface that adapts to the
 * environment. In development, we expose technical details to help developers debug
 * issues quickly. In production, we focus on user-friendly messaging while still
 * collecting comprehensive error data in the background for our logging systems.
 * 
 * The reporter understands our BaseError structure and can extract recovery strategies,
 * correlation IDs, and other metadata that our error classes provide. It also handles
 * standard JavaScript errors gracefully, normalizing them into a consistent format.
 */
function createErrorReporter(options: { 
  enableFeedback?: boolean; 
  enableTechnicalDetails?: boolean;
}) {
  return {
    report: (error: any) => {
      logger.error('User error reported', { 
        component: 'ErrorReporter',
        error 
      });
    },
    
    generateReport: (error: BaseError, metadata?: any): ErrorReport => {
      const errorId = error.errorId || `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Extract recovery options from the error's built-in strategies if available,
      // otherwise provide sensible defaults based on the error's characteristics
      let recoveryOptions: Array<{ label: string; action: string; description?: string }>;
      
      if (error.metadata.recoveryStrategies && error.metadata.recoveryStrategies.length > 0) {
        recoveryOptions = error.metadata.recoveryStrategies.map(strategy => ({
          label: strategy.name,
          action: strategy.automatic ? 'auto' : 'manual',
          description: strategy.description
        }));
      } else {
        // Provide domain-specific recovery options when the error doesn't define its own
        recoveryOptions = [
          { label: 'Retry', action: 'retry', description: 'Attempt the operation again' },
          { label: 'Go Home', action: 'home', description: 'Return to the homepage' },
          { label: 'Report Issue', action: 'report', description: 'Send error details to support' }
        ];
        
        // Add network-specific option if this is a network-related error
        if (error.metadata.domain === ErrorDomain.NETWORK) {
          recoveryOptions.unshift({ 
            label: 'Check Connection', 
            action: 'check-connection',
            description: 'Verify your internet connection status'
          });
        }
      }

      return {
        id: errorId,
        timestamp: error.metadata.timestamp.toISOString(),
        message: error.message,
        userMessage: error.getUserMessage(),
        code: error.code,
        domain: error.metadata.domain,
        severity: error.metadata.severity,
        context: error.metadata.context,
        technicalDetails: options.enableTechnicalDetails ? error.stack : undefined,
        recoveryOptions
      };
    },
    
    submitFeedback: async (feedback: FeedbackSubmission): Promise<void> => {
      logger.info('User feedback submitted', { 
        component: 'ErrorReporter',
        ...feedback 
      });
      // In production, this would integrate with your error tracking service
      // await errorTrackingService.submitFeedback(feedback);
    },
    
    options
  };
}

/**
 * Error Normalization Utility
 * 
 * This function is the heart of our error handling strategy. It takes any error that
 * might be thrown in the application and converts it into a proper BaseError instance
 * from our error hierarchy. This normalization ensures that every error flowing through
 * our UI components has the same rich metadata, user messaging capabilities, and recovery
 * strategies regardless of where it originated.
 * 
 * The function intelligently maps error types to the appropriate specialized error classes,
 * preserving semantic meaning. For example, a network failure becomes a NetworkError with
 * appropriate domain categorization and retry capabilities, while a chunk loading failure
 * becomes an ExternalServiceError indicating a problem with loading external resources.
 * 
 * By centralizing this logic, we ensure consistent error handling across all our error
 * boundary components while keeping the individual components clean and focused on presentation.
 */
function normalizeError(
  error: any,
  errorType?: string,
  errorSeverity?: ErrorSeverity,
  context?: any
): BaseError {
  // If this is already a BaseError instance, return it directly without transformation
  if (error instanceof BaseError) {
    return error;
  }

  // Extract the error message, handling various error formats gracefully
  const message = error?.message || String(error || 'Unknown error occurred');
  const originalStack = error?.stack;

  // Build a comprehensive context object that includes debugging information
  // This context will be embedded in the BaseError's metadata
  const errorContext = {
    component: 'ErrorFallback',
    errorContext: context,
    originalError: error,
    errorType,
    normalizedAt: new Date().toISOString()
  };

  // Map error types to their appropriate specialized error classes
  // This mapping provides semantic meaning and proper categorization
  let normalizedError: BaseError;

  switch (errorType) {
    case 'network':
      normalizedError = new NetworkError(message, errorContext);
      break;

    case 'chunk':
      // Chunk loading errors are treated as external service failures because
      // they represent inability to load code from the CDN or server
      normalizedError = new ExternalServiceError(message, 'CDN', undefined, errorContext);
      break;

    case 'timeout':
      normalizedError = new ServiceUnavailableError(message, undefined, errorContext);
      break;

    case 'database':
      normalizedError = new DatabaseError(message, 'UNKNOWN_OPERATION', errorContext);
      break;

    case 'cache':
      normalizedError = new CacheError(message, 'UNKNOWN_OPERATION', errorContext);
      break;

    case 'unauthorized':
      normalizedError = new UnauthorizedError(message, errorContext);
      break;

    case 'forbidden':
      normalizedError = new ForbiddenError(message, undefined, errorContext);
      break;

    case 'notfound':
      normalizedError = new NotFoundError('Resource', 'UNKNOWN_ID', errorContext);
      break;

    case 'validation':
      normalizedError = new ValidationError(message, [], errorContext) as BaseError;
      break;

    case 'conflict':
      normalizedError = new ConflictError(message, 'UNKNOWN_RESOURCE', errorContext);
      break;

    case 'ratelimit':
      normalizedError = new TooManyRequestsError(message, undefined, errorContext);
      break;

    case 'memory':
    case 'security':
      // Memory and security errors are always critical because they indicate
      // fundamental system problems that require immediate attention
      normalizedError = new BaseError(message, {
        code: errorType === 'memory' ? 'MEMORY_ERROR' : 'SECURITY_ERROR',
        domain: errorType === 'memory' ? ErrorDomain.SYSTEM : ErrorDomain.SECURITY,
        severity: ErrorSeverity.CRITICAL,
        context: errorContext,
        isOperational: errorType !== 'memory', // Memory errors are often non-operational
        statusCode: 500
      });
      break;

    default:
      // For unknown error types, create a generic BaseError with sensible defaults
      normalizedError = new BaseError(message, {
        code: 'UNKNOWN_ERROR',
        domain: ErrorDomain.SYSTEM,
        severity: errorSeverity || ErrorSeverity.MEDIUM,
        context: errorContext,
        isOperational: true,
        statusCode: 500
      });
  }

  // Preserve the original stack trace if available, which is crucial for debugging
  if (originalStack && !normalizedError.stack) {
    normalizedError.stack = originalStack;
  }

  return normalizedError;
}

/**
 * Icon Selection Utility
 * 
 * This function determines the appropriate icon to display based on the error's
 * characteristics. We use a two-tier system: domain-specific icons for certain
 * categories provide semantic clarity about what went wrong, while severity-based
 * icons convey urgency when domain doesn't have a specific representation.
 * 
 * The icon selection helps users quickly understand both the nature and seriousness
 * of the error they've encountered, providing immediate visual feedback before they
 * even read the error message.
 */
function getErrorIcon(error: BaseError): JSX.Element {
  const { domain, severity } = error.metadata;
  
  // Critical errors always get the most urgent visual treatment
  if (severity === ErrorSeverity.CRITICAL) {
    return <AlertTriangle className="h-12 w-12 text-red-600" />;
  }

  // Domain-specific icons provide semantic meaning for certain error categories
  // These help users immediately understand what type of problem occurred
  switch (domain) {
    case ErrorDomain.NETWORK:
      return <WifiOff className="h-12 w-12 text-orange-500" />;
    
    case ErrorDomain.EXTERNAL_SERVICE:
      return <Server className="h-12 w-12 text-orange-500" />;
    
    case ErrorDomain.DATABASE:
    case ErrorDomain.CACHE:
      return <Database className="h-12 w-12 text-red-500" />;
    
    case ErrorDomain.SECURITY:
    case ErrorDomain.AUTHENTICATION:
    case ErrorDomain.AUTHORIZATION:
      return <Shield className="h-12 w-12 text-red-500" />;
    
    default:
      // For other domains, use severity-based coloring with the alert triangle
      const colorClass = 
        severity === ErrorSeverity.HIGH ? 'text-red-500' :
        severity === ErrorSeverity.MEDIUM ? 'text-orange-500' :
        'text-yellow-500';
      
      return <AlertTriangle className={`h-12 w-12 ${colorClass}`} />;
  }
}

/**
 * Contextual Message Generator
 * 
 * This function provides user-friendly error messages that explain what went wrong
 * in terms non-technical users can understand. It follows a waterfall strategy,
 * checking for increasingly specific messaging before falling back to generic messages.
 * 
 * The waterfall goes: built-in user message from the error object, error type specific
 * messages, domain-specific messages, and finally context-specific messages. This
 * ensures users always get the most relevant explanation possible for their situation.
 */
function getContextualMessage(error: BaseError, errorType?: string, context?: string): string {
  // First priority: use the error's built-in user message if it provides one
  // This respects the error class's own understanding of how to communicate with users
  const userMessage = error.getUserMessage();
  if (userMessage && userMessage !== error.message) {
    return userMessage;
  }

  // Second priority: provide error type specific messages for known patterns
  // These messages are crafted specifically for common error scenarios
  if (errorType === 'chunk') {
    return 'Failed to load part of the application. This usually happens after an app update. Try refreshing the page or clearing your browser cache.';
  }

  if (errorType === 'network') {
    return 'There was a problem connecting to our services. Please check your internet connection and try again.';
  }

  if (errorType === 'timeout') {
    return 'The operation took too long to complete. This might indicate a slow connection or server overload. Please try again.';
  }

  if (errorType === 'memory') {
    return 'The application is using too much memory. Try closing other tabs or restarting your browser.';
  }

  if (errorType === 'security') {
    return 'A security restriction prevented the operation from completing. This is a protective measure to keep your data safe.';
  }

  // Third priority: domain-specific messages based on error categorization
  const { domain } = error.metadata;
  
  switch (domain) {
    case ErrorDomain.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection.';
    
    case ErrorDomain.AUTHENTICATION:
      return 'Your session has expired or you are not logged in. Please sign in again to continue.';
    
    case ErrorDomain.AUTHORIZATION:
      return 'You do not have permission to perform this action. Contact your administrator if you believe this is incorrect.';
    
    case ErrorDomain.VALIDATION:
      return 'The information provided is invalid. Please check your input and try again.';
    
    case ErrorDomain.DATABASE:
      return 'There was a problem accessing the database. Please try again in a few moments.';
    
    case ErrorDomain.EXTERNAL_SERVICE:
      return 'An external service is temporarily unavailable. We are working to restore it.';
    
    case ErrorDomain.BUSINESS_LOGIC:
      return 'This operation cannot be completed due to business rules or constraints.';
    
    case ErrorDomain.CACHE:
      return 'There was a problem with cached data. Try refreshing to load fresh data.';
    
    default:
      // Final fallback: context-based messages provide general guidance
      switch (context) {
        case 'page':
          return 'This page encountered an error and cannot be displayed.';
        case 'component':
          return 'A component on this page failed to load properly.';
        case 'api':
          return 'There was a problem communicating with the server.';
        case 'navigation':
          return 'Navigation failed. Please try refreshing the page.';
        case 'authentication':
          return 'Authentication failed. Please try logging in again.';
        case 'data-loading':
          return 'Failed to load data. Please check your connection and try again.';
        default:
          return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
      }
  }
}

/**
 * Main Error Fallback Component
 * 
 * This is the primary error boundary fallback that displays when errors occur at the
 * page level. It provides a comprehensive, user-friendly interface with contextual
 * information, recovery options, and detailed error reporting for development environments.
 * 
 * The component intelligently adapts its display based on error severity, domain, and
 * whether recovery is possible. It leverages all the metadata from our BaseError hierarchy
 * to provide users with the most helpful information and clearest path forward.
 * 
 * In development mode, it exposes technical details to help developers debug issues quickly.
 * In production, it maintains a clean, professional appearance while still collecting
 * comprehensive error data in the background for logging and monitoring systems.
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

  // Initialize error reporter with environment-appropriate configuration
  const errorReporter = React.useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: isDevelopment,
    }),
    [isDevelopment]
  );

  // Normalize the error into our BaseError hierarchy for consistent handling
  const normalizedError = React.useMemo(
    () => normalizeError(error, errorType, errorSeverity, context),
    [error, errorType, errorSeverity, context]
  );

  // Generate a comprehensive error report for display and logging
  const errorReport = React.useMemo(
    () => errorReporter.generateReport(normalizedError, context),
    [errorReporter, normalizedError, context]
  );

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  /**
   * Error Reporting Handler
   * 
   * This function handles the user's request to report an error. It attempts to use
   * a custom error reporter if provided through props, which allows consuming code
   * to integrate with their own error tracking systems. If no custom reporter is
   * available, it falls back to our default implementation which logs the error
   * and opens an email client with comprehensive error details.
   * 
   * The email fallback is particularly valuable because it works without any backend
   * infrastructure and gives users a direct communication channel to support.
   */
  const handleReportError = async () => {
    try {
      if (onReportError) {
        await onReportError();
        return;
      }

      // Submit feedback through our error reporting system
      await errorReporter.submitFeedback({
        errorId: errorReport.id,
        comment: `Error reported from ${context} context`,
        rating: normalizedError.metadata.severity === ErrorSeverity.CRITICAL ? 1 : 2,
        userContext: { 
          retryCount, 
          canRecover, 
          errorType,
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      });

      // Open email client as user-friendly fallback with comprehensive details
      const subject = encodeURIComponent(
        `Error Report: ${errorReport.code} [${errorType}/${normalizedError.metadata.severity}]`
      );
      
      const body = encodeURIComponent(`
Error Report ID: ${errorReport.id}
Timestamp: ${errorReport.timestamp}

User-Facing Message:
${errorReport.userMessage}

Technical Details:
- Error Code: ${errorReport.code}
- Domain: ${normalizedError.metadata.domain}
- Severity: ${normalizedError.metadata.severity}
- Context: ${context}
- Retry Count: ${retryCount}/${maxRetries}
- Retryable: ${normalizedError.metadata.retryable}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}

${normalizedError.metadata.correlationId ? `Correlation ID: ${normalizedError.metadata.correlationId}\n` : ''}
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
      
      // Ultimate fallback to basic email if report generation fails
      const subject = encodeURIComponent(`Error Report: ${errorType}`);
      const body = encodeURIComponent(
        `Error: ${normalizedError.message}\nContext: ${context}\nURL: ${window.location.href}`
      );
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg">
        {/* Header Section with branding and primary error information */}
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

        {/* Content Section with detailed information and actions */}
        <div className="space-y-4 p-6">
          {/* Development-only error details for debugging */}
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
                <p>Domain: {normalizedError.metadata.domain}</p>
                <p>Severity: {normalizedError.metadata.severity}</p>
                <p>Type: {errorType || 'unknown'}</p>
                <p>Context: {context || 'unknown'}</p>
                {retryCount > 0 && (
                  <p>Retry: {retryCount}/{maxRetries}</p>
                )}
                {normalizedError.metadata.retryable && (
                  <p className="text-blue-600">⟳ Retryable</p>
                )}
                {normalizedError.metadata.correlationId && (
                  <p>Correlation ID: {normalizedError.metadata.correlationId}</p>
                )}
              </div>
            </div>
          )}

          {/* Contextual help messages based on error type */}
          {errorType === 'chunk' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Try clearing your browser cache or hard refreshing 
                the page (Ctrl+F5 or Cmd+Shift+R). This usually happens after app updates 
                when your browser has cached an older version.
              </p>
            </div>
          )}

          {normalizedError.metadata.domain === ErrorDomain.NETWORK && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <p className="text-sm text-orange-800">
                🌐 <strong>Network Issue:</strong> Check your internet connection and 
                try again. If the problem persists, our servers might be experiencing issues. 
                You can check our status page or try again in a few minutes.
              </p>
            </div>
          )}

          {normalizedError.metadata.severity === ErrorSeverity.CRITICAL && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                ⚠️ <strong>Critical Error:</strong> This error requires immediate attention 
                and may indicate a serious system problem. Please contact support with 
                Error ID <code className="font-mono text-xs">{errorReport.id}</code>.
              </p>
            </div>
          )}

          {/* Action buttons with intelligent prioritization based on recovery options */}
          <div className="space-y-2">
            {canRecover && normalizedError.shouldRetry(maxRetries) && (
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
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </Button>
            )}

            <Button
              onClick={handleReportError}
              className="w-full"
              variant="ghost"
              size="small"
            >
              <Bug className="h-4 w-4 mr-2" />
              Report this issue
            </Button>
          </div>

          {/* Status messages that provide additional context about recovery state */}
          {!canRecover && normalizedError.metadata.severity !== ErrorSeverity.CRITICAL && (
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
 * 
 * This specialized fallback provides a compact inline display specifically optimized
 * for network-related errors. It checks the browser's online status to provide more
 * specific guidance and uses network-appropriate styling and iconography.
 */
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const isOnline = navigator.onLine;

  const errorReporter = React.useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: process.env.NODE_ENV === 'development',
    }),
    []
  );

  const normalizedError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    // Handle case where error might not be a BaseError (shouldn't happen with proper typing)
    const errorMessage = (props.error as any)?.message || 'Network error occurred';
    return new NetworkError(errorMessage, {
      component: 'NetworkErrorFallback',
      errorContext: props.context,
      isOnline,
    });
  }, [props.error, props.context, isOnline]);

  const errorReport = React.useMemo(() => {
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
Domain: ${normalizedError.metadata.domain}
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
            {normalizedError.getUserMessage()}
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
              <Bug className="h-4 w-4 mr-2" />
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
 * 
 * This specialized fallback handles API-related errors with appropriate styling and
 * messaging. It distinguishes between network connectivity issues and API service
 * problems, providing targeted guidance for each scenario.
 */
export const ApiErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const isNetworkError = props.errorType === 'network' || props.errorType === 'timeout';

  const errorReporter = React.useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: process.env.NODE_ENV === 'development',
    }),
    []
  );

  const normalizedError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    // Handle case where error might not be a BaseError (shouldn't happen with proper typing)
    const errorMessage = (props.error as any)?.message || 'API error occurred';
    return isNetworkError
      ? new NetworkError(errorMessage, {
          component: 'ApiErrorFallback',
          errorContext: props.context,
        })
      : new ExternalServiceError(errorMessage, 'API', undefined, {
          component: 'ApiErrorFallback',
          errorContext: props.context,
        });
  }, [props.error, isNetworkError, props.context]);

  const errorReport = React.useMemo(() => {
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

  const severityColor = normalizedError.metadata.severity === ErrorSeverity.HIGH ? 'red' : 'orange';
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
            {normalizedError.getUserMessage()}
          </p>
          {normalizedError.metadata.severity === ErrorSeverity.HIGH && (
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
              <Bug className="h-3 w-3 mr-1" />
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
 * 
 * This provides a compact inline error display for component-level failures. It adapts
 * its styling based on error severity and provides minimal but effective recovery options.
 * This fallback is designed to be less intrusive than page-level fallbacks while still
 * giving users the information and actions they need.
 */
export const ComponentErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const errorReporter = React.useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: process.env.NODE_ENV === 'development',
    }),
    []
  );

  const normalizedError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    // Handle case where error might not be a BaseError (shouldn't happen with proper typing)
    const errorMessage = (props.error as any)?.message || 'Component error occurred';
    return props.errorType === 'chunk'
      ? new ExternalServiceError(errorMessage, 'Component', undefined, {
          component: 'ComponentErrorFallback',
          errorContext: props.context,
        })
      : new BaseError(errorMessage, {
          code: 'COMPONENT_ERROR',
          domain: ErrorDomain.SYSTEM,
          severity: props.errorSeverity || ErrorSeverity.MEDIUM,
          context: {
            component: 'ComponentErrorFallback',
            errorContext: props.context,
          },
          isOperational: true,
          statusCode: 500
        });
  }, [props.error, props.errorType, props.errorSeverity, props.context]);

  const errorReport = React.useMemo(() => {
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
    const { severity } = normalizedError.metadata;
    
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
            <Bug className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Chunk Error Fallback Component
 * 
 * This specialized fallback handles code-splitting failures with specific guidance
 * about caching and updates. Chunk loading errors typically occur when users have
 * an outdated cached version of the application after a deployment, so this component
 * emphasizes cache-clearing instructions and hard refresh options.
 */
export const ChunkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const errorReporter = React.useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: process.env.NODE_ENV === 'development',
    }),
    []
  );

  const normalizedError = React.useMemo(() => {
    if (props.error instanceof BaseError) {
      return props.error;
    }
    // Handle case where error might not be a BaseError (shouldn't happen with proper typing)
    const errorMessage = (props.error as any)?.message || 'Chunk loading error occurred';
    return new ExternalServiceError(errorMessage, 'Chunk', undefined, {
      component: 'ChunkErrorFallback',
      errorContext: props.context,
    });
  }, [props.error, props.context]);

  const errorReport = React.useMemo(() => {
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
            {normalizedError.getUserMessage()}
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

/**
 * Export all error classes from core for convenience
 * 
 * This re-export allows consumers of this module to import both the UI components
 * and the error classes from a single location, improving developer experience and
 * reducing import statement clutter.
 */
export {
  BaseError,
  ErrorDomain,
  ErrorSeverity,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  NetworkError,
  ExternalServiceError,
  ServiceUnavailableError,
  DatabaseError,
  CacheError,
  ConflictError,
  TooManyRequestsError
} from "@shared/core";



/**
 * Critical Error Fallback Component
 * 
 * This full-screen fallback is reserved for critical errors that prevent the application
 * from functioning. It emphasizes the severity of the situation while providing clear
 * paths to support. Technical details are always included for critical errors to help
 * support teams diagnose issues quickly.
 */
export const CriticalErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const errorReporter = React.useMemo(
    () => createErrorReporter({
      enableFeedback: true,
      enableTechnicalDetails: true,
    }),
    []
  );

  const normalizedError = React.useMemo(() => {
    if (props.error instanceof BaseError && props.error.metadata.severity === ErrorSeverity.CRITICAL) {
      return props.error;
    }
    return new BaseError(props.error.message, {
      code: 'CRITICAL_ERROR',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      context: {
        component: 'CriticalErrorFallback',
        errorContext: props.context,
      },
      isOperational: false,
      statusCode: 500
    });
  }, [props.error, props.context]);

  const errorReport = React.useMemo(() => {
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
Domain: ${normalizedError.metadata.domain}
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
            {normalizedError.getUserMessage()}
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
              <Bug className="h-4 w-4 mr-2" />
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