import 'dotenv/config';

import { config } from '@server/config/index';
import { router as authRouter } from '@server/infrastructure/core/auth/auth';
import { sessionCleanupService } from '@server/infrastructure/core/auth/session-cleanup';
import { schemaValidationService } from '@server/infrastructure/core/validation/schema-validation-service';
import { router as adminRouter } from '@server/features/admin/admin';
import { router as externalApiDashboardRouter } from '@server/features/admin/external-api-dashboard';
import { router as externalApiManagementRouter } from '@server/features/admin/external-api-dashboard';
import { router as systemRouter } from '@server/features/admin/system';
import { analysisRouter } from '@server/features/analysis/analysis.routes';
import analyticsRouter from '@server/features/analytics/analytics';
import { argumentIntelligenceRouter } from '@server/features/argument-intelligence/argument-intelligence-router';
import { billTrackingRouter } from '@server/features/bills/bill-tracking.routes';
import { router as billsRouter } from '@server/features/bills/bills-router';
import { router as sponsorshipRouter } from '@server/features/bills/sponsorship.routes';
import { router as communityRouter } from '@server/features/community/community';
import { constitutionalAnalysisRouter } from '@server/features/constitutional-analysis/constitutional-analysis-router';
import coverageRouter from '@server/features/coverage/coverage-routes';
import { router as privacyRouter } from '@server/features/privacy/privacy-routes';
import { privacySchedulerService } from '@server/features/privacy/privacy-scheduler';
import { router as recommendationRouter } from '@server/features/recommendation/RecommendationController';
import { router as searchRouter } from '@server/features/search/SearchController';
import { sponsorsRouter } from '@server/features/sponsors/sponsors.routes';
import { router as usersRouter } from '@server/features/users/application/profile';
import { router as verificationRouter } from '@server/features/users/application/verification';
import { cacheManagementRoutes as cacheRouter } from '@server/infrastructure/cache/cache-management.routes';
import { cacheCoordinator } from '@shared/core/caching';
import { monitoringScheduler } from '@server/infrastructure/monitoring/monitoring-scheduler';
import { notificationSchedulerService } from '@server/infrastructure/notifications/notification-scheduler';
import { router as notificationsRouter } from '@server/infrastructure/notifications/notifications';
import { configureAppMiddleware } from '@server/middleware/app-middleware';
import { migratedApiRateLimit } from '@server/middleware/migration-wrapper';
import { createUnifiedErrorMiddleware, asyncHandler } from '@server/middleware/error-management';
import { webSocketService } from '@server/utils/missing-modules-fallback';
import { setupVite } from '@server/vite';
import { logger } from '@server/infrastructure/observability';
import { pool } from '@server/infrastructure/database';
import crypto from 'crypto';
import express, { Express, NextFunction, Request, Response } from 'express';
import { createServer, Server } from 'http';

// Diagnostic logging at startup for debugging environment configuration
logger.info('🔍 DIAGNOSTIC: Server startup initiated');
logger.info('🔍 DIAGNOSTIC: Environment variables check:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET' : 'NOT SET',
  KEY_DERIVATION_SALT: process.env.KEY_DERIVATION_SALT ? 'SET' : 'NOT SET',
});

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
  [key: string]: unknown;
}

// Database Fallback Service Interface
interface DatabaseFallbackService {
  initialize(): Promise<boolean>;
  getHealthInfo(): Promise<{ system: { message: string } }>;
  setDemoMode(enabled: boolean): void;
}

// Enhanced WebSocket Service Interface
interface WebSocketServiceExtended {
  emit(event: string, data: unknown): void;
  broadcast(event: string, data: unknown): void;
  initialize?(server: Server): void;
  shutdown?(): Promise<void>;
  getMemoryAnalysis?(): unknown;
}

// Simple monitoring initialization
const initializeMonitoring = (env: string): void => {
  logger.info('Performance monitoring initialized', { environment: env } as LogContext);
};

// Application instance with proper typing
export const app: Express = express();
const PORT = config.server.port;
const isDevelopment = config.server.nodeEnv === 'development';

// Configure middleware
configureAppMiddleware(app);

