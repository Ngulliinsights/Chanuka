/**
 * Unified Security Error Handler
 * Consistent error handling across all security components
 */

import {
  SecurityError,
  SecurityErrorResult,
  SecurityErrorType,
  ErrorHandlingConfig,
  ErrorStatistics,
  SecurityEvent
} from './security-interface';
import { logger } from '@client/utils/logger';

export class SecurityErrorHandler {
  private config: ErrorHandlingConfig;
  private logger: SecurityLogger;
  private errorStats: ErrorStatistics;
  private errorCallbacks: ((error: SecurityErrorResult) => void)[] = [];

  constructor(config: ErrorHandlingConfig) {
    this.config = config;
    this.logger = new SecurityLogger(config.logLevel);
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {} as Record<SecurityErrorType, number>,
      errorsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      lastErrorTime: null,
      averageResolutionTime: 0,
    };
  }

  handleSecurityError(error: SecurityError): SecurityErrorResult {
    // Standardized error processing
    const result = this.processError(error);

    // Log based on severity
    this.logger.log(result.error.severity, result.error.message, result.error.context);

    // Report to backend if configured
    if (this.config.reportToBackend) {
      this.reportToBackend(result);
    }

    // Update statistics
    this.updateErrorStatistics(result);

    // Notify callbacks
    this.notifyErrorCallbacks(result);

    return result;
  }

  private processError(error: SecurityError): SecurityErrorResult {
    // Standard error processing logic
    const result: SecurityErrorResult = {
      id: this.generateSecureId(),
      error: {
        ...error,
        timestamp: new Date(),
        severity: this.assessSeverity(error),
      },
      handled: true,
      reported: false,
      suggestedAction: this.getSuggestedAction(error),
    };

    return result;
  }

  private generateSecureId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
  }

  private assessSeverity(error: SecurityError): 'low' | 'medium' | 'high' | 'critical' {
    // If severity is already set, use it
    if (error.severity) {
      return error.severity;
    }

    // Assess based on error type
    switch (error.type) {
      case SecurityErrorType.CSP_VIOLATION:
      case SecurityErrorType.INPUT_VALIDATION_FAILED:
      case SecurityErrorType.VULNERABILITY_DETECTED:
        return 'high';
      case SecurityErrorType.RATE_LIMIT_EXCEEDED:
      case SecurityErrorType.AUTHENTICATION_FAILED:
      case SecurityErrorType.CSRF_TOKEN_INVALID:
        return 'critical';
      case SecurityErrorType.CONFIGURATION_ERROR:
        return 'medium';
      case SecurityErrorType.NETWORK_ERROR:
      case SecurityErrorType.TIMEOUT_ERROR:
        return 'low';
      default:
        return 'medium';
    }
  }

  private getSuggestedAction(error: SecurityError): string {
    switch (error.type) {
      case SecurityErrorType.CSP_VIOLATION:
        return 'Review CSP policy and check for malicious content';
      case SecurityErrorType.INPUT_VALIDATION_FAILED:
        return 'Sanitize input and validate against schema';
      case SecurityErrorType.RATE_LIMIT_EXCEEDED:
        return 'Implement backoff strategy and reduce request frequency';
      case SecurityErrorType.AUTHENTICATION_FAILED:
        return 'Check credentials and re-authenticate';
      case SecurityErrorType.CSRF_TOKEN_INVALID:
        return 'Refresh CSRF token and retry request';
      case SecurityErrorType.VULNERABILITY_DETECTED:
        return 'Investigate and patch security vulnerability';
      case SecurityErrorType.CONFIGURATION_ERROR:
        return 'Review and correct configuration settings';
      case SecurityErrorType.NETWORK_ERROR:
        return 'Check network connectivity and retry';
      case SecurityErrorType.TIMEOUT_ERROR:
        return 'Increase timeout or optimize operation';
      default:
        return 'Review error details and take appropriate action';
    }
  }

  private async reportToBackend(result: SecurityErrorResult): Promise<void> {
    try {
      const response = await fetch('/api/security/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: result.error,
          handled: result.handled,
          suggestedAction: result.suggestedAction,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        result.reported = true;
      } else {
        this.logger.error('Failed to report security error to backend', {
          status: response.status,
          error: result.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error reporting security event to backend', {
        error: errorMessage,
        originalError: result.error,
      });
    }
  }

  private updateErrorStatistics(result: SecurityErrorResult): void {
    this.errorStats.totalErrors++;
    this.errorStats.lastErrorTime = new Date();

    // Update error count by type
    if (!this.errorStats.errorsByType[result.error.type]) {
      this.errorStats.errorsByType[result.error.type] = 0;
    }
    this.errorStats.errorsByType[result.error.type]++;

    // Update error count by severity
    this.errorStats.errorsBySeverity[result.error.severity]++;

    // Calculate average resolution time (simplified)
    const now = Date.now();
    const errorTime = result.error.timestamp.getTime();
    const resolutionTime = now - errorTime;

    this.errorStats.averageResolutionTime =
      (this.errorStats.averageResolutionTime + resolutionTime) / 2;
  }

  private notifyErrorCallbacks(result: SecurityErrorResult): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        this.logger.error('Error in error callback', { error });
      }
    });
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): ErrorStatistics {
    return { ...this.errorStats };
  }

  /**
   * Get error statistics summary
   */
  getErrorSummary(): {
    totalErrors: number;
    criticalErrors: number;
    highSeverityErrors: number;
    errorRate: number;
    topErrorTypes: Array<{ type: SecurityErrorType; count: number }>;
  } {
    const criticalErrors = this.errorStats.errorsBySeverity.critical;
    const highSeverityErrors = this.errorStats.errorsBySeverity.high + criticalErrors;

    // Calculate error rate (simplified - would need more context for accurate rate)
    const errorRate = this.errorStats.totalErrors > 0 ?
      this.errorStats.errorsBySeverity.critical / this.errorStats.totalErrors : 0;

    // Get top error types
    const topErrorTypes = Object.entries(this.errorStats.errorsByType)
      .map(([type, count]) => ({ type: type as SecurityErrorType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: this.errorStats.totalErrors,
      criticalErrors,
      highSeverityErrors,
      errorRate,
      topErrorTypes,
    };
  }

  /**
   * Subscribe to error notifications
   */
  onError(callback: (error: SecurityErrorResult) => void): () => void {
    this.errorCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear error statistics
   */
  clearStatistics(): void {
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {} as Record<SecurityErrorType, number>,
      errorsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      lastErrorTime: null,
      averageResolutionTime: 0,
    };
  }

  /**
   * Check if error handling is healthy
   */
  isHealthy(): boolean {
    const criticalErrors = this.errorStats.errorsBySeverity.critical;
    const totalErrors = this.errorStats.totalErrors;

    // Consider unhealthy if more than 10% of errors are critical
    return totalErrors === 0 || (criticalErrors / totalErrors) < 0.1;
  }

  /**
   * Get health status
   */
  getHealthStatus(): { enabled: boolean; status: string; lastCheck: Date; issues: string[] } {
    const issues: string[] = [];
    const isHealthy = this.isHealthy();

    if (!isHealthy) {
      issues.push('High rate of critical security errors detected');
    }

    if (this.errorStats.totalErrors > 100) {
      issues.push('High volume of security errors');
    }

    return {
      enabled: true,
      status: isHealthy ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      issues,
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): { requestsProcessed: number; threatsBlocked: number; averageResponseTime: number; errorRate: number } {
    const summary = this.getErrorSummary();
    return {
      requestsProcessed: 0, // Would need to track requests separately
      threatsBlocked: summary.criticalErrors + summary.highSeverityErrors,
      averageResponseTime: this.errorStats.averageResolutionTime,
      errorRate: summary.errorRate,
    };
  }

  /**
   * Shutdown the error handler
   */
  async shutdown(): Promise<void> {
    this.errorCallbacks = [];
    this.clearStatistics();
    this.logger.info('Security Error Handler shutdown complete');
  }
}

/**
 * Security Logger - Specialized logger for security events
 */
class SecurityLogger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = logLevel;
  }

  log(severity: 'low' | 'medium' | 'high' | 'critical', message: string, context?: Record<string, unknown>): void {
    // Map security severity to log level
    let logLevel: 'debug' | 'info' | 'warn' | 'error';
    switch (severity) {
      case 'low':
        logLevel = 'info';
        break;
      case 'medium':
        logLevel = 'warn';
        break;
      case 'high':
      case 'critical':
        logLevel = 'error';
        break;
      default:
        logLevel = 'info';
    }

    // Only log if severity meets threshold
    if (this.shouldLog(logLevel)) {
      const logData = {
        timestamp: new Date().toISOString(),
        severity,
        message,
        context,
      };

      switch (logLevel) {
        case 'info':
          console.info('[SECURITY]', logData);
          break;
        case 'warn':
          console.warn('[SECURITY]', logData);
          break;
        case 'error':
          console.error('[SECURITY]', logData);
          break;
      }
    }
  }

  private shouldLog(logLevel: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const logLevelIndex = levels.indexOf(logLevel);

    return logLevelIndex >= currentLevelIndex;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug('[SECURITY]', message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info('[SECURITY]', message, context);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn('[SECURITY]', message, context);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error('[SECURITY]', message, context);
    }
  }
}

