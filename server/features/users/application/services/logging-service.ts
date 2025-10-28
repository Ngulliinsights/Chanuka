/**
 * Cross-cutting concern: Logging Service
 * Handles application-level logging for user operations
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  operation: string;
  userId?: string;
  targetId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

export class LoggingService {
  private static instance: LoggingService;

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  logUserActivity(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    // In a real implementation, this would write to a logging system
    // For now, we'll use console.log with structured format
    console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.operation}`, {
      userId: logEntry.userId,
      targetId: logEntry.targetId,
      timestamp: logEntry.timestamp,
      details: logEntry.details,
      ip: logEntry.ip,
      userAgent: logEntry.userAgent
    });
  }

  logSecurityEvent(operation: string, userId: string, details: Record<string, any>): void {
    this.logUserActivity({
      level: 'warn',
      operation: `security.${operation}`,
      userId,
      details
    });
  }

  logAuditEvent(operation: string, userId: string, targetId: string, details?: Record<string, any>): void {
    this.logUserActivity({
      level: 'info',
      operation: `audit.${operation}`,
      userId,
      targetId,
      details
    });
  }

  logError(operation: string, error: Error, userId?: string, details?: Record<string, any>): void {
    this.logUserActivity({
      level: 'error',
      operation: `error.${operation}`,
      userId,
      details: {
        error: error.message,
        stack: error.stack,
        ...details
      }
    });
  }
}

// Convenience functions
export const logUserActivity = LoggingService.getInstance().logUserActivity.bind(LoggingService.getInstance());
export const logSecurityEvent = LoggingService.getInstance().logSecurityEvent.bind(LoggingService.getInstance());
export const logAuditEvent = LoggingService.getInstance().logAuditEvent.bind(LoggingService.getInstance());
export const logError = LoggingService.getInstance().logError.bind(LoggingService.getInstance());





































