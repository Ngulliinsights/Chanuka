/**
 * Data Retrieval Flow Integration Tests
 * Tests data retrieval and filtering across the stack
 * Validates: Requirements 9.1, 9.3
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupIntegrationTest, cleanIntegrationTest, teardownIntegrationTest, getTestContext } from '../helpers/test-context';
import { users, bills, sponsors, user_profiles } from '../../../server/infrastructure/schema/foundation';

describe('Feature: full-stack-integration - Data Retrieval Flow Integration Tests', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanIntegrationTest();
  });

  describe('User Data Retrieval', () => {
    it('should retrieve user with profile', async () => {
      const { db, apiClient } = getTestContext();

      // Create user with profile
      const [user] = await db.insert(users).values({
        email: 'retrieve@example.com',
        password_hash: '$2b$10$test',
        role: 'citizen',
        is_verified: true,
        is_active: true,
      }).returning();

      await db.insert(user_profiles).values({
        user_id: user.id,
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'johndoe',
        anonymity_level: 'public',
        is_public: true,
      });

      // Retrieve via API
      const response = await apiClient.getUser(user.id);

      expect(response.user).toBeDefined();
      expect(response.user.email).toBe(user.email);
      expect(response.user.profile).toBeDefined();
      expect(response.user.profile.first_name).toBe('John');
      expect(response.user.profile.last_name).toBe('Doe');
    });

    it('should filter users by role', async () => {
      const { db, apiClient } = getTestContext();

      // Create users with different roles
      await db.insert(users).values([
        {
          email: 'admin@example.com',
          password_hash: '$2b$10$test',
          role: 'admin',
          is_verified: true,
          is_active: true,
        },
        {
          email: 'citizen1@example.com',
          password_hash: '$2b$10$test',
          role: 'citizen',
          is_verified: true,
          is_active: true,
        },
        {
          email: 'citizen2@example.com',
          password_hash: '$2b$10$test',
          role: 'citizen',
          is_verified: true,
          is_active: true,
        },
      ]);

      // Retrieve citizens only
      const response = await apiClient.get('/api/users', {
        params: { role: 'citizen' },
      });

      expect(response.data.users).toBeDefined();
      expect(response.data.users.length).toBe(2);
      expect(response.data.users.every((u: any) => u.role === 'citizen')).toBe(true);
    });
  });

  describe('Bill Data Retrieval', () => {
    it('should retrieve bills with sponsor information', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor
      const [sponsor] = await db.insert(sponsors).values({
        name: 'Senator Retrieve',
        chamber: 'senate',
        party: 'jubilee',
        is_active: true,
      }).returning();

      // Create bill
      const [bill] = await db.insert(bills).values({
        bill_number: 'Bill No. 20 of 2024',
        title: 'Retrieve Test Bill',
        summary: 'Testing retrieval',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'senate',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-02-10'),
      }).returning();

      // Retrieve via API
      const response = await apiClient.getBill(bill.id);

      expect(response.bill).toBeDefined();
      expect(response.bill.sponsor).toBeDefined();
      expect(response.bill.sponsor.name).toBe(sponsor.name);
    });

    it('should filter bills by status', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor
      const [sponsor] = await db.insert(sponsors).values({
        name: 'MP Filter',
        chamber: 'national_assembly',
        party: 'odm',
        is_active: true,
      }).returning();

      // Create bills with different statuses
      await db.insert(bills).values([
        {
          bill_number: 'Bill No. 21 of 2024',
          title: 'First Reading Bill',
          summary: 'First reading',
          bill_type: 'public',
          status: 'first_reading',
          chamber: 'national_assembly',
          sponsor_id: sponsor.id,
          introduced_date: new Date('2024-02-11'),
        },
        {
          bill_number: 'Bill No. 22 of 2024',
          title: 'Second Reading Bill',
          summary: 'Second reading',
          bill_type: 'public',
          status: 'second_reading',
          chamber: 'national_assembly',
          sponsor_id: sponsor.id,
          introduced_date: new Date('2024-02-12'),
        },
        {
          bill_number: 'Bill No. 23 of 2024',
          title: 'Passed Bill',
          summary: 'Passed',
          bill_type: 'public',
          status: 'passed',
          chamber: 'national_assembly',
          sponsor_id: sponsor.id,
          introduced_date: new Date('2024-02-13'),
        },
      ]);

      // Retrieve passed bills only
      const response = await apiClient.getBills({ status: 'passed' });

      expect(response.bills).toBeDefined();
      expect(response.bills.length).toBe(1);
      expect(response.bills[0].status).toBe('passed');
    });

    it('should filter bills by chamber', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsors for different chambers
      const [senateSponsor] = await db.insert(sponsors).values({
        name: 'Senator Chamber',
        chamber: 'senate',
        party: 'wiper',
        is_active: true,
      }).returning();

      const [assemblySponsor] = await db.insert(sponsors).values({
        name: 'MP Chamber',
        chamber: 'national_assembly',
        party: 'ford_kenya',
        is_active: true,
      }).returning();

      // Create bills in different chambers
      await db.insert(bills).values([
        {
          bill_number: 'Bill No. 24 of 2024',
          title: 'Senate Bill',
          summary: 'Senate',
          bill_type: 'public',
          status: 'first_reading',
          chamber: 'senate',
          sponsor_id: senateSponsor.id,
          introduced_date: new Date('2024-02-14'),
        },
        {
          bill_number: 'Bill No. 25 of 2024',
          title: 'Assembly Bill',
          summary: 'Assembly',
          bill_type: 'public',
          status: 'first_reading',
          chamber: 'national_assembly',
          sponsor_id: assemblySponsor.id,
          introduced_date: new Date('2024-02-15'),
        },
      ]);

      // Retrieve senate bills only
      const response = await apiClient.getBills({ chamber: 'senate' });

      expect(response.bills).toBeDefined();
      expect(response.bills.length).toBe(1);
      expect(response.bills[0].chamber).toBe('senate');
    });
  });

  describe('Pagination and Sorting', () => {
    it('should paginate results correctly', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor
      const [sponsor] = await db.insert(sponsors).values({
        name: 'Senator Page',
        chamber: 'senate',
        party: 'jubilee',
        is_active: true,
      }).returning();

      // Create 15 bills
      const billsData = Array.from({ length: 15 }, (_, i) => ({
        bill_number: `Bill No. ${30 + i} of 2024`,
        title: `Pagination Bill ${i + 1}`,
        summary: `Summary ${i + 1}`,
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'senate',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-02-16'),
      }));

      await db.insert(bills).values(billsData);

      // Get first page
      const page1 = await apiClient.getBills({ limit: 10, offset: 0 });
      expect(page1.bills.length).toBe(10);
      expect(page1.total).toBe(15);

      // Get second page
      const page2 = await apiClient.getBills({ limit: 10, offset: 10 });
      expect(page2.bills.length).toBe(5);
      expect(page2.total).toBe(15);
    });

    it('should sort results by date', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor
      const [sponsor] = await db.insert(sponsors).values({
        name: 'MP Sort',
        chamber: 'national_assembly',
        party: 'odm',
        is_active: true,
      }).returning();

      // Create bills with different dates
      await db.insert(bills).values([
        {
          bill_number: 'Bill No. 50 of 2024',
          title: 'Oldest Bill',
          summary: 'Oldest',
          bill_type: 'public',
          status: 'first_reading',
          chamber: 'national_assembly',
          sponsor_id: sponsor.id,
          introduced_date: new Date('2024-01-01'),
        },
        {
          bill_number: 'Bill No. 51 of 2024',
          title: 'Newest Bill',
          summary: 'Newest',
          bill_type: 'public',
          status: 'first_reading',
          chamber: 'national_assembly',
          sponsor_id: sponsor.id,
          introduced_date: new Date('2024-03-01'),
        },
        {
          bill_number: 'Bill No. 52 of 2024',
          title: 'Middle Bill',
          summary: 'Middle',
          bill_type: 'public',
          status: 'first_reading',
          chamber: 'national_assembly',
          sponsor_id: sponsor.id,
          introduced_date: new Date('2024-02-01'),
        },
      ]);

      // Get bills sorted by date descending
      const response = await apiClient.getBills({ sort: 'introduced_date', order: 'desc' });

      expect(response.bills[0].title).toBe('Newest Bill');
      expect(response.bills[2].title).toBe('Oldest Bill');
    });
  });
});
