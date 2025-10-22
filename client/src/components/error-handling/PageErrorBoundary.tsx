import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { logger } from '@/utils/browser-logger';

export type ErrorType = 'javascript' | 'network' | 'chunk' | 'timeout' | 'memory' | 'security' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
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

class PageErrorBoundary extends Component<Props, State> {
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
    const errorType = PageErrorBoundary.classifyError(error);
    const errorSeverity = PageErrorBoundary.assessSeverity(error, errorType);
    
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
    console.group(`🚨 PageErrorBoundary Error [${errorType}/${errorSeverity}]`);
    logger.error('Error:', { component: 'Chanuka' }, error);
    logger.error('Error Info:', { component: 'Chanuka' }, errorInfo);
    logger.error('Component Stack:', { component: 'Chanuka' }, errorInfo.componentStack);
    logger.error('Context:', { component: 'Chanuka' }, this.props.context);
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
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      
      // Browser context
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
      } : null,
      
      // Performance context
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : null,
      
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
    try {
      return localStorage.getItem('userId') || sessionStorage.getItem('userId');
    } catch {
      return null;
    }
  }

  private getSessionId(): string | null {
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

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('error', this.handleResourceError, true);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  private setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
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
    if (document.visibilityState === 'visible' && this.state.hasError) {
      // Page became visible again, check if we should attempt recovery
      const timeSinceError = Date.now() - this.state.lastErrorTime;
      if (timeSinceError > 30000) { // 30 seconds
        logger.info('Page became visible after error, attempting recovery', { component: 'Chanuka' });
        this.resetError();
      }
    }
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    logger.error('Unhandled promise rejection:', { component: 'Chanuka' }, reason);
    
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
      url: window.location.href,
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
    logger.error('Global error:', { component: 'Chanuka' }, event.error);
    
    const error = event.error || new Error(event.message);
    const errorType = PageErrorBoundary.classifyError(error);
    
    // Report global error with enhanced context
    this.errorReportingService.reportError(error, {
      context: 'global',
      errorType,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  };

  handleResourceError = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'IMG')) {
      const resourceUrl = (target as any).src || (target as any).href;
      logger.error('Resource loading error:', { component: 'Chanuka' }, resourceUrl);
      
      this.errorReportingService.reportError(
        new Error(`Failed to load resource: ${resourceUrl}`),
        {
          context: 'resource',
          errorType: 'network',
          resourceType: target.tagName.toLowerCase(),
          resourceUrl,
          url: window.location.href,
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
      window.location.reload();
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
        userAgent: navigator.userAgent,
        url: window.location.href,
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
      return require('./ErrorFallback').CriticalErrorFallback;
    }

    // Error type specific fallbacks
    if (errorType === 'chunk') {
      return require('./ErrorFallback').ChunkErrorFallback;
    }
    
    if (errorType === 'network' || errorType === 'timeout') {
      return require('./ErrorFallback').NetworkErrorFallback;
    }
    
    // Context specific fallbacks
    if (context === 'api') {
      return require('./ErrorFallback').ApiErrorFallback;
    }
    
    if (context === 'component') {
      return require('./ErrorFallback').ComponentErrorFallback;
    }

    // Default fallback
    return ErrorFallback;
  }
}

