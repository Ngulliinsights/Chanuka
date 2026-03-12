import { NextFunction, Request, Response, Router } from 'express';

import type { AuthenticatedRequest } from '@server/middleware/auth';
import { VotingPatternAnalysisService } from '@server/features/bills/application/voting-pattern-analysis.service';
import { logger } from '@server/infrastructure/observability';
import { sponsors } from '@server/infrastructure/schema';

// ─── Service singleton ────────────────────────────────────────────────────────

const votingPatternAnalysisService = new VotingPatternAnalysisService();

// ─── Domain types ─────────────────────────────────────────────────────────────
// Typed against service return shapes so the compiler catches drift early.
// Replace with the service's exported types once they are publicly surfaced.

interface VotingPattern {
  sponsor_id: number;
  totalVotes: number;
  votingConsistency: number;
  predictedVotes: unknown[];
  anomalies: unknown[];
}

interface ComparativeAnalysis {
  alignmentScores: Record<string, unknown>;
}

// ─── Response helpers ─────────────────────────────────────────────────────────
// Inline shapes used while UnifiedApiResponse is not yet exported from
// @shared/types/api. Swap these out once the shared type is available.

const ok = <T>(data: T) => ({ success: true, data } as const);

const fail = (code: string, message: string) =>
  ({ success: false, error: { code, message } } as const);

// ─── Router ───────────────────────────────────────────────────────────────────

const router: Router = Router();

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Parse and validate a positive integer route/query parameter.
 * Returns a discriminated union so callers can narrow on `.valid`.
 */
function parseIntParam(
  value: string,
  paramName: string,
): { valid: true; value: number } | { valid: false; error: string } {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: `${paramName} must be a valid positive integer` };
  }
  return { valid: true, value: parsed };
}

/**
 * Centralised error handler that maps domain errors to appropriate HTTP responses.
 * Keeping this separate from route handlers maintains consistent response shapes.
 */
function handleRouteError(
  res: Response,
  error: unknown,
  context: string,
  userId?: string,
): Response {
  logger.error(
    {
      component: 'VotingPatternAnalysisRouter',
      context,
      userId,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      error,
    },
    `Error in ${context}`,
  );

  if (error instanceof Error && error.message.includes('not found')) {
    return res.status(404).json(fail('NOT_FOUND', error.message));
  }
  if (error instanceof Error && error.message.includes('must be')) {
    return res.status(400).json(fail('VALIDATION_ERROR', error.message));
  }
  return res.status(500).json(fail('INTERNAL_ERROR', `Failed to ${context.toLowerCase()}`));
}

/**
 * Wraps an async route handler so unhandled rejections are forwarded to
 * Express's error middleware instead of crashing the process.
 */
function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Non-blocking security audit log.
 * Failures are swallowed so the audit trail never degrades the response path.
 *
 * TODO: replace logger stub with securityAuditService.logDataAccess once
 * @server/security/security-audit-service resolves correctly.
 */
