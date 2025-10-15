import { Router } from "express";
import { cacheService } from "./cache-service.js";
import { ApiSuccess, ApiError, ApiNotFound } from "../../utils/api-response.js";
import { logger } from '@shared/utils/logger';

export const router = Router();

// Get cache statistics
router.get("/stats", (req, res) => {
  const startTime = Date.now();
  
  try {
    const stats = cacheService.getStats();
    
    return ApiSuccess(res, {
      ...stats,
      hitRateFormatted: `${stats.hitRate.toFixed(2)}%`,
      memoryUsageFormatted: `${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`
    }, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  } catch (error) {
    logger.error('Error getting cache stats:', { component: 'Chanuka' }, error);
    return ApiError(res, "Failed to get cache statistics", 500, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  }
});

// Get all cache keys (for debugging)
router.get("/keys", (req, res) => {
  const startTime = Date.now();
  
  try {
    const keys = cacheService.getKeys();
    
    return ApiSuccess(res, {
      keys,
      count: keys.length
    }, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  } catch (error) {
    logger.error('Error getting cache keys:', { component: 'Chanuka' }, error);
    return ApiError(res, "Failed to get cache keys", 500, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  }
});

// Clear all cache
router.delete("/clear", (req, res) => {
  const startTime = Date.now();
  
  try {
    cacheService.clear();
    
    return ApiSuccess(res, {
      message: "Cache cleared successfully"
    }, {
      source: 'cache',
      executionTime: Date.now() - startTime
    }, 200);
  } catch (error) {
    logger.error('Error clearing cache:', { component: 'Chanuka' }, error);
    return ApiError(res, "Failed to clear cache", 500, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  }
});

// Delete specific cache entry
router.delete("/key/:key", (req, res) => {
  const startTime = Date.now();
  
  try {
    const { key } = req.params;
    const deleted = cacheService.delete(decodeURIComponent(key));
    
    if (deleted) {
      return ApiSuccess(res, {
        message: `Cache key "${key}" deleted successfully`
      }, {
        source: 'cache',
        executionTime: Date.now() - startTime
      });
    } else {
      return ApiNotFound(res, `Cache key "${key}"`, {
        source: 'cache',
        executionTime: Date.now() - startTime
      });
    }
  } catch (error) {
    logger.error('Error deleting cache key:', { component: 'Chanuka' }, error);
    return ApiError(res, "Failed to delete cache key", 500, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  }
});

// Invalidate cache by pattern
router.delete("/pattern/:pattern", (req, res) => {
  const startTime = Date.now();
  
  try {
    const { pattern } = req.params;
    const deletedCount = cacheService.invalidatePattern(decodeURIComponent(pattern));
    
    return ApiSuccess(res, {
      message: `Invalidated ${deletedCount} cache entries matching pattern "${pattern}"`,
      deletedCount
    }, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  } catch (error) {
    logger.error('Error invalidating cache pattern:', { component: 'Chanuka' }, error);
    return ApiError(res, "Failed to invalidate cache pattern", 500, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  }
});

// Warm cache with predefined data
router.post("/warm", (req, res) => {
  const startTime = Date.now();
  
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries)) {
      return ApiError(res, {
        code: 'VALIDATION_ERROR',
        message: 'Entries must be an array'
      }, 400, {
        source: 'cache',
        executionTime: Date.now() - startTime
      });
    }

    cacheService.warm(entries);
    
    return ApiSuccess(res, {
      message: `Cache warmed with ${entries.length} entries`,
      count: entries.length
    }, {
      source: 'cache',
      executionTime: Date.now() - startTime
    }, 201);
  } catch (error) {
    logger.error('Error warming cache:', { component: 'Chanuka' }, error);
    return ApiError(res, "Failed to warm cache", 500, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  const startTime = Date.now();
  
  try {
    const stats = cacheService.getStats();
    const isHealthy = stats.hitRate > 50 && stats.memoryUsage < 100 * 1024 * 1024; // 100MB limit
    
    const statusCode = isHealthy ? 200 : 503;
    
    return ApiSuccess(res, {
      status: isHealthy ? "healthy" : "degraded",
      hitRate: stats.hitRate,
      memoryUsage: stats.memoryUsage,
      entries: stats.entries,
      isHealthy
    }, {
      source: 'cache',
      executionTime: Date.now() - startTime
    }, statusCode);
  } catch (error) {
    logger.error('Error checking cache health:', { component: 'Chanuka' }, error);
    return ApiError(res, "Failed to check cache health", 500, {
      source: 'cache',
      executionTime: Date.now() - startTime
    });
  }
});






