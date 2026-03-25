/**
 * Advocacy Coordination API Routes
 *
 * HTTP presentation layer for the advocacy feature.
 * Accepts application services via a factory function (dependency injection)
 * rather than instantiating them inline, keeping this layer free of
 * infrastructure concerns.
 *
 * Usage:
 *   import { createAdvocacyRouter } from './advocacy-router';
 *   app.use('/advocacy', createAdvocacyRouter({ campaignService, ... }));
 */

import { logger } from '@server/infrastructure/observability';
import { validateSchema } from '@server/infrastructure/validation/middleware';
import type { ActionFilters } from '@shared/types/domains/community/advocacy-types';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';

import type { ActionCoordinator } from '../../application/action-coordinator';
import {
  ActionFeedbackSchema,
  CompleteActionSchema,
  CreateCampaignSchema,
  RecordActionSchema,
  RecordImpactSchema,
  SkipActionSchema,
  UpdateCampaignSchema,
} from '../../application/advocacy-validation.schemas';
import type { CampaignService } from '../../application/campaign-service';
import type { CoalitionBuilder } from '../../application/coalition-builder';
import type { ImpactTracker } from '../../application/impact-tracker';
import type { CampaignStatus } from '../../domain/types';

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Narrow an Express query value to `string | undefined` without casting. */
function queryStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Parse an integer query param, falling back to a default. */
function queryInt(value: unknown, fallback: number): number {
  const n = parseInt(queryStr(value) ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Returns the authenticated user's id, or `'anonymous'` when unauthenticated. */
function resolveUserId(req: Request): string {
  return req.user?.id ?? 'anonymous';
}

/**
 * Extract a named route parameter as a guaranteed `string`.
 *
 * Express always populates `req.params[key]` when the route pattern contains
 * that segment, so this will never throw at runtime.  The helper exists solely
 * to satisfy the TypeScript compiler when `req.params` is typed as
 * `Record<string, string | undefined>` under strict settings.
 */
function requireParam(req: Request, key: string): string {
  const value = req.params[key];
  if (value === undefined) {
    // Should be unreachable — route would not have matched without the segment.
    throw Object.assign(new Error(`Route param '${key}' not found`), { status: 404 });
  }
  return value;
}

/**
 * Factory that produces a type-safe membership guard.
 *
 * @example
 *   const isStatus = isOneOf(['pending', 'completed'] as const);
 *   if (isStatus(raw)) { ... } // raw is narrowed to 'pending' | 'completed'
 */
function isOneOf<T extends string>(values: readonly T[]) {
  return (value: unknown): value is T =>
    typeof value === 'string' && (values as readonly string[]).includes(value);
}

const isValidActionStatus = isOneOf([
  'pending',
  'in_progress',
  'completed',
  'skipped',
] as const);

const isValidActionType = isOneOf([
  'contact_representative',
  'attend_hearing',
  'submit_comment',
  'share_content',
  'organize_meeting',
  'petition_signature',
] as const satisfies readonly NonNullable<ActionFilters['actionType']>[]);

const isValidImpactType = isOneOf([
  'bill_amended',
  'committee_feedback',
  'media_attention',
  'legislative_response',
  'public_awareness',
] as const);

/** Map error messages to appropriate HTTP status codes. */
function httpStatusForError(error: unknown): number {
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  if (msg.includes('not found'))      return 404;
  if (msg.includes('not authorized')) return 403;
  if (msg.includes('already'))        return 409;
  return 500;
}

/**
 * Wraps an async route handler, logging failures and forwarding the
 * appropriate HTTP status code.  Eliminates per-route try/catch boilerplate.
 *
 * @param label  Short description used in the error log (e.g. 'create campaign').
 * @param fn     The async handler body — receives `(req, res)` like a normal handler.
 */
function asyncRoute(
  label: string,
  fn: (req: Request, res: Response) => Promise<void>,
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      logger.error(
        {
          error:     error instanceof Error ? error.message : String(error),
          component: 'AdvocacyRouter',
        },
        `Failed to ${label}`,
      );
      res.status(httpStatusForError(error)).json({ error: `Failed to ${label}` });
    }
  };
}

// ── Factory ───────────────────────────────────────────────────────────────────

