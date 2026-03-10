import 'dotenv/config';

import { config } from '@server/config/index';
import { router as authRouter } from '@server/infrastructure/auth/auth';
import { sessionCleanupService } from '@server/infrastructure/auth/session-cleanup';
import { schemaValidationService } from '@server/infrastructure/validation/schema-validation-service';
import { router as adminRouter } from '@server/features/admin/application/admin.routes';
import { router as externalApiDashboardRouter } from '@server/features/admin/application/external-api-dashboard.routes';
import { router as externalApiManagementRouter } from '@server/features/admin/application/external-api-dashboard.routes';
import { router as systemRouter } from '@server/features/admin/application/system.routes';
import { analysisRouter } from '@server/features/analysis/analysis.routes';
import analyticsRouter from '@server/features/analytics/application/analytics.routes';
import { argumentIntelligenceRouter } from '@server/features/argument-intelligence/argument-intelligence-router';
import { billTrackingRouter } from '@server/features/bills/presentation/http/bill-tracking.routes';
import { router as billsRouter } from '@server/features/bills/presentation/http/bills.routes';
import { router as sponsorshipRouter } from '@server/features/bills/presentation/http/sponsorship.routes';
import { translationRouter } from '@server/features/bills/presentation/http/translation.routes';
import { actionPromptsRouter } from '@server/features/bills/presentation/http/action-prompts.routes';
import { router as communityRouter } from '@server/features/community/community';
import { constitutionalAnalysisRouter } from '@server/features/constitutional-analysis/constitutional-analysis-router';
import coverageRouter from '@server/features/bills/presentation/http/coverage-routes';
import { default as pretextDetectionRouter } from '@server/features/pretext-detection/application/pretext-detection.routes';
import { router as privacyRouter } from '@server/features/privacy/application/privacy.routes';
import { privacySchedulerService } from '@server/features/privacy/application/privacy-scheduler';
import featureFlagRouter from '@server/features/feature-flags/application/routes';
import { router as recommendationRouter } from '@server/features/recommendation/RecommendationController';
import { recommendationRouter as newRecommendationRouter } from '@server/features/recommendation';
import { router as searchRouter } from '@server/features/search/SearchController';
import { router as sponsorsRouter } from '@server/features/sponsors/sponsors.routes';
import { router as usersRouter } from '@server/features/users/application/profile';
import { router as verificationRouter } from '@server/features/users/application/verification';
import { router as electoralAccountabilityRoutes } from '@server/features/electoral-accountability/application/electoral-accountability.routes';
import governmentDataRoutes from '@server/features/government-data/presentation/routes';

import { cacheCoordinator } from '@server/infrastructure/cache';

import { notificationSchedulerService, notificationRoutes as notificationsRouter, alertPreferenceRoutes } from '@server/features/notifications';
import { configureAppMiddleware } from '@server/middleware/app-middleware';
import { standardRateLimits } from '@server/middleware/rate-limiter';
import { createUnifiedErrorMiddleware, asyncHandler } from '@server/middleware/error-management';
import { securityMiddleware } from '@server/middleware/security.middleware';
import { webSocketService } from '@server/utils/missing-modules-fallback';
import { setupVite } from '@server/vite';
import { logger } from '@server/infrastructure/observability';
import { pool } from '@server/infrastructure/database';
import crypto from 'crypto';
import express, { Express, NextFunction, Request, Response } from 'express';
import { createServer, Server } from 'http';

// Diagnostic logging at startup for debugging environment configuration
logger.info('🔍 DIAGNOSTIC: Server startup initiated');
logger.info({
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET' : 'NOT SET',
  KEY_DERIVATION_SALT: process.env.KEY_DERIVATION_SALT ? 'SET' : 'NOT SET',
}, '🔍 DIAGNOSTIC: Environment variables check:');

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
  logger.info({ environment: env } as LogContext, 'Performance monitoring initialized');
};

// Application instance with proper typing
export const app: Express = express();
const PORT = config.server.port;
const isDevelopment = config.server.nodeEnv === 'development';

