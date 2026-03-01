import { analysisApplicationService } from './application/AnalysisApplicationService';
import { logger } from '@server/infrastructure/observability';
import { requireAuth } from '../../../../AuthAlert';
import express, { Response } from 'express';
import { asyncHandler } from '@server/middleware';

const router = express.Router();

/**
 * GET /api/analysis/bills/:bill_id/comprehensive
 * Retrieve the latest comprehensive analysis result for a specific bill.
 * This endpoint triggers the analysis on-demand with caching.
 */
router.get('/bills/:bill_id/comprehensive', asyncHandler(async (req, res: Response) => {
  const bill_id = parseInt(req.params.bill_id, 10);
  
  const result = await analysisApplicationService.analyzeBill({
    bill_id,
    force_reanalysis: req.query.force === 'true',
    analysis_type: 'comprehensive',
  });
  
  if (result.success) {
    res.json({
      success: true,
      data: result.data,
      metadata: {
        source: 'analysis_service',
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error,
    });
  }
}));

/**
 * POST /api/analysis/bills/:bill_id/comprehensive/run
 * Manually trigger a new comprehensive analysis run for a specific bill.
 * Requires admin role.
 */
router.post('/bills/:bill_id/comprehensive/run', requireAuth, asyncHandler(async (req, res: Response) => {
  // Authorization check
  if (req.user?.role !== 'admin') {
    logger.warn(`Unauthorized analysis trigger attempt by user ${req.user?.id}`);
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions to trigger analysis',
    });
  }

  const bill_id = parseInt(req.params.bill_id, 10);
  
  const result = await analysisApplicationService.triggerAnalysis({
    bill_id,
    analysis_type: 'comprehensive',
    priority: req.body.priority || 'normal',
    notify_on_complete: req.body.notify_on_complete || false,
  });
  
  if (result.success) {
    res.status(201).json({
      success: true,
      message: 'Analysis re-run completed successfully',
      data: result.data,
      metadata: {
        source: 'manual_trigger',
        triggered_by: req.user?.id,
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error,
    });
  }
}));

/**
 * GET /api/analysis/bills/:bill_id/history
 * Retrieve historical comprehensive analysis runs for a bill.
 */
router.get('/bills/:bill_id/history', asyncHandler(async (req, res: Response) => {
  const bill_id = parseInt(req.params.bill_id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  
  const result = await analysisApplicationService.getAnalysisHistory({
    bill_id,
    limit,
    offset,
    analysis_type: (req.query.type as any) || 'all',
  });
  
  if (result.success) {
    res.json({
      success: true,
      data: {
        history: result.data,
        count: result.data.length,
      },
      metadata: {
        source: 'database',
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error,
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
