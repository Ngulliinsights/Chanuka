import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import helmet from 'helmet';
import { database as db } from '../shared/database/connection.js';
// Feature Routes
import { router as systemRouter } from './features/admin/system.js';
import { router as billsRouter } from './features/bills/bills-router.js';
import { router as sponsorshipRouter } from './features/bills/sponsorship.js';
import { router as analysisRouter } from './features/analytics/analysis.js';
import { router as sponsorsRouter } from './features/bills/sponsors.js';
import { router as authRouter } from './core/auth/auth.js';
import { router as usersRouter } from './features/users/users.js';
import { router as verificationRouter } from './features/users/verification.js';
import { router as healthRouter } from './infrastructure/monitoring/health.js';
import { router as communityRouter } from './features/community/community.js';

import { notificationRoutes as notificationsRouter } from './infrastructure/notifications/index.js';
import { notificationRoutes as enhancedNotificationsRouter } from './infrastructure/notifications/index.js';
import { router as searchRouter } from './features/search/search-router.js';
import { router as profileRouter } from './features/users/profile.js';
import { router as privacyRouter } from './features/privacy/privacy-routes.js';
import governmentDataRouter from './features/government-data/routes.js';
// import { router as billTrackingRouter } from './features/bills/bill-tracking.js'; // TODO: Implement bill tracking router
import { router as adminRouter } from './features/admin/admin-router.js';
import { router as cacheRouter } from './infrastructure/cache/cache.js';
import { router as realTimeTrackingRouter } from './features/bills/real-time-tracking.js';
import { router as alertPreferencesRouter } from './features/users/alert-preferences.js';
// import engagementAnalyticsRouter from './features/analytics/engagement-analytics.js'; // TODO: Implement engagement analytics router
// import { sponsorConflictAnalysisRouter } from './features/bills/sponsor-conflict-analysis.js'; // TODO: Implement sponsor conflict analysis router
// import { votingPatternAnalysisRouter } from './features/bills/voting-pattern-analysis.js'; // TODO: Implement voting pattern analysis router
import { router as financialDisclosureRouter } from './features/analytics/financial-disclosure.js';
// import financialDisclosureIntegrationRouter from './features/analytics/financial-disclosure-integration.js'; // TODO: Implement financial disclosure integration router
// import { router as transparencyDashboardRouter } from './features/analytics/transparency-dashboard.js'; // TODO: Implement transparency dashboard router
import { router as monitoringRouter } from './infrastructure/monitoring/monitoring.js';
import { router as externalApiManagementRouter } from './infrastructure/monitoring/external-api-management.js';
import { router as externalApiDashboardRouter } from './features/admin/external-api-dashboard.js';
import securityMonitoringRouter from './features/security/security-monitoring.js';
import coverageRouter from './features/coverage/coverage-routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRateLimit } from './middleware/rate-limiter.js';
import { securityMonitoringMiddleware } from './middleware/security-monitoring-middleware.js';
// Infrastructure Services
import { auditMiddleware } from './infrastructure/monitoring/audit-log.js';
import { performanceMiddleware } from './infrastructure/monitoring/performance-monitor.js';
import { setupVite } from './vite.js';
import { initializeDatabase, validateDatabaseHealth } from "./utils/db-init.js";
import { databaseFallbackService } from "./infrastructure/database/database-fallback.js";
import { webSocketService } from './infrastructure/websocket.js';
import { billStatusMonitorService as billStatusMonitor } from './features/bills/bill-status-monitor.js';
import { notificationSchedulerService } from './infrastructure/notifications/notification-scheduler.js';
import { monitoringScheduler } from './infrastructure/monitoring/monitoring-scheduler.js';
import { sessionCleanupService } from './core/auth/session-cleanup.js';
import { searchIndexManager } from './features/search-index-manager.js';
import { securityMonitoringService } from './features/security/security-monitoring-service.js';
import { privacySchedulerService } from './features/privacy/privacy-scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '4200');
const isDevelopment = process.env.NODE_ENV !== 'production';

// Security middleware (should be early in the pipeline)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: isDevelopment 
        ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"] // Allow eval in development for HMR
        : ["'self'"],
      connectSrc: isDevelopment
        ? ["'self'", "ws:", "wss:", `ws://localhost:${PORT + 1}`] // Allow WebSocket for HMR
        : ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development compatibility
}));

