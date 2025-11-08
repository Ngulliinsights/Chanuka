import { errorHandler, AppError, ErrorType, ErrorSeverity } from './unified-error-handler';
import { logger } from './browser-logger';

/**
 * Error Reporting Service
 * Handles centralized error reporting and analytics
 */
export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private reportingEndpoint: string;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  private pendingReports: AppError[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isEnabled: boolean = true;

  private constructor() {
    this.reportingEndpoint = this.getReportingEndpoint();
    this.startPeriodicFlush();
  }

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  private getReportingEndpoint(): string {
    // Try to get from environment or use default
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ERROR_REPORTING_URL) {
      return import.meta.env.VITE_ERROR_REPORTING_URL;
    }
    return '/api/errors/report';
  }

  /**
   * Report an error to external monitoring service
   */
  async reportError(error: AppError): Promise<void> {
    if (!this.isEnabled) return;

    // Add to pending reports for batching
    this.pendingReports.push(error);

    // Flush immediately if batch size reached or critical error
    if (this.pendingReports.length >= this.batchSize || error.severity === ErrorSeverity.CRITICAL) {
      await this.flushReports();
    }
  }

  /**
   * Flush pending error reports
   */
  private async flushReports(): Promise<void> {
    if (this.pendingReports.length === 0) return;

    const reports = [...this.pendingReports];
    this.pendingReports = [];

    try {
      const response = await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: reports,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to report errors: ${response.status}`);
      }

      logger.info('Error reports sent successfully', {
        component: 'ErrorReportingService',
        count: reports.length,
      });
    } catch (reportError) {
      logger.error('Failed to send error reports', {
        component: 'ErrorReportingService',
        error: reportError,
        pendingCount: reports.length,
      });

      // Re-queue reports for retry (up to a limit)
      if (this.pendingReports.length < this.batchSize * 2) {
        this.pendingReports.unshift(...reports);
      }
    }
  }

  /**
   * Start periodic flushing of error reports
   */
  private startPeriodicFlush(): void {
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => {
        this.flushReports().catch(error => {
          logger.error('Error during periodic flush', {
            component: 'ErrorReportingService',
            error,
          });
        });
      }, this.flushInterval);
    }
  }

  /**
   * Stop periodic flushing
   */
  private stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Configure the reporting service
   */
  configure(options: {
    endpoint?: string;
    batchSize?: number;
    flushInterval?: number;
    enabled?: boolean;
  }): void {
    if (options.endpoint) {
      this.reportingEndpoint = options.endpoint;
    }
    if (options.batchSize !== undefined) {
      this.batchSize = Math.max(1, options.batchSize);
    }
    if (options.flushInterval !== undefined) {
      this.flushInterval = Math.max(5000, options.flushInterval);
      this.restartPeriodicFlush();
    }
    if (options.enabled !== undefined) {
      this.isEnabled = options.enabled;
    }
  }

  /**
   * Restart periodic flush with new interval
   */
  private restartPeriodicFlush(): void {
    this.stopPeriodicFlush();
    this.startPeriodicFlush();
  }

  /**
   * Get reporting statistics
   */
  getStats() {
    return {
      pendingReports: this.pendingReports.length,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval,
      isEnabled: this.isEnabled,
      endpoint: this.reportingEndpoint,
    };
  }

  /**
   * Force flush all pending reports
   */
  async forceFlush(): Promise<void> {
    await this.flushReports();
  }

  /**
   * Clear all pending reports
   */
  clearPendingReports(): void {
    this.pendingReports = [];
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    this.stopPeriodicFlush();
    this.clearPendingReports();
  }
}

// Global error reporting service instance
export const errorReporting = ErrorReportingService.getInstance();

/**
 * Initialize error reporting integration with the unified error handler
 */
export function initializeErrorReporting(): void {
  // Add error listener to the unified error handler
  errorHandler.addErrorListener((error: AppError) => {
    // Only report certain types of errors to external service
    if (shouldReportError(error)) {
      errorReporting.reportError(error).catch(reportError => {
        logger.error('Failed to report error to external service', {
          component: 'ErrorReporting',
          error: reportError,
          originalError: error,
        });
      });
    }
  });

  logger.info('Error reporting integration initialized', {
    component: 'ErrorReporting',
  });
}

/**
 * Determine if an error should be reported to external monitoring
 */
function shouldReportError(error: AppError): boolean {
  // Don't report low severity errors in production
  if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.LOW) {
    return false;
  }

  // Always report critical errors
  if (error.severity === ErrorSeverity.CRITICAL) {
    return true;
  }

  // Report network and server errors
  if (error.type === ErrorType.NETWORK || error.type === ErrorType.SERVER) {
    return true;
  }

  // Report authentication errors (but not validation errors from user input)
  if (error.type === ErrorType.AUTHENTICATION) {
    return true;
  }

  // Report client errors that are not recoverable (likely bugs)
  if (error.type === ErrorType.CLIENT && !error.recoverable) {
    return true;
  }

  return false;
}

/**
 * Utility function to report custom errors
 */
export function reportCustomError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: any,
  context?: Record<string, any>
): void {
  const error = errorHandler.handleError({
    type,
    severity,
    message,
    details,
    context,
    recoverable: false,
    retryable: false,
  });

  // Force immediate reporting for custom errors
  errorReporting.reportError(error).catch(reportError => {
    logger.error('Failed to report custom error', {
      component: 'ErrorReporting',
      error: reportError,
      customError: error,
    });
  });
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    errorReporting.forceFlush().catch(error => {
      console.error('Failed to flush error reports on unload:', error);
    });
  });
}