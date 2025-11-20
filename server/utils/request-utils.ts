import { Request } from 'express';

/**
 * Extract client IP address from request headers
 * Handles various proxy configurations and fallbacks
 */
export function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         (req.headers['x-real-ip'] as string) ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip ||
         'unknown';
}
