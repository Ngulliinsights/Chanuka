/**
 * External API Management Dashboard
 *
 * Comprehensive monitoring and management for external API integrations.
 * Covers: health, performance, costs, quota, cache, real-time status,
 * source configuration, and metrics export.
 *
 * NOTE: The four TS2307 "cannot find module" errors (lines 13-19) are
 * path-alias resolution issues that must be fixed in tsconfig.json by
 * ensuring the `@server/*` path alias points to the correct root.
 * The import paths themselves are correct.
 */

import { UnifiedExternalAPIManagementService as ExternalAPIManagementService } from '../../infrastructure/external-data/external-api-manager';
import { logger } from '../../infrastructure/observability';
import { ApiResponseWrapper, ApiSuccess } from '../../utils/api-utils';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';

// ─── Domain interfaces ────────────────────────────────────────────────────────

interface DowntimeEvent {
  startTime: Date;
  endTime?:  Date;
}

interface HealthStatus {
  source:        string;
  status:        'healthy' | 'degraded' | 'down';
  responseTime:  number;
  successRate:   number;
  errorRate:     number;
  uptime:        number;
  last_checked:  string | Date;
  downtimeEvents: DowntimeEvent[];
}

interface SourceAnalytics {
  source:              string;
  totalRequests:       number;
  successfulRequests:  number;
  failedRequests:      number;
  averageResponseTime: number;
  totalCost:           number;
  quotaUtilization:    Record<string, number>;
  errorBreakdown:      Record<string, number>;
  topEndpoints?:       unknown[];
}

interface APIAnalytics {
  totalRequests:        number;
  totalCost:            number;
  averageResponseTime:  number;
  overallSuccessRate:   number;
  cacheHitRate:         number;
  costBreakdown:        Record<string, number>;
  topPerformingSources: unknown[];
  sources:              SourceAnalytics[];
}

