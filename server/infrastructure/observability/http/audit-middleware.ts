/**
 * Audit Middleware
 *
 * Responsibility: intercept HTTP responses and wire request context into
 * the audit and security logging pipeline.
 *
 * What it does NOT do:
 *  - classify risk (→ security-policy.ts)
 *  - emit security events (→ security-event-logger.ts)
 *  - define sensitive endpoint rules (→ security-policy.ts)
 */

import type { NextFunction, Request, Response } from 'express';
import { logger } from '../core/logger';
import type { AuditLogEntry } from '../core/types';
import { classifyRisk, classifySecurityEventType, isSensitiveEndpoint } from '../../../features/security/security-policy';
import { emitSecurityEvent } from '../../../features/security/security-event-logger';

export { emitSensitiveOperationAudit as logSensitiveOperation } from '../../../features/security/security-event-logger';

/**
 * Express middleware that logs every HTTP request as a structured audit entry
 * and triggers security-event emission for high/critical risk exchanges.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const originalEnd = res.end.bind(res);

  // Override end to capture response details after they are committed
  (res.end as unknown) = function (
    this: Response,
    chunk?: unknown,
    encoding?: unknown,
  ) {
    const duration   = Date.now() - startTime;
    const statusCode = res.statusCode;
    const riskLevel  = classifyRisk(req, statusCode);

    const entry: AuditLogEntry = {
      timestamp:     new Date(),
      user_id:       (req as any).user?.id,
      action:        `${req.method} ${req.path}`,
      resource:      req.path,
      ip:            req.ip ?? req.socket.remoteAddress ?? 'unknown',
      user_agent:    req.get('User-Agent'),
      method:        req.method,
      path:          req.path,
      statusCode,
      duration,
      session_id:    (req as any).session?.id,
      correlationId: (req as any).correlationId ?? '',
      sensitive:     isSensitiveEndpoint(req.path, req.method),
      risk_level:    riskLevel,
      response_size: chunk ? Buffer.byteLength(chunk as string | Buffer) : 0,
    };

    logger.info(
      {
        component: 'audit',
        operation: 'http_request',
        audit: true,
        ...entry,
        tags: entry.sensitive ? ['audit', 'security', 'sensitive'] : ['audit'],
      },
      'HTTP Request Audit',
    );

    if (riskLevel === 'high' || riskLevel === 'critical') {
      emitSecurityEvent({
        type:        classifySecurityEventType(req, statusCode),
        severity:    riskLevel,
        description: `${req.method} ${req.path} — ${statusCode}`,
        user_id:     entry.user_id,
        ip:          entry.ip,
        user_agent:  entry.user_agent,
        metadata: {
          method:     req.method,
          path:       req.path,
          statusCode,
          duration,
          userAgent:  entry.user_agent,
        },
      });
    }

    return originalEnd(chunk as any, encoding as any);
  };

  next();
}