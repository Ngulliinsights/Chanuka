import { logger } from '@server/infrastructure/observability';
import { asyncHandler } from '@server/middleware/error-management';
import { Router, Request, Response } from 'express';

import { SponsorshipAnalysisService } from './application/sponsorship-analysis.service';

// ---------------------------------------------------------------------------
// Router setup
// ---------------------------------------------------------------------------

const router: Router = Router();
const analysisService = new SponsorshipAnalysisService();

// ---------------------------------------------------------------------------
// Response helpers — plain Express shapes; avoids broken @shared/types/api deps
// ---------------------------------------------------------------------------

function ok(res: Response, data: unknown): Response {
  return res.json({ success: true, data });
}

function fail(res: Response, message: string, status = 500): Response {
  return res.status(status).json({ success: false, error: { code: 'INTERNAL_ERROR', message } });
}

// ---------------------------------------------------------------------------
// Route factory — all four endpoints share the same try/catch skeleton
// ---------------------------------------------------------------------------

type AnalysisHandler = (billId: number) => Promise<unknown>;

function sponsorshipRoute(handler: AnalysisHandler, errorMessage: string) {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const billId = parseInt(req.params.bill_id ?? '', 10);

    if (isNaN(billId) || billId <= 0) {
      fail(res, 'bill_id must be a valid positive integer', 400);
      return;
    }

    try {
      const data = await handler(billId);
      ok(res, data);
    } catch (error) {
      logger.error({ component: 'SponsorshipRoutes', error }, errorMessage);
      fail(res, errorMessage);
    }
  });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET /bills/:bill_id/sponsorship-analysis — comprehensive sponsorship overview */
router.get(
  '/bills/:bill_id/sponsorship-analysis',
  sponsorshipRoute(
    (id) => analysisService.getComprehensiveAnalysis(id),
    'Failed to fetch sponsorship analysis',
  ),
);

/** GET /bills/:bill_id/sponsorship-analysis/primary-sponsor */
router.get(
  '/bills/:bill_id/sponsorship-analysis/primary-sponsor',
  sponsorshipRoute(
    (id) => analysisService.getPrimarySponsorAnalysis(id),
    'Failed to fetch primary sponsor analysis',
  ),
);

/** GET /bills/:bill_id/sponsorship-analysis/co-sponsors */
router.get(
  '/bills/:bill_id/sponsorship-analysis/co-sponsors',
  sponsorshipRoute(
    (id) => analysisService.getCoSponsorsAnalysis(id),
    'Failed to fetch co-sponsors analysis',
  ),
);

/** GET /bills/:bill_id/sponsorship-analysis/financial-network */
router.get(
  '/bills/:bill_id/sponsorship-analysis/financial-network',
  sponsorshipRoute(
    (id) => analysisService.getFinancialNetworkAnalysis(id),
    'Failed to fetch financial network analysis',
  ),
);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { router };

/**
 * Mounts sponsorship routes onto an existing router instance.
 * Use this when composing routes in a parent router rather than
 * mounting the standalone `router` export.
 */
export function setupSponsorshipRoutes(routerInstance: Router): void {
  routerInstance.use(router);
}