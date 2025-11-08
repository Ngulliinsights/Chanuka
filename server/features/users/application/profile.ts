import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '@/middleware/auth.js';
import { user_profileservice } from '../domain/user-profile.js';
import { z } from 'zod';
import { ApiSuccess, ApiError, ApiValidationError, ApiResponseWrapper  } from '@shared/core/utils/api-utils';
import { logger   } from '../../../../shared/core/src/index.js';

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
function formatZodErrors(zodErrors: z.ZodIssue[]): { field: string; message: string }[] {
  return zodErrors.map(error => ({
    field: error.path.join('.') || 'unknown',
    message: error.message
  }));
}

// ============================================================================
// Current User Profile Routes
// ============================================================================

/**
 * GET /me - Retrieve the authenticated user's profile
 */
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const profile = await user_profileservice.getUserProfile(user_id);
    
    return ApiSuccess(
      res, 
      profile, 
      ApiResponseWrapper.createMetadata(startTime, 'getUserProfile')
    );
   } catch (error) {
    logger.error('Error fetching profile:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    
    // ApiError now requires a structured error object
    return ApiError(res, {
      code: 'PROFILE_FETCH_ERROR',
      message: 'Failed to fetch profile'
    }, 500);
  }
});

/**
 * PATCH /me - Update the authenticated user's profile
 */
router.patch('/me', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const profileData = updateProfileSchema.parse(req.body);

    const updatedProfile = await user_profileservice.updateUserProfile(user_id, profileData);
    
    return ApiSuccess(
      res, 
      updatedProfile, 
      ApiResponseWrapper.createMetadata(startTime, 'updateUserProfile')
    );
   } catch (error) {
    if (error instanceof z.ZodError) {
      // Transform Zod errors into the expected format before passing to ApiValidationError
      return ApiValidationError(res, formatZodErrors(error.errors));
    }
    
    logger.error('Error updating profile:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'PROFILE_UPDATE_ERROR',
      message: 'Failed to update profile'
    }, 500);
  }
});

/**
 * PATCH /me/basic - Update basic user information
 */
router.patch('/me/basic', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const basicInfo = updateBasicInfoSchema.parse(req.body);

    const updatedProfile = await user_profileservice.updateUserBasicInfo(user_id, basicInfo);
    
    return ApiSuccess(
      res, 
      updatedProfile, 
      ApiResponseWrapper.createMetadata(startTime, 'updateBasicInfo')
    );
   } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, formatZodErrors(error.errors));
    }
    
    logger.error('Error updating basic info:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'BASIC_INFO_UPDATE_ERROR',
      message: 'Failed to update basic info'
    }, 500);
  }
});

/**
 * PATCH /me/interests - Update user's interests
 */
router.patch('/me/interests', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const { interests  } = updateInterestsSchema.parse(req.body);

    await user_profileservice.updateUserInterests(user_id, interests);
    
    return ApiSuccess(
      res, 
      { success: true }, 
      ApiResponseWrapper.createMetadata(startTime, 'updateInterests')
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, formatZodErrors(error.errors));
    }
    
    logger.error('Error updating interests:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'INTERESTS_UPDATE_ERROR',
      message: 'Failed to update interests'
    }, 500);
  }
});

/**
 * GET /me/complete - Retrieve complete user profile
 */
router.get('/me/complete', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const completeProfile = await user_profileservice.getCompleteUserProfile(user_id);
    
    return ApiSuccess(
      res, 
      completeProfile, 
      ApiResponseWrapper.createMetadata(startTime, 'getCompleteProfile')
    );
   } catch (error) {
    logger.error('Error fetching complete profile:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'COMPLETE_PROFILE_FETCH_ERROR',
      message: 'Failed to fetch complete profile'
    }, 500);
  }
});

// ============================================================================
// User Preferences Routes
// ============================================================================

/**
 * GET /me/preferences - Retrieve user notification and display preferences
 */
router.get('/me/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferences = await user_profileservice.getUserPreferences(user_id);
    
    return ApiSuccess(
      res, 
      preferences, 
      ApiResponseWrapper.createMetadata(startTime, 'getPreferences')
    );
   } catch (error) {
    logger.error('Error fetching preferences:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'PREFERENCES_FETCH_ERROR',
      message: 'Failed to fetch preferences'
    }, 500);
  }
});

/**
 * PATCH /me/preferences - Update user preferences
 */
router.patch('/me/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const preferences = updatePreferencesSchema.parse(req.body);
    
    const updatedPreferences = await user_profileservice.updateUserPreferences(user_id, preferences);
    
    return ApiSuccess(
      res, 
      updatedPreferences, 
      ApiResponseWrapper.createMetadata(startTime, 'updatePreferences')
    );
   } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, formatZodErrors(error.errors));
    }
    
    logger.error('Error updating preferences:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'PREFERENCES_UPDATE_ERROR',
      message: 'Failed to update preferences'
    }, 500);
  }
});

