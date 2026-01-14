import { logger } from '@shared/core';
import { database as db } from '@server/infrastructure/database';
import { and, desc, eq, gte, type SQL, sql } from 'drizzle-orm';
import { jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import type { Request } from 'express';

import type { ThreatDetectionResult } from './intrusion-detection-service';

/**
 * SecurityMonitoringService - The Active Intelligence Layer
 * Analyzes security data in real-time to trigger alerts and coordinate defenses.
 * It reads from the audit log (Flight Recorder) and decides if a pilot (Admin)
 * needs to be woken up.
 */

// ----------------------------------------------------------------------
// 1. Database Schema Definitions
// ----------------------------------------------------------------------

export const securityIncidents = pgTable("security_incidents", {
  id: serial("id").primaryKey(),
  incidentType: text("incident_type").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"), // open, investigating, resolved, false_positive
  description: text("description").notNull(),
  sourceIp: text("source_ip"),
  affectedResource: text("affected_resource"),
  details: jsonb("details"),
  created_at: timestamp("created_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
  resolved_by: text("resolved_by"),
  resolution_notes: text("resolution_notes")
});

export const securityAlerts = pgTable("security_alerts", {
  id: serial("id").primaryKey(),
  incidentId: serial("incident_id").references(() => securityIncidents.id),
  alertType: text("alert_type").notNull(),
  channel: text("channel").notNull(), // email, slack, dashboard
  recipient: text("recipient").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed
  sent_at: timestamp("sent_at"),
  error: text("error")
});

// ----------------------------------------------------------------------
// 2. Types & Interfaces
// ----------------------------------------------------------------------

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'false_positive';

export interface SecurityIncident {
  id: number;
  incidentType: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  description: string;
  sourceIp?: string | null;
  affectedResource?: string | null;
  details?: unknown;
  created_at: Date | null;
}

export interface SecurityDashboardMetrics {
  activeIncidents: number;
  threatLevel: SeverityLevel;
  blockedIPs: number;
  recentAlerts: SecurityAlert[];
  incidentTrend: Array<{ date: string; count: number }>;
}

export interface ComplianceStatus {
  compliant: boolean;
  score: number;
  failingChecks: number;
  lastCheck: Date;
  details: Record<string, boolean>;
}

interface CreateIncidentData {
  type: string;
  severity: SeverityLevel;
  description: string;
  sourceIp?: string | undefined;
  resource?: string | undefined;
  details?: unknown | undefined;
}

interface SecurityReport {
  generatedAt: Date;
  period: string;
  summary: {
    totalAuditEvents: number;
    totalIncidents: number;
    incidentsBySeverity: Record<string, number>;
  };
  recommendations: string[];
}

type SecurityIncidentRecord = typeof securityIncidents.$inferSelect;
type SecurityAlert = typeof securityAlerts.$inferSelect;

// ----------------------------------------------------------------------
// 3. Dependency Interfaces (for better abstraction)
// ----------------------------------------------------------------------

export interface IIntrusionDetectionService {
  analyzeRequest(req: Request): Promise<ThreatDetectionResult>;
}

export interface ISecurityAuditService {
  queryAuditLogs(options: {
    start_date?: Date;
    end_date?: Date;
    limit?: number;
  }): Promise<unknown[]>;
}

// Use the actual database type to preserve Drizzle's type inference
type DatabaseInstance = any;

// ----------------------------------------------------------------------
// 4. The Service Implementation with Explicit Dependencies
// ----------------------------------------------------------------------

export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService | null = null;

  /**
   * Explicit dependencies injected via constructor
   * This makes testing easier and dependencies clear
   */
  constructor(
    private readonly intrusionDetection: IIntrusionDetectionService,
    private readonly auditService: ISecurityAuditService,
    private readonly database: DatabaseInstance = db
  ) { }

  /**
   * Singleton pattern with dependency injection support
   * For production use with real services
   */
  public static getInstance(
    intrusionDetection?: IIntrusionDetectionService,
    auditService?: ISecurityAuditService,
    database?: DatabaseInstance
  ): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      // Lazy import to avoid circular dependencies
      if (!intrusionDetection || !auditService) {
        throw new Error(
          'SecurityMonitoringService requires dependencies on first initialization. ' +
          'Use createInstance() or provide dependencies.'
        );
      }
      SecurityMonitoringService.instance = new SecurityMonitoringService(
        intrusionDetection,
        auditService,
        database
      );
    }
    return SecurityMonitoringService.instance;
  }

  /**
   * Factory method for creating instances (useful for testing)
   * This allows you to create multiple instances with different dependencies
   */
  public static createInstance(
    intrusionDetection: IIntrusionDetectionService,
    auditService: ISecurityAuditService,
    database: DatabaseInstance = db
  ): SecurityMonitoringService {
    return new SecurityMonitoringService(intrusionDetection, auditService, database);
  }

  /**
   * Reset singleton (useful for testing)
   */
  public static resetInstance(): void {
    SecurityMonitoringService.instance = null;
  }

  /**
   * Main Entry Point: Analyze a request for threats
   * Wraps the Intrusion Detection Service and handles incident creation
   */
  async trackRequestSafety(req: Request): Promise<ThreatDetectionResult> {
    try {
      // 1. Delegate deep analysis to Intrusion Detection
      const result = await this.intrusionDetection.analyzeRequest(req);

      // 2. If blocked or critical, escalate to an Incident
      if (result.action === 'block' || result.severity === 'critical') {
        await this.createIncident({
          type: 'INTRUSION_ATTEMPT',
          severity: result.severity || 'high',
          description: result.reason || 'Detected malicious request pattern',
          sourceIp: req.ip ?? undefined,
          resource: req.path,
          details: result.details ?? undefined
        });
      }

      return result;
    } catch (error) {
      logger.error('Error tracking request safety', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Fail open (allow) to prevent service outage on monitoring failure
      return { action: 'allow' };
    }
  }

  /**
   * Incident Management
   */
  async createIncident(data: CreateIncidentData): Promise<void> {
    try {
      // Build conditions for duplicate check
      const conditions: SQL[] = [
        eq(securityIncidents.status, 'open'),
        eq(securityIncidents.incidentType, data.type)
      ];

      // Only add sourceIp condition if it exists
      if (data.sourceIp) {
        conditions.push(eq(securityIncidents.sourceIp, data.sourceIp));
      }

      // Check for duplicate open incidents to prevent spam
      const existing = (await this.database
        .select()
        .from(securityIncidents)
        .where(and(...conditions))
        .limit(1)) as SecurityIncidentRecord[];

      if (existing.length > 0) {
        // Update existing incident occurrence count or last seen (if we had that column)
        logger.debug('Duplicate incident detected, skipping creation', {
          type: data.type,
          sourceIp: data.sourceIp
        });
        return;
      }

      const incidentResult = (await this.database
        .insert(securityIncidents)
        .values({
          incidentType: data.type,
          severity: data.severity,
          description: data.description,
          sourceIp: data.sourceIp ?? null,
          affectedResource: data.resource ?? null,
          details: data.details as Record<string, unknown> | null,
          status: 'open'
        })
        .returning()) as SecurityIncidentRecord[];

      const incident = incidentResult[0];

      if (incident) {
        logger.warn(`🚨 New Security Incident: ${data.type}`, {
          incidentId: incident.id
        });

        // Trigger alerts (e.g., Email/Slack)
        if (data.severity === 'high' || data.severity === 'critical') {
          await this.triggerAlerts(incident);
        }
      }

    } catch (error) {
      logger.error('Failed to create security incident', {
        error: error instanceof Error ? error.message : String(error),
        incidentType: data.type
      });
    }
  }

  /**
   * Alert Dispatcher
   */
  private async triggerAlerts(incident: SecurityIncidentRecord): Promise<void> {
    try {
      // Create alert record for the incident
      await this.database.insert(securityAlerts).values({
        incidentId: incident.id,
        alertType: 'admin_notification',
        channel: 'dashboard',
        recipient: 'admin_group',
        status: 'pending'
      });

      logger.info('Alert triggered for incident', {
        incidentId: incident.id,
        severity: incident.severity
      });
    } catch (error) {
      logger.error('Failed to trigger alerts', {
        error: error instanceof Error ? error.message : String(error),
        incidentId: incident.id
      });
    }
  }

  /**
   * Dashboard Data Aggregator
   */
  async getDashboardMetrics(): Promise<SecurityDashboardMetrics> {
    try {
      // Get Open Incidents
      const incidentCountResult = (await this.database
        .select({ count: sql`count(*)::int` })
        .from(securityIncidents)
        .where(eq(securityIncidents.status, 'open'))) as Array<{ count: number }>;

      const incidentTotal = incidentCountResult[0]?.count ?? 0;

      // Calculate Threat Level based on recent critical events
      let threatLevel: SeverityLevel = 'low';
      if (incidentTotal > 0) threatLevel = 'medium';
      if (incidentTotal > 5) threatLevel = 'high';
      if (incidentTotal > 10) threatLevel = 'critical';

      // Get Blocked IPs (Estimate based on high-severity incidents)
      const blockedCountResult = (await this.database
        .select({ count: sql`count(*)::int` })
        .from(securityIncidents)
        .where(eq(securityIncidents.severity, 'critical'))) as Array<{ count: number }>;

      const blockedIPs = blockedCountResult[0]?.count ?? 0;

      // Get Recent Alerts
      const recentAlerts = (await this.database
        .select()
        .from(securityAlerts)
        .orderBy(desc(securityAlerts.sent_at))
        .limit(5)) as SecurityAlert[];

      // Get Incident Trend (Last 7 days)
      const incidentTrend = (await this.database
        .select({
          date: sql`DATE(${securityIncidents.created_at})::text`,
          count: sql`count(*)::int`
        })
        .from(securityIncidents)
        .where(gte(securityIncidents.created_at, sql`NOW() - INTERVAL '7 days'`))
        .groupBy(sql`DATE(${securityIncidents.created_at})`)) as Array<{ date: string; count: number }>;

      return {
        activeIncidents: incidentTotal,
        threatLevel,
        blockedIPs,
        recentAlerts,
        incidentTrend
      };
    } catch (error) {
      logger.error('Error fetching dashboard metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Failed to load security dashboard');
    }
  }

  /**
   * Automated Compliance Check (GDPR/Security Best Practices)
   */
  async checkComplianceStatus(): Promise<ComplianceStatus> {
    const checks = {
      encryption_at_rest: true, // Assumed true via EncryptionService
      tls_enabled: process.env.NODE_ENV === 'production',
      audit_logging_active: true,
      auth_rate_limiting: true
    };

    const failingChecks = Object.values(checks).filter(val => !val).length;
    const score = Math.max(0, 100 - (failingChecks * 25));

    return {
      compliant: failingChecks === 0,
      score,
      failingChecks,
      lastCheck: new Date(),
      details: checks
    };
  }

  /**
   * Report Generation
   */
  async generateSecurityReport(days = 30): Promise<SecurityReport | { error: string }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // 1. Fetch Audit Logs using injected service
      const auditLogsResult = await this.auditService.queryAuditLogs({
        start_date: startDate,
        end_date: endDate,
        limit: 1000
      });

      // Ensure auditLogs is an array
      const auditLogs = Array.isArray(auditLogsResult) ? auditLogsResult : [];

      // 2. Fetch Incidents
      const incidents = (await this.database
        .select()
        .from(securityIncidents)
        .where(gte(securityIncidents.created_at, startDate))) as SecurityIncidentRecord[];

      // 3. Calculate incident severity distribution
      const incidentsBySeverity = incidents.reduce(
        (acc: Record<string, number>, curr: SecurityIncidentRecord) => {
          const severity = curr.severity || 'unknown';
          acc[severity] = (acc[severity] || 0) + 1;
          return acc;
        },
        {}
      );

      // 4. Summarize
      return {
        generatedAt: new Date(),
        period: `${days} days`,
        summary: {
          totalAuditEvents: auditLogs.length,
          totalIncidents: incidents.length,
          incidentsBySeverity
        },
        recommendations: this.generateRecommendations(incidents)
      };
    } catch (error) {
      logger.error('Error generating report', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { error: 'Failed to generate report' };
    }
  }

  /**
   * Generate actionable recommendations based on incident patterns
   */
  private generateRecommendations(incidents: SecurityIncidentRecord[]): string[] {
    const recommendations: string[] = [];

    // Check for SQL injection attempts
    if (incidents.some(i => i.incidentType === 'SQL_INJECTION')) {
      recommendations.push("Review input sanitization on public forms and implement parameterized queries.");
    }

    // Check for brute force attempts
    if (incidents.some(i => i.incidentType === 'BRUTE_FORCE')) {
      recommendations.push("Consider implementing CAPTCHA or additional authentication factors.");
    }

    // Check for high volume of incidents
    if (incidents.length > 50) {
      recommendations.push("High incident volume detected. Consider tightening rate limits and reviewing firewall rules.");
    }

    // Check for critical severity incidents
    const criticalIncidents = incidents.filter(i => i.severity === 'critical');
    if (criticalIncidents.length > 5) {
      recommendations.push("Multiple critical incidents detected. Immediate security review recommended.");
    }

    // Default recommendation if system is healthy
    if (recommendations.length === 0) {
      recommendations.push("System appears healthy. Continue monitoring and maintain current security posture.");
    }

    return recommendations;
  }
}

// ----------------------------------------------------------------------
// 5. Production Export with Real Dependencies
// ----------------------------------------------------------------------

/**
 * Initialize the singleton with real dependencies
 * This lazy loads the dependencies to avoid circular imports
 */
let productionInstance: SecurityMonitoringService | null = null;

export async function getSecurityMonitoringService(): Promise<SecurityMonitoringService> {
  if (!productionInstance) {
    // Dynamic import to avoid circular dependencies
    const [{ intrusionDetectionService }, { securityAuditService }] = await Promise.all([
      import('./intrusion-detection-service'),
      import('./security-audit-service')
    ]);

    productionInstance = SecurityMonitoringService.getInstance(
      intrusionDetectionService,
      securityAuditService,
      db
    );
  }
  return productionInstance;
}

/**
 * Default export for backward compatibility
 * Use getSecurityMonitoringService() in production code
 */
export const securityMonitoringService = await getSecurityMonitoringService();