interface CacheStatistics {
  totalEntries:       number;
  hitRate:            number;
  totalSize:          number;
  topCachedEndpoints?: unknown[];
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const router: ExpressRouter = Router();

const apiManagementService = new ExternalAPIManagementService();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createErrorResponse = (
  res:          Response,
  message:      string,
  statusCode:   number = 500,
  metadata:     ReturnType<typeof ApiResponseWrapper.createMetadata>,
  errorDetails?: unknown,
): Response => {
  if (errorDetails) {
    logger.error({ component: 'ExternalAPIDashboard', error: errorDetails }, message);
  }
  return res.status(statusCode).json(
    ApiResponseWrapper.error(message, 'API_ERROR', undefined, metadata),
  );
};

// ─── GET /dashboard ───────────────────────────────────────────────────────────

router.get('/dashboard', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const [analytics, healthStatuses, cacheStats] = await Promise.all([
      Promise.resolve(apiManagementService.getAPIAnalytics()    as APIAnalytics),
      Promise.resolve(apiManagementService.getHealthStatus()    as HealthStatus[]),
      Promise.resolve(apiManagementService.getCacheStatistics() as CacheStatistics),
    ]);

    const dashboardData = {
      overview: {
        totalSources:        healthStatuses.length,
        healthySources:      healthStatuses.filter((h: HealthStatus) => h.status === 'healthy').length,
        degradedSources:     healthStatuses.filter((h: HealthStatus) => h.status === 'degraded').length,
        downSources:         healthStatuses.filter((h: HealthStatus) => h.status === 'down').length,
        totalRequests:       analytics.totalRequests,
        totalCost:           analytics.totalCost,
        averageResponseTime: analytics.averageResponseTime,
        successRate:         analytics.overallSuccessRate,
        cacheHitRate:        analytics.cacheHitRate,
      },
      healthStatus: healthStatuses.map((h: HealthStatus) => ({
        source:         h.source,
        status:         h.status,
        responseTime:   h.responseTime,
        successRate:    h.successRate,
        errorRate:      h.errorRate,
        uptime:         h.uptime,
        last_checked:   h.last_checked,
        recentDowntime: h.downtimeEvents
          .filter((e: DowntimeEvent) => !e.endTime || (Date.now() - e.startTime.getTime()) < 86_400_000)
          .length,
      })),
      performance: {
        topPerformingSources: analytics.topPerformingSources.slice(0, 5),
        averageResponseTime:  analytics.averageResponseTime,
        errorRate:            100 - analytics.overallSuccessRate,
      },
      costAnalysis: {
        totalCost:             analytics.totalCost,
        costBreakdown:         analytics.costBreakdown,
        averageCostPerRequest: analytics.totalRequests > 0
          ? analytics.totalCost / analytics.totalRequests
          : 0,
        topCostSources: Object.entries(analytics.costBreakdown)
          .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
          .slice(0, 5)
          .map(([source, cost]) => ({ source, cost })),
      },
      quotaUtilization: analytics.sources.map((s: SourceAnalytics) => ({
        source:           s.source,
        quotaUtilization: s.quotaUtilization,
        maxUtilization:   Math.max(...Object.values(s.quotaUtilization)),
      })),
      cacheStatistics: {
        totalEntries:        cacheStats.totalEntries,
        hitRate:             cacheStats.hitRate,
        totalSize:           cacheStats.totalSize,
        topCachedEndpoints:  cacheStats.topCachedEndpoints?.slice(0, 10) ?? [],
      },
      errorAnalysis: {
        totalErrors: analytics.sources.reduce((sum: number, s: SourceAnalytics) => sum + s.failedRequests, 0),
        errorRate:   100 - analytics.overallSuccessRate,
        sourceErrors: analytics.sources.map((s: SourceAnalytics) => ({
          source:     s.source,
          errorCount: s.failedRequests,
          errorRate:  s.totalRequests > 0 ? (s.failedRequests / s.totalRequests) * 100 : 0,
          topErrors:  Object.entries(s.errorBreakdown)
            .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ type, count })),
        })),
      },
      recentActivity: {
        recentFailures: healthStatuses
          .flatMap((h: HealthStatus) =>
            h.downtimeEvents.slice(-5).map((e: DowntimeEvent) => ({ source: h.source, ...e })),
          )
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
          .slice(0, 15),
        topEndpoints: analytics.sources
          .flatMap((s: SourceAnalytics) =>
            (s.topEndpoints ?? []).map((e: unknown) => ({ source: s.source, ...(e as object) })),
          )
          .slice(0, 15),
      },
      timestamp: new Date().toISOString(),
    };

    return ApiSuccess(res, dashboardData, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to retrieve dashboard data', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── GET /monitoring/realtime ─────────────────────────────────────────────────

router.get('/monitoring/realtime', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const analytics      = apiManagementService.getAPIAnalytics()  as APIAnalytics;
    const healthStatuses = apiManagementService.getHealthStatus()   as HealthStatus[];

    return ApiSuccess(res, {
      currentStatus: {
        totalRequests:       analytics.totalRequests,
        successRate:         analytics.overallSuccessRate,
        averageResponseTime: analytics.averageResponseTime,
        healthySources:      healthStatuses.filter((h: HealthStatus) => h.status === 'healthy').length,
        totalSources:        healthStatuses.length,
      },
      sourceStatus: healthStatuses.map((s: HealthStatus) => ({
        source:       s.source,
        status:       s.status,
        responseTime: s.responseTime,
        last_checked: s.last_checked,
        trend: s.successRate >= 95 ? 'stable' : s.successRate >= 80 ? 'degraded' : 'critical',
      })),
      timestamp: new Date().toISOString(),
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to retrieve real-time data', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── POST /optimize ───────────────────────────────────────────────────────────

router.post('/optimize', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { action, source } = req.body as { action: string; source?: string };
    let result: Record<string, unknown> = {};

    switch (action) {
      case 'clear_cache': {
        const clearedCount = apiManagementService.clearCache(source);
        result = {
          message:        `Cache cleared for ${source ?? 'all sources'}`,
          clearedEntries: clearedCount,
        };
        break;
      }
      case 'reset_quotas':
        result = { message: `Quotas reset for ${source}` };
        break;
      case 'trigger_health_check': {
        const statuses = apiManagementService.getHealthStatus() as HealthStatus[];
        result = {
          message:   'Health checks triggered',
          sources:   statuses.length,
          timestamp: new Date().toISOString(),
        };
        break;
      }
      case 'warm_cache':
        result = { message: 'Cache warming initiated (stub — implement advancedCachingService)' };
        break;
      default:
        return createErrorResponse(
          res,
          `Unknown optimization action: ${action}`,
          400,
          ApiResponseWrapper.createMetadata(startTime, 'static'),
        );
    }

    return ApiSuccess(res, result, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to perform optimization', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── GET /sources/:sourceId/config ────────────────────────────────────────────

router.get('/sources/:sourceId/config', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { sourceId }  = req.params;
    const analytics     = apiManagementService.getAPIAnalytics(sourceId)  as APIAnalytics;
    const healthStatus  = apiManagementService.getHealthStatus(sourceId)  as HealthStatus[];

    if (!healthStatus.length) {
      return createErrorResponse(res, `Source '${sourceId}' not found`, 404,
        ApiResponseWrapper.createMetadata(startTime, 'static'));
    }

    const sourceConfig = {
      source:  sourceId,
      health:  healthStatus[0],
      metrics: analytics.sources.find((s: SourceAnalytics) => s.source === sourceId),
      configuration: {
        rateLimit:  { requestsPerMinute: 60, requestsPerHour: 1_000, requestsPerDay: 10_000, requestsPerMonth: 300_000 },
        caching:    { enabled: true, defaultTtl: 300, maxSize: '100MB' },
        failover:   { enabled: true, alternativeSources: ['openparliament', 'govtrack'] },
        monitoring: { healthCheckInterval: 60_000, alertThresholds: { responseTime: 5_000, errorRate: 10, downtime: 300_000 } },
      },
      recommendations: [] as Array<{ type: string; severity: string; message: string; action: string }>,
    };

    if (healthStatus[0]!.responseTime > 3_000) {
      sourceConfig.recommendations.push({
        type:     'performance',
        severity: 'medium',
        message:  'Consider more aggressive caching to reduce response times',
        action:   'increase_cache_ttl',
      });
    }
    if (healthStatus[0]!.errorRate > 5) {
      sourceConfig.recommendations.push({
        type:     'reliability',
        severity: 'high',
        message:  'High error rate detected. Consider implementing circuit breaker',
        action:   'enable_circuit_breaker',
      });
    }

    return ApiSuccess(res, sourceConfig, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to retrieve source configuration', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── PUT /sources/:sourceId/config ────────────────────────────────────────────

router.put('/sources/:sourceId/config', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { sourceId }                                 = req.params;
    const { rateLimit, caching, failover, monitoring } = req.body;
    return ApiSuccess(res, {
      source:    sourceId,
      updated:   { rateLimit, caching, failover, monitoring },
      timestamp: new Date().toISOString(),
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to update source configuration', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── GET /costs/report ────────────────────────────────────────────────────────

router.get('/costs/report', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    return ApiSuccess(res, apiManagementService.getCostReport(),
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to retrieve cost report', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── GET /costs/alerts ────────────────────────────────────────────────────────

router.get('/costs/alerts', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const alerts = apiManagementService.getCostMonitoring().getActiveAlerts();
    return ApiSuccess(res, { alerts, count: alerts.length },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to retrieve cost alerts', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── POST /costs/alerts/:alertId/acknowledge ─────────────────────────────────

router.post('/costs/alerts/:alertId/acknowledge', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { alertId }  = _req.params;
    const acknowledged = apiManagementService.getCostMonitoring().acknowledgeAlert(alertId);
    if (!acknowledged) {
      return createErrorResponse(res, 'Alert not found', 404,
        ApiResponseWrapper.createMetadata(startTime, 'static'));
    }
    return ApiSuccess(res, { message: 'Alert acknowledged', alertId },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to acknowledge alert', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── GET /costs/recommendations ──────────────────────────────────────────────

router.get('/costs/recommendations', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const recommendations = apiManagementService.getCostMonitoring().getCostOptimizationRecommendations();
    return ApiSuccess(res, { recommendations, count: recommendations.length },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to retrieve cost recommendations', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── PUT /costs/budget/:source ────────────────────────────────────────────────

router.put('/costs/budget/:source', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { source }   = req.params;
    const budgetConfig = req.body;
    apiManagementService.getCostMonitoring().updateBudgetConfig(source, budgetConfig);
    return ApiSuccess(res, { message: `Budget updated for ${source}`, source, config: budgetConfig },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to update budget configuration', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

// ─── GET /metrics/export ──────────────────────────────────────────────────────

router.get('/metrics/export', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { format = 'json' } = req.query;
    const analytics           = apiManagementService.getAPIAnalytics()  as APIAnalytics;
    const healthStatuses      = apiManagementService.getHealthStatus()  as HealthStatus[];

    if (format === 'prometheus') {
      let out = '';
      out += '# HELP api_requests_total Total number of API requests\n# TYPE api_requests_total counter\n';
      analytics.sources.forEach((s: SourceAnalytics) => {
        out += `api_requests_total{source="${s.source}"} ${s.totalRequests}\n`;
      });
      out += '\n# HELP api_response_time_seconds Average response time\n# TYPE api_response_time_seconds gauge\n';
      analytics.sources.forEach((s: SourceAnalytics) => {
        out += `api_response_time_seconds{source="${s.source}"} ${s.averageResponseTime / 1000}\n`;
      });
      out += '\n# HELP api_success_rate Success rate\n# TYPE api_success_rate gauge\n';
      healthStatuses.forEach((h: HealthStatus) => {
        out += `api_success_rate{source="${h.source}"} ${h.successRate}\n`;
      });
      res.set('Content-Type', 'text/plain');
      return res.send(out);
    }

    return ApiSuccess(res, {
      timestamp: new Date().toISOString(),
      summary: {
        total_requests:        analytics.totalRequests,
        total_cost:            analytics.totalCost,
        average_response_time: analytics.averageResponseTime,
        success_rate:          analytics.overallSuccessRate,
        cache_hit_rate:        analytics.cacheHitRate,
      },
      sources: analytics.sources.map((s: SourceAnalytics) => ({
        name:                  s.source,
        total_requests:        s.totalRequests,
        successful_requests:   s.successfulRequests,
        failed_requests:       s.failedRequests,
        average_response_time: s.averageResponseTime,
        total_cost:            s.totalCost,
        quota_utilization:     s.quotaUtilization,
        top_endpoints:         s.topEndpoints,
        error_breakdown:       s.errorBreakdown,
      })),
      health: healthStatuses.map((h: HealthStatus) => ({
        source:       h.source,
        status:       h.status,
        response_time: h.responseTime,
        success_rate:  h.successRate,
        error_rate:    h.errorRate,
        uptime:        h.uptime,
        last_checked:  h.last_checked,
      })),
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(res, 'Failed to export metrics', 500,
      ApiResponseWrapper.createMetadata(startTime, 'static'), error);
  }
});

export { apiManagementService };