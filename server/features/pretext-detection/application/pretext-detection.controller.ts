/**
 * Pretext Detection Controller
 * 
 * HTTP request handlers for pretext detection endpoints
 */

import { Request, Response } from 'express';
import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import { PretextDetectionService } from './pretext-detection.service';

export class PretextDetectionController {
  private service: PretextDetectionService;

  constructor() {
    this.service = new PretextDetectionService();
  }

  /**
   * POST /api/pretext-detection/analyze
   * Analyze a bill for pretext indicators
   */
  analyze = async (req: Request, res: Response): Promise<void> => {
    try {
      const { billId, force } = req.body;

      if (!billId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'billId is required'
        });
        return;
      }

      const result = await this.service.analyze({ billId, force });

      res.json(result);
    } catch (error) {
      errorTracker.trackRequestError(error as Error, req, 'high', 'business_logic');
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/pretext-detection/alerts
   * Get pretext alerts
   */
  getAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, limit } = req.query;

      const alerts = await this.service.getAlerts({
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json(alerts);
    } catch (error) {
      errorTracker.trackRequestError(error as Error, req, 'medium', 'business_logic');
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * POST /api/pretext-detection/review
   * Review a pretext alert
   */
  reviewAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId, status, notes } = req.body;
      const reviewedBy = (req as any).user?.id || 'system';

      if (!alertId || !status) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'alertId and status are required'
        });
        return;
      }

      if (!['approved', 'rejected'].includes(status)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'status must be either "approved" or "rejected"'
        });
        return;
      }

      await this.service.reviewAlert({
        alertId,
        status,
        notes,
        reviewedBy
      });

      res.json({ success: true });
    } catch (error) {
      errorTracker.trackRequestError(error as Error, req, 'medium', 'business_logic');
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/pretext-detection/analytics
   * Get pretext detection analytics
   */
  getAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const analytics = await this.service.getAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(analytics);
    } catch (error) {
      errorTracker.trackRequestError(error as Error, req, 'medium', 'business_logic');
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
