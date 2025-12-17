// Diagnostic logging at startup for debugging environment configuration
console.log('🔍 DIAGNOSTIC: Server startup initiated');
console.log('🔍 DIAGNOSTIC: Environment variables check:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET' : 'NOT SET',
  KEY_DERIVATION_SALT: process.env.KEY_DERIVATION_SALT ? 'SET' : 'NOT SET',
});

import 'dotenv/config';
import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import { createServer, Server } from 'http';
import helmet from 'helmet';
import { pool } from '@shared/database';
// config.d is not needed at runtime

// Feature Routes
import { router as systemRouter } from '@server/features/admin/system';
import { router as billsRouter } from '@server/features/bills/presentation/bills-router';
import { router as sponsorshipRouter } from '@server/features/bills/presentation/sponsorship.routes';
import { realTimeTrackingRouter } from '@server/features/bills';
import { analysisRouter } from '@server/features/analysis/presentation/analysis.routes';
import { billTrackingRouter } from '@server/features/bills/presentation/bill-tracking.routes';
import analyticsRouter from '@server/features/analytics/analytics';
import { sponsorsRouter } from '@server/features/sponsors/presentation/sponsors.routes';
import { router as authRouter } from '@server/core/auth/auth';
import { router as usersRouter } from '@server/features/users/application/profile';
import { router as verificationRouter } from '@server/features/users/application/verification';
import { router as communityRouter } from '@server/features/community/community';
// import { notificationRoutes as notificationsRouter } from '../client/src/core/api/notifications';
// Notifications handled via features
import { router as searchRouter } from '@server/features/search/presentation/SearchController';
import { router as privacyRouter } from '@server/features/privacy/privacy-routes';
import { router as adminRouter } from '@server/features/admin/admin';
import { router as externalApiDashboardRouter } from '@server/features/admin/external-api-dashboard';
import coverageRouter from '@server/features/coverage/coverage-routes';
import { constitutionalAnalysisRouter } from '@server/features/constitutional-analysis/presentation/constitutional-analysis-router';
import { argumentIntelligenceRouter } from '@server/features/argument-intelligence/presentation/argument-intelligence-router';
import { router as recommendationRouter } from '@server/features/recommendation/presentation/RecommendationController';

// Middleware imports
import { migratedApiRateLimit } from '@server/middleware/migration-wrapper';
import { enhancedSecurityService } from '@server/features/security/enhanced-security-service';
import { SecuritySchemas, createValidationMiddleware } from '@server/core/validation/security-schemas';
import { commandInjectionPrevention, fileUploadSecurity } from '@server/middleware/command-injection-prevention';

// Infrastructure Services
import { auditMiddleware } from '@server/infrastructure/monitoring/audit-log';
import { performanceMonitor } from '@server/infrastructure/monitoring';

// Create performance middleware from performanceMonitor
const performanceMiddleware = (req: any, res: any, next: any) => {
  const operationId = performanceMonitor.startOperation?.('http', `${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent')
  });

  res.on('finish', () => {
    performanceMonitor.endOperation?.(operationId, res.statusCode < 400, undefined, {
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime
    });
  });

  next();
};
import { databaseFallbackService } from '@server/infrastructure/database/database-fallback';
import { sessionCleanupService } from '@server/core/auth/session-cleanup';
import { securityMonitoringService } from '@server/features/security/security-monitoring-service';
import { privacySchedulerService } from '@server/features/privacy/privacy-scheduler';
import { schemaValidationService } from '@server/core/validation/schema-validation-service';

// Unified utilities
import { logger, Performance, ApiResponse } from '@shared/core';

// Type definitions for better error handling
interface AppError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
  type?: string;
}

interface LogContext {
  component?: string;
  error?: string;
  [key: string]: any;
}

// Simple monitoring initialization
const initializeMonitoring = (env: string): void => {
  logger.info('Performance monitoring initialized', { environment: env } as LogContext);
};

// Application instance with proper typing
export const app: Express = express();
const PORT = config.server.port;
const isDevelopment = config.server.nodeEnv === 'development';

// Error handler middleware with proper typing
const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Request error:', { error: err.message, path: req.path, component: 'Chanuka' } as LogContext);

  const statusCode = err.statusCode || err.status || 500;
  const response = ApiResponse.error(
    err.message || 'Internal server error',
    err.code || 'INTERNAL_ERROR',
    statusCode
  );

  res.status(statusCode).json(response);
};

// Request logger middleware with performance tracking
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const timer = Performance.startTimer(`${req.method} ${req.path}`);

  res.on('finish', () => {
    const duration = timer.end();
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      component: 'Chanuka'
    } as LogContext);
  });

  next();
};

// Security monitoring middleware
const securityMonitoringMiddleware = {
  initializeAll: () => (req: Request, res: Response, next: NextFunction): void => {
    logger.debug('Security monitoring', {
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      component: 'Chanuka'
    } as LogContext);
    next();
  }
};

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
  verify: (req, res, buf) => {
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
  verify: (req, res, buf) => {
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

// Request monitoring and logging pipeline
app.use(requestLogger);
app.use(performanceMiddleware);
app.use(migratedApiRateLimit);
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

// Root API endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: "Chanuka Legislative Transparency Platform API",
    version: "1.0.0",
    environment: config.server.nodeEnv,
    frontend_serving: isDevelopment ? 'vite_dev_server' : 'static_files',
    endpoints: {
      bills: "/api/bills",
      sponsors: "/api/sponsors",
      analysis: "/api/analysis",
      sponsorship: "/api/sponsorship",
      system: "/api/system",
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
      verification: "/api/verification",
      community: "/api/community",
      "constitutional-analysis": "/api/constitutional-analysis",
      "argument-intelligence": "/api/argument-intelligence"
    }
  });
});

// Health check endpoints
app.get('/api/frontend-health', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    serving_mode: isDevelopment ? 'development' : 'production',
    vite_integration: isDevelopment ? 'enabled' : 'disabled',
    static_serving: !isDevelopment ? 'enabled' : 'disabled',
    memory: {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsedPercent: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)}%`
    },
    cors: {
      enabled: true,
      origin: req.headers.origin || 'no-origin',
      credentials: config.cors.credentials
    }
  };

  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-Request-ID');

  res.json(healthStatus);
});

