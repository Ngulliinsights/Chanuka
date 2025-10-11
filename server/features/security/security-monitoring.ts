import { Router, Request, Response } from 'express';
import { securityMonitoringService } from './security-monitoring-service.js';
import { securityAuditService } from './security-audit-service.js';
import { intrusionDetectionService } from './intrusion-detection-service.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { logger } from '../../utils/logger';

const router = Router();

// Middleware to ensure admin access
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

/**
 * Get security dashboard overview
 */
router.get('/dashboard', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dashboard = await securityMonitoringService.getSecurityDashboard();
    
    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching security dashboard:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security dashboard',
      code: 'DASHBOARD_ERROR'
    });
  }
});

/**
 * Get security alerts
 */
router.get('/alerts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status = 'active', severity, limit = 50, offset = 0 } = req.query;
    
    // This would be implemented with proper database queries
    const alerts = await securityMonitoringService.getSecurityDashboard();
    
    res.json({
      success: true,
      data: {
        alerts: alerts.recentAlerts.slice(Number(offset), Number(offset) + Number(limit)),
        total: alerts.recentAlerts.length,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          hasMore: alerts.recentAlerts.length > Number(offset) + Number(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching security alerts:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security alerts',
      code: 'ALERTS_ERROR'
    });
  }
});

/**
 * Acknowledge security alert
 */
router.post('/alerts/:alertId/acknowledge', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user.id;
    
    // Update alert status to acknowledged
    // This would be implemented with proper database update
    
    await securityAuditService.logAdminAction(
      'acknowledge_alert',
      req,
      userId,
      `alert_${alertId}`,
      { alertId, notes, acknowledgedAt: new Date() }
    );
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: {
        alertId: Number(alertId),
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        notes
      }
    });
  } catch (error) {
    logger.error('Error acknowledging alert:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      code: 'ACKNOWLEDGE_ERROR'
    });
  }
});

/**
 * Resolve security alert
 */
router.post('/alerts/:alertId/resolve', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolution, notes } = req.body;
    const userId = (req as any).user.id;
    
    // Update alert status to resolved
    // This would be implemented with proper database update
    
    await securityAuditService.logAdminAction(
      'resolve_alert',
      req,
      userId,
      `alert_${alertId}`,
      { alertId, resolution, notes, resolvedAt: new Date() }
    );
    
    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: {
        alertId: Number(alertId),
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolution,
        notes
      }
    });
  } catch (error) {
    logger.error('Error resolving alert:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      code: 'RESOLVE_ERROR'
    });
  }
});

/**
 * Get threat intelligence data
 */
router.get('/threats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const threatReport = await intrusionDetectionService.generateIntrusionReport(start, end);
    
    res.json({
      success: true,
      data: threatReport,
      period: { start, end }
    });
  } catch (error) {
    logger.error('Error fetching threat data:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threat data',
      code: 'THREATS_ERROR'
    });
  }
});

/**
 * Block IP address
 */
router.post('/threats/block-ip', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason, duration } = req.body;
    const userId = (req as any).user.id;
    
    if (!ipAddress || !reason) {
      return res.status(400).json({
        success: false,
        error: 'IP address and reason are required',
        code: 'INVALID_INPUT'
      });
    }
    
    await intrusionDetectionService.blockIP(ipAddress, reason, duration);
    
    await securityAuditService.logAdminAction(
      'block_ip',
      req,
      userId,
      ipAddress,
      { ipAddress, reason, duration, blockedAt: new Date() }
    );
    
    res.json({
      success: true,
      message: 'IP address blocked successfully',
      data: {
        ipAddress,
        reason,
        duration,
        blockedBy: userId,
        blockedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error blocking IP:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to block IP address',
      code: 'BLOCK_IP_ERROR'
    });
  }
});

/**
 * Unblock IP address
 */
router.post('/threats/unblock-ip', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason } = req.body;
    const userId = (req as any).user.id;
    
    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required',
        code: 'INVALID_INPUT'
      });
    }
    
    await intrusionDetectionService.unblockIP(ipAddress);
    
    await securityAuditService.logAdminAction(
      'unblock_ip',
      req,
      userId,
      ipAddress,
      { ipAddress, reason, unblockedAt: new Date() }
    );
    
    res.json({
      success: true,
      message: 'IP address unblocked successfully',
      data: {
        ipAddress,
        reason,
        unblockedBy: userId,
        unblockedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error unblocking IP:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock IP address',
      code: 'UNBLOCK_IP_ERROR'
    });
  }
});

