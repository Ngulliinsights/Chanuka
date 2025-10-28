import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../shared/core/index.js';

export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  action: string;
  resource?: string;
  ip: string;
  userAgent?: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
}

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture original end method
  const originalEnd = res.end;
  
  // Override end method to capture response details
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    const auditEntry: AuditLogEntry = {
      timestamp: new Date(),
      userId: (req as any).user?.id,
      action: `${req.method} ${req.path}`,
      resource: req.path,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    };
    
    // Log audit entry
    logger.info('Audit log entry', {
      component: 'Chanuka',
      audit: true,
      ...auditEntry
    });
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};
