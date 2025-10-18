import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorFallback } from '../ui/error-fallbacks.js';
import { ErrorReportingService } from '../services/error-reporting.js';
import { ErrorType, ErrorSeverity, ErrorContextType, ErrorContext } from '../core/types.js';

interface Props {
  children: ReactNode;
  context?: ErrorContextType;
  fallbackComponent?: React.ComponentType<any>;
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
  context: ErrorContextType;
  retryCount: number;
  errorType: ErrorType;
  errorSeverity: ErrorSeverity;
  canRecover: boolean;
  onReportError?: () => void;
}

export class ErrorBoundaryHandler extends Component<Props, State> {
  private maxRetries: number;
  private retryDelay: number;
  private errorReportingService: ErrorReportingService;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  constructor(props: Props) {
    super(props);
    this.maxRetries = props.maxRetries || 3;
    this.retryDelay = props.retryDelay || 1000;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorType: 'unknown',
      errorSeverity: 'medium',
      lastErrorTime: 0,
      recoveryAttempts: 0,
    };
    this.errorReportingService = new ErrorReportingService();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorType = ErrorBoundaryHandler.classifyError(error);
    const errorSeverity = ErrorBoundaryHandler.assessSeverity(error, errorType);

    return {
      hasError: true,
      error,
      errorType,
      errorSeverity,
      lastErrorTime: Date.now(),
    };
  }

  private static classifyError(error: Error): ErrorType {
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

  private static assessSeverity(error: Error, errorType: ErrorType): ErrorSeverity {
    // Critical errors that require immediate attention
    if (errorType === 'security' || errorType === 'memory') {
      return 'critical';
    }

    // High severity errors that significantly impact functionality
    if (errorType === 'chunk' || errorType === 'javascript') {
      return 'high';
    }

    // Medium severity errors that can often be recovered from
    if (errorType === 'network' || errorType === 'timeout') {
      return 'medium';
    }

    return 'low';
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorType, errorSeverity } = this.state;

    this.setState({
      errorInfo,
    });

    // Enhanced error logging with context
    console.group(`🚨 ErrorBoundary Error [${errorType}/${errorSeverity}]`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Context:', this.props.context);
    console.groupEnd();

    // Collect enhanced error context
    const enhancedContext = this.collectErrorContext(error, errorInfo, errorType, errorSeverity);

    // Report error to monitoring service
    this.errorReportingService.reportError(error, enhancedContext);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorType);
    }

    // Attempt automatic recovery for certain error types
    if (this.props.enableRecovery !== false && this.canAttemptRecovery(errorType, errorSeverity)) {
      this.scheduleRecoveryAttempt();
    }
  }

  private collectErrorContext(error: Error, errorInfo: ErrorInfo, errorType: ErrorType, errorSeverity: ErrorSeverity) {
    return {
      // Basic context
      context: this.props.context || 'page',
      errorType,
      errorSeverity,
      retryCount: this.state.retryCount,
      recoveryAttempts: this.state.recoveryAttempts,

      // Error details
      errorInfo,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,

      // Environment context
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      timestamp: new Date().toISOString(),

      // Browser context
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : undefined,
      connection: typeof navigator !== 'undefined' && (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
      } : undefined,

      // Performance context
      memory: typeof performance !== 'undefined' && (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      } : undefined,
    };
  }

  private canAttemptRecovery(errorType: ErrorType, errorSeverity: ErrorSeverity) {
    // Only attempt recovery for recoverable types
    if (errorSeverity === 'critical') return false;
    if (errorType === 'javascript' || errorType === 'security') return false;
    return true;
  }

  private scheduleRecoveryAttempt() {
    if (this.recoveryTimer) return;
    this.recoveryTimer = setTimeout(() => {
      this.setState((s) => ({ retryCount: s.retryCount + 1 }));
      this.recoveryTimer = null;
    }, this.retryDelay);
  }

  componentDidMount() {
    // Start any performance observers or timers as needed
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        this.performanceObserver = new PerformanceObserver(() => {});
        // not actively observing here, placeholder
      }
    } catch (e) {
      // ignore observer errors in older browsers
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    if (this.performanceObserver) {
      try {
        this.performanceObserver.disconnect();
      } catch { /* ignore */ }
      this.performanceObserver = null;
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      recoveryAttempts: 0,
    });
  };

  reportError = () => {
    if (this.state.error) {
      const errorReport = {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        context: this.props.context || 'page',
        errorType: this.state.errorType,
        errorSeverity: this.state.errorSeverity,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        timestamp: new Date().toISOString(),
      };

      // Open bug report or send to support
      this.errorReportingService.createBugReport(errorReport);
    }
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      let FallbackComponent = this.props.fallbackComponent;

      // Use smart fallback selection if no specific fallback provided
      if (!FallbackComponent) {
        FallbackComponent = this.getSmartFallback();
      }

      const canRecover = this.state.retryCount < this.maxRetries &&
                         this.state.errorSeverity !== 'critical';

      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          context={this.props.context || 'page'}
          retryCount={this.state.retryCount}
          errorType={this.state.errorType}
          errorSeverity={this.state.errorSeverity}
          canRecover={canRecover}
          onReportError={this.reportError}
        />
      );
    }

    return this.props.children as React.ReactNode;
  }

  private getSmartFallback(): React.ComponentType<ErrorFallbackProps> {
    const { errorType, errorSeverity } = this.state;
    const context = this.props.context || 'page';

    // Critical errors get special treatment
    if (errorSeverity === 'critical') {
      return require('../ui/error-fallbacks.js').CriticalErrorFallback;
    }

    // Error type specific fallbacks
    if (errorType === 'chunk') {
      return require('../ui/error-fallbacks.js').ChunkErrorFallback;
    }

    if (errorType === 'network' || errorType === 'timeout') {
      return require('../ui/error-fallbacks.js').NetworkErrorFallback;
    }

    // Context specific fallbacks
    if (context === 'api') {
      return require('../ui/error-fallbacks.js').ApiErrorFallback;
    }

    if (context === 'component') {
      return require('../ui/error-fallbacks.js').ComponentErrorFallback;
    }

    // Default fallback
    return ErrorFallback;
  }
}

export default ErrorBoundaryHandler;
