import { Router, Request, Response, NextFunction } from 'express';
import { VotingPatternAnalysisService } from './services/voting-pattern-analysis-service.js';
import { authenticateToken } from '../../middleware/auth.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { UnifiedApiResponse  } from '@shared/core/utils/api';
import { logger  } from '@shared/core/index.js';
import { securityAuditService } from '../security/security-audit-service.js';

// Create singleton instance
const votingPatternAnalysisService = new VotingPatternAnalysisService();

// Export the service instance
export { votingPatternAnalysisService };

const router = Router();

/**
 * Utility function to parse and validate integer parameters from route params
 * This reduces code duplication and provides consistent validation across all endpoints
 */
function parseIntParam(value: string, paramName: string): { valid: true; value: number } | { valid: false; error: string } {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: `${paramName} must be a valid positive number` };
  }
  return { valid: true, value: parsed };
}

/**
 * Centralized error handler that maps domain errors to appropriate HTTP responses
 * This approach keeps our route handlers clean and maintains consistent error responses
 */
function handleRouteError(res: Response, error: unknown, context: string, user_id?: number): Response {
  // Log the error with full context for debugging and monitoring
  logger.error(`Error in ${context}:`, { component: 'VotingPatternAnalysisRouter',
    context,
    user_id: user_id !== undefined ? String(user_id) : undefined,
    errorType: error instanceof Error ? error.constructor.name : 'Unknown'
   }, error);

  // Map specific errors to appropriate HTTP responses
  if (error instanceof Error && error.message.includes('not found')) {
    return res.status(404).json(UnifiedApiResponse.notFound('Resource', error.message));
  }

  if (error instanceof Error && error.message.includes('must be')) {
    return res.status(400).json(UnifiedApiResponse.validation([{ field: 'input', message: error.message }]));
  }

  // Generic fallback for unexpected errors
  return res.status(500).json(UnifiedApiResponse.error(`Failed to ${context.toLowerCase()}`));
}

/**
 * Higher-order function that wraps async route handlers with error handling
 * This eliminates the need for try-catch blocks in every route handler
 */
function asyncHandler(fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /api/voting-patterns/bills/:id
 * Analyze voting patterns for a specific bill
 * Shows how sponsors voted on this bill and related pattern analysis
 */
router.get('/bills/:id', asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.id, 'Bill ID');
  if (!idResult.valid) {
    return res.status(400).json(UnifiedApiResponse.validation([{ field: 'id', message: idResult.error }]));
  }

  // For bill-specific analysis, we'll analyze voting patterns of sponsors who voted on this bill
  // This provides insight into how the bill was received by different voting blocs
  const allPatterns = await votingPatternAnalysisService.analyzeVotingPatterns();

  // Filter to sponsors who have voting records (indicating they voted on bills)
  const relevantPatterns = allPatterns.filter(pattern => pattern.totalVotes > 0);

  // Log data access for bill voting pattern analysis
  await securityAuditService.logDataAccess(
    `bill-voting-patterns:${idResult.value}`,
    'read',
    req,
    (req as any).user?.id,
    relevantPatterns.length,
    true
  );

  return res.json(UnifiedApiResponse.success({ bill_id: idResult.value,
    votingPatterns: relevantPatterns,
    analysis: {
      totalSponsorsAnalyzed: relevantPatterns.length,
      averageConsistency: relevantPatterns.length > 0
        ? relevantPatterns.reduce((sum, p) => sum + p.votingConsistency, 0) / relevantPatterns.length
        : 0,
      message: relevantPatterns.length === 0
        ? 'No voting pattern data available for analysis'
        : `Analysis based on ${relevantPatterns.length } sponsors with voting records`
    }
  }));
}));

/**
 * GET /api/voting-patterns/sponsors/:id
 * Get comprehensive voting pattern analysis for a specific sponsor
 */
