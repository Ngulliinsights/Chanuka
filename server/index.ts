import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { setupSystemRoutes } from './routes/system.js';
import { setupBillRoutes } from './routes/bills.js';
import { setupSponsorshipRoutes } from './routes/sponsorship.js';
import { router as analysisRouter } from './routes/analysis.js';
import { setupSponsorRoutes } from './routes/sponsors.js';
import { router as authRouter } from './routes/auth.js';
import { setupUserRoutes } from './routes/users.js';
import { setupVerificationRoutes } from './routes/verification.js';
import { setupHealthRoutes } from './routes/health.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Create routers for each route group
const systemRouter = express.Router();
const billsRouter = express.Router();
const sponsorshipRouter = express.Router();
const sponsorsRouter = express.Router();
const usersRouter = express.Router();
const verificationRouter = express.Router();
const healthRouter = express.Router();

// Setup routes using setup functions
setupSystemRoutes(systemRouter);
setupBillRoutes(billsRouter);
setupSponsorshipRoutes(sponsorshipRouter);
setupSponsorRoutes(sponsorsRouter);
setupUserRoutes(usersRouter);
setupVerificationRoutes(verificationRouter);
setupHealthRoutes(healthRouter);

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
      verification: "/api/verification"
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

// Serve static files from client dist directory
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  }
});

// Error handling
app.use(errorHandler);

// Test database connection
async function testConnection() {
  try {
    await db.execute('SELECT 1');
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  testConnection();
});