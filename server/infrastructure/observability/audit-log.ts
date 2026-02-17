import { logger } from './logger';
import { NextFunction,Request, Response } from 'express';

import { databaseLogger } from './database-logger';

export interface AuditLogEntry {
  timestamp: Date;
  user_id?: string;
  action: string;
  resource?: string;
  ip: string;
  user_agent?: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  session_id?: string;
  correlationId?: string;
  sensitive?: boolean;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  request_body?: any;
  response_size?: number;
}

export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'data_access' | 'admin_action' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id?: string;
  ip: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Capture original end method
  const originalEnd = res.end;

  // Override end method to capture response details
  res.end = function(chunk?: unknown, encoding?: unknown) {
    const duration = Date.now() - startTime;

    const auditEntry: AuditLogEntry = {
      timestamp: new Date(),
      user_id: (req as any).user?.id,
      action: `${req.method} ${req.path}`,
      resource: req.path,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('User-Agent'),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      session_id: (req as any).session?.id,
      correlationId: (req as any).correlationId,
      sensitive: isSensitiveEndpoint(req.path, req.method),
      risk_level: determineRiskLevel(req, res),
      response_size: chunk ? Buffer.byteLength(chunk) : 0
    };

    // Log audit entry with enhanced context
    logger.info('HTTP Request Audit', {
      component: 'audit',
      operation: 'http_request',
      audit: true,
      ...auditEntry,
      tags: auditEntry.sensitive ? ['audit', 'security', 'sensitive'] : ['audit']
    });

    // Log security events for high-risk operations
    if (auditEntry.risk_level === 'high' || auditEntry.risk_level === 'critical') {
      logSecurityEvent({
        type: determineSecurityEventType(req, res),
        severity: auditEntry.risk_level,
        description: `${req.method} ${req.path} - ${res.statusCode}`,
        user_id: auditEntry.user_id,
        ip: auditEntry.ip,
        user_agent: auditEntry.user_agent,
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          userAgent: auditEntry.user_agent
        }
      });
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Determines if an endpoint is considered sensitive
 */
function isSensitiveEndpoint(path: string, method: string): boolean {
  const sensitivePatterns = [
    /\/users\/[^\/]+$/,
    /\/admin/,
    /\/security/,
    /\/auth\/tokens/,
    /\/password/,
    /\/2fa/,
    /\/backup-codes/
  ];

  const sensitiveMethods = ['DELETE', 'PUT', 'PATCH'];

  return sensitivePatterns.some(pattern => pattern.test(path)) ||
         (sensitiveMethods.includes(method) && path.includes('/users/'));
}

/**
 * Determines risk level based on request and response
 */
function determineRiskLevel(req: Request, res: Response): 'low' | 'medium' | 'high' | 'critical' {
  const path = req.path;
  const method = req.method;
  const statusCode = res.statusCode;

  // Critical: Failed authentication or high-risk operations
  if (statusCode === 401 || statusCode === 403) return 'critical';
  if (method === 'DELETE' && path.includes('/users/')) return 'critical';

  // High: Successful sensitive operations or admin actions
  if (isSensitiveEndpoint(path, method) && statusCode >= 200 && statusCode < 300) return 'high';
  if (path.includes('/admin') && statusCode >= 200 && statusCode < 300) return 'high';

  // Medium: Other mutations or errors
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'medium';

  // Low: Read operations
  return 'low';
}

/**
 * Determines the type of security event
 */
function determineSecurityEventType(req: Request, res: Response): SecurityEvent['type'] {
  const path = req.path;
  const method = req.method;
  const statusCode = res.statusCode;

  if (statusCode === 401 || statusCode === 403) return 'authorization';
  if (path.includes('/auth/')) return 'authentication';
  if (path.includes('/admin') || method === 'DELETE') return 'admin_action';
  if (isSensitiveEndpoint(path, method)) return 'data_access';

  return 'suspicious_activity';
}

/**
 * Logs security events with enhanced tracking
 */
function logSecurityEvent(event: SecurityEvent): void {
  databaseLogger.logAudit({
    action: event.type,
    entityType: 'security',
    entityId: event.user_id || 'anonymous',
    changes: {
      event: { old: null, new: event.description },
      severity: { old: null, new: event.severity }
    },
    sensitive: true,
    userId: event.user_id,
    ipAddress: event.ip,
    userAgent: event.user_agent,
    sessionId: undefined // Would need to be passed from request context
  });

  logger.warn(`Security Event: ${event.description}`, {
    component: 'security',
    operation: 'security_event',
    eventType: event.type,
    severity: event.severity,
    user_id: event.user_id,
    ip: event.ip,
    user_agent: event.user_agent,
    metadata: event.metadata,
    tags: ['security', 'audit', event.severity]
  });
}

/**
 * Enhanced audit logging for specific security-sensitive operations
 */
export function logSensitiveOperation(
  operation: string,
  userId: string,
  details: Record<string, unknown>,
  req?: Request
): void {
  const auditEntry = {
    timestamp: new Date(),
    user_id: userId,
    action: operation,
    resource: operation,
    ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
    user_agent: req?.get('User-Agent'),
    session_id: (req as any)?.session?.id,
    correlationId: (req as any)?.correlationId,
    sensitive: true,
    risk_level: 'high' as const,
    metadata: details
  };

  logger.info('Sensitive Operation Audit', {
    component: 'audit',
    operation: 'sensitive_operation',
    audit: true,
    ...auditEntry,
    tags: ['audit', 'security', 'sensitive']
  });
}

