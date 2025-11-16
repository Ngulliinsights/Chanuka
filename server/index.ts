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
import { database as db } from '../shared/database/connection.js';
import { config } from './config/index.js';

// Feature Routes
import { router as systemRouter } from './features/admin/system.js';
import { router as billsRouter } from './features/bills/presentation/bills-router.js';
import { router as sponsorshipRouter } from './features/bills/presentation/sponsorship.routes.js';
import { realTimeTrackingRouter } from './features/bills/index.js';
import { analysisRouter } from './features/analysis/presentation/analysis.routes.js';
import { billTrackingRouter } from './features/bills/presentation/bill-tracking.routes.js';
import analyticsRouter from './features/analytics/analytics.js';
import { sponsorsRouter } from './features/sponsors/presentation/sponsors.routes.js';
import { router as authRouter } from './core/auth/auth.js';
// Fixed: Use profile router as users router since there's no dedicated users router
import { router as usersRouter } from './features/users/application/profile.js';
import { router as verificationRouter } from './features/users/application/verification.js';
import { router as communityRouter } from './features/community/community.js';
import { notificationRoutes as notificationsRouter } from './infrastructure/notifications/index.js';
import { router as searchRouter } from './features/search/presentation/SearchController.js';
import { router as profileRouter } from './features/users/application/profile.js';
import { router as privacyRouter } from './features/privacy/privacy-routes.js';
import { router as adminRouter } from './features/admin/admin.js';
import { router as cacheRouter } from './infrastructure/cache/cache.js';
import { cacheCoordinator } from './infrastructure/cache/index.js';
import { router as externalApiManagementRouter } from './infrastructure/monitoring/external-api-management.js';
import { router as externalApiDashboardRouter } from './features/admin/external-api-dashboard.js';
import coverageRouter from './features/coverage/coverage-routes.js';
import { constitutionalAnalysisRouter } from './features/constitutional-analysis/presentation/constitutional-analysis-router.js';
import { argumentIntelligenceRouter } from './features/argument-intelligence/presentation/argument-intelligence-router.js';

// Middleware imports
import { migratedApiRateLimit } from './middleware/migration-wrapper.js';
import { enhancedSecurityService } from './features/security/enhanced-security-service.js';
import { SecuritySchemas, createValidationMiddleware } from './core/validation/security-schemas.js';

// Infrastructure Services
import { auditMiddleware } from './infrastructure/monitoring/audit-log.js';
// Fixed: Import the correct export (performanceMonitor, not performanceMiddleware)
import { performanceMonitor } from './infrastructure/monitoring/performance-monitor.js';

// Create performance middleware from performanceMonitor
const performanceMiddleware = (req: any, res: any, next: any) => {
  const operationId = performanceMonitor.startOperation('http', `${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent')
  });
  
  res.on('finish', () => {
    performanceMonitor.endOperation(operationId, res.statusCode < 400, undefined, {
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime
    });
  });
  
  next();
};
import { setupVite } from './vite.js';
import { databaseFallbackService } from "./infrastructure/database/database-fallback.js";
import { webSocketService } from './infrastructure/websocket.js';
import { notificationSchedulerService } from './infrastructure/notifications/index.js';
import { monitoringScheduler } from './infrastructure/monitoring/monitoring-scheduler.js';
import { sessionCleanupService } from './core/auth/session-cleanup.js';
import { securityMonitoringService } from './features/security/security-monitoring-service.js';
import { privacySchedulerService } from './features/privacy/privacy-scheduler.js';

// Unified utilities
import { logger, Performance, ApiResponse } from '../shared/core/index.js';

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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: config.security.contentSecurityPolicy.defaultSrc,
        styleSrc: config.security.contentSecurityPolicy.styleSrc,
        fontSrc: config.security.contentSecurityPolicy.fontSrc,
        imgSrc: config.security.contentSecurityPolicy.imgSrc,
        scriptSrc: isDevelopment
          ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"]
          : config.security.contentSecurityPolicy.scriptSrc,
        connectSrc: isDevelopment
          ? ["'self'", "ws:", "wss:", `ws://localhost:${PORT}`, `ws://localhost:${PORT + 1}`, `http://localhost:${PORT}`, `http://localhost:${PORT + 1}`, "ws://localhost:4201", "http://localhost:4201"]
          : config.security.contentSecurityPolicy.connectSrc,
        objectSrc: config.security.contentSecurityPolicy.objectSrc,
        frameAncestors: config.security.contentSecurityPolicy.frameAncestors,
        upgradeInsecureRequests: config.security.contentSecurityPolicy.upgradeInsecureRequests ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
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
    const userId = (req as any).user?.id;
    const sessionId = (req as any).sessionID;
    const token = enhancedSecurityService.generateCSRFToken(userId, sessionId);
    
    res.json({
      success: true,
      data: { token },
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

// API Routes registration
app.use('/api/system', systemRouter);
app.use('/api/bills', billsRouter);
app.use('/api/sponsorship', sponsorshipRouter);
app.use('/api/real-time', realTimeTrackingRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/bill-tracking', billTrackingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/community', communityRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/profile', profileRouter);
app.use('/api/privacy', privacyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/external-api', externalApiManagementRouter);
app.use('/api/admin/external-api', externalApiDashboardRouter);
app.use('/api/coverage', coverageRouter);
app.use('/api/constitutional-analysis', constitutionalAnalysisRouter);
app.use('/api/argument-intelligence', argumentIntelligenceRouter);

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
    await db.execute('SELECT 1');
    logger.info('Database connection established successfully', { component: 'Chanuka' } as LogContext);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Database connection failed:', { error: errorMessage, component: 'Chanuka' } as LogContext);
    logger.info('Server will continue in development mode without database', { component: 'Chanuka' } as LogContext);
  }
}

// Startup initialization with proper state management
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;

async function startupInitialization(): Promise<void> {
  if (initializationInProgress) {
    return initializationPromise!;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationInProgress = true;
  initializationPromise = performStartupInitialization();

  try {
    await initializationPromise;
  } finally {
    initializationInProgress = false;
  }
}

async function performStartupInitialization(): Promise<void> {
  logger.info('🚀 Starting Chanuka Platform...', { component: 'Chanuka' } as LogContext);

  try {
    const dbConnected = await databaseFallbackService.initialize();
    const healthInfo = await databaseFallbackService.getHealthInfo();

    if (dbConnected) {
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
startupInitialization().catch(err => {
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
      const { closeVite } = await import('./vite.js');
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
        console.error(`❌ Failed to initialize ${service.name}:`, error);
      }
    }

    // Setup frontend serving
    try {
      if (isDevelopment) {
        await setupVite(app, server);
        logger.info('✅ Vite development server integrated successfully', { component: 'Chanuka' } as LogContext);
      } else {
        const { serveStatic } = await import('./vite.js');
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