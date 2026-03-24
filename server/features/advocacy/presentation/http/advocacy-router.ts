/**
 * Advocacy Coordination API Routes
 *
 * HTTP presentation layer for the advocacy feature.
 * Accepts application services via a factory function (dependency injection)
 * rather than instantiating them inline, keeping this layer free of
 * infrastructure concerns and `null as any` scaffolding.
 *
 * Usage:
 *   import { createAdvocacyRouter } from './advocacy-router';
 *   app.use('/advocacy', createAdvocacyRouter({ campaignService, ... }));
 */

import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';

import { logger } from '@server/infrastructure/observability';
import type { ActionFilters } from '@shared/types/domains/community/advocacy-types';

import type { ActionCoordinator } from '../../application/action-coordinator';
import type { CampaignService } from '../../application/campaign-service';
import type { CoalitionBuilder } from '../../application/coalition-builder';
import type { ImpactTracker } from '../../application/impact-tracker';
import type { CampaignStatus } from '../../domain/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Narrow an Express query value to string | undefined without `as any`. */
function queryStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Parse an integer query param, falling back to a default. */
function queryInt(value: unknown, fallback: number): number {
  const n = parseInt(queryStr(value) ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Type guard for valid action status values */
function isValidActionStatus(value: unknown): value is 'pending' | 'in_progress' | 'completed' | 'skipped' {
  return ['pending', 'in_progress', 'completed', 'skipped'].includes(value as string);
}

/** Type guard for valid action type values */
function isValidActionType(value: unknown): value is ActionFilters['actionType'] {
  const validTypes = ['contact_representative', 'attend_hearing', 'submit_comment', 'share_content', 'organize_meeting', 'petition_signature'];
  return typeof value === 'string' && validTypes.includes(value);
}

/** Type guard for valid impact metric types */
function isValidImpactType(value: unknown): value is 'bill_amended' | 'committee_feedback' | 'media_attention' | 'legislative_response' | 'public_awareness' {
  const validTypes = ['bill_amended', 'committee_feedback', 'media_attention', 'legislative_response', 'public_awareness'];
  return typeof value === 'string' && validTypes.includes(value);
}

/** Map error messages to appropriate HTTP status codes. */
function httpStatusForError(error: unknown): number {
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  if (msg.includes('not found'))    return 404;
  if (msg.includes('not authorized')) return 403;
  if (msg.includes('already'))      return 409;
  return 500;
}

// ── Factory ───────────────────────────────────────────────────────────────────

interface AdvocacyRouterDeps {
  campaignService:    CampaignService;
  actionCoordinator:  ActionCoordinator;
  impactTracker:      ImpactTracker;
  coalitionBuilder:   CoalitionBuilder;
}

export function createAdvocacyRouter({
  campaignService,
  actionCoordinator,
  impactTracker,
  coalitionBuilder,
}: AdvocacyRouterDeps): ExpressRouter {
  const router: ExpressRouter = Router();

  // ==========================================================================
  // Campaign Management
  // ==========================================================================

  /** POST /campaigns — create a new campaign */
  router.post('/campaigns', async (req, res) => {
    try {
      const userId   = req.user?.id ?? 'anonymous';
      const campaign = await campaignService.createCampaign(req.body, userId);
      res.status(201).json({ success: true, campaign });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to create campaign'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to create campaign' });
    }
  });

  /**
   * GET /campaigns — list campaigns with optional filters.
   *
   * NOTE: This route MUST be registered before /campaigns/:id so that the
   * static sub-paths /campaigns/search and /campaigns/trending are not
   * swallowed by the parameterized route.
   */
  router.get('/campaigns', async (req, res) => {
    try {
      const userId  = req.user?.id;
      const filters = {
        status:   queryStr(req.query.status) as CampaignStatus | undefined,
        bill_id:  queryStr(req.query.bill_id),
        category: queryStr(req.query.category),
      };
      const pagination = {
        page:  queryInt(req.query.page, 1),
        limit: queryInt(req.query.limit, 20),
      };

      const campaigns = await campaignService.getCampaigns(filters, pagination, userId);
      res.json({ success: true, campaigns, pagination });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get campaigns'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get campaigns' });
    }
  });

  /** GET /campaigns/search — search campaigns by text query (must precede /:id) */
  router.get('/campaigns/search', async (req, res) => {
    try {
      const query     = queryStr(req.query.q) ?? '';
      const campaigns = await campaignService.searchCampaigns(query);
      res.json({ success: true, campaigns });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to search campaigns'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to search campaigns' });
    }
  });

  /** GET /campaigns/trending — trending active campaigns (must precede /:id) */
  router.get('/campaigns/trending', async (req, res) => {
    try {
      const limit     = queryInt(req.query.limit, 10);
      const campaigns = await campaignService.getTrendingCampaigns(limit);
      res.json({ success: true, campaigns });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get trending campaigns'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get trending campaigns' });
    }
  });

  /** GET /campaigns/:id — get a single campaign */
  router.get('/campaigns/:id', async (req, res) => {
    try {
      const userId   = req.user?.id;
      const campaign = await campaignService.getCampaign(req.params.id, userId);
      res.json({ success: true, campaign });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get campaign'
      );
      res.status(httpStatusForError(error)).json({ error: 'Campaign not found' });
    }
  });

  /** PUT /campaigns/:id — update campaign details */
  router.put('/campaigns/:id', async (req, res) => {
    try {
      const userId   = req.user?.id ?? 'anonymous';
      const campaign = await campaignService.updateCampaign(req.params.id, req.body, userId);
      res.json({ success: true, campaign });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to update campaign'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to update campaign' });
    }
  });

  /** DELETE /campaigns/:id — delete a campaign */
  router.delete('/campaigns/:id', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      await campaignService.deleteCampaign(req.params.id, userId);
      res.json({ success: true, message: 'Campaign deleted' });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to delete campaign'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to delete campaign' });
    }
  });

  /** POST /campaigns/:id/join — join a campaign as a participant */
  router.post('/campaigns/:id/join', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      await campaignService.joinCampaign(req.params.id, userId);
      res.json({ success: true, message: 'Joined campaign' });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to join campaign'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to join campaign' });
    }
  });

  /** POST /campaigns/:id/leave — leave a campaign */
  router.post('/campaigns/:id/leave', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      await campaignService.leaveCampaign(req.params.id, userId);
      res.json({ success: true, message: 'Left campaign' });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to leave campaign'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to leave campaign' });
    }
  });

  /** GET /campaigns/:id/metrics — compute campaign metrics */
  router.get('/campaigns/:id/metrics', async (req, res) => {
    try {
      const userId  = req.user?.id ?? 'anonymous';
      const metrics = await campaignService.getCampaignMetrics(req.params.id, userId);
      res.json({ success: true, metrics });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get campaign metrics'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get campaign metrics' });
    }
  });

  /** GET /campaigns/:id/analytics — detailed campaign analytics */
  router.get('/campaigns/:id/analytics', async (req, res) => {
    try {
      const userId    = req.user?.id ?? 'anonymous';
      const analytics = await campaignService.getCampaignAnalytics(req.params.id, userId);
      res.json({ success: true, analytics });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get campaign analytics'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get campaign analytics' });
    }
  });

  // ==========================================================================
  // Bill-scoped Campaign Routes
  // ==========================================================================

  /** GET /bills/:billId/campaigns — campaigns associated with a bill */
  router.get('/bills/:billId/campaigns', async (req, res) => {
    try {
      const campaigns = await campaignService.getCampaignsByBill(req.params.billId);
      res.json({ success: true, campaigns });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get campaigns by bill'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get campaigns by bill' });
    }
  });

  // ==========================================================================
  // User-scoped Routes
  // ==========================================================================

  /** GET /users/:userId/campaigns — campaigns created by a user */
  router.get('/users/:userId/campaigns', async (req, res) => {
    try {
      const campaigns = await campaignService.getCampaignsByUser(req.params.userId);
      // Note: campaigns is an array — do NOT spread it into the response object
      res.json({ success: true, campaigns });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get user campaigns'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get user campaigns' });
    }
  });

  // ==========================================================================
  // Action Coordination
  // ==========================================================================

  /** POST /actions — create a new action */
  router.post('/actions', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      const action = await actionCoordinator.createAction(req.body, userId);
      res.status(201).json({ success: true, action });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to create action'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to create action' });
    }
  });

  /** GET /users/:userId/actions — actions belonging to a user */
  router.get('/users/:userId/actions', async (req, res) => {
    try {
      const statusStr = queryStr(req.query.status);
      const typeStr = queryStr(req.query.actionType);
      const filters = {
        status:     statusStr && isValidActionStatus(statusStr) ? statusStr : undefined,
        actionType: typeStr && isValidActionType(typeStr) ? typeStr : undefined,
      };
      const actions = await actionCoordinator.getUserActions(req.params.userId, filters);
      res.json({ success: true, actions });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get user actions'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get user actions' });
    }
  });

  /** GET /users/:userId/dashboard — user advocacy dashboard */
  router.get('/users/:userId/dashboard', async (req, res) => {
    try {
      const dashboard = await actionCoordinator.getUserDashboard(req.params.userId);
      res.json({ success: true, dashboard });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get user dashboard'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get user dashboard' });
    }
  });

  /** GET /users/:userId/recommended-actions — personalized action recommendations */
  router.get('/users/:userId/recommended-actions', async (req, res) => {
    try {
      const limit   = queryInt(req.query.limit, 10);
      const actions = await actionCoordinator.getRecommendedActions(req.params.userId, limit);
      res.json({ success: true, actions });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get recommended actions'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get recommended actions' });
    }
  });

  /** GET /campaigns/:id/actions — actions within a campaign */
  router.get('/campaigns/:id/actions', async (req, res) => {
    try {
      const userId  = req.user?.id ?? 'anonymous';
      const actions = await actionCoordinator.getCampaignActions(req.params.id, userId);
      res.json({ success: true, actions });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get campaign actions'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get campaign actions' });
    }
  });

  /** POST /actions/:id/start — transition action to in-progress */
  router.post('/actions/:id/start', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      const action = await actionCoordinator.startAction(req.params.id, userId);
      res.json({ success: true, action });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to start action'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to start action' });
    }
  });

  /** POST /actions/:id/complete — mark action as completed */
  router.post('/actions/:id/complete', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      const action = await actionCoordinator.completeAction(
        req.params.id,
        userId,
        req.body.outcome,
        req.body.actualTimeMinutes
      );
      res.json({ success: true, action });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to complete action'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to complete action' });
    }
  });

  /** POST /actions/:id/skip — skip an action with an optional reason */
  router.post('/actions/:id/skip', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      const action = await actionCoordinator.skipAction(req.params.id, userId, req.body.reason);
      res.json({ success: true, action });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to skip action'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to skip action' });
    }
  });

  /** POST /actions/:id/feedback — submit feedback for an action */
  router.post('/actions/:id/feedback', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      const action = await actionCoordinator.addActionFeedback(req.params.id, userId, req.body);
      res.json({ success: true, action });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to add action feedback'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to add action feedback' });
    }
  });

  /** GET /action-templates — reusable action templates */
  router.get('/action-templates', async (req, res) => {
    try {
      const typeStr = queryStr(req.query.actionType);
      const actionType = typeStr && isValidActionType(typeStr) ? typeStr : undefined;
      const templates  = await actionCoordinator.getActionTemplates(actionType);
      res.json({ success: true, templates });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get action templates'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get action templates' });
    }
  });

  // ==========================================================================
  // Impact Tracking
  // ==========================================================================

  /** POST /campaigns/:id/impact — record a campaign impact event */
  router.post('/campaigns/:id/impact', async (req, res) => {
    try {
      const userId = req.user?.id ?? 'anonymous';
      const impact = await impactTracker.recordImpact(
        req.params.id,
        req.body.impactType,
        req.body.value,
        req.body.description,
        req.body.evidenceLinks,
        userId
      );
      res.status(201).json({ success: true, impact });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to record impact'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to record impact' });
    }
  });

  /** GET /campaigns/:id/impact — aggregated impact metrics for a campaign */
  router.get('/campaigns/:id/impact', async (req, res) => {
    try {
      const metrics = await impactTracker.getCampaignImpactMetrics(req.params.id);
      res.json({ success: true, metrics });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get campaign impact metrics'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get campaign impact metrics' });
    }
  });

  /** GET /campaigns/:id/impact/assessment — full impact assessment report */
  router.get('/campaigns/:id/impact/assessment', async (req, res) => {
    try {
      const assessment = await impactTracker.generateImpactAssessment(req.params.id);
      res.json({ success: true, assessment });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to generate impact assessment'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to generate impact assessment' });
    }
  });

  /** GET /impact/statistics — cross-campaign impact statistics */
  router.get('/impact/statistics', async (req, res) => {
    try {
      const impactStr = queryStr(req.query.impactType);
      const filters = {
        bill_id:    queryStr(req.query.bill_id),
        impactType: impactStr && isValidImpactType(impactStr) ? impactStr : undefined,
      };
      const statistics = await impactTracker.getImpactStatistics(filters);
      res.json({ success: true, statistics });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get impact statistics'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get impact statistics' });
    }
  });

  // ==========================================================================
  // Coalition Building
  // ==========================================================================

  /**
   * GET /users/:userId/coalition-opportunities
   *
   * TS2551 fix: the method on CoalitionBuilder is `identifyCoalitionOpportunities`,
   * not `findCoalitionOpportunities`.
   */
  router.get('/users/:userId/coalition-opportunities', async (req, res) => {
    try {
      const opportunities = await coalitionBuilder.identifyCoalitionOpportunities(req.params.userId);
      res.json({ success: true, opportunities });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to find coalition opportunities'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to find coalition opportunities' });
    }
  });

  /**
   * GET /campaigns/:id/coalition-recommendations
   *
   * TS2339: `CoalitionBuilder.getCoalitionRecommendations` does not yet exist.
   * TODO: Add `getCoalitionRecommendations(campaignId: string)` to CoalitionBuilder,
   *       then wire it in here and remove the 501 response.
   */
  router.get('/campaigns/:id/coalition-recommendations', async (_req, res) => {
    res.status(501).json({ error: 'Coalition recommendations not yet implemented' });
  });

  // ==========================================================================
  // Statistics and Analytics
  // ==========================================================================

  /** GET /statistics/campaigns — aggregate dashboard statistics */
  router.get('/statistics/campaigns', async (_req, res) => {
    try {
      const stats = await campaignService.getCampaignStats();
      res.json({ success: true, statistics: stats });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get campaign statistics'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get campaign statistics' });
    }
  });

  /** GET /analytics/actions — action analytics with optional filters */
  router.get('/analytics/actions', async (req, res) => {
    try {
      const statusStr = queryStr(req.query.status);
      const filters = {
        campaign_id: queryStr(req.query.campaign_id),
        status:      statusStr && isValidActionStatus(statusStr) ? statusStr : undefined,
      };
      const analytics = await actionCoordinator.getActionAnalytics(filters);
      res.json({ success: true, analytics });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), component: 'AdvocacyRouter' },
        'Failed to get action analytics'
      );
      res.status(httpStatusForError(error)).json({ error: 'Failed to get action analytics' });
    }
  });

  return router;
}