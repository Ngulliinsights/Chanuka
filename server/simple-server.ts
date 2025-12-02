#!/usr/bin/env node

/**
 * Simple Server - Minimal working server for development
 * This bypasses the complex shared module dependencies
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4200'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Simple server is running'
  });
});

app.get('/api/frontend-health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serving_mode: 'development',
    message: 'Frontend health check passed'
  });
});

app.get('/api/service-status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Mock API endpoints for development
app.get('/api/bills', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        title: 'Sample Bill 1',
        bill_number: 'B001-2024',
        status: 'introduced',
        summary: 'This is a sample bill for development purposes',
        introduced_date: '2024-01-15',
        sponsor: 'John Doe'
      },
      {
        id: '2',
        title: 'Sample Bill 2',
        bill_number: 'B002-2024',
        status: 'committee',
        summary: 'Another sample bill for testing',
        introduced_date: '2024-01-20',
        sponsor: 'Jane Smith'
      }
    ],
    metadata: {
      total: 2,
      page: 1,
      limit: 10
    }
  });
});

app.get('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: {
      id,
      title: `Sample Bill ${id}`,
      bill_number: `B00${id}-2024`,
      status: 'introduced',
      summary: `This is sample bill ${id} for development purposes`,
      content: `Full content of bill ${id} would go here...`,
      introduced_date: '2024-01-15',
      sponsor: 'John Doe',
      tags: ['sample', 'development'],
      votes: {
        for: 0,
        against: 0,
        abstain: 0
      }
    }
  });
});

app.get('/api/sponsors', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'John Doe',
        role: 'MP',
        party: 'Sample Party',
        constituency: 'Sample Constituency',
        email: 'john.doe@example.com'
      },
      {
        id: '2',
        name: 'Jane Smith',
        role: 'Senator',
        party: 'Another Party',
        constituency: 'Another Constituency',
        email: 'jane.smith@example.com'
      }
    ],
    metadata: {
      total: 2,
      page: 1,
      limit: 10
    }
  });
});

app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'dev-user',
      name: 'Development User',
      email: 'dev@example.com',
      role: 'citizen',
      preferences: {
        notifications: true,
        email_updates: false
      }
    }
  });
});

// Mock authentication endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    data: {
      token: 'dev-token-' + Date.now(),
      user: {
        id: 'dev-user',
        name: 'Development User',
        email: req.body.email || 'dev@example.com',
        role: 'citizen'
      }
    },
    message: 'Login successful (development mode)'
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Mock search endpoint
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  res.json({
    success: true,
    data: {
      bills: [
        {
          id: '1',
          title: `Sample Bill matching "${q}"`,
          bill_number: 'B001-2024',
          status: 'introduced',
          summary: `This bill matches your search for "${q}"`
        }
      ],
      sponsors: [
        {
          id: '1',
          name: 'John Doe',
          role: 'MP',
          party: 'Sample Party'
        }
      ]
    },
    metadata: {
      query: q,
      total_results: 2
    }
  });
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `API endpoint ${req.path} not found`,
      statusCode: 404
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      statusCode: 500
    },
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = createServer(app);

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Simple server running on http://localhost:${PORT}`);
  console.log(`📋 API endpoints available:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/bills`);
  console.log(`   GET  /api/bills/:id`);
  console.log(`   GET  /api/sponsors`);
  console.log(`   GET  /api/search?q=term`);
  console.log(`   POST /api/auth/login`);
  console.log(`\n💡 This is a development server with mock data`);
});

export { app, server };