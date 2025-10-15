import { Request } from 'express';
import { database as db } from '../../../shared/database/connection.js';
import { securityAuditLogs } from '../../../shared/schema.js';
import { eq, and, gte, lte, desc, sql, count, inArray } from 'drizzle-orm';
import { logger } from '../../utils/logger';

/**
 * SecurityAuditService - The System's Black Box Recorder
 * 
 * This service has ONE job: faithfully record all security-relevant events
 * in the system. It does not make decisions about what's suspicious, it does
 * not trigger alerts, and it does not take defensive actions. It simply writes
 * everything down with complete accuracy.
 * 
 * Think of this as the flight recorder on an airplane. It captures every detail
 * so that later analysis (by the monitoring service) can reconstruct what happened
 * and identify patterns or problems.
 */

export interface SecurityEvent {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result?: string;
  success: boolean;
  details?: Record<string, any>;
  sessionId?: string;
  timestamp?: Date;
}

export interface AuditQueryOptions {
  userId?: string;
  ipAddress?: string;
  eventType?: string;
  eventTypes?: string[];
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  period: { start: Date; end: Date };
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    uniqueUsers: number;
    uniqueIPs: number;
  };
  events: any[];
}

/**
 * Pure audit logging service - records events without judgment or action
 */
export class SecurityAuditService {
  /**
   * Core logging method - records any security event to the audit trail
   * This is the foundation method that all other logging methods use
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Drizzle insert expects required fields to be non-undefined.
      // Coalesce `result` to a sensible default so the insert signature matches.
      await db.insert(securityAuditLogs).values({
        eventType: event.eventType,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        resource: event.resource,
        action: event.action,
        // Ensure `result` is always a string (Drizzle's types require it)
        result: event.result ?? (event.success ? 'success' : 'failure'),
        severity: event.severity,
        details: event.details,
        sessionId: event.sessionId,
        timestamp: event.timestamp || new Date(),
      });
    } catch (error) {
      // Audit logging failures should be logged but should never crash the application
      // This is critical because if audit logging breaks, we don't want to take down
      // the entire system, but we absolutely need to know about it
      logger.error('CRITICAL: Audit logging failed', { component: 'SecurityAudit' }, {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.eventType,
        userId: event.userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log authentication events - login attempts, logouts, password changes
   * These are high-value audit events because authentication is often the first
   * target of attackers
   */
  async logAuthEvent(
    eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 
              'password_change' | 'password_reset_request' | 'password_reset_complete' |
              'registration_attempt' | 'registration_success' | 'registration_failure',
    req: Request | undefined,
    userId?: string,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    // Determine severity based on the event type and success status
    // Failed authentication attempts get elevated severity for easier monitoring
    const severity = this.determineAuthSeverity(eventType, success);

    await this.logSecurityEvent({
      eventType,
      severity,
      userId,
      ipAddress: this.extractClientIP(req),
      userAgent: req?.get?.('User-Agent') || 'unknown',
      result: success ? 'success' : 'failure',
      success,
      details: {
        ...details,
        // Add context about the authentication attempt
        attemptTimestamp: new Date().toISOString(),
        // Include any relevant headers that might help with forensics
        referer: req?.get?.('Referer'),
      },
      sessionId: (req as any)?.sessionID || 'unknown',
    });
  }

  /**
   * Log data access events - reads, writes, exports, deletes
   * These events help us track who accessed what data and when, which is
   * crucial for compliance (GDPR, HIPAA, etc.) and breach investigations
   */
  async logDataAccess(
    resource: string,
    action: 'read' | 'write' | 'update' | 'delete' | 'export' | 'bulk_read' | 'bulk_export',
    req: Request | undefined,
    userId?: string,
    recordCount?: number,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    // Data access severity increases with volume and type of operation
    const severity = this.determineDataAccessSeverity(action, recordCount);

    await this.logSecurityEvent({
      eventType: 'data_access',
      severity,
      userId,
      ipAddress: this.extractClientIP(req),
      userAgent: req?.get?.('User-Agent') || 'unknown',
      resource,
      action,
      result: success ? 'allowed' : 'denied',
      success,
      details: {
        recordCount,
        ...details,
        // Track data access patterns for compliance reporting
        dataCategory: this.categorizeResource(resource),
      },
      sessionId: (req as any)?.sessionID || 'unknown',
    });
  }