// Configure middleware
configureAppMiddleware(app);

// Apply security middleware globally
app.use(securityMiddleware.create({
  validateInput: true,
  sanitizeOutput: true,
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100
  },
  auditLog: true
}));

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
      "argument-intelligence": "/api/argument-intelligence",
      "electoral-accountability": "/api/electoral-accountability",
      "government-data": "/api/government-data"
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
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'Security status error:');
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
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'CSRF token generation error:');
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
    logger.warn({ violation: req.body, component: 'Chanuka' } as LogContext, 'CSP Violation Report:');
    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'CSP report error:');
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
    logger.warn({ vulnerabilities: req.body, component: 'Chanuka' } as LogContext, 'Vulnerability Report:');
    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'Vulnerability report error:');
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
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'Token validation error:');
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
    logger.info({ component: 'Chanuka' } as LogContext, '🔍 Triggering detailed memory analysis...');

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
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'Error in memory analysis:');
    res.status(500).json({
      error: 'Failed to perform memory analysis',
      details: errorMessage
    });
  }
});

// Security-sensitive endpoints with additional rate limiting
// Apply stricter security middleware to sensitive routes
app.use('/api/admin', securityMiddleware.create({
  validateInput: true,
  sanitizeOutput: true,
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 20 // Stricter limit for admin routes
  },
  auditLog: true
}));

app.use('/api/auth', securityMiddleware.create({
  validateInput: true,
  sanitizeOutput: true,
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 30 // Stricter limit for auth routes
  },
  auditLog: true
}));

app.use('/api/verification', securityMiddleware.create({
  validateInput: true,
  sanitizeOutput: true,
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 30 // Stricter limit for verification routes
  },
  auditLog: true
}));

app.use('/api/auth', standardRateLimits.auth, authRouter);

app.use('/api/admin', standardRateLimits.api, adminRouter);

app.use('/api/verification', standardRateLimits.auth, verificationRouter);

// API Routes registration
app.use('/api/system', systemRouter);
app.use('/api/bills', billsRouter);
app.use('/api/bills', translationRouter); // Translation and impact calculator routes
app.use('/api/bills', actionPromptsRouter); // Action prompts routes
app.use('/api/sponsorship', sponsorshipRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/bill-tracking', billTrackingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/users', usersRouter);
app.use('/api/community', communityRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/notifications/preferences', alertPreferenceRoutes);
app.use('/api/search', searchRouter);
app.use('/api/privacy', privacyRouter);

app.use('/api/external-api', externalApiManagementRouter);
app.use('/api/admin/external-api', externalApiDashboardRouter);
app.use('/api/coverage', coverageRouter);
app.use('/api/constitutional-analysis', constitutionalAnalysisRouter);
app.use('/api/argument-intelligence', argumentIntelligenceRouter);
app.use('/api/recommendation', newRecommendationRouter);
app.use('/api/pretext-detection', pretextDetectionRouter);
app.use('/api/feature-flags', featureFlagRouter);
app.use('/api/electoral-accountability', electoralAccountabilityRoutes);
app.use('/api', governmentDataRoutes);

// Unified error handling middleware (MUST BE LAST!)
// This integrates @shared/core error management with server configuration
app.use(createUnifiedErrorMiddleware());

// Database connection test
async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info({ component: 'Chanuka' } as LogContext, 'Database connection established successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'Database connection failed:');
    logger.info({ component: 'Chanuka' } as LogContext, 'Server will continue in development mode without database');
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
    logger.info({ component: 'Chanuka' } as LogContext, 'Demo mode set');
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
      logger.error({ error, component: 'Chanuka' } as LogContext, 'Server initialization failed');
      throw error;
    });

  return serverInitializationPromise;
}

