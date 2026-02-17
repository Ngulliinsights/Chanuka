import { analyticsConfig } from '@shared/config/analytics.config';
import { logger } from '@server/infrastructure/observability';
import { performanceMonitor } from '@shared/core/performance/index';
import { NextFunction,Request, Response } from 'express';

import { AuthenticatedRequest } from '../../../../AuthAlert';

/**
 * Performance tracking middleware for analytics endpoints
 *
 * Measures request duration, logs slow requests, and exports metrics
 * to the monitoring system for analytics endpoints.
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Next function to continue request processing
 */
export function performanceTrackingMiddleware(
  req: AuthenticatedRequest,
  res: any,
  next: NextFunction
): void { const startTime = Date.now();
  const originalEnd = res.end;

  // Override res.end to capture response completion
  res.end = function(...args: unknown[]) {
    const duration = Date.now() - startTime;
    const traceId = req.analyticsContext?.traceId || 'unknown';

    // Log slow requests
    if (duration > analyticsConfig.performance.slowRequestThreshold) {
      logger.warn('Slow analytics request detected', {
        component: 'analytics-performance-tracking',
        traceId,
        method: req.method,
        path: req.path,
        duration,
        threshold: analyticsConfig.performance.slowRequestThreshold,
        user_id: req.analyticsContext?.user_id,
        user_agent: req.headers['user-agent'],
        statusCode: res.statusCode
       });
    }

    // Track API metrics using performance monitor
    performanceMonitor.recordMetric({ name: `api_request_duration`,
      value: duration,
      unit: 'ms',
      metadata: {
        method: req.method,
        path: req.route?.path || req.path,
        statusCode: res.statusCode,
        user_id: req.analyticsContext?.user_id,
        traceId
       }
    });

    // Add performance headers for debugging
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('x-response-time', `${duration}ms`);
      res.setHeader('x-trace-id', traceId);
    }

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
}

/**
 * Helper function to manually track performance for specific operations
 */
export function trackAnalyticsOperation(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  const tags = {
    operation,
    component: 'analytics',
    ...metadata
  };

  // Use the performance monitoring utility
  performanceMonitor.recordMetric({ name: `analytics_operation_duration`,
    value: duration,
    unit: 'ms',
    metadata: {
      operation,
      component: 'analytics',
      user_id: metadata?.user_id,
      ...metadata
     }
  });
}

/**
 * Helper function to get current performance metrics for analytics
 */
export function getAnalyticsPerformanceMetrics() {
  // This would integrate with the performance monitoring system
  // to get analytics-specific metrics
  return {
    slowRequestThreshold: analyticsConfig.performance.slowRequestThreshold,
    // Additional metrics would be retrieved from the monitoring system
  };
}









