interface AdvocacyRouterDeps {
  campaignService:   CampaignService;
  actionCoordinator: ActionCoordinator;
  impactTracker:     ImpactTracker;
  coalitionBuilder:  CoalitionBuilder;
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
  router.post(
    '/campaigns',
    validateSchema(CreateCampaignSchema),
    asyncRoute('create campaign', async (req, res) => {
      const campaign = await campaignService.createCampaign(req.body, resolveUserId(req));
      res.status(201).json({ success: true, campaign });
    }),
  );

  /**
   * GET /campaigns — list campaigns with optional filters.
   *
   * NOTE: registered before /campaigns/:id so that the static sub-paths
   * /campaigns/search and /campaigns/trending are not swallowed by the
   * parameterized route.
   */
  router.get(
    '/campaigns',
    asyncRoute('get campaigns', async (req, res) => {
      const filters = {
        status:   queryStr(req.query.status) as CampaignStatus | undefined,
        bill_id:  queryStr(req.query.bill_id),
        category: queryStr(req.query.category),
      };
      const pagination = {
        page:  queryInt(req.query.page, 1),
        limit: queryInt(req.query.limit, 20),
      };
      const campaigns = await campaignService.getCampaigns(filters, pagination, req.user?.id);
      res.json({ success: true, campaigns, pagination });
    }),
  );

  /** GET /campaigns/search — search campaigns by text query (must precede /:id) */
  router.get(
    '/campaigns/search',
    asyncRoute('search campaigns', async (req, res) => {
      const query     = queryStr(req.query.q) ?? '';
      const campaigns = await campaignService.searchCampaigns(query);
      res.json({ success: true, campaigns });
    }),
  );

  /** GET /campaigns/trending — trending active campaigns (must precede /:id) */
  router.get(
    '/campaigns/trending',
    asyncRoute('get trending campaigns', async (req, res) => {
      const limit     = queryInt(req.query.limit, 10);
      const campaigns = await campaignService.getTrendingCampaigns(limit);
      res.json({ success: true, campaigns });
    }),
  );

  /** GET /campaigns/:id — get a single campaign */
  router.get(
    '/campaigns/:id',
    asyncRoute('get campaign', async (req, res) => {
      const campaign = await campaignService.getCampaign(requireParam(req, 'id'), req.user?.id);
      res.json({ success: true, campaign });
    }),
  );

  /** PUT /campaigns/:id — update campaign details */
  router.put(
    '/campaigns/:id',
    validateSchema(UpdateCampaignSchema),
    asyncRoute('update campaign', async (req, res) => {
      const campaign = await campaignService.updateCampaign(requireParam(req, 'id'), req.body, resolveUserId(req));
      res.json({ success: true, campaign });
    }),
  );

  /** DELETE /campaigns/:id — delete a campaign */
  router.delete(
    '/campaigns/:id',
    asyncRoute('delete campaign', async (req, res) => {
      await campaignService.deleteCampaign(requireParam(req, 'id'), resolveUserId(req));
      res.json({ success: true, message: 'Campaign deleted' });
    }),
  );

  /** POST /campaigns/:id/join — join a campaign as a participant */
  router.post(
    '/campaigns/:id/join',
    asyncRoute('join campaign', async (req, res) => {
      await campaignService.joinCampaign(requireParam(req, 'id'), resolveUserId(req));
      res.json({ success: true, message: 'Joined campaign' });
    }),
  );

  /** POST /campaigns/:id/leave — leave a campaign */
  router.post(
    '/campaigns/:id/leave',
    asyncRoute('leave campaign', async (req, res) => {
      await campaignService.leaveCampaign(requireParam(req, 'id'), resolveUserId(req));
      res.json({ success: true, message: 'Left campaign' });
    }),
  );

  /** GET /campaigns/:id/metrics — compute campaign metrics */
  router.get(
    '/campaigns/:id/metrics',
    asyncRoute('get campaign metrics', async (req, res) => {
      const metrics = await campaignService.getCampaignMetrics(requireParam(req, 'id'), resolveUserId(req));
      res.json({ success: true, metrics });
    }),
  );

  /** GET /campaigns/:id/analytics — detailed campaign analytics */
  router.get(
    '/campaigns/:id/analytics',
    asyncRoute('get campaign analytics', async (req, res) => {
      const analytics = await campaignService.getCampaignAnalytics(requireParam(req, 'id'), resolveUserId(req));
      res.json({ success: true, analytics });
    }),
  );

