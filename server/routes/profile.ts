import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { userProfileService } from '../services/user-profile.js';
import { z } from 'zod';

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

// Get current user's profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const profile = await userProfileService.getUserProfile(userId);
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.patch('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const profileData = updateProfileSchema.parse(req.body);
    
    const updatedProfile = await userProfileService.updateUserProfile(userId, profileData);
    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid profile data', details: error.errors });
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update basic user info
router.patch('/me/basic', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const basicInfo = updateBasicInfoSchema.parse(req.body);
    
    const updatedProfile = await userProfileService.updateUserBasicInfo(userId, basicInfo);
    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid basic info data', details: error.errors });
    }
    console.error('Error updating basic info:', error);
    res.status(500).json({ error: 'Failed to update basic info' });
  }
});

// Update user interests
router.patch('/me/interests', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { interests } = updateInterestsSchema.parse(req.body);
    
    await userProfileService.updateUserInterests(userId, interests);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid interests data', details: error.errors });
    }
    console.error('Error updating interests:', error);
    res.status(500).json({ error: 'Failed to update interests' });
  }
});

// Get public profile by user ID
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const profile = await userProfileService.getUserPublicProfile(userId);
    res.json(profile);
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const users = await userProfileService.searchUsers(query, limit);
    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'User search failed' });
  }
});