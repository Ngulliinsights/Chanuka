import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';
import { trackApiMetric } from '../../../utils/performance-monitoring-utils.js';
import { analyticsConfig } from '../config/analytics.config.js';
import { AuthenticatedRequest } from '../../../middleware/auth.js';

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
): void {
  const startTime = Date.now();
  const originalEnd = res.end;

  // Override res.end to capture response completion
  res.end = function(...args: any[]) {
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
        userId: req.analyticsContext?.userId,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode
      });
    }

    // Track API metrics using existing performance monitoring
    trackApiMetric(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration,
      req.analyticsContext?.userId
    );

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
  metadata?: Record<string, any>
): void {
  const tags = {
    operation,
    component: 'analytics',
    ...metadata
  };

  // Use the performance monitoring utility
  trackApiMetric('ANALYTICS', operation, 200, duration, metadata?.userId);
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