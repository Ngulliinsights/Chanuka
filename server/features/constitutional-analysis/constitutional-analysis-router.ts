// ============================================================================
// CONSTITUTIONAL ANALYSIS ROUTER - API Endpoints
// ============================================================================
// Express router for constitutional analysis endpoints

import { createAnalysisServices } from './services/constitutional-analysis-factory';
import { ApiResponse } from '@server/utils/api-response-helpers';
import { logger } from '@server/infrastructure/observability';
import { Router } from 'express';
import { z } from 'zod';

// Initialize services using factory
const services = createAnalysisServices();

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const analyzeBillSchema = z.object({
  bill_id: z.string().uuid('Bill ID must be a valid UUID'),
  billTitle: z.string().min(1, 'Bill title is required'),
  billContent: z.string().min(10, 'Bill content must be at least 10 characters'),
  billType: z.string().optional(),
  urgentAnalysis: z.boolean().optional().default(false)
});

const searchProvisionsSchema = z.object({
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20)
});

const searchPrecedentsSchema = z.object({
  searchTerm: z.string().min(1, 'Search term is required'),
  courtLevel: z.enum(['supreme_court', 'court_of_appeal', 'high_court']).optional(),
  limit: z.number().int().min(1).max(25).optional().default(10)
});

// ============================================================================
// MAIN ANALYSIS ENDPOINTS
// ============================================================================

/**
 * POST /api/constitutional-analysis/analyze
 * Perform constitutional analysis on a bill
 */
router.post('/analyze', async (req, res) => {
  try {
    logger.info({
      component: 'ConstitutionalAnalysisRouter',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, '📥 Constitutional analysis request received');

    // Validate request body
    const validation = analyzeBillSchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn({
        component: 'ConstitutionalAnalysisRouter',
        errors: validation.error.errors
      }, '❌ Invalid constitutional analysis request');
      return res.status(400).json(
        ApiResponse.validation('Invalid request parameters', validation.error.errors)
      );
    }

    const { bill_id, billTitle, billContent, billType, urgentAnalysis } = validation.data;

    // Perform constitutional analysis
    const analysisResult = await services.analyzer.analyzeBill({
      bill_id,
      billTitle,
      billContent,
      billType,
      urgentAnalysis
    });

    logger.info({
      component: 'ConstitutionalAnalysisRouter',
      bill_id,
      overallRisk: analysisResult.overallRisk,
      analysisCount: analysisResult.analyses.length,
      processingTime: analysisResult.processingTime
    }, '✅ Constitutional analysis completed successfully');

    return res.json(ApiResponse.success(analysisResult, 'Constitutional analysis completed successfully'));

  } catch (error) {
    logger.error({
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ Constitutional analysis failed');

    return res.status(500).json(
      ApiResponse.error('Constitutional analysis failed', 'ANALYSIS_ERROR', 500)
    );
  }
});

/**
 * GET /api/constitutional-analysis/bills/:billId
 * Get existing constitutional analysis for a bill
 */
router.get('/bills/:bill_id', async (req, res) => {
  try {
    const { bill_id } = req.params;

    logger.debug({
      component: 'ConstitutionalAnalysisRouter'
    }, `Getting constitutional analysis for bill ${bill_id}`);

    // Validate UUID format
    if (!z.string().uuid().safeParse(bill_id).success) {
      return res.status(400).json(
        ApiResponse.validation('Invalid bill ID format', [{ message: 'Bill ID must be a valid UUID' }])
      );
    }

    // Note: This endpoint requires repository implementation
    // For now, return a placeholder response
    logger.debug({
      component: 'ConstitutionalAnalysisRouter'
    }, `No constitutional analysis found for bill ${bill_id}`);
    
    return res.status(404).json(
      ApiResponse.error('Analysis retrieval not yet implemented', 'NOT_IMPLEMENTED', 404)
    );

  } catch (error) {
    logger.error({
      component: 'ConstitutionalAnalysisRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    }, `Failed to get constitutional analysis for bill ${req.params.bill_id}`);

    return res.status(500).json(
      ApiResponse.error('Failed to retrieve constitutional analysis', 'RETRIEVAL_ERROR', 500)
    );
  }
});

// ============================================================================
// CONSTITUTIONAL PROVISIONS ENDPOINTS
// ============================================================================

/**
 * GET /api/constitutional-analysis/provisions/search
 * Search constitutional provisions by keywords
 */
router.get('/provisions/search', async (req, res) => {
  try {
    logger.debug({
      component: 'ConstitutionalAnalysisRouter',
      query: req.query
    }, 'Constitutional provisions search request');

    // Validate query parameters
    const validation = searchProvisionsSchema.safeParse({
      keywords: req.query.keywords ? (req.query.keywords as string).split(',').map(k => k.trim()) : [],
      category: req.query.category as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    });

    if (!validation.success) {
      return res.status(400).json(
        ApiResponse.validation('Invalid search parameters', validation.error.errors)
      );
    }

    // Note: This endpoint requires repository implementation
    return res.status(501).json(
      ApiResponse.error('Provisions search not yet implemented', 'NOT_IMPLEMENTED', 501)
    );

  } catch (error) {
    logger.error({
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to search constitutional provisions');

    return res.status(500).json(
      ApiResponse.error('Failed to search constitutional provisions', 'SEARCH_ERROR', 500)
    );
  }
});

/**
 * GET /api/constitutional-analysis/provisions/:articleNumber
 * Get provisions by article number
 */
router.get('/provisions/:articleNumber', async (req, res) => {
  try {
    const articleNumber = parseInt(req.params.articleNumber);

    if (isNaN(articleNumber) || articleNumber < 1) {
      return res.status(400).json(
        ApiResponse.validation('Invalid article number', [{ message: 'Article number must be a positive integer' }])
      );
    }

    logger.debug({
      component: 'ConstitutionalAnalysisRouter'
    }, `Getting provisions for article ${articleNumber}`);

    // Note: This endpoint requires repository implementation
    return res.status(501).json(
      ApiResponse.error('Provisions retrieval not yet implemented', 'NOT_IMPLEMENTED', 501)
    );

  } catch (error) {
    logger.error({
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    }, `Failed to get provisions for article ${req.params.articleNumber}`);

    return res.status(500).json(
      ApiResponse.error('Failed to retrieve constitutional provisions', 'RETRIEVAL_ERROR', 500)
    );
  }
});

// ============================================================================
// LEGAL PRECEDENTS ENDPOINTS
// ============================================================================

/**
 * GET /api/constitutional-analysis/precedents/search
 * Search legal precedents
 */
router.get('/precedents/search', async (req, res) => {
  try {
    logger.debug({
      component: 'ConstitutionalAnalysisRouter',
      query: req.query
    }, 'Legal precedents search request');

    const validation = searchPrecedentsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json(
        ApiResponse.validation('Invalid search parameters', validation.error.errors)
      );
    }

    // Note: This endpoint requires repository implementation
    return res.status(501).json(
      ApiResponse.error('Precedents search not yet implemented', 'NOT_IMPLEMENTED', 501)
    );

  } catch (error) {
    logger.error({
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to search legal precedents');

    return res.status(500).json(
      ApiResponse.error('Failed to search legal precedents', 'SEARCH_ERROR', 500)
    );
  }
});

// ============================================================================
// EXPERT REVIEW ENDPOINTS
// ============================================================================

/**
 * GET /api/constitutional-analysis/expert-review/queue
 * Get expert review queue status
 */
router.get('/expert-review/queue', async (_req, res) => {
  try {
    logger.debug({
      component: 'ConstitutionalAnalysisRouter'
    }, 'Getting expert review queue status');

    // Note: This endpoint requires repository implementation
    return res.status(501).json(
      ApiResponse.error('Expert review queue not yet implemented', 'NOT_IMPLEMENTED', 501)
    );

  } catch (error) {
    logger.error({
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to get expert review queue status');

    return res.status(500).json(
      ApiResponse.error('Failed to retrieve expert review queue status', 'QUEUE_ERROR', 500)
    );
  }
});

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/constitutional-analysis/statistics
 * Get constitutional analysis statistics
 */
router.get('/statistics', async (_req, res) => {
  try {
    logger.debug({
      component: 'ConstitutionalAnalysisRouter'
    }, 'Getting constitutional analysis statistics');

    // Note: This endpoint requires repository implementation
    return res.status(501).json(
      ApiResponse.error('Statistics not yet implemented', 'NOT_IMPLEMENTED', 501)
    );

  } catch (error) {
    logger.error({
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to get constitutional analysis statistics');

    return res.status(500).json(
      ApiResponse.error('Failed to retrieve statistics', 'STATISTICS_ERROR', 500)
    );
  }
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * GET /api/constitutional-analysis/health
 * Health check for constitutional analysis system
 */
router.get('/health', async (_req, res) => {
  try {
    logger.debug({
      component: 'ConstitutionalAnalysisRouter'
    }, 'Constitutional analysis health check');

    // Basic health check - services are initialized
    const healthChecks = {
      analyzer: !!services.analyzer,
      provisionMatcher: !!services.provisionMatcher,
      precedentFinder: !!services.precedentFinder,
      expertFlagger: !!services.expertFlagger
    };

    const allHealthy = Object.values(healthChecks).every(check => check);
    const status = allHealthy ? 'healthy' : 'degraded';

    logger.debug({
      component: 'ConstitutionalAnalysisRouter',
      healthChecks
    }, `Constitutional analysis health check completed: ${status}`);

    const responseStatus = allHealthy ? 200 : 503;
    return res.status(responseStatus).json(ApiResponse.success({
      status,
      checks: healthChecks,
      timestamp: new Date().toISOString()
    }, `Constitutional analysis system is ${status}`));

  } catch (error) {
    logger.error({
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    }, 'Constitutional analysis health check failed');

    return res.status(503).json(
      ApiResponse.error('Health check failed', 'HEALTH_CHECK_ERROR', 503)
    );
  }
});

export const constitutionalAnalysisRouter: Router = router;


