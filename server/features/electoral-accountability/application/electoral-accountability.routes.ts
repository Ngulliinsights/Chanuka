/**
 * Electoral Accountability Routes - Application Layer
 * 
 * HTTP API for the Electoral Accountability Engine
 */

import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { electoralAccountabilityService } from '../domain/electoral-accountability.service';
import { logger } from '@server/infrastructure/observability';
import { getErrorResponse } from '../domain/electoral-accountability.errors';

const router: Router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const getMPVotingRecordSchema = z.object({
  sponsorId: z.string().uuid(),
  constituency: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeGapAnalysis: z.boolean().optional(),
});

const getConstituencySentimentSchema = z.object({
  billId: z.string().uuid(),
  constituency: z.string(),
});

const getCriticalGapsSchema = z.object({
  constituency: z.string().optional(),
  sponsorId: z.string().uuid().optional(),
  minRiskScore: z.number().min(0).max(100).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const createPressureCampaignSchema = z.object({
  campaignName: z.string().min(3).max(255),
  description: z.string().min(10),
  targetSponsorId: z.string().uuid(),
  targetConstituency: z.string(),
  targetCounty: z.string(),
  triggeredByBillId: z.string().uuid().optional(),
  triggeredByGapId: z.string().uuid().optional(),
});

const getMPScorecardSchema = z.object({
  sponsorId: z.string().uuid(),
  constituency: z.string(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/electoral-accountability/mp-voting-record
 * Get MP voting record mapped to constituency
 */
router.get('/mp-voting-record', async (req: Request, res: Response) => {
  try {
    const validated = getMPVotingRecordSchema.parse({
      sponsorId: req.query.sponsorId,
      constituency: req.query.constituency,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      includeGapAnalysis: req.query.includeGapAnalysis === 'true',
    });

    const records = await electoralAccountabilityService.getMPVotingRecord(
      validated.sponsorId,
      {
        constituency: validated.constituency,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        endDate: validated.endDate ? new Date(validated.endDate) : undefined,
        includeGapAnalysis: validated.includeGapAnalysis,
      }
    );

    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    logger.error({ error, path: req.path, query: req.query }, 'Failed to get MP voting record');
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
});

/**
 * GET /api/electoral-accountability/constituency-sentiment
 * Get constituency sentiment for a bill
 */
router.get('/constituency-sentiment', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = getConstituencySentimentSchema.parse({
      billId: req.query.billId,
      constituency: req.query.constituency,
    });

    const sentiment = await electoralAccountabilityService.getConstituencySentiment(
      validated.billId,
      validated.constituency
    );

    if (!sentiment) {
      res.status(404).json({
        success: false,
        error: 'Sentiment data not found for this bill and constituency',
      });
      return;
    }

    res.json({
      success: true,
      data: sentiment,
    });
    return;
  } catch (error) {
    logger.error({ error, path: req.path, query: req.query }, 'Failed to get constituency sentiment');
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
    return;
  }
});

/**
 * GET /api/electoral-accountability/critical-gaps
 * Get critical misalignments with high electoral risk
 */
router.get('/critical-gaps', async (req: Request, res: Response) => {
  try {
    const validated = getCriticalGapsSchema.parse({
      constituency: req.query.constituency,
      sponsorId: req.query.sponsorId,
      minRiskScore: req.query.minRiskScore ? parseFloat(req.query.minRiskScore as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });

    const gaps = await electoralAccountabilityService.getCriticalGaps(validated);

    res.json({
      success: true,
      data: gaps,
      count: gaps.length,
    });
  } catch (error) {
    logger.error({ error, path: req.path, query: req.query }, 'Failed to get critical gaps');
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
});

/**
 * POST /api/electoral-accountability/pressure-campaign
 * Create electoral pressure campaign
 */
router.post('/pressure-campaign', async (req: Request, res: Response) => {
  try {
    const validated = createPressureCampaignSchema.parse(req.body);

    // TODO: Add authentication middleware to get user ID
    const userId = (req as any).user?.id || 'system';

    const campaign = await electoralAccountabilityService.createPressureCampaign({
      ...validated,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error({ error, path: req.path, body: req.body }, 'Failed to create pressure campaign');
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
});

/**
 * GET /api/electoral-accountability/mp-scorecard
 * Get comprehensive MP accountability scorecard
 */
router.get('/mp-scorecard', async (req: Request, res: Response) => {
  try {
    const validated = getMPScorecardSchema.parse({
      sponsorId: req.query.sponsorId,
      constituency: req.query.constituency,
    });

    const scorecard = await electoralAccountabilityService.getMPAccountabilityScorecard(
      validated.sponsorId,
      validated.constituency
    );

    res.json({
      success: true,
      data: scorecard,
    });
  } catch (error) {
    logger.error({ error, path: req.path, query: req.query }, 'Failed to get MP scorecard');
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
});

/**
 * GET /api/electoral-accountability/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    feature: 'electoral-accountability',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

export { router };