// ============================================================================
// Verification Routes
// ============================================================================

/**
 * GET /me/verification - Retrieve verification status
 */
router.get('/me/verification', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const verification_status = await user_profileservice.getUserVerificationStatus(user_id);
    
    return ApiSuccess(
      res, 
      verification_status, 
      ApiResponseWrapper.createMetadata(startTime, 'getVerificationStatus')
    );
   } catch (error) {
    logger.error('Error fetching verification status:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'VERIFICATION_FETCH_ERROR',
      message: 'Failed to fetch verification status'
    }, 500);
  }
});

/**
 * PATCH /me/verification - Update verification status
 */
router.patch('/me/verification', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const verification_data = updateVerificationSchema.parse(req.body);
    
    // Authorization check: only admins can approve/reject verification
    if (verification_data.verification_status !== 'pending' && req.user!.role !== 'admin') {
      return ApiError(res, {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only administrators can approve or reject verification'
       }, 403);
    }
    
    const updatedProfile = await user_profileservice.updateUserVerificationStatus(user_id, verification_data);
    
    return ApiSuccess(
      res, 
      updatedProfile, 
      ApiResponseWrapper.createMetadata(startTime, 'updateVerificationStatus')
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, formatZodErrors(error.errors));
    }
    
    logger.error('Error updating verification status:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'VERIFICATION_UPDATE_ERROR',
      message: 'Failed to update verification status'
    }, 500);
  }
});

// ============================================================================
// Engagement Routes
// ============================================================================

/**
 * GET /me/engagement - Retrieve user's engagement history
 */
router.get('/me/engagement', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const engagementHistory = await user_profileservice.getUserEngagementHistory(user_id);
    
    return ApiSuccess(
      res, 
      engagementHistory, 
      ApiResponseWrapper.createMetadata(startTime, 'getEngagementHistory')
    );
   } catch (error) {
    logger.error('Error fetching engagement history:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'ENGAGEMENT_FETCH_ERROR',
      message: 'Failed to fetch engagement history'
    }, 500);
  }
});

/**
 * POST /me/engagement/:bill_id - Record user engagement with a bill
 */
router.post('/me/engagement/:bill_id', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    const bill_id = parseInt(req.params.bill_id, 10);
    
    // Validate that bill_id is a proper number
    if (isNaN(bill_id)) {
      return ApiError(res, {
        code: 'INVALID_BILL_ID',
        message: 'Bill ID must be a valid number'
        }, 400);
    }
    
    const { engagement_type } = engagementSchema.parse(req.body);
    
    const result = await user_profileservice.updateUserEngagement(user_id, bill_id, engagement_type);
    
    return ApiSuccess(
      res, 
      result, 
      ApiResponseWrapper.createMetadata(startTime, 'updateEngagement')
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, formatZodErrors(error.errors));
    }
    
    logger.error('Error updating engagement:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'ENGAGEMENT_UPDATE_ERROR',
      message: 'Failed to update engagement'
    }, 500);
  }
});

// ============================================================================
// Public Profile Routes
// ============================================================================

/**
 * GET /search/:query - Search for users by name or username
 */
router.get('/search/:query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const query = req.params.query;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    // Validate limit falls within acceptable range
    if (limit < 1 || limit > 100) {
      return ApiError(res, {
        code: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 100'
      }, 400);
    }
    
    const users = await user_profileservice.searchUsers(query, limit);
    
    return ApiSuccess(
      res, 
      { users }, 
      ApiResponseWrapper.createMetadata(startTime, 'searchUsers')
    );
  } catch (error) {
    logger.error('Error searching users:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'USER_SEARCH_ERROR',
      message: 'User search failed'
    }, 500);
  }
});

/**
 * GET /:user_id - Retrieve public profile for a specific user
 * Note: This catch-all route must be last to avoid intercepting other routes
 */
router.get('/:user_id', async (req, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.params.user_id;
    const profile = await user_profileservice.getUserPublicProfile(user_id);
    
    return ApiSuccess(
      res, 
      profile, 
      ApiResponseWrapper.createMetadata(startTime, 'getPublicProfile')
    );
   } catch (error) {
    logger.error('Error fetching public profile:', { component: 'profile-routes' }, error as Record<string, any> | undefined);
    return ApiError(res, {
      code: 'PUBLIC_PROFILE_FETCH_ERROR',
      message: 'Failed to fetch profile'
    }, 500);
  }
});