/**
 * Security Policy
 * 
 * Security classification and risk assessment utilities.
 */

import type { Request } from 'express';
import type { RiskLevel, SecurityEventType } from '../core/types';

/**
 * Determine if an endpoint is sensitive based on path and method
 */
export function isSensitiveEndpoint(path: string, method?: string): boolean {
  // Sensitive patterns that require extra scrutiny
  const sensitivePatterns = [
    '/auth/',
    '/admin/',
    '/api/users/',
    '/api/security/',
    '/api/admin/',
    '/password',
    '/token',
  ];
  
  const isSensitivePath = sensitivePatterns.some(pattern => path.includes(pattern));
  
  // DELETE and PUT operations on any resource are considered sensitive
  const isSensitiveMethod = method && ['DELETE', 'PUT', 'PATCH'].includes(method.toUpperCase());
  
  return isSensitivePath || Boolean(isSensitiveMethod);
}

/**
 * Classify risk level based on request and response
 */
export function classifyRisk(
  req: Request,
  statusCode: number
): RiskLevel {
  const path = req.path;
  const method = req.method;
  
  // Critical: Failed authentication attempts, server errors on sensitive endpoints
  if (statusCode === 401 || statusCode === 403) {
    return 'critical';
  }
  
  if (statusCode >= 500 && isSensitiveEndpoint(path, method)) {
    return 'critical';
  }
  
  // High: Sensitive operations, admin actions
  if (isSensitiveEndpoint(path, method)) {
    return 'high';
  }
  
  if (method === 'DELETE' || path.includes('/admin/')) {
    return 'high';
  }
  
  // Medium: Write operations
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    return 'medium';
  }
  
  // Low: Read operations
  return 'low';
}

/**
 * Classify security event type based on request and response
 */
export function classifySecurityEventType(
  req: Request,
  statusCode: number
): SecurityEventType {
  const path = req.path;
  const method = req.method;
  
  // Authentication events
  if (path.includes('/auth/') || path.includes('/login') || statusCode === 401) {
    return 'authentication';
  }
  
  // Authorization events
  if (statusCode === 403 || path.includes('/permission') || path.includes('/role')) {
    return 'authorization';
  }
  
  // Admin actions
  if (path.includes('/admin/')) {
    return 'admin_action';
  }
  
  // Data access
  if (isSensitiveEndpoint(path, method)) {
    return 'data_access';
  }
  
  // Suspicious activity (failed requests, unusual patterns)
  if (statusCode >= 400) {
    return 'suspicious_activity';
  }
  
  return 'data_access';
}
