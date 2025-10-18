import { Request } from 'express';
import { ErrorContext } from '../../core/types.js';

export class RequestContextCapture {
  /**
   * Capture request context from Express request
   */
  static captureFromRequest(req: Request): ErrorContext {
    return {
      traceId: (req as any).traceId,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      url: req.originalUrl || req.url,
      method: req.method,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params
    };
  }

  /**
   * Sanitize request headers for logging
   */
  private static sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    Object.keys(headers).forEach(key => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = headers[key];
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private static sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}