// Root API endpoint
app.get('/api', (_req: Request, res: Response) => {
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
    // Mock security stats for development (replace with actual service when available)
    const securityStats = {
      status: 'active',
      lastCheck: new Date().toISOString(),
      threats: 0,
      blockedRequests: 0
    };

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
    const token = crypto.randomBytes(32).toString('hex');

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
    res.json({
      success: true,
      valid: false,
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

    const wsService = webSocketService as WebSocketServiceExtended;
    const wsAnalysis = wsService.getMemoryAnalysis ? wsService.getMemoryAnalysis() : { status: 'unavailable' };
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
app.use('/api/auth', migratedApiRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  skipSuccessfulRequests: true
}), authRouter);

app.use('/api/admin', migratedApiRateLimit({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
  skipSuccessfulRequests: false
}), adminRouter);

app.use('/api/verification', migratedApiRateLimit({
  windowMs: 10 * 60 * 1000,
  maxRequests: 3,
  skipSuccessfulRequests: true
}), verificationRouter);

// API Routes registration
app.use('/api/system', systemRouter);
app.use('/api/bills', billsRouter);
app.use('/api/sponsorship', sponsorshipRouter);
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

// Unified error handling middleware (MUST BE LAST!)
// This integrates @shared/core error management with server configuration
app.use(createUnifiedErrorMiddleware());

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

// Mock database fallback service for development
const createMockDatabaseFallbackService = (): DatabaseFallbackService => ({
  async initialize(): Promise<boolean> {
    try {
      await testConnection();
      return true;
    } catch {
      return false;
    }
  },
  async getHealthInfo() {
    return {
      system: {
        message: 'Running in development mode with mock data'
      }
    };
  },
  setDemoMode(_enabled: boolean): void {
    logger.info('Demo mode set', { component: 'Chanuka' } as LogContext);
  }
});

const databaseFallbackService = createMockDatabaseFallbackService();

// Startup initialization with proper state management
let serverIsInitialized = false;
let serverInitializationPromise: Promise<void> | null = null;

async function ensureServerInitialized(): Promise<void> {
  if (serverIsInitialized) {
    return;
  }

  if (serverInitializationPromise) {
    return serverInitializationPromise;
  }

  serverInitializationPromise = performStartupInitialization()
    .then(() => {
      serverIsInitialized = true;
    })
    .catch(error => {
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
      logger.info(`💡 ${healthInfo.system.message}`, { component: 'Chanuka' } as LogContext);
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
  logger.info(`\n${signal} received. Starting graceful shutdown...`, { component: 'Chanuka' } as LogContext);

  try {
    logger.info('🛑 Stopping new connections...', { component: 'Chanuka' } as LogContext);
    logger.info('🧹 Cleaning up services...', { component: 'Chanuka' } as LogContext);

    const wsService = webSocketService as WebSocketServiceExtended;

    const cleanupTasks = [
      { name: 'privacy scheduler', fn: async () => { privacySchedulerService.stop(); privacySchedulerService.destroy(); } },
      { name: 'session cleanup', fn: async () => { sessionCleanupService.stop(); } },
      { name: 'monitoring scheduler', fn: async () => { monitoringScheduler.stop(); } },
      { name: 'notification scheduler', fn: async () => { notificationSchedulerService.cleanup(); } },
      { name: 'cache coordinator', fn: async () => { cacheCoordinator.stop(); } },
      { name: 'WebSocket service', fn: async () => { if (wsService.shutdown) await wsService.shutdown(); } },
    ];

    for (const task of cleanupTasks) {
      try {
        await task.fn();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error stopping ${task.name}:`, { error: errorMessage, component: 'Chanuka' } as LogContext);
      }
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

  setTimeout(() => {
    logger.error('Forced shutdown after timeout', { component: 'Chanuka' } as LogContext);
    process.exit(1);
  }, 10000);
};

// Process signal handlers
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack, component: 'Chanuka' } as LogContext);
  void gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled Rejection:', { error: error.message, stack: error.stack, component: 'Chanuka' } as LogContext);
  void gracefulShutdown('UNHANDLED_REJECTION');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use. Please try a different port or stop the existing process.`, { component: 'Chanuka' } as LogContext);
    logger.info(`💡 You can try: PORT=4201 npm run dev`, { component: 'Chanuka' } as LogContext);
  } else {
    logger.error('❌ Server error:', { error: error.message, component: 'Chanuka' } as LogContext);
  }
  process.exit(1);
});

// Server startup
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.server.port, config.server.host, async () => {
    logger.info(`Server running on http://${config.server.host}:${config.server.port}`, { component: 'Chanuka' } as LogContext);

    const wsService = webSocketService as WebSocketServiceExtended;

    const serviceInitializers = [
      { name: 'Performance monitoring', init: () => { initializeMonitoring(config.server.nodeEnv); } },
      { name: 'WebSocket service', init: () => { if (wsService.initialize) wsService.initialize(server); } },
      { name: 'Notification scheduler', init: () => notificationSchedulerService.initialize() },
      { name: 'Monitoring scheduler', init: () => monitoringScheduler.initialize() },
      { name: 'Session cleanup service', init: () => { sessionCleanupService.start(60); } },
      { name: 'Privacy scheduler service', init: async () => { await privacySchedulerService.initialize(); privacySchedulerService.start(); } },
      { name: 'Cache coordinator', init: () => { cacheCoordinator.start(); } }
    ];

    for (const service of serviceInitializers) {
      try {
        await service.init();
        logger.info(`✅ ${service.name} initialized`, { component: 'Chanuka' } as LogContext);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`⚠️  ${service.name} initialization failed: ${errorMessage}`, { component: 'Chanuka' } as LogContext);
      }
    }

    try {
      setupVite(app);
      logger.info('✅ Frontend serving configured successfully', { component: 'Chanuka' } as LogContext);
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

    await testConnection();
  });
} else {
  (async () => {
    try {
      await testConnection();
    } catch {
      // Swallow errors in test environment
    }
  })();
}