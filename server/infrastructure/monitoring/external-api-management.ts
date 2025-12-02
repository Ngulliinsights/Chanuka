import { Router, Request, Response, NextFunction } from 'express';
import { logger   } from '@shared/core';
import { httpUtils   } from '@shared/core';
import { UnifiedExternalAPIManagementService as ExternalAPIManagementService } from '@shared/external-data/external-api-manager.js';

// Helper functions using shared utilities
const sendResponse = (res: any, data: any, message: string = 'Success') => {
  return sendResponse(res, {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res: any, message: string, statusCode: number = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: 'API_ERROR',
      statusCode
    },
    timestamp: new Date().toISOString()
  });
};

export const router = Router();

// Initialize the external API management service
const apiManagementService = new ExternalAPIManagementService();

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_WINDOWS = {
  ONE_HOUR: 3600000,
  ONE_DAY: 86400000,
  ONE_WEEK: 604800000,
  ONE_MONTH: 2592000000,
} as const;

const METADATA_TYPES = {
  DATABASE: 'database',
  STATIC: 'static',
} as const;

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Wraps route handlers to provide consistent error handling and timing
 * This eliminates repetitive try-catch blocks in every route
 */
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    try {
      await fn(req, res);
    } catch (error) {
      console.error(`Error in ${req.method} ${req.path}:`, error);
      
      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      const statusCode = (error as any).statusCode || 500;
      
      return res.status(statusCode).json(ApiResponseWrapper.error(errorMessage, 'API_ERROR', statusCode));
    }
  };
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Safely parse query parameters as integers with validation
 * Returns undefined if parsing fails, preventing NaN issues
 */
const parseIntSafe = (value: any, defaultValue?: number): number | undefined => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Validate that a source parameter is a non-empty string
 */
const validateSource = (source: any): string | undefined => {
  return typeof source === 'string' && source.trim().length > 0 
    ? source.trim() 
    : undefined;
};

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * Get comprehensive API analytics
 * Query params: source (optional), timeWindow (optional, in milliseconds)
 */
router.get('/analytics', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const source = validateSource(req.query.source);
  const timeWindow = parseIntSafe(req.query.timeWindow);

  const analytics = apiManagementService.getAPIAnalytics(source);

  return res.json(ApiResponseWrapper.success(analytics, 'Analytics retrieved successfully'));
}));

/**
 * Get health status for all or specific API sources
 * Query params: source (optional)
 */
router.get('/health', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const source = validateSource(req.query.source);
  const healthStatuses = apiManagementService.getHealthStatus(source);

  // Calculate overall status based on all sources
  const overallStatus = healthStatuses.length === 0 
    ? 'unknown'
    : healthStatuses.every(s => s.status === 'healthy') 
      ? 'healthy'
      : healthStatuses.some(s => s.status === 'down') 
        ? 'degraded'
        : 'degraded';

  return sendResponse(res, {
    sources: healthStatuses,
    timestamp: new Date().toISOString(),
    overallStatus
  });
}));

/**
 * Get detailed health status for a specific API source
 * URL params: source (required)
 */
router.get('/health/:source', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const source = req.params.source;
  
  if (!source || source.trim().length === 0) {
    return sendError(res, 'Source parameter is required', 400);
  }

  const healthStatuses = apiManagementService.getHealthStatus(source);

  if (healthStatuses.length === 0) {
    return sendError(res, `API source '${source}' not found`, 404);
  }

  return sendResponse(res, healthStatuses[0]);
}));

/**
 * Get usage metrics for specific API source
 * URL params: source (required)
 * Query params: timeWindow (optional, in milliseconds)
 */
router.get('/usage/:source', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const source = req.params.source;
  const timeWindow = parseIntSafe(req.query.timeWindow);

  const analytics = apiManagementService.getAPIAnalytics(source);
  const sourceMetrics = analytics.sources.find(s => s.source === source);
  
  if (!sourceMetrics) {
    return sendError(res, `API source '${source}' not found or has no metrics`, 404);
  }

  return sendResponse(res, sourceMetrics);
}));