app.get('/api/service-status', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Security status endpoint
app.get('/api/security/status', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    const securityStats = enhancedSecurityService.getSecurityStats();
    res.json({
      success: true,
      data: securityStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Security status error:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    res.status(500).json({
      success: false,
      error: 'Failed to get security status',
      timestamp: new Date().toISOString()
    });
  }
});

// CSRF token endpoint
app.get('/api/security/csrf-token', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    // Generate a simple CSRF token for development
    const token = require('crypto').randomBytes(32).toString('hex');

    res.json({
      success: true,
      token: token,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('CSRF token generation error:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token',
      timestamp: new Date().toISOString()
    });
  }
});

// CSP violation reporting endpoint
app.post('/api/security/csp-report', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    logger.warn('CSP Violation Report:', { violation: req.body, component: 'Chanuka' } as LogContext);
    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('CSP report error:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    res.status(500).json({
      success: false,
      error: 'Failed to process CSP report',
      timestamp: new Date().toISOString()
    });
  }
});

// Vulnerability reporting endpoint
app.post('/api/security/vulnerability-report', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    logger.warn('Vulnerability Report:', { vulnerabilities: req.body, component: 'Chanuka' } as LogContext);
    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Vulnerability report error:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    res.status(500).json({
      success: false,
      error: 'Failed to process vulnerability report',
      timestamp: new Date().toISOString()
    });
  }
});

// Auth token validation endpoint
app.post('/api/auth/validate-tokens', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    // Simple token validation for development
    res.json({
      success: true,
      valid: false, // No real auth in development
      message: 'Development mode - no authentication required',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Token validation error:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    res.status(500).json({
      success: false,
      error: 'Failed to validate tokens',
      timestamp: new Date().toISOString()
    });
  }
});