router.get('/sponsors/:id', asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.id, 'Sponsor ID');
  if (!idResult.valid) {
    return res.status(400).json(UnifiedApiResponse.validation([{ field: 'id', message: idResult.error }]));
  }

  const analysis = await votingPatternAnalysisService.analyzeVotingPatterns(idResult.value);

  if (!analysis || analysis.length === 0) {
    return res.status(404).json(UnifiedApiResponse.notFound('Sponsor', `No voting pattern analysis found for sponsor ${idResult.value}`));
  }

  // Log data access for sponsor voting pattern analysis
  await securityAuditService.logDataAccess(
    `sponsor-voting-patterns:${idResult.value}`,
    'read',
    req,
    (req as any).user?.id,
    1,
    true
  );

  return res.json(UnifiedApiResponse.success({
    sponsor: analysis[0],
    message: 'Voting pattern analysis retrieved successfully'
  }));
}));

/**
 * GET /api/voting-patterns/analysis
 * Get comprehensive voting pattern analysis for all active sponsors
 */
router.get('/analysis', asyncHandler(async (req, res) => {
  const analysis = await votingPatternAnalysisService.analyzeVotingPatterns();

  // Log data access for comprehensive voting pattern analysis
  await securityAuditService.logDataAccess(
    'voting-patterns:analysis',
    'read',
    req,
    (req as any).user?.id,
    analysis.length,
    true
  );

  return res.json(UnifiedApiResponse.success({
    analysis,
    summary: {
      totalSponsors: analysis.length,
      averageConsistency: analysis.length > 0
        ? analysis.reduce((sum, a) => sum + a.votingConsistency, 0) / analysis.length
        : 0,
      totalVotes: analysis.reduce((sum, a) => sum + a.totalVotes, 0),
      sponsorsWithPredictions: analysis.filter(a => a.predictedVotes.length > 0).length,
      sponsorsWithAnomalies: analysis.filter(a => a.anomalies.length > 0).length
    },
    message: analysis.length === 0
      ? 'No voting pattern data available'
      : `Comprehensive analysis of ${analysis.length} sponsors`
  }));
}));

/**
 * GET /api/voting-patterns/correlations
 * Analyze correlations between sponsors and voting behavior
 * Query parameters:
 *   - sponsor_id: specific sponsor to analyze correlations for (optional)
 *   - comparisonSponsors: comma-separated list of sponsor IDs to compare with (optional)
 */
router.get('/correlations', asyncHandler(async (req, res) => {
  const { sponsor_id, comparisonSponsors } = req.query;

  let target_sponsor_id: number;
  let comparisonIds: number[] | undefined;

  // Parse target sponsor ID
  if (sponsor_id) {
    const sponsor_idResult = parseIntParam(sponsor_id as string, 'Sponsor ID');
    if (!sponsor_idResult.valid) {
      return res.status(400).json(UnifiedApiResponse.validation([{ field: 'sponsor_id', message: sponsor_idResult.error }]));
    }
    targetSponsorId = sponsor_idResult.value;
  } else {
    // If no specific sponsor, use the first active sponsor as example
    const allAnalysis = await votingPatternAnalysisService.analyzeVotingPatterns();
    if (allAnalysis.length === 0) {
      return res.status(404).json(UnifiedApiResponse.notFound('Sponsors', 'No sponsors available for correlation analysis'));
    }
    targetSponsorId = allAnalysis[0].sponsor_id;
  }

  // Parse comparison sponsors if provided
  if (comparisonSponsors) {
    const ids = (comparisonSponsors as string).split(',').map(id => id.trim());
    comparisonIds = [];
    for (const id of ids) {
      const idResult = parseIntParam(id, 'Comparison Sponsor ID');
      if (!idResult.valid) {
        return res.status(400).json(UnifiedApiResponse.validation([{ field: 'comparisonSponsors', message: idResult.error }]));
      }
      comparisonIds.push(idResult.value);
    }
  }

  const correlations = await votingPatternAnalysisService.buildComparativeAnalysis(
    target_sponsor_id,
    comparisonIds
  );

  // Log data access for correlation analysis
  await securityAuditService.logDataAccess(
    `voting-patterns:correlations:${target_sponsor_id}`,
    'read',
    req,
    (req as any).user?.id,
    Object.keys(correlations.alignmentScores).length,
    true
  );

  return res.json(UnifiedApiResponse.success({
    correlations,
    message: `Correlation analysis completed for sponsor ${target_sponsor_id}`
  }));
}));

/**
 * Global error handler for this router
 * Catches any errors that weren't handled by individual route handlers
 */
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  return handleRouteError(res, err, 'handle voting pattern request', (req as any).user?.id);
});

export { router };






