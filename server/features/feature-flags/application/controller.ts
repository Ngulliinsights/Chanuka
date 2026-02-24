// ============================================================================
// FEATURE FLAGS CONTROLLER - HTTP Request Handlers
// ============================================================================

import { Request, Response } from 'express';
import { FeatureFlagService } from '../domain/service';
import { logger } from '@server/infrastructure/observability';

export class FeatureFlagController {
  private service: FeatureFlagService;

  constructor(service?: FeatureFlagService) {
    this.service = service || new FeatureFlagService();
  }

  // ============================================================================
  // FLAG MANAGEMENT
  // ============================================================================

  createFlag = async (req: Request, res: Response): Promise<void> => {
    try {
      const flag = await this.service.createFlag(req.body);
      res.status(201).json({ success: true, data: flag });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to create flag');
      res.status(500).json({ success: false, error: 'Failed to create feature flag' });
    }
  };

  getFlag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const flag = await this.service.getFlag(name);

      if (!flag) {
        res.status(404).json({ success: false, error: 'Feature flag not found' });
        return;
      }

      res.json({ success: true, data: flag });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to get flag');
      res.status(500).json({ success: false, error: 'Failed to get feature flag' });
    }
  };

  getAllFlags = async (_req: Request, res: Response): Promise<void> => {
    try {
      const flags = await this.service.getAllFlags();
      res.json({ success: true, data: flags });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to get flags');
      res.status(500).json({ success: false, error: 'Failed to get feature flags' });
    }
  };

  updateFlag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const flag = await this.service.updateFlag(name, req.body);

      if (!flag) {
        res.status(404).json({ success: false, error: 'Feature flag not found' });
        return;
      }

      res.json({ success: true, data: flag });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to update flag');
      res.status(500).json({ success: false, error: 'Failed to update feature flag' });
    }
  };

  deleteFlag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const deleted = await this.service.deleteFlag(name);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Feature flag not found' });
        return;
      }

      res.json({ success: true, message: 'Feature flag deleted' });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to delete flag');
      res.status(500).json({ success: false, error: 'Failed to delete feature flag' });
    }
  };

  toggleFlag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({ success: false, error: 'enabled must be a boolean' });
        return;
      }

      const flag = await this.service.toggleFlag(name, enabled);

      if (!flag) {
        res.status(404).json({ success: false, error: 'Feature flag not found' });
        return;
      }

      res.json({ success: true, data: flag });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to toggle flag');
      res.status(500).json({ success: false, error: 'Failed to toggle feature flag' });
    }
  };

  updateRollout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const { percentage } = req.body;

      if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
        res.status(400).json({ success: false, error: 'percentage must be between 0 and 100' });
        return;
      }

      const flag = await this.service.updateRolloutPercentage(name, percentage);

      if (!flag) {
        res.status(404).json({ success: false, error: 'Feature flag not found' });
        return;
      }

      res.json({ success: true, data: flag });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to update rollout');
      res.status(500).json({ success: false, error: 'Failed to update rollout percentage' });
    }
  };

  // ============================================================================
  // FLAG EVALUATION
  // ============================================================================

  evaluateFlag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const context = {
        userId: req.body.userId || req.user?.id,
        userAttributes: req.body.userAttributes,
        environment: process.env.NODE_ENV
      };

      const result = await this.service.isEnabled(name, context);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to evaluate flag');
      res.status(500).json({ success: false, error: 'Failed to evaluate feature flag' });
    }
  };

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  getAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const analytics = await this.service.getAnalytics(name, start, end);

      if (!analytics) {
        res.status(404).json({ success: false, error: 'Feature flag not found' });
        return;
      }

      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error({ component: 'FeatureFlagController', error }, 'Failed to get analytics');
      res.status(500).json({ success: false, error: 'Failed to get analytics' });
    }
  };
}
