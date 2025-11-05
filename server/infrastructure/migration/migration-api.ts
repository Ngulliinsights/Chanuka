/**
 * Migration API Endpoints
 * 
 * Provides REST API endpoints for accessing migration infrastructure
 * data and controlling migration processes.
 */

import { Router, Request, Response } from 'express';
import { 
  dashboardService,
  migrationOrchestrator,
  featureFlagsService,
  rollbackService,
  validationService,
  monitoringService
} from './index';

const router = Router();

/**
 * GET /api/migration/dashboard
 * Get comprehensive dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboardData = await dashboardService.getDashboardData();
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/migration/status
 * Get migration orchestrator status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = migrationOrchestrator.getMigrationStatus();
    const plan = migrationOrchestrator.getMigrationPlan();
    
    res.json({
      success: true,
      data: {
        status,
        plan: {
          totalPhases: plan?.phases.length || 0,
          globalSettings: plan?.globalSettings
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get migration status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/migration/phases/:phaseId
 * Get specific phase dashboard data
 */
router.get('/phases/:phaseId', async (req: Request, res: Response) => {
  try {
    const phaseId = parseInt(req.params.phaseId);
    if (isNaN(phaseId) || phaseId < 1 || phaseId > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phase ID. Must be between 1 and 5.'
      });
    }

    const phaseDashboard = await dashboardService.getPhaseDashboard(phaseId);
    
    if (!phaseDashboard) {
      return res.status(404).json({
        success: false,
        error: `Phase ${phaseId} not found`
      });
    }

    res.json({
      success: true,
      data: phaseDashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get phase data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/migration/components/:componentName
 * Get specific component dashboard data
 */
router.get('/components/:componentName', async (req: Request, res: Response) => {
  try {
    const componentName = req.params.componentName;
    const componentDashboard = await dashboardService.getComponentDashboard(componentName);
    
    if (!componentDashboard) {
      return res.status(404).json({
        success: false,
        error: `Component ${componentName} not found`
      });
    }

    res.json({
      success: true,
      data: componentDashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get component data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/migration/feature-flags
 * Get all feature flags status
 */
router.get('/feature-flags', (req: Request, res: Response) => {
  try {
    const flags = [
      'utilities-concurrency-adapter',
      'utilities-query-builder-migration',
      'utilities-ml-service-migration'
    ].map(flagName => ({
      name: flagName,
      ...featureFlagsService.getFlag(flagName)
    }));

    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get feature flags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/migration/feature-flags/:flagName
 * Update feature flag configuration
 */
router.put('/feature-flags/:flagName', (req: Request, res: Response) => {
  try {
    const flagName = req.params.flagName;
    const { enabled, rolloutPercentage, fallbackEnabled } = req.body;

    // Validate input
    if (typeof enabled !== 'undefined' && typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean'
      });
    }

    if (typeof rolloutPercentage !== 'undefined') {
      if (typeof rolloutPercentage !== 'number' || rolloutPercentage < 0 || rolloutPercentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'rolloutPercentage must be a number between 0 and 100'
        });
      }
    }

    // Update flag
    featureFlagsService.updateFlag(flagName, {
      enabled,
      rolloutPercentage,
      fallbackEnabled
    });

    const updatedFlag = featureFlagsService.getFlag(flagName);

    res.json({
      success: true,
      data: updatedFlag,
      message: `Feature flag ${flagName} updated successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/migration/rollback/:componentName
 * Trigger manual rollback for a component
 */
router.post('/rollback/:componentName', async (req: Request, res: Response) => {
  try {
    const componentName = req.params.componentName;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'reason is required and must be a string'
      });
    }

    const rollbackId = await rollbackService.triggerManualRollback(componentName, reason);

    res.json({
      success: true,
      data: {
        rollbackId,
        component: componentName,
        reason
      },
      message: `Rollback initiated for ${componentName}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger rollback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/migration/rollbacks
 * Get rollback history
 */
router.get('/rollbacks', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const rollbacks = rollbackService.getRollbackHistory(limit);

    res.json({
      success: true,
      data: rollbacks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get rollback history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/migration/validation/:componentName
 * Run validation checkpoint for a component
 */
router.post('/validation/:componentName', async (req: Request, res: Response) => {
  try {
    const componentName = req.params.componentName;
    const { phase, sampleSize, timeWindow } = req.body;

    const context = {
      component: componentName,
      phase: phase || 1,
      sampleSize: sampleSize || 1000,
      timeWindow: timeWindow || 60
    };

    const results = await validationService.runValidationCheckpoint(componentName, context);

    res.json({
      success: true,
      data: {
        component: componentName,
        results,
        summary: {
          totalValidations: results.length,
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length,
          criticalIssues: results.reduce((sum, r) => sum + r.criticalIssues, 0),
          warningIssues: results.reduce((sum, r) => sum + r.warningIssues, 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to run validation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/migration/alerts
 * Get active alerts
 */
router.get('/alerts', (req: Request, res: Response) => {
  try {
    const activeAlerts = monitoringService.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        alerts: activeAlerts,
        summary: {
          total: activeAlerts.length,
          critical: activeAlerts.filter(a => a.threshold.severity === 'critical').length,
          high: activeAlerts.filter(a => a.threshold.severity === 'high').length,
          medium: activeAlerts.filter(a => a.threshold.severity === 'medium').length,
          low: activeAlerts.filter(a => a.threshold.severity === 'low').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/migration/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/alerts/:alertId/resolve', (req: Request, res: Response) => {
  try {
    const alertId = req.params.alertId;
    monitoringService.resolveAlert(alertId);

    res.json({
      success: true,
      message: `Alert ${alertId} resolved`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/migration/start
 * Start the migration process
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    await migrationOrchestrator.startMigration();

    res.json({
      success: true,
      message: 'Migration process started',
      data: migrationOrchestrator.getMigrationStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start migration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/migration/pause/:phaseId
 * Pause a migration phase
 */
router.post('/pause/:phaseId', async (req: Request, res: Response) => {
  try {
    const phaseId = parseInt(req.params.phaseId);
    if (isNaN(phaseId) || phaseId < 1 || phaseId > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phase ID. Must be between 1 and 5.'
      });
    }

    await migrationOrchestrator.pausePhase(phaseId);

    res.json({
      success: true,
      message: `Phase ${phaseId} paused`,
      data: migrationOrchestrator.getMigrationStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to pause phase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/migration/resume/:phaseId
 * Resume a migration phase
 */
router.post('/resume/:phaseId', async (req: Request, res: Response) => {
  try {
    const phaseId = parseInt(req.params.phaseId);
    if (isNaN(phaseId) || phaseId < 1 || phaseId > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phase ID. Must be between 1 and 5.'
      });
    }

    await migrationOrchestrator.resumePhase(phaseId);

    res.json({
      success: true,
      message: `Phase ${phaseId} resumed`,
      data: migrationOrchestrator.getMigrationStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resume phase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/migration/emergency-stop
 * Emergency stop - rollback all active migrations
 */
router.post('/emergency-stop', async (req: Request, res: Response) => {
  try {
    await migrationOrchestrator.emergencyStop();

    res.json({
      success: true,
      message: 'Emergency stop executed - all active migrations rolled back',
      data: migrationOrchestrator.getMigrationStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute emergency stop',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as migrationApiRouter };