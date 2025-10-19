import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { database as db, user as users, userProfile as userProfiles, userInterest as userInterests, billEngagement, notification as notifications, bill as bills } from '../../shared/database/connection.js';
import { userProfileService } from '../features/users/domain/user-profile.ts';
import { eq } from 'drizzle-orm';
import { logger } from '../../shared/core/src/observability/logging';

describe('User Profile Service', () => {
  let testUserId: string;
  let testBillId: number;

  beforeEach(async () => {
    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        role: 'citizen',
        verificationStatus: 'pending'
      })
      .returning();
    
    testUserId = testUser.id;

    // Create test bill
    const [testBill] = await db
      .insert(bills)
      .values({
        title: 'Test Bill',
        description: 'A test bill for testing',
        status: 'introduced',
        category: 'healthcare'
      })
      .returning();
    
    testBillId = testBill.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(billEngagement).where(eq(billEngagement.userId, testUserId));
    await db.delete(notifications).where(eq(notifications.userId, testUserId));
    await db.delete(userInterests).where(eq(userInterests.userId, testUserId));
    await db.delete(userProfiles).where(eq(userProfiles.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(bills).where(eq(bills.id, testBillId));
  });

  describe('User Profile CRUD Operations', () => {
    it('should get user profile', async () => {
      const profile = await userProfileService.getUserProfile(testUserId);
      
      expect(profile).toBeDefined();
      expect(profile.id).toBe(testUserId);
      expect(profile.name).toBe('Test User');
      expect(profile.email).toBe('test@example.com');
    });

    it('should update user profile', async () => {
      const profileData = {
        bio: 'Updated bio',
        expertise: ['healthcare', 'policy'],
        location: 'New York',
        organization: 'Test Org',
        isPublic: true
      };

      const updatedProfile = await userProfileService.updateUserProfile(testUserId, profileData);
      
      expect(updatedProfile.profile.bio).toBe('Updated bio');
      expect(updatedProfile.profile.expertise).toEqual(['healthcare', 'policy']);
      expect(updatedProfile.profile.location).toBe('New York');
      expect(updatedProfile.profile.organization).toBe('Test Org');
      expect(updatedProfile.profile.isPublic).toBe(true);
    });

    it('should update user interests', async () => {
      const interests = ['healthcare', 'education', 'environment'];
      
      const result = await userProfileService.updateUserInterests(testUserId, interests);
      
      expect(result.success).toBe(true);
      
      const profile = await userProfileService.getUserProfile(testUserId);
      expect(profile.interests).toEqual(interests);
    });
  });

  describe('User Preference Management', () => {
    it('should get default user preferences', async () => {
      const preferences = await userProfileService.getUserPreferences(testUserId);
      
      expect(preferences).toBeDefined();
      expect(preferences.emailNotifications).toBe(true);
      expect(preferences.pushNotifications).toBe(true);
      expect(preferences.smsNotifications).toBe(false);
      expect(preferences.notificationFrequency).toBe('immediate');
      expect(preferences.language).toBe('en');
      expect(preferences.theme).toBe('auto');
    });

    it('should update user preferences', async () => {
      const newPreferences = {
        emailNotifications: false,
        pushNotifications: true,
        smsNotifications: true,
        notificationFrequency: 'daily' as const,
        billCategories: ['healthcare', 'education'],
        language: 'es',
        theme: 'dark' as const
      };

      const updatedPreferences = await userProfileService.updateUserPreferences(testUserId, newPreferences);
      
      expect(updatedPreferences.emailNotifications).toBe(false);
      expect(updatedPreferences.smsNotifications).toBe(true);
      expect(updatedPreferences.notificationFrequency).toBe('daily');
      expect(updatedPreferences.billCategories).toEqual(['healthcare', 'education']);
      expect(updatedPreferences.language).toBe('es');
      expect(updatedPreferences.theme).toBe('dark');
    });
  });

  describe('User Verification Status Handling', () => {
    it('should get user verification status', async () => {
      const verificationStatus = await userProfileService.getUserVerificationStatus(testUserId);
      
      expect(verificationStatus).toBeDefined();
      expect(verificationStatus.verificationStatus).toBe('pending');
      expect(verificationStatus.canSubmitDocuments).toBe(true);
    });

    it('should update user verification status', async () => {
      const verificationData = {
        verificationStatus: 'verified' as const,
        verificationDocuments: { document: 'test-doc.pdf' },
        verificationNotes: 'Verified successfully'
      };

      const updatedProfile = await userProfileService.updateUserVerificationStatus(testUserId, verificationData);
      
      expect(updatedProfile.verificationStatus).toBe('verified');
      
      // Check that notification was created
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testUserId))
        .limit(1);
      
      expect(notification).toBeDefined();
      expect(notification.type).toBe('verification_status');
    });
  });

  describe('User Engagement History Tracking', () => {
    it('should get empty engagement history for new user', async () => {
      const engagementHistory = await userProfileService.getUserEngagementHistory(testUserId);
      
      expect(engagementHistory).toBeDefined();
      expect(engagementHistory.totalBillsTracked).toBe(0);
      expect(engagementHistory.totalComments).toBe(0);
      expect(engagementHistory.totalEngagementScore).toBe(0);
      expect(engagementHistory.recentActivity).toEqual([]);
      expect(engagementHistory.topCategories).toEqual([]);
    });

    it('should update user engagement', async () => {
      const result = await userProfileService.updateUserEngagement(testUserId, testBillId, 'view');
      
      expect(result.success).toBe(true);
      
      // Check that engagement record was created
      const [engagement] = await db
        .select()
        .from(billEngagement)
        .where(eq(billEngagement.userId, testUserId))
        .limit(1);
      
      expect(engagement).toBeDefined();
      expect(engagement.billId).toBe(testBillId);
      expect(engagement.viewCount).toBe(1);
      expect(Number(engagement.engagementScore)).toBe(1);
    });

    it('should track engagement history after interactions', async () => {
      // Create some engagement
      await userProfileService.updateUserEngagement(testUserId, testBillId, 'view');
      await userProfileService.updateUserEngagement(testUserId, testBillId, 'comment');
      
      const engagementHistory = await userProfileService.getUserEngagementHistory(testUserId);
      
      expect(engagementHistory.totalBillsTracked).toBe(1);
      expect(engagementHistory.totalEngagementScore).toBe(6); // 1 for view + 5 for comment
      expect(engagementHistory.recentActivity.length).toBeGreaterThan(0);
      expect(engagementHistory.topCategories.length).toBeGreaterThan(0);
      expect(engagementHistory.topCategories[0].category).toBe('healthcare');
    });
  });

  describe('Complete User Profile', () => {
    it('should get complete user profile with all data', async () => {
      // Set up some data
      await userProfileService.updateUserProfile(testUserId, {
        bio: 'Test bio',
        expertise: ['healthcare']
      });
      await userProfileService.updateUserPreferences(testUserId, {
        emailNotifications: false
      });
      await userProfileService.updateUserEngagement(testUserId, testBillId, 'view');

      const completeProfile = await userProfileService.getCompleteUserProfile(testUserId);
      
      expect(completeProfile).toBeDefined();
      expect(completeProfile.id).toBe(testUserId);
      expect(completeProfile.profile?.bio).toBe('Test bio');
      expect(completeProfile.preferences.emailNotifications).toBe(false);
      expect(completeProfile.verification.verificationStatus).toBe('pending');
      expect(completeProfile.engagement.totalBillsTracked).toBe(1);
    });
  });

  describe('User Search', () => {
    it('should search users by name', async () => {
      // Make profile public
      await userProfileService.updateUserProfile(testUserId, { isPublic: true });
      
      const results = await userProfileService.searchUsers('Test', 10);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Test User');
    });
  });
});











































