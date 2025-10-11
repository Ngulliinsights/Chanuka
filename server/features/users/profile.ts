import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { userProfileService } from './user-profile.js';
import { z } from 'zod';
import { ApiSuccess, ApiErrorResponse, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { logger } from '../../utils/logger';

export const router = Router();

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  location: z.string().optional(),
  organization: z.string().optional(),
  isPublic: z.boolean().optional()
});

const updateBasicInfoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
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
  verificationStatus: z.enum(['pending', 'verified', 'rejected']),
  verificationDocuments: z.any().optional(),
  verificationNotes: z.string().optional()
});

// Get current user's profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const profile = await userProfileService.getUserProfile(userId);
    return ApiSuccess(res, profile, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching profile:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch profile', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Update user profile
router.patch('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const profileData = updateProfileSchema.parse(req.body);
    
    const updatedProfile = await userProfileService.updateUserProfile(userId, profileData);
    return ApiSuccess(res, updatedProfile, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error updating profile:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to update profile', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Update basic user info
router.patch('/me/basic', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const basicInfo = updateBasicInfoSchema.parse(req.body);
    
    const updatedProfile = await userProfileService.updateUserBasicInfo(userId, basicInfo);
    return ApiSuccess(res, updatedProfile, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error updating basic info:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to update basic info', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Update user interests
router.patch('/me/interests', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { interests } = updateInterestsSchema.parse(req.body);
    
    await userProfileService.updateUserInterests(userId, interests);
    return ApiSuccess(res, { success: true }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error updating interests:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to update interests', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get public profile by user ID
router.get('/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.params.userId;
    const profile = await userProfileService.getUserPublicProfile(userId);
    return ApiSuccess(res, profile, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching public profile:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch profile', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get user preferences
router.get('/me/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferences = await userProfileService.getUserPreferences(userId);
    return ApiSuccess(res, preferences, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching preferences:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch preferences', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Update user preferences
router.patch('/me/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferences = updatePreferencesSchema.parse(req.body);
    
    const updatedPreferences = await userProfileService.updateUserPreferences(userId, preferences);
    return ApiSuccess(res, updatedPreferences, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error updating preferences:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to update preferences', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get user verification status
router.get('/me/verification', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const verificationStatus = await userProfileService.getUserVerificationStatus(userId);
    return ApiSuccess(res, verificationStatus, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching verification status:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch verification status', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Update user verification status (admin only)
router.patch('/me/verification', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const verificationData = updateVerificationSchema.parse(req.body);
    
    // Check if user has admin role for status changes other than submitting documents
    if (verificationData.verificationStatus !== 'pending' && req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const updatedProfile = await userProfileService.updateUserVerificationStatus(userId, verificationData);
    return ApiSuccess(res, updatedProfile, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error updating verification status:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to update verification status', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get user engagement history
router.get('/me/engagement', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const engagementHistory = await userProfileService.getUserEngagementHistory(userId);
    return ApiSuccess(res, engagementHistory, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching engagement history:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch engagement history', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get complete user profile (all data)
router.get('/me/complete', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const completeProfile = await userProfileService.getCompleteUserProfile(userId);
    return ApiSuccess(res, completeProfile, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching complete profile:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to fetch complete profile', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Update user engagement (called when user interacts with bills)
router.post('/me/engagement/:billId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const billId = parseInt(req.params.billId);
    const { engagementType } = req.body;
    
    if (!['view', 'comment', 'share'].includes(engagementType)) {
      return ApiError(res, 'Invalid engagement type', 400, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const result = await userProfileService.updateUserEngagement(userId, billId, engagementType);
    return ApiSuccess(res, result, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error updating engagement:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'Failed to update engagement', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const query = req.params.query;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const users = await userProfileService.searchUsers(query, limit);
    return ApiSuccess(res, { users }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error searching users:', { component: 'SimpleTool' }, error);
    return ApiError(res, 'User search failed', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});








