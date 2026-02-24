/**
 * Metrics Collection Middleware
 * 
 * Automatically collects metrics for API requests including:
 * - Request count
 * - Response times
 * - Error rates
 * - Active users
 */

import { Request, Response, NextFunction } from 'express';
import { integrationMonitor } from '../domain/integration-monitor.service';
import { logger } from '@server/infrastructure/observability';

// ============================================================================
// TYPES
// ============================================================================

interface MetricsCollector {
  featureId: string;
  requests: Map<string, { success: boolean; responseTime: number }>;
  activeUsers: Set<string>;
  startTime: number;
}

// ============================================================================
// METRICS STORAGE
// ============================================================================

const metricsCollectors = new Map<string, MetricsCollector>();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Create metrics collection middleware for a feature
 */
export function createMetricsMiddleware(featureId: string, featureName: string) {
  // Initialize collector if it doesn't exist
  if (!metricsCollectors.has(featureId)) {
    metricsCollectors.set(featureId, {
      featureId,
      requests: new Map(),
      activeUsers: new Set(),
      startTime: Date.now(),
    });

    // Start periodic metrics reporting
    startMetricsReporting(featureId, featureName);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userId = (req as any).user?.id;

    const collector = metricsCollectors.get(featureId);
    if (!collector) {
      return next();
    }

    // Track active user
    if (userId) {
      collector.activeUsers.add(userId);
    }

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Record request metrics
      collector.requests.set(requestId, { success, responseTime });

      // Log to integration logs
      integrationMonitor.logEvent(
        featureId,
        success ? 'info' : 'error',
        'api',
        `${req.method} ${req.path} - ${res.statusCode}`,
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          userId,
        },
        userId,
        requestId
      ).catch((error) => {
        logger.error({
          message: 'Failed to log integration event',
          error,
          featureId,
        });
      });

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Start periodic metrics reporting for a feature
 */
function startMetricsReporting(featureId: string, featureName: string) {
  const REPORT_INTERVAL = 60 * 1000; // 1 minute

  setInterval(async () => {
    const collector = metricsCollectors.get(featureId);
    if (!collector) return;

    try {
      // Calculate metrics
      const totalRequests = collector.requests.size;
      const successfulRequests = Array.from(collector.requests.values()).filter(
        (r) => r.success
      ).length;
      const failedRequests = totalRequests - successfulRequests;
      const activeUsers = collector.activeUsers.size;

      // Calculate response times
      const responseTimes = Array.from(collector.requests.values())
        .map((r) => r.responseTime)
        .sort((a, b) => a - b);

      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
          : 0;

      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p95ResponseTime = responseTimes[p95Index] || 0;

      const p99Index = Math.floor(responseTimes.length * 0.99);
      const p99ResponseTime = responseTimes[p99Index] || 0;

      // Record metrics
      if (totalRequests > 0) {
        await integrationMonitor.recordMetrics(
          featureId,
          {
            activeUsers,
            totalRequests,
            successfulRequests,
            failedRequests,
          },
          {
            avgResponseTime,
            p95ResponseTime,
            p99ResponseTime,
          }
        );

        logger.debug({
          message: 'Metrics recorded',
          featureId,
          featureName,
          totalRequests,
          activeUsers,
          avgResponseTime,
        });
      }

      // Reset collectors
      collector.requests.clear();
      collector.activeUsers.clear();
      collector.startTime = Date.now();
    } catch (error) {
      logger.error({
        message: 'Failed to record metrics',
        error,
        featureId,
        featureName,
      });
    }
  }, REPORT_INTERVAL);

  logger.info({
    message: 'Metrics reporting started',
    featureId,
    featureName,
    interval: REPORT_INTERVAL,
  });
}

/**
 * Stop metrics collection for a feature
 */
export function stopMetricsCollection(featureId: string) {
  metricsCollectors.delete(featureId);
  logger.info({
    message: 'Metrics collection stopped',
    featureId,
  });
}

/**
 * Get current metrics for a feature (without persisting)
 */
export function getCurrentMetrics(featureId: string) {
  const collector = metricsCollectors.get(featureId);
  if (!collector) return null;

  const totalRequests = collector.requests.size;
  const successfulRequests = Array.from(collector.requests.values()).filter(
    (r) => r.success
  ).length;
  const failedRequests = totalRequests - successfulRequests;
  const activeUsers = collector.activeUsers.size;

  const responseTimes = Array.from(collector.requests.values())
    .map((r) => r.responseTime)
    .sort((a, b) => a - b);

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 0;

  return {
    activeUsers,
    totalRequests,
    successfulRequests,
    failedRequests,
    avgResponseTime,
    uptime: Date.now() - collector.startTime,
  };
}