  // ==========================================================================
  // Bill-scoped Campaign Routes
  // ==========================================================================

  /** GET /bills/:billId/campaigns — campaigns associated with a bill */
  router.get(
    '/bills/:billId/campaigns',
    asyncRoute('get campaigns by bill', async (req, res) => {
      const campaigns = await campaignService.getCampaignsByBill(requireParam(req, 'billId'));
      res.json({ success: true, campaigns });
    }),
  );

  // ==========================================================================
  // User-scoped Routes
  // ==========================================================================

  /** GET /users/:userId/campaigns — campaigns created by a user */
  router.get(
    '/users/:userId/campaigns',
    asyncRoute('get user campaigns', async (req, res) => {
      const campaigns = await campaignService.getCampaignsByUser(requireParam(req, 'userId'));
      res.json({ success: true, campaigns });
    }),
  );

  // ==========================================================================
  // Action Coordination
  // ==========================================================================

  /** POST /actions — create a new action */
  router.post(
    '/actions',
    validateSchema(RecordActionSchema),
    asyncRoute('create action', async (req, res) => {
      const action = await actionCoordinator.createAction(req.body, resolveUserId(req));
      res.status(201).json({ success: true, action });
    }),
  );

  /** GET /users/:userId/actions — actions belonging to a user */
  router.get(
    '/users/:userId/actions',
    asyncRoute('get user actions', async (req, res) => {
      const statusRaw = queryStr(req.query.status);
      const typeRaw   = queryStr(req.query.actionType);
      const filters: ActionFilters = {
        status:     statusRaw && isValidActionStatus(statusRaw) ? statusRaw : undefined,
        actionType: typeRaw   && isValidActionType(typeRaw)     ? typeRaw   : undefined,
      };
      const actions = await actionCoordinator.getUserActions(requireParam(req, 'userId'), filters);
      res.json({ success: true, actions });
    }),
  );

  /** GET /users/:userId/dashboard — user advocacy dashboard */
  router.get(
    '/users/:userId/dashboard',
    asyncRoute('get user dashboard', async (req, res) => {
      const dashboard = await actionCoordinator.getUserDashboard(requireParam(req, 'userId'));
      res.json({ success: true, dashboard });
    }),
  );

  /** GET /users/:userId/recommended-actions — personalized action recommendations */
  router.get(
    '/users/:userId/recommended-actions',
    asyncRoute('get recommended actions', async (req, res) => {
      const limit   = queryInt(req.query.limit, 10);
      const actions = await actionCoordinator.getRecommendedActions(requireParam(req, 'userId'), limit);
      res.json({ success: true, actions });
    }),
  );

  /** GET /campaigns/:id/actions — actions within a campaign */
  router.get(
    '/campaigns/:id/actions',
    asyncRoute('get campaign actions', async (req, res) => {
      const actions = await actionCoordinator.getCampaignActions(requireParam(req, 'id'), resolveUserId(req));
      res.json({ success: true, actions });
    }),
  );

  /** POST /actions/:id/start — transition action to in-progress */
  router.post(
    '/actions/:id/start',
    asyncRoute('start action', async (req, res) => {
      const action = await actionCoordinator.startAction(requireParam(req, 'id'), resolveUserId(req));
      res.json({ success: true, action });
    }),
  );

  /** POST /actions/:id/complete — mark action as completed */
  router.post(
    '/actions/:id/complete',
    validateSchema(CompleteActionSchema),
    asyncRoute('complete action', async (req, res) => {
      const action = await actionCoordinator.completeAction(
        requireParam(req, 'id'),
        resolveUserId(req),
        req.body.outcome,
        req.body.actualTimeMinutes,
      );
      res.json({ success: true, action });
    }),
  );

  /** POST /actions/:id/skip — skip an action with an optional reason */
  router.post(
    '/actions/:id/skip',
    validateSchema(SkipActionSchema),
    asyncRoute('skip action', async (req, res) => {
      const action = await actionCoordinator.skipAction(requireParam(req, 'id'), resolveUserId(req), req.body.reason);
      res.json({ success: true, action });
    }),
  );

