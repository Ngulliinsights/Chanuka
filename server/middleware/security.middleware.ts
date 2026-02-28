import { Request, Response, NextFunction } from 'express';
import { logger } from '@server/infrastructure/observability';
import { inputValidationService } from '@server/infrastructure/validation/input-validation-service';
import { securityAuditService } from '@server/features/security';

interface SecurityMiddlewareOptions {
  validateInput?: boolean;
  sanitizeOutput?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  auditLog?: boolean;
}

/**
 * Security middleware for all routes
 * Provides input validation, output sanitization, rate limiting, and audit logging
 */
export class SecurityMiddleware {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * Create security middleware with options
   */
  public create(options: SecurityMiddlewareOptions = {}) {
    const {
      validateInput = true,
      sanitizeOutput = true,
      rateLimit,
      auditLog = true
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const startTime = Date.now();
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      try {
        // Rate limiting
        if (rateLimit) {
          const rateLimitResult = this.checkRateLimit(req, rateLimit);
          if (!rateLimitResult.allowed) {
            res.status(429).json({
              error: 'Too many requests',
              retryAfter: rateLimitResult.retryAfter
            });
            return;
          }
        }

        // Input validation
        if (validateInput) {
          const validationResult = this.validateRequest(req);
          if (!validationResult.isValid) {
            res.status(400).json({
              error: 'Validation failed',
              errors: validationResult.errors
            });
            return;
          }
        }

        // Audit logging
        if (auditLog) {
          await securityAuditService.logSecurityEvent({
            eventType: 'api_request',
            userId: (req as any).user?.id,
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
            resource: req.path,
            action: req.method,
            timestamp: new Date(),
            metadata: {
              requestId,
              query: req.query,
              params: req.params
            }
          });
        }

        // Sanitize output
        if (sanitizeOutput) {
          const originalJson = res.json.bind(res);
          res.json = (data: any) => {
            const sanitized = inputValidationService.sanitizeQueryParams(
              typeof data === 'object' ? data : { data }
            );
            return originalJson(sanitized);
          };
        }

        // Add security headers
        this.addSecurityHeaders(res);

        // Log request completion
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          logger.debug({
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration
          }, 'Request completed');
        });

        next();
      } catch (error) {
        logger.error({
          requestId,
          error: error instanceof Error ? error.message : String(error),
          path: req.path
        }, 'Security middleware error');
        
        res.status(500).json({
          error: 'Internal server error',
          requestId
        });
      }
    };
  }

  /**
   * Check rate limit for request
   */
  private checkRateLimit(
    req: Request,
    config: { windowMs: number; maxRequests: number }
  ): { allowed: boolean; retryAfter?: number } {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    const record = this.requestCounts.get(identifier);
    
    if (!record || now > record.resetTime) {
      // New window
      this.requestCounts.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return { allowed: true };
    }

    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    record.count++;
    return { allowed: true };
  }

  /**
   * Validate request inputs
   */
  private validateRequest(req: Request): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate body
    if (req.body && Object.keys(req.body).length > 0) {
      try {
        inputValidationService.sanitizeQueryParams(req.body);
      } catch (error) {
        errors.push(`Body validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Validate query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      try {
        inputValidationService.sanitizeQueryParams(req.query as Record<string, unknown>);
      } catch (error) {
        errors.push(`Query validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(res: Response): void {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict transport security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Content security policy
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  /**
   * Clean up old rate limit records
   */
  public cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Cleanup rate limits every 5 minutes
setInterval(() => {
  securityMiddleware.cleanupRateLimits();
}, 5 * 60 * 1000);
