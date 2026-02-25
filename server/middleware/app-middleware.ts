import { config } from '@server/config/index';
import { correlationIdMiddleware } from '@server/middleware/error-management';
import { standardRateLimits } from '@server/middleware/rate-limiter';
import { auditMiddleware, commandInjectionPrevention, enhancedSecurityService, fileUploadSecurity } from '@server/utils/missing-modules-fallback';
import { performanceMonitor } from '@server/utils/missing-modules-fallback';
import { logger } from '@server/infrastructure/observability';
import cors from 'cors';
import express, { Express,NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

// Type definitions for better error handling
interface LogContext {
  component?: string;
  error?: string;
  [key: string]: any;
}

const isDevelopment = config.server.nodeEnv === 'development';
const PORT = config.server.port;

// Request logger middleware with performance tracking
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      component: 'Chanuka'
    } as LogContext, 'Request completed');
  });

  next();
};

// Create performance middleware from performanceMonitor
const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const operationId = performanceMonitor.startOperation?.('http', `${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent')
  });

  res.on('finish', () => {
    performanceMonitor.endOperation?.(operationId, res.statusCode < 400, undefined, {
      statusCode: res.statusCode,
    });
  });

  next();
};

// Security monitoring middleware
const securityMonitoringMiddleware = {
  initializeAll: () => (req: Request, _res: Response, next: NextFunction): void => {
    logger.debug({
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      component: 'Chanuka'
    } as LogContext, 'Security monitoring');
    next();
  }
};

export function configureAppMiddleware(app: Express): void {
  // Security middleware configuration
  if (config.security.enableHelmet) {
    app.use(helmet({
      // CSP is handled per-request in Vite middleware for proper nonce support
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      // Disable other headers that might conflict
      hsts: false,
      noSniff: false,
      xssFilter: false,
      referrerPolicy: false,
    }));
  }

  // Enhanced CORS configuration with proper typing
  const corsOptions: cors.CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = isDevelopment
        ? [
          `http://localhost:${PORT}`,
          `http://127.0.0.1:${PORT}`,
          `http://0.0.0.0:${PORT}`,
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:4200',
        ]
        : config.server.frontendUrl ? [config.server.frontendUrl] : [origin];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error(`Not allowed by CORS policy: ${origin}`), false);
      }
    },
    credentials: config.cors.credentials,
    methods: config.cors.allowedMethods,
    allowedHeaders: config.cors.allowedHeaders,
    exposedHeaders: config.cors.exposedHeaders,
    maxAge: config.cors.maxAge,
    optionsSuccessStatus: 200,
    preflightContinue: false
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Body parsing middleware with robust error handling
  app.use(express.json({
    limit: '10mb',
    verify: (_req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
        throw new Error('Invalid JSON');
      }
    }
  }));

  app.use(express.urlencoded({
    extended: true,
    limit: '10mb',
    verify: (_req, res, buf) => {
      if (buf.length === 0) return;
      const str = buf.toString();
      if (str.length > 10 * 1024 * 1024) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Request entity too large' }));
        throw new Error('Request too large');
      }
    }
  }));

  // Correlation ID middleware (must be early in the chain)
  app.use(correlationIdMiddleware);

  // Request monitoring and logging pipeline
  app.use(requestLogger);
  app.use(performanceMiddleware);
  app.use(standardRateLimits.api);
  app.use(auditMiddleware);
  app.use(securityMonitoringMiddleware.initializeAll());

  // Command injection prevention middleware (strict mode for production)
  app.use(commandInjectionPrevention({
    mode: isDevelopment ? 'sanitize' : 'strict',
    whitelist: ['/api/health', '/api/frontend-health', '/api/service-status'],
    maxViolations: 10
  }));

  // File upload security middleware
  app.use(fileUploadSecurity({
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    scanContent: true
  }));

  // Enhanced security middleware
  app.use(enhancedSecurityService.csrfProtection());
  app.use(enhancedSecurityService.rateLimiting());
  app.use(enhancedSecurityService.vulnerabilityScanning());
}