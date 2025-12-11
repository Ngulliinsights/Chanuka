import { Router } from 'express';
import { cacheService, advancedCachingService } from '../../../4-personas-implementation-guide';

export const router = Router();

// Cache health endpoint
router.get('/cache/health', async (req, res) => {
  try {
    const health = await advancedCachingService.getHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Cache health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cache stats endpoint
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await advancedCachingService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Cache stats retrieval failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear cache endpoint (admin only)
router.delete('/cache/clear', async (req, res) => {
  try {
    await advancedCachingService.clear();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Cache clear failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

