import { Router, Request, Response, NextFunction } from 'express';
// Import the NEW comprehensive analysis service
import { billComprehensiveAnalysisService } from '../application/bill-comprehensive-analysis.service.js';
// Import repository for fetching historical data
import { analysisRepository } from '../infrastructure/repositories/analysis-repository-impl.js';
import { authenticateToken, AuthenticatedRequest } from '../../../middleware/auth.js'; // Use if auth needed
import { ApiSuccess, ApiError, ApiValidationError } from '@shared/core/utils/api'';
import { logger } from '@shared/core';
import { z } from 'zod';

const router = Router();

// --- Helper Functions ---
function parseIntParam(value: string | undefined, paramName: string): number {
    if (value === undefined) throw new Error(`${paramName} route parameter is required.`);
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
        // More specific error for validation
        throw new Error(`Invalid ${paramName}: Must be a positive integer.`);
    }
    return parsed;
}

// --- API Endpoints ---

/**
 * GET /api/analysis/bills/:billId/comprehensive
 * Retrieve the latest comprehensive analysis result for a specific bill.
 * This endpoint triggers the analysis on-demand. Consider adding caching or
 * directing users to pre-computed results if performance is critical.
 */
router.get('/bills/:billId/comprehensive', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const billId = parseIntParam(req.params.billId, 'Bill ID');
    logger.info(`Request received for comprehensive analysis of bill ${billId}`);

    // Run analysis on-demand
    // For high-traffic systems, consider:
    // 1. Caching the result here with a short TTL.
    // 2. Having a background job compute analyses and storing them, then fetching the stored result.
    const analysisResult = await billComprehensiveAnalysisService.analyzeBill(billId);

    // Add metadata about the source (live analysis)
    const metadata = { source: 'live_analysis', timestamp: new Date(startTime), durationMs: Date.now() - startTime };
    return ApiSuccess(res, analysisResult, metadata);

  } catch (error) {
    next(error); // Pass error to the centralized handler
  }
});

/**
 * POST /api/analysis/bills/:billId/comprehensive/run
 * Manually trigger a new comprehensive analysis run for a specific bill.
 * Useful for admin interfaces or specific events requiring fresh analysis.
 * Requires Authentication (e.g., admin role).
 */
router.post('/bills/:billId/comprehensive/run', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    // Example Role Check (adjust role name as needed)
    if (req.user?.role !== 'admin') {
        logger.warn(`Unauthorized attempt to run analysis by user ${req.user?.id}`, { component: 'AnalysisRoutes' });
        // Use standard error response
        return ApiError(res, "Permission denied. Admin role required.", 403);
    }

    try {
        const billId = parseIntParam(req.params.billId, 'Bill ID');
        logger.info(`Admin trigger for NEW comprehensive analysis run for bill ${billId} by user ${req.user?.id}`);

        // Run the analysis (this might take time - consider background job for long analyses)
        const analysisResult = await billComprehensiveAnalysisService.analyzeBill(billId);

        const metadata = { source: 'manual_trigger', timestamp: new Date(startTime), durationMs: Date.now() - startTime };
        // Use 201 Created as a new analysis run was initiated and completed
        return ApiSuccess(res, { message: "Analysis re-run completed successfully.", analysis: analysisResult }, metadata, 201);

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/analysis/bills/:billId/history
 * Retrieve historical comprehensive analysis runs for a bill from the repository.
 */
router.get('/bills/:billId/history', async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
        const billId = parseIntParam(req.params.billId, 'Bill ID');
        // Validate limit query parameter
        const limitParam = req.query.limit as string | undefined;
        let limit = 10; // Default limit
        if (limitParam !== undefined) {
             const parsedLimit = parseInt(limitParam, 10);
             if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
                 throw new Error("Invalid 'limit' query parameter: Must be an integer between 1 and 50.");
             }
             limit = parsedLimit;
        }


        const historyRecords = await analysisRepository.findHistoryByBillId(billId, limit);

        // Transform results for frontend consumption, extracting key info from JSONB
        const historyResults = historyRecords.map(record => {
            const resultsData = record.results as any; // Cast to access potential fields
            return {
                dbId: record.id, // Include DB record ID
                analysisId: resultsData?.analysisId,
                timestamp: record.createdAt, // Use DB creation time
                version: resultsData?.version || record.analysisType,
                overallConfidence: parseFloat(record.confidence ?? '0'),
                status: resultsData?.status || 'unknown', // Include status if saved
                // Optionally include a summary of scores
                scores: {
                    publicInterest: resultsData?.publicInterestScore?.score,
                    transparency: resultsData?.transparencyScore?.overall,
                    constitutional: resultsData?.constitutionalAnalysis?.constitutionalityScore,
                },
                // recommendationsCount: resultsData?.recommendations?.length ?? 0,
            };
        });

        const metadata = { source: 'database', timestamp: new Date(startTime), durationMs: Date.now() - startTime };
        return ApiSuccess(res, { history: historyResults, count: historyResults.length }, metadata);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/analysis/health
 * Basic health check endpoint for the analysis feature.
 */
router.get('/health', (req: Request, res: Response) => {
    return ApiSuccess(res, { status: 'Analysis feature operational', timestamp: new Date().toISOString() });
});


// --- Centralized Error Handler for this Router ---
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error with context
    logger.error(`Error in Analysis route ${req.method} ${req.originalUrl}:`, {
        component: 'AnalysisRoutes',
        path: req.path,
        errorName: err.name,
        errorMessage: err.message,
        // stack: err.stack // Optional: include stack trace in logs but not response
    });

    // Handle specific, known error types
    if (err.message.includes('Bill with ID') && err.message.includes('not found')) {
        return ApiError(res, err.message, 404); // Use 404 Not Found
    }
    // Handle validation errors (e.g., invalid ID, invalid limit)
    if (err.message.startsWith('Invalid') || err.message.endsWith('is required.')) {
        return ApiValidationError(res, err.message); // Use 400 Bad Request
    }
    // Handle specific analysis failures if thrown by the service
    if (err.message.includes('Analysis failed') || err.message.includes('analysis orchestration failed')) {
         return ApiError(res, `Analysis could not be completed: ${err.message}`, 500);
     }

    // Generic fallback for unexpected errors
    return ApiError(res, 'An internal server error occurred during analysis processing.', 500);
});

export { router as analysisRouter }; // Export with a unique name