  /** POST /actions/:id/feedback — submit feedback for an action */
  router.post(
    '/actions/:id/feedback',
    validateSchema(ActionFeedbackSchema),
    asyncRoute('add action feedback', async (req, res) => {
      const action = await actionCoordinator.addActionFeedback(requireParam(req, 'id'), resolveUserId(req), req.body);
      res.json({ success: true, action });
    }),
  );

  /** GET /action-templates — reusable action templates */
  router.get(
    '/action-templates',
    asyncRoute('get action templates', async (req, res) => {
      const typeRaw    = queryStr(req.query.actionType);
      const actionType = typeRaw && isValidActionType(typeRaw) ? typeRaw : undefined;
      const templates  = await actionCoordinator.getActionTemplates(actionType);
      res.json({ success: true, templates });
    }),
  );

  // ==========================================================================
  // Impact Tracking
  // ==========================================================================

  /** POST /campaigns/:id/impact — record a campaign impact event */
  router.post(
    '/campaigns/:id/impact',
    validateSchema(RecordImpactSchema),
    asyncRoute('record impact', async (req, res) => {
      const impact = await impactTracker.recordImpact(
        requireParam(req, 'id'),
        req.body.impactType,
        req.body.value,
        req.body.description,
        req.body.evidenceLinks,
        resolveUserId(req),
      );
      res.status(201).json({ success: true, impact });
    }),
  );

  /** GET /campaigns/:id/impact — aggregated impact metrics for a campaign */
  router.get(
    '/campaigns/:id/impact',
    asyncRoute('get campaign impact metrics', async (req, res) => {
      const metrics = await impactTracker.getCampaignImpactMetrics(requireParam(req, 'id'));
      res.json({ success: true, metrics });
    }),
  );

  /** GET /campaigns/:id/impact/assessment — full impact assessment report */
  router.get(
    '/campaigns/:id/impact/assessment',
    asyncRoute('generate impact assessment', async (req, res) => {
      const assessment = await impactTracker.generateImpactAssessment(requireParam(req, 'id'));
      res.json({ success: true, assessment });
    }),
  );

  /** GET /impact/statistics — cross-campaign impact statistics */
  router.get(
    '/impact/statistics',
    asyncRoute('get impact statistics', async (req, res) => {
      const impactRaw = queryStr(req.query.impactType);
      const filters = {
        bill_id:    queryStr(req.query.bill_id),
        impactType: impactRaw && isValidImpactType(impactRaw) ? impactRaw : undefined,
      };
      const statistics = await impactTracker.getImpactStatistics(filters);
      res.json({ success: true, statistics });
    }),
  );

  // ==========================================================================
  // Coalition Building
  // ==========================================================================

  /** GET /users/:userId/coalition-opportunities — coalition opportunities for a user */
  router.get(
    '/users/:userId/coalition-opportunities',
    asyncRoute('find coalition opportunities', async (req, res) => {
      const opportunities = await coalitionBuilder.identifyCoalitionOpportunities(requireParam(req, 'userId'));
      res.json({ success: true, opportunities });
    }),
  );

  /** GET /campaigns/:id/coalition-recommendations — coalition recommendations for a campaign */
  router.get(
    '/campaigns/:id/coalition-recommendations',
    asyncRoute('get coalition recommendations', async (req, res) => {
      const recommendations = await coalitionBuilder.getCoalitionRecommendations(requireParam(req, 'id'));
      res.json({ success: true, recommendations });
    }),
  );

  // ==========================================================================
  // Statistics and Analytics
  // ==========================================================================

  /** GET /statistics/campaigns — aggregate dashboard statistics */
  router.get(
    '/statistics/campaigns',
    asyncRoute('get campaign statistics', async (_req, res) => {
      const stats = await campaignService.getCampaignStats();
      res.json({ success: true, statistics: stats });
    }),
  );

  /** GET /analytics/actions — action analytics with optional filters */
  router.get(
    '/analytics/actions',
    asyncRoute('get action analytics', async (req, res) => {
      const statusRaw = queryStr(req.query.status);
      const filters = {
        campaign_id: queryStr(req.query.campaign_id),
        status:      statusRaw && isValidActionStatus(statusRaw) ? statusRaw : undefined,
      };
      const analytics = await actionCoordinator.getActionAnalytics(filters);
      res.json({ success: true, analytics });
    }),
  );

  return router;
}