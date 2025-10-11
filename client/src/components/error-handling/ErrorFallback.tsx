import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { ErrorFallbackProps } from './PageErrorBoundary';
import { logger } from '../utils/logger.js';

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

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleReportBug = () => {
    if (onReportError) {
      onReportError();
    } else {
      // Fallback to email
      const subject = encodeURIComponent(`Error Report: ${error.name} [${errorType}/${errorSeverity}]`);
      const body = encodeURIComponent(`
Error Details:
- Message: ${error.message}
- Type: ${errorType}
- Severity: ${errorSeverity}
- Context: ${context}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}
- Timestamp: ${new Date().toISOString()}

Stack Trace:
${error.stack}
      `);
      
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
    }
  };

  const getContextualMessage = () => {
    // Customize message based on error type and severity
    if (errorType === 'network') {
      return 'There was a problem connecting to our services. Please check your internet connection.';
    }
    
    if (errorType === 'chunk') {
      return 'Failed to load part of the application. This might be due to a network issue or an outdated cache.';
    }
    
    if (errorType === 'timeout') {
      return 'The operation took too long to complete. Please try again.';
    }
    
    if (errorType === 'memory') {
      return 'The application is using too much memory. Please close other tabs and try again.';
    }
    
    if (errorType === 'security') {
      return 'A security restriction prevented the operation from completing.';
    }
    
    // Context-based messages
    switch (context) {
      case 'page':
        return 'This page encountered an unexpected error and cannot be displayed.';
      case 'component':
        return 'A component on this page failed to load properly.';
      case 'api':
        return 'There was a problem connecting to our services.';
      case 'navigation':
        return 'Navigation failed. Please try refreshing the page.';
      case 'authentication':
        return 'Authentication failed. Please try logging in again.';
      case 'data-loading':
        return 'Failed to load data. Please check your connection and try again.';
      default:
        return 'An unexpected error occurred.';
    }
  };

  const getContextualIcon = () => {
    // Icon based on error severity
    if (errorSeverity === 'critical') {
      return <AlertTriangle className="h-12 w-12 text-red-600" />;
    }
    
    if (errorSeverity === 'high') {
      return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }
    
    if (errorSeverity === 'medium') {
      return <AlertTriangle className="h-12 w-12 text-orange-500" />;
    }
    
    // Low severity or context-based
    switch (context) {
      case 'api':
      case 'network':
        return <AlertTriangle className="h-12 w-12 text-orange-400" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" showText={true} />
          </div>
          <div className="flex justify-center mb-4">
            {getContextualIcon()}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-gray-600">
            {getContextualMessage()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">Error Details:</p>
              <p className="text-xs text-gray-600 font-mono break-all mb-2">
                {error.message}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Type: {errorType}</p>
                <p>Severity: {errorSeverity}</p>
                <p>Context: {context}</p>
                {retryCount > 0 && (
                  <p>Retry attempt: {retryCount}/{maxRetries}</p>
                )}
              </div>
            </div>
          )}

          {/* Error type specific information */}
          {errorType === 'chunk' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                💡 Try clearing your browser cache or hard refreshing the page (Ctrl+F5).
              </p>
            </div>
          )}

          {errorType === 'network' && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <p className="text-sm text-orange-800">
                🌐 Check your internet connection and try again.
              </p>
            </div>
          )}

          {errorSeverity === 'critical' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                ⚠️ This is a critical error that requires immediate attention.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {canRecover && (
              <Button
                onClick={resetError}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button
              onClick={handleReload}
              className="w-full"
              variant={canRecover ? "outline" : "default"}
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
              onClick={handleReportBug}
              className="w-full"
              variant="ghost"
              size="sm"
            >
              <Bug className="h-4 w-4 mr-2" />
              Report this issue
            </Button>
          </div>

          {/* Recovery status message */}
          {!canRecover && errorSeverity !== 'critical' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                Maximum retry attempts reached. Please reload the page or contact support if the problem persists.
              </p>
            </div>
          )}

          {errorSeverity === 'critical' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                This is a critical error that cannot be automatically recovered. Please contact support immediately.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Specialized error fallback for API errors
export const ApiErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const isNetworkError = props.errorType === 'network' || props.errorType === 'timeout';
  
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-md p-4 m-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            {isNetworkError ? 'Connection Problem' : 'API Error'}
          </h3>
          <p className="text-sm text-orange-700 mt-1">
            {isNetworkError 
              ? 'Unable to connect to our services. Please check your internet connection and try again.'
              : 'There was a problem processing your request. Please try again.'
            }
          </p>
          {props.errorSeverity === 'high' && (
            <p className="text-xs text-orange-600 mt-1">
              Error: {props.error.message}
            </p>
          )}
          <div className="mt-3 flex space-x-2">
            {props.canRecover && (
              <Button
                onClick={props.resetError}
                size="sm"
                variant="outline"
                className="text-orange-800 border-orange-300 hover:bg-orange-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {props.onReportError && (
              <Button
                onClick={props.onReportError}
                size="sm"
                variant="ghost"
                className="text-orange-700 hover:bg-orange-100"
              >
                <Bug className="h-3 w-3 mr-1" />
                Report
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for component errors
export const ComponentErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const getSeverityColor = () => {
    switch (props.errorSeverity) {
      case 'critical': return 'red';
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'yellow';
      default: return 'gray';
    }
  };

  const color = getSeverityColor();
  
  return (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-md p-4 m-2`}>
      <div className="flex items-start">
        <AlertTriangle className={`h-4 w-4 text-${color}-500 mr-2 mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-${color}-800 font-medium`}>
            Component Error ({props.errorType})
          </p>
          <p className={`text-xs text-${color}-700 mt-1`}>
            {props.errorType === 'chunk' 
              ? 'Failed to load component code. Try refreshing the page.'
              : 'This component failed to render properly.'
            }
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className={`text-xs text-${color}-600 mt-1 font-mono break-all`}>
              {props.error.message}
            </p>
          )}
        </div>
        <div className="flex space-x-1 ml-2">
          {props.canRecover && (
            <Button
              onClick={props.resetError}
              size="sm"
              variant="ghost"
              className={`text-${color}-800 hover:bg-${color}-100`}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          {props.onReportError && (
            <Button
              onClick={props.onReportError}
              size="sm"
              variant="ghost"
              className={`text-${color}-700 hover:bg-${color}-100`}
            >
              <Bug className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for chunk loading errors
export const ChunkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const handleHardRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 m-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Loading Error
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Failed to load part of the application. This usually happens when the app has been updated.
          </p>
          <div className="mt-3 flex space-x-2">
            <Button
              onClick={handleHardRefresh}
              size="sm"
              variant="outline"
              className="text-blue-800 border-blue-300 hover:bg-blue-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Page
            </Button>
            {props.canRecover && (
              <Button
                onClick={props.resetError}
                size="sm"
                variant="ghost"
                className="text-blue-700 hover:bg-blue-100"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for network errors
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const isOnline = navigator.onLine;
  
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-md p-4 m-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            Network Error
          </h3>
          <p className="text-sm text-orange-700 mt-1">
            {!isOnline 
              ? 'You appear to be offline. Please check your internet connection.'
              : 'Unable to connect to our servers. Please try again.'
            }
          </p>
          <div className="mt-3 flex space-x-2">
            {props.canRecover && (
              <Button
                onClick={props.resetError}
                size="sm"
                variant="outline"
                className="text-orange-800 border-orange-300 hover:bg-orange-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Specialized error fallback for critical errors
export const CriticalErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const handleContactSupport = () => {
    if (props.onReportError) {
      props.onReportError();
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
            A critical error has occurred that prevents the application from functioning properly.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800 font-medium">
              Error Type: {props.errorType}
            </p>
            <p className="text-xs text-red-700 mt-1">
              {props.error.message}
            </p>
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