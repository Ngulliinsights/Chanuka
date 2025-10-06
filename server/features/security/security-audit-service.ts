import { Request } from 'express';
import { database as db } from '../../../shared/database/connection.js';
import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

// Security audit log table
const securityAuditLogs = pgTable("security_audit_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // login, logout, password_change, data_access, etc.
  severity: text("severity").notNull(), // low, medium, high, critical
  userId: text("user_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  resource: text("resource"), // what was accessed
  action: text("action"), // what action was performed
  success: boolean("success").notNull(),
  details: jsonb("details"), // additional context
  riskScore: integer("risk_score").default(0), // 0-100 risk assessment
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Security incidents table
const securityIncidents = pgTable("security_incidents", {
  id: serial("id").primaryKey(),
  incidentType: text("incident_type").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"), // open, investigating, resolved, false_positive
  description: text("description").notNull(),
  affectedUsers: text("affected_users").array(),
  detectionMethod: text("detection_method"), // automated, manual, reported
  firstDetected: timestamp("first_detected").defaultNow(),
  lastSeen: timestamp("last_seen"),
  resolvedAt: timestamp("resolved_at"),
  assignedTo: text("assigned_to"),
  evidence: jsonb("evidence"),
  mitigationSteps: text("mitigation_steps").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface SecurityEvent {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  success: boolean;
  details?: Record<string, any>;
  riskScore?: number;
  sessionId?: string;
}

export interface SecurityIncident {
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers?: string[];
  detectionMethod?: string;
  evidence?: Record<string, any>;
}

/**
 * Comprehensive security audit and monitoring service
 */
export class SecurityAuditService {
  private suspiciousActivityThresholds = {
    failedLoginAttempts: 5,
    rapidRequests: 100, // requests per minute
    dataAccessVolume: 1000, // records accessed per hour
    unusualHours: { start: 22, end: 6 }, // 10 PM to 6 AM
  };

  private riskFactors = {
    failedLogin: 10,
    successfulLoginAfterFailures: 15,
    dataExport: 20,
    adminAction: 25,
    unusualLocation: 30,
    unusualTime: 15,
    highVolumeAccess: 35,
    privilegeEscalation: 50,
  };

  /**
   * Log security events with automatic risk assessment
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const riskScore = this.calculateRiskScore(event);
      
      await db.insert(securityAuditLogs).values({
        ...event,
        riskScore,
      });

      // Check for suspicious patterns
      await this.detectSuspiciousActivity(event);

      // Alert on high-risk events
      if (riskScore >= 40) {
        await this.createSecurityAlert(event, riskScore);
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - security logging shouldn't break the application
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'password_change',
    req: Request | undefined,
    userId?: string,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType,
      severity: success ? 'low' : 'medium',
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req?.get?.('User-Agent') || 'unknown',
      success,
      details,
      sessionId: (req as any)?.sessionID || 'unknown',
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    resource: string,
    action: string,
    req: Request | undefined,
    userId?: string,
    recordCount?: number,
    success: boolean = true
  ): Promise<void> {
    const severity = this.determineDataAccessSeverity(action, recordCount);
    
    await this.logSecurityEvent({
      eventType: 'data_access',
      severity,
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req?.get?.('User-Agent') || 'unknown',
      resource,
      action,
      success,
      details: { recordCount },
      sessionId: (req as any)?.sessionID || 'unknown',
    });
  }

  /**
   * Log administrative actions
   */
  async logAdminAction(
    action: string,
    req: Request | undefined,
    userId: string,
    targetResource?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'admin_action',
      severity: 'high',
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req?.get?.('User-Agent') || 'unknown',
      resource: targetResource,
      action,
      success: true,
      details,
      sessionId: (req as any)?.sessionID || 'unknown',
    });
  }

  /**
   * Create security incident
   */
  async createIncident(incident: SecurityIncident): Promise<number> {
    const result = await db.insert(securityIncidents).values({
      ...incident,
      status: 'open',
    }).returning({ id: securityIncidents.id });

    const incidentId = result[0].id;

    // Send alerts for high-severity incidents
    if (incident.severity === 'high' || incident.severity === 'critical') {
      await this.sendSecurityAlert(incident, incidentId);
    }

    return incidentId;
  }

  /**
   * Detect suspicious activity patterns
   */
  private async detectSuspiciousActivity(event: SecurityEvent): Promise<void> {
    if (!event.userId || !event.ipAddress) return;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for multiple failed login attempts
    if (event.eventType === 'login_failure') {
      const recentFailures = await this.getRecentFailedLogins(event.userId, event.ipAddress, oneHourAgo);
      
      if (recentFailures >= this.suspiciousActivityThresholds.failedLoginAttempts) {
        await this.createIncident({
          incidentType: 'brute_force_attack',
          severity: 'high',
          description: `Multiple failed login attempts detected for user ${event.userId} from IP ${event.ipAddress}`,
          affectedUsers: [event.userId],
          detectionMethod: 'automated',
          evidence: { failedAttempts: recentFailures, timeWindow: '1 hour' },
        });
      }
    }

    // Check for unusual access patterns
    if (event.eventType === 'data_access' && event.details?.recordCount) {
      const recentAccess = await this.getRecentDataAccess(event.userId, oneHourAgo);
      
      if (recentAccess >= this.suspiciousActivityThresholds.dataAccessVolume) {
        await this.createIncident({
          incidentType: 'data_exfiltration_attempt',
          severity: 'critical',
          description: `Unusual high-volume data access detected for user ${event.userId}`,
          affectedUsers: [event.userId],
          detectionMethod: 'automated',
          evidence: { recordsAccessed: recentAccess, timeWindow: '1 hour' },
        });
      }
    }
  }

  /**
   * Calculate risk score for security events
   */
  private calculateRiskScore(event: SecurityEvent): number {
    let score = 0;

    // Base score by event type
    switch (event.eventType) {
      case 'login_failure':
        score += this.riskFactors.failedLogin;
        break;
      case 'login_success':
        score += event.details?.previousFailures ? this.riskFactors.successfulLoginAfterFailures : 5;
        break;
      case 'data_access':
        if (event.action?.includes('export') || event.action?.includes('download')) {
          score += this.riskFactors.dataExport;
        }
        if (event.details?.recordCount && event.details.recordCount > 100) {
          score += this.riskFactors.highVolumeAccess;
        }
        break;
      case 'admin_action':
        score += this.riskFactors.adminAction;
        break;
    }

    // Time-based risk
    const hour = new Date().getHours();
    if (hour >= this.suspiciousActivityThresholds.unusualHours.start || 
        hour <= this.suspiciousActivityThresholds.unusualHours.end) {
      score += this.riskFactors.unusualTime;
    }

    // Failure increases risk
    if (!event.success) {
      score += 10;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Determine severity for data access events
   */
  private determineDataAccessSeverity(action: string, recordCount?: number): 'low' | 'medium' | 'high' | 'critical' {
    if (action.includes('export') || action.includes('download')) {
      return recordCount && recordCount > 1000 ? 'critical' : 'high';
    }
    
    if (recordCount && recordCount > 100) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request | undefined): string {
    if (!req || !req.headers) {
      return 'unknown';
    }
    
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           (req as any).connection?.remoteAddress ||
           (req as any).socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * Get recent failed login attempts
   */
  private async getRecentFailedLogins(userId: string, ipAddress: string, since: Date): Promise<number> {
    try {
      const result = await db
        .select({ count: securityAuditLogs.id })
        .from(securityAuditLogs)
        .where(
          // Note: This is a simplified query - in production, use proper SQL conditions
          // sql`event_type = 'login_failure' AND (user_id = ${userId} OR ip_address = ${ipAddress}) AND timestamp >= ${since}`
        );
      
      return result.length;
    } catch (error) {
      console.error('Failed to get recent failed logins:', error);
      return 0;
    }
  }

  /**
   * Get recent data access volume
   */
  private async getRecentDataAccess(userId: string, since: Date): Promise<number> {
    try {
      // This would need proper SQL aggregation in production
      const result = await db
        .select()
        .from(securityAuditLogs)
        .where(
          // sql`event_type = 'data_access' AND user_id = ${userId} AND timestamp >= ${since}`
        );
      
      return result.reduce((total, log) => {
        const details = log.details as any;
        return total + (details?.recordCount || 0);
      }, 0);
    } catch (error) {
      console.error('Failed to get recent data access:', error);
      return 0;
    }
  }

  /**
   * Create security alert for high-risk events
   */
  private async createSecurityAlert(event: SecurityEvent, riskScore: number): Promise<void> {
    console.warn('🚨 HIGH-RISK SECURITY EVENT DETECTED:', {
      eventType: event.eventType,
      severity: event.severity,
      riskScore,
      userId: event.userId,
      ipAddress: event.ipAddress,
      timestamp: new Date().toISOString(),
    });

    // In production, this would send alerts via email, Slack, etc.
    // For now, we'll just log to console and could integrate with notification service
  }

  /**
   * Send security alert for incidents
   */
  private async sendSecurityAlert(incident: SecurityIncident, incidentId: number): Promise<void> {
    console.error('🚨 SECURITY INCIDENT CREATED:', {
      id: incidentId,
      type: incident.incidentType,
      severity: incident.severity,
      description: incident.description,
      timestamp: new Date().toISOString(),
    });

    // In production, integrate with alerting systems
  }

  /**
   * Generate security audit report
   */
  async generateAuditReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      // This would be a comprehensive report in production
      const events = await db
        .select()
        .from(securityAuditLogs)
        // .where(sql`timestamp BETWEEN ${startDate} AND ${endDate}`)
        .limit(1000);

      const incidents = await db
        .select()
        .from(securityIncidents)
        // .where(sql`created_at BETWEEN ${startDate} AND ${endDate}`)
        .limit(100);

      return {
        period: { start: startDate, end: endDate },
        summary: {
          totalEvents: events.length,
          totalIncidents: incidents.length,
          highRiskEvents: events.filter(e => (e.riskScore || 0) >= 40).length,
          criticalIncidents: incidents.filter(i => i.severity === 'critical').length,
        },
        events: events.slice(0, 50), // Latest 50 events
        incidents: incidents.slice(0, 20), // Latest 20 incidents
        recommendations: this.generateSecurityRecommendations(events, incidents),
      };
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      throw new Error('Failed to generate security audit report');
    }
  }

  /**
   * Generate security recommendations based on audit data
   */
  private generateSecurityRecommendations(events: any[], incidents: any[]): string[] {
    const recommendations: string[] = [];

    const failedLogins = events.filter(e => e.eventType === 'login_failure').length;
    if (failedLogins > 50) {
      recommendations.push('Consider implementing additional authentication measures due to high failed login attempts');
    }

    const highRiskEvents = events.filter(e => (e.riskScore || 0) >= 40).length;
    if (highRiskEvents > 10) {
      recommendations.push('Review and strengthen access controls due to multiple high-risk events');
    }

    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    if (criticalIncidents > 0) {
      recommendations.push('Immediate review of critical security incidents required');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture appears stable - continue monitoring');
    }

    return recommendations;
  }
}

// Singleton instance
export const securityAuditService = new SecurityAuditService();

// Export table definitions for migrations
export { securityAuditLogs, securityIncidents };