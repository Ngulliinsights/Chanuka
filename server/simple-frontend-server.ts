import express from 'express';
import { createServer } from 'http';
import { setupVite } from './vite.js';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4200;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Basic middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Basic health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API info
app.get('/api', (req, res) => {
  res.json({
    message: "Chanuka Legislative Transparency Platform API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development',
    status: 'running'
  });
});

const server = createServer(app);

// Setup frontend serving
async function startServer() {
  try {
    console.log('🚀 Starting Chanuka Platform...');
    
    if (isDevelopment) {
      console.log('📦 Setting up Vite development server...');
      await setupVite(app, server);
      console.log('✅ Vite development server ready');
    } else {
      // Serve static files in production
      const { serveStatic } = await import('./vite.js');
      serveStatic(app);
      console.log('✅ Static file serving ready');
    }

    server.listen(PORT, () => {
      console.log(`🌟 Server running on http://localhost:${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (isDevelopment) {
        console.log(`🔗 Frontend: http://localhost:${PORT}`);
        console.log(`🔗 API: http://localhost:${PORT}/api`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();

export { app };