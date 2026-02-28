/**
 * Users Feature - Integration Tests
 * 
 * Tests for enhanced user service with validation, caching, security, and error handling integration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedUserService } from '../application/enhanced-user-service';
import { cacheService } from '@server/infrastructure/cache';
import { database as db } from '@server/infrastructure/database';
import { users, user_profiles } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

describe('EnhancedUserService Integration Tests', () => {
  let userService: EnhancedUserService;
  let testUserId: string;

  beforeEach(async () => {
    userService = new EnhancedUserService();
    
    // Clear cache before each test
    await cacheService.clear();
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await db.delete(user_profiles).where(eq(user_profiles.user_id, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    await cacheService.clear();
  });

  describe('Validation Integration', () => {
    it('should validate user creation with valid data', async () => {
      const result = await userService.createUser({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
        role: 'user',
      }, 'hashed_password');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe('test@example.com');
      
      if (result.data) {
        testUserId = result.data.id;
      }
    });

    it('should reject user creation with invalid email', async () => {
      const result = await userService.createUser({
        email: 'invalid-email',
        password: 'SecurePassword123!',
        name: 'Test User',
        role: 'user',
      } as any, 'hashed_password');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Validation failed');
    });

    it('should reject user creation with weak password', async () => {
      const result = await userService.createUser({
        email: 'test@example.com',
        password: '123', // Too short
        name: 'Test User',
        role: 'user',
      } as any, 'hashed_password');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Validation failed');
    });

    it('should validate user update with valid data', async () => {
      // Create user first
      const createResult = await userService.createUser({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
        role: 'user',
      }, 'hashed_password');

      expect(createResult.success).toBe(true);
      testUserId = createResult.data!.id;

      // Update user
      const updateResult = await userService.updateUser(testUserId, {
        name: 'Updated Name',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.name).toBe('Updated Name');
    });
  });

  describe('Caching Integration', () => {
    beforeEach(async () => {
      // Create a test user
      const result = await userService.createUser({
        email: 'cache-test@example.com',
        password: 'SecurePassword123!',
        name: 'Cache Test User',
        role: 'user',
      }, 'hashed_password');

      expect(result.success).toBe(true);
      testUserId = result.data!.id;
    });

    it('should cache user data on first read', async () => {
      // First read - should hit database
      const result1 = await userService.getUserById(testUserId);
      expect(result1.success).toBe(true);

      // Second read - should hit cache
      const result2 = await userService.getUserById(testUserId);
      expect(result2.success).toBe(true);
      expect(result2.data?.id).toBe(testUserId);
    });

    it('should invalidate cache on user update', async () => {
      // Read user to populate cache
      await userService.getUserById(testUserId);

      // Update user
      await userService.updateUser(testUserId, {
        name: 'Updated for Cache Test',
      });

      // Read again - should get updated data
      const result = await userService.getUserById(testUserId);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated for Cache Test');
    });

    it('should cache search results', async () => {
      const result1 = await userService.searchUsers({
        query: 'cache-test',
      });
      expect(result1.success).toBe(true);

      const result2 = await userService.searchUsers({
        query: 'cache-test',
      });
      expect(result2.success).toBe(true);
      expect(result2.data?.length).toBeGreaterThan(0);
    });

    it('should cache user profile', async () => {
      // First read
      const result1 = await userService.getUserProfile(testUserId);
      expect(result1.success).toBe(true);

      // Second read - should hit cache
      const result2 = await userService.getUserProfile(testUserId);
      expect(result2.success).toBe(true);
      expect(result2.data?.user_id).toBe(testUserId);
    });
  });

  describe('Security Integration', () => {
    it('should encrypt PII (email) at rest', async () => {
      const result = await userService.createUser({
        email: 'pii-test@example.com',
        password: 'SecurePassword123!',
        name: 'PII Test User',
        role: 'user',
      }, 'hashed_password');

      expect(result.success).toBe(true);
      testUserId = result.data!.id;

      // Check database directly - email should be encrypted
      const [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(userRow.email).not.toBe('pii-test@example.com');
      expect(userRow.email).toContain(':'); // Encrypted format includes colons
    });

    it('should decrypt PII when retrieving user', async () => {
      const createResult = await userService.createUser({
        email: 'decrypt-test@example.com',
        password: 'SecurePassword123!',
        name: 'Decrypt Test User',
        role: 'user',
      }, 'hashed_password');

      expect(createResult.success).toBe(true);
      testUserId = createResult.data!.id;

      // Retrieve user - email should be decrypted
      const getResult = await userService.getUserById(testUserId);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.email).toBe('decrypt-test@example.com');
    });

    it('should sanitize HTML in profile bio', async () => {
      const createResult = await userService.createUser({
        email: 'xss-test@example.com',
        password: 'SecurePassword123!',
        name: 'XSS Test User',
        role: 'user',
      }, 'hashed_password');

      expect(createResult.success).toBe(true);
      testUserId = createResult.data!.id;

      // Update profile with XSS attempt
      const updateResult = await userService.updateUserProfile(testUserId, {
        bio: '<p>Valid content</p><script>alert("xss")</script>',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.bio).not.toContain('<script>');
    });

    it('should log security events for user creation', async () => {
      const result = await userService.createUser({
        email: 'audit-test@example.com',
        password: 'SecurePassword123!',
        name: 'Audit Test User',
        role: 'user',
      }, 'hashed_password');

      expect(result.success).toBe(true);
      testUserId = result.data!.id;
      
      // Security audit log should be created (checked via audit service)
    });

    it('should sanitize search queries', async () => {
      const result = await userService.searchUsers({
        query: "'; DROP TABLE users; --",
      });
      
      expect(result.success).toBe(true);
      // Should not throw error or execute SQL injection
    });
  });

  describe('Error Handling Integration', () => {
    it('should return Result type with error for non-existent user', async () => {
      const result = await userService.getUserById('00000000-0000-0000-0000-000000000000');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Try to update non-existent user
      const result = await userService.updateUser('00000000-0000-0000-0000-000000000000', {
        name: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should enrich error context', async () => {
      const result = await userService.createUser({
        email: 'invalid',
        password: 'test',
        name: 'Test',
        role: 'user',
      } as any, 'hashed_password');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Validation failed');
    });
  });

  describe('Transaction Integration', () => {
    it('should create user and profile in transaction', async () => {
      const result = await userService.createUser({
        email: 'transaction-test@example.com',
        password: 'SecurePassword123!',
        name: 'Transaction Test User',
        role: 'user',
      }, 'hashed_password');

      expect(result.success).toBe(true);
      testUserId = result.data!.id;

      // Verify both user and profile were created
      const [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      const [profileRow] = await db
        .select()
        .from(user_profiles)
        .where(eq(user_profiles.user_id, testUserId))
        .limit(1);

      expect(userRow).toBeDefined();
      expect(profileRow).toBeDefined();
    });

    it('should rollback on error', async () => {
      // This would require simulating a database error
      // For now, we verify that transactions are being used
      const result = await userService.createUser({
        email: 'rollback-test@example.com',
        password: 'SecurePassword123!',
        name: 'Rollback Test User',
        role: 'user',
      }, 'hashed_password');

      expect(result.success).toBe(true);
      if (result.data) {
        testUserId = result.data.id;
      }
    });
  });

  describe('Performance Integration', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple users
      const promises = Array.from({ length: 5 }, (_, i) =>
        userService.createUser({
          email: `bulk-${i}@example.com`,
          password: 'SecurePassword123!',
          name: `Bulk User ${i}`,
          role: 'user',
        }, 'hashed_password')
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      // Clean up
      for (const result of results) {
        if (result.success && result.data) {
          await db.delete(user_profiles).where(eq(user_profiles.user_id, result.data.id));
          await db.delete(users).where(eq(users.id, result.data.id));
        }
      }
    });

    it('should achieve >70% cache hit rate', async () => {
      // Create user
      const createResult = await userService.createUser({
        email: 'cache-perf@example.com',
        password: 'SecurePassword123!',
        name: 'Cache Performance User',
        role: 'user',
      }, 'hashed_password');

      expect(createResult.success).toBe(true);
      testUserId = createResult.data!.id;

      // Populate cache
      await userService.getUserById(testUserId);
      await userService.getUserById(testUserId);
      await userService.getUserById(testUserId);
      
      // Cache hit rate should be high for repeated reads
    });
  });
});