  /**
   * Log administrative actions - user management, system config changes, etc.
   * Admin actions always get high severity because they can have system-wide impact
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
      severity: 'high', // All admin actions are high severity by default
      userId,
      ipAddress: this.extractClientIP(req),
      userAgent: req?.get?.('User-Agent') || 'unknown',
      resource: targetResource,
      action,
      result: 'executed',
      success: true,
      details: {
        ...details,
        adminActionType: this.categorizeAdminAction(action),
      },
      sessionId: (req as any)?.sessionID || 'unknown',
    });
  }

  /**
   * Log security system events - monitoring actions, alert creation, etc.
   * This creates an audit trail of the security system itself, which is important
   * for understanding how the security system responded to events
   */
  async logSecuritySystemEvent(
    eventType: string,
    action: string,
    details?: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType,
      severity,
      action,
      result: 'completed',
      success: true,
      details: {
        ...details,
        systemGenerated: true,
        component: 'security_monitoring',
      },
    });
  }

  /**
   * Query audit logs with flexible filtering
   * This is how other services (especially the monitoring service) read the audit trail
   * to analyze patterns and detect threats
   */
  async queryAuditLogs(options: AuditQueryOptions): Promise<any[]> {
    try {
      // Build the base query
      let query = db.select().from(securityAuditLogs);

      // Build where clause by chaining conditions inline
      // This avoids TypeScript issues with condition arrays
      const whereConditions: any[] = [];

      if (options.userId) {
        whereConditions.push(eq(securityAuditLogs.userId, options.userId));
      }
      if (options.ipAddress) {
        whereConditions.push(eq(securityAuditLogs.ipAddress, options.ipAddress));
      }
      if (options.eventType) {
        whereConditions.push(eq(securityAuditLogs.eventType, options.eventType));
      }
      if (options.eventTypes && options.eventTypes.length > 0) {
        whereConditions.push(inArray(securityAuditLogs.eventType, options.eventTypes));
      }
      if (options.severity) {
        whereConditions.push(eq(securityAuditLogs.severity, options.severity));
      }
      if (options.startDate) {
        whereConditions.push(gte(securityAuditLogs.createdAt, options.startDate));
      }
      if (options.endDate) {
        whereConditions.push(lte(securityAuditLogs.createdAt, options.endDate));
      }

      // Apply conditions if any exist
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions)) as any;
      }

      // Apply ordering and pagination
      query = query.orderBy(desc(securityAuditLogs.createdAt)) as any;

      if (options.limit) {
        query = query.limit(options.limit) as any;
      }
      if (options.offset) {
        query = query.offset(options.offset) as any;
      }

      return await query;
    } catch (error) {
      logger.error('Failed to query audit logs:', { component: 'SecurityAudit' }, error);
      throw new Error('Audit log query failed');
    }
  }

  /**
   * Get event count for a specific query - useful for pagination and statistics
   */
  async getEventCount(options: AuditQueryOptions): Promise<number> {
    try {
      // Build the base count query
      let query = db.select({ count: count() }).from(securityAuditLogs);

      // Build where conditions inline to avoid TypeScript inference issues
      const whereConditions: any[] = [];

      if (options.userId) {
        whereConditions.push(eq(securityAuditLogs.userId, options.userId));
      }
      if (options.ipAddress) {
        whereConditions.push(eq(securityAuditLogs.ipAddress, options.ipAddress));
      }
      if (options.eventType) {
        whereConditions.push(eq(securityAuditLogs.eventType, options.eventType));
      }
      if (options.startDate) {
        whereConditions.push(gte(securityAuditLogs.createdAt, options.startDate));
      }
      if (options.endDate) {
        whereConditions.push(lte(securityAuditLogs.createdAt, options.endDate));
      }

      // Apply where conditions if any exist
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions)) as any;
      }

      const result = await query;
      return Number(result[0].count);
    } catch (error) {
      logger.error('Failed to get event count:', { component: 'SecurityAudit' }, error);
      return 0;
    }
  }

  /**
   * Generate a comprehensive audit report for a time period
   * This provides summary statistics and raw event data for compliance reporting
   * and security analysis
   */
  async generateAuditReport(startDate: Date, endDate: Date): Promise<AuditReport> {
    try {
      // Fetch all events in the time period
      const events = await this.queryAuditLogs({
        startDate,
        endDate,
        limit: 10000, // Reasonable limit for report generation
      });

      // Calculate summary statistics
      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const uniqueUsers = new Set<string>();
      const uniqueIPs = new Set<string>();

      events.forEach(event => {
        // Count by type
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
        
        // Count by severity
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        
        // Track unique users and IPs
        if (event.userId) uniqueUsers.add(event.userId);
        if (event.ipAddress) uniqueIPs.add(event.ipAddress);
      });

      return {
        period: { start: startDate, end: endDate },
        summary: {
          totalEvents: events.length,
          eventsByType,
          eventsBySeverity,
          uniqueUsers: uniqueUsers.size,
          uniqueIPs: uniqueIPs.size,
        },
        events: events.slice(0, 100), // Include first 100 events in report
      };
    } catch (error) {
      logger.error('Failed to generate audit report:', { component: 'SecurityAudit' }, error);
      throw new Error('Audit report generation failed');
    }
  }

  /**
   * Get recent failed login attempts for a user or IP
   * This is a convenience method frequently needed by the monitoring service
   */
  async getRecentFailedLogins(
    userIdOrIP: string, 
    since: Date,
    matchField: 'userId' | 'ipAddress' = 'userId'
  ): Promise<any[]> {
    return await this.queryAuditLogs({
      [matchField]: userIdOrIP,
      eventType: 'login_failure',
      startDate: since,
    });
  }

  /**
   * Get recent data access volume for a user
   * Used by monitoring service to detect data exfiltration attempts
   * (Note: "exfiltration" refers to unauthorized data transfer out of a system)
   */
  async getRecentDataAccessVolume(userId: string, since: Date): Promise<number> {
    const events = await this.queryAuditLogs({
      userId,
      eventType: 'data_access',
      startDate: since,
    });

    // Sum up the record counts from all data access events
    return events.reduce((total, event) => {
      const details = event.details as any;
      return total + (details?.recordCount || 0);
    }, 0);
  }

  /**
   * Private helper methods for categorization and severity determination
   */

  private determineAuthSeverity(eventType: string, success: boolean): 'low' | 'medium' | 'high' | 'critical' {
    // Failed authentication attempts are medium severity because they could indicate attacks
    if (!success) {
      return 'medium';
    }

    // Successful password changes and resets are medium because they're sensitive operations
    if (eventType.includes('password')) {
      return 'medium';
    }

    // Regular successful logins are low severity
    return 'low';
  }

  private determineDataAccessSeverity(action: string, recordCount?: number): 'low' | 'medium' | 'high' | 'critical' {
    // Exports and bulk operations are inherently higher risk
    if (action.includes('export') || action.includes('bulk')) {
      return recordCount && recordCount > 1000 ? 'critical' : 'high';
    }

    // Deletes are high severity because they're destructive
    if (action === 'delete') {
      return 'high';
    }

    // High volume access is medium severity
    if (recordCount && recordCount > 100) {
      return 'medium';
    }

    // Regular read/write operations are low severity
    return 'low';
  }

  private categorizeResource(resource: string): string {
    // Categorize resources for compliance reporting
    if (resource.includes('user') || resource.includes('profile')) {
      return 'personal_data';
    }
    if (resource.includes('payment') || resource.includes('financial')) {
      return 'financial_data';
    }
    if (resource.includes('health') || resource.includes('medical')) {
      return 'health_data';
    }
    return 'general_data';
  }

  private categorizeAdminAction(action: string): string {
    if (action.includes('user') || action.includes('role')) {
      return 'user_management';
    }
    if (action.includes('config') || action.includes('setting')) {
      return 'configuration';
    }
    if (action.includes('permission') || action.includes('access')) {
      return 'access_control';
    }
    return 'general_admin';
  }

  private extractClientIP(req: Request | undefined): string {
    if (!req || !req.headers) {
      return 'unknown';
    }
    
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           (req.headers['x-real-ip'] as string) ||
           (req as any).connection?.remoteAddress ||
           (req as any).socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }
}

// Export singleton instance
export const securityAuditService = new SecurityAuditService();