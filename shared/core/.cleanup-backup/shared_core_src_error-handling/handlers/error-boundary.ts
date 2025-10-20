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

class ErrorBoundaryHandler extends Component<Props, State> {
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : undefined,

      // Application context
      reactVersion: React.version,
      buildTime: process.env.REACT_APP_BUILD_TIME,
      environment: process.env.NODE_ENV,

      // User context (if available)
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
    };
  }

  private getUserId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('userId') || sessionStorage.getItem('userId');
    } catch {
      return null;
    }
  }

  private getSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem('sessionId');
    } catch {
      return null;
    }
  }

  private canAttemptRecovery(errorType: ErrorType, errorSeverity: ErrorSeverity): boolean {
    // Don't attempt recovery for critical errors
    if (errorSeverity === 'critical') {
      return false;
    }

    // Don't attempt recovery if we've already tried too many times
    if (this.state.recoveryAttempts >= 2) {
      return false;
    }

    // Only attempt recovery for certain error types
    return ['network', 'timeout', 'chunk'].includes(errorType);
  }

  private scheduleRecoveryAttempt() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    const delay = this.retryDelay * Math.pow(2, this.state.recoveryAttempts); // Exponential backoff

    this.recoveryTimer = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        recoveryAttempts: prevState.recoveryAttempts + 1,
      }));
    }, delay);
  }

  componentDidMount() {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handlePromiseRejection);

      // Handle global JavaScript errors
      window.addEventListener('error', this.handleGlobalError);

      // Handle resource loading errors
      window.addEventListener('error', this.handleResourceError, true);

      // Monitor performance issues
      this.setupPerformanceMonitoring();

      // Handle visibility changes (tab switching)
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
      window.removeEventListener('error', this.handleGlobalError);
      window.removeEventListener('error', this.handleResourceError, true);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  private setupPerformanceMonitoring() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            // Monitor long tasks that might indicate performance issues
            if (entry.entryType === 'longtask' && entry.duration > 100) {
              console.warn('Long task detected:', entry);
              this.errorReportingService.reportPerformanceIssue({
                type: 'longtask',
                duration: entry.duration,
                startTime: entry.startTime,
                url: window.location.href,
              });
            }
          });
        });

        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;

    if (document.visibilityState === 'visible' && this.state.hasError) {
      // Page became visible again, check if we should attempt recovery
      const timeSinceError = Date.now() - this.state.lastErrorTime;
      if (timeSinceError > 30000) { // 30 seconds
        console.log('Page became visible after error, attempting recovery');
        this.resetError();
      }
    }
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    console.error('Unhandled promise rejection:', reason);

    // Create a proper error object from the rejection reason
    let error: Error;
    if (reason instanceof Error) {
      error = reason;
    } else if (typeof reason === 'string') {
      error = new Error(`Unhandled Promise Rejection: ${reason}`);
    } else {
      error = new Error(`Unhandled Promise Rejection: ${JSON.stringify(reason)}`);
    }

    const errorType = this.classifyPromiseRejection(reason);

    // Report promise rejection with enhanced context
    this.errorReportingService.reportError(error, {
      context: 'promise',
      errorType,
      rejectionReason: reason,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    });

    // Don't prevent default for network errors as they might be handled elsewhere
    if (errorType !== 'network') {
      event.preventDefault();
    }
  };

  private classifyPromiseRejection(reason: any): ErrorType {
    if (reason && typeof reason === 'object') {
      if (reason.name === 'AbortError' || reason.code === 20) {
        return 'timeout';
      }
      if (reason.name === 'NetworkError' || reason.message?.includes('fetch')) {
        return 'network';
      }
      if (reason.name === 'ChunkLoadError') {
        return 'chunk';
      }
    }

    if (typeof reason === 'string') {
      const lowerReason = reason.toLowerCase();
      if (lowerReason.includes('network') || lowerReason.includes('fetch')) {
        return 'network';
      }
      if (lowerReason.includes('chunk') || lowerReason.includes('loading')) {
        return 'chunk';
      }
    }

    return 'unknown';
  }

  handleGlobalError = (event: ErrorEvent) => {
    console.error('Global error:', event.error);

    const error = event.error || new Error(event.message);
    const errorType = ErrorBoundaryHandler.classifyError(error);

    // Report global error with enhanced context
    this.errorReportingService.reportError(error, {
      context: 'global',
      errorType,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    });
  };

  handleResourceError = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'IMG')) {
      const resourceUrl = (target as any).src || (target as any).href;
      console.error('Resource loading error:', resourceUrl);

      this.errorReportingService.reportError(
        new Error(`Failed to load resource: ${resourceUrl}`),
        {
          context: 'resource',
          errorType: 'network',
          resourceType: target.tagName.toLowerCase(),
          resourceUrl,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          timestamp: new Date().toISOString(),
        }
      );
    }
  };

  resetError = () => {
    const newRetryCount = this.state.retryCount + 1;

    // Clear any pending recovery timer
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    if (newRetryCount <= this.maxRetries) {
      console.log(`Attempting error recovery (${newRetryCount}/${this.maxRetries})`);

      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: newRetryCount,
        lastErrorTime: 0,
      });

      // Report recovery attempt
      this.errorReportingService.reportRecoveryAttempt({
        retryCount: newRetryCount,
        maxRetries: this.maxRetries,
        context: this.props.context || 'page',
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn('Max retries reached, forcing page reload');

      // Report max retries reached
      this.errorReportingService.reportMaxRetriesReached({
        retryCount: newRetryCount,
        maxRetries: this.maxRetries,
        context: this.props.context || 'page',
        timestamp: new Date().toISOString(),
      });

      // Force page reload as last resort
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
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

  render() {
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

    return this.props.children;
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

export { ErrorBoundaryHandler };




