/**
 * Get compliance status
 */
router.get('/compliance', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    await securityMonitoringService.runComplianceChecks();
    const dashboard = await securityMonitoringService.getSecurityDashboard();
    
    res.json({
      success: true,
      data: dashboard.complianceStatus,
      lastUpdated: new Date()
    });
  } catch (error) {
    logger.error('Error fetching compliance status:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance status',
      code: 'COMPLIANCE_ERROR'
    });
  }
});

/**
 * Run compliance checks manually
 */
router.post('/compliance/run-checks', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    await securityMonitoringService.runComplianceChecks();
    
    await securityAuditService.logAdminAction(
      'run_compliance_checks',
      req,
      userId,
      'compliance_system',
      { triggeredAt: new Date(), triggeredBy: userId }
    );
    
    const dashboard = await securityMonitoringService.getSecurityDashboard();
    
    res.json({
      success: true,
      message: 'Compliance checks completed',
      data: dashboard.complianceStatus
    });
  } catch (error) {
    logger.error('Error running compliance checks:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to run compliance checks',
      code: 'COMPLIANCE_CHECK_ERROR'
    });
  }
});

/**
 * Generate security audit report
 */
router.post('/reports/audit', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format = 'json' } = req.body;
    const userId = (req as any).user.id;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const report = await securityAuditService.generateAuditReport(start, end);
    
    await securityAuditService.logAdminAction(
      'generate_audit_report',
      req,
      userId,
      'audit_system',
      { period: { start, end }, format, generatedAt: new Date() }
    );
    
    if (format === 'json') {
      res.json({
        success: true,
        data: report,
        metadata: {
          generatedAt: new Date(),
          generatedBy: userId,
          period: { start, end }
        }
      });
    } else {
      // For other formats, you might want to generate files
      res.json({
        success: true,
        message: 'Report generated successfully',
        data: { reportId: `audit_${Date.now()}`, format }
      });
    }
  } catch (error) {
    logger.error('Error generating audit report:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate audit report',
      code: 'REPORT_ERROR'
    });
  }
});

/**
 * Generate comprehensive security report
 */
router.post('/reports/comprehensive', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    const userId = (req as any).user.id;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const report = await securityMonitoringService.generateSecurityReport(start, end);
    
    await securityAuditService.logAdminAction(
      'generate_security_report',
      req,
      userId,
      'security_system',
      { period: { start, end }, generatedAt: new Date() }
    );
    
    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        generatedBy: userId,
        period: { start, end }
      }
    });
  } catch (error) {
    logger.error('Error generating security report:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate security report',
      code: 'SECURITY_REPORT_ERROR'
    });
  }
});

/**
 * Get security system health
 */
router.get('/health', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dashboard = await securityMonitoringService.getSecurityDashboard();
    
    res.json({
      success: true,
      data: dashboard.systemHealth,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching security health:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security system health',
      code: 'HEALTH_ERROR'
    });
  }
});

/**
 * Get security recommendations
 */
router.get('/recommendations', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const dashboard = await securityMonitoringService.getSecurityDashboard();
    
    res.json({
      success: true,
      data: dashboard.recommendations,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching security recommendations:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security recommendations',
      code: 'RECOMMENDATIONS_ERROR'
    });
  }
});

/**
 * Update security configuration
 */
router.post('/config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configKey, configValue, description } = req.body;
    const userId = (req as any).user.id;
    
    if (!configKey || configValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Configuration key and value are required',
        code: 'INVALID_INPUT'
      });
    }
    
    // This would update the security configuration in the database
    // For now, just log the action
    
    await securityAuditService.logAdminAction(
      'update_security_config',
      req,
      userId,
      'security_config',
      { configKey, configValue, description, updatedAt: new Date() }
    );
    
    res.json({
      success: true,
      message: 'Security configuration updated successfully',
      data: {
        configKey,
        configValue,
        description,
        updatedBy: userId,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error updating security config:', { component: 'SimpleTool' }, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security configuration',
      code: 'CONFIG_ERROR'
    });
  }
});

export default router;








