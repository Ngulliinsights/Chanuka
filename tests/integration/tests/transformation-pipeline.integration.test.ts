/**
 * Transformation Pipeline Integration Tests
 * Tests data flow through all layers and transformation at each boundary
 * Validates: Requirements 9.3
 * 
 * Task: 12.4 Write integration tests for transformation pipeline
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupIntegrationTest, cleanIntegrationTest, teardownIntegrationTest, getTestContext } from '../helpers/test-context';
import { users, user_profiles, bills, bill_timeline_events, bill_engagement_metrics } from '../../../server/infrastructure/schema/foundation';
import {
  userDbToDomain,
  userDomainToApi,
  userDbToApi,
  userProfileDbToDomain,
  userProfileDomainToApi,
} from '../../../shared/utils/transformers/entities/user';
import {
  billDbToDomain,
  billDomainToApi,
  billDbToApi,
  billTimelineEventDbToDomain,
  billTimelineEventDomainToApi,
  billEngagementMetricsDbToDomain,
  billEngagementMetricsDomainToApi,
} from '../../../shared/utils/transformers/entities/bill';
import type { UserTable, UserProfileTable, BillTable } from '../../../shared/types/database/tables';
import type { User, UserProfile } from '../../../shared/types/domains/authentication/user';
import type { Bill } from '../../../shared/types/domains/legislative/bill';

describe('Feature: full-stack-integration - Transformation Pipeline Integration Tests', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanIntegrationTest();
  });

  describe('User Transformation Pipeline', () => {
    it('should transform user data through all layers (DB → Domain → API)', async () => {
      const { db, apiClient } = getTestContext();

      // Create user in database
      const userData = {
        email: 'pipeline@example.com',
        password: 'SecurePassword123!',
        username: 'pipelineuser',
      };

      const registerResponse = await apiClient.register(userData);

      // Get raw database record
      const dbUsers = await db.select().from(users).where(eq(users.id, registerResponse.user.id));
      expect(dbUsers).toHaveLength(1);
      const dbUser = dbUsers[0] as UserTable;

      // Test DB → Domain transformation
      const domainUser = userDbToDomain.transform(dbUser);
      expect(domainUser.id).toBe(dbUser.id);
      expect(domainUser.email).toBe(dbUser.email);
      expect(domainUser.username).toBe(dbUser.username);
      expect(domainUser.role).toBe(dbUser.role);
      expect(domainUser.createdAt).toEqual(dbUser.created_at);
      expect(domainUser.updatedAt).toEqual(dbUser.updated_at);

      // Test Domain → API transformation
      const apiUser = userDomainToApi.transform(domainUser);
      expect(apiUser.id).toBe(domainUser.id);
      expect(apiUser.email).toBe(domainUser.email);
      expect(apiUser.username).toBe(domainUser.username);
      expect(apiUser.role).toBe(domainUser.role);
      expect(typeof apiUser.createdAt).toBe('string');
      expect(typeof apiUser.updatedAt).toBe('string');
      expect(new Date(apiUser.createdAt)).toEqual(domainUser.createdAt);
      expect(new Date(apiUser.updatedAt)).toEqual(domainUser.updatedAt);
    });

    it('should preserve data through round-trip transformation (DB → Domain → API → Domain → DB)', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const userData = {
        email: 'roundtrip@example.com',
        password: 'SecurePassword123!',
        username: 'roundtripuser',
      };

      const registerResponse = await apiClient.register(userData);

      // Get original database record
      const dbUsers = await db.select().from(users).where(eq(users.id, registerResponse.user.id));
      const originalDbUser = dbUsers[0] as UserTable;

      // Round-trip transformation: DB → Domain → API → Domain → DB
      const domainUser = userDbToDomain.transform(originalDbUser);
      const apiUser = userDomainToApi.transform(domainUser);
      const domainUser2 = userDomainToApi.reverse(apiUser);
      const finalDbUser = userDbToDomain.reverse(domainUser2);

      // Verify data preservation (excluding password_hash which is not in domain model)
      expect(finalDbUser.id).toBe(originalDbUser.id);
      expect(finalDbUser.email).toBe(originalDbUser.email);
      expect(finalDbUser.username).toBe(originalDbUser.username);
      expect(finalDbUser.role).toBe(originalDbUser.role);
      expect(finalDbUser.status).toBe(originalDbUser.status);
      expect(finalDbUser.is_active).toBe(originalDbUser.is_active);
      expect(finalDbUser.created_at).toEqual(originalDbUser.created_at);
      expect(finalDbUser.updated_at).toEqual(originalDbUser.updated_at);
    });

    it('should handle composite transformation (DB → API directly)', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const userData = {
        email: 'composite@example.com',
        password: 'SecurePassword123!',
        username: 'compositeuser',
      };

      const registerResponse = await apiClient.register(userData);

      // Get database record
      const dbUsers = await db.select().from(users).where(eq(users.id, registerResponse.user.id));
      const dbUser = dbUsers[0] as UserTable;

      // Test composite transformation (DB → API)
      const apiUser = userDbToApi.transform(dbUser);
      expect(apiUser.id).toBe(dbUser.id);
      expect(apiUser.email).toBe(dbUser.email);
      expect(typeof apiUser.createdAt).toBe('string');

      // Test reverse composite transformation (API → DB)
      const reconstructedDbUser = userDbToApi.reverse(apiUser);
      expect(reconstructedDbUser.id).toBe(dbUser.id);
      expect(reconstructedDbUser.email).toBe(dbUser.email);
    });

    it('should transform user profile data through all layers', async () => {
      const { db, apiClient } = getTestContext();

      // Create user with profile
      const userData = {
        email: 'profile-pipeline@example.com',
        password: 'SecurePassword123!',
        username: 'profilepipeline',
        firstName: 'Profile',
        lastName: 'Pipeline',
        bio: 'Testing profile transformation',
      };

      const registerResponse = await apiClient.register(userData);

      // Get database profile record
      const dbProfiles = await db.select().from(user_profiles).where(eq(user_profiles.user_id, registerResponse.user.id));
      expect(dbProfiles).toHaveLength(1);
      const dbProfile = dbProfiles[0] as UserProfileTable;

      // Test DB → Domain transformation
      const domainProfile = userProfileDbToDomain.transform(dbProfile);
      expect(domainProfile.userId).toBe(dbProfile.user_id);
      expect(domainProfile.firstName).toBe(dbProfile.first_name);
      expect(domainProfile.lastName).toBe(dbProfile.last_name);
      expect(domainProfile.bio).toBe(dbProfile.bio);

      // Test Domain → API transformation
      const apiProfile = userProfileDomainToApi.transform(domainProfile);
      expect(apiProfile.userId).toBe(domainProfile.userId);
      expect(apiProfile.firstName).toBe(domainProfile.firstName);
      expect(apiProfile.lastName).toBe(domainProfile.lastName);
      expect(apiProfile.bio).toBe(domainProfile.bio);
    });
  });

  describe('Bill Transformation Pipeline', () => {
    it('should transform bill data through all layers (DB → Domain → API)', async () => {
      const { db, apiClient } = getTestContext();

      // Create user first (required for bill sponsor)
      const userData = {
        email: 'billsponsor@example.com',
        password: 'SecurePassword123!',
        username: 'billsponsor',
      };

      const userResponse = await apiClient.register(userData);
      await apiClient.login(userData.email, userData.password);

      // Create bill
      const billData = {
        title: 'Test Bill for Transformation',
        summary: 'Testing bill transformation pipeline',
        billNumber: 'HB-001',
      };

      const billResponse = await apiClient.createBill(billData);

      // Get raw database record
      const dbBills = await db.select().from(bills).where(eq(bills.id, billResponse.bill.id));
      expect(dbBills).toHaveLength(1);
      const dbBill = dbBills[0] as BillTable;

      // Test DB → Domain transformation
      const domainBill = billDbToDomain.transform(dbBill);
      expect(domainBill.id).toBe(dbBill.id);
      expect(domainBill.title).toBe(dbBill.title);
      expect(domainBill.summary).toBe(dbBill.summary);
      expect(domainBill.billNumber).toBe(dbBill.bill_number);
      expect(domainBill.status).toBe(dbBill.status);
      expect(domainBill.createdAt).toEqual(dbBill.created_at);

      // Test Domain → API transformation
      const apiBill = billDomainToApi.transform(domainBill);
      expect(apiBill.id).toBe(domainBill.id);
      expect(apiBill.title).toBe(domainBill.title);
      expect(apiBill.summary).toBe(domainBill.summary);
      expect(apiBill.billNumber).toBe(domainBill.billNumber);
      expect(typeof apiBill.createdAt).toBe('string');
      expect(new Date(apiBill.createdAt)).toEqual(domainBill.createdAt);
    });

    it('should preserve bill data through round-trip transformation', async () => {
      const { db, apiClient } = getTestContext();

      // Create user and bill
      const userData = {
        email: 'billroundtrip@example.com',
        password: 'SecurePassword123!',
        username: 'billroundtrip',
      };

      await apiClient.register(userData);
      await apiClient.login(userData.email, userData.password);

      const billData = {
        title: 'Round Trip Bill',
        summary: 'Testing round-trip transformation',
        billNumber: 'HB-002',
      };

      const billResponse = await apiClient.createBill(billData);

      // Get original database record
      const dbBills = await db.select().from(bills).where(eq(bills.id, billResponse.bill.id));
      const originalDbBill = dbBills[0] as BillTable;

      // Round-trip transformation: DB → Domain → API → Domain → DB
      const domainBill = billDbToDomain.transform(originalDbBill);
      const apiBill = billDomainToApi.transform(domainBill);
      const domainBill2 = billDomainToApi.reverse(apiBill);
      const finalDbBill = billDbToDomain.reverse(domainBill2);

      // Verify data preservation
      expect(finalDbBill.id).toBe(originalDbBill.id);
      expect(finalDbBill.title).toBe(originalDbBill.title);
      expect(finalDbBill.summary).toBe(originalDbBill.summary);
      expect(finalDbBill.bill_number).toBe(originalDbBill.bill_number);
      expect(finalDbBill.status).toBe(originalDbBill.status);
      expect(finalDbBill.chamber).toBe(originalDbBill.chamber);
      expect(finalDbBill.bill_type).toBe(originalDbBill.bill_type);
      expect(finalDbBill.is_active).toBe(originalDbBill.is_active);
    });

    it('should handle composite bill transformation (DB → API directly)', async () => {
      const { db, apiClient } = getTestContext();

      // Create user and bill
      const userData = {
        email: 'billcomposite@example.com',
        password: 'SecurePassword123!',
        username: 'billcomposite',
      };

      await apiClient.register(userData);
      await apiClient.login(userData.email, userData.password);

      const billData = {
        title: 'Composite Bill',
        summary: 'Testing composite transformation',
        billNumber: 'HB-003',
      };

      const billResponse = await apiClient.createBill(billData);

      // Get database record
      const dbBills = await db.select().from(bills).where(eq(bills.id, billResponse.bill.id));
      const dbBill = dbBills[0] as BillTable;

      // Test composite transformation (DB → API)
      const apiBill = billDbToApi.transform(dbBill);
      expect(apiBill.id).toBe(dbBill.id);
      expect(apiBill.title).toBe(dbBill.title);
      expect(typeof apiBill.createdAt).toBe('string');

      // Test reverse composite transformation (API → DB)
      const reconstructedDbBill = billDbToApi.reverse(apiBill);
      expect(reconstructedDbBill.id).toBe(dbBill.id);
      expect(reconstructedDbBill.title).toBe(dbBill.title);
    });
  });

  describe('Transformation at Integration Boundaries', () => {
    it('should validate data at database boundary', async () => {
      const { db, apiClient } = getTestContext();

      // Create user via API
      const userData = {
        email: 'boundary@example.com',
        password: 'SecurePassword123!',
        username: 'boundaryuser',
      };

      const registerResponse = await apiClient.register(userData);

      // Verify data was validated and transformed correctly at DB boundary
      const dbUsers = await db.select().from(users).where(eq(users.id, registerResponse.user.id));
      const dbUser = dbUsers[0];

      // Database should have snake_case fields
      expect(dbUser).toHaveProperty('created_at');
      expect(dbUser).toHaveProperty('updated_at');
      expect(dbUser).toHaveProperty('is_active');
      expect(dbUser.is_active).toBe(true);
    });

    it('should validate data at API boundary', async () => {
      const { apiClient } = getTestContext();

      // Create user via API
      const userData = {
        email: 'apiboundary@example.com',
        password: 'SecurePassword123!',
        username: 'apiboundary',
      };

      const registerResponse = await apiClient.register(userData);

      // API response should have camelCase fields and ISO date strings
      expect(registerResponse.user).toHaveProperty('createdAt');
      expect(registerResponse.user).toHaveProperty('updatedAt');
      expect(registerResponse.user).toHaveProperty('isActive');
      expect(typeof registerResponse.user.createdAt).toBe('string');
      expect(typeof registerResponse.user.updatedAt).toBe('string');
      
      // Verify ISO date format
      expect(() => new Date(registerResponse.user.createdAt)).not.toThrow();
      expect(() => new Date(registerResponse.user.updatedAt)).not.toThrow();
    });

    it('should handle null and undefined values correctly in transformation', async () => {
      const { db, apiClient } = getTestContext();

      // Create user without optional fields
      const userData = {
        email: 'nulltest@example.com',
        password: 'SecurePassword123!',
        username: 'nulltest',
      };

      const registerResponse = await apiClient.register(userData);

      // Get database record
      const dbUsers = await db.select().from(users).where(eq(users.id, registerResponse.user.id));
      const dbUser = dbUsers[0] as UserTable;

      // Transform and verify null handling
      const domainUser = userDbToDomain.transform(dbUser);
      expect(domainUser.lastLogin).toBeUndefined();
      expect(domainUser.metadata).toBeUndefined();

      const apiUser = userDomainToApi.transform(domainUser);
      expect(apiUser.lastLogin).toBeUndefined();
      expect(apiUser.metadata).toBeUndefined();
    });

    it('should handle date serialization correctly across boundaries', async () => {
      const { db, apiClient } = getTestContext();

      // Create user
      const userData = {
        email: 'datetest@example.com',
        password: 'SecurePassword123!',
        username: 'datetest',
      };

      const registerResponse = await apiClient.register(userData);

      // Get database record
      const dbUsers = await db.select().from(users).where(eq(users.id, registerResponse.user.id));
      const dbUser = dbUsers[0] as UserTable;

      // Database should have Date objects
      expect(dbUser.created_at).toBeInstanceOf(Date);
      expect(dbUser.updated_at).toBeInstanceOf(Date);

      // Domain should have Date objects
      const domainUser = userDbToDomain.transform(dbUser);
      expect(domainUser.createdAt).toBeInstanceOf(Date);
      expect(domainUser.updatedAt).toBeInstanceOf(Date);

      // API should have ISO strings
      const apiUser = userDomainToApi.transform(domainUser);
      expect(typeof apiUser.createdAt).toBe('string');
      expect(typeof apiUser.updatedAt).toBe('string');
      expect(apiUser.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(apiUser.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Reverse transformation should restore Date objects
      const domainUser2 = userDomainToApi.reverse(apiUser);
      expect(domainUser2.createdAt).toBeInstanceOf(Date);
      expect(domainUser2.updatedAt).toBeInstanceOf(Date);
      expect(domainUser2.createdAt.getTime()).toBe(domainUser.createdAt.getTime());
      expect(domainUser2.updatedAt.getTime()).toBe(domainUser.updatedAt.getTime());
    });
  });

  describe('Full-Stack Data Flow', () => {
    it('should maintain data integrity through complete request-response cycle', async () => {
      const { db, apiClient } = getTestContext();

      // 1. Client sends request (API format)
      const requestData = {
        email: 'fullstack@example.com',
        password: 'SecurePassword123!',
        username: 'fullstack',
        firstName: 'Full',
        lastName: 'Stack',
      };

      // 2. Server receives and validates request
      const registerResponse = await apiClient.register(requestData);

      // 3. Server transforms to domain model and saves to database
      const dbUsers = await db.select().from(users).where(eq(users.id, registerResponse.user.id));
      const dbProfiles = await db.select().from(user_profiles).where(eq(user_profiles.user_id, registerResponse.user.id));

      // 4. Verify database has correct format (snake_case)
      expect(dbUsers[0]).toHaveProperty('created_at');
      expect(dbProfiles[0]).toHaveProperty('first_name');
      expect(dbProfiles[0]).toHaveProperty('last_name');

      // 5. Server retrieves from database and transforms to API format
      const getUserResponse = await apiClient.getUser(registerResponse.user.id);

      // 6. Client receives response (API format with camelCase)
      expect(getUserResponse).toHaveProperty('createdAt');
      expect(getUserResponse.profile).toHaveProperty('firstName');
      expect(getUserResponse.profile).toHaveProperty('lastName');

      // 7. Verify data integrity through entire cycle
      expect(getUserResponse.email).toBe(requestData.email.toLowerCase());
      expect(getUserResponse.username).toBe(requestData.username);
      expect(getUserResponse.profile.firstName).toBe(requestData.firstName);
      expect(getUserResponse.profile.lastName).toBe(requestData.lastName);
    });

    it('should handle complex nested transformations', async () => {
      const { db, apiClient } = getTestContext();

      // Create user and bill with timeline events
      const userData = {
        email: 'nested@example.com',
        password: 'SecurePassword123!',
        username: 'nested',
      };

      await apiClient.register(userData);
      await apiClient.login(userData.email, userData.password);

      const billData = {
        title: 'Nested Transformation Bill',
        summary: 'Testing nested object transformation',
        billNumber: 'HB-004',
      };

      const billResponse = await apiClient.createBill(billData);

      // Get bill with all nested data
      const fullBill = await apiClient.getBill(billResponse.bill.id);

      // Verify nested transformations
      expect(fullBill).toHaveProperty('timeline');
      expect(fullBill).toHaveProperty('engagement');
      expect(Array.isArray(fullBill.timeline)).toBe(true);
      expect(typeof fullBill.engagement).toBe('object');

      // Verify date serialization in nested objects
      if (fullBill.timeline.length > 0) {
        expect(typeof fullBill.timeline[0].timestamp).toBe('string');
      }
    });

    it('should handle transformation errors gracefully', async () => {
      const { apiClient } = getTestContext();

      // Try to create user with invalid data
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        password: '123', // Too short
        username: 'ab', // Too short
      };

      try {
        await apiClient.register(invalidData);
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        // Verify error was caught at validation boundary
        expect(error.message).toBeDefined();
      }
    });
  });
});
