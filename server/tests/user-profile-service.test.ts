import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../../shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { database as db, user as users, user_profiles as user_profiles, user_interest as user_interests, bill_engagement, notification as notifications, bill as bills } from '@shared/database/connection';
import { user_profileservice } from '@client/features/users/domain/user-profile.ts';
import { eq } from 'drizzle-orm';
import { logger  } from '@shared/core/src/index.js';

describe('User Profile Service', () => {
  let testUserId: string;
  let testBillId: number;

  beforeEach(async () => {
    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User',
        first_name: 'Test',
        last_name: 'User',
        role: 'citizen',
        verification_status: 'pending'
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
    await db.delete(bill_engagement).where(eq(bill_engagement.user_id, testUserId));
    await db.delete(notifications).where(eq(notifications.user_id, testUserId));
    await db.delete(user_interests).where(eq(user_interests.user_id, testUserId));
    await db.delete(user_profiles).where(eq(user_profiles.user_id, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(bills).where(eq(bills.id, testBillId));
  });

  describe('User Profile CRUD Operations', () => {
    it('should get user profile', async () => {
      const profile = await user_profileservice.getUserProfile(testUserId);
      
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
        is_public: true
      };

      const updatedProfile = await user_profileservice.updateUserProfile(testUserId, profileData);
      
      expect(updatedProfile.profile.bio).toBe('Updated bio');
      expect(updatedProfile.profile.expertise).toEqual(['healthcare', 'policy']);
      expect(updatedProfile.profile.location).toBe('New York');
      expect(updatedProfile.profile.organization).toBe('Test Org');
      expect(updatedProfile.profile.is_public).toBe(true);
    });

    it('should update user interests', async () => {
      const interests = ['healthcare', 'education', 'environment'];
      
      const result = await user_profileservice.updateUserInterests(testUserId, interests);
      
      expect(result.success).toBe(true);
      
      const profile = await user_profileservice.getUserProfile(testUserId);
      expect(profile.interests).toEqual(interests);
    });
  });

  describe('User Preference Management', () => {
    it('should get default user preferences', async () => {
      const preferences = await user_profileservice.getUserPreferences(testUserId);
      
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

      const updatedPreferences = await user_profileservice.updateUserPreferences(testUserId, newPreferences);
      
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
      const verification_status = await user_profileservice.getUserVerificationStatus(testUserId);
      
      expect(verification_status).toBeDefined();
      expect(verification_status.verification_status).toBe('pending');
      expect(verification_status.canSubmitDocuments).toBe(true);
    });

    it('should update user verification status', async () => {
      const verification_data = {
        verification_status: 'verified' as const,
        verificationDocuments: { document: 'test-doc.pdf' },
        verificationNotes: 'Verified successfully'
      };

      const updatedProfile = await user_profileservice.updateUserVerificationStatus(testUserId, verification_data);
      
      expect(updatedProfile.verification_status).toBe('verified');
      
      // Check that notification was created
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, testUserId))
        .limit(1);
      
      expect(notification).toBeDefined();
      expect(notification.type).toBe('verification_status');
    });
  });

  describe('User Engagement History Tracking', () => {
    it('should get empty engagement history for new user', async () => {
      const engagementHistory = await user_profileservice.getUserEngagementHistory(testUserId);
      
      expect(engagementHistory).toBeDefined();
      expect(engagementHistory.totalBillsTracked).toBe(0);
      expect(engagementHistory.totalComments).toBe(0);
      expect(engagementHistory.totalEngagementScore).toBe(0);
      expect(engagementHistory.recentActivity).toEqual([]);
      expect(engagementHistory.topCategories).toEqual([]);
    });

    it('should update user engagement', async () => {
      const result = await user_profileservice.updateUserEngagement(testUserId, testBillId, 'view');
      
      expect(result.success).toBe(true);
      
      // Check that engagement record was created
      const [engagement] = await db
        .select()
        .from(bill_engagement)
        .where(eq(bill_engagement.user_id, testUserId))
        .limit(1);
      
      expect(engagement).toBeDefined();
      expect(engagement.bill_id).toBe(testBillId);
      expect(engagement.view_count).toBe(1);
      expect(Number(engagement.engagement_score)).toBe(1);
    });

    it('should track engagement history after interactions', async () => {
      // Create some engagement
      await user_profileservice.updateUserEngagement(testUserId, testBillId, 'view');
      await user_profileservice.updateUserEngagement(testUserId, testBillId, 'comment');
      
      const engagementHistory = await user_profileservice.getUserEngagementHistory(testUserId);
      
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
      await user_profileservice.updateUserProfile(testUserId, {
        bio: 'Test bio',
        expertise: ['healthcare']
      });
      await user_profileservice.updateUserPreferences(testUserId, {
        emailNotifications: false
      });
      await user_profileservice.updateUserEngagement(testUserId, testBillId, 'view');

      const completeProfile = await user_profileservice.getCompleteUserProfile(testUserId);
      
      expect(completeProfile).toBeDefined();
      expect(completeProfile.id).toBe(testUserId);
      expect(completeProfile.profile?.bio).toBe('Test bio');
      expect(completeProfile.preferences.emailNotifications).toBe(false);
      expect(completeProfile.verification.verification_status).toBe('pending');
      expect(completeProfile.engagement.totalBillsTracked).toBe(1);
    });
  });

  describe('User Search', () => {
    it('should search users by name', async () => {
      // Make profile public
      await user_profileservice.updateUserProfile(testUserId, { is_public: true });
      
      const results = await user_profileservice.searchUsers('Test', 10);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Test User');
    });
  });
});












































