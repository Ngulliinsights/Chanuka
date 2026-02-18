/**
 * Security Event Logger
 * 
 * Specialized logging for security-related events.
 * This is a stub implementation - full implementation pending.
 */

import { logger } from '../core/logger';
import type { SecurityEvent, AuditOperation } from '../core/types';
import { classifyRisk, classifySecurityEventType } from './security-policy';

/**
 * Emit a security event
 */
export function emitSecurityEvent(event: SecurityEvent): void {
  logger.logSecurityEvent(
    {
      event: event.type,
      severity: event.severity,
      user_id: event.user_id,
      ip: event.ip,
      user_agent: event.user_agent,
      ...event.metadata,
    },
    event.description
  );
}

/**
 * Emit an audit log for a sensitive operation
 */
export function emitSensitiveOperationAudit(operation: AuditOperation): void {
  // Create a mock request object for classification
  const mockReq = {
    path: `/${operation.entityType}/${operation.entityId}`,
    method: operation.action.toUpperCase(),
  } as any;
  
  const riskLevel = classifyRisk(mockReq, operation.sensitive ? 403 : 200);
  const eventType = classifySecurityEventType(mockReq, operation.sensitive ? 403 : 200);
  
  const event: SecurityEvent = {
    type: eventType,
    severity: operation.severity ?? (operation.sensitive ? 'high' : 'medium'),
    description: `${operation.action} on ${operation.entityType} ${operation.entityId}`,
    user_id: operation.userId,
    ip: operation.ipAddress ?? 'unknown',
    user_agent: operation.userAgent,
    metadata: {
      entityType: operation.entityType,
      entityId: operation.entityId,
      changes: operation.changes,
      sensitive: operation.sensitive,
      riskLevel,
      sessionId: operation.sessionId,
    },
  };
  
  emitSecurityEvent(event);
}