// Memory analysis endpoint for debugging
app.get('/api/debug/memory-analysis', (req: Request, res: Response) => {
  try {
    logger.info('🔍 Triggering detailed memory analysis...', { component: 'Chanuka' } as LogContext);

    const wsAnalysis = webSocketService.forceMemoryAnalysis();
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const analysis = {
      timestamp: new Date().toISOString(),
      overall: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%',
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`
      },
      webSocket: wsAnalysis
    };

    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');

    res.json(analysis);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in memory analysis:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    res.status(500).json({
      error: 'Failed to perform memory analysis',
      details: errorMessage
    });
  }
});

// Security-sensitive endpoints with additional rate limiting
app.use('/api/auth', securityRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per 15 minutes
  skipSuccessfulRequests: true
}), authRouter);

app.use('/api/admin', securityRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 admin requests per 5 minutes
  skipSuccessfulRequests: false
}), adminRouter);

app.use('/api/verification', securityRateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 3, // 3 verification attempts per 10 minutes
  skipSuccessfulRequests: true
}), verificationRouter);

// API Routes registration
app.use('/api/system', systemRouter);
app.use('/api/bills', billsRouter);
app.use('/api/sponsorship', sponsorshipRouter);
app.use('/api/real-time', realTimeTrackingRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/bill-tracking', billTrackingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/users', usersRouter);
app.use('/api/community', communityRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/privacy', privacyRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/external-api', externalApiManagementRouter);
app.use('/api/admin/external-api', externalApiDashboardRouter);
app.use('/api/coverage', coverageRouter);
app.use('/api/constitutional-analysis', constitutionalAnalysisRouter);
app.use('/api/argument-intelligence', argumentIntelligenceRouter);
app.use('/api/recommendation', recommendationRouter);

// API-specific error handling middleware
app.use('/api', (error: AppError, req: Request, res: Response, next: NextFunction) => {
  logger.error('API Error:', { error: error.message, component: 'Chanuka' } as LogContext);

  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Cross-origin request blocked',
      code: 'CORS_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      message: 'Request body contains malformed JSON',
      code: 'JSON_PARSE_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request entity too large',
      message: 'Request body exceeds size limit',
      code: 'REQUEST_TOO_LARGE',
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    return res.status(408).json({
      error: 'Request timeout',
      message: 'Request took too long to process',
      code: 'REQUEST_TIMEOUT',
      timestamp: new Date().toISOString()
    });
  }

  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack })
  });
});

// General error handling
app.use(errorHandler);

// Database connection test
async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connection established successfully', { component: 'Chanuka' } as LogContext);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Database connection failed:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    logger.info('Server will continue in development mode without database', { component: 'Chanuka' } as LogContext);
  }
}

// Startup initialization with proper state management and race condition protection
let serverIsInitialized = false;
let serverInitializationPromise: Promise<void> | null = null;

/**
 * Ensures server startup initialization runs exactly once, even with concurrent calls.
 * Uses double-check locking pattern to prevent multiple initialization sequences.
 */
async function ensureServerInitialized(): Promise<void> {
  // Fast path: already initialized
  if (serverIsInitialized) {
    return;
  }
  
  // Wait for ongoing initialization if in progress
  if (serverInitializationPromise) {
    return serverInitializationPromise;
  }
  
  // Begin initialization
  serverInitializationPromise = performStartupInitialization()
    .then(() => {
      serverIsInitialized = true;
    })
    .catch(error => {
      // Reset promise on failure but keep flag - prevents repeat attempts
      serverInitializationPromise = null;
      logger.error('Server initialization failed', { error, component: 'Chanuka' } as LogContext);
      throw error;
    });
  
  return serverInitializationPromise;
}

async function performStartupInitialization(): Promise<void> {
  logger.info('🚀 Starting Chanuka Platform...', { component: 'Chanuka' } as LogContext);

  try {
    const dbConnected = await databaseFallbackService.initialize();
    const healthInfo = await databaseFallbackService.getHealthInfo();

    if (dbConnected) {
      // Perform schema validation during startup
      logger.info('🔍 Performing database schema validation...', { component: 'Chanuka' } as LogContext);
      try {
        const report = await schemaValidationService.generateValidationReport();
        if (report.criticalIssues > 0) {
          logger.warn(`⚠️  Schema validation found ${report.criticalIssues} critical issues`, { component: 'Chanuka' } as LogContext);
          logger.info('🔧 Attempting automatic schema repair...', { component: 'Chanuka' } as LogContext);
          const repairResult = await schemaValidationService.repairSchema();
          if (repairResult.success) {
            logger.info('✅ Schema issues repaired successfully', { component: 'Chanuka' } as LogContext);
          } else {
            logger.error('❌ Schema repair failed - manual intervention may be required', { component: 'Chanuka' } as LogContext);
          }
        } else {
          logger.info('✅ Database schema validation passed', { component: 'Chanuka' } as LogContext);
        }
      } catch (schemaError) {
        const schemaErrorMessage = schemaError instanceof Error ? schemaError.message : String(schemaError);
        logger.warn('⚠️  Schema validation failed during startup, continuing:', { error: schemaErrorMessage, component: 'Chanuka' } as LogContext);
      }

      logger.info('✅ Platform ready with full database functionality', { component: 'Chanuka' } as LogContext);
    } else {
      logger.info('⚠️  Platform starting in demonstration mode with sample data', { component: 'Chanuka' } as LogContext);
      console.log(`💡 ${healthInfo.system.message}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Startup initialization error:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    logger.info('🔄 Continuing with fallback mode...', { component: 'Chanuka' } as LogContext);
    databaseFallbackService.setDemoMode(true);
  }
}

// Initialize startup without blocking
ensureServerInitialized().catch(err => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  logger.info('Startup initialization error (non-blocking):', { component: 'Chanuka', error: errorMessage } as LogContext);
  databaseFallbackService.setDemoMode(true);
});

const server: Server = createServer(app);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    logger.info('🛑 Stopping new connections...', { component: 'Chanuka' } as LogContext);
    logger.info('🧹 Cleaning up services...', { component: 'Chanuka' } as LogContext);

    // Cleanup services in reverse order of initialization
    const cleanupTasks = [
      { name: 'privacy scheduler', fn: () => { privacySchedulerService.stop(); privacySchedulerService.destroy(); } },
      { name: 'security monitoring', fn: () => securityMonitoringService.shutdown() },
      { name: 'session cleanup', fn: () => { sessionCleanupService.stop(); } },
      { name: 'monitoring scheduler', fn: () => { monitoringScheduler.stop(); } },
      { name: 'notification scheduler', fn: () => { notificationSchedulerService.cleanup(); } },
      { name: 'cache coordinator', fn: () => { cacheCoordinator.stop(); } },
      { name: 'WebSocket service', fn: () => webSocketService.shutdown() },
    ];

    for (const task of cleanupTasks) {
      try {
        await task.fn();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error stopping ${task.name}:`, { error: errorMessage, component: 'Chanuka' } as LogContext);
      }
    }

    // Close Vite dev server if running
    try {
      const { closeVite } = await import('../client/src/vite-env.d');
      await closeVite();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error closing Vite server:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    }

    logger.info('✅ All services cleaned up', { component: 'Chanuka' } as LogContext);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error during graceful shutdown:', { error: errorMessage, component: 'Chanuka' } as LogContext);
  }

  server.close((err) => {
    if (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Error closing server:', { error: errorMessage, component: 'Chanuka' } as LogContext);
      process.exit(1);
    }
    logger.info('Server closed successfully', { component: 'Chanuka' } as LogContext);
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout', { component: 'Chanuka' } as LogContext);
    process.exit(1);
  }, 10000);
};

// Process signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack, component: 'Chanuka' } as LogContext);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled Rejection:', { error: error.message, stack: error.stack, component: 'Chanuka' } as LogContext);
  gracefulShutdown('UNHANDLED_REJECTION');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please try a different port or stop the existing process.`);
    console.log(`💡 You can try: PORT=4201 npm run dev`);
  } else {
    logger.error('❌ Server error:', { error: error.message, component: 'Chanuka' } as LogContext);
  }
  process.exit(1);
});

