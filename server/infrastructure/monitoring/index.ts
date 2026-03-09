/**
 * Audit Logger Stub
 * Provides the auditLogger interface expected by privacy-service.ts and other modules.
 * Delegates to the existing pino logger for now.
 */
import { logger } from '@server/infrastructure/observability';

interface AuditLogEntry {
  user_id: string;
  action: string;
  resource: string;
  severity: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export const auditLogger = {
  log(entry: AuditLogEntry): Promise<void> {
    logger.info({
      component: 'audit-logger',
      ...entry
    }, `[AUDIT] ${entry.action}`);
    return Promise.resolve();
  },

  logDataExport(
    userId: string,
    exportType: string,
    totalRecords: number,
    requestedBy: string
  ): Promise<void> {
    logger.info({
      component: 'audit-logger',
      userId,
      exportType,
      totalRecords,
      requestedBy
    }, `[AUDIT] Data export: ${exportType}`);
    return Promise.resolve();
  }
};
