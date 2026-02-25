/**
 * Bill Flow Integration Tests
 * Tests bill creation, updates, and retrieval flows
 * Validates: Requirements 9.1, 9.3
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupIntegrationTest, cleanIntegrationTest, teardownIntegrationTest, getTestContext } from '../helpers/test-context';
import { createTestBill } from '../fixtures';
import { bills, sponsors } from '../../../server/infrastructure/schema/foundation';
import { eq } from 'drizzle-orm';

describe('Feature: full-stack-integration - Bill Flow Integration Tests', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanIntegrationTest();
  });

  describe('Bill Creation Flow (client→server→database)', () => {
    it('should create a bill through the full stack', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor first
      const [sponsor] = await db.insert(sponsors).values({
        name: 'Senator Smith',
        chamber: 'senate',
        party: 'jubilee',
        is_active: true,
      }).returning();

      // Create bill via API
      const billData = {
        bill_number: 'Bill No. 1 of 2024',
        title: 'Healthcare Reform Bill',
        summary: 'A comprehensive healthcare reform proposal',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'senate',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-01-15'),
      };

      const response = await apiClient.createBill(billData);

      // Verify API response
      expect(response.bill).toBeDefined();
      expect(response.bill.title).toBe(billData.title);
      expect(response.bill.sponsor_id).toBe(sponsor.id);

      // Verify data in database
      const dbBills = await db.select().from(bills).where(eq(bills.id, response.bill.id));
      expect(dbBills).toHaveLength(1);
      expect(dbBills[0].title).toBe(billData.title);
      expect(dbBills[0].status).toBe('first_reading');
    });

    it('should validate required fields', async () => {
      const { apiClient } = getTestContext();

      // Try to create bill without required fields
      const invalidBillData = {
        title: 'Incomplete Bill',
        // Missing bill_number, chamber, etc.
      };

      const response = await apiClient.post('/api/bills', invalidBillData);

      expect(response.status).toBe(400); // Bad Request
      expect(response.data.error).toBeDefined();
    });
  });

  describe('Bill Retrieval Flow', () => {
    it('should retrieve bill by ID', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor and bill in database
      const [sponsor] = await db.insert(sponsors).values({
        name: 'MP Johnson',
        chamber: 'national_assembly',
        party: 'odm',
        is_active: true,
      }).returning();

      const [bill] = await db.insert(bills).values({
        bill_number: 'Bill No. 2 of 2024',
        title: 'Education Bill',
        summary: 'Education reform',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'national_assembly',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-01-20'),
      }).returning();

      // Retrieve via API
      const response = await apiClient.getBill(bill.id);

      expect(response.bill).toBeDefined();
      expect(response.bill.id).toBe(bill.id);
      expect(response.bill.title).toBe(bill.title);
    });

    it('should retrieve all bills with pagination', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor
      const [sponsor] = await db.insert(sponsors).values({
        name: 'Senator Williams',
        chamber: 'senate',
        party: 'jubilee',
        is_active: true,
      }).returning();

      // Create multiple bills
      const billsData = Array.from({ length: 5 }, (_, i) => ({
        bill_number: `Bill No. ${i + 1} of 2024`,
        title: `Test Bill ${i + 1}`,
        summary: `Summary ${i + 1}`,
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'senate',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-01-15'),
      }));

      await db.insert(bills).values(billsData);

      // Retrieve via API
      const response = await apiClient.getBills({ limit: 10, offset: 0 });

      expect(response.bills).toBeDefined();
      expect(response.bills.length).toBe(5);
      expect(response.total).toBe(5);
    });
  });

  describe('Bill Update Flow', () => {
    it('should update bill status', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor and bill
      const [sponsor] = await db.insert(sponsors).values({
        name: 'MP Davis',
        chamber: 'national_assembly',
        party: 'wiper',
        is_active: true,
      }).returning();

      const [bill] = await db.insert(bills).values({
        bill_number: 'Bill No. 3 of 2024',
        title: 'Infrastructure Bill',
        summary: 'Infrastructure development',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'national_assembly',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-01-25'),
      }).returning();

      // Update via API
      const updateData = {
        status: 'second_reading',
        reading_stage: 'second',
      };

      const response = await apiClient.updateBill(bill.id, updateData);

      expect(response.bill.status).toBe('second_reading');

      // Verify in database
      const dbBills = await db.select().from(bills).where(eq(bills.id, bill.id));
      expect(dbBills[0].status).toBe('second_reading');
      expect(dbBills[0].previous_status).toBe('first_reading');
    });

    it('should update bill content', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor and bill
      const [sponsor] = await db.insert(sponsors).values({
        name: 'Senator Brown',
        chamber: 'senate',
        party: 'ford_kenya',
        is_active: true,
      }).returning();

      const [bill] = await db.insert(bills).values({
        bill_number: 'Bill No. 4 of 2024',
        title: 'Original Title',
        summary: 'Original summary',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'senate',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-01-30'),
      }).returning();

      // Update content
      const updateData = {
        title: 'Updated Title',
        summary: 'Updated summary with more details',
      };

      const response = await apiClient.updateBill(bill.id, updateData);

      expect(response.bill.title).toBe(updateData.title);
      expect(response.bill.summary).toBe(updateData.summary);

      // Verify in database
      const dbBills = await db.select().from(bills).where(eq(bills.id, bill.id));
      expect(dbBills[0].title).toBe(updateData.title);
    });
  });

  describe('Data Transformation Verification', () => {
    it('should maintain data integrity through transformation pipeline', async () => {
      const { db, apiClient } = getTestContext();

      // Create sponsor
      const [sponsor] = await db.insert(sponsors).values({
        name: 'MP Transform',
        chamber: 'national_assembly',
        party: 'jubilee',
        is_active: true,
      }).returning();

      // Create bill via API
      const billData = {
        bill_number: 'Bill No. 5 of 2024',
        title: 'Transform Test Bill',
        summary: 'Testing transformation',
        bill_type: 'public',
        status: 'first_reading',
        chamber: 'national_assembly',
        sponsor_id: sponsor.id,
        introduced_date: new Date('2024-02-01'),
      };

      const apiResponse = await apiClient.createBill(billData);

      // Get from database
      const dbBills = await db.select().from(bills).where(eq(bills.id, apiResponse.bill.id));

      // Verify transformations
      expect(apiResponse.bill.id).toBe(dbBills[0].id);
      expect(apiResponse.bill.title).toBe(dbBills[0].title);
      expect(apiResponse.bill.status).toBe(dbBills[0].status);
      expect(apiResponse.bill.chamber).toBe(dbBills[0].chamber);
      
      // Verify date transformation
      expect(new Date(apiResponse.bill.introduced_date).toISOString()).toBe(
        dbBills[0].introduced_date.toISOString()
      );
    });
  });
});
