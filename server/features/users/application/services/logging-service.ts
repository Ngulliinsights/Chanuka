/**
 * Cross-cutting concern: Logging Service
 * Handles application-level logging for user operations
 * Uses centralized Pino logger from infrastructure
 */

import { logger } from '@server/infrastructure/observability';

export interface LogEntry {
  timestamp: string;
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

    const context = {
      user_id: logEntry.user_id,
      targetId: logEntry.targetId,
      timestamp: logEntry.timestamp,
      details: logEntry.details,
      ip: logEntry.ip,
      user_agent: logEntry.user_agent
    };

    switch (logEntry.level) {
      case 'error':
        logger.error(context, logEntry.operation);
        break;
      case 'warn':
        logger.warn(context, logEntry.operation);
        break;
      default:
        logger.info(context, logEntry.operation);
    }
  }

  logSecurityEvent(operation: string, user_id: string, details: Record<string, unknown>): void {
    logger.logSecurityEvent(
      { user_id, ...details },
      `security.${operation}`
    );
  }

  logAuditEvent(operation: string, user_id: string, targetId: string, details?: Record<string, unknown>): void {
    logger.info(
      { user_id, targetId, ...details },
      `audit.${operation}`
    );
  }

  logError(operation: string, error: Error, user_id?: string, details?: Record<string, unknown>): void {
    logger.error(
      {
        user_id,
        error: error.message,
        stack: error.stack,
        ...details
      },
      `error.${operation}`
    );
  }
}

// Convenience functions
export const logUserActivity = LoggingService.getInstance().logUserActivity.bind(LoggingService.getInstance());
export const logSecurityEvent = LoggingService.getInstance().logSecurityEvent.bind(LoggingService.getInstance());
export const logAuditEvent = LoggingService.getInstance().logAuditEvent.bind(LoggingService.getInstance());
export const logError = LoggingService.getInstance().logError.bind(LoggingService.getInstance());








































