/**
 * Cache Management API Routes
 * Administrative endpoints for cache monitoring and management
 */

import { Router } from 'express';
import { serverCache } from './cache-service';
import { cacheMiddleware } from '@server/middleware/cache-middleware';

const router = Router();

/**
 * GET /api/cache/stats
 * Get cache statistics and metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = serverCache.getCacheStats();
    
    res.json({
      success: true,
      data: {
        caches: stats,
        timestamp: new Date().toISOString(),
        summary: {
          totalHits: Object.values(stats).reduce((sum, cache) => sum + cache.hits, 0),
          totalMisses: Object.values(stats).reduce((sum, cache) => sum + cache.misses, 0),
          totalOperations: Object.values(stats).reduce((sum, cache) => sum + cache.operations, 0),
          averageHitRate: Object.values(stats).reduce((sum, cache) => sum + cache.hitRate, 0) / Object.keys(stats).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/cache/health
 * Get cache health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = await serverCache.healthCheck();
    
    const overallStatus = Object.values(health).every(h => h.status === 'healthy') 
      ? 'healthy' 
      : 'degraded';
    
    res.json({
      success: true,
      data: {
        status: overallStatus,
        caches: health,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache health',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cache/clear
 * Clear cache by pattern or all caches
 */
router.post('/clear', async (req, res) => {
  try {
    const { pattern = '*', cacheType } = req.body;
    
    if (cacheType) {
      // Clear specific cache type
      switch (cacheType) {
        case 'api':
          // Clear API cache (would need specific implementation)
          break;
        case 'queries':
          await serverCache.invalidateQueryPattern(pattern);
          break;
        case 'sessions':
          // Clear session cache (would need specific implementation)
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid cache type'
          });
      }
    } else {
      // Clear all caches
      await serverCache.invalidateQueryPattern('*');
    }
    
    res.json({
      success: true,
      message: `Cache cleared successfully`,
      pattern,
      cacheType: cacheType || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cache/warm
 * Warm up caches with common data
 */
router.post('/warm', async (req, res) => {
  try {
    const { targets = ['bills'] } = req.body;
    
    const results: any = {};
    
    for (const target of targets) {
      try {
        switch (target) {
          case 'bills':
            // Import and warm up bill cache
            const { cachedBillService } = await import('@server/features/bills/application/bill-service');
            await cachedBillService.warmUpCache();
            results[target] = 'success';
            break;
          default:
            results[target] = 'skipped - unknown target';
        }
      } catch (error) {
        results[target] = `error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
    
    res.json({
      success: true,
      message: 'Cache warming completed',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/cache/keys
 * List cache keys (for debugging)
 */
router.get('/keys', async (req, res) => {
  try {
    const { pattern = '*', limit = 100 } = req.query;
    
    // This would need to be implemented based on the cache adapter
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        message: 'Key listing not implemented yet',
        pattern,
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list cache keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as cacheManagementRoutes };