async function auditDataAccess(
  resource: string,
  userId?: string,
  count?: number,
): Promise<void> {
  try {
    logger.debug({ resource, userId, count }, 'data-access audit');
  } catch {
    // intentional no-op — audit failures must never block API responses
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/voting-patterns/bills/:id
 *
 * Returns voting patterns for all sponsors with a voting record,
 * contextualised against the requested bill.
 */
router.get(
  '/bills/:id',
  asyncHandler(async (req, res) => {
    const idResult = parseIntParam(req.params.id ?? '', 'Bill ID');
    if (!idResult.valid) {
      return res.status(400).json(fail('VALIDATION_ERROR', idResult.error));
    }

    const allPatterns: VotingPattern[] =
      await votingPatternAnalysisService.analyzeVotingPatterns();

    const relevantPatterns = allPatterns.filter((p) => p.totalVotes > 0);

    void auditDataAccess(
      `bill-voting-patterns:${idResult.value}`,
      req.user?.id ? String(req.user.id) : undefined,
      relevantPatterns.length,
    );

    const averageConsistency =
      relevantPatterns.length > 0
        ? relevantPatterns.reduce((sum, p) => sum + p.votingConsistency, 0) /
          relevantPatterns.length
        : 0;

    return res.json(
      ok({
        bill_id: idResult.value,
        votingPatterns: relevantPatterns,
        analysis: {
          totalSponsorsAnalyzed: relevantPatterns.length,
          averageConsistency,
          message:
            relevantPatterns.length === 0
              ? 'No voting pattern data available for analysis'
              : `Analysis based on ${relevantPatterns.length} sponsors with voting records`,
        },
      }),
    );
  }),
);

/**
 * GET /api/voting-patterns/sponsors/:id
 *
 * Returns a full voting pattern analysis for a single sponsor.
 */
router.get(
  '/sponsors/:id',
  asyncHandler(async (req, res) => {
    const idResult = parseIntParam(req.params.id ?? '', 'Sponsor ID');
    if (!idResult.valid) {
      return res.status(400).json(fail('VALIDATION_ERROR', idResult.error));
    }

    const analysis: VotingPattern[] =
      await votingPatternAnalysisService.analyzeVotingPatterns(idResult.value);

    if (!analysis || analysis.length === 0) {
      return res
        .status(404)
        .json(
          fail('NOT_FOUND', `No voting pattern analysis found for sponsor ${idResult.value}`),
        );
    }

    void auditDataAccess(
      `sponsor-voting-patterns:${idResult.value}`,
      req.user?.id ? String(req.user.id) : undefined,
      1,
    );

    return res.json(
      ok({ sponsor: analysis[0], message: 'Voting pattern analysis retrieved successfully' }),
    );
  }),
);

/**
 * GET /api/voting-patterns/analysis
 *
 * Returns comprehensive voting pattern analysis across all active sponsors.
 */
router.get(
  '/analysis',
  asyncHandler(async (req, res) => {
    const analysis: VotingPattern[] =
      await votingPatternAnalysisService.analyzeVotingPatterns();

    void auditDataAccess(
      'voting-patterns:analysis',
      req.user?.id ? String(req.user.id) : undefined,
      analysis.length,
    );

    const averageConsistency =
      analysis.length > 0
        ? analysis.reduce((sum, a) => sum + a.votingConsistency, 0) / analysis.length
        : 0;

    return res.json(
      ok({
        analysis,
        summary: {
          totalSponsors: analysis.length,
          averageConsistency,
          totalVotes: analysis.reduce((sum, a) => sum + a.totalVotes, 0),
          sponsorsWithPredictions: analysis.filter((a) => a.predictedVotes.length > 0).length,
          sponsorsWithAnomalies: analysis.filter((a) => a.anomalies.length > 0).length,
        },
        message:
          analysis.length === 0
            ? 'No voting pattern data available'
            : `Comprehensive analysis of ${analysis.length} sponsors`,
      }),
    );
  }),
);

/**
 * GET /api/voting-patterns/correlations
 *
 * Correlation analysis between sponsors and voting behaviour.
 *
 * Query parameters:
 *   sponsor_id         – correlation target sponsor (optional; falls back to first active)
 *   comparisonSponsors – comma-separated sponsor IDs to compare against (optional)
 */
router.get(
  '/correlations',
  asyncHandler(async (req, res) => {
    const { sponsor_id, comparisonSponsors } = req.query;

    let targetSponsorId: number;
    let comparisonIds: number[] | undefined;

    if (sponsor_id) {
      const r = parseIntParam(sponsor_id as string, 'Sponsor ID');
      if (!r.valid) {
        return res.status(400).json(fail('VALIDATION_ERROR', r.error));
      }
      targetSponsorId = r.value;
    } else {
      const allAnalysis: VotingPattern[] =
        await votingPatternAnalysisService.analyzeVotingPatterns();
      if (allAnalysis.length === 0) {
        return res
          .status(404)
          .json(fail('NOT_FOUND', 'No sponsors available for correlation analysis'));
      }
      const firstAnalysis = allAnalysis[0];
      if (!firstAnalysis) {
        return res
          .status(404)
          .json(fail('NOT_FOUND', 'No sponsors available for correlation analysis'));
      }
      targetSponsorId = firstAnalysis.sponsor_id;
    }

    if (comparisonSponsors) {
      comparisonIds = [];
      for (const id of (comparisonSponsors as string).split(',').map((s) => s.trim())) {
        const r = parseIntParam(id, 'Comparison Sponsor ID');
        if (!r.valid) {
          return res.status(400).json(fail('VALIDATION_ERROR', r.error));
        }
        comparisonIds.push(r.value);
      }
    } else {
      comparisonIds = undefined;
    }

    const correlations: ComparativeAnalysis =
      await votingPatternAnalysisService.buildComparativeAnalysis(
        targetSponsorId,
        comparisonIds,
      );

    void auditDataAccess(
      `voting-patterns:correlations:${targetSponsorId}`,
      req.user?.id ? String(req.user.id) : undefined,
      Object.keys(correlations.alignmentScores).length,
    );

    return res.json(
      ok({
        correlations,
        message: `Correlation analysis completed for sponsor ${targetSponsorId}`,
      }),
    );
  }),
);

// ─── Global error handler ─────────────────────────────────────────────────────

router.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  return handleRouteError(
    res,
    err,
    'handle voting pattern request',
    userId !== undefined ? String(userId) : undefined,
  );
});

export { router };