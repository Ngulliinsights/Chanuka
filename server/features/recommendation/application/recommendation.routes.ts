/**
 * Recommendation Engine Routes
 * 
 * Provides endpoints for personalized bill recommendations using:
 * - Collaborative filtering (similar users)
 * - Content-based filtering (bill similarity)
 * - Trending analysis
 * - User profiling
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { RecommendationService } from './RecommendationService';
import { logger } from '@server/infrastructure/observability';
import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import { integrationMonitor } from '@server/features/monitoring/domain/integration-monitor.service';

const router: ExpressRouter = Router();
const recommendationService = new RecommendationService();

// Feature ID for monitoring
const FEATURE_ID = 'recommendation-engine';

/**
 * Middleware to track recommendation metrics
 */
const trackMetrics = async (
  _req: Request,
  res: Response,
  next: Function
) => {
  const startTime = Date.now();
  
  // Capture original send
  const originalSend = res.send;
  
  res.send = function (data: any) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 300;
    
    // Record metrics asynchronously
    setImmediate(async () => {
      try {
        await integrationMonitor.recordMetrics(
          FEATURE_ID,
          {
            activeUsers: 1,
            totalRequests: 1,
            successfulRequests: success ? 1 : 0,
            failedRequests: success ? 0 : 1,
          },
          {
            avgResponseTime: responseTime,
            p95ResponseTime: responseTime,
            p99ResponseTime: responseTime,
          }
        );
      } catch (error) {
        logger.error({ error }, 'Failed to record recommendation metrics');
      }
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Apply metrics tracking to all routes
router.use(trackMetrics);

// ============================================================================
// RECOMMENDATION ENDPOINTS
// ============================================================================

/**
 * GET /api/recommendation/personalized
 * Get personalized recommendations for authenticated user
 */
router.get('/personalized', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const user_id = (req as any).user?.id;
    
    if (!user_id) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to get personalized recommendations',
      });
      return;
    }
    
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    
    const recommendations = await recommendationService.getPersonalizedRecommendations(
      user_id,
      limit
    );
    
    const responseTime = Date.now() - startTime;
    
    // Log successful request
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'info',
      'business_logic',
      'Personalized recommendations generated',
      {
        userId: user_id,
        count: recommendations.length,
        responseTime,
      },
      user_id,
      (req as any).requestId
    );
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      responseTime,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    errorTracker.trackRequestError(error as Error, req, 'high', 'business_logic');
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'error',
      'business_logic',
      'Failed to generate personalized recommendations',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      },
      (req as any).user?.id,
      (req as any).requestId
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/recommendation/similar/:bill_id
 * Get similar bills based on content and engagement
 */
router.get('/similar/:bill_id', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const bill_id = Number(req.params.bill_id);
    
    if (isNaN(bill_id)) {
      res.status(400).json({
        error: 'Invalid bill ID',
        message: 'Bill ID must be a number',
      });
      return;
    }
    
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    
    const similarBills = await recommendationService.getSimilarBills(bill_id, limit);
    
    const responseTime = Date.now() - startTime;
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'info',
      'business_logic',
      'Similar bills retrieved',
      {
        billId: bill_id,
        count: similarBills.length,
        responseTime,
      },
      (req as any).user?.id,
      (req as any).requestId
    );
    
    res.json({
      success: true,
      data: similarBills,
      count: similarBills.length,
      responseTime,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    errorTracker.trackRequestError(error as Error, req, 'medium', 'business_logic');
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'error',
      'business_logic',
      'Failed to retrieve similar bills',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      },
      (req as any).user?.id,
      (req as any).requestId
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve similar bills',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/recommendation/trending
 * Get trending bills based on recent engagement
 */
router.get('/trending', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const days = Math.min(Number(req.query.days) || 7, 365);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    
    const trendingBills = await recommendationService.getTrendingBills(days, limit);
    
    const responseTime = Date.now() - startTime;
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'info',
      'business_logic',
      'Trending bills retrieved',
      {
        days,
        count: trendingBills.length,
        responseTime,
      },
      (req as any).user?.id,
      (req as any).requestId
    );
    
    res.json({
      success: true,
      data: trendingBills,
      count: trendingBills.length,
      responseTime,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    errorTracker.trackRequestError(error as Error, req, 'medium', 'business_logic');
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'error',
      'business_logic',
      'Failed to retrieve trending bills',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      },
      (req as any).user?.id,
      (req as any).requestId
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trending bills',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/recommendation/collaborative
 * Get collaborative filtering recommendations
 */
router.get('/collaborative', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const user_id = (req as any).user?.id;
    
    if (!user_id) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to get collaborative recommendations',
      });
      return;
    }
    
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    
    const recommendations = await recommendationService.getCollaborativeRecommendations(
      user_id,
      limit
    );
    
    const responseTime = Date.now() - startTime;
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'info',
      'business_logic',
      'Collaborative recommendations generated',
      {
        userId: user_id,
        count: recommendations.length,
        responseTime,
      },
      user_id,
      (req as any).requestId
    );
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      responseTime,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    errorTracker.trackRequestError(error as Error, req, 'high', 'business_logic');
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'error',
      'business_logic',
      'Failed to generate collaborative recommendations',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      },
      (req as any).user?.id,
      (req as any).requestId
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/recommendation/track-engagement
 * Track user engagement with bills
 */
router.post('/track-engagement', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { bill_id, engagement_type } = req.body;
    
    if (!bill_id || !engagement_type) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'bill_id and engagement_type are required',
      });
      return;
    }
    
    const user_id = (req as any).user?.id;
    
    if (!user_id) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to track engagement',
      });
      return;
    }
    
    if (!['view', 'comment', 'share'].includes(engagement_type)) {
      res.status(400).json({
        error: 'Invalid engagement type',
        message: 'engagement_type must be one of: view, comment, share',
      });
      return;
    }
    
    await recommendationService.trackEngagement(
      user_id,
      Number(bill_id),
      engagement_type
    );
    
    const responseTime = Date.now() - startTime;
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'info',
      'business_logic',
      'User engagement tracked',
      {
        userId: user_id,
        billId: bill_id,
        engagementType: engagement_type,
        responseTime,
      },
      user_id,
      (req as any).requestId
    );
    
    res.json({
      success: true,
      message: 'Engagement tracked successfully',
      responseTime,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    errorTracker.trackRequestError(error as Error, req, 'medium', 'business_logic');
    
    await integrationMonitor.logEvent(
      FEATURE_ID,
      'error',
      'business_logic',
      'Failed to track engagement',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      },
      (req as any).user?.id,
      (req as any).requestId
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to track engagement',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/recommendation/health
 * Health check endpoint
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const cacheStats = recommendationService.getCacheStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      cache: {
        size: cacheStats.size,
        keys: cacheStats.keys.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    });
  }
});

export default router;