async function performStartupInitialization(): Promise<void> {
  logger.info({ component: 'Chanuka' } as LogContext, '🚀 Starting Chanuka Platform...');

  try {
    const dbConnected = await databaseFallbackService.initialize();
    const healthInfo = await databaseFallbackService.getHealthInfo();

    if (dbConnected) {
      logger.info({ component: 'Chanuka' } as LogContext, '🔍 Performing database schema validation...');
      try {
        const report = await schemaValidationService.generateValidationReport();
        if (report.criticalIssues > 0) {
          logger.warn(`⚠️  Schema validation found ${report.criticalIssues} critical issues`, { component: 'Chanuka' } as LogContext);
          logger.info({ component: 'Chanuka' } as LogContext, '🔧 Attempting automatic schema repair...');
          const repairResult = await schemaValidationService.repairSchema();
          if (repairResult.success) {
            logger.info({ component: 'Chanuka' } as LogContext, '✅ Schema issues repaired successfully');
          } else {
            logger.error({ component: 'Chanuka' } as LogContext, '❌ Schema repair failed - manual intervention may be required');
          }
        } else {
          logger.info({ component: 'Chanuka' } as LogContext, '✅ Database schema validation passed');
        }
      } catch (schemaError) {
        const schemaErrorMessage = schemaError instanceof Error ? schemaError.message : String(schemaError);
        logger.warn({ error: schemaErrorMessage, component: 'Chanuka' } as LogContext, '⚠️  Schema validation failed during startup, continuing:');
      }

      logger.info({ component: 'Chanuka' } as LogContext, '✅ Platform ready with full database functionality');
    } else {
      logger.info({ component: 'Chanuka' } as LogContext, '⚠️  Platform starting in demonstration mode with sample data');
      logger.info(`💡 ${healthInfo.system.message}`, { component: 'Chanuka' } as LogContext);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, '❌ Startup initialization error:');
    logger.info({ component: 'Chanuka' } as LogContext, '🔄 Continuing with fallback mode...');
    databaseFallbackService.setDemoMode(true);
  }
}

// Initialize startup without blocking
ensureServerInitialized().catch(err => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  logger.info({ component: 'Chanuka', error: errorMessage } as LogContext, 'Startup initialization error (non-blocking):');
  databaseFallbackService.setDemoMode(true);
});

const server: Server = createServer(app);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`, { component: 'Chanuka' } as LogContext);

  try {
    logger.info({ component: 'Chanuka' } as LogContext, '🛑 Stopping new connections...');
    logger.info({ component: 'Chanuka' } as LogContext, '🧹 Cleaning up services...');

    const wsService = webSocketService as WebSocketServiceExtended;

    const cleanupTasks = [
      { name: 'privacy scheduler', fn: async () => { privacySchedulerService.stop(); privacySchedulerService.destroy(); } },
      { name: 'session cleanup', fn: async () => { sessionCleanupService.stop(); } },

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

    logger.info({ component: 'Chanuka' } as LogContext, '✅ All services cleaned up');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'Error during graceful shutdown:');
  }

  server.close((err) => {
    if (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, 'Error closing server:');
      process.exit(1);
    }
    logger.info({ component: 'Chanuka' } as LogContext, 'Server closed successfully');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error({ component: 'Chanuka' } as LogContext, 'Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Process signal handlers
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error({ error: error.message, stack: error.stack, component: 'Chanuka' } as LogContext, 'Uncaught Exception:');
  void gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error({ error: error.message, stack: error.stack, component: 'Chanuka' } as LogContext, 'Unhandled Rejection:');
  void gracefulShutdown('UNHANDLED_REJECTION');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use. Please try a different port or stop the existing process.`, { component: 'Chanuka' } as LogContext);
    logger.info({ component: 'Chanuka' } as LogContext, `💡 You can try: PORT=4201 npm run dev`);
  } else {
    logger.error({ error: error.message, component: 'Chanuka' } as LogContext, '❌ Server error:');
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
      logger.info({ component: 'Chanuka' } as LogContext, '✅ Frontend serving configured successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage, component: 'Chanuka' } as LogContext, '❌ Failed to setup frontend serving:');

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