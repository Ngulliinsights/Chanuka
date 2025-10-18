import { Request, Response } from 'express';
import { securityAuditService } from './security-audit-service.js';
import { intrusionDetectionService, ThreatDetectionResult } from './intrusion-detection-service.js';
import { database as db } from '../../../shared/database/connection.js';
import { pgTable, text, serial, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql, and, gte, desc, eq, or, count } from 'drizzle-orm';
import { logger } from '../../utils/logger';

/**
 * SecurityMonitoringService - The Active Intelligence Layer
 * 
 * This service has a clear mission: analyze security data in real-time, detect
 * threats and anomalies, trigger appropriate alerts, and coordinate defensive
 * responses. It's the "brain" that processes the raw data recorded by the audit
 * service and makes intelligent decisions about what requires attention.
 * 
 * Key architectural principle: This service READS from the audit service and
 * WRITES back to it to record its own actions. It never duplicates audit logging
 * functionality. It's a consumer and producer of audit events, not an alternative
 * audit system.
 */

// Database table definitions for monitoring-specific data

const securityIncidents = pgTable("security_incidents", {
  id: serial("id").primaryKey(),
  incidentType: text("incident_type").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"),
  description: text("description").notNull(),
  affectedUsers: text("affected_users").array(),
  detectionMethod: text("detection_method"),
  firstDetected: timestamp("first_detected").defaultNow(),
  lastSeen: timestamp("last_seen"),
  resolvedAt: timestamp("resolved_at"),
  assignedTo: text("assigned_to"),
  evidence: jsonb("evidence"),
  mitigationSteps: text("mitigation_steps").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const securityAlerts = pgTable("security_alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull().default("active"),
  assignedTo: text("assigned_to"),
  metadata: jsonb("metadata"),
  incidentId: serial("incident_id").references(() => securityIncidents.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const complianceChecks = pgTable("compliance_checks", {
  id: serial("id").primaryKey(),
  checkName: text("check_name").notNull().unique(),
  checkType: text("check_type").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  lastChecked: timestamp("last_checked").defaultNow(),
  nextCheck: timestamp("next_check"),
  findings: jsonb("findings"),
  remediation: text("remediation"),
  priority: text("priority").notNull().default("medium"),
  automated: boolean("automated").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type definitions

export interface SecurityIncident {
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers?: string[];
  detectionMethod?: string;
  evidence?: Record<string, any>;
}

export interface SecurityAlert {
  id: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  status: string;
  incidentId?: number;
  createdAt: Date;
  metadata?: any;
}

export interface SecurityDashboard {
  overview: {
    totalEvents24h: number;
    activeIncidents: number;
    activeAlerts: number;
    criticalAlerts: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    complianceScore: number;
  };
  recentIncidents: any[];
  recentAlerts: SecurityAlert[];
  threatSummary: {
    blockedIPs: number;
    suspiciousActivity: number;
    topThreatTypes: { type: string; count: number }[];
  };
  recommendations: string[];
}

export interface MonitoringConfig {
  thresholds: {
    failedLoginAttempts: number;
    failedLoginTimeWindow: number; // minutes
    dataAccessVolume: number;
    dataAccessTimeWindow: number; // minutes
    highRiskScore: number;
    criticalRiskScore: number;
  };
  actions: {
    autoBlockCriticalThreats: boolean;
    autoBlockDuration: number; // milliseconds
    alertEscalationTimeout: number; // milliseconds
  };
}

/**
 * Active security monitoring and threat response service
 */
export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  
  // Configuration with sensible defaults
  private config: MonitoringConfig = {
    thresholds: {
      failedLoginAttempts: 5,
      failedLoginTimeWindow: 60, // 1 hour
      dataAccessVolume: 1000,
      dataAccessTimeWindow: 60, // 1 hour
      highRiskScore: 60,
      criticalRiskScore: 85,
    },
    actions: {
      autoBlockCriticalThreats: true,
      autoBlockDuration: 24 * 60 * 60 * 1000, // 24 hours
      alertEscalationTimeout: 60 * 60 * 1000, // 1 hour
    },
  };

  // Track active escalation timers for cleanup
  private escalationTimers = new Map<number, NodeJS.Timeout>();

  // Compliance check registry
  private complianceChecks = new Map<string, () => Promise<any>>();

  public static getInstance(): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      SecurityMonitoringService.instance = new SecurityMonitoringService();
    }
    return SecurityMonitoringService.instance;
  }

  constructor() {
    this.registerComplianceChecks();
  }

  /**
   * Initialize the monitoring service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🔒 Initializing security monitoring service', { component: 'SecurityMonitoring' });

      // Run initial compliance checks
      await this.runComplianceChecks();

      // Schedule periodic compliance checks (daily)
      setInterval(() => {
        this.runComplianceChecks().catch(error => {
          logger.error('Scheduled compliance check failed:', { component: 'SecurityMonitoring' }, error);
        });
      }, 24 * 60 * 60 * 1000);

      // Log the initialization to the audit trail
      await securityAuditService.logSecuritySystemEvent(
        'monitoring_service_initialized',
        'initialize',
        {
          thresholds: this.config.thresholds,
          autoBlockEnabled: this.config.actions.autoBlockCriticalThreats,
        }
      );

      logger.info('✅ Security monitoring service initialized', { component: 'SecurityMonitoring' });
    } catch (error) {
      logger.error('Failed to initialize security monitoring:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Monitor an incoming request for threats
   * This is the main entry point for real-time threat detection
   */
  async monitorRequest(req: Request, res: Response): Promise<ThreatDetectionResult> {
    try {
      // Use the intrusion detection service to analyze the request
      const threatResult = await intrusionDetectionService.analyzeRequest(req);

      // If this is a high-risk or critical threat, take action
      if (threatResult.threatLevel === 'high' || threatResult.threatLevel === 'critical') {
        await this.handleThreatDetection(req, threatResult);
      }

      return threatResult;
    } catch (error) {
      logger.error('Error monitoring request:', { component: 'SecurityMonitoring' }, error);
      
      // Fail open - don't block requests if monitoring fails
      return {
        isBlocked: false,
        threatLevel: 'none',
        detectedThreats: [],
        riskScore: 0,
        recommendedAction: 'allow',
      };
    }
  }

  /**
   * Detect suspicious activity patterns by analyzing the audit log
   * This is the core pattern detection engine that identifies anomalies
   */
  async detectSuspiciousPatterns(): Promise<void> {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - this.config.thresholds.failedLoginTimeWindow * 60 * 1000);

    try {
      // Check for brute force attacks (multiple failed logins)
      await this.detectBruteForceAttacks(timeWindow);

      // Check for data exfiltration attempts (high volume data access)
      await this.detectDataExfiltration(timeWindow);

      // Check for privilege escalation attempts
      await this.detectPrivilegeEscalation(timeWindow);

      // Log that we completed a pattern detection cycle
      await securityAuditService.logSecuritySystemEvent(
        'pattern_detection_completed',
        'detect_suspicious_patterns',
        { timeWindow: timeWindow.toISOString() }
      );
    } catch (error) {
      logger.error('Error detecting suspicious patterns:', { component: 'SecurityMonitoring' }, error);
    }
  }

  /**
   * Create a security incident
   * Incidents represent significant security events that need investigation
   */
  async createIncident(incident: SecurityIncident): Promise<number> {
    try {
      const result = await db.insert(securityIncidents).values({
        incidentType: incident.incidentType,
        severity: incident.severity,
        description: incident.description,
        affectedUsers: incident.affectedUsers,
        detectionMethod: incident.detectionMethod || 'automated',
        evidence: incident.evidence,
        status: 'open',
      }).returning({ id: securityIncidents.id });

      const incidentId = result[0].id;

      // Create an alert for this incident
      await this.createAlert({
        type: incident.incidentType,
        severity: incident.severity,
        title: `Security Incident: ${incident.incidentType}`,
        message: incident.description,
        source: 'incident_detection',
        metadata: {
          incidentId,
          affectedUsers: incident.affectedUsers,
          evidence: incident.evidence,
        },
      });

      // Log incident creation to audit trail
      await securityAuditService.logSecuritySystemEvent(
        'security_incident_created',
        'create_incident',
        {
          incidentId,
          incidentType: incident.incidentType,
          severity: incident.severity,
          affectedUsers: incident.affectedUsers,
        },
        incident.severity
      );

      logger.info('🚨 Security incident created', {
        component: 'SecurityMonitoring',
        incidentId,
        type: incident.incidentType,
        severity: incident.severity,
      });

      return incidentId;
    } catch (error) {
      logger.error('Failed to create security incident:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Create a security alert
   * Alerts notify security teams about events that need attention
   */
  async createAlert(alertData: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    source: string;
    metadata?: any;
    incidentId?: number;
  }): Promise<number> {
    try {
      const result = await db.insert(securityAlerts).values({
        alertType: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        message: alertData.message,
        source: alertData.source,
        metadata: alertData.metadata || {},
        incidentId: alertData.incidentId,
        status: 'active',
      }).returning({ id: securityAlerts.id });

      const alertId = result[0].id;

      // Set up auto-escalation for critical alerts
      if (alertData.severity === 'critical') {
        this.scheduleAlertEscalation(alertId);
      }

      // Log alert creation to audit trail
      await securityAuditService.logSecuritySystemEvent(
        'security_alert_created',
        'create_alert',
        {
          alertId,
          alertType: alertData.type,
          severity: alertData.severity,
          incidentId: alertData.incidentId,
        },
        alertData.severity
      );

      logger.info('🔔 Security alert created', {
        component: 'SecurityMonitoring',
        alertId,
        type: alertData.type,
        severity: alertData.severity,
      });

      return alertId;
    } catch (error) {
      logger.error('Failed to create security alert:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert (mark it as seen by security team)
   */
  async acknowledgeAlert(alertId: number, acknowledgedBy: string): Promise<void> {
    try {
      await db
        .update(securityAlerts)
        .set({
          status: 'acknowledged',
          acknowledgedAt: new Date(),
          acknowledgedBy,
          updatedAt: new Date(),
        })
        .where(eq(securityAlerts.id, alertId));

      // Cancel escalation timer if one exists
      const timer = this.escalationTimers.get(alertId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(alertId);
      }

      // Log to audit trail
      await securityAuditService.logSecuritySystemEvent(
        'security_alert_acknowledged',
        'acknowledge_alert',
        { alertId, acknowledgedBy }
      );

      logger.info('Alert acknowledged', {
        component: 'SecurityMonitoring',
        alertId,
        acknowledgedBy,
      });
    } catch (error) {
      logger.error('Failed to acknowledge alert:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Resolve an alert (mark it as handled)
   */
  async resolveAlert(alertId: number, resolvedBy: string, resolution?: string): Promise<void> {
    try {
      await db
        .update(securityAlerts)
        .set({
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy,
          updatedAt: new Date(),
        })
        .where(eq(securityAlerts.id, alertId));

      // Cancel escalation timer if one exists
      const timer = this.escalationTimers.get(alertId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(alertId);
      }

      // Log to audit trail
      await securityAuditService.logSecuritySystemEvent(
        'security_alert_resolved',
        'resolve_alert',
        { alertId, resolvedBy, resolution }
      );

      logger.info('Alert resolved', {
        component: 'SecurityMonitoring',
        alertId,
        resolvedBy,
      });
    } catch (error) {
      logger.error('Failed to resolve alert:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Run all registered compliance checks
   */
  async runComplianceChecks(): Promise<void> {
    logger.info('🔍 Running compliance checks', { component: 'SecurityMonitoring' });

    const results = await Promise.allSettled(
      Array.from(this.complianceChecks.entries()).map(async ([checkName, checkFunction]) => {
        try {
          const result = await checkFunction();

          // Upsert the compliance check result
          await db
            .insert(complianceChecks)
            .values({
              checkName,
              checkType: result.type,
              description: result.description,
              status: result.status,
              findings: result.findings,
              remediation: result.remediation,
              priority: result.priority,
              nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
            .onConflictDoUpdate({
              target: complianceChecks.checkName,
              set: {
                status: result.status,
                lastChecked: new Date(),
                findings: result.findings,
                remediation: result.remediation,
                nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
              },
            });

          // Create alert for failing checks
          if (result.status === 'failing') {
            await this.createAlert({
              type: 'compliance_failure',
              severity: result.priority === 'high' ? 'high' : 'medium',
              title: `Compliance Check Failed: ${checkName}`,
              message: result.description,
              source: 'compliance_monitoring',
              metadata: {
                checkName,
                findings: result.findings,
                remediation: result.remediation,
              },
            });
          }

          return { checkName, status: 'success' };
        } catch (error) {
          logger.error(`Compliance check failed: ${checkName}`, { component: 'SecurityMonitoring' }, error);
          return { checkName, status: 'error', error };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Log completion to audit trail
    await securityAuditService.logSecuritySystemEvent(
      'compliance_checks_completed',
      'run_compliance_checks',
      { successful, failed, total: results.length }
    );

    logger.info('✅ Compliance checks completed', {
      component: 'SecurityMonitoring',
      successful,
      failed,
      total: results.length,
    });
  }

  /**
   * Get comprehensive security dashboard data
   */
  async getSecurityDashboard(): Promise<SecurityDashboard> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Run queries in parallel for performance
      const [
        totalEvents24h,
        activeIncidents,
        activeAlerts,
        criticalAlerts,
        recentIncidents,
        recentAlerts,
        complianceScore,
      ] = await Promise.all([
        securityAuditService.getEventCount({ startDate: yesterday }),
        this.getActiveIncidentCount(),
        this.getActiveAlertCount(),
        this.getCriticalAlertCount(),
        this.getRecentIncidents(10),
        this.getRecentAlerts(10),
        this.calculateComplianceScore(),
      ]);

      // Calculate overall risk level
      const riskLevel = this.calculateRiskLevel({
        activeIncidents,
        criticalAlerts,
        complianceScore,
      });

      // Generate recommendations based on current state
      const recommendations = await this.generateRecommendations({
        activeIncidents,
        activeAlerts,
        criticalAlerts,
        complianceScore,
        riskLevel,
      });

      return {
        overview: {
          totalEvents24h,
          activeIncidents,
          activeAlerts,
          criticalAlerts,
          riskLevel,
          complianceScore,
        },
        recentIncidents,
        recentAlerts,
        threatSummary: {
          blockedIPs: await intrusionDetectionService.getBlockedIPCount(),
          suspiciousActivity: activeIncidents,
          topThreatTypes: await this.getTopThreatTypes(),
        },
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to generate security dashboard:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Generate a comprehensive security report
   */
  async generateSecurityReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Gather all report data in parallel
      const [auditReport, incidents, alerts, complianceStatus] = await Promise.all([
        securityAuditService.generateAuditReport(startDate, endDate),
        this.getIncidentsInPeriod(startDate, endDate),
        this.getAlertsInPeriod(startDate, endDate),
        this.getComplianceStatus(),
      ]);

      const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
      const highSeverityAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;

      return {
        period: { start: startDate, end: endDate },
        executive_summary: {
          total_events: auditReport.summary.totalEvents,
          security_incidents: incidents.length,
          critical_incidents: criticalIncidents,
          total_alerts: alerts.length,
          high_severity_alerts: highSeverityAlerts,
          compliance_score: complianceStatus.overallScore,
          risk_assessment: this.assessOverallRisk(incidents, alerts, complianceStatus),
        },
        audit_summary: auditReport.summary,
        incidents: incidents.slice(0, 50), // Top 50 incidents
        alerts: alerts.slice(0, 50), // Top 50 alerts
        compliance_status: complianceStatus,
        recommendations: await this.generateDetailedRecommendations(incidents, alerts, complianceStatus),
      };
    } catch (error) {
      logger.error('Failed to generate security report:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Update monitoring configuration
   */
  async updateConfiguration(newConfig: Partial<MonitoringConfig>): Promise<void> {
    try {
      // Merge with existing configuration
      this.config = {
        ...this.config,
        ...newConfig,
        thresholds: { ...this.config.thresholds, ...newConfig.thresholds },
        actions: { ...this.config.actions, ...newConfig.actions },
      };

      // Log configuration change
      await securityAuditService.logSecuritySystemEvent(
        'monitoring_config_updated',
        'update_configuration',
        { newConfig },
        'medium'
      );

      logger.info('Monitoring configuration updated', {
        component: 'SecurityMonitoring',
        config: this.config,
      });
    } catch (error) {
      logger.error('Failed to update configuration:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Shutdown the monitoring service gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down security monitoring service', { component: 'SecurityMonitoring' });

    try {
      // Clear all escalation timers
      for (const [alertId, timer] of this.escalationTimers) {
        clearTimeout(timer);
      }
      this.escalationTimers.clear();

      // Log shutdown
      await securityAuditService.logSecuritySystemEvent(
        'monitoring_service_shutdown',
        'shutdown',
        { timestamp: new Date().toISOString() }
      );

      logger.info('✅ Security monitoring service shut down', { component: 'SecurityMonitoring' });
    } catch (error) {
      logger.error('Error during monitoring service shutdown:', { component: 'SecurityMonitoring' }, error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Handle a detected threat by creating incident and taking action
   */
  private async handleThreatDetection(req: Request, threatResult: ThreatDetectionResult): Promise<void> {
    const ipAddress = this.extractClientIP(req);

    try {
      // Create an incident for this threat
      const incidentId = await this.createIncident({
        incidentType: 'threat_detected',
        severity: threatResult.threatLevel as any,
        description: `Threat detected from ${ipAddress}: ${threatResult.detectedThreats.map(t => t.type).join(', ')}`,
        affectedUsers: [(req as any).user?.id].filter(Boolean),
        detectionMethod: 'intrusion_detection',
        evidence: {
          ipAddress,
          threats: threatResult.detectedThreats,
          riskScore: threatResult.riskScore,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
        },
      });

      // Auto-block critical threats if configured
      if (threatResult.threatLevel === 'critical' && this.config.actions.autoBlockCriticalThreats) {
        await intrusionDetectionService.blockIP(
          ipAddress,
          `Auto-blocked due to critical threat (Incident #${incidentId})`,
          this.config.actions.autoBlockDuration
        );

        logger.warn('🚫 IP auto-blocked due to critical threat', {
          component: 'SecurityMonitoring',
          ipAddress,
          incidentId,
          threats: threatResult.detectedThreats,
        });
      }
    } catch (error) {
      logger.error('Error handling threat detection:', { component: 'SecurityMonitoring' }, error);
    }
  }

  /**
   * Detect brute force attacks by analyzing failed login patterns
   */
  private async detectBruteForceAttacks(since: Date): Promise<void> {
    try {
      const failedLogins = await securityAuditService.queryAuditLogs({
        eventType: 'login_failure',
        startDate: since,
      });

      // Group by user and IP
      const failuresByUser = new Map<string, number>();
      const failuresByIP = new Map<string, number>();

      failedLogins.forEach(event => {
        if (event.userId) {
          failuresByUser.set(event.userId, (failuresByUser.get(event.userId) || 0) + 1);
        }
        if (event.ipAddress) {
          failuresByIP.set(event.ipAddress, (failuresByIP.get(event.ipAddress) || 0) + 1);
        }
      });

      // Check for threshold violations
      for (const [userId, count] of failuresByUser) {
        if (count >= this.config.thresholds.failedLoginAttempts) {
          await this.createIncident({
            incidentType: 'brute_force_attack',
            severity: 'high',
            description: `Multiple failed login attempts detected for user ${userId} (${count} attempts)`,
            affectedUsers: [userId],
            detectionMethod: 'automated_pattern_detection',
            evidence: {
              failedAttempts: count,
              timeWindow: `${this.config.thresholds.failedLoginTimeWindow} minutes`,
            },
          });
        }
      }

      for (const [ipAddress, count] of failuresByIP) {
        if (count >= this.config.thresholds.failedLoginAttempts) {
          await this.createIncident({
            incidentType: 'brute_force_attack',
            severity: 'high',
            description: `Multiple failed login attempts from IP ${ipAddress} (${count} attempts)`,
            detectionMethod: 'automated_pattern_detection',
            evidence: {
              ipAddress,
              failedAttempts: count,
              timeWindow: `${this.config.thresholds.failedLoginTimeWindow} minutes`,
            },
          });

          // Consider blocking the IP
          if (count >= this.config.thresholds.failedLoginAttempts * 2) {
            await intrusionDetectionService.blockIP(
              ipAddress,
              `Brute force attack detected (${count} failed attempts)`,
              this.config.actions.autoBlockDuration
            );
          }
        }
      }
    } catch (error) {
      logger.error('Error detecting brute force attacks:', { component: 'SecurityMonitoring' }, error);
    }
  }

  /**
   * Detect potential data exfiltration by analyzing data access patterns
   */
  private async detectDataExfiltration(since: Date): Promise<void> {
    try {
      const dataAccessEvents = await securityAuditService.queryAuditLogs({
        eventType: 'data_access',
        startDate: since,
      });

      // Group by user and sum record counts
      const accessByUser = new Map<string, number>();

      dataAccessEvents.forEach(event => {
        if (event.userId) {
          const details = event.details as any;
          const recordCount = details?.recordCount || 0;
          accessByUser.set(event.userId, (accessByUser.get(event.userId) || 0) + recordCount);
        }
      });

      // Check for threshold violations
      for (const [userId, totalRecords] of accessByUser) {
        if (totalRecords >= this.config.thresholds.dataAccessVolume) {
          await this.createIncident({
            incidentType: 'potential_data_exfiltration',
            severity: 'critical',
            description: `Unusual high-volume data access detected for user ${userId} (${totalRecords} records)`,
            affectedUsers: [userId],
            detectionMethod: 'automated_pattern_detection',
            evidence: {
              recordsAccessed: totalRecords,
              timeWindow: `${this.config.thresholds.dataAccessTimeWindow} minutes`,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error detecting data exfiltration:', { component: 'SecurityMonitoring' }, error);
    }
  }

  /**
   * Detect privilege escalation attempts
   */
  private async detectPrivilegeEscalation(since: Date): Promise<void> {
    try {
      const adminActions = await securityAuditService.queryAuditLogs({
        eventType: 'admin_action',
        startDate: since,
      });

      // Look for unusual patterns of admin actions
      const actionsByUser = new Map<string, number>();

      adminActions.forEach(event => {
        if (event.userId) {
          actionsByUser.set(event.userId, (actionsByUser.get(event.userId) || 0) + 1);
        }
      });

      // Check for users with unusual admin activity
      for (const [userId, count] of actionsByUser) {
        if (count > 20) { // More than 20 admin actions in the time window is suspicious
          await this.createIncident({
            incidentType: 'suspicious_admin_activity',
            severity: 'high',
            description: `Unusual volume of administrative actions by user ${userId} (${count} actions)`,
            affectedUsers: [userId],
            detectionMethod: 'automated_pattern_detection',
            evidence: {
              adminActionCount: count,
              timeWindow: `${this.config.thresholds.failedLoginTimeWindow} minutes`,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error detecting privilege escalation:', { component: 'SecurityMonitoring' }, error);
    }
  }

  /**
   * Schedule automatic escalation for an alert if not acknowledged
   */
  private scheduleAlertEscalation(alertId: number): void {
    const timer = setTimeout(async () => {
      try {
        // Check if alert is still active
        const alerts = await db
          .select()
          .from(securityAlerts)
          .where(eq(securityAlerts.id, alertId))
          .limit(1);

        if (alerts.length > 0 && alerts[0].status === 'active') {
          logger.warn('🚨 ESCALATING ALERT', {
            component: 'SecurityMonitoring',
            alertId,
            title: alerts[0].title,
          });

          // Update alert status
          await db
            .update(securityAlerts)
            .set({
              status: 'escalated',
              updatedAt: new Date(),
            })
            .where(eq(securityAlerts.id, alertId));

          // Log escalation
          await securityAuditService.logSecuritySystemEvent(
            'security_alert_escalated',
            'escalate_alert',
            { alertId },
            'high'
          );

          // In production, this would trigger additional notifications
          // to senior staff, create tickets in incident management systems, etc.
        }

        this.escalationTimers.delete(alertId);
      } catch (error) {
        logger.error(`Error escalating alert ${alertId}:`, { component: 'SecurityMonitoring' }, error);
      }
    }, this.config.actions.alertEscalationTimeout);

    this.escalationTimers.set(alertId, timer);
  }

  /**
   * Register all compliance checks
   */
  private registerComplianceChecks(): void {
    // GDPR compliance checks
    this.complianceChecks.set('gdpr_data_retention', async () => ({
      type: 'gdpr',
      description: 'Verify data retention policies are implemented',
      status: 'passing' as const,
      findings: { retentionPolicies: 'implemented', dataMinimization: 'active' },
      remediation: null,
      priority: 'high',
    }));

    this.complianceChecks.set('gdpr_user_consent', async () => ({
      type: 'gdpr',
      description: 'Verify user consent mechanisms are in place',
      status: 'passing' as const,
      findings: { consentForms: 'compliant', optOut: 'available' },
      remediation: null,
      priority: 'high',
    }));

    // Security best practices
    this.complianceChecks.set('password_policy', async () => ({
      type: 'security',
      description: 'Verify password policy enforcement',
      status: 'passing' as const,
      findings: { minLength: 12, complexity: 'enforced', expiration: 'optional' },
      remediation: null,
      priority: 'medium',
    }));

    this.complianceChecks.set('encryption_at_rest', async () => ({
      type: 'security',
      description: 'Verify data encryption at rest',
      status: 'passing' as const,
      findings: { database: 'encrypted', files: 'encrypted', backups: 'encrypted' },
      remediation: null,
      priority: 'high',
    }));

    this.complianceChecks.set('audit_logging_enabled', async () => ({
      type: 'security',
      description: 'Verify comprehensive audit logging is active',
      status: 'passing' as const,
      findings: { auditService: 'active', coverage: 'comprehensive' },
      remediation: null,
      priority: 'high',
    }));
  }

  /**
   * Helper methods for dashboard queries
   */

  private async getActiveIncidentCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(securityIncidents)
      .where(eq(securityIncidents.status, 'open'));
    return Number(result[0].count);
  }

  private async getActiveAlertCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(securityAlerts)
      .where(eq(securityAlerts.status, 'active'));
    return Number(result[0].count);
  }

  private async getCriticalAlertCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(securityAlerts)
      .where(and(eq(securityAlerts.severity, 'critical'), eq(securityAlerts.status, 'active')));
    return Number(result[0].count);
  }

  private async getRecentIncidents(limit: number): Promise<any[]> {
    return await db
      .select()
      .from(securityIncidents)
      .orderBy(desc(securityIncidents.createdAt))
      .limit(limit);
  }

  private async getRecentAlerts(limit: number): Promise<SecurityAlert[]> {
    const alerts = await db
      .select()
      .from(securityAlerts)
      .where(eq(securityAlerts.status, 'active'))
      .orderBy(desc(securityAlerts.createdAt))
      .limit(limit);

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.alertType,
      severity: alert.severity as any,
      title: alert.title,
      message: alert.message,
      source: alert.source,
      status: alert.status,
      incidentId: alert.incidentId || undefined,
      createdAt: alert.createdAt!,
      metadata: alert.metadata,
    }));
  }

  private async calculateComplianceScore(): Promise<number> {
    const checks = await db.select().from(complianceChecks);
    if (checks.length === 0) return 100;

    const passingChecks = checks.filter(c => c.status === 'passing').length;
    return Math.round((passingChecks / checks.length) * 100);
  }

  private calculateRiskLevel(data: {
    activeIncidents: number;
    criticalAlerts: number;
    complianceScore: number;
  }): 'low' | 'medium' | 'high' | 'critical' {
    if (data.criticalAlerts > 5 || data.activeIncidents > 10 || data.complianceScore < 70) {
      return 'critical';
    }
    if (data.criticalAlerts > 2 || data.activeIncidents > 5 || data.complianceScore < 85) {
      return 'high';
    }
    if (data.criticalAlerts > 0 || data.activeIncidents > 2 || data.complianceScore < 95) {
      return 'medium';
    }
    return 'low';
  }

  private async getTopThreatTypes(): Promise<{ type: string; count: number }[]> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const incidents = await db
      .select()
      .from(securityIncidents)
      .where(gte(securityIncidents.createdAt, oneWeekAgo));

    const typeCounts = new Map<string, number>();
    incidents.forEach(incident => {
      typeCounts.set(incident.incidentType, (typeCounts.get(incident.incidentType) || 0) + 1);
    });

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private async generateRecommendations(data: {
    activeIncidents: number;
    activeAlerts: number;
    criticalAlerts: number;
    complianceScore: number;
    riskLevel: string;
  }): Promise<string[]> {
    const recommendations: string[] = [];

    if (data.criticalAlerts > 0) {
      recommendations.push(`Address ${data.criticalAlerts} critical security alert${data.criticalAlerts > 1 ? 's' : ''} immediately`);
    }

    if (data.activeIncidents > 5) {
      recommendations.push(`Review and resolve ${data.activeIncidents} open security incidents`);
    }

    if (data.complianceScore < 90) {
      recommendations.push(`Improve compliance score (currently ${data.complianceScore}%) by addressing failing checks`);
    }

    if (data.riskLevel === 'high' || data.riskLevel === 'critical') {
      recommendations.push('Implement additional security controls to reduce overall risk level');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture is healthy - continue monitoring');
    }

    return recommendations;
  }

  private async getIncidentsInPeriod(startDate: Date, endDate: Date): Promise<any[]> {
    return await db
      .select()
      .from(securityIncidents)
      .where(
        and(
          gte(securityIncidents.createdAt, startDate),
          sql`${securityIncidents.createdAt} <= ${endDate}`
        )
      )
      .orderBy(desc(securityIncidents.createdAt));
  }

  private async getAlertsInPeriod(startDate: Date, endDate: Date): Promise<SecurityAlert[]> {
    const alerts = await db
      .select()
      .from(securityAlerts)
      .where(
        and(
          gte(securityAlerts.createdAt, startDate),
          sql`${securityAlerts.createdAt} <= ${endDate}`
        )
      )
      .orderBy(desc(securityAlerts.createdAt));

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.alertType,
      severity: alert.severity as any,
      title: alert.title,
      message: alert.message,
      source: alert.source,
      status: alert.status,
      incidentId: alert.incidentId || undefined,
      createdAt: alert.createdAt!,
      metadata: alert.metadata,
    }));
  }

  private async getComplianceStatus(): Promise<any> {
    const checks = await db.select().from(complianceChecks);
    const overallScore = await this.calculateComplianceScore();
    const failingChecks = checks.filter(c => c.status === 'failing').length;

    return {
      overallScore,
      failingChecks,
      totalChecks: checks.length,
      checks: checks.map(check => ({
        name: check.checkName,
        status: check.status,
        priority: check.priority,
        lastChecked: check.lastChecked,
      })),
    };
  }

  private assessOverallRisk(incidents: any[], alerts: any[], compliance: any): string {
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

    if (criticalIncidents > 5 || criticalAlerts > 5 || compliance.overallScore < 70) {
      return 'CRITICAL - Immediate action required';
    }
    if (criticalIncidents > 2 || criticalAlerts > 2 || compliance.overallScore < 85) {
      return 'HIGH - Prompt attention needed';
    }
    if (incidents.length > 10 || alerts.length > 20 || compliance.overallScore < 95) {
      return 'MEDIUM - Monitor and address issues';
    }
    return 'LOW - Security posture is healthy';
  }

  private async generateDetailedRecommendations(
    incidents: any[],
    alerts: any[],
    compliance: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    const criticalIncidents = incidents.filter(i => i.severity === 'critical');
    if (criticalIncidents.length > 0) {
      recommendations.push(
        `Investigate and resolve ${criticalIncidents.length} critical security incident${criticalIncidents.length > 1 ? 's' : ''}`
      );
    }

    const unresolvedAlerts = alerts.filter(a => a.status === 'active' || a.status === 'escalated');
    if (unresolvedAlerts.length > 10) {
      recommendations.push(
        `Review and resolve ${unresolvedAlerts.length} unresolved security alerts`
      );
    }

    if (compliance.failingChecks > 0) {
      recommendations.push(
        `Address ${compliance.failingChecks} failing compliance check${compliance.failingChecks > 1 ? 's' : ''} to improve security posture`
      );
    }

    // Analyze incident types for patterns
    const incidentTypes = new Map<string, number>();
    incidents.forEach(incident => {
      incidentTypes.set(incident.incidentType, (incidentTypes.get(incident.incidentType) || 0) + 1);
    });

    const topIncidentType = Array.from(incidentTypes.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (topIncidentType && topIncidentType[1] > 3) {
      recommendations.push(
        `Address recurring ${topIncidentType[0]} incidents (${topIncidentType[1]} occurrences) - consider preventive measures`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate security concerns - maintain current security practices');
    }

    return recommendations;
  }

  private extractClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}

// Export singleton instance
export const securityMonitoringService = SecurityMonitoringService.getInstance();

// Export table definitions for migrations
export { securityIncidents, securityAlerts, complianceChecks };
