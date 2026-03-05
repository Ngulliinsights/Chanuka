import { analysisApplicationService } from './application/AnalysisApplicationService';
import { logger } from '@server/infrastructure/observability';
import { authenticateToken, type AuthenticatedRequest } from '@server/middleware';
import express, { type Router, type Response } from 'express';
import { asyncHandler } from '@server/middleware';

const router: Router = express.Router();

// ============================================================================
// GET /api/analysis/bills/:bill_id/comprehensive
// Retrieve the latest comprehensive analysis result for a specific bill.
// Triggers analysis on-demand with caching.
// ============================================================================
router.get('/bills/:bill_id/comprehensive', asyncHandler(async (req, res: Response) => {
  const bill_id = req.params.bill_id;
  if (!bill_id) {
    res.status(400).json({ success: false, error: 'bill_id is required' });
    return;
  }

  const result = await analysisApplicationService.analyzeBill({
    bill_id,
    force_reanalysis: req.query.force === 'true',
    analysis_type: 'comprehensive',
  });

  if (result.isOk()) {
    res.json({
      success: true,
      data: result.value,
      metadata: {
        source: 'analysis_service',
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error.message,
    });
  }
}));

// ============================================================================
// POST /api/analysis/bills/:bill_id/comprehensive/run
// Manually trigger a new comprehensive analysis run. Requires admin role.
// ============================================================================
router.post(
  '/bills/:bill_id/comprehensive/run',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      logger.warn(
        { user_id: req.user?.id },
        'Unauthorized analysis trigger attempt',
      );
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions to trigger analysis',
      });
      return;
    }

    const bill_id = req.params.bill_id;
    if (!bill_id) {
      res.status(400).json({ success: false, error: 'bill_id is required' });
      return;
    }

    const result = await analysisApplicationService.triggerAnalysis({
      bill_id,
      analysis_type: 'comprehensive',
      priority: (req.body.priority as string) || 'normal',
      notify_on_complete: (req.body.notify_on_complete as boolean) || false,
    });

    if (result.isOk()) {
      res.status(201).json({
        success: true,
        message: 'Analysis re-run completed successfully',
        data: result.value,
        metadata: {
          source: 'manual_trigger',
          triggered_by: req.user?.id,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error.message,
      });
    }
  }),
);

// ============================================================================
// GET /api/analysis/bills/:bill_id/history
// Retrieve historical comprehensive analysis runs for a bill.
// ============================================================================
router.get('/bills/:bill_id/history', asyncHandler(async (req, res: Response) => {
  const bill_id = req.params.bill_id;
  if (!bill_id) {
    res.status(400).json({ success: false, error: 'bill_id is required' });
    return;
  }

  const limit  = req.query.limit  ? parseInt(req.query.limit  as string, 10) : 10;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const result = await analysisApplicationService.getAnalysisHistory({
    bill_id,
    limit,
    offset,
    analysis_type: (req.query.type as string) || 'all',
  });

  if (result.isOk()) {
    res.json({
      success: true,
      data: {
        history: result.value,
        count: result.value.length,
      },
      metadata: {
        source: 'database',
        timestamp: new Date().toISOString(),
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error.message,
    });
  }
}));

// ============================================================================
// GET /api/analysis/health
// Basic health check endpoint for the analysis feature.
// ============================================================================
router.get('/health', (_req, res: Response) => {
  res.json({
    status: 'Analysis feature operational',
    timestamp: new Date().toISOString(),
  });
});

export { router as analysisRouter };