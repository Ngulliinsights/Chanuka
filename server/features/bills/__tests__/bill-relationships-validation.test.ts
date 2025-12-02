/**
 * Bill Relationships Validation Tests
 * 
 * This test suite validates that complex bill relationships are handled correctly
 * after migrating from repository pattern to direct Drizzle ORM usage.
 * 
 * Covers:
 * - Bill-Sponsor relationships
 * - Bill-Engagement relationships  
 * - Bill-Comment relationships
 * - Data integrity across related entities
 * - Cascade operations and referential integrity
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { billService } from '../application/bill-service';
import { databaseService } from '../../../infrastructure/database/database-service';
import { bills, sponsors } from '@shared/schema';
import { bill_engagement, comments } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';

describe('Bill Relationships Validation', () => {
  let testSponsor: any;
  let testBill: any;
  let db: any;

  beforeAll(async () => {
    db = databaseService.getDatabase();
  });

  beforeEach(async () => {
    // Create test sponsor
    const sponsorData = {
      id: `test_sponsor_${Date.now()}`,
      name: 'Test Sponsor for Relationships',
      chamber: 'national_assembly' as const,
      party: 'test_party' as const,
      county: 'nairobi' as const,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    [testSponsor] = await db.insert(sponsors).values(sponsorData).returning();

    // Create test bill
    const billData = {
      bill_number: `REL-TEST-${Date.now()}/2024`,
      title: 'Relationship Validation Test Bill',
      summary: 'This bill is used for testing relationships',
      full_text: 'Full text of the relationship test bill',
      status: 'introduced' as const,
      category: 'test',
      chamber: 'national_assembly' as const,
      sponsor_id: testSponsor.id,
      introduced_date: new Date(),
      tags: ['test', 'relationships']
    };

    const createResult = await billService.createBill(billData);
    expect(createResult.success).toBe(true);
    testBill = createResult.data;
  });

  afterEach(async () => {
    // Cleanup test data
    if (testBill) {
      // Clean up engagements first (foreign key dependency)
      await db.delete(bill_engagement).where(eq(bill_engagement.bill_id, testBill.id));
      
      // Clean up comments
      await db.delete(comments).where(eq(comments.bill_id, testBill.id));
      
      // Clean up bill
      await db.delete(bills).where(eq(bills.id, testBill.id));
    }

    if (testSponsor) {
      await db.delete(sponsors).where(eq(sponsors.id, testSponsor.id));
    }
  });

  describe('Bill-Sponsor
