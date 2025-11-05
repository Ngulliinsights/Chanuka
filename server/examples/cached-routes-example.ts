/**
 * Example: How to integrate caching with existing routes
 * This shows how to add caching to your existing API endpoints
 */

import { Router } from 'express';
import { cacheMiddleware, createCacheMiddleware } from '../middleware/cache-middleware';
import { cachedBillService } from '../features/bills/application/bill-service';

const router = Router();

// Example 1: Simple caching with predefined middleware
router.get('/bills', 
  cacheMiddleware.medium, // 5-minute cache
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, category } = req.query;
      
      const result = await cachedBillService.getAllBillsCached(
        { status, category },
        { page: Number(page), limit: Number(limit) }
      );
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Example 2: User-specific caching
router.get('/bills/my-bills',
  cacheMiddleware.userSpecific(600), // 10-minute user-specific cache
  async (req, res) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // This would be a method that gets user-specific bills
      const result = await cachedBillService.getAllBillsCached(
        { user_id },
        { page: 1, limit: 20 }
      );
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Example 3: Conditional caching based on query parameters
router.get('/bills/search',
  cacheMiddleware.conditional(
    (req) => Boolean(req.query.q && String(req.query.q).length > 2),
    180 // 3-minute cache for search results
  ),
  async (req, res) => {
    try {
      const { q: query, ...filters } = req.query;
      
      if (!query || String(query).length < 3) {
        return res.status(400).json({ 
          error: 'Search query must be at least 3 characters' 
        });
      }
      
      const result = await cachedBillService.searchBillsCached(
        String(query),
        filters
      );
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Example 4: Long-term caching for rarely changing data
router.get('/bills/stats',
  cacheMiddleware.long, // 1-hour cache
  async (req, res) => {
    try {
      const result = await cachedBillService.getBillStatsCached();
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Example 5: Custom cache key generation
router.get('/bills/category/:category',
  createCacheMiddleware({
    ttl: 900, // 15 minutes
    keyGenerator: (req) => `bills:category:${req.params.category}:${req.query.page || 1}`
  }),
  async (req, res) => {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const result = await cachedBillService.getAllBillsCached(
        { category },
        { page: Number(page), limit: Number(limit) }
      );
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Example 6: Cache invalidation on data modification
router.post('/bills',
  async (req, res) => {
    try {
      // Create bill logic here
      const newBill = await cachedBillService.createBill(req.body);
      
      // Invalidate related caches
      await cachedBillService.invalidateBillCaches();
      
      res.status(201).json(newBill);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.put('/bills/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Update bill logic here
      const updatedBill = await cachedBillService.updateBill(id, req.body);
      
      // Invalidate specific bill cache
      await cachedBillService.invalidateBillCaches(id);
      
      res.json(updatedBill);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export { router as cachedRoutesExample };