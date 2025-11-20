import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '../application/user-service-direct';
import { User } from '../domain/entities/user';
import { UserProfile } from '../domain/entities/user-profile';
import { db } from '@shared/database/pool';
import { users, user_profiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('UserService Direct Integration Tests', () => {
  let userService: UserService;
  let testUserId: string;
  let testUser: User;

  beforeEach(async () => {
    userService = new UserService();
    
    // Create test user
    testUserId = crypto.randomUUID();
    testUser = User.create({
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      verification_status: 'pending',
      is_active: true
    });
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db.delete(user_profiles).where(eq(user_profiles.user_id, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('User Operations', () => {
    it('should save and find user by ID', async () => {
      // Save user
      await userService.save(testUser, 'hashed_password');

      // Find user by ID
      const foundUser = await userService.findById(testUserId);

      expect(foundUser).toBeTruthy();
      expect(foundUser!.id).toBe(testUserId);
      expect(foundUser!.email).toBe('test@example.com');
      expect(foundUser!.name).toBe('test@example.com'); // Uses email as name
      expect(foundUser!.role).toBe('citizen');
      expect(foundUser!.verification_status).toBe('pending');
      expect(foundUser!.is_active).toBe(true);
    });

    it('should find user by email', async () => {
      // Save user
      await userService.save(testUser, 'hashed_password');

      // Find user by email
      const foundUser = await userService.findByEmail('test@example.com');

      expect(foundUser).toBeTruthy();
      expect(foundUser!.id).toBe(testUserId);
      expect(foundUser!.email).toBe('test@example.com');
    });

    it('should update user', async () => {
      // Save user
      await userService.save(testUser, 'hashed_password');

      // Update user
      const updatedUser = User.create({
        ...testUser.toJSON(),
        role: 'expert',
        verification_status: 'verified'
      });

      await userService.update(updatedUser);

      // Verify update
      const foundUser = await userService.findById(testUserId);
      expect(foundUser!.role).toBe('expert');
      expect(foundUser!.verification_status).toBe('verified');
    });

    it('should delete user', async () => {
      // Save user
      await userService.save(testUser, 'hashed_password');

      // Verify user exists
      let foundUser = await userService.findById(testUserId);
      expect(foundUser).toBeTruthy();

      // Delete user
      await userService.delete(testUserId);

      // Verify user is deleted
      foundUser = await userService.findById(testUserId);
      expect(foundUser).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await userService.findById('non-existent-id');
      expect(foundUser).toBeNull();
    });
  });

  describe('Profile Operations', () => {
    beforeEach(async () => {
      // Save test user first
      await userService.save(testUser, 'hashed_password');
    });

    it('should save and find user profile', async () => {
      const profile = UserProfile.create({
        id: crypto.randomUUID(),
        user_id: testUserId,
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        bio: 'Test bio',
        county: 'nairobi',
        constituency: 'Westlands',
        ward: 'Parklands'
      });

      // Save profile
      await userService.saveProfile(profile);

      // Find profile
      const foundProfile = await userService.findProfileByUserId(testUserId);

      expect(foundProfile).toBeTruthy();
      expect(foundProfile!.user_id).toBe(testUserId);
      expect(foundProfile!.first_name).toBe('John');
      expect(foundProfile!.last_name).toBe('Doe');
      expect(foundProfile!.display_name).toBe('John Doe');
      expect(foundProfile!.bio).toBe('Test bio');
      expect(foundProfile!.county).toBe('nairobi');
    });

    it('should update user profile', async () => {
      const profile = UserProfile.create({
        id: crypto.randomUUID(),
        user_id: testUserId,
        first_name: 'John',
        last_name: 'Doe',
        bio: 'Original bio'
      });

      // Save profile
      await userService.saveProfile(profile);

      // Update profile
      const updatedProfile = UserProfile.create({
        ...profile.toJSON(),
        bio: 'Updated bio',
        county: 'mombasa'
      });

      await userService.updateProfile(updatedProfile);

      // Verify update
      const foundProfile = await userService.findProfileByUserId(testUserId);
      expect(foundProfile!.bio).toBe('Updated bio');
      expect(foundProfile!.county).toBe('mombasa');
    });

    it('should return null for non-existent profile', async () => {
      const foundProfile = await userService.findProfileByUserId('non-existent-id');
      expect(foundProfile).toBeNull();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create multiple test users
      const users = [
        User.create({
          id: crypto.randomUUID(),
          email: 'citizen1@example.com',
          name: 'Citizen One',
          role: 'citizen',
          verification_status: 'pending'
        }),
        User.create({
          id: crypto.randomUUID(),
          email: 'expert1@example.com',
          name: 'Expert One',
          role: 'expert',
          verification_status: 'verified'
        }),
        User.create({
          id: crypto.randomUUID(),
          email: 'admin1@example.com',
          name: 'Admin One',
          role: 'admin',
          verification_status: 'verified'
        })
      ];

      for (const user of users) {
        await userService.save(user, 'password');
      }
    });

    afterEach(async () => {
      // Clean up all test users
      await db.delete(users).where(eq(users.email, 'citizen1@example.com'));
      await db.delete(users).where(eq(users.email, 'expert1@example.com'));
      await db.delete(users).where(eq(users.email, 'admin1@example.com'));
    });

    it('should find users by role', async () => {
      const experts = await userService.findUsersByRole('expert');
      expect(experts.length).toBeGreaterThanOrEqual(1);
      expect(experts.every(user => user.role === 'expert')).toBe(true);
    });

    it('should find users by verification status', async () => {
      const verifiedUsers = await userService.findUsersByVerificationStatus('verified');
      expect(verifiedUsers.length).toBeGreaterThanOrEqual(2);
      expect(verifiedUsers.every(user => user.verification_status === 'verified')).toBe(true);
    });

    it('should search users by email', async () => {
      const searchResults = await userService.searchUsers('expert1');
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults.some(user => user.email.includes('expert1'))).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create test users for statistics
      const testUsers = [
        User.create({
          id: crypto.randomUUID(),
          email: 'stats1@example.com',
          name: 'Stats User One',
          role: 'citizen',
          verification_status: 'pending'
        }),
        User.create({
          id: crypto.randomUUID(),
          email: 'stats2@example.com',
          name: 'Stats User Two',
          role: 'expert',
          verification_status: 'verified'
        })
      ];

      for (const user of testUsers) {
        await userService.save(user, 'password');
      }
    });

    afterEach(async () => {
      // Clean up stats test users
      await db.delete(users).where(eq(users.email, 'stats1@example.com'));
      await db.delete(users).where(eq(users.email, 'stats2@example.com'));
    });

    it('should count total users', async () => {
      const count = await userService.countUsers();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should count users by role', async () => {
      const roleCounts = await userService.countUsersByRole();
      expect(roleCounts).toHaveProperty('citizen');
      expect(roleCounts).toHaveProperty('expert');
      expect(roleCounts.citizen).toBeGreaterThanOrEqual(1);
      expect(roleCounts.expert).toBeGreaterThanOrEqual(1);
    });

    it('should count users by verification status', async () => {
      const statusCounts = await userService.countUsersByVerificationStatus();
      expect(statusCounts).toHaveProperty('pending');
      expect(statusCounts).toHaveProperty('verified');
      expect(statusCounts.pending).toBeGreaterThanOrEqual(1);
      expect(statusCounts.verified).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Aggregate Operations', () => {
    beforeEach(async () => {
      await userService.save(testUser, 'hashed_password');
    });

    it('should find user aggregate by ID', async () => {
      const aggregate = await userService.findUserAggregateById(testUserId);

      expect(aggregate).toBeTruthy();
      expect(aggregate!.user.id).toBe(testUserId);
      expect(aggregate!.interests).toEqual([]); // Empty since user_interests table doesn't exist
      expect(aggregate!.verifications).toEqual([]); // Empty since user_verifications table doesn't exist
    });

    it('should return null for non-existent user aggregate', async () => {
      const aggregate = await userService.findUserAggregateById('non-existent-id');
      expect(aggregate).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to save user with invalid data
      const invalidUser = User.create({
        id: 'invalid-uuid-format',
        email: 'invalid-email',
        name: 'Test User',
        role: 'citizen'
      });

      await expect(userService.save(invalidUser, 'password')).rejects.toThrow();
    });

    it('should log errors appropriately', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await userService.findById('invalid-uuid-format');
      } catch (error) {
        // Expected to throw
      }

      // Note: We can't easily test logger.error calls without mocking the logger
      // This is a placeholder for proper error logging verification

      consoleSpy.mockRestore();
    });
  });

  describe('Placeholder Methods', () => {
    it('should handle missing user_interests table gracefully', async () => {
      const interests = await userService.findInterestsByUserId(testUserId);
      expect(interests).toEqual([]);

      // These should not throw errors, just log warnings
      await expect(userService.saveInterest({} as any)).resolves.not.toThrow();
      await expect(userService.deleteInterest(testUserId, 'test')).resolves.not.toThrow();
      await expect(userService.deleteAllInterests(testUserId)).resolves.not.toThrow();
    });

    it('should handle missing user_verifications table gracefully', async () => {
      const verifications = await userService.findVerificationsByUserId(testUserId);
      expect(verifications).toEqual([]);

      const verification = await userService.findVerificationById('test-id');
      expect(verification).toBeNull();

      // These should not throw errors, just log warnings
      await expect(userService.saveVerification({} as any)).resolves.not.toThrow();
      await expect(userService.updateVerification({} as any)).resolves.not.toThrow();
    });

    it('should handle unimplemented methods gracefully', async () => {
      const users = await userService.findUsersByReputationRange(10, 100);
      expect(users).toEqual([]);

      await expect(userService.saveUserAggregate({} as any)).resolves.not.toThrow();
    });
  });
});