// Enhanced CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = isDevelopment 
      ? [
          `http://localhost:${PORT}`,
          `http://127.0.0.1:${PORT}`,
          `http://0.0.0.0:${PORT}`,
          'http://localhost:3000', // Common React dev port
          'http://localhost:5173', // Default Vite dev port
          'http://localhost:5174', // Alternative Vite dev port
          'http://localhost:4200', // Current server port for frontend
        ]
      : process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [origin];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`Not allowed by CORS policy: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-CSRF-Token',
    'X-Request-ID',
    'X-Admin-Request',
    'If-None-Match',
    'If-Modified-Since'
  ],
  exposedHeaders: [
    'X-Total-Count', 
    'X-Page-Count',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
    'ETag',
    'Last-Modified'
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false // Pass control to the next handler
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parsing middleware with error handling
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
    // Basic validation for URL-encoded data
    if (buf.length === 0) return;
    const str = buf.toString();
    if (str.length > 10 * 1024 * 1024) { // 10MB check
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Request entity too large' }));
      throw new Error('Request too large');
    }
  }
}));

// Request logging and monitoring
app.use(requestLogger);
app.use(performanceMiddleware);
app.use(apiRateLimit);
app.use(auditMiddleware);

// Security monitoring middleware (should be early in the pipeline)
app.use(securityMonitoringMiddleware.initializeAll());

// All routers are now imported directly - no setup needed

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: "Chanuka Legislative Transparency Platform API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development',
    frontend_serving: isDevelopment ? 'vite_dev_server' : 'static_files',
    endpoints: {
      bills: "/api/bills (includes workarounds)",
      sponsors: "/api/sponsors", 
      analysis: "/api/analysis",
      sponsorship: "/api/sponsorship",
      system: "/api/system",
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
      verification: "/api/verification",
      community: "/api/community"
    }
  });
});

// Frontend serving health check
app.get('/api/frontend-health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serving_mode: isDevelopment ? 'development' : 'production',
    vite_integration: isDevelopment ? 'enabled' : 'disabled',
    static_serving: !isDevelopment ? 'enabled' : 'disabled',
    cors: {
      enabled: true,
      origin: req.headers.origin || 'no-origin',
      credentials: true
    },
    headers: {
      'user-agent': req.headers['user-agent'],
      'accept': req.headers.accept,
      'content-type': req.headers['content-type']
    }
  };

  // Set CORS headers explicitly for health check
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-Request-ID');

  res.json(healthStatus);
});

// API Routes
app.use('/api/system', systemRouter);
app.use('/api/bills', billsRouter);
app.use('/api/sponsorship', sponsorshipRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/health', healthRouter);
app.use('/api/community', communityRouter);

app.use('/api/notifications', notificationsRouter);
app.use('/api/notifications', enhancedNotificationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/profile', profileRouter);
app.use('/api/privacy', privacyRouter);
app.use('/api/government-data', governmentDataRouter);
// app.use('/api/bill-tracking', billTrackingRouter); // TODO: Implement bill tracking router
app.use('/api/admin', adminRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/real-time', realTimeTrackingRouter);
app.use('/api/alert-preferences', alertPreferencesRouter);
// app.use('/api/engagement-analytics', engagementAnalyticsRouter); // TODO: Implement engagement analytics router
// app.use('/api', sponsorConflictAnalysisRouter); // TODO: Implement sponsor conflict analysis router
// app.use('/api', votingPatternAnalysisRouter); // TODO: Implement voting pattern analysis router
app.use('/api/financial-disclosure', financialDisclosureRouter);
// app.use('/api/financial-disclosure-integration', financialDisclosureIntegrationRouter); // TODO: Implement financial disclosure integration router
// app.use('/api/transparency', transparencyDashboardRouter); // TODO: Implement transparency dashboard router
app.use('/api/monitoring', monitoringRouter);
app.use('/api/external-api', externalApiManagementRouter);
app.use('/api/admin/external-api', externalApiDashboardRouter);
app.use('/api/security', securityMonitoringRouter);
app.use('/api/coverage', coverageRouter);

// API-specific error handling middleware
app.use('/api', (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error);

  // Handle CORS errors
  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Cross-origin request blocked',
      code: 'CORS_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Handle JSON parsing errors
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      message: 'Request body contains malformed JSON',
      code: 'JSON_PARSE_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Handle request size errors
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request entity too large',
      message: 'Request body exceeds size limit',
      code: 'REQUEST_TOO_LARGE',
      timestamp: new Date().toISOString()
    });
  }

  // Handle timeout errors
  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    return res.status(408).json({
      error: 'Request timeout',
      message: 'Request took too long to process',
      code: 'REQUEST_TIMEOUT',
      timestamp: new Date().toISOString()
    });
  }

  // Default API error response
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack })
  });
});

// General error handling
app.use(errorHandler);

// Test database connection
async function testConnection() {
  try {
    await db.execute('SELECT 1');
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    console.log('Server will continue in development mode without database');
  }
}

// Initialize database with fallback support
let databaseStatus = { connected: false, initialized: false };
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;

async function startupInitialization() {
  // Prevent multiple concurrent initializations
  if (initializationInProgress) {
    return initializationPromise;
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

async function performStartupInitialization() {
  console.log("🚀 Starting Chanuka Platform...");

  try {
    // Use the new database fallback service
    const dbConnected = await databaseFallbackService.initialize();
    
    // Get comprehensive health status
    const healthInfo = await databaseFallbackService.getHealthInfo();
    
    databaseStatus = {
      connected: dbConnected,
      initialized: healthInfo.database.connected
    };

    if (dbConnected) {
      console.log("✅ Platform ready with full database functionality");
    } else {
      console.log("⚠️  Platform starting in demonstration mode with sample data");
      console.log(`💡 ${healthInfo.system.message}`);
    }
  } catch (error) {
    console.error("❌ Startup initialization error:", error);
    console.log("🔄 Continuing with fallback mode...");
    
    // Ensure demo mode is enabled on startup failure
    databaseFallbackService.setDemoMode(true);
  }
}

// Run initialization without blocking
startupInitialization().catch(err => {
  console.log('Startup initialization error (non-blocking):', err.message);
  // Ensure demo mode is enabled on startup failure
  databaseFallbackService.setDemoMode(true);
});

const server = createServer(app);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // 1. Stop accepting new connections first
    console.log('🛑 Stopping new connections...');
    
    // 2. Clean up all services in reverse order of initialization
    console.log('🧹 Cleaning up services...');
    
    // Clean up privacy scheduler
    try {
      privacySchedulerService.stop();
      privacySchedulerService.destroy();
    } catch (error) {
      console.error('Error stopping privacy scheduler:', error);
    }
    
    // Clean up security monitoring
    try {
      await securityMonitoringService.shutdown();
    } catch (error) {
      console.error('Error stopping security monitoring:', error);
    }
    
    // Clean up search index manager
    try {
      await searchIndexManager.shutdown();
    } catch (error) {
      console.error('Error stopping search index manager:', error);
    }
    
    // Clean up session cleanup service
    try {
      sessionCleanupService.stop();
    } catch (error) {
      console.error('Error stopping session cleanup:', error);
    }
    
    // Clean up monitoring scheduler
    try {
      await monitoringScheduler.shutdown();
    } catch (error) {
      console.error('Error stopping monitoring scheduler:', error);
    }
    
    // Clean up notification scheduler
    try {
      notificationSchedulerService.cleanup();
    } catch (error) {
      console.error('Error stopping notification scheduler:', error);
    }
    
    // Clean up notification services
    try {
      const { notificationService } = await import('./infrastructure/notifications/notification-service.js');
      notificationService.cleanup();
    } catch (error) {
      console.error('Error stopping notification service:', error);
    }
    
    try {
      const { enhancedNotificationService } = await import('./infrastructure/notifications/enhanced-notification.js');
      enhancedNotificationService.cleanup();
    } catch (error) {
      console.error('Error stopping enhanced notification service:', error);
    }
    
    // Clean up WebSocket service
    try {
      await webSocketService.shutdown();
    } catch (error) {
      console.error('Error stopping WebSocket service:', error);
    }
    
    // Close Vite dev server if running
    try {
      const { closeVite } = await import('./vite.js');
      await closeVite();
    } catch (error) {
      console.error('Error closing Vite server:', error);
    }
    
    console.log('✅ All services cleaned up');
    
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
  
  // Close HTTP server
  server.close((err) => {
    if (err) {
      console.error('Error closing server:', err);
      process.exit(1);
    }
    console.log('Server closed successfully');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please try a different port or stop the existing process.`);
    console.log(`💡 You can try: PORT=4201 npm run dev`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);

  // Ensure startup initialization is complete before initializing services
  await startupInitialization();

  // Initialize services in proper order with error handling
  const serviceInitializers = [
    {
      name: 'WebSocket service',
      init: () => {
        webSocketService.initialize(server);
        return Promise.resolve();
      }
    },
    {
      name: 'Bill status monitor',
      init: () => {
        // Bill status monitor is initialized automatically via constructor
        return Promise.resolve();
      }
    },
    {
      name: 'Notification scheduler',
      init: () => notificationSchedulerService.initialize()
    },
    {
      name: 'Monitoring scheduler',
      init: () => monitoringScheduler.initialize()
    },
    {
      name: 'Session cleanup service',
      init: () => {
        sessionCleanupService.start(60); // Run cleanup every 60 minutes
        return Promise.resolve();
      }
    },
    {
      name: 'Search index manager',
      init: () => searchIndexManager.initialize()
    },
    {
      name: 'Security monitoring service',
      init: () => securityMonitoringService.initialize()
    },
    {
      name: 'Privacy scheduler service',
      init: async () => {
        await privacySchedulerService.initialize();
        privacySchedulerService.start();
      }
    }
  ];

  // Initialize services sequentially to prevent race conditions
  for (const service of serviceInitializers) {
    try {
      await service.init();
      console.log(`✅ ${service.name} initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${service.name}:`, error);
      // Continue with other services even if one fails
    }
  }

  // Setup frontend serving (Vite dev server or static files)
  try {
    if (isDevelopment) {
      await setupVite(app, server);
      console.log('✅ Vite development server integrated successfully');
    } else {
      // Import serveStatic for production
      const { serveStatic } = await import('./vite.js');
      serveStatic(app);
      console.log('✅ Production static file serving configured');
    }
  } catch (error) {
    console.error('❌ Failed to setup frontend serving:', error);
    
    // Fallback error page for frontend requests
    app.use('*', (req, res, next) => {
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