// Server startup
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.server.port, config.server.host, async () => {
    console.log(`Server running on http://${config.server.host}:${config.server.port}`);

    await startupInitialization();

    // Service initializers with proper error handling
    const serviceInitializers = [
      { name: 'Performance monitoring', init: () => { initializeMonitoring(config.server.nodeEnv); return Promise.resolve(); } },
      { name: 'WebSocket service', init: () => { webSocketService.initialize(server); return Promise.resolve(); } },
      { name: 'Notification scheduler', init: () => notificationSchedulerService.initialize() },
      { name: 'Monitoring scheduler', init: () => monitoringScheduler.initialize() },
      { name: 'Session cleanup service', init: () => { sessionCleanupService.start(60); return Promise.resolve(); } },
      { name: 'Security monitoring service', init: () => securityMonitoringService.initialize() },
      { name: 'Privacy scheduler service', init: async () => { await privacySchedulerService.initialize(); privacySchedulerService.start(); } },
      { name: 'Cache coordinator', init: () => { cacheCoordinator.start(); return Promise.resolve(); } }
    ];

    for (const service of serviceInitializers) {
      try {
        await service.init();
        console.log(`✅ ${service.name} initialized`);
      } catch (error) {

      }
    }

    // Setup frontend serving
    try {
      if (isDevelopment) {
        await setupVite(app, server);
        logger.info('✅ Vite development server integrated successfully', { component: 'Chanuka' } as LogContext);
      } else {
        const { serveStatic } = await import('../client/src/vite-env.d');
        serveStatic(app);
        logger.info('✅ Production static file serving configured', { component: 'Chanuka' } as LogContext);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to setup frontend serving:', { error: errorMessage, component: 'Chanuka' } as LogContext);

      app.use('*', (req: Request, res: Response, next: NextFunction) => {
        if (req.originalUrl.startsWith('/api/')) {
          return next();
        }

        res.status(500).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Service Unavailable</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                .error-container { max-width: 600px; margin: 0 auto; }
                .logo { width: 64px; height: 64px; margin: 0 auto 20px; }
              </style>
            </head>
            <body>
              <div class="error-container">
                <div class="logo">📋</div>
                <h1>Service Temporarily Unavailable</h1>
                <p>The Chanuka Legislative Transparency Platform is currently experiencing technical difficulties.</p>
                <p>Please try again in a few moments.</p>
                <button onclick="window.location.reload()">Retry</button>
              </div>
            </body>
          </html>
        `);
      });
    }

    testConnection();
  });
} else {
  (async () => {
    try {
      await testConnection();
    } catch (err) {
      // Swallow errors in test environment
    }
  })();
}

