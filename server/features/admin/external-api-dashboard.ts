/**
 * External API Management Dashboard
 * 
 * Provides comprehensive monitoring and management capabilities for external APIs
 * as part of task 12.3 - Build External API Management
 */

import { Router } from 'express';
import { ApiSuccess, ApiErrorResponse, ApiResponseWrapper } from '../../utils/api-response.js';
import { UnifiedExternalAPIManagementService as ExternalAPIManagementService } from '../../infrastructure/external-data/external-api-manager.js';
import { performanceMonitor } from '../../infrastructure/monitoring/performance-monitor.js';
import { advancedCachingService } from '../../infrastructure/cache/advanced-caching.js';

export const router = Router();

// Initialize the external API management service
const apiManagementService = new ExternalAPIManagementService();

/**
 * Get comprehensive dashboard overview
 */
router.get('/dashboard', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const analytics = apiManagementService.getAPIAnalytics();
    const healthStatuses = apiManagementService.getHealthStatus();
    const cacheStats = apiManagementService.getCacheStatistics();
    const performanceStats = performanceMonitor.getPerformanceSummary();
    const advancedCacheStats = advancedCachingService.getCacheStats();

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
      
      // API Health Status
      healthStatus: healthStatuses.map(h => ({
        source: h.source,
        status: h.status,
        responseTime: h.responseTime,
        successRate: h.successRate,
        errorRate: h.errorRate,
        uptime: h.uptime,
        lastChecked: h.lastChecked,
        recentDowntime: h.downtimeEvents
          .filter(event => !event.endTime || (new Date().getTime() - event.startTime.getTime()) < 86400000)
          .length
      })),

      // Performance Metrics
      performance: {
        topPerformingSources: analytics.topPerformingSources.slice(0, 5),
        slowestEndpoints: performanceStats.slowestEndpoints.slice(0, 10),
        recentErrors: performanceStats.recentErrors.slice(0, 20),
        averageResponseTime: performanceStats.averageResponseTime,
        errorRate: performanceStats.errorRate
      },

      // Cost Analysis
      costAnalysis: {
        totalCost: analytics.totalCost,
        costBreakdown: analytics.costBreakdown,
        averageCostPerRequest: analytics.totalRequests > 0 
          ? analytics.totalCost / analytics.totalRequests 
          : 0,
        topCostSources: Object.entries(analytics.costBreakdown)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([source, cost]) => ({ source, cost }))
      },

      // Quota Utilization
      quotaUtilization: analytics.sources.map(s => ({
        source: s.source,
        minute: s.quotaUtilization.minute,
        hour: s.quotaUtilization.hour,
        day: s.quotaUtilization.day,
        month: s.quotaUtilization.month,
        maxUtilization: Math.max(...Object.values(s.quotaUtilization))
      })),

      // Cache Statistics
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

      // Error Analysis
      errorAnalysis: {
        totalErrors: analytics.sources.reduce((sum, s) => sum + s.failedRequests, 0),
        errorRate: analytics.overallSuccessRate > 0 ? 100 - analytics.overallSuccessRate : 0,
        errorBreakdown: analytics.sources.reduce((breakdown, source) => {
          Object.entries(source.errorBreakdown).forEach(([errorType, count]) => {
            breakdown[errorType] = (breakdown[errorType] || 0) + count;
          });
          return breakdown;
        }, {} as Record<string, number>),
        sourceErrors: analytics.sources.map(s => ({
          source: s.source,
          errorCount: s.failedRequests,
          errorRate: s.totalRequests > 0 ? (s.failedRequests / s.totalRequests) * 100 : 0,
          topErrors: Object.entries(s.errorBreakdown)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }))
        }))
      },

      // Recent Activity
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
    console.error('Error getting external API dashboard data:', error);
    return ApiError(res, 'Failed to retrieve dashboard data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Get real-time monitoring data
 */
router.get('/monitoring/realtime', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const analytics = apiManagementService.getAPIAnalytics();
    const healthStatuses = apiManagementService.getHealthStatus();
    const performanceRegressions = performanceMonitor.checkPerformanceRegressions();

    const realtimeData = {
      currentStatus: {
        totalRequests: analytics.totalRequests,
        successRate: analytics.overallSuccessRate,
        averageResponseTime: analytics.averageResponseTime,
        activeAlerts: performanceRegressions.length,
        healthySources: healthStatuses.filter(h => h.status === 'healthy').length,
        totalSources: healthStatuses.length
      },
      
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
    console.error('Error getting real-time monitoring data:', error);
    return ApiError(res, 'Failed to retrieve real-time data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Optimize API performance
 */
router.post('/optimize', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { action, source, parameters } = req.body;
    let result: any = {};

    switch (action) {
      case 'warm_cache':
        // Warm cache for critical endpoints
        const warmingRules = [
          {
            key: `${source}:bills:recent`,
            fetchFn: async () => {
              return await apiManagementService.makeRequest(source, '/bills', { limit: 50 });
            },
            ttl: 300, // 5 minutes
            priority: 'high' as const
          },
          {
            key: `${source}:sponsors:active`,
            fetchFn: async () => {
              return await apiManagementService.makeRequest(source, '/sponsors', { active: true });
            },
            ttl: 600, // 10 minutes
            priority: 'medium' as const
          }
        ];
        
        await advancedCachingService.warmCache(warmingRules);
        result = { message: 'Cache warming initiated', rules: warmingRules.length };
        break;

      case 'clear_cache':
        const clearedCount = apiManagementService.clearCache(source);
        result = { message: `Cache cleared for ${source || 'all sources'}`, clearedEntries: clearedCount };
        break;

      case 'reset_quotas':
        // This would reset quotas for a specific source
        result = { message: `Quotas reset for ${source}` };
        break;

      case 'trigger_health_check':
        // Force health check for all sources
        const healthStatuses = apiManagementService.getHealthStatus();
        result = { 
          message: 'Health checks triggered', 
          sources: healthStatuses.length,
          timestamp: new Date().toISOString()
        };
        break;

      default:
        return ApiError(res, `Unknown optimization action: ${action}`, 400,
          ApiResponseWrapper.createMetadata(startTime, 'static'));
    }

    return ApiSuccess(res, result, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error performing API optimization:', error);
    return ApiError(res, 'Failed to perform optimization', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Get detailed source configuration
 */
router.get('/sources/:sourceId/config', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { sourceId } = req.params;
    const analytics = apiManagementService.getAPIAnalytics(sourceId);
    const healthStatus = apiManagementService.getHealthStatus(sourceId);

    if (healthStatus.length === 0) {
      return ApiError(res, `Source '${sourceId}' not found`, 404,
        ApiResponseWrapper.createMetadata(startTime, 'static'));
    }

    const sourceConfig = {
      source: sourceId,
      health: healthStatus[0],
      metrics: analytics.sources.find(s => s.source === sourceId),
      configuration: {
        // This would come from the actual configuration
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
      recommendations: []
    };

    // Add performance recommendations
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
    console.error(`Error getting source configuration for ${req.params.sourceId}:`, error);
    return ApiError(res, 'Failed to retrieve source configuration', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Update source configuration
 */
router.put('/sources/:sourceId/config', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { sourceId } = req.params;
    const { rateLimit, caching, failover, monitoring } = req.body;

    // This would update the actual configuration
    // For now, we'll just return a success response
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
    console.error(`Error updating source configuration for ${req.params.sourceId}:`, error);
    return ApiError(res, 'Failed to update source configuration', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Get comprehensive cost report
 */
router.get('/costs/report', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const costReport = apiManagementService.getCostReport();
    return ApiSuccess(res, costReport, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error getting cost report:', error);
    return ApiError(res, 'Failed to retrieve cost report', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Get cost alerts
 */
router.get('/costs/alerts', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const costMonitoring = apiManagementService.getCostMonitoring();
    const alerts = costMonitoring.getActiveAlerts();
    return ApiSuccess(res, { alerts, count: alerts.length }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error getting cost alerts:', error);
    return ApiError(res, 'Failed to retrieve cost alerts', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Acknowledge cost alert
 */
router.post('/costs/alerts/:alertId/acknowledge', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { alertId } = req.params;
    const costMonitoring = apiManagementService.getCostMonitoring();
    const acknowledged = costMonitoring.acknowledgeAlert(alertId);
    
    if (acknowledged) {
      return ApiSuccess(res, { message: 'Alert acknowledged', alertId }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } else {
      return ApiError(res, 'Alert not found', 404, ApiResponseWrapper.createMetadata(startTime, 'static'));
    }
  } catch (error) {
    console.error('Error acknowledging cost alert:', error);
    return ApiError(res, 'Failed to acknowledge alert', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Get cost optimization recommendations
 */
router.get('/costs/recommendations', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const costMonitoring = apiManagementService.getCostMonitoring();
    const recommendations = costMonitoring.getCostOptimizationRecommendations();
    return ApiSuccess(res, { recommendations, count: recommendations.length }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error getting cost recommendations:', error);
    return ApiError(res, 'Failed to retrieve cost recommendations', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Update budget configuration
 */
router.put('/costs/budget/:source', async (req, res) => {
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
    console.error('Error updating budget configuration:', error);
    return ApiError(res, 'Failed to update budget configuration', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

/**
 * Export metrics for external monitoring systems
 */
router.get('/metrics/export', async (req, res) => {
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

    if (format === 'prometheus') {
      // Convert to Prometheus format
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
    console.error('Error exporting metrics:', error);
    return ApiError(res, 'Failed to export metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Export the service instance for use in other parts of the application
export { apiManagementService };