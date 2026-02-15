/**
 * Error Analytics Bridge
 * Bridge between error handling and analytics
 * Tracks errors as analytics events
 */

import { analyticsService } from '@/core/analytics/service';
import type { ErrorData } from '@/core/analytics/service';
import { logger } from '@client/lib/utils/logger';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error tracking options
 */
export interface ErrorTrackingOptions {
  severity?: ErrorSeverity;
  category?: string;
  metadata?: Record<string, unknown>;
  skipAnalytics?: boolean;
}

/**
 * Error Analytics Bridge
 * Provides integration between error handling and analytics tracking
 */
export class ErrorAnalyticsBridge {
  /**
   * Track an error as an analytics event
   */
  static async trackError(
    error: Error,
    options: ErrorTrackingOptions = {}
  ): Promise<void> {
    try {
      // Skip analytics if requested
      if (options.skipAnalytics) {
        return;
      }

      // Determine severity
      const severity = options.severity || this.determineSeverity(error);

      // Create error data for analytics
      const errorData: ErrorData = {
        message: error.message,
        stack: error.stack,
        severity,
        metadata: {
          name: error.name,
          category: options.category || 'uncategorized',
          timestamp: new Date().toISOString(),
          ...options.metadata,
        },
      };

      // Track error in analytics
      await analyticsService.trackError(errorData);

      logger.info('Error tracked in analytics', {
        message: error.message,
        severity,
      });
    } catch (trackingError) {
      // Don't throw if analytics tracking fails
      logger.error('Failed to track error in analytics', {
        originalError: error.message,
        trackingError,
      });
    }
  }

  /**
   * Track a custom error message
   */
  static async trackErrorMessage(
    message: string,
    options: ErrorTrackingOptions = {}
  ): Promise<void> {
    const error = new Error(message);
    await this.trackError(error, options);
  }

  /**
   * Track a validation error
   */
  static async trackValidationError(
    field: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackErrorMessage(message, {
      severity: 'low',
      category: 'validation',
      metadata: {
        field,
        ...metadata,
      },
    });
  }

  /**
   * Track a network error
   */
  static async trackNetworkError(
    url: string,
    statusCode: number,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackErrorMessage(message, {
      severity: statusCode >= 500 ? 'high' : 'medium',
      category: 'network',
      metadata: {
        url,
        statusCode,
        ...metadata,
      },
    });
  }

  /**
   * Track an API error
   */
  static async trackApiError(
    endpoint: string,
    method: string,
    statusCode: number,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackErrorMessage(message, {
      severity: statusCode >= 500 ? 'high' : 'medium',
      category: 'api',
      metadata: {
        endpoint,
        method,
        statusCode,
        ...metadata,
      },
    });
  }

  /**
   * Track a component error (React error boundary)
   */
  static async trackComponentError(
    componentName: string,
    error: Error,
    errorInfo?: { componentStack?: string },
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackError(error, {
      severity: 'high',
      category: 'component',
      metadata: {
        componentName,
        componentStack: errorInfo?.componentStack,
        ...metadata,
      },
    });
  }

  /**
   * Track a state management error
   */
  static async trackStateError(
    action: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackErrorMessage(message, {
      severity: 'medium',
      category: 'state',
      metadata: {
        action,
        ...metadata,
      },
    });
  }

  /**
   * Track a WebSocket error
   */
  static async trackWebSocketError(
    event: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackErrorMessage(message, {
      severity: 'medium',
      category: 'websocket',
      metadata: {
        event,
        ...metadata,
      },
    });
  }

  /**
   * Track a performance error
   */
  static async trackPerformanceError(
    metric: string,
    threshold: number,
    actual: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackErrorMessage(
      `Performance threshold exceeded: ${metric}`,
      {
        severity: 'low',
        category: 'performance',
        metadata: {
          metric,
          threshold,
          actual,
          ...metadata,
        },
      }
    );
  }

  /**
   * Determine error severity based on error type and message
   */
  private static determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Critical errors
    if (
      name.includes('security') ||
      name.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      name.includes('syntax') ||
      name.includes('reference') ||
      name.includes('type') ||
      message.includes('crash') ||
      message.includes('fatal')
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      name.includes('network') ||
      name.includes('timeout') ||
      message.includes('failed to fetch') ||
      message.includes('connection')
    ) {
      return 'medium';
    }

    // Default to low severity
    return 'low';
  }
}

/**
 * Convenience function for tracking errors
 */
export const trackError = ErrorAnalyticsBridge.trackError.bind(
  ErrorAnalyticsBridge
);

/**
 * Convenience function for tracking error messages
 */
export const trackErrorMessage = ErrorAnalyticsBridge.trackErrorMessage.bind(
  ErrorAnalyticsBridge
);

/**
 * Export the bridge class as default
 */
export default ErrorAnalyticsBridge;
