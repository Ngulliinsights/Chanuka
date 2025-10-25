import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { ErrorSeverity } from '@shared/core';
import { EnhancedErrorBoundary, EnhancedErrorBoundaryProps } from '@shared/core';
import { BaseError, ErrorDomain } from '@shared/core';

export type ErrorType = 'javascript' | 'network' | 'chunk' | 'timeout' | 'memory' | 'security' | 'unknown';
export type ErrorContext = 'page' | 'component' | 'api' | 'navigation' | 'authentication' | 'data-loading';

interface Props {
  children: ReactNode;
  context?: ErrorContext;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorType: ErrorType) => void;
  enableRecovery?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  isolateErrors?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorType: ErrorType;
  errorSeverity: ErrorSeverity;
  lastErrorTime: number;
  recoveryAttempts: number;
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  context: ErrorContext;
  retryCount: number;
  errorType: ErrorType;
  errorSeverity: ErrorSeverity;
  canRecover: boolean;
  onReportError?: () => void;
}

// Legacy fallback adapter to maintain backward compatibility
function LegacyErrorFallbackAdapter(props: any) {
  const { error, errorId, recoveryOptions, onRetry, onFeedback, onReload, onContactSupport, recoveryAttempted, recoverySuccessful, userFeedbackSubmitted } = props;

  // Convert BaseError back to regular Error for legacy interface
  const legacyError = error instanceof BaseError ? error.cause || new Error(error.message) : error;

  // Map to legacy ErrorFallbackProps
  const legacyProps: ErrorFallbackProps = {
    error: legacyError,
    resetError: onRetry,
    context: 'page', // Default context
    retryCount: 0, // Not tracked in enhanced boundary
    errorType: 'unknown', // Would need mapping from BaseError
    errorSeverity: error instanceof BaseError ? error.metadata.severity : ErrorSeverity.MEDIUM,
    canRecover: recoveryOptions.length > 0,
    onReportError: onContactSupport,
  };

  return <ErrorFallback {...legacyProps} />;
}

// Adapter component that bridges PageErrorBoundary props to EnhancedErrorBoundary
class PageErrorBoundaryAdapter extends Component<Props> {
  private convertToEnhancedProps(props: Props): EnhancedErrorBoundaryProps {
    return {
      children: props.children,
      enableRecovery: props.enableRecovery !== false,
      maxRecoveryAttempts: props.maxRetries || 3,
      recoveryTimeout: props.retryDelay || 1000,
      showTechnicalDetails: false, // Legacy boundary doesn't show technical details by default
      onError: props.onError ? (error: BaseError, errorInfo: ErrorInfo) => {
        // Convert BaseError back to legacy error type for backward compatibility
        const legacyError = error.cause || new Error(error.message);
        const legacyErrorType = this.classifyError(legacyError);
        props.onError!(legacyError, errorInfo, legacyErrorType);
      } : undefined,
      fallback: props.fallbackComponent ? (fallbackProps) => {
        // Convert enhanced fallback props to legacy props
        const legacyProps: ErrorFallbackProps = {
          error: fallbackProps.error.cause || new Error(fallbackProps.error.message),
          resetError: fallbackProps.onRetry,
          context: 'page',
          retryCount: 0,
          errorType: 'unknown',
          errorSeverity: fallbackProps.error.metadata.severity,
          canRecover: fallbackProps.recoveryOptions.length > 0,
          onReportError: fallbackProps.onContactSupport,
        };
        return React.createElement(props.fallbackComponent!, legacyProps);
      } : LegacyErrorFallbackAdapter,
    };
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const name = error.name.toLowerCase();

    // Chunk loading errors
    if (name === 'chunkloaderror' || message.includes('chunk') || message.includes('loading chunk')) {
      return 'chunk';
    }

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('cors') ||
        message.includes('failed to fetch') || name === 'networkerror') {
      return 'network';
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted') || name === 'aborterror') {
      return 'timeout';
    }

    // Memory errors
    if (message.includes('memory') || message.includes('heap') || name === 'rangeerror') {
      return 'memory';
    }

    // Security errors
    if (message.includes('security') || message.includes('permission') || name === 'securityerror') {
      return 'security';
    }

    // JavaScript runtime errors
    if (name === 'typeerror' || name === 'referenceerror' || name === 'syntaxerror') {
      return 'javascript';
    }

    return 'unknown';
  }

  render() {
    const enhancedProps = this.convertToEnhancedProps(this.props);
    return <EnhancedErrorBoundary {...enhancedProps} />;
  }
}

// Legacy PageErrorBoundary class for backward compatibility
// This maintains the same interface but delegates to the enhanced boundary
class PageErrorBoundary extends Component<Props, State> {
  private adapterRef = React.createRef<PageErrorBoundaryAdapter>();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorType: 'unknown',
      errorSeverity: ErrorSeverity.MEDIUM,
      lastErrorTime: 0,
      recoveryAttempts: 0,
    };
  }

  // Legacy methods for backward compatibility - delegate to adapter
  resetError = () => {
    // This will be called by legacy fallback components
    // The adapter handles the actual reset through EnhancedErrorBoundary
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  reportError = () => {
    // Legacy error reporting - could integrate with enhanced boundary's reporting
    if (this.state.error) {
      console.error('Legacy error report:', this.state.error);
    }
  };

  render() {
    // Use the adapter component that bridges to EnhancedErrorBoundary
    return <PageErrorBoundaryAdapter ref={this.adapterRef} {...this.props} />;
  }

  // Legacy static methods for backward compatibility
  static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const name = error.name.toLowerCase();

    // Chunk loading errors (common in lazy-loaded components)
    if (name === 'chunkloaderror' || message.includes('chunk') || message.includes('loading chunk')) {
      return 'chunk';
    }

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('cors') ||
        message.includes('failed to fetch') || name === 'networkerror') {
      return 'network';
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted') || name === 'aborterror') {
      return 'timeout';
    }

    // Memory errors
    if (message.includes('memory') || message.includes('heap') || name === 'rangeerror') {
      return 'memory';
    }

    // Security errors
    if (message.includes('security') || message.includes('permission') || name === 'securityerror') {
      return 'security';
    }

    // JavaScript runtime errors
    if (name === 'typeerror' || name === 'referenceerror' || name === 'syntaxerror') {
      return 'javascript';
    }

    return 'unknown';
  }

  static assessSeverity(error: Error, errorType: ErrorType): ErrorSeverity {
    // Critical errors that require immediate attention
    if (errorType === 'security' || errorType === 'memory') {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors that significantly impact functionality
    if (errorType === 'chunk' || errorType === 'javascript') {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors that can often be recovered from
    if (errorType === 'network' || errorType === 'timeout') {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }
}


export default PageErrorBoundary;