/**
 * Security Error Factory - Create standardized security errors
 */
export class SecurityErrorFactory {
  static createError(
    type: SecurityErrorType,
    message: string,
    component: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ): SecurityError {
    return {
      type,
      message,
      severity: this.assessSeverity(type),
      component,
      timestamp: new Date(),
      context,
      originalError,
    };
  }

  private static assessSeverity(type: SecurityErrorType): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case SecurityErrorType.CSP_VIOLATION:
      case SecurityErrorType.INPUT_VALIDATION_FAILED:
      case SecurityErrorType.VULNERABILITY_DETECTED:
        return 'high';
      case SecurityErrorType.RATE_LIMIT_EXCEEDED:
      case SecurityErrorType.AUTHENTICATION_FAILED:
      case SecurityErrorType.CSRF_TOKEN_INVALID:
        return 'critical';
      case SecurityErrorType.CONFIGURATION_ERROR:
        return 'medium';
      case SecurityErrorType.NETWORK_ERROR:
      case SecurityErrorType.TIMEOUT_ERROR:
        return 'low';
      default:
        return 'medium';
    }
  }
}

/**
 * Security Operation Error - Error wrapper for security operations
 */
export class SecurityOperationError extends Error {
  constructor(
    public securityError: SecurityError,
    public errorResult: SecurityErrorResult
  ) {
    super(securityError.message);
    this.name = 'SecurityOperationError';
  }
}
