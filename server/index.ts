import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { db } from './db.js';
import { router as systemRouter } from './routes/system.js';
import { router as billsRouter } from './routes/bills.js';
import { router as sponsorshipRouter } from './routes/sponsorship.js';
import { router as analysisRouter } from './routes/analysis.js';
import { router as sponsorsRouter } from './routes/sponsors.js';
import { router as authRouter } from './routes/auth.js';
import { router as usersRouter } from './routes/users.js';
import { router as verificationRouter } from './routes/verification.js';
import { router as healthRouter } from './routes/health.js';
import { router as communityRouter } from './routes/community.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { setupVite } from './vite.js';
import { initializeDatabase, validateDatabaseHealth } from "./utils/db-init.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000');

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// All routers are now imported directly - no setup needed

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: "Chanuka Legislative Transparency Platform API",
    version: "1.0.0",
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
      community: "/api/community"
    }
  });
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

// Error handling
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

// Initialize database on startup
let databaseStatus = { connected: false, initialized: false };

async function startupInitialization() {
  console.log("🚀 Starting Chanuka Platform...");

  try {
    const dbConnected = await initializeDatabase();
    const healthCheck = await validateDatabaseHealth();

    databaseStatus = {
      connected: dbConnected,
      initialized: healthCheck.tablesExist
    };

    if (dbConnected && healthCheck.tablesExist) {
      console.log("✅ Platform ready with full database functionality");
    } else {
      console.log("⚠️  Platform starting in demonstration mode with sample data");
    }
  } catch (error) {
    console.error("❌ Startup initialization error:", error);
    console.log("🔄 Continuing with fallback mode...");
  }
}

// Run initialization without blocking
startupInitialization().catch(err => {
  console.log('Startup initialization error (non-blocking):', err.message);
});

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);

  // Setup Vite development server integration
  try {
    await setupVite(app, server);
    console.log('Vite development server integrated successfully');
  } catch (error) {
    console.error('Failed to setup Vite:', error);
  }

  testConnection();
});