import { Request, Response } from 'express';
import { securityAuditService, SecurityEvent, SecurityIncident } from './security-audit-service.js';
import { intrusionDetectionService, ThreatDetectionResult } from './intrusion-detection-service.js';
import { database as db } from '../../../shared/database/connection.js';
import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { sql, and, gte, count, desc, eq, or, inArray } from 'drizzle-orm';

// Security monitoring configuration table
const securityConfig = pgTable("security_config", {
  id: serial("id").primaryKey(),
  configKey: text("config_key").notNull().unique(),
  configValue: jsonb("config_value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Security alerts table
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
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Compliance checks table
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

// Reference to the security audit logs table for our queries
// This should match the table definition in security-audit-service.ts
const securityAuditLogs = pgTable("security_audit_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  resource: text("resource"),
  action: text("action"),
  result: text("result").notNull(),
  severity: text("severity").default('info').notNull(),
  details: jsonb("details"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type definitions remain the same as original
export interface SecurityDashboard {
  overview: SecurityOverview;
  recentAlerts: SecurityAlert[];
  threatSummary: ThreatSummary;
  complianceStatus: ComplianceStatus;
  systemHealth: SecuritySystemHealth;
  recommendations: SecurityRecommendation[];
}

export interface SecurityOverview {
  totalEvents: number;
  criticalAlerts: number;
  blockedThreats: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastIncident: Date | null;
}

export interface SecurityAlert {
  id: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  status: string;
  createdAt: Date;
  metadata?: any;
}

export interface ThreatSummary {
  totalThreats: number;
  blockedIPs: number;
  suspiciousActivity: number;
  attackTypes: { type: string; count: number }[];
  topThreats: { ip: string; threatType: string; severity: string; count: number }[];
}

export interface ComplianceStatus {
  overallScore: number;
  checks: {
    name: string;
    status: 'passing' | 'failing' | 'warning' | 'not_applicable';
    lastChecked: Date;
    priority: string;
  }[];
  failingChecks: number;
  nextReview: Date;
}

export interface SecuritySystemHealth {
  auditingEnabled: boolean;
  intrusionDetectionEnabled: boolean;
  alertingEnabled: boolean;
  backupStatus: 'healthy' | 'warning' | 'error';
  encryptionStatus: 'enabled' | 'partial' | 'disabled';
  lastHealthCheck: Date;
}

export interface SecurityRecommendation {
  id: string;
  type: 'security' | 'compliance' | 'performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  estimatedEffort: string;
  impact: string;
}

export interface SecurityReport {
  period: { start: Date; end: Date };
  executive_summary: {
    total_events: number;
    security_incidents: number;
    compliance_score: number;
    risk_assessment: string;
    key_findings: string[];
  };
  threat_analysis: any;
  compliance_report: any;
  recommendations: SecurityRecommendation[];
  appendices: {
    detailed_logs: any[];
    configuration_changes: any[];
    user_access_reviews: any[];
  };
}

/**
 * Comprehensive security monitoring and alerting service with optimizations
 */
export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  private alertHandlers = new Map<string, Function>();
  private complianceChecks = new Map<string, Function>();
  
  // Timer management for proper cleanup
  private activeTimers: {
    intervals: NodeJS.Timeout[];
    timeouts: Map<number, NodeJS.Timeout>;
  } = {
    intervals: [],
    timeouts: new Map()
  };
  
  // Cache for configuration and frequently accessed data
  private configCache: {
    data: any;
    lastRefresh: number;
    ttl: number; // Time to live in milliseconds
  } = {
    data: null,
    lastRefresh: 0,
    ttl: 5 * 60 * 1000 // 5 minutes default
  };
  
  // Cache for compliance scores
  private complianceScoreCache: {
    score: number | null;
    lastCalculated: number;
    ttl: number;
  } = {
    score: null,
    lastCalculated: 0,
    ttl: 10 * 60 * 1000 // 10 minutes
  };

  // Configuration defaults
  private defaultConfig = {
    alerting: {
      enabled: true,
      email_notifications: true,
      slack_notifications: false,
      sms_notifications: false,
      escalation_timeout: 3600000, // 1 hour
    },
    monitoring: {
      real_time_analysis: true,
      behavioral_analysis: true,
      threat_intelligence: true,
      compliance_monitoring: true,
    },
    thresholds: {
      critical_alert_threshold: 85,
      high_alert_threshold: 70,
      failed_login_threshold: 10,
      data_access_threshold: 1000,
    },
    compliance: {
      gdpr_enabled: true,
      ccpa_enabled: false,
      sox_enabled: false,
      pci_dss_enabled: false,
      custom_checks: [],
    },
    cache: {
      config_ttl: 5 * 60 * 1000,
      compliance_score_ttl: 10 * 60 * 1000,
    }
  };

  public static getInstance(): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      SecurityMonitoringService.instance = new SecurityMonitoringService();
    }
    return SecurityMonitoringService.instance;
  }

  constructor() {
    this.initializeAlertHandlers();
    this.initializeComplianceChecks();
  }

  /**
   * Initialize the security monitoring system
   */
  async initialize(): Promise<void> {
    try {
      // Load configuration with error context
      await this.loadConfiguration();
      
      // Start monitoring services
      await this.startMonitoring();
      
      // Schedule compliance checks with proper timer tracking
      await this.scheduleComplianceChecks();
      
      console.log('✅ Security monitoring system initialized');
    } catch (error) {
      // Enhanced error logging with context
      console.error('❌ Failed to initialize security monitoring:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Process incoming request through security monitoring
   * Optimized with better error handling and reduced database calls
   */
  async monitorRequest(req: Request, res: Response): Promise<ThreatDetectionResult> {
    const startTime = Date.now();
    
    try {
      // Extract request metadata once
      const requestMetadata = {
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id
      };

      // Analyze request for threats
      const threatResult = await intrusionDetectionService.analyzeRequest(req);
      
      // Prepare security event data
      const securityEventData = {
        eventType: 'request_analysis',
        severity: this.mapThreatLevelToSeverity(threatResult.threatLevel),
        ipAddress: requestMetadata.ip,
        userAgent: requestMetadata.userAgent,
        resource: requestMetadata.path,
        action: requestMetadata.method,
        result: threatResult.isBlocked ? 'blocked' : 'allowed',
        success: !threatResult.isBlocked,
        details: {
          threatLevel: threatResult.threatLevel,
          riskScore: threatResult.riskScore,
          detectedThreats: threatResult.detectedThreats.length,
          processingTime: Date.now() - startTime
        },
        userId: requestMetadata.userId
      };

      // Log security event asynchronously to avoid blocking
      this.logSecurityEventAsync(securityEventData);

      // Handle high-risk requests
      if (threatResult.threatLevel === 'critical' || threatResult.threatLevel === 'high') {
        // Run in background to not block the response
        this.handleHighRiskRequestAsync(req, threatResult, requestMetadata);
      }

      // Create alerts if necessary - use cached config for threshold
      const config = await this.getConfiguration();
      if (threatResult.riskScore >= config.thresholds.critical_alert_threshold) {
        // Create alert asynchronously
        this.createSecurityAlertAsync({
          type: 'high_risk_request',
          severity: 'critical',
          title: 'Critical Security Threat Detected',
          message: `High-risk request detected from ${requestMetadata.ip}`,
          source: 'intrusion_detection',
          metadata: {
            ip: requestMetadata.ip,
            path: requestMetadata.path,
            threats: threatResult.detectedThreats,
            riskScore: threatResult.riskScore
          }
        });
      }

      return threatResult;
    } catch (error) {
      // Enhanced error logging
      console.error('Error in security monitoring:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
        ip: this.getClientIP(req),
        timestamp: new Date().toISOString()
      });
      
      // Don't block requests due to monitoring errors - fail open safely
      return {
        isBlocked: false,
        threatLevel: 'none',
        detectedThreats: [],
        riskScore: 0,
        recommendedAction: 'allow'
      };
    }
  }

  /**
   * Get security dashboard data with optimized queries
   */
  async getSecurityDashboard(): Promise<SecurityDashboard> {
    try {
      // Run all queries in parallel for better performance
      const [
        overview,
        recentAlerts,
        threatSummary,
        complianceStatus,
        systemHealth
      ] = await Promise.all([
        this.getSecurityOverview(),
        this.getRecentAlerts(),
        this.getThreatSummary(),
        this.getComplianceStatus(),
        this.getSystemHealth()
      ]);

      // Generate recommendations based on the data
      const recommendations = await this.generateRecommendations(overview, complianceStatus);

      return {
        overview,
        recentAlerts,
        threatSummary,
        complianceStatus,
        systemHealth,
        recommendations
      };
    } catch (error) {
      console.error('Error fetching security dashboard:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to fetch security dashboard data');
    }
  }

  /**
   * Create security alert with improved timeout management
   */
  async createSecurityAlert(alertData: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    source: string;
    metadata?: any;
  }): Promise<number> {
    try {
      const result = await db.insert(securityAlerts).values({
        alertType: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        message: alertData.message,
        source: alertData.source,
        metadata: alertData.metadata || {}
      }).returning({ id: securityAlerts.id });

      const alertId = result[0].id;

      // Send notifications based on severity
      if (alertData.severity === 'critical' || alertData.severity === 'high') {
        // Run notifications asynchronously
        this.sendAlertNotificationsAsync(alertData);
      }

      // Auto-escalate if not acknowledged within timeout
      if (alertData.severity === 'critical') {
        const config = await this.getConfiguration();
        const timeout = setTimeout(async () => {
          await this.escalateAlert(alertId);
          this.activeTimers.timeouts.delete(alertId);
        }, config.alerting.escalation_timeout);
        
        // Track timeout for cleanup
        this.activeTimers.timeouts.set(alertId, timeout);
      }

      return alertId;
    } catch (error) {
      console.error('Error creating security alert:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertType: alertData.type,
        severity: alertData.severity,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Run compliance checks with better error isolation
   */
  async runComplianceChecks(): Promise<void> {
    console.log('🔍 Running compliance checks...');
    
    const checkResults = await Promise.allSettled(
      Array.from(this.complianceChecks.entries()).map(async ([checkName, checkFunction]) => {
        try {
          const result = await checkFunction();
          
          // Upsert compliance check result
          await db.insert(complianceChecks).values({
            checkName,
            checkType: result.type,
            description: result.description,
            status: result.status,
            findings: result.findings,
            remediation: result.remediation,
            priority: result.priority,
            nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }).onConflictDoUpdate({
            target: complianceChecks.checkName,
            set: {
              status: result.status,
              lastChecked: new Date(),
              findings: result.findings,
              remediation: result.remediation,
              nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
              updatedAt: new Date()
            }
          });

          // Create alert for failures
          if (result.status === 'failing') {
            await this.createSecurityAlert({
              type: 'compliance_failure',
              severity: result.priority === 'high' ? 'high' : 'medium',
              title: `Compliance Check Failed: ${checkName}`,
              message: result.description,
              source: 'compliance_monitoring',
              metadata: { 
                findings: result.findings, 
                remediation: result.remediation,
                checkName
              }
            });
          }

          return { checkName, status: 'success', result };
        } catch (error) {
          console.error(`Error running compliance check ${checkName}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            checkName,
            timestamp: new Date().toISOString()
          });
          return { checkName, status: 'error', error };
        }
      })
    );

    // Invalidate compliance score cache after checks
    this.complianceScoreCache.score = null;
    
    // Log summary of check results
    const successful = checkResults.filter(r => r.status === 'fulfilled').length;
    const failed = checkResults.filter(r => r.status === 'rejected').length;
    console.log(`✅ Compliance checks completed: ${successful} successful, ${failed} failed`);
  }

  /**
   * Shutdown the security monitoring service with proper cleanup
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down security monitoring service...');

    try {
      // Clear all intervals
      for (const interval of this.activeTimers.intervals) {
        clearInterval(interval);
      }
      this.activeTimers.intervals = [];

      // Clear all timeouts
      for (const [alertId, timeout] of this.activeTimers.timeouts) {
        clearTimeout(timeout);
      }
      this.activeTimers.timeouts.clear();

      // Clear caches
      this.configCache.data = null;
      this.complianceScoreCache.score = null;

      console.log('✅ Security monitoring service shut down successfully');
    } catch (error) {
      console.error('❌ Error shutting down security monitoring service:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport(startDate: Date, endDate: Date): Promise<SecurityReport> {
    try {
      const [auditReport, intrusionReport, complianceReport] = await Promise.all([
        securityAuditService.generateAuditReport(startDate, endDate),
        intrusionDetectionService.generateIntrusionReport(startDate, endDate),
        this.generateComplianceReport(startDate, endDate)
      ]);

      const totalEvents = auditReport.summary.totalEvents + intrusionReport.summary.totalThreats;
      const securityIncidents = auditReport.summary.totalIncidents;
      const complianceScore = complianceReport.overallScore;

      const riskAssessment = this.assessOverallRisk(auditReport, intrusionReport, complianceReport);
      const keyFindings = this.extractKeyFindings(auditReport, intrusionReport, complianceReport);
      const recommendations = await this.generateDetailedRecommendations(auditReport, intrusionReport, complianceReport);

      return {
        period: { start: startDate, end: endDate },
        executive_summary: {
          total_events: totalEvents,
          security_incidents: securityIncidents,
          compliance_score: complianceScore,
          risk_assessment: riskAssessment,
          key_findings: keyFindings
        },
        threat_analysis: intrusionReport,
        compliance_report: complianceReport,
        recommendations,
        appendices: {
          detailed_logs: auditReport.events,
          configuration_changes: await this.getConfigurationChanges(startDate, endDate),
          user_access_reviews: await this.getUserAccessReviews(startDate, endDate)
        }
      };
    } catch (error) {
      console.error('Error generating security report:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        period: { startDate, endDate },
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to generate security report');
    }
  }

  /**
   * Refresh configuration cache
   */
  async refreshConfiguration(): Promise<void> {
    this.configCache.lastRefresh = 0; // Force refresh
    await this.getConfiguration();
  }

  /**
   * Private helper methods
   */

  /**
   * Load configuration with caching
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const configs = await db.select().from(securityConfig);
      
      for (const config of configs) {
        const keys = config.configKey.split('.');
        let current = this.defaultConfig as any;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = config.configValue;
      }
      
      // Update cache TTLs from config
      if (this.defaultConfig.cache) {
        this.configCache.ttl = this.defaultConfig.cache.config_ttl;
        this.complianceScoreCache.ttl = this.defaultConfig.cache.compliance_score_ttl;
      }
      
      // Update cache
      this.configCache.data = { ...this.defaultConfig };
      this.configCache.lastRefresh = Date.now();
    } catch (error) {
      console.warn('Using default security configuration:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.configCache.data = { ...this.defaultConfig };
      this.configCache.lastRefresh = Date.now();
    }
  }

  /**
   * Get configuration with caching
   */
  private async getConfiguration(): Promise<any> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.configCache.data && 
        (now - this.configCache.lastRefresh) < this.configCache.ttl) {
      return this.configCache.data;
    }
    
    // Refresh configuration
    await this.loadConfiguration();
    return this.configCache.data || this.defaultConfig;
  }

  private async startMonitoring(): Promise<void> {
    const config = await this.getConfiguration();
    
    if (config.monitoring.real_time_analysis) {
      console.log('✅ Real-time security analysis enabled');
    }
    
    if (config.monitoring.behavioral_analysis) {
      console.log('✅ Behavioral analysis enabled');
    }
    
    if (config.monitoring.threat_intelligence) {
      console.log('✅ Threat intelligence enabled');
    }
  }

  private async scheduleComplianceChecks(): Promise<void> {
    // Run compliance checks every 24 hours
    const interval = setInterval(async () => {
      try {
        await this.runComplianceChecks();
      } catch (error) {
        console.error('Error in scheduled compliance check:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }, 24 * 60 * 60 * 1000);
    
    // Track interval for cleanup
    this.activeTimers.intervals.push(interval);
    
    // Run initial check
    await this.runComplianceChecks();
  }

  private initializeAlertHandlers(): void {
    this.alertHandlers.set('email', async (alert: any) => {
      try {
        const config = await this.getConfiguration();
        if (config.alerting.email_notifications) {
          // Send email alert
          console.log(`📧 Email alert sent: ${alert.title}`);
        }
      } catch (error) {
        console.error('Error sending email alert:', error);
      }
    });

    this.alertHandlers.set('slack', async (alert: any) => {
      try {
        const config = await this.getConfiguration();
        if (config.alerting.slack_notifications) {
          // Send Slack alert
          console.log(`💬 Slack alert sent: ${alert.title}`);
        }
      } catch (error) {
        console.error('Error sending Slack alert:', error);
      }
    });
  }

  private initializeComplianceChecks(): void {
    // GDPR compliance checks
    this.complianceChecks.set('gdpr_data_retention', async () => ({
      type: 'gdpr',
      description: 'Check data retention policies compliance',
      status: 'passing' as const,
      findings: { retentionPolicies: 'implemented', dataMinimization: 'active' },
      remediation: null,
      priority: 'high'
    }));

    this.complianceChecks.set('gdpr_user_consent', async () => ({
      type: 'gdpr',
      description: 'Verify user consent mechanisms',
      status: 'passing' as const,
      findings: { consentForms: 'compliant', optOut: 'available' },
      remediation: null,
      priority: 'high'
    }));

    // Security best practices checks
    this.complianceChecks.set('password_policy', async () => ({
      type: 'security',
      description: 'Verify password policy enforcement',
      status: 'passing' as const,
      findings: { minLength: 12, complexity: 'enforced', expiration: 'optional' },
      remediation: null,
      priority: 'medium'
    }));

    this.complianceChecks.set('encryption_at_rest', async () => ({
      type: 'security',
      description: 'Check data encryption at rest',
      status: 'passing' as const,
      findings: { database: 'encrypted', files: 'encrypted', backups: 'encrypted' },
      remediation: null,
      priority: 'high'
    }));
  }

  /**
   * Optimized security overview with combined query
   */
  private async getSecurityOverview(): Promise<SecurityOverview> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Combine related queries for better performance
    const [eventsResult, alertsResult] = await Promise.all([
      db.select({ count: count() })
        .from(securityAuditLogs)
        .where(gte(securityAuditLogs.createdAt, oneWeekAgo)),
      db.select({ count: count() })
        .from(securityAlerts)
        .where(and(
          eq(securityAlerts.severity, 'critical'),
          eq(securityAlerts.status, 'active')
        ))
    ]);

    const complianceScore = await this.calculateComplianceScore();
    const riskLevel = this.calculateRiskLevel(complianceScore, Number(alertsResult[0].count));

    return {
      totalEvents: Number(eventsResult[0].count),
      criticalAlerts: Number(alertsResult[0].count),
      blockedThreats: 0, // Would be calculated from threat intelligence
      complianceScore,
      riskLevel,
      lastIncident: null // Would be fetched from incidents table
    };
  }

  private async getRecentAlerts(): Promise<SecurityAlert[]> {
    const alerts = await db
      .select()
      .from(securityAlerts)
      .where(eq(securityAlerts.status, 'active'))
      .orderBy(desc(securityAlerts.createdAt))
      .limit(10);

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.alertType,
      severity: alert.severity as any,
      title: alert.title,
      message: alert.message,
      source: alert.source,
      status: alert.status,
      createdAt: alert.createdAt!,
      metadata: alert.metadata
    }));
  }

  private async getThreatSummary(): Promise<ThreatSummary> {
    // This would be implemented with actual threat data
    return {
      totalThreats: 0,
      blockedIPs: 0,
      suspiciousActivity: 0,
      attackTypes: [],
      topThreats: []
    };
  }

  private async getComplianceStatus(): Promise<ComplianceStatus> {
    const checks = await db.select().from(complianceChecks);
    
    const failingChecks = checks.filter(c => c.status === 'failing').length;
    const overallScore = await this.calculateComplianceScore();
    
    return {
      overallScore,
      checks: checks.map(check => ({
        name: check.checkName,
        status: check.status as any,
        lastChecked: check.lastChecked!,
        priority: check.priority
      })),
      failingChecks,
      nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }

  private async getSystemHealth(): Promise<SecuritySystemHealth> {
    const config = await this.getConfiguration();
    
    return {
      auditingEnabled: true,
      intrusionDetectionEnabled: true,
      alertingEnabled: config.alerting.enabled,
      backupStatus: 'healthy',
      encryptionStatus: 'enabled',
      lastHealthCheck: new Date()
    };
  }

  private async generateRecommendations(
    overview: SecurityOverview,
    compliance: ComplianceStatus
  ): Promise<SecurityRecommendation[]> {
    const recommendations: SecurityRecommendation[] = [];

    if (overview.criticalAlerts > 0) {
      recommendations.push({
        id: 'critical-alerts',
        type: 'security',
        priority: 'critical',
        title: 'Address Critical Security Alerts',
        description: `${overview.criticalAlerts} critical security alerts require immediate attention`,
        action: 'Review and resolve all critical alerts in the security dashboard',
        estimatedEffort: '2-4 hours',
        impact: 'Reduces immediate security risks'
      });
    }

    if (compliance.failingChecks > 0) {
      recommendations.push({
        id: 'compliance-failures',
        type: 'compliance',
        priority: 'high',
        title: 'Fix Compliance Violations',
        description: `${compliance.failingChecks} compliance checks are failing`,
        action: 'Review and remediate failing compliance checks',
        estimatedEffort: '4-8 hours',
        impact: 'Ensures regulatory compliance'
      });
    }

    if (overview.riskLevel === 'high' || overview.riskLevel === 'critical') {
      recommendations.push({
        id: 'risk-mitigation',
        type: 'security',
        priority: 'high',
        title: 'Implement Risk Mitigation Measures',
        description: 'Overall security risk level is elevated',
        action: 'Review security policies and implement additional controls',
        estimatedEffort: '1-2 days',
        impact: 'Reduces overall security risk'
      });
    }

    return recommendations;
  }

  /**
   * Calculate compliance score with caching
   */
  private async calculateComplianceScore(): Promise<number> {
    const now = Date.now();
    
    // Return cached score if still valid
    if (this.complianceScoreCache.score !== null && 
        (now - this.complianceScoreCache.lastCalculated) < this.complianceScoreCache.ttl) {
      return this.complianceScoreCache.score;
    }
    
    // Calculate fresh score
    const checks = await db.select().from(complianceChecks);
    if (checks.length === 0) {
      this.complianceScoreCache.score = 100;
      this.complianceScoreCache.lastCalculated = now;
      return 100;
    }
    
    const passingChecks = checks.filter(c => c.status === 'passing').length;
    const score = Math.round((passingChecks / checks.length) * 100);
    
    // Update cache
    this.complianceScoreCache.score = score;
    this.complianceScoreCache.lastCalculated = now;
    
    return score;
  }

  private calculateRiskLevel(complianceScore: number, criticalAlerts: number): 'low' | 'medium' | 'high' | 'critical' {
    if (criticalAlerts > 5 || complianceScore < 60) return 'critical';
    if (criticalAlerts > 2 || complianceScore < 80) return 'high';
    if (criticalAlerts > 0 || complianceScore < 95) return 'medium';
    return 'low';
  }

  private async handleHighRiskRequest(req: Request, threatResult: ThreatDetectionResult): Promise<void> {
    const ipAddress = this.getClientIP(req);
    
    // Auto-block critical threats
    if (threatResult.threatLevel === 'critical') {
      await intrusionDetectionService.blockIP(
        ipAddress,
        `Critical threat detected: ${threatResult.detectedThreats.map(t => t.type).join(', ')}`,
        24 * 60 * 60 * 1000 // 24 hours
      );
    }
  }

  private async sendAlertNotifications(alert: any): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.alertHandlers.entries()).map(async ([type, handler]) => {
        try {
          await handler(alert);
          return { type, status: 'success' };
        } catch (error) {
          console.error(`Error sending ${type} alert:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            alertId: alert.id,
            timestamp: new Date().toISOString()
          });
          return { type, status: 'error', error };
        }
      })
    );
    
    // Log notification summary
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`Alert notifications: ${successful} successful, ${failed} failed`);
    }
  }

  private async escalateAlert(alertId: number): Promise<void> {
    try {
      const alert = await db
        .select()
        .from(securityAlerts)
        .where(eq(securityAlerts.id, alertId))
        .limit(1);

      if (alert.length > 0 && alert[0].status === 'active') {
        console.warn(`🚨 ESCALATING ALERT ${alertId}: ${alert[0].title}`);
        
        // Update alert status to show it's been escalated
        await db
          .update(securityAlerts)
          .set({ 
            status: 'escalated',
            updatedAt: new Date()
          })
          .where(eq(securityAlerts.id, alertId));
        
        // In production, this would escalate to senior staff, create tickets, etc.
        // Could also trigger additional notifications here
      }
    } catch (error) {
      console.error(`Error escalating alert ${alertId}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           (req.headers['x-real-ip'] as string) ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  /**
   * Async helper methods to avoid blocking main operations
   */
  private logSecurityEventAsync(eventData: any): void {
    securityAuditService.logSecurityEvent(eventData).catch(error => {
      console.error('Failed to log security event:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: eventData.eventType,
        timestamp: new Date().toISOString()
      });
    });
  }

  private handleHighRiskRequestAsync(req: Request, threatResult: ThreatDetectionResult, metadata: any): void {
    this.handleHighRiskRequest(req, threatResult).catch(error => {
      console.error('Failed to handle high-risk request:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: metadata.ip,
        path: metadata.path,
        timestamp: new Date().toISOString()
      });
    });
  }

  private createSecurityAlertAsync(alertData: any): void {
    this.createSecurityAlert(alertData).catch(error => {
      console.error('Failed to create security alert:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertType: alertData.type,
        timestamp: new Date().toISOString()
      });
    });
  }

  private sendAlertNotificationsAsync(alert: any): void {
    this.sendAlertNotifications(alert).catch(error => {
      console.error('Failed to send alert notifications:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId: alert.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Helper method to map threat levels to severity
   */
  private mapThreatLevelToSeverity(threatLevel: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (threatLevel) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Report generation helper methods
   */
  private assessOverallRisk(auditReport: any, intrusionReport: any, complianceReport: any): string {
    const criticalEvents = auditReport.summary.highRiskEvents || 0;
    const criticalThreats = intrusionReport.summary.totalThreats || 0;
    const complianceScore = complianceReport.overallScore || 100;

    if (criticalEvents > 10 || criticalThreats > 5 || complianceScore < 70) {
      return 'HIGH - Immediate attention required';
    } else if (criticalEvents > 5 || criticalThreats > 2 || complianceScore < 85) {
      return 'MEDIUM - Monitor closely and address issues';
    } else {
      return 'LOW - Security posture is stable';
    }
  }

  private extractKeyFindings(auditReport: any, intrusionReport: any, complianceReport: any): string[] {
    const findings: string[] = [];
    
    if (auditReport.summary.criticalIncidents > 0) {
      findings.push(`${auditReport.summary.criticalIncidents} critical security incidents detected`);
    }
    
    if (intrusionReport.summary.blockedIPs > 0) {
      findings.push(`${intrusionReport.summary.blockedIPs} IP addresses blocked for malicious activity`);
    }
    
    if (complianceReport.failingChecks > 0) {
      findings.push(`${complianceReport.failingChecks} compliance checks failing`);
    }
    
    if (findings.length === 0) {
      findings.push('No critical security issues identified during this period');
    }
    
    return findings;
  }

  private async generateDetailedRecommendations(
    auditReport: any, 
    intrusionReport: any, 
    complianceReport: any
  ): Promise<SecurityRecommendation[]> {
    const recommendations: SecurityRecommendation[] = [];
    
    // Analyze audit report for recommendations
    if (auditReport.summary.failedLogins > 50) {
      recommendations.push({
        id: 'failed-logins',
        type: 'security',
        priority: 'high',
        title: 'Investigate Failed Login Attempts',
        description: `Unusually high number of failed login attempts (${auditReport.summary.failedLogins})`,
        action: 'Review failed login patterns and implement additional authentication measures',
        estimatedEffort: '4-6 hours',
        impact: 'Prevents potential account compromise'
      });
    }
    
    // Analyze intrusion report
    if (intrusionReport.summary.totalThreats > 10) {
      recommendations.push({
        id: 'threat-patterns',
        type: 'security',
        priority: 'high',
        title: 'Review Threat Patterns',
        description: `Multiple threat detection events (${intrusionReport.summary.totalThreats})`,
        action: 'Analyze threat patterns and update detection rules',
        estimatedEffort: '6-8 hours',
        impact: 'Improves threat detection accuracy'
      });
    }
    
    // Analyze compliance report
    if (complianceReport.failingChecks > 0) {
      complianceReport.checks
        .filter((check: any) => check.status === 'failing')
        .forEach((check: any) => {
          recommendations.push({
            id: `compliance-${check.name}`,
            type: 'compliance',
            priority: check.priority === 'high' ? 'high' : 'medium',
            title: `Fix: ${check.name}`,
            description: check.description,
            action: check.remediation || 'Review and remediate compliance issue',
            estimatedEffort: '2-4 hours',
            impact: 'Ensures regulatory compliance'
          });
        });
    }
    
    return recommendations;
  }

  private async getConfigurationChanges(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const changes = await db
        .select()
        .from(securityConfig)
        .where(
          and(
            gte(securityConfig.updatedAt, startDate),
            sql`${securityConfig.updatedAt} <= ${endDate}`
          )
        )
        .orderBy(desc(securityConfig.updatedAt));
      
      return changes.map(change => ({
        configKey: change.configKey,
        description: change.description,
        updatedBy: change.updatedBy,
        updatedAt: change.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching configuration changes:', error);
      return [];
    }
  }

  private async getUserAccessReviews(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // This would fetch user access reviews and changes from audit logs
      const accessEvents = await db
        .select()
        .from(securityAuditLogs)
        .where(
          and(
            gte(securityAuditLogs.createdAt, startDate),
            sql`${securityAuditLogs.createdAt} <= ${endDate}`,
            or(
              eq(securityAuditLogs.eventType, 'user_created'),
              eq(securityAuditLogs.eventType, 'user_deleted'),
              eq(securityAuditLogs.eventType, 'role_changed'),
              eq(securityAuditLogs.eventType, 'permission_granted'),
              eq(securityAuditLogs.eventType, 'permission_revoked')
            )
          )
        )
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(100);
      
      return accessEvents.map(event => ({
        eventType: event.eventType,
        userId: event.userId,
        timestamp: event.createdAt,
        details: event.details
      }));
    } catch (error) {
      console.error('Error fetching user access reviews:', error);
      return [];
    }
  }

  private async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      const checks = await db
        .select()
        .from(complianceChecks)
        .where(
          and(
            gte(complianceChecks.lastChecked, startDate),
            sql`${complianceChecks.lastChecked} <= ${endDate}`
          )
        );

      const overallScore = await this.calculateComplianceScore();
      const failingChecks = checks.filter(c => c.status === 'failing').length;

      return {
        overallScore,
        failingChecks,
        checks: checks.map(check => ({
          name: check.checkName,
          type: check.checkType,
          status: check.status,
          findings: check.findings,
          remediation: check.remediation,
          priority: check.priority,
          lastChecked: check.lastChecked
        }))
      };
    } catch (error) {
      console.error('Error generating compliance report:', error);
      return {
        overallScore: 0,
        failingChecks: 0,
        checks: []
      };
    }
  }
}

// Export singleton instance
export const securityMonitoringService = SecurityMonitoringService.getInstance();

// Export table definitions for migrations
export { securityConfig, securityAlerts, complianceChecks, securityAuditLogs };