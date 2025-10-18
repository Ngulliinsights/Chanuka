import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { encryptionService } from '../features/security/encryption-service.js';
import { inputValidationService } from '../core/validation/input-validation-service.js';
import { secureSessionService } from '../core/auth/secure-session-service.js';
import { securityAuditService } from '../features/security/security-audit-service.js';
import { createRateLimit } from './rate-limiter.js';
import { logger } from '../../shared/core/src/utils/logger';

export interface SecurityMiddlewareOptions {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableCORS: boolean;
  corsOrigins: string[];
  enableInputValidation: boolean;
  enableSessionSecurity: boolean;
  enableSecurityHeaders: boolean;
}

/**
 * Comprehensive security middleware with multiple layers of protection
 */
export class SecurityMiddleware {
  private options: SecurityMiddlewareOptions;

  constructor(options: Partial<SecurityMiddlewareOptions> = {}) {
    this.options = {
      enableCSP: true,
      enableHSTS: true,
      enableCORS: true,
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
      enableInputValidation: true,
      enableSessionSecurity: true,
      enableSecurityHeaders: true,
      ...options
    };
  }

  /**
   * Get helmet configuration for security headers
   */
  getHelmetConfig() {
    const nonce = encryptionService.generateCSPNonce();
    
    return helmet({
      contentSecurityPolicy: this.options.enableCSP ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            `'nonce-${nonce}'`,
            "'strict-dynamic'",
            // Allow specific trusted domains
            "https://cdnjs.cloudflare.com",
            "https://unpkg.com"
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for some CSS frameworks
            "https://fonts.googleapis.com",
            "https://cdnjs.cloudflare.com"
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdnjs.cloudflare.com"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "blob:"
          ],
          connectSrc: [
            "'self'",
            "https://api.openai.com",
            "wss://localhost:*",
            "ws://localhost:*"
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
      } : false,
      
      hsts: this.options.enableHSTS && process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,
      
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      
      // Hide X-Powered-By header
      hidePoweredBy: true,
      
      // Prevent MIME type sniffing
      crossOriginEmbedderPolicy: false, // Disable for development
      crossOriginOpenerPolicy: false,   // Disable for development
      crossOriginResourcePolicy: false  // Disable for development
    });
  }

  /**
   * Get CORS configuration
   */
  getCorsConfig() {
    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (this.options.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token',
        'X-Request-ID'
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ],
      maxAge: 86400 // 24 hours
    });
  }

  /**
   * Input validation and sanitization middleware
   */
  inputValidationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.options.enableInputValidation) {
        return next();
      }

      try {
        // Validate and sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = inputValidationService.sanitizeQueryParams(req.body);
        }

        // Validate and sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = inputValidationService.sanitizeQueryParams(req.query as Record<string, any>);
        }

        // Validate and sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
          req.params = inputValidationService.sanitizeQueryParams(req.params);
        }

        next();
      } catch (error) {
        logger.error('Input validation failed:', { component: 'Chanuka' }, error);
        
        // Log security event
        securityAuditService.logSecurityEvent({
          eventType: 'input_validation_failure',
          severity: 'medium',
          ipAddress: this.getClientIP(req),
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          success: false,
          details: { error: (error as Error).message }
        });

        res.status(400).json({
          error: 'Invalid input data',
          code: 'VALIDATION_ERROR'
        });
      }
    };
  }

  /**
   * Session security middleware
   */
  sessionSecurityMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.options.enableSessionSecurity) {
        return next();
      }

      try {
        // Skip session validation for public endpoints
        const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/health'];
        if (publicPaths.some(path => req.path.startsWith(path))) {
          return next();
        }

        // Validate session if present
        const sessionResult = await secureSessionService.validateSession(req);
        
        if (sessionResult.isValid && sessionResult.session) {
          // Attach user info to request
          (req as any).user = {
            id: sessionResult.session.userId,
            email: sessionResult.session.email,
            role: sessionResult.session.role
          };
          
          // Set CSRF token in response header
          res.setHeader('X-CSRF-Token', sessionResult.session.csrfToken);
        } else if (req.headers.authorization) {
          // Allow JWT token authentication as fallback
          return next();
        } else {
          // Log unauthorized access attempt
          await securityAuditService.logSecurityEvent({
            eventType: 'unauthorized_access_attempt',
            severity: 'medium',
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            resource: req.path,
            action: req.method,
            success: false,
            details: { error: sessionResult.error }
          });

          return res.status(401).json({
            error: 'Authentication required',
            code: 'UNAUTHORIZED'
          });
        }

        next();
      } catch (error) {
        logger.error('Session security middleware error:', { component: 'Chanuka' }, error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    };
  }

  /**
   * Security headers middleware
   */
  securityHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.options.enableSecurityHeaders) {
        return next();
      }

      // Generate nonce for this request
      const nonce = encryptionService.generateCSPNonce();
      res.locals.nonce = nonce;

      // Set additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Set request ID for tracking
      const requestId = encryptionService.generateSecureToken(16);
      res.setHeader('X-Request-ID', requestId);
      req.headers['x-request-id'] = requestId;

      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    };
  }

  /**
   * Request logging and monitoring middleware
   */
  requestMonitoringMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      // Log request start
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Started (ID: ${requestId})`);

      // Monitor for suspicious patterns
      const suspiciousPatterns = [
        /\.\.\//,  // Path traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /exec\(/i, // Code injection
        /eval\(/i  // Code injection
      ];

      const fullUrl = req.originalUrl || req.url;
      const requestBody = JSON.stringify(req.body || {});
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(fullUrl) || pattern.test(requestBody)) {
          await securityAuditService.logSecurityEvent({
            eventType: 'suspicious_request_pattern',
            severity: 'high',
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            resource: req.path,
            action: req.method,
            success: false,
            details: {
              pattern: pattern.toString(),
              url: fullUrl,
              body: requestBody.substring(0, 500) // Limit log size
            }
          });
          
          return res.status(400).json({
            error: 'Suspicious request detected',
            code: 'SUSPICIOUS_REQUEST'
          });
        }
      }

      // Override res.json to log response
      const originalJson = res.json;
      res.json = function(body) {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${status} (${duration}ms) (ID: ${requestId})`);
        
        // Log slow requests
        if (duration > 5000) {
          console.warn(`Slow request detected: ${req.method} ${req.path} took ${duration}ms`);
        }
        
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * API rate limiting middleware
   */
  rateLimitingMiddleware() {
    return createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  /**
   * Initialize all security middleware
   */
  initializeAll() {
    return [
      this.securityHeadersMiddleware(),
      this.getHelmetConfig(),
      this.getCorsConfig(),
      this.rateLimitingMiddleware(),
      this.requestMonitoringMiddleware(),
      this.inputValidationMiddleware(),
      this.sessionSecurityMiddleware()
    ];
  }
}

// Export configured instance
export const securityMiddleware = new SecurityMiddleware({
  enableCSP: process.env.NODE_ENV === 'production',
  enableHSTS: process.env.NODE_ENV === 'production',
  enableCORS: true,
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4200'
  ],
  enableInputValidation: true,
  enableSessionSecurity: true,
  enableSecurityHeaders: true
});