/**
 * Get cache statistics
 */
router.get('/cache/stats', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const cacheStats = apiManagementService.getCacheStatistics();
  
  return sendResponse(res, cacheStats);
}));

/**
 * Clear cache for specific source or all
 * Query params: source (optional)
 */
router.delete('/cache', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const source = validateSource(req.query.source);
  const clearedCount = apiManagementService.clearCache(source);

  const responseData = {
    message: source 
      ? `Cache cleared for source '${source}'`
      : 'All cache cleared',
    clearedEntries: clearedCount,
    timestamp: new Date().toISOString()
  };
  return res.json(ApiSuccess(responseData));
}));

/**
 * Get quota utilization for all sources
 */
router.get('/quota', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const analytics = apiManagementService.getAPIAnalytics();
  
  // Extract just the quota-relevant information for a cleaner response
  const quotaData = analytics.sources.map(source => ({
    source: source.source,
    quotaUtilization: source.quotaUtilization,
    totalRequests: source.totalRequests,
    totalCost: source.totalCost
  }));

  const responseData = {
    sources: quotaData,
    totalCost: analytics.totalCost,
    timestamp: new Date().toISOString()
  };
  return res.json(ApiSuccess(responseData));
}));

/**
 * Get cost analysis and breakdown
 * Query params: timeWindow (optional, in milliseconds, defaults to 24 hours)
 */
router.get('/costs', asyncHandler(async (req, res) => {
  const startTime = Date.now();

  // Default to 24 hours if not specified
  const timeWindowMs = parseIntSafe(req.query.timeWindow, TIME_WINDOWS.ONE_DAY);
  const analytics = apiManagementService.getAPIAnalytics();

  // Calculate projected monthly cost based on current usage rate
  // Extrapolate from the time window to a full month (30 days)
  const projectedMonthlyCost = timeWindowMs && timeWindowMs > 0
    ? (analytics.totalCost * TIME_WINDOWS.ONE_MONTH) / timeWindowMs
    : 0;

  const costAnalysis = {
    totalCost: analytics.totalCost,
    costBreakdown: analytics.costBreakdown,
    averageCostPerRequest: analytics.totalRequests > 0 
      ? analytics.totalCost / analytics.totalRequests 
      : 0,
    projectedMonthlyCost,
    timeWindowMs,
    // Identify the most expensive sources for cost optimization efforts
    topCostSources: Object.entries(analytics.costBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([source, cost]) => ({ source, cost })),
    timestamp: new Date().toISOString()
  };

  return sendResponse(res, costAnalysis);
}));

/**
 * Get performance metrics across all sources
 */
router.get('/performance', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // Make both service calls at once for better performance
  const [analytics, healthStatuses] = await Promise.all([
    Promise.resolve(apiManagementService.getAPIAnalytics()),
    Promise.resolve(apiManagementService.getHealthStatus())
  ]);

  // Combine health and analytics data for comprehensive performance view
  const sourcePerformance = healthStatuses.map(health => {
    const sourceMetrics = analytics.sources.find(s => s.source === health.source);
    
    // Count recent downtime events (within last 24 hours)
    const recentDowntimeCount = health.downtimeEvents.filter(event => {
      const isOngoing = !event.endTime;
      const isRecent = (Date.now() - event.startTime.getTime()) < TIME_WINDOWS.ONE_DAY;
      return isOngoing || isRecent;
    }).length;

    return {
      source: health.source,
      status: health.status,
      responseTime: health.responseTime,
      successRate: health.successRate,
      errorRate: health.errorRate,
      uptime: health.uptime,
      totalRequests: sourceMetrics?.totalRequests || 0,
      recentDowntime: recentDowntimeCount
    };
  });

  const performanceData = {
    overallMetrics: {
      averageResponseTime: analytics.averageResponseTime,
      successRate: analytics.overallSuccessRate,
      totalRequests: analytics.totalRequests,
      cacheHitRate: analytics.cacheHitRate
    },
    sourcePerformance,
    topPerformingSources: analytics.topPerformingSources,
    timestamp: new Date().toISOString()
  };

  return sendResponse(res, performanceData);
}));