// Enhanced error reporting service for centralized error handling
class ErrorReportingService {
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceIssue[] = [];
  private isOnline = navigator.onLine;
  private maxQueueSize = 100;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Load persisted errors on initialization
    this.loadPersistedErrors();
  }

  reportError(error: Error, metadata: Record<string, any> = {}) {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      metadata,
      timestamp: new Date().toISOString(),
      id: this.generateErrorId(),
    };

    // Add to queue (with size limit)
    this.errorQueue.push(errorReport);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushErrorQueue();
    }

    // Store in localStorage for persistence
    this.persistErrorQueue();
  }

  reportPerformanceIssue(issue: Omit<PerformanceIssue, 'id' | 'timestamp'>) {
    const performanceIssue: PerformanceIssue = {
      ...issue,
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
    };

    this.performanceQueue.push(performanceIssue);
    if (this.performanceQueue.length > this.maxQueueSize) {
      this.performanceQueue.shift();
    }

    if (this.isOnline) {
      this.flushPerformanceQueue();
    }
  }

  reportRecoveryAttempt(data: RecoveryAttempt) {
    logger.info('Recovery attempt:', { component: 'Chanuka' }, data);
    // In a real application, this would be sent to analytics
  }

  reportMaxRetriesReached(data: MaxRetriesReached) {
    console.warn('Max retries reached:', data);
    // In a real application, this would trigger alerts
  }

  createBugReport(errorReport: any) {
    const subject = encodeURIComponent(`Error Report: ${errorReport.error.name}`);
    const body = encodeURIComponent(`
Error Details:
- Message: ${errorReport.error.message}
- Type: ${errorReport.errorType}
- Severity: ${errorReport.errorSeverity}
- Context: ${errorReport.context}
- URL: ${errorReport.url}
- User Agent: ${errorReport.userAgent}
- Timestamp: ${errorReport.timestamp}

Stack Trace:
${errorReport.error.stack}

Component Stack:
${errorReport.errorInfo?.componentStack || 'N/A'}
    `);
    
    // Open email client or redirect to bug report form
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  }

  private handleOnline = () => {
    this.isOnline = true;
    logger.info('Connection restored, flushing error queues', { component: 'Chanuka' });
    this.flushErrorQueue();
    this.flushPerformanceQueue();
  };

  private handleOffline = () => {
    this.isOnline = false;
    logger.info('Connection lost, errors will be queued', { component: 'Chanuka' });
  };

  private async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    const queueCopy = [...this.errorQueue];
    
    try {
      console.log(`Sending ${queueCopy.length} error reports`);
      
      // Simulate API call to error reporting service
      await this.sendErrorReports(queueCopy);
      
      // Clear queue on successful send
      this.errorQueue = [];
      this.persistErrorQueue();
      logger.info('Error reports sent successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Failed to send error reports:', { component: 'Chanuka' }, error);
      // Keep errors in queue for retry
    }
  }

  private async flushPerformanceQueue() {
    if (this.performanceQueue.length === 0) return;

    const queueCopy = [...this.performanceQueue];
    
    try {
      console.log(`Sending ${queueCopy.length} performance reports`);
      
      // Simulate API call to performance monitoring service
      await this.sendPerformanceReports(queueCopy);
      
      // Clear queue on successful send
      this.performanceQueue = [];
      logger.info('Performance reports sent successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Failed to send performance reports:', { component: 'Chanuka' }, error);
      // Keep performance issues in queue for retry
    }
  }

  private async sendErrorReports(reports: ErrorReport[]) {
    // This would be replaced with actual API call to your error reporting service
    // For example: Sentry, LogRocket, or custom endpoint
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional network failures
        if (Math.random() > 0.9) {
          reject(new Error('Network error'));
        } else {
          resolve(reports);
        }
      }, 100); // Simulate network delay
    });
  }

  private async sendPerformanceReports(reports: PerformanceIssue[]) {
    // This would be replaced with actual API call to your performance monitoring service
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.95) {
          reject(new Error('Network error'));
        } else {
          resolve(reports);
        }
      }, 50);
    });
  }

  private persistErrorQueue() {
    try {
      const data = {
        errors: this.errorQueue,
        performance: this.performanceQueue,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('errorQueue', JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to persist error queue:', { component: 'Chanuka' }, error);
    }
  }

  private loadPersistedErrors() {
    try {
      const stored = localStorage.getItem('errorQueue');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Load errors if they're not too old (24 hours)
        const storedTime = new Date(data.timestamp).getTime();
        const now = new Date().getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - storedTime < maxAge) {
          this.errorQueue = data.errors || [];
          this.performanceQueue = data.performance || [];
          console.log(`Loaded ${this.errorQueue.length} persisted errors and ${this.performanceQueue.length} performance issues`);
        } else {
          // Clear old data
          localStorage.removeItem('errorQueue');
        }
      }
    } catch (error) {
      logger.error('Failed to load persisted errors:', { component: 'Chanuka' }, error);
      // Clear corrupted data
      localStorage.removeItem('errorQueue');
    }
  }

  private clearPersistedErrors() {
    try {
      localStorage.removeItem('errorQueue');
    } catch (error) {
      logger.error('Failed to clear persisted errors:', { component: 'Chanuka' }, error);
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  name: string;
  metadata: Record<string, any>;
  timestamp: string;
}

interface PerformanceIssue {
  id: string;
  type: string;
  duration?: number;
  startTime?: number;
  url: string;
  timestamp: string;
}

interface RecoveryAttempt {
  retryCount: number;
  maxRetries: number;
  context: string;
  timestamp: string;
}

interface MaxRetriesReached {
  retryCount: number;
  maxRetries: number;
  context: string;
  timestamp: string;
}

export default PageErrorBoundary;
