import { billComprehensiveAnalysisService } from '@shared/application/bill-comprehensive-analysis.service.js';
import { analysisService } from '@shared/application/analysis-service-direct.js';
import { BaseError, ValidationError } from '@shared/core/errors';
import { ErrorCode, ErrorDomain, ErrorSeverity } from '@shared/constants';
import { logger } from '@shared/core';
import { authenticateToken, requireAuth } from '../../../../AuthAlert';
import express, { Response } from 'express';
import { asyncHandler } from '@shared/middleware/async-handler';
import { createErrorContext } from '@shared/middleware/error-context';

const router = express.Router();

/**
 * GET /api/analysis/bills/:bill_id/comprehensive
 * Retrieve the latest comprehensive analysis result for a specific bill.
 * This endpoint triggers the analysis on-demand.
 */
router.get('/bills/:bill_id/comprehensive', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /bills/:bill_id/comprehensive');
  try {
    const bill_id_str = req.params.bill_id;
    if (!bill_id_str) {
      throw new ValidationError('Bill ID is required', {
        field: 'bill_id',
        message: 'Bill ID route parameter is required'
      });
    }

    const bill_id = parseInt(bill_id_str, 10);
    if (isNaN(bill_id) || bill_id <= 0) {
      throw new ValidationError('Invalid bill ID format', {
        field: 'bill_id',
        message: 'Bill ID must be a positive integer'
      });
    }

    logger.info(`Request received for comprehensive analysis of bill ${bill_id}`, {
      component: 'AnalysisRoutes',
      context
    });

    const analysisResult = await billComprehensiveAnalysisService.analyzeBill(bill_id);

    const metadata = {
      source: 'live_analysis',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - req.startTime
    };
    res.json({ data: analysisResult, metadata });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to retrieve comprehensive analysis', {
      component: 'AnalysisRoutes',
      context
    }, error as Error);
    throw new BaseError('Failed to retrieve comprehensive analysis', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { bill_id: req.params.bill_id }
    });
  }
}));

/**
 * POST /api/analysis/bills/:bill_id/comprehensive/run
 * Manually trigger a new comprehensive analysis run for a specific bill.
 * Requires admin role.
 */
router.post('/bills/:bill_id/comprehensive/run', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /bills/:bill_id/comprehensive/run');
  try {
    // Authorization check
    if (req.user?.role !== 'admin') {
      logger.warn(`Unauthorized analysis trigger attempt by user ${req.user?.id}`, {
        component: 'AnalysisRoutes',
        context
      });
      throw new BaseError('Insufficient permissions to trigger analysis', {
        statusCode: 403,
        code: ErrorCode.ACCESS_DENIED,
        domain: ErrorDomain.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        details: { required_role: 'admin', user_id: req.user?.id }
      });
    }

    const bill_id_str = req.params.bill_id;
    if (!bill_id_str) {
      throw new ValidationError('Bill ID is required', {
        field: 'bill_id',
        message: 'Bill ID route parameter is required'
      });
    }

    const bill_id = parseInt(bill_id_str, 10);
    if (isNaN(bill_id) || bill_id <= 0) {
      throw new ValidationError('Invalid bill ID format', {
        field: 'bill_id',
        message: 'Bill ID must be a positive integer'
      });
    }

    logger.info(`Admin trigger for comprehensive analysis of bill ${bill_id} by user ${req.user?.id}`, {
      component: 'AnalysisRoutes',
      context
    });

    const analysisResult = await billComprehensiveAnalysisService.analyzeBill(bill_id);

    const metadata = {
      source: 'manual_trigger',
      triggered_by: req.user?.id,
      timestamp: new Date().toISOString()
    };
    res.status(201).json({
      message: 'Analysis re-run completed successfully',
      data: analysisResult,
      metadata
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Analysis trigger failed', {
      component: 'AnalysisRoutes',
      context,
      user_id: req.user?.id
    }, error as Error);
    throw new BaseError('Analysis trigger failed', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { bill_id: req.params.bill_id, user_id: req.user?.id }
    });
  }
}));

/**
 * GET /api/analysis/bills/:bill_id/history
 * Retrieve historical comprehensive analysis runs for a bill.
 */
router.get('/bills/:bill_id/history', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /bills/:bill_id/history');
  try {
    const bill_id_str = req.params.bill_id;
    if (!bill_id_str) {
      throw new ValidationError('Bill ID is required', {
        field: 'bill_id',
        message: 'Bill ID route parameter is required'
      });
    }

    const bill_id = parseInt(bill_id_str, 10);
    if (isNaN(bill_id) || bill_id <= 0) {
      throw new ValidationError('Invalid bill ID format', {
        field: 'bill_id',
        message: 'Bill ID must be a positive integer'
      });
    }

    // Validate limit query parameter
    let limit = 10; // Default limit
    if (req.query.limit) {
      const limitParam = req.query.limit as string;
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
        throw new ValidationError('Invalid limit parameter', {
          field: 'limit',
          message: 'Limit must be an integer between 1 and 50'
        });
      }
      limit = parsedLimit;
    }

    const historyRecords = await analysisService.findHistoryByBillId(bill_id, limit);

    // Transform results for frontend consumption
    const historyResults = historyRecords.map((record: unknown) => {
      const resultsData = record.results as unknown;
      return {
        dbId: record.id,
        analysis_id: resultsData?.analysis_id,
        timestamp: record.created_at,
        version: resultsData?.version || record.analysis_type,
        overallConfidence: parseFloat(record.confidence ?? '0'),
        status: resultsData?.status || 'unknown',
        scores: {
          publicInterest: resultsData?.publicInterestScore?.score,
          transparency: resultsData?.transparency_score?.overall,
          constitutional: resultsData?.constitutionalAnalysis?.constitutionalityScore
        }
      };
    });

    const metadata = {
      source: 'database',
      timestamp: new Date().toISOString(),
      count: historyResults.length
    };
    res.json({ data: { history: historyResults, count: historyResults.length }, metadata });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to retrieve analysis history', {
      component: 'AnalysisRoutes',
      context,
      bill_id: req.params.bill_id
    }, error as Error);
    throw new BaseError('Failed to retrieve analysis history', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { bill_id: req.params.bill_id }
    });
  }
}));

/**
 * GET /api/analysis/health
 * Basic health check endpoint for the analysis feature.
 */
router.get('/health', (req, res: Response) => {
  res.json({
    status: 'Analysis feature operational',
    timestamp: new Date().toISOString()
  });
});

export { router as analysisRouter };
