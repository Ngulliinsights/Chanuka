/**
 * Cross-cutting concern: Logging Service
 * Handles application-level logging for user operations
 */

export interface LogEntry { timestamp: string;
  level: 'info' | 'warn' | 'error';
  operation: string;
  user_id?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  user_agent?: string;
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
    console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.operation}`, { user_id: logEntry.user_id,
      targetId: logEntry.targetId,
      timestamp: logEntry.timestamp,
      details: logEntry.details,
      ip: logEntry.ip,
      user_agent: logEntry.user_agent
     });
  }

  logSecurityEvent(operation: string, user_id: string, details: Record<string, unknown>): void {
    this.logUserActivity({
      level: 'warn',
      operation: `security.${operation}`,
      user_id,
      details
    });
  }

  logAuditEvent(operation: string, user_id: string, targetId: string, details?: Record<string, unknown>): void {
    this.logUserActivity({
      level: 'info',
      operation: `audit.${operation}`,
      user_id,
      targetId,
      details
    });
  }

  logError(operation: string, error: Error, user_id?: string, details?: Record<string, unknown>): void {
    this.logUserActivity({
      level: 'error',
      operation: `error.${operation}`,
      user_id,
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








































