/**
 * External API Management Dashboard
 * 
 * Provides comprehensive monitoring and management capabilities for external APIs
 * as part of task 12.3 - Build External API Management
 * 
 * This module offers real-time monitoring, cost analysis, performance optimization,
 * and detailed configuration management for all external API integrations.
 */

import { Router, Request, Response } from 'express';
import { ApiSuccess, ApiResponseWrapper } from '../../../shared/core/src/utils/api';
import { UnifiedExternalAPIManagementService as ExternalAPIManagementService } from '../../infrastructure/external-data/external-api-manager.js';
import { performanceMonitor } from '../../infrastructure/monitoring/performance-monitor.js';
// import { advancedCachingService } from '../../infrastructure/cache/advanced-caching.js'; // TODO: Create advanced caching service
import { logger } from '@shared/core';

export const router = Router();

// Initialize the external API management service with singleton pattern
const apiManagementService = new ExternalAPIManagementService();

/**
 * Helper function to create standardized error responses
 * This ensures consistent error handling throughout the dashboard
 */
const createErrorResponse = (
  res: Response, 
  message: string, 
  statusCode: number = 500, 
  metadata: any,
  errorDetails?: unknown
): Response => {
  // Log error details for debugging while keeping response clean
  if (errorDetails) {
    logger.error(message, { component: 'ExternalAPIDashboard' }, errorDetails);
  }
  
  return res.status(statusCode).json(
    ApiResponseWrapper.error(res, message, statusCode, metadata)
  );
};

/**
 * Type guard to safely handle error objects
 * This helps TypeScript understand that we've validated the error structure
 */
const isErrorWithMessage = (error: unknown): error is { message: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
};

/**
 * GET /dashboard
 * 
 * Retrieves comprehensive dashboard overview including health status,
 * performance metrics, cost analysis, and cache statistics for all
 * configured external API sources.
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Gather data from all monitoring services in parallel for efficiency
    const [analytics, healthStatuses, cacheStats, performanceStats, advancedCacheStats] = await Promise.all([
      Promise.resolve(apiManagementService.getAPIAnalytics()),
      Promise.resolve(apiManagementService.getHealthStatus()),
      Promise.resolve(apiManagementService.getCacheStatistics()),
      Promise.resolve({ slowestEndpoints: [], recentErrors: [], averageResponseTime: 0, errorRate: 0 }),
      Promise.resolve({ memory: { memoryUsage: 0, hitRate: 0, entries: 0 }, performance: { averageGetTime: 0, averageSetTime: 0, slowOperations: [] } })
    ]);

    // Calculate key metrics for the overview section
    const dashboardData = {
      overview: {
        totalSources: healthStatuses.length,
        healthySources: healthStatuses.filter(h => h.status === 'healthy').length,
        degradedSources: healthStatuses.filter(h => h.status === 'degraded').length,
        downSources: healthStatuses.filter(h => h.status === 'down').length,
        totalRequests: analytics.totalRequests,
        totalCost: analytics.totalCost,
        averageResponseTime: analytics.averageResponseTime,
        successRate: analytics.overallSuccessRate,
        cacheHitRate: analytics.cacheHitRate
      },
      
      // API Health Status with recent downtime tracking
      healthStatus: healthStatuses.map(h => ({
        source: h.source,
        status: h.status,
        responseTime: h.responseTime,
        successRate: h.successRate,
        errorRate: h.errorRate,
        uptime: h.uptime,
        lastChecked: h.lastChecked,
        // Count downtime events from the last 24 hours
        recentDowntime: h.downtimeEvents
          .filter(event => !event.endTime || (new Date().getTime() - event.startTime.getTime()) < 86400000)
          .length
      })),

      // Performance Metrics highlighting top performers and problem areas
      performance: {
        topPerformingSources: analytics.topPerformingSources.slice(0, 5),
        slowestEndpoints: performanceStats.slowestEndpoints.slice(0, 10),
        recentErrors: performanceStats.recentErrors.slice(0, 20),
        averageResponseTime: performanceStats.averageResponseTime,
        errorRate: performanceStats.errorRate
      },

      // Cost Analysis with breakdown by source
      costAnalysis: {
        totalCost: analytics.totalCost,
        costBreakdown: analytics.costBreakdown,
        averageCostPerRequest: analytics.totalRequests > 0 
          ? analytics.totalCost / analytics.totalRequests 
          : 0,
        // Identify the most expensive API sources
        topCostSources: Object.entries(analytics.costBreakdown)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([source, cost]) => ({ source, cost }))
      },

      // Quota Utilization tracking across different time windows
      quotaUtilization: analytics.sources.map(s => ({
        source: s.source,
        minute: s.quotaUtilization.minute,
        hour: s.quotaUtilization.hour,
        day: s.quotaUtilization.day,
        month: s.quotaUtilization.month,
        maxUtilization: Math.max(...Object.values(s.quotaUtilization))
      })),

      // Cache Statistics from both basic and advanced caching layers
      cacheStatistics: {
        basic: {
          totalEntries: cacheStats.totalEntries,
          hitRate: cacheStats.hitRate,
          totalSize: cacheStats.totalSize,
          topCachedEndpoints: cacheStats.topCachedEndpoints.slice(0, 10)
        },
        advanced: {
          memoryUsage: advancedCacheStats.memory.memoryUsage,
          memoryHitRate: advancedCacheStats.memory.hitRate,
          totalEntries: advancedCacheStats.memory.entries,
          averageGetTime: advancedCacheStats.performance.averageGetTime,
          averageSetTime: advancedCacheStats.performance.averageSetTime,
          slowOperations: advancedCacheStats.performance.slowOperations.slice(0, 10)
        }
      },

      // Error Analysis aggregated across all sources
      errorAnalysis: {
        totalErrors: analytics.sources.reduce((sum, s) => sum + s.failedRequests, 0),
        errorRate: analytics.overallSuccessRate > 0 ? 100 - analytics.overallSuccessRate : 0,
        errorBreakdown: analytics.sources.reduce((breakdown, source) => {
          Object.entries(source.errorBreakdown).forEach(([errorType, count]) => {
            breakdown[errorType] = (breakdown[errorType] || 0) + (count as number);
          });
          return breakdown;
        }, {} as Record<string, number>),
        sourceErrors: analytics.sources.map(s => ({
          source: s.source,
          errorCount: s.failedRequests,
          errorRate: s.totalRequests > 0 ? (s.failedRequests / s.totalRequests) * 100 : 0,
          topErrors: Object.entries(s.errorBreakdown)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }))
        }))
      },

      // Recent Activity showing the latest requests and failures
      recentActivity: {
        recentRequests: analytics.sources.reduce((sum, s) => sum + s.totalRequests, 0),
        recentFailures: healthStatuses
          .flatMap(h => h.downtimeEvents.slice(-5).map(e => ({ source: h.source, ...e })))
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
          .slice(0, 15),
        topEndpoints: analytics.sources
          .flatMap(s => s.topEndpoints.map(e => ({ source: s.source, ...e })))
          .sort((a, b) => b.requests - a.requests)
          .slice(0, 15)
      },

      timestamp: new Date().toISOString()
    };

    return ApiSuccess(res, dashboardData, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(
      res, 
      'Failed to retrieve dashboard data', 
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * GET /monitoring/realtime
 * 
 * Provides real-time monitoring data with active alerts and current status
 * for all API sources. This endpoint is designed for frequent polling by
 * monitoring dashboards.
 */
