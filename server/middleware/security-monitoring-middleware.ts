import { Request, Response, NextFunction } from 'express';
import { securityMonitoringService } from '@server/features/security/security-monitoring-service.ts';
import { intrusionDetectionService } from '@server/features/security/intrusion-detection-service.ts';
import { securityAuditService } from '@server/features/security/security-audit-service.ts';
import { logger } from '@shared/core';
import { getClientIP } from '@server/utils/request-utils.ts';

export interface SecurityMonitoringOptions {
  enableThreatDetection: boolean;
  enableBehavioralAnalysis: boolean;
  enableRealTimeBlocking: boolean;
  enableAuditLogging: boolean;
  bypassPaths: string[];
  alertThreshold: number;
}

/**
 * Security monitoring middleware that integrates threat detection,
 * behavioral analysis, and audit logging into the request pipeline
 */
export class SecurityMonitoringMiddleware {
  private options: SecurityMonitoringOptions;

  constructor(options: Partial<SecurityMonitoringOptions> = {}) {
    this.options = {
      enableThreatDetection: true,
      enableBehavioralAnalysis: true,
      enableRealTimeBlocking: true,
      enableAuditLogging: true,
      bypassPaths: ['/health', '/metrics', '/favicon.ico'],
      alertThreshold: 70,
      ...options
    };
  }

  /**
   * Main security monitoring middleware
   */
  monitor() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string || this.generateRequestId();
      
