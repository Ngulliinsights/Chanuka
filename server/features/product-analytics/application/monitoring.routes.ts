/**
 * Integration Monitoring API Routes
 * 
 * Provides endpoints for:
 * - Dashboard data
 * - Feature metrics
 * - Health checks
 * - Alerts management
 * - Logs retrieval
 */

import { Router, Request, Response } from 'express';
import { integrationMonitor } from '../domain/integration-monitor.service';
import { logger } from '@server/infrastructure/observability';
import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';

const router = Router();

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * GET /api/monitoring/dashboard
 * Get monitoring dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboardData = await integrationMonitor.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'high', 'system');
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// FEATURES
// ============================================================================

/**
 * POST /api/monitoring/features
 * Register a new feature for monitoring
 */
router.post('/features', async (req: Request, res: Response) => {
  try {
    const feature = await integrationMonitor.registerFeature(req.body);
    res.status(201).json(feature);
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'medium', 'system');
    res.status(500).json({
      error: 'Failed to register feature',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/monitoring/features/:featureId/status
 * Update feature status
 */
router.put('/features/:featureId/status', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { enabled, healthStatus } = req.body;

    await integrationMonitor.updateFeatureStatus(featureId, enabled, healthStatus);
    res.json({ success: true });
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'medium', 'system');
    res.status(500).json({
      error: 'Failed to update feature status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// METRICS
// ============================================================================

/**
 * GET /api/monitoring/features/:featureId/metrics
 * Get feature metrics for a time range
 */
router.get('/features/:featureId/metrics', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { startTime, endTime } = req.query;

    const start = startTime ? new Date(startTime as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endTime ? new Date(endTime as string) : new Date();

    const metrics = await integrationMonitor.getFeatureMetrics(featureId, start, end);
    res.json(metrics);
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'medium', 'system');
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/monitoring/features/:featureId/metrics
 * Record feature metrics (manual recording)
 */
router.post('/features/:featureId/metrics', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { usage, performance } = req.body;

    await integrationMonitor.recordMetrics(featureId, usage, performance);
    res.json({ success: true });
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'medium', 'system');
    res.status(500).json({
      error: 'Failed to record metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

/**
 * POST /api/monitoring/features/:featureId/health-check
 * Perform a health check for a feature
 */
router.post('/features/:featureId/health-check', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { endpoint, expectedStatus = 200 } = req.body;

    // Perform HTTP health check
    const healthCheck = await integrationMonitor.performHealthCheck(featureId, async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.status === expectedStatus) {
          return {
            status: 'healthy',
            details: { statusCode: response.status },
          };
        } else {
          return {
            status: 'degraded',
            errorMessage: `Unexpected status code: ${response.status}`,
            details: { statusCode: response.status },
          };
        }
      } catch (error) {
        return {
          status: 'down',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    res.json(healthCheck);
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'high', 'system');
    res.status(500).json({
      error: 'Failed to perform health check',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/monitoring/health
 * Get overall system health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dashboardData = await integrationMonitor.getDashboardData();
    const { systemHealth } = dashboardData;

    const overallStatus =
      systemHealth.downFeatures > 0
        ? 'down'
        : systemHealth.degradedFeatures > 0
        ? 'degraded'
        : 'healthy';

    res.json({
      status: overallStatus,
      ...systemHealth,
      timestamp: new Date(),
    });
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'critical', 'system');
    res.status(500).json({
      status: 'down',
      error: 'Failed to check system health',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// ALERTS
// ============================================================================

/**
 * GET /api/monitoring/features/:featureId/alerts
 * Get alerts for a feature
 */
router.get('/features/:featureId/alerts', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { resolved } = req.query;

    const resolvedFilter = resolved === 'true' ? true : resolved === 'false' ? false : undefined;

    const alerts = await integrationMonitor.getFeatureAlerts(featureId, resolvedFilter);
    res.json(alerts);
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'medium', 'system');
    res.status(500).json({
      error: 'Failed to fetch alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/monitoring/alerts
 * Create a new alert
 */
router.post('/alerts', async (req: Request, res: Response) => {
  try {
    const alert = await integrationMonitor.createAlert(req.body);
    res.status(201).json(alert);
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'medium', 'system');
    res.status(500).json({
      error: 'Failed to create alert',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/monitoring/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.put('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user?.id || 'system';

    await integrationMonitor.acknowledgeAlert(alertId, userId);
    res.json({ success: true });
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'low', 'system');
    res.status(500).json({
      error: 'Failed to acknowledge alert',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/monitoring/alerts/:alertId/resolve
 * Resolve an alert
 */
router.put('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user?.id || 'system';

    await integrationMonitor.resolveAlert(alertId, userId);
    res.json({ success: true });
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'low', 'system');
    res.status(500).json({
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// ALERT RULES
// ============================================================================

/**
 * POST /api/monitoring/features/:featureId/alert-rules
 * Add an alert rule for a feature
 */
router.post('/features/:featureId/alert-rules', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const rule = await integrationMonitor.addAlertRule({
      ...req.body,
      featureId,
    });
    res.status(201).json(rule);
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'medium', 'system');
    res.status(500).json({
      error: 'Failed to add alert rule',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// LOGS
// ============================================================================

/**
 * GET /api/monitoring/features/:featureId/logs
 * Get logs for a feature
 */
router.get('/features/:featureId/logs', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { level, limit } = req.query;

    const logs = await integrationMonitor.getFeatureLogs(
      featureId,
      level as string | undefined,
      limit ? parseInt(limit as string) : 100
    );
    res.json(logs);
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'medium', 'system');
    res.status(500).json({
      error: 'Failed to fetch logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/monitoring/features/:featureId/logs
 * Log an event for a feature
 */
router.post('/features/:featureId/logs', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { level, category, message, details } = req.body;
    const userId = (req as any).user?.id;
    const requestId = (req as any).requestId;

    await integrationMonitor.logEvent(
      featureId,
      level,
      category,
      message,
      details,
      userId,
      requestId
    );
    res.json({ success: true });
  } catch (error) {
    errorTracker.trackRequestError(error as Error, req, 'low', 'system');
    res.status(500).json({
      error: 'Failed to log event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// EXPORT
// ============================================================================

export default router;
