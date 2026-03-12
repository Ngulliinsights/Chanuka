import { analysisApplicationService } from '../../application/AnalysisApplicationService';
import { logger } from '@server/infrastructure/observability';
import { authenticateToken, type AuthenticatedRequest } from '@server/middleware';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import express, { type Router, type Response } from 'express';
import { asyncHandler } from '@server/middleware';
import {
  GetComprehensiveAnalysisSchema,
  TriggerAnalysisParamsSchema,
  TriggerAnalysisBodySchema,
  GetAnalysisHistorySchema,
} from '../../analysis-validation.schemas';

const router: Router = express.Router();

// ============================================================================
// GET /api/analysis/bills/:bill_id/comprehensive
// Retrieve the latest comprehensive analysis result for a specific bill.
// Triggers analysis on-demand with caching.
// ============================================================================
router.get('/bills/:bill_id/comprehensive', asyncHandler(async (req, res: Response) => {
  // Validate input
  const validation = await validateData(GetComprehensiveAnalysisSchema, {
    bill_id: req.params.bill_id,
    force: req.query.force as string | undefined,
  });

  if (!validation.success) {
    res.status(400).json({
      success: false,
      errors: validation.errors,
    });
    return;
  }

  const { bill_id, force } = validation.data!;

  const result = await analysisApplicationService.analyzeBill({
    bill_id,
    force_reanalysis: force === 'true',
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

    // Validate params
    const paramsValidation = await validateData(TriggerAnalysisParamsSchema, {
      bill_id: req.params.bill_id,
    });

    if (!paramsValidation.success) {
      res.status(400).json({
        success: false,
        errors: paramsValidation.errors,
      });
      return;
    }

    // Validate body
    const bodyValidation = await validateData(TriggerAnalysisBodySchema, req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        errors: bodyValidation.errors,
      });
      return;
    }

    const { bill_id } = paramsValidation.data!;
    const { priority, notify_on_complete } = bodyValidation.data!;

    const result = await analysisApplicationService.triggerAnalysis({
      bill_id,
      analysis_type: 'comprehensive',
      priority,
      notify_on_complete,
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
  // Validate input
  const validation = await validateData(GetAnalysisHistorySchema, {
    bill_id: req.params.bill_id,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    type: req.query.type as string | undefined,
  });

  if (!validation.success) {
    res.status(400).json({
      success: false,
      errors: validation.errors,
    });
    return;
  }

  const { bill_id, limit, offset, type } = validation.data!;

  const result = await analysisApplicationService.getAnalysisHistory({
    bill_id,
    limit,
    offset,
    analysis_type: type,
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