      try {
        // Skip monitoring for bypass paths
        if (this.shouldBypassPath(req.path)) {
          return next();
        }

        // Initialize request context
        (req as any).securityContext = { requestId,
          startTime,
          ip_address: getClientIP(req),
          user_agent: req.get('User-Agent'),
          user_id: (req as any).user?.id
         };

        // Perform threat detection analysis
        if (this.options.enableThreatDetection) {
          const threatResult = await securityMonitoringService.monitorRequest(req, res);
          
          // Block request if critical threat detected
          if (this.options.enableRealTimeBlocking && threatResult.isBlocked) {
            await this.handleBlockedRequest(req, res, threatResult);
            return;
          }

          // Challenge request if high risk
          if (threatResult.recommendedAction === 'challenge') {
            await this.handleChallengeRequest(req, res, threatResult);
            return;
          }

          // Store threat result in request context
          (req as any).securityContext.threatResult = threatResult;
        }

        // Log successful security check
        if (this.options.enableAuditLogging) {
          await securityAuditService.logSecurityEvent({
            event_type: 'request_processed',
            severity: 'low',
            ip_address: (req as any).securityContext.ip_address,
            user_agent: (req as any).securityContext.user_agent,
            resource: req.path,
            action: req.method,
            result: 'processed',
            success: true,
            details: {
              requestId,
              threatLevel: (req as any).securityContext.threatResult?.threatLevel || 'none'
            },
            user_id: (req as any).securityContext.user_id
          });
        }

        // Continue to next middleware
        next();

      } catch (error) {
        logger.error('Security monitoring error:', { component: 'Chanuka' }, error);
        
        // Log the error but don't block the request
        if (this.options.enableAuditLogging) {
          await securityAuditService.logSecurityEvent({
            event_type: 'monitoring_error',
            severity: 'medium',
            ip_address: getClientIP(req),
            user_agent: req.get('User-Agent'),
            resource: req.path,
            action: req.method,
            result: 'error',
            success: false,
            details: {
              error: (error as Error).message,
              requestId
            },
            user_id: (req as any).user?.id
          });
        }

        // Continue processing - don't let monitoring errors break the app
        next();
      }
    };
  }

  /**
   * Response monitoring middleware to log response details
   */
  monitorResponse() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.shouldBypassPath(req.path)) {
        return next();
      }

      const securityContext = (req as any).securityContext;
      if (!securityContext) {
        return next();
      }

      // Override res.json to capture response
      const originalJson = res.json;
      const originalSend = res.send;
      const originalEnd = res.end;

      let responseLogged = false;

      const logResponse = async () => {
        if (responseLogged) return;
        responseLogged = true;

        const duration = Date.now() - securityContext.startTime;
        const statusCode = res.statusCode;

        // Log response details
        if (this.options.enableAuditLogging) {
          await securityAuditService.logSecurityEvent({
            event_type: 'response_sent',
            severity: statusCode >= 500 ? 'high' : statusCode >= 400 ? 'medium' : 'low',
            ip_address: securityContext.ip_address,
            user_agent: securityContext.user_agent,
            resource: req.path,
            action: req.method,
            result: statusCode < 400 ? 'success' : 'error',
            success: statusCode < 400,
            details: {
              statusCode,
              duration,
              requestId: securityContext.requestId,
              threatLevel: securityContext.threatResult?.threatLevel || 'none'
            },
            user_id: securityContext.user_id
          });
        }

        // Check for suspicious response patterns
        if (statusCode === 404 && duration < 100) {
          // Very fast 404 responses might indicate scanning
          await this.handleSuspiciousPattern(req, 'fast_404_responses');
        }

        if (statusCode >= 500) {
          // Server errors might indicate attack attempts
          await this.handleSuspiciousPattern(req, 'server_errors');
        }
      };

      // Override response methods
      res.json = function(body) {
        logResponse();
        return originalJson.call(this, body);
      };

      res.send = function(body) {
        logResponse();
        return originalSend.call(this, body);
      };

      res.end = function(...args: any[]): Response {
        logResponse();
        return (originalEnd as any).apply(this, args);
      };

      next();
    };
  }

  /**
   * Authentication monitoring middleware
   */
  monitorAuthentication() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.options.enableAuditLogging) {
        return next();
      }

      // Monitor authentication events
      const originalJson = res.json;
      res.json = function(body) {
        // Check if this is an authentication response
        if (req.path.includes('/auth/') || req.path.includes('/login')) {
          const isSuccess = res.statusCode === 200 && body && !body.error;
          
          securityAuditService.logAuthEvent(
            isSuccess ? 'login_success' : 'login_failure',
            req,
            body?.user?.id,
            isSuccess,
            { endpoint: req.path, statusCode: res.statusCode }
          );
        }

        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Data access monitoring middleware
   */
  monitorDataAccess() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.options.enableAuditLogging) {
        return next();
      }

      // Monitor data access patterns
      const dataEndpoints = ['/api/bills', '/api/sponsors', '/api/users', '/api/comments'];
      const isDataEndpoint = dataEndpoints.some(endpoint => req.path.startsWith(endpoint));

      if (isDataEndpoint) {
        const originalJson = res.json;
        res.json = function(body) {
          const recordCount = Array.isArray(body?.data) ? body.data.length : 
                             body?.results?.length || 
                             (body && typeof body === 'object' ? 1 : 0);

          securityAuditService.logDataAccess(
            req.path,
            req.method,
            req,
            (req as any).user?.id,
            recordCount,
            res.statusCode < 400
          );

          return originalJson.call(this, body);
        };
      }

      next();
    };
  }

  /**
   * Admin action monitoring middleware
   */
  monitorAdminActions() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.options.enableAuditLogging) {
        return next();
      }

      // Monitor admin endpoints
      const isAdminEndpoint = req.path.startsWith('/api/admin/');
      const user_role = (req as any).user?.role;

      if (isAdminEndpoint && user_role === 'admin') {
        const originalJson = res.json;
        res.json = function(body) {
          if (res.statusCode < 400) {
            securityAuditService.logAdminAction(
              `${req.method} ${req.path}`,
              req,
              (req as any).users.id,
              req.path,
              { 
                requestBody: req.body,
                responseStatus: res.statusCode,
                timestamp: new Date()
              }
            );
          }

          return originalJson.call(this, body);
        };
      }

      next();
    };
  }

  /**
   * Handle blocked requests
   */
  private async handleBlockedRequest(req: Request, res: Response, threatResult: any): Promise<void> {
    const ip_address = getClientIP(req);
    
    console.warn(`🚫 Request blocked from ${ip_address}: ${threatResult.detectedThreats.map((t: any) => t.type).join(', ')}`);

    res.status(403).json({
      error: 'Request blocked by security system',
      code: 'SECURITY_BLOCK',
      requestId: (req as any).securityContext?.requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle challenge requests (e.g., CAPTCHA)
   */
  private async handleChallengeRequest(req: Request, res: Response, threatResult: any): Promise<void> {
    console.warn(`⚠️ Challenge required for ${getClientIP(req)}: Risk score ${threatResult.risk_score}`);

    res.status(429).json({
      error: 'Additional verification required',
      code: 'SECURITY_CHALLENGE',
      challengeType: 'rate_limit',
      retryAfter: 60,
      requestId: (req as any).securityContext?.requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
    * Handle suspicious patterns
    */
   private async handleSuspiciousPattern(req: Request, patternType: string): Promise<void> {
     const ip_address = getClientIP(req);

     await securityAuditService.logSecurityEvent({
       event_type: 'suspicious_pattern',
       severity: 'medium',
       ip_address,
       user_agent: req.get('User-Agent'),
       resource: req.path,
       action: req.method,
       result: 'detected',
       success: false,
       details: {
         patternType,
         statusCode: (req as any).res?.statusCode,
         timestamp: new Date()
       },
       user_id: (req as any).user?.id
     });
   }

  /**
   * Utility methods
   */
  private shouldBypassPath(path: string): boolean {
    return this.options.bypassPaths.some(bypassPath => path.startsWith(bypassPath));
  }


  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize all security monitoring middleware
   */
  initializeAll() {
    return [
      this.monitor(),
      this.monitorResponse(),
      this.monitorAuthentication(),
      this.monitorDataAccess(),
      this.monitorAdminActions()
    ];
  }
}

// Export configured instance
export const securityMonitoringMiddleware = new SecurityMonitoringMiddleware({
  enableThreatDetection: true,
  enableBehavioralAnalysis: true,
  enableRealTimeBlocking: process.env.NODE_ENV === 'production',
  enableAuditLogging: true,
  bypassPaths: ['/health', '/metrics', '/favicon.ico', '/api/health'],
  alertThreshold: 70
});













































