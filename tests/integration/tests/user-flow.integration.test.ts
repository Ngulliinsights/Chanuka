/**
 * User Flow Integration Tests
 * Tests user creation, authentication, and profile management flows
 * Validates: Requirements 9.1, 9.3
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupIntegrationTest, cleanIntegrationTest, teardownIntegrationTest, getTestContext } from '../helpers/test-context';
import { createTestUser, createTestUserProfile } from '../fixtures';
import { users, user_profiles } from '../../../server/infrastructure/schema/foundation';

describe('Feature: full-stack-integration - User Flow Integration Tests', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanIntegrationTest();
  });

  describe('User Creation Flow (client→server→database)', () => {
    it('should create a user through the full stack', async () => {
      const { db, apiClient } = getTestContext();

      // 1. Create user via API (client perspective)
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        username: 'newuser',
      };

      const response = await apiClient.register(userData);

      // 2. Verify API response
      expect(response).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe(userData.email.toLowerCase());

      // 3. Verify data in database
      const dbUsers = await db.select().from(users).where(eq(users.email, userData.email.toLowerCase()));
      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].email).toBe(userData.email.toLowerCase());
      expect(dbUsers[0].is_active).toBe(true);
    });

    it('should create user with profile', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const userData = {
        email: 'profileuser@example.com',
        password: 'SecurePassword123!',
        username: 'profileuser',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await apiClient.register(userData);
      const userId = response.user.id;

      // Verify profile was created
      const dbProfiles = await db.select().from(user_profiles).where(eq(user_profiles.user_id, userId));
      expect(dbProfiles).toHaveLength(1);
      expect(dbProfiles[0].first_name).toBe(userData.firstName);
      expect(dbProfiles[0].last_name).toBe(userData.lastName);
    });

    it('should reject duplicate email', async () => {
      const { apiClient } = getTestContext();

      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        username: 'user1',
      };

      // Create first user
      await apiClient.register(userData);

      // Try to create duplicate
      const response = await apiClient.register({
        ...userData,
        username: 'user2',
      });

      expect(response.status).toBe(409); // Conflict
      expect(response.error).toBeDefined();
    });
  });

  describe('User Authentication Flow', () => {
    it('should authenticate user and return token', async () => {
      const { apiClient } = getTestContext();

      // Register user
      const userData = {
        email: 'authuser@example.com',
        password: 'SecurePassword123!',
        username: 'authuser',
      };

      await apiClient.register(userData);

      // Login
      const loginResponse = await apiClient.login(userData.email, userData.password);

      expect(loginResponse.token).toBeDefined();
      expect(loginResponse.user).toBeDefined();
      expect(loginResponse.user.email).toBe(userData.email.toLowerCase());
    });

    it('should access protected route with token', async () => {
      const { apiClient } = getTestContext();

      // Register and login
      const userData = {
        email: 'protected@example.com',
        password: 'SecurePassword123!',
        username: 'protecteduser',
      };

      await apiClient.register(userData);
      await apiClient.login(userData.email, userData.password);

      // Access protected route
      const currentUser = await apiClient.getCurrentUser();

      expect(currentUser).toBeDefined();
      expect(currentUser.email).toBe(userData.email.toLowerCase());
    });

    it('should reject invalid credentials', async () => {
      const { apiClient } = getTestContext();

      // Register user
      await apiClient.register({
        email: 'validuser@example.com',
        password: 'SecurePassword123!',
        username: 'validuser',
      });

      // Try to login with wrong password
      try {
        await apiClient.login('validuser@example.com', 'WrongPassword');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Login failed');
      }
    });
  });

  describe('User Profile Management Flow', () => {
    it('should update user profile', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const userData = {
        email: 'updateuser@example.com',
        password: 'SecurePassword123!',
        username: 'updateuser',
      };

      const registerResponse = await apiClient.register(userData);
      await apiClient.login(userData.email, userData.password);

      // Update profile
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Updated bio',
      };

      const updateResponse = await apiClient.updateUser(registerResponse.user.id, updateData);

      expect(updateResponse.user.profile.first_name).toBe(updateData.firstName);
      expect(updateResponse.user.profile.last_name).toBe(updateData.lastName);

      // Verify in database
      const dbProfiles = await db.select().from(user_profiles).where(eq(user_profiles.user_id, registerResponse.user.id));
      expect(dbProfiles[0].first_name).toBe(updateData.firstName);
      expect(dbProfiles[0].bio).toBe(updateData.bio);
    });

    it('should retrieve user profile', async () => {
      const { apiClient } = getTestContext();

      // Create user
      const userData = {
        email: 'getuser@example.com',
        password: 'SecurePassword123!',
        username: 'getuser',
        firstName: 'Get',
        lastName: 'User',
      };

      const registerResponse = await apiClient.register(userData);

      // Get user profile
      const userProfile = await apiClient.getUser(registerResponse.user.id);

      expect(userProfile).toBeDefined();
      expect(userProfile.email).toBe(userData.email.toLowerCase());
      expect(userProfile.profile.first_name).toBe(userData.firstName);
    });
  });

  describe('Data Transformation Verification', () => {
    it('should maintain data integrity through transformation pipeline', async () => {
      const { db, apiClient } = getTestContext();

      // Create user via API
      const userData = {
        email: 'transform@example.com',
        password: 'SecurePassword123!',
        username: 'transformuser',
        firstName: 'Transform',
        lastName: 'Test',
      };

      const apiResponse = await apiClient.register(userData);

      // Get from database
      const dbUsers = await db.select().from(users).where(eq(users.id, apiResponse.user.id));
      const dbProfiles = await db.select().from(user_profiles).where(eq(user_profiles.user_id, apiResponse.user.id));

      // Verify transformations are correct
      expect(apiResponse.user.id).toBe(dbUsers[0].id);
      expect(apiResponse.user.email).toBe(dbUsers[0].email);
      expect(apiResponse.user.role).toBe(dbUsers[0].role);
      expect(apiResponse.user.profile.first_name).toBe(dbProfiles[0].first_name);
      expect(apiResponse.user.profile.last_name).toBe(dbProfiles[0].last_name);
    });
  });
});