/**
 * Get error analysis and breakdown
 * Query params: source (optional), timeWindow (optional, in milliseconds)
 */
router.get('/errors', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const source = validateSource(req.query.source);
  const timeWindow = parseIntSafe(req.query.timeWindow);

  const analytics = apiManagementService.getAPIAnalytics(source);

  // Aggregate errors across all sources
  const totalErrors = analytics.sources.reduce((sum, s) => sum + s.failedRequests, 0);
  const errorBreakdown = analytics.sources.reduce((breakdown, source) => {
    Object.entries(source.errorBreakdown).forEach(([errorType, count]) => {
      breakdown[errorType] = (breakdown[errorType] || 0) + count;
    });
    return breakdown;
  }, {} as Record<string, number>);

  const errorAnalysis = {
    totalErrors,
    errorRate: 100 - analytics.overallSuccessRate,
    errorBreakdown,
    sourceErrors: analytics.sources.map(s => ({
      source: s.source,
      errorCount: s.failedRequests,
      errorRate: s.totalRequests > 0 
        ? (s.failedRequests / s.totalRequests) * 100 
        : 0,
      errorBreakdown: s.errorBreakdown
    })),
    timestamp: new Date().toISOString()
  };

  return sendResponse(res, errorAnalysis);
}));

/**
 * Test API endpoint connectivity
 * URL params: source (required)
 * Body params: endpoint (optional, defaults to '/health'), method (optional, defaults to 'GET')
 */
router.post('/test/:source', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const source = req.params.source;
  const { endpoint = '/health', method = 'GET' } = req.body;

  // Validate source parameter
  if (!source || source.trim().length === 0) {
    return sendError(res, 'Source parameter is required', 400);
  }

  const result = await apiManagementService.makeRequest(source, endpoint, {
    method,
    bypassCache: true,
    priority: 'high'
  });

  const responseData = {
    source,
    endpoint,
    method,
    testResult: result,
    timestamp: new Date().toISOString()
  };
  return res.json(ApiSuccess(responseData));
}));

/**
 * Get comprehensive dashboard data
 * Aggregates multiple data sources for a single dashboard view
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // Fetch all dashboard data in parallel for better performance
  const [analytics, healthStatuses, cacheStats] = await Promise.all([
    Promise.resolve(apiManagementService.getAPIAnalytics()),
    Promise.resolve(apiManagementService.getHealthStatus()),
    Promise.resolve(apiManagementService.getCacheStatistics())
  ]);

  // Compile recent errors from all sources
  const recentErrors = healthStatuses
    .flatMap(h => h.downtimeEvents
      .slice(-3)
      .map(e => ({ 
        source: h.source, 
        startTime: e.startTime,
        endTime: e.endTime,
        reason: e.reason
      }))
    )
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, 10);

  // Calculate quota utilization - find max utilization across all quotas for each source
  const quotaUtilization = analytics.sources.map(s => ({
    source: s.source,
    utilization: Math.max(...Object.values(s.quotaUtilization))
  }));

  const dashboardData = {
    overview: {
      totalSources: healthStatuses.length,
      healthySources: healthStatuses.filter(h => h.status === 'healthy').length,
      totalRequests: analytics.totalRequests,
      totalCost: analytics.totalCost,
      averageResponseTime: analytics.averageResponseTime,
      successRate: analytics.overallSuccessRate,
      cacheHitRate: analytics.cacheHitRate
    },
    healthStatus: healthStatuses.map(h => ({
      source: h.source,
      status: h.status,
      responseTime: h.responseTime,
      last_checked: h.last_checked
    })),
    topSources: analytics.topPerformingSources.slice(0, 5),
    recentErrors,
    quotaUtilization,
    cacheStatistics: {
      totalEntries: cacheStats.totalEntries,
      hitRate: cacheStats.hitRate,
      totalSize: cacheStats.totalSize
    },
    timestamp: new Date().toISOString()
  };

  return sendResponse(res, dashboardData);
}));

// Export the service instance for use in other parts of the application
export { apiManagementService };













































