/**
 * User Profile Routes (MIGRATED TO MODERN ERROR HANDLING)
 * 
 * All routes now use:
 * - UserProfileService with AsyncServiceResult
 * - Zod validation with safeParse
 * - boomFromStandardized for error conversion
 * - No try-catch blocks
 * - No BaseError usage
 */

import { Router, Response } from 'express';
import { z } from 'zod';

import {
  AuthenticatedRequest,
  authenticateToken
} from '../../../../AuthAlert';
import { asyncHandler } from '@/middleware/error-management';
import { ValidationError } from '@shared/types/core/errors';
import { userProfileService } from './UserProfileService';
import { boomFromStandardized } from '@server/infrastructure/error-handling';

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
  const userId = req.user!.id;
  
  const result = await userProfileService.getUserProfile(userId);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

/**
 * PATCH /me - Update the authenticated user's profile
 */
router.patch('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const parseResult = updateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('Invalid profile data', formatZodErrors(parseResult.error.errors));
  }

  const result = await userProfileService.updateUserProfile(userId, parseResult.data);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

/**
 * PATCH /me/basic - Update basic user information
 */
router.patch('/me/basic', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const parseResult = updateBasicInfoSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('Invalid basic info', formatZodErrors(parseResult.error.errors));
  }

  const result = await userProfileService.updateUserBasicInfo(userId, parseResult.data);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

/**
 * PATCH /me/interests - Update user's interests
 */
router.patch('/me/interests', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const parseResult = updateInterestsSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('Invalid interests data', formatZodErrors(parseResult.error.errors));
  }

  const result = await userProfileService.updateUserInterests(userId, parseResult.data.interests);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json({ success: true });
}));

/**
 * GET /me/complete - Retrieve complete user profile
 */
router.get('/me/complete', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const result = await userProfileService.getCompleteProfile(userId);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

// ============================================================================
// User Preferences Routes
// ============================================================================

/**
 * GET /me/preferences - Retrieve user notification and display preferences
 */
router.get('/me/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const result = await userProfileService.getUserPreferences(userId);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

/**
 * PATCH /me/preferences - Update user preferences
 */
router.patch('/me/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const parseResult = updatePreferencesSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('Invalid preferences data', formatZodErrors(parseResult.error.errors));
  }

  const result = await userProfileService.updateUserPreferences(userId, parseResult.data);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

// ============================================================================
// User Verification Routes
// ============================================================================

/**
 * GET /me/verification - Retrieve user verification status
 */
router.get('/me/verification', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const result = await userProfileService.getUserVerificationStatus(userId);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

/**
 * PATCH /me/verification - Update user verification status
 */
router.patch('/me/verification', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  
  const parseResult = updateVerificationSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('Invalid verification data', formatZodErrors(parseResult.error.errors));
  }

  const result = await userProfileService.updateUserVerificationStatus(
    userId,
    parseResult.data,
    userRole
  );
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

// ============================================================================
// User Engagement Routes
// ============================================================================

/**
 * GET /me/engagement - Retrieve user engagement history
 */
router.get('/me/engagement', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const result = await userProfileService.getUserEngagementHistory(userId);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

/**
 * POST /me/engagement/:bill_id - Track user engagement with a bill
 */
router.post('/me/engagement/:bill_id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const billId = req.params.bill_id;
  
  const parseResult = engagementSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('Invalid engagement data', formatZodErrors(parseResult.error.errors));
  }

  const result = await userProfileService.trackBillEngagement(
    userId,
    billId,
    parseResult.data.engagement_type
  );
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json({ success: true });
}));

// ============================================================================
// Public Profile Routes
// ============================================================================

/**
 * GET /search/:query - Search for users
 */
router.get('/search/:query', asyncHandler(async (req, res: Response) => {
  const query = req.params.query;
  
  const result = await userProfileService.searchUsers(query);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

/**
 * GET /:user_id/profile - Retrieve public user profile
 */
router.get('/:user_id/profile', asyncHandler(async (req, res: Response) => {
  const userId = req.params.user_id;
  
  const result = await userProfileService.getPublicProfile(userId);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

/**
 * GET /:user_id - Retrieve public user profile (alias)
 */
router.get('/:user_id', asyncHandler(async (req, res: Response) => {
  const userId = req.params.user_id;
  
  const result = await userProfileService.getPublicProfile(userId);
  
  if (result.isErr()) {
    throw boomFromStandardized(result.error);
  }

  res.json(result.value);
}));

export default router;
