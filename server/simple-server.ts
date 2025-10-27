#!/usr/bin/env tsx
/**
 * Simple Server Startup
 * Minimal server to test database connectivity and basic functionality
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import helmet from 'helmet';
import { database as db } from '../shared/database/connection.js';
import { config } from './config/index.js';
import { logger } from '../shared/core/index.js';

const app = express();
const PORT = config.server.port;
const isDevelopment = config.server.nodeEnv === 'development';

console.log('🚀 Starting Chanuka Platform (Simple Mode)...');
console.log(`📊 Environment: ${config.server.nodeEnv}`);
console.log(`🔌 Port: ${PORT}`);

// Security middleware
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
          ? ["'self'", "ws:", "wss:", `ws://localhost:${PORT}`, `http://localhost:${PORT}`]
          : config.security.contentSecurityPolicy.connectSrc,
        objectSrc: config.security.contentSecurityPolicy.objectSrc,
        upgradeInsecureRequests: config.security.contentSecurityPolicy.upgradeInsecureRequests ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = isDevelopment
      ? [
          `http://localhost:${PORT}`,
          `http://127.0.0.1:${PORT}`,
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: "Chanuka Legislative Transparency Platform API",
    version: "1.0.0",
    environment: config.server.nodeEnv,
    status: "running",
    database: "connected",
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await db.execute('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
      database: 'connected',
      port: PORT
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Frontend health check
app.get('/api/frontend-health', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    serving_mode: isDevelopment ? 'development' : 'production',
    cors: {
      enabled: true,
      origin: req.headers.origin || 'no-origin',
      credentials: config.cors.credentials
    }
  });
});

// Database test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    // Test basic table queries
    const userCount = await db.execute('SELECT COUNT(*) as count FROM users');
    const billCount = await db.execute('SELECT COUNT(*) as count FROM bills');
    const sessionCount = await db.execute('SELECT COUNT(*) as count FROM sessions');
    
    res.json({
      status: 'success',
      tables: {
        users: userCount[0]?.count || 0,
        bills: billCount[0]?.count || 0,
        sessions: sessionCount[0]?.count || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Serve static files in production
if (!isDevelopment) {
  app.use(express.static('dist/public'));
  
  // Catch-all handler for SPA
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
  });
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Request error:', error);
  
  const statusCode = error.statusCode || error.status || 500;
  res.status(statusCode).json({
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
async function testConnection() {
  try {
    await db.execute('SELECT 1');
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

const server = createServer(app);

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      console.error('Error closing server:', err);
      process.exit(1);
    }
    console.log('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  
  // Test database connection
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    console.log('🎉 Chanuka Platform is ready!');
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  } else {
    console.log('⚠️  Server started but database connection failed');
    console.log('🔧 Check your DATABASE_URL and database status');
  }
});

export { app, server };