import { logger } from '@shared/core';
import { user_profileservice } from '@shared/domain/user-profile.js';
import { Router, Response } from 'express';
import { z } from 'zod';

import {
  AuthenticatedRequest,
  authenticateToken
} from '../../../../AuthAlert';
import { asyncHandler } from '@/middleware/error-management';
import { BaseError, ValidationError } from '@shared/core/observability/error-management';
import { ERROR_CODES, ErrorDomain, ErrorSeverity } from '@shared/constants';
import { createErrorContext } from '@shared/core/observability/distributed-tracing';
import { userDomainToApi } from '@shared/utils/transformers';

export const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  location: z.string().optional(),
  organization: z.string().optional(),
  is_public: z.boolean().optional()
});

const updateBasicInfoSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  name: z.string().optional()
});

const updateInterestsSchema = z.object({
  interests: z.array(z.string())
});

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  notificationFrequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
  billCategories: z.array(z.string()).optional(),
  language: z.string().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional()
});

const updateVerificationSchema = z.object({
  verification_status: z.enum(['pending', 'verified', 'rejected']),
  verificationDocuments: z.any().optional(),
  verificationNotes: z.string().optional()
});

const engagementSchema = z.object({
  engagement_type: z.enum(['view', 'comment', 'share'])
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transforms Zod validation errors into our API error format
 * Each Zod error contains a path array and message, which we convert
 * to a field string (joined path) and message string
 */
function formatZodErrors(zodErrors: z.ZodIssue[]): Array<{ field: string; message: string; code?: string }> {
  return zodErrors.map(error => ({
    field: error.path.join('.') || 'unknown',
    message: error.message,
    code: 'VALIDATION_ERROR'
  }));
}

// ============================================================================
// Current User Profile Routes
// ============================================================================

/**
 * GET /me - Retrieve the authenticated user's profile
 */
router.get('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/me');

  try {
    const user_id = req.user!.id;
    const profile = await user_profileservice.getUserProfile(user_id);

    res.json(profile);
  } catch (error) {
    logger.error('Error fetching profile:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch profile', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * PATCH /me - Update the authenticated user's profile
 */
router.patch('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'PATCH /api/users/me');

  try {
    const user_id = req.user!.id;
    const profileData = updateProfileSchema.parse(req.body);

    const updatedProfile = await user_profileservice.updateUserProfile(user_id, profileData);

    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid profile data', formatZodErrors(error.errors));
    }

    logger.error('Error updating profile:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to update profile', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * PATCH /me/basic - Update basic user information
 */
router.patch('/me/basic', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'PATCH /api/users/me/basic');

  try {
    const user_id = req.user!.id;
    const basicInfo = updateBasicInfoSchema.parse(req.body);

    const updatedProfile = await user_profileservice.updateUserBasicInfo(user_id, basicInfo);

    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid basic info', formatZodErrors(error.errors));
    }

    logger.error('Error updating basic info:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to update basic info', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * PATCH /me/interests - Update user's interests
 */
router.patch('/me/interests', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'PATCH /api/users/me/interests');

  try {
    const user_id = req.user!.id;
    const { interests } = updateInterestsSchema.parse(req.body);

    await user_profileservice.updateUserInterests(user_id, interests);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid interests data', formatZodErrors(error.errors));
    }

    logger.error('Error updating interests:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to update interests', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * GET /me/complete - Retrieve complete user profile
 */
router.get('/me/complete', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/me/complete');

  try {
    const user_id = req.user!.id;
    const completeProfile = await user_profileservice.getCompleteUserProfile(user_id);

    res.json(completeProfile);
  } catch (error) {
    logger.error('Error fetching complete profile:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch complete profile', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

// ============================================================================
// User Preferences Routes
// ============================================================================

/**
 * GET /me/preferences - Retrieve user notification and display preferences
 */
router.get('/me/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/me/preferences');

  try {
    const user_id = req.user!.id;
    const preferences = await user_profileservice.getUserPreferences(user_id);

    res.json(preferences);
  } catch (error) {
    logger.error('Error fetching preferences:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch preferences', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * PATCH /me/preferences - Update user preferences
 */
router.patch('/me/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'PATCH /api/users/me/preferences');

  try {
    const user_id = req.user!.id;
    const preferences = updatePreferencesSchema.parse(req.body);

    const updatedPreferences = await user_profileservice.updateUserPreferences(user_id, preferences);

    res.json(updatedPreferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid preferences data', formatZodErrors(error.errors));
    }

    logger.error('Error updating preferences:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to update preferences', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

// ============================================================================
// Verification Routes
// ============================================================================

/**
 * GET /me/verification - Retrieve verification status
 */
router.get('/me/verification', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/me/verification');

  try {
    const user_id = req.user!.id;
    const verification_status = await user_profileservice.getUserVerificationStatus(user_id);

    res.json(verification_status);
  } catch (error) {
    logger.error('Error fetching verification status:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch verification status', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * PATCH /me/verification - Update verification status
 */
router.patch('/me/verification', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'PATCH /api/users/me/verification');

  try {
    const user_id = req.user!.id;
    const verification_data = updateVerificationSchema.parse(req.body);

    // Authorization check: only admins can approve/reject verification
    if (verification_data.verification_status !== 'pending' && req.user!.role !== 'admin') {
      throw new BaseError('Insufficient permissions', {
        statusCode: 403,
        code: ERROR_CODES.ACCESS_DENIED,
        domain: ErrorDomain.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'profile-routes', action: 'update_verification_status' }
      });
    }

    const updatedProfile = await user_profileservice.updateUserVerificationStatus(user_id, verification_data);

    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid verification data', formatZodErrors(error.errors));
    }

    if (error instanceof BaseError) {
      throw error;
    }

    logger.error('Error updating verification status:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to update verification status', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

// ============================================================================
// Engagement Routes
// ============================================================================

/**
 * GET /me/engagement - Retrieve user's engagement history
 */
router.get('/me/engagement', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/me/engagement');

  try {
    const user_id = req.user!.id;
    const engagementHistory = await user_profileservice.getUserEngagementHistory(user_id);

    res.json(engagementHistory);
  } catch (error) {
    logger.error('Error fetching engagement history:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch engagement history', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * POST /me/engagement/:bill_id - Record user engagement with a bill
 */
router.post('/me/engagement/:bill_id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'POST /api/users/me/engagement/:bill_id');

  try {
    const user_id = req.user!.id;
    const bill_id = parseInt(req.params.bill_id, 10);

    // Validate that bill_id is a proper number
    if (isNaN(bill_id)) {
      throw new ValidationError('Invalid bill ID', [
        { field: 'bill_id', message: 'Bill ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    const { engagement_type } = engagementSchema.parse(req.body);

    const result = await user_profileservice.updateUserEngagement(user_id, bill_id, engagement_type);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid engagement data', formatZodErrors(error.errors));
    }

    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Error updating engagement:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to update engagement', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

// ============================================================================
// Public Profile Routes
// ============================================================================

/**
 * GET /profile - Alias for /me (for client compatibility)
 * This route provides backward compatibility with clients expecting /api/users/profile
 */
router.get('/profile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/profile');

  try {
    const user_id = req.user!.id;
    const profile = await user_profileservice.getUserProfile(user_id);

    res.json(profile);
  } catch (error) {
    logger.error('Error fetching profile:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch profile', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * GET /preferences - Alias for /me/preferences (for client compatibility)
 */
router.get('/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/preferences');

  try {
    const user_id = req.user!.id;
    const preferences = await user_profileservice.getUserPreferences(user_id);

    res.json(preferences);
  } catch (error) {
    logger.error('Error fetching preferences:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch preferences', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * PUT /preferences - Alias for /me/preferences (for client compatibility)
 */
router.put('/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = createErrorContext(req, 'PUT /api/users/preferences');

  try {
    const user_id = req.user!.id;
    const preferences = updatePreferencesSchema.parse(req.body);

    const updatedPreferences = await user_profileservice.updateUserPreferences(user_id, preferences);

    res.json(updatedPreferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid preferences data', formatZodErrors(error.errors));
    }

    logger.error('Error updating preferences:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to update preferences', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.user?.id }
    });
  }
}));

/**
 * GET /search/:query - Search for users by name or username
 */
router.get('/search/:query', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/search/:query');

  try {
    const query = req.params.query;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    // Validate limit falls within acceptable range
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Invalid limit parameter', [
        { field: 'limit', message: 'Limit must be between 1 and 100', code: 'INVALID_RANGE' }
      ]);
    }

    const users = await user_profileservice.searchUsers(query, limit);

    res.json({ users });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Error searching users:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('User search failed', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes' }
    });
  }
}));

/**
 * GET /:user_id/profile - Get specific user's profile (for client compatibility)
 * This provides an explicit /profile suffix for clarity
 */
router.get('/:user_id/profile', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/:user_id/profile');

  try {
    const user_id = req.params.user_id;
    const profile = await user_profileservice.getUserPublicProfile(user_id);

    res.json(profile);
  } catch (error) {
    logger.error('Error fetching public profile:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch profile', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.params.user_id }
    });
  }
}));

/**
 * GET /:user_id - Retrieve public profile for a specific user
 * Note: This catch-all route must be last to avoid intercepting other routes
 */
router.get('/:user_id', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/users/:user_id');

  try {
    const user_id = req.params.user_id;
    const profile = await user_profileservice.getUserPublicProfile(user_id);

    res.json(profile);
  } catch (error) {
    logger.error('Error fetching public profile:', { component: 'profile-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch profile', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'profile-routes', userId: req.params.user_id }
    });
  }
}));
