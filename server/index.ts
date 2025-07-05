import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { router as indexRouter } from './routes/index.js';
import { router as systemRouter } from './routes/system.js';
import { setupBillRoutes } from './routes/bills.js';
import { router as sponsorshipRouter } from './routes/sponsorship.js';
import { router as analysisRouter } from './routes/analysis.js';
import { router as sponsorsRouter } from './routes/sponsors.js';
import { router as authRouter } from './routes/auth.js';
import { router as usersRouter } from './routes/users.js';
import { router as verificationRouter } from './routes/verification.js';
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

// API Routes
app.use('/api', indexRouter);
app.use('/api/system', systemRouter);
app.use('/api/bills', setupBillRoutes);
app.use('/api/sponsorship', sponsorshipRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/verification', verificationRouter);
// Create a router for health routes
const healthRouter = express.Router();
setupHealthRoutes(healthRouter);
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