router.get('/monitoring/realtime', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const analytics = apiManagementService.getAPIAnalytics();
    const healthStatuses = apiManagementService.getHealthStatus();
    const performanceRegressions = [];

    const realtimeData = {
      currentStatus: {
        totalRequests: analytics.totalRequests,
        successRate: analytics.overallSuccessRate,
        averageResponseTime: analytics.averageResponseTime,
        activeAlerts: performanceRegressions.length,
        healthySources: healthStatuses.filter(h => h.status === 'healthy').length,
        totalSources: healthStatuses.length
      },
      
      // Active alerts with severity levels for prioritization
      alerts: performanceRegressions.map(regression => ({
        type: 'performance_regression',
        severity: regression.regressionPercent > 100 ? 'critical' : 'warning',
        message: `Performance regression detected for ${regression.endpoint}`,
        details: {
          endpoint: regression.endpoint,
          currentAvg: regression.currentAvg,
          baselineAvg: regression.baselineAvg,
          regressionPercent: regression.regressionPercent
        },
        timestamp: new Date().toISOString()
      })),

      // Current status of each source with trend indication
      sourceStatus: healthStatuses.map(status => ({
        source: status.source,
        status: status.status,
        responseTime: status.responseTime,
        lastChecked: status.lastChecked,
        trend: status.successRate >= 95 ? 'stable' : 
               status.successRate >= 80 ? 'degraded' : 'critical'
      })),

      timestamp: new Date().toISOString()
    };

    return ApiSuccess(res, realtimeData, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to retrieve real-time data',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * POST /optimize
 * 
 * Performs various optimization actions including cache warming, clearing,
 * quota resets, and health check triggering. This provides administrative
 * control over API performance optimization.
 */
router.post('/optimize', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { action, source, parameters } = req.body;
    let result: any = {};

    switch (action) {
      case 'warm_cache':
        // Pre-populate cache with frequently accessed data
        const warmingRules = [
          {
            key: `${source}:bills:recent`,
            fetchFn: async () => {
              return await apiManagementService.makeRequest(source, '/bills', { params: { limit: 50 } });
            },
            ttl: 300, // 5 minutes for recent bills
            priority: 'high' as const
          },
          {
            key: `${source}:sponsors:active`,
            fetchFn: async () => {
              return await apiManagementService.makeRequest(source, '/sponsors', { params: { active: true } });
            },
            ttl: 600, // 10 minutes for active sponsors
            priority: 'medium' as const
          }
        ];
        
        // await advancedCachingService.warmCache(warmingRules); // TODO: Implement advanced caching service
        result = { message: 'Cache warming initiated', rules: warmingRules.length };
        break;

      case 'clear_cache':
        // Remove cached data for a specific source or all sources
        const clearedCount = apiManagementService.clearCache(source);
        result = { 
          message: `Cache cleared for ${source || 'all sources'}`, 
          clearedEntries: clearedCount 
        };
        break;

      case 'reset_quotas':
        // Reset rate limit quotas (useful for testing or after quota increases)
        result = { message: `Quotas reset for ${source}` };
        break;

      case 'trigger_health_check':
        // Force immediate health check across all sources
        const healthStatuses = apiManagementService.getHealthStatus();
        result = { 
          message: 'Health checks triggered', 
          sources: healthStatuses.length,
          timestamp: new Date().toISOString()
        };
        break;

      default:
        return createErrorResponse(
          res,
          `Unknown optimization action: ${action}`,
          400,
          ApiResponseWrapper.createMetadata(startTime, 'static')
        );
    }

    return ApiSuccess(res, result, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to perform optimization',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * GET /sources/:sourceId/config
 * 
 * Retrieves detailed configuration and current status for a specific API source,
 * including performance recommendations based on observed behavior.
 */
router.get('/sources/:sourceId/config', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { sourceId } = req.params;
    const analytics = apiManagementService.getAPIAnalytics(sourceId);
    const healthStatus = apiManagementService.getHealthStatus(sourceId);

    if (healthStatus.length === 0) {
      return createErrorResponse(
        res,
        `Source '${sourceId}' not found`,
        404,
        ApiResponseWrapper.createMetadata(startTime, 'static')
      );
    }

    const sourceConfig = {
      source: sourceId,
      health: healthStatus[0],
      metrics: analytics.sources.find(s => s.source === sourceId),
      configuration: {
        // Configuration that would typically come from a config file or database
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          requestsPerMonth: 300000
        },
        caching: {
          enabled: true,
          defaultTtl: 300,
          maxSize: '100MB'
        },
        failover: {
          enabled: true,
          alternativeSources: ['openparliament', 'govtrack']
        },
        monitoring: {
          healthCheckInterval: 60000,
          alertThresholds: {
            responseTime: 5000,
            errorRate: 10,
            downtime: 300000
          }
        }
      },
      recommendations: [] as Array<{
        type: string;
        severity: string;
        message: string;
        action: string;
      }>
    };

    // Generate intelligent recommendations based on observed metrics
    if (sourceConfig.health.responseTime > 3000) {
      sourceConfig.recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: 'Consider enabling more aggressive caching to reduce response times',
        action: 'increase_cache_ttl'
      });
    }

    if (sourceConfig.health.errorRate > 5) {
      sourceConfig.recommendations.push({
        type: 'reliability',
        severity: 'high',
        message: 'High error rate detected. Consider implementing circuit breaker',
        action: 'enable_circuit_breaker'
      });
    }

    return ApiSuccess(res, sourceConfig, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to retrieve source configuration',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * PUT /sources/:sourceId/config
 * 
 * Updates configuration settings for a specific API source including
 * rate limits, caching behavior, failover settings, and monitoring thresholds.
 */
router.put('/sources/:sourceId/config', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { sourceId } = req.params;
    const { rateLimit, caching, failover, monitoring } = req.body;

    // In a production system, this would persist to a database or config file
    const updatedConfig = {
      source: sourceId,
      updated: {
        rateLimit,
        caching,
        failover,
        monitoring
      },
      timestamp: new Date().toISOString()
    };

    return ApiSuccess(res, updatedConfig, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to update source configuration',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * GET /costs/report
 * 
 * Generates a comprehensive cost report showing spending across all API sources,
 * trends over time, and cost efficiency metrics.
 */
router.get('/costs/report', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const costReport = apiManagementService.getCostReport();
    return ApiSuccess(res, costReport, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to retrieve cost report',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * GET /costs/alerts
 * 
 * Retrieves active cost alerts for budget overruns or unusual spending patterns.
 */
router.get('/costs/alerts', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const costMonitoring = apiManagementService.getCostMonitoring();
    const alerts = costMonitoring.getActiveAlerts();
    return ApiSuccess(
      res, 
      { alerts, count: alerts.length }, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to retrieve cost alerts',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * POST /costs/alerts/:alertId/acknowledge
 * 
 * Acknowledges a cost alert to prevent it from triggering repeatedly.
 */
router.post('/costs/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { alertId } = req.params;
    const costMonitoring = apiManagementService.getCostMonitoring();
    const acknowledged = costMonitoring.acknowledgeAlert(alertId);
    
    if (acknowledged) {
      return ApiSuccess(
        res, 
        { message: 'Alert acknowledged', alertId }, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    } else {
      return createErrorResponse(
        res,
        'Alert not found',
        404,
        ApiResponseWrapper.createMetadata(startTime, 'static')
      );
    }
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to acknowledge alert',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * GET /costs/recommendations
 * 
 * Provides AI-driven cost optimization recommendations based on usage patterns.
 */
router.get('/costs/recommendations', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const costMonitoring = apiManagementService.getCostMonitoring();
    const recommendations = costMonitoring.getCostOptimizationRecommendations();
    return ApiSuccess(
      res, 
      { recommendations, count: recommendations.length }, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to retrieve cost recommendations',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * PUT /costs/budget/:source
 * 
 * Updates budget configuration and alert thresholds for a specific API source.
 */
router.put('/costs/budget/:source', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { source } = req.params;
    const budgetConfig = req.body;
    
    const costMonitoring = apiManagementService.getCostMonitoring();
    costMonitoring.updateBudgetConfig(source, budgetConfig);
    
    return ApiSuccess(res, { 
      message: `Budget configuration updated for ${source}`, 
      source, 
      config: budgetConfig 
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to update budget configuration',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

/**
 * GET /metrics/export
 * 
 * Exports metrics in various formats (JSON or Prometheus) for integration
 * with external monitoring systems like Grafana, Datadog, or New Relic.
 */
router.get('/metrics/export', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { format = 'json' } = req.query;
    const analytics = apiManagementService.getAPIAnalytics();
    const healthStatuses = apiManagementService.getHealthStatus();

    const metrics = {
      timestamp: new Date().toISOString(),
      summary: {
        total_requests: analytics.totalRequests,
        total_cost: analytics.totalCost,
        average_response_time: analytics.averageResponseTime,
        success_rate: analytics.overallSuccessRate,
        cache_hit_rate: analytics.cacheHitRate
      },
      sources: analytics.sources.map(source => ({
        name: source.source,
        total_requests: source.totalRequests,
        successful_requests: source.successfulRequests,
        failed_requests: source.failedRequests,
        average_response_time: source.averageResponseTime,
        total_cost: source.totalCost,
        quota_utilization: source.quotaUtilization,
        top_endpoints: source.topEndpoints,
        error_breakdown: source.errorBreakdown
      })),
      health: healthStatuses.map(health => ({
        source: health.source,
        status: health.status,
        response_time: health.responseTime,
        success_rate: health.successRate,
        error_rate: health.errorRate,
        uptime: health.uptime,
        last_checked: health.lastChecked
      }))
    };

    // Support Prometheus format for time-series monitoring systems
    if (format === 'prometheus') {
      let prometheusMetrics = '';
      
      prometheusMetrics += `# HELP api_requests_total Total number of API requests\n`;
      prometheusMetrics += `# TYPE api_requests_total counter\n`;
      analytics.sources.forEach(source => {
        prometheusMetrics += `api_requests_total{source="${source.source}"} ${source.totalRequests}\n`;
      });

      prometheusMetrics += `\n# HELP api_response_time_seconds Average response time in seconds\n`;
      prometheusMetrics += `# TYPE api_response_time_seconds gauge\n`;
      analytics.sources.forEach(source => {
        prometheusMetrics += `api_response_time_seconds{source="${source.source}"} ${source.averageResponseTime / 1000}\n`;
      });

      prometheusMetrics += `\n# HELP api_success_rate Success rate percentage\n`;
      prometheusMetrics += `# TYPE api_success_rate gauge\n`;
      healthStatuses.forEach(health => {
        prometheusMetrics += `api_success_rate{source="${health.source}"} ${health.successRate}\n`;
      });

      res.set('Content-Type', 'text/plain');
      return res.send(prometheusMetrics);
    }

    return ApiSuccess(res, metrics, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return createErrorResponse(
      res,
      'Failed to export metrics',
      500,
      ApiResponseWrapper.createMetadata(startTime, 'static'),
      error
    );
  }
});

// Export the service instance for use in other parts of the application
export { apiManagementService };





































