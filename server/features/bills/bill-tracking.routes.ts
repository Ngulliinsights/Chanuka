// cspell:words untracking
// Correct import path for the new service location
import { billTrackingService } from '@shared/application/bill-tracking.service';
import { logger } from '@server/infrastructure/observability';
import { ApiError, ApiResponseWrapper,ApiSuccess, ApiValidationError  } from '@shared/types/api';
import { NextFunction,Request, Response, Router } from 'express';
import { z } from 'zod';

import { AuthenticatedRequest,authenticateToken } from '../../../../AuthAlert';

const router = Router();

// --- Zod Schemas (Copied from Service for route validation) ---
const TrackingTypeEnum = z.enum(['status_changes', 'new_comments', 'amendments', 'voting_schedule']);
const AlertFrequencyEnum = z.enum(['immediate', 'hourly', 'daily', 'weekly']);
const AlertChannelEnum = z.enum(['in_app', 'email', 'push', 'sms']);

const basePreferenceSchema = z.object({
  tracking_types: z.array(TrackingTypeEnum).optional(),
  alert_frequency: AlertFrequencyEnum.optional(),
  alert_channels: z.array(AlertChannelEnum).optional(),
}); // Removed is_active for input validation

const trackBillSchema = z.object({
  preferences: basePreferenceSchema.optional()
});

const updatePreferencesSchema = basePreferenceSchema; // Same base, excludes is_active implicitly

const bulkTrackingSchema = z.object({
  bill_ids: z.array(z.number().int().positive()).min(1).max(100),
  operation: z.enum(['track', 'untrack']),
  preferences: basePreferenceSchema.optional()
});

// --- Helper Functions ---
function parseIntParam(value: string | undefined, paramName: string): number {
    if (value === undefined) throw new Error(`${paramName} is required.`);
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${paramName}: Must be a positive integer.`);
    }
    return parsed;
}

function parseOptionalIntParam(value: string | undefined, paramName: string, defaultValue: number, min = 1, max = Infinity): number {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < min || parsed > max) {
        throw new Error(`Invalid ${paramName}: Must be an integer between ${min} and ${max}.`);
    }
    return parsed;
}


// --- API Endpoints ---

// POST /api/bill-tracking/track/:bill_id - Track a bill
router.post('/track/:bill_id', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { try {
    const bill_id = parseIntParam(req.params.bill_id, 'Bill ID');
    const validationResult = trackBillSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ApiValidationError(res, validationResult.error.errors, ApiResponseWrapper.createMetadata(Date.now(), 'database'));
     }
    const { preferences } = validationResult.data;

    const result = await billTrackingService.trackBill(req.user!.id, bill_id, preferences);
    return ApiSuccess(res, { message: 'Bill tracked successfully', tracking: result });
  } catch (error) {
    // Pass error to the centralized handler
    next(error);
  }
});

// DELETE /api/bill-tracking/track/:bill_id - Untrack a bill
router.delete('/track/:bill_id', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { try {
    const bill_id = parseIntParam(req.params.bill_id, 'Bill ID');
    await billTrackingService.untrackBill(req.user!.id, bill_id);
    return res.status(204).send(); // No Content response
   } catch (error) {
    next(error);
  }
});

// GET /api/bill-tracking/tracked - Get tracked bills
router.get('/tracked', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseOptionalIntParam(req.query.page as string, 'Page', 1);
    const limit = parseOptionalIntParam(req.query.limit as string, 'Limit', 20, 1, 100);
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;
    // Validate sortBy and sortOrder against allowed values
    const validSortBy = ['date_tracked', 'last_updated', 'engagement'] as const;
    const sortByValue = req.query.sortBy as string;
    const sortBy = validSortBy.includes(sortByValue as any) ? sortByValue as 'date_tracked' | 'last_updated' | 'engagement' : 'date_tracked';
    const validSortOrder = ['asc', 'desc'] as const;
    const sortOrderValue = req.query.sortOrder as string;
    const sortOrder = validSortOrder.includes(sortOrderValue as any) ? sortOrderValue as 'asc' | 'desc' : 'desc';


    const result = await billTrackingService.getUserTrackedBills(req.user!.id, { page, limit, category, status, sortBy, sortOrder });
    return ApiSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

// PUT /api/bill-tracking/preferences/:bill_id - Update preferences for a tracked bill
router.put('/preferences/:bill_id', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { try {
    const bill_id = parseIntParam(req.params.bill_id, 'Bill ID');
    const validationResult = updatePreferencesSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ApiValidationError(res, validationResult.error.errors, ApiResponseWrapper.createMetadata(Date.now(), 'database'));
     }
    const preferencesToUpdate = validationResult.data;

    const result = await billTrackingService.updateBillTrackingPreferences(req.user!.id, bill_id, preferencesToUpdate);
    return ApiSuccess(res, { message: 'Tracking preferences updated successfully', preferences: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/bill-tracking/is-tracking/:bill_id - Check if user is tracking a bill
router.get('/is-tracking/:bill_id', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { try {
    const bill_id = parseIntParam(req.params.bill_id, 'Bill ID');
    const isTracking = await billTrackingService.isUserTrackingBill(req.user!.id, bill_id);
    return ApiSuccess(res, { isTracking  });
  } catch (error) {
    next(error);
  }
});

// POST /api/bill-tracking/bulk - Perform bulk track/untrack
router.post('/bulk', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validationResult = bulkTrackingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ApiValidationError(res, validationResult.error.errors, ApiResponseWrapper.createMetadata(Date.now(), 'database'));
    }
    const { bill_ids, operation, preferences } = validationResult.data;

    if (operation === 'untrack' && preferences && Object.keys(preferences).length > 0) {
        return ApiValidationError(res, "Preferences cannot be set when untracking.");
    }


    const result = await billTrackingService.bulkTrackingOperation({ user_id: req.user!.id, bill_ids, operation, preferences  });
    return ApiSuccess(res, { message: `Bulk ${operation} operation completed`, result });
  } catch (error) {
    next(error);
  }
});

// GET /api/bill-tracking/analytics - Get user's tracking analytics
router.get('/analytics', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const analytics = await billTrackingService.getUserTrackingAnalytics(req.user!.id);
    return ApiSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
});

// GET /api/bill-tracking/recommended - Get recommended bills
router.get('/recommended', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseOptionalIntParam(req.query.limit as string, 'Limit', 10, 1, 50);
    const bills = await billTrackingService.getRecommendedBillsForTracking(req.user!.id, limit);
    return ApiSuccess(res, { bills, count: bills.length });
  } catch (error) {
    next(error);
  }
});

// --- Centralized Error Handler for this Router ---
router.use((err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    logger.error(`Error in Bill Tracking route ${req.method} ${req.originalUrl}:`, { component: 'BillTrackingRoutes', user_id: req.user?.id  }, err);

    // Handle specific service errors
    if (err.message.includes('not found') || err.message.includes('No active tracking preference found')) {
        return ApiError(res, err.message, 404);
    }
     if (err instanceof z.ZodError) {
         return ApiValidationError(res, err.errors);
     }
     // Handle generic errors (like invalid ID from parseIntParam)
     if (err.message.startsWith('Invalid') || err.message.endsWith('is required.')) {
         return ApiValidationError(res, err.message);
     }


    // Fallback for unexpected errors
    return ApiError(res, 'An internal server error occurred', 500);
});


export { router as billTrackingRouter }; // Export with a unique name









