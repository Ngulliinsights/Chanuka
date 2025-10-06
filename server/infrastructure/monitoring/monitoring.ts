import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
// Monitoring service functionality will be implemented inline
import { systemHealthService } from './system-health.js';
import { apmService } from './apm-service.js';
import { performanceMonitor } from './performance-monitor.js';
import { errorTracker } from '../../core/errors/error-tracker.js';
import { alertingService } from '../notifications/alerting-service.js';
import { databaseOptimizationService } from '../database/database-optimization.js';
import { connectionPoolService } from '../database/connection-pool.js';
import { advancedCachingService } from '../cache/advanced-caching.js';
import { cacheWarmingService } from '../cache/cache-warming.js';
import { ApiSuccess, ApiErrorResponse, ApiResponseWrapper } from '../../utils/api-response.js';
import { z } from 'zod';

export const router = Router();

// All monitoring routes require admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Get comprehensive monitoring dashboard data
router.get('/system/dashboard', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get dashboard data from various services
    const [health, metrics, apmMetrics] = await Promise.all([
      systemHealthService.checkSystemHealth(),
      systemHealthService.getSystemMetrics(),
      apmService.getAPMMetrics()
    ]);
    
    const dashboardData = {
      health,
      metrics,
      apm: apmMetrics,
      timestamp: new Date()
    };
    return ApiSuccess(res, dashboardData, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching monitoring dashboard data:', error);
    return ApiError(res, 'Failed to fetch monitoring data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get system health check
router.get('/system/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const health = await systemHealthService.checkSystemHealth();
    return ApiSuccess(res, health, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error checking system health:', error);
    return ApiError(res, 'Failed to check system health', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get system metrics
router.get('/system/metrics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = await systemHealthService.getSystemMetrics();
    return ApiSuccess(res, metrics, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return ApiError(res, 'Failed to fetch system metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get performance metrics
router.get('/system/performance', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const performance = await systemHealthService.getPerformanceMetrics();
    return ApiSuccess(res, performance, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return ApiError(res, 'Failed to fetch performance metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get user engagement metrics
router.get('/engagement/users', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // TODO: Implement user engagement metrics
    const userEngagement = { message: 'User engagement metrics not yet implemented' };
    return ApiSuccess(res, userEngagement, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching user engagement metrics:', error);
    return ApiError(res, 'Failed to fetch user engagement metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get content metrics
router.get('/engagement/content', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // TODO: Implement content metrics
    const contentMetrics = { message: 'Content metrics not yet implemented' };
    return ApiSuccess(res, contentMetrics, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching content metrics:', error);
    return ApiError(res, 'Failed to fetch content metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get platform analytics
router.get('/analytics/platform', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // TODO: Implement platform analytics
    const analytics = { message: 'Platform analytics not yet implemented' };
    return ApiSuccess(res, analytics, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    return ApiError(res, 'Failed to fetch platform analytics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Get system alerts
router.get('/alerts', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const activeOnly = req.query.active === 'true';
    // TODO: Implement alert management
    const alerts = [];
    
    return ApiSuccess(res, { alerts }, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return ApiError(res, 'Failed to fetch alerts', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Resolve an alert
router.post('/alerts/:alertId/resolve', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { alertId } = req.params;
    // TODO: Implement alert resolution
    const resolved = false;
    
    if (resolved) {
      return ApiSuccess(res, { message: 'Alert resolved successfully' }, 
        ApiResponseWrapper.createMetadata(startTime, 'static'));
    } else {
      return ApiError(res, 'Alert not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'static'));
    }
  } catch (error) {
    console.error('Error resolving alert:', error);
    return ApiError(res, 'Failed to resolve alert', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Clear resolved alerts
router.delete('/alerts/resolved', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // TODO: Implement clear resolved alerts functionality
    return ApiSuccess(res, { message: 'Resolved alerts cleared successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  } catch (error) {
    console.error('Error clearing resolved alerts:', error);
    return ApiError(res, 'Failed to clear resolved alerts', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Get metrics history for charts
const metricsHistorySchema = z.object({
  hours: z.string().optional().transform(val => val ? parseInt(val) : 24)
});

router.get('/system/metrics/history', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { hours } = metricsHistorySchema.parse(req.query);
    // TODO: Implement metrics history
    const history = [];
    
    return ApiSuccess(res, { history }, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  } catch (error) {
    console.error('Error fetching metrics history:', error);
    return ApiError(res, 'Failed to fetch metrics history', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Export monitoring data
const exportSchema = z.object({
  format: z.enum(['json', 'csv']).optional().default('json')
});

router.get('/export', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { format } = exportSchema.parse(req.query);
    // TODO: Implement export monitoring data functionality
    const exportData = format === 'json' ? '{}' : 'No data available';
    
    const filename = `monitoring-data-${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(exportData);
  } catch (error) {
    console.error('Error exporting monitoring data:', error);
    return ApiError(res, 'Failed to export monitoring data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Record API request metrics (middleware endpoint)
router.post('/metrics/api-request', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { responseTime, statusCode, endpoint } = req.body;
    systemHealthService.recordAPIRequest(responseTime, statusCode, endpoint);
    
    return ApiSuccess(res, { message: 'Metrics recorded' }, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  } catch (error) {
    console.error('Error recording API metrics:', error);
    return ApiError(res, 'Failed to record metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Record database query metrics (middleware endpoint)
router.post('/metrics/database-query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { queryTime, success } = req.body;
    systemHealthService.recordDatabaseQuery(queryTime, success);
    
    return ApiSuccess(res, { message: 'Database metrics recorded' }, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  } catch (error) {
    console.error('Error recording database metrics:', error);
    return ApiError(res, 'Failed to record database metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// System maintenance endpoints

// Clear old metrics
router.post('/system/maintenance/clear-metrics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    systemHealthService.clearOldMetrics();
    return ApiSuccess(res, { message: 'Old metrics cleared successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  } catch (error) {
    console.error('Error clearing old metrics:', error);
    return ApiError(res, 'Failed to clear old metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});

// Get system status summary
router.get('/system/status', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const [health, metrics] = await Promise.all([
      systemHealthService.checkSystemHealth(),
      systemHealthService.getSystemMetrics()
    ]);

    const status = {
      overall: health.status,
      score: health.score,
      uptime: metrics.uptime,
      memoryUsage: metrics.memory.percentage,
      databaseConnected: metrics.database.connected,
      apiErrorRate: metrics.api.errorRate,
      activeAlerts: monitoringService.getActiveAlerts().length,
      timestamp: new Date()
    };

    return ApiSuccess(res, status, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching system status:', error);
    return ApiError(res, 'Failed to fetch system status', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// ===== APM (Application Performance Monitoring) Routes =====

// Get comprehensive APM metrics
router.get('/apm/metrics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = await apmService.getAPMMetrics();
    return ApiSuccess(res, metrics, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching APM metrics:', error);
    return ApiError(res, 'Failed to retrieve APM metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get performance report with trends and recommendations
const performanceReportSchema = z.object({
  timeRange: z.enum(['hour', 'day', 'week']).optional().default('hour')
});

router.get('/apm/performance-report', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { timeRange } = performanceReportSchema.parse(req.query);
    const report = await apmService.getPerformanceReport(timeRange);
    return ApiSuccess(res, report, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching performance report:', error);
    return ApiError(res, 'Failed to retrieve performance report', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get APM alerts (separate from system alerts)
router.get('/apm/alerts', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const alerts = apmService.getActiveAlerts();
    return ApiSuccess(res, { alerts }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching APM alerts:', error);
    return ApiError(res, 'Failed to retrieve APM alerts', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Resolve APM alert
router.post('/apm/alerts/:alertId/resolve', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { alertId } = req.params;
    const resolved = apmService.resolveAlert(alertId);

    if (!resolved) {
      return ApiError(res, 'Alert not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'system'));
    }

    return ApiSuccess(res, { resolved: true }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error resolving APM alert:', error);
    return ApiError(res, 'Failed to resolve alert', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get performance traces for detailed analysis
const tracesSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100)
});

router.get('/apm/traces', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit } = tracesSchema.parse(req.query);
    const traces = performanceMonitor.getRecentTraces(limit);
    return ApiSuccess(res, { traces }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching performance traces:', error);
    return ApiError(res, 'Failed to retrieve performance traces', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get error statistics and patterns
const errorStatsSchema = z.object({
  timeWindow: z.string().optional().transform(val => val ? parseInt(val) : 60),
  resolved: z.string().optional().transform(val => 
    val === 'true' ? true : val === 'false' ? false : undefined
  )
});

router.get('/apm/errors', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { timeWindow, resolved } = errorStatsSchema.parse(req.query);
    
    const stats = errorTracker.getErrorStats(timeWindow);
    const recentErrors = errorTracker.getRecentErrors(100, resolved);
    const patterns = errorTracker.getErrorPatterns(resolved);

    return ApiSuccess(res, {
      stats,
      recentErrors,
      patterns
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching error statistics:', error);
    return ApiError(res, 'Failed to retrieve error statistics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Track business metrics
const businessMetricSchema = z.object({
  metric: z.string(),
  value: z.number().optional(),
  increment: z.number().optional()
});

router.post('/apm/business-metrics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { metric, value, increment } = businessMetricSchema.parse(req.body);

    if (increment !== undefined) {
      apmService.incrementBusinessMetric(metric, increment);
    } else if (value !== undefined) {
      apmService.trackBusinessMetric(metric, value);
    } else {
      apmService.incrementBusinessMetric(metric, 1);
    }

    return ApiSuccess(res, { metric, tracked: true }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error tracking business metric:', error);
    return ApiError(res, 'Failed to track business metric', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get performance baselines for regression detection
router.get('/apm/baselines', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // This would require adding a method to APM service to expose baselines
    const summary = performanceMonitor.getPerformanceSummary();
    const regressions = performanceMonitor.checkPerformanceRegressions();
    
    return ApiSuccess(res, { 
      summary,
      regressions,
      message: 'Performance baselines and regression analysis'
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching performance baselines:', error);
    return ApiError(res, 'Failed to retrieve performance baselines', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Trigger manual performance baseline update
router.post('/apm/baselines/update', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await apmService.updateBaselines();
    return ApiSuccess(res, { message: 'Performance baselines updated successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error updating performance baselines:', error);
    return ApiError(res, 'Failed to update performance baselines', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// ===== Alerting System Routes =====

// Get all alert rules
router.get('/alerting/rules', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const rules = alertingService.getAlertRules();
    return ApiSuccess(res, { rules }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    return ApiError(res, 'Failed to retrieve alert rules', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Create new alert rule
const alertRuleSchema = z.object({
  name: z.string(),
  description: z.string(),
  enabled: z.boolean().default(true),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  conditions: z.array(z.object({
    metric: z.string(),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
    threshold: z.number(),
    timeWindow: z.number()
  })),
  actions: z.array(z.object({
    type: z.enum(['email', 'webhook', 'log', 'slack']),
    target: z.string(),
    template: z.string().optional(),
    enabled: z.boolean().default(true)
  })),
  cooldown: z.number()
});

router.post('/alerting/rules', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const ruleData = alertRuleSchema.parse(req.body);
    const ruleId = alertingService.addAlertRule(ruleData);
    
    return ApiSuccess(res, { ruleId, message: 'Alert rule created successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error creating alert rule:', error);
    return ApiError(res, 'Failed to create alert rule', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Update alert rule
router.put('/alerting/rules/:ruleId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { ruleId } = req.params;
    const updates = alertRuleSchema.partial().parse(req.body);
    const updated = alertingService.updateAlertRule(ruleId, updates);
    
    if (!updated) {
      return ApiError(res, 'Alert rule not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'system'));
    }
    
    return ApiSuccess(res, { message: 'Alert rule updated successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error updating alert rule:', error);
    return ApiError(res, 'Failed to update alert rule', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Delete alert rule
router.delete('/alerting/rules/:ruleId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { ruleId } = req.params;
    const deleted = alertingService.deleteAlertRule(ruleId);
    
    if (!deleted) {
      return ApiError(res, 'Alert rule not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'system'));
    }
    
    return ApiSuccess(res, { message: 'Alert rule deleted successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error deleting alert rule:', error);
    return ApiError(res, 'Failed to delete alert rule', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get active alerts from alerting service
router.get('/alerting/alerts/active', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const alerts = alertingService.getActiveAlerts();
    return ApiSuccess(res, { alerts }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    return ApiError(res, 'Failed to retrieve active alerts', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get alert history
const alertHistorySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100)
});

router.get('/alerting/alerts/history', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit } = alertHistorySchema.parse(req.query);
    const history = alertingService.getAlertHistory(limit);
    return ApiSuccess(res, { history }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching alert history:', error);
    return ApiError(res, 'Failed to retrieve alert history', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Acknowledge alert
router.post('/alerting/alerts/:alertId/acknowledge', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;
    const acknowledged = alertingService.acknowledgeAlert(alertId, acknowledgedBy);
    
    if (!acknowledged) {
      return ApiError(res, 'Alert not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'system'));
    }
    
    return ApiSuccess(res, { message: 'Alert acknowledged successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return ApiError(res, 'Failed to acknowledge alert', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Resolve alert from alerting service
router.post('/alerting/alerts/:alertId/resolve', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { alertId } = req.params;
    const { resolvedBy } = req.body;
    const resolved = alertingService.resolveAlert(alertId, resolvedBy);
    
    if (!resolved) {
      return ApiError(res, 'Alert not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'system'));
    }
    
    return ApiSuccess(res, { message: 'Alert resolved successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error resolving alert:', error);
    return ApiError(res, 'Failed to resolve alert', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get alert statistics
const alertStatsSchema = z.object({
  timeWindow: z.string().optional().transform(val => val ? parseInt(val) : 24)
});

router.get('/alerting/statistics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { timeWindow } = alertStatsSchema.parse(req.query);
    const statistics = alertingService.getAlertStatistics(timeWindow);
    return ApiSuccess(res, statistics, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching alert statistics:', error);
    return ApiError(res, 'Failed to retrieve alert statistics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// ===== Database Optimization Routes =====

// Get database performance metrics
router.get('/database/metrics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = await databaseOptimizationService.getDatabaseMetrics();
    return ApiSuccess(res, metrics, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching database metrics:', error);
    return ApiError(res, 'Failed to retrieve database metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Create optimized database indexes
router.post('/database/optimize/indexes', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await databaseOptimizationService.createOptimizedIndexes();
    return ApiSuccess(res, { message: 'Database indexes created successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error creating database indexes:', error);
    return ApiError(res, 'Failed to create database indexes', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get query optimization suggestions
router.get('/database/optimize/queries', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const optimizations = await databaseOptimizationService.analyzeQueryPerformance();
    return ApiSuccess(res, { optimizations }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error analyzing query performance:', error);
    return ApiError(res, 'Failed to analyze query performance', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Optimize database tables (VACUUM ANALYZE)
router.post('/database/optimize/tables', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await databaseOptimizationService.optimizeTables();
    return ApiSuccess(res, { message: 'Database tables optimized successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error optimizing database tables:', error);
    return ApiError(res, 'Failed to optimize database tables', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Clean up expired data
router.post('/database/cleanup', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await databaseOptimizationService.cleanupExpiredData();
    return ApiSuccess(res, { message: 'Database cleanup completed successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return ApiError(res, 'Failed to cleanup database', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get query cache statistics
router.get('/database/cache/stats', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const stats = databaseOptimizationService.getCacheStats();
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching cache statistics:', error);
    return ApiError(res, 'Failed to retrieve cache statistics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Clear query cache
const cacheClearSchema = z.object({
  pattern: z.string().optional()
});

router.post('/database/cache/clear', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { pattern } = cacheClearSchema.parse(req.body);
    databaseOptimizationService.clearCache(pattern);
    return ApiSuccess(res, { message: 'Cache cleared successfully' }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error clearing cache:', error);
    return ApiError(res, 'Failed to clear cache', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// ===== Connection Pool Routes =====

// Get connection pool metrics
router.get('/database/pool/metrics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = connectionPoolService.getPoolMetrics();
    return ApiSuccess(res, metrics, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching pool metrics:', error);
    return ApiError(res, 'Failed to retrieve connection pool metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get connection pool health status
router.get('/database/pool/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const health = connectionPoolService.getHealthStatus();
    return ApiSuccess(res, health, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching pool health:', error);
    return ApiError(res, 'Failed to retrieve connection pool health', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get query performance metrics from connection pool
const queryMetricsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100)
});

router.get('/database/pool/queries', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit } = queryMetricsSchema.parse(req.query);
    const queries = connectionPoolService.getQueryMetrics(limit);
    return ApiSuccess(res, { queries }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching query metrics:', error);
    return ApiError(res, 'Failed to retrieve query metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get slow queries from connection pool
const slowQueriesSchema = z.object({
  threshold: z.string().optional().transform(val => val ? parseInt(val) : 1000),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20)
});

router.get('/database/pool/slow-queries', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { threshold, limit } = slowQueriesSchema.parse(req.query);
    const slowQueries = connectionPoolService.getSlowQueries(threshold, limit);
    return ApiSuccess(res, { slowQueries }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching slow queries:', error);
    return ApiError(res, 'Failed to retrieve slow queries', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Optimize connection pool settings
router.post('/database/pool/optimize', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await connectionPoolService.optimizePoolSettings();
    return ApiSuccess(res, { message: 'Connection pool optimization completed' }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error optimizing connection pool:', error);
    return ApiError(res, 'Failed to optimize connection pool', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// ===== Advanced Caching Routes =====

// Get comprehensive cache statistics
router.get('/cache/stats', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const stats = advancedCachingService.getCacheStats();
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching cache statistics:', error);
    return ApiError(res, 'Failed to retrieve cache statistics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get cache entry
const cacheGetSchema = z.object({
  key: z.string()
});

router.get('/cache/get', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { key } = cacheGetSchema.parse(req.query);
    const value = await advancedCachingService.get(key);
    
    return ApiSuccess(res, { 
      key, 
      value, 
      found: value !== null 
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error getting cache entry:', error);
    return ApiError(res, 'Failed to retrieve cache entry', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Set cache entry
const cacheSetSchema = z.object({
  key: z.string(),
  value: z.any(),
  ttl: z.number().optional()
});

router.post('/cache/set', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { key, value, ttl } = cacheSetSchema.parse(req.body);
    const success = await advancedCachingService.set(key, value, ttl);
    
    return ApiSuccess(res, { 
      key, 
      success,
      message: success ? 'Cache entry set successfully' : 'Failed to set cache entry'
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error setting cache entry:', error);
    return ApiError(res, 'Failed to set cache entry', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Delete cache entry
const cacheDeleteSchema = z.object({
  key: z.string()
});

router.delete('/cache/delete', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { key } = cacheDeleteSchema.parse(req.body);
    const success = await advancedCachingService.delete(key);
    
    return ApiSuccess(res, { 
      key, 
      success,
      message: success ? 'Cache entry deleted successfully' : 'Cache entry not found'
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error deleting cache entry:', error);
    return ApiError(res, 'Failed to delete cache entry', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Invalidate cache pattern
const cacheInvalidateSchema = z.object({
  pattern: z.string()
});

router.post('/cache/invalidate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { pattern } = cacheInvalidateSchema.parse(req.body);
    const invalidatedCount = await advancedCachingService.invalidate(pattern);
    
    return ApiSuccess(res, { 
      pattern, 
      invalidatedCount,
      message: `Invalidated ${invalidatedCount} cache entries`
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return ApiError(res, 'Failed to invalidate cache', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Trigger cache invalidation by event
const cacheInvalidationTriggerSchema = z.object({
  event: z.string(),
  data: z.any().optional()
});

router.post('/cache/trigger-invalidation', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { event, data } = cacheInvalidationTriggerSchema.parse(req.body);
    await advancedCachingService.triggerInvalidation(event, data);
    
    return ApiSuccess(res, { 
      event,
      message: 'Cache invalidation triggered successfully'
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error triggering cache invalidation:', error);
    return ApiError(res, 'Failed to trigger cache invalidation', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// ===== Cache Warming Routes =====

// Get cache warming statistics
router.get('/cache/warming/stats', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const stats = cacheWarmingService.getWarmingStats();
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching warming statistics:', error);
    return ApiError(res, 'Failed to retrieve warming statistics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Get all warming rules
router.get('/cache/warming/rules', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const rules = cacheWarmingService.getWarmingRules();
    return ApiSuccess(res, { rules }, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error fetching warming rules:', error);
    return ApiError(res, 'Failed to retrieve warming rules', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Execute cache warming cycle
const warmingCycleSchema = z.object({
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional()
});

router.post('/cache/warming/execute', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { priority } = warmingCycleSchema.parse(req.body);
    await cacheWarmingService.executeWarmingCycle(priority);
    
    return ApiSuccess(res, { 
      message: 'Cache warming cycle executed successfully',
      priority: priority || 'all'
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error executing warming cycle:', error);
    return ApiError(res, 'Failed to execute warming cycle', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Toggle warming rule
const toggleWarmingRuleSchema = z.object({
  ruleId: z.string(),
  enabled: z.boolean()
});

router.post('/cache/warming/rules/toggle', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { ruleId, enabled } = toggleWarmingRuleSchema.parse(req.body);
    const success = cacheWarmingService.toggleWarmingRule(ruleId, enabled);
    
    if (!success) {
      return ApiError(res, 'Warming rule not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'system'));
    }
    
    return ApiSuccess(res, { 
      ruleId,
      enabled,
      message: `Warming rule ${enabled ? 'enabled' : 'disabled'} successfully`
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error toggling warming rule:', error);
    return ApiError(res, 'Failed to toggle warming rule', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

// Execute startup cache warming
router.post('/cache/warming/startup', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await cacheWarmingService.warmOnStartup();
    return ApiSuccess(res, { 
      message: 'Startup cache warming completed successfully'
    }, ApiResponseWrapper.createMetadata(startTime, 'system'));
  } catch (error) {
    console.error('Error executing startup warming:', error);
    return ApiError(res, 'Failed to execute startup warming', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'system'));
  }
});

export default router;