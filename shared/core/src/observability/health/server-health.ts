import { Router } from 'express';
import { HealthChecker, createBasicHealthChecker } from './health-checker';

export const router = Router();

// Create health checker instance
const healthChecker = createBasicHealthChecker({
  timeout: 5000,
  parallel: true,
  cache: 30000
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await healthChecker.check();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple liveness probe
router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Simple readiness probe
router.get('/health/ready', (req, res) => {
  res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
});
