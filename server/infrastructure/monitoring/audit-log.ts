import { database as db } from '../../../shared/database/connection.js';

// Define audit log table schema (would be added to schema.ts)
export interface AuditLogEntry {
  id?: number;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxInMemoryLogs = 1000;

  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // Store in memory for immediate access
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxInMemoryLogs) {
      this.logs.pop();
    }

    // In production, you'd store this in a database table
    console.log('AUDIT LOG:', JSON.stringify(logEntry, null, 2));

    // For critical actions, you might also send alerts
    if (entry.severity === 'critical') {
      await this.sendCriticalAlert(logEntry);
    }
  }

  async getUserActions(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(0, limit);
  }

  async getResourceActions(resource: string, resourceId?: string, limit = 50): Promise<AuditLogEntry[]> {
    return this.logs
      .filter(log => {
        if (resourceId) {
          return log.resource === resource && log.resourceId === resourceId;
        }
        return log.resource === resource;
      })
      .slice(0, limit);
  }

  async getRecentLogs(limit = 100): Promise<AuditLogEntry[]> {
    return this.logs.slice(0, limit);
  }

  async searchLogs(query: {
    userId?: string;
    action?: string;
    resource?: string;
    severity?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let filtered = this.logs;

    if (query.userId) {
      filtered = filtered.filter(log => log.userId === query.userId);
    }

    if (query.action) {
      filtered = filtered.filter(log => log.action.includes(query.action!));
    }

    if (query.resource) {
      filtered = filtered.filter(log => log.resource === query.resource);
    }

    if (query.severity) {
      filtered = filtered.filter(log => log.severity === query.severity);
    }

    if (query.dateFrom) {
      filtered = filtered.filter(log => log.timestamp >= query.dateFrom!);
    }

    if (query.dateTo) {
      filtered = filtered.filter(log => log.timestamp <= query.dateTo!);
    }

    return filtered.slice(0, query.limit || 100);
  }

  private async sendCriticalAlert(entry: AuditLogEntry): Promise<void> {
    // In production, send email/SMS/Slack notification for critical actions
    console.log('🚨 CRITICAL AUDIT EVENT:', entry);
  }

  // Predefined logging methods for common actions
  async logUserLogin(userId: string, ipAddress: string, userAgent: string, success: boolean): Promise<void> {
    await this.log({
      userId,
      action: success ? 'user.login.success' : 'user.login.failed',
      resource: 'user',
      resourceId: userId,
      details: { success },
      ipAddress,
      userAgent,
      severity: success ? 'low' : 'medium'
    });
  }

  async logUserLogout(userId: string, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: 'user.logout',
      resource: 'user',
      resourceId: userId,
      ipAddress,
      severity: 'low'
    });
  }

  async logBillCreated(userId: string, billId: number, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: 'bill.created',
      resource: 'bill',
      resourceId: billId.toString(),
      ipAddress,
      severity: 'medium'
    });
  }

  async logBillUpdated(userId: string, billId: number, changes: Record<string, any>, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: 'bill.updated',
      resource: 'bill',
      resourceId: billId.toString(),
      details: { changes },
      ipAddress,
      severity: 'medium'
    });
  }

  async logBillDeleted(userId: string, billId: number, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: 'bill.deleted',
      resource: 'bill',
      resourceId: billId.toString(),
      ipAddress,
      severity: 'high'
    });
  }

  async logUserRoleChanged(adminUserId: string, targetUserId: string, oldRole: string, newRole: string, ipAddress: string): Promise<void> {
    await this.log({
      userId: adminUserId,
      action: 'user.role.changed',
      resource: 'user',
      resourceId: targetUserId,
      details: { oldRole, newRole, targetUserId },
      ipAddress,
      severity: 'high'
    });
  }

  async logDataExport(userId: string, dataType: string, recordCount: number, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: 'data.exported',
      resource: 'data',
      details: { dataType, recordCount },
      ipAddress,
      severity: 'medium'
    });
  }

  async logSecurityEvent(userId: string | undefined, event: string, details: Record<string, any>, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: `security.${event}`,
      resource: 'security',
      details,
      ipAddress,
      severity: 'critical'
    });
  }

  async logAPIAccess(userId: string | undefined, endpoint: string, method: string, statusCode: number, ipAddress: string): Promise<void> {
    const severity = statusCode >= 400 ? 'medium' : 'low';
    
    await this.log({
      userId,
      action: 'api.access',
      resource: 'api',
      details: { endpoint, method, statusCode },
      ipAddress,
      severity
    });
  }

  // Analytics methods
  async getActionCounts(dateFrom?: Date, dateTo?: Date): Promise<Record<string, number>> {
    let filtered = this.logs;

    if (dateFrom) {
      filtered = filtered.filter(log => log.timestamp >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(log => log.timestamp <= dateTo);
    }

    const counts: Record<string, number> = {};
    filtered.forEach(log => {
      counts[log.action] = (counts[log.action] || 0) + 1;
    });

    return counts;
  }

  async getUserActivitySummary(userId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    totalActions: number;
    actionBreakdown: Record<string, number>;
    lastActivity: Date | null;
  }> {
    let userLogs = this.logs.filter(log => log.userId === userId);

    if (dateFrom) {
      userLogs = userLogs.filter(log => log.timestamp >= dateFrom);
    }

    if (dateTo) {
      userLogs = userLogs.filter(log => log.timestamp <= dateTo);
    }

    const actionBreakdown: Record<string, number> = {};
    userLogs.forEach(log => {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
    });

    return {
      totalActions: userLogs.length,
      actionBreakdown,
      lastActivity: userLogs.length > 0 ? userLogs[0].timestamp : null
    };
  }
}

export const auditLogger = new AuditLogger();

// Middleware to automatically log API requests
export const auditMiddleware = (req: any, res: any, next: any) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // Log the API access after response is sent
    setImmediate(() => {
      auditLogger.logAPIAccess(
        req.user?.id,
        req.originalUrl,
        req.method,
        res.statusCode,
        req.ip || req.connection.remoteAddress
      );
    });
    
    return originalSend.call(this, data);
  };

  next();
};