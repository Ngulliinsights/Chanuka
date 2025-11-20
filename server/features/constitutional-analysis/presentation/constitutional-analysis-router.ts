// ============================================================================
// CONSTITUTIONAL ANALYSIS ROUTER - API Endpoints
// ============================================================================
// Express router for constitutional analysis endpoints

import { Router } from 'express';
import { z } from 'zod';
import { logger, ApiResponse  } from '@shared/core/src/index.js';
import { createAnalysisServices } from '@server/services/constitutional-analysis-factory.ts';
import { ConstitutionalAnalysis } from '@shared/schema/index.js';

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
    logger.info('📥 Constitutional analysis request received', {
      component: 'ConstitutionalAnalysisRouter',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Validate request body
    const validation = analyzeBillSchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn('❌ Invalid constitutional analysis request', {
        component: 'ConstitutionalAnalysisRouter',
        errors: validation.error.errors
      });
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

    logger.info('✅ Constitutional analysis completed successfully', {
      component: 'ConstitutionalAnalysisRouter',
      bill_id,
      overallRisk: analysisResult.overallRisk,
      analysisCount: analysisResult.analyses.length,
      processingTime: analysisResult.processingTime
    });

    res.json(ApiResponse.success(analysisResult, 'Constitutional analysis completed successfully'));

  } catch (error) {
    logger.error('❌ Constitutional analysis failed', {
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json(
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

    logger.debug(`Getting constitutional analysis for bill ${bill_id}`, {
      component: 'ConstitutionalAnalysisRouter'
    });

    // Validate UUID format
    if (!z.string().uuid().safeParse(bill_id).success) {
      return res.status(400).json(
        ApiResponse.validation('Invalid bill ID format', [{ message: 'Bill ID must be a valid UUID' }])
      );
    }

    const analyses = await services.repositories.analyses.findByBillId(bill_id);

    if (analyses.length === 0) {
      logger.debug(`No constitutional analysis found for bill ${bill_id}`, {
        component: 'ConstitutionalAnalysisRouter'
      });
      return res.status(404).json(
        ApiResponse.error('No constitutional analysis found for this bill', 'ANALYSIS_NOT_FOUND', 404)
      );
    }

    // Calculate summary statistics
    const summary = {
      totalAnalyses: analyses.length,
      overallRisk: calculateOverallRisk(analyses),
      averageConfidence: Math.round(
        analyses.reduce((sum, a) => sum + a.confidence_percentage, 0) / analyses.length
      ),
      expertReviewRequired: analyses.some(a => a.requires_expert_review && !a.expert_reviewed),
      lastUpdated: Math.max(...analyses.map(a => a.updated_at.getTime()))
    };

    logger.debug(`Retrieved constitutional analysis for bill ${bill_id}`, {
      component: 'ConstitutionalAnalysisRouter',
      analysisCount: analyses.length,
      overallRisk: summary.overallRisk
    });

    res.json(ApiResponse.success({
      bill_id,
      analyses,
      summary
    }, 'Constitutional analysis retrieved successfully'));

  } catch (error) {
    logger.error(`Failed to get constitutional analysis for bill ${req.params.bill_id}`, {
      component: 'ConstitutionalAnalysisRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json(
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
    logger.debug('Constitutional provisions search request', {
      component: 'ConstitutionalAnalysisRouter',
      query: req.query
    });

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

    const { keywords, category, limit } = validation.data;

    let provisions;
    if (category) {
      provisions = await services.repositories.provisions.searchByCategory(category);
    } else {
      provisions = await services.repositories.provisions.searchByKeywords(keywords);
    }

    // Limit results
    const limitedProvisions = provisions.slice(0, limit);

    logger.debug(`Found ${limitedProvisions.length} constitutional provisions`, {
      component: 'ConstitutionalAnalysisRouter',
      keywords,
      category
    });

    res.json(ApiResponse.success({
      provisions: limitedProvisions,
      totalFound: provisions.length,
      searchCriteria: { keywords, category, limit }
    }, 'Constitutional provisions found successfully'));

  } catch (error) {
    logger.error('Failed to search constitutional provisions', {
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json(
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

    logger.debug(`Getting provisions for article ${articleNumber}`, {
      component: 'ConstitutionalAnalysisRouter'
    });

    const provisions = await services.repositories.provisions.findByArticleNumber(articleNumber);

    logger.debug(`Found ${provisions.length} provisions for article ${articleNumber}`, {
      component: 'ConstitutionalAnalysisRouter'
    });

    res.json(ApiResponse.success({
      articleNumber,
      provisions,
      count: provisions.length
    }, `Provisions for Article ${articleNumber} retrieved successfully`));

  } catch (error) {
    logger.error(`Failed to get provisions for article ${req.params.articleNumber}`, {
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json(
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
    logger.debug('Legal precedents search request', {
      component: 'ConstitutionalAnalysisRouter',
      query: req.query
    });

    const validation = searchPrecedentsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json(
        ApiResponse.validation('Invalid search parameters', validation.error.errors)
      );
    }

    const { searchTerm, courtLevel, limit } = validation.data;

    let precedents;
    if (courtLevel) {
      precedents = await services.repositories.precedents.findByCourtLevel(courtLevel);
    } else {
      precedents = await services.repositories.precedents.searchByKeywords([searchTerm]);
    }

    // Limit results
    const limitedPrecedents = precedents.slice(0, limit);

    logger.debug(`Found ${limitedPrecedents.length} legal precedents`, {
      component: 'ConstitutionalAnalysisRouter',
      searchTerm,
      courtLevel
    });

    res.json(ApiResponse.success({
      precedents: limitedPrecedents,
      totalFound: precedents.length,
      searchCriteria: { searchTerm, courtLevel, limit }
    }, 'Legal precedents found successfully'));

  } catch (error) {
    logger.error('Failed to search legal precedents', {
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json(
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
router.get('/expert-review/queue', async (req, res) => {
  try {
    logger.debug('Getting expert review queue status', {
      component: 'ConstitutionalAnalysisRouter'
    });

    const queueStatus = await services.repositories.expertReview.getQueueStatus();

    logger.debug('Retrieved expert review queue status', {
      component: 'ConstitutionalAnalysisRouter',
      queueStatus
    });

    res.json(ApiResponse.success(queueStatus, 'Expert review queue status retrieved successfully'));

  } catch (error) {
    logger.error('Failed to get expert review queue status', {
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json(
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
router.get('/statistics', async (req, res) => {
  try {
    logger.debug('Getting constitutional analysis statistics', {
      component: 'ConstitutionalAnalysisRouter'
    });

    const [
      analysisStats,
      provisionStats,
      precedentStats,
      queueStatus
    ] = await Promise.all([
      services.repositories.analyses.getStatistics(),
      services.repositories.provisions.getStatistics(),
      services.repositories.precedents.getStatistics(),
      services.repositories.expertReview.getQueueStatus()
    ]);

    const statistics = {
      analyses: analysisStats,
      provisions: provisionStats,
      precedents: precedentStats,
      expertReview: queueStatus,
      systemHealth: {
        totalCapacity: (analysisStats?.totalAnalyses || 0) + (provisionStats?.totalProvisions || 0),
        activeComponents: 4, // analyzer, matcher, finder, flagger
        lastUpdated: new Date().toISOString()
      }
    };

    logger.debug('Retrieved constitutional analysis statistics', {
      component: 'ConstitutionalAnalysisRouter',
      totalAnalyses: analysisStats?.totalAnalyses || 0,
      totalProvisions: provisionStats?.totalProvisions || 0
    });

    res.json(ApiResponse.success(statistics, 'Constitutional analysis statistics retrieved successfully'));

  } catch (error) {
    logger.error('Failed to get constitutional analysis statistics', {
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json(
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
router.get('/health', async (req, res) => {
  try {
    logger.debug('Constitutional analysis health check', {
      component: 'ConstitutionalAnalysisRouter'
    });

    // Check database connectivity and basic functionality
    const healthChecks = {
      database: false,
      provisions: false,
      precedents: false,
      analyses: false
    };

    try {
      // Test provisions repository
      await services.repositories.provisions.getStatistics();
      healthChecks.provisions = true;
      healthChecks.database = true;
    } catch (error) {
      logger.warn('Provisions repository health check failed', { error });
    }

    try {
      // Test precedents repository
      await services.repositories.precedents.getStatistics();
      healthChecks.precedents = true;
    } catch (error) {
      logger.warn('Precedents repository health check failed', { error });
    }

    try {
      // Test analyses repository
      await services.repositories.analyses.getStatistics();
      healthChecks.analyses = true;
    } catch (error) {
      logger.warn('Analyses repository health check failed', { error });
    }

    const allHealthy = Object.values(healthChecks).every(check => check);
    const status = allHealthy ? 'healthy' : 'degraded';

    logger.debug(`Constitutional analysis health check completed: ${status}`, {
      component: 'ConstitutionalAnalysisRouter',
      healthChecks
    });

    const responseStatus = allHealthy ? 200 : 503;
    res.status(responseStatus).json(ApiResponse.success({
      status,
      checks: healthChecks,
      timestamp: new Date().toISOString()
    }, `Constitutional analysis system is ${status}`));

  } catch (error) {
    logger.error('Constitutional analysis health check failed', {
      component: 'ConstitutionalAnalysisRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json(
      ApiResponse.error('Health check failed', 'HEALTH_CHECK_ERROR', 503)
    );
  }
});

// ============================================================================
// HELPER METHODS
// ============================================================================

function calculateOverallRisk(analyses: ConstitutionalAnalysis[]): 'low' | 'medium' | 'high' | 'critical' {
  if (analyses.some(a => a.constitutional_risk === 'critical')) return 'critical';
  if (analyses.some(a => a.constitutional_risk === 'high')) return 'high';
  if (analyses.some(a => a.constitutional_risk === 'medium')) return 'medium';
  return 'low';
}

export const constitutionalAnalysisRouter = router;
