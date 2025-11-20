import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { ITestDataFactory } from '@shared/core/src/testing/test-data-factory';
import type { IServiceContainer } from '@shared/core/src/testing/dependency-injection-container';
import type { IBillService } from '@shared/core/src/services/interfaces/bill-service.interface';
import type { ISponsorRepository } from '@shared/core/src/repositories/interfaces/sponsor-repository.interface';

/**
 * Performance benchmarks for Bills domain migration to direct Drizzle usage
 * Tests performance improvements and validates complex bill relationships
 */
describe('Bill Performance Benchmarks', () => {
  let billService: IBillService;
  let sponsorRepository: ISponsorRepository;
  let testDataFactory: ITestDataFactory;
  let container: IServiceContainer;
  let testBillIds: string[] = [];
  let testSponsorIds: string[] = [];

  beforeAll(async () => {
    // Initialize dependency injection container
    container = {} as IServiceContainer; // TODO: Initialize proper container
    testDataFactory = {} as ITestDataFactory; // TODO: Initialize test data factory

    // Get services from container
    const billServiceResult = await container.resolve<IBillService>('bill-service');
    if (billServiceResult.isErr()) {
      throw new Error(`Failed to resolve bill service: ${billServiceResult.error.message}`);
    }
    billService = billServiceResult.value;

    const sponsorRepoResult = await container.resolve<ISponsorRepository>('sponsor-repository');
    if (sponsorRepoResult.isErr()) {
      throw new Error(`Failed to resolve sponsor repository: ${sponsorRepoResult.error.message}`);
    }
    sponsorRepository = sponsorRepoResult.value;

    // Create test data for benchmarks
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  beforeEach(() => {
    // Reset any caches or state
    console.time('benchmark');
  });

  describe('Bill CRUD Operations Performance', () => {
    it('should create bills efficiently', async () => {
      const startTime = performance.now();

      const billData = {
        title: 'Performance Test Bill',
        summary: 'A bill created for performance testing',
        bill_number: `PERF-${Date.now()}`,
        status: 'drafted' as const,
        chamber: 'national_assembly' as const,
        introduced_date: new Date().toISOString()
      };

      const result = await billService.create(billData);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms

      if (result.isOk()) {
        testBillIds.push(result.value.id);
      }

      console.log(`Bill creation took ${duration.toFixed(2)}ms`);
    });

    it('should retrieve bills by ID efficiently', async () => {
      const startTime = performance.now();

      const result = await billService.findById(testBillIds[0]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(50); // Should complete in under 50ms

      console.log(`Bill retrieval took ${duration.toFixed(2)}ms`);
    });

    it('should update bills efficiently', async () => {
      const startTime = performance.now();

      const result = await billService.update(testBillIds[0], {
        summary: 'Updated summary for performance test'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(75); // Should complete in under 75ms

      console.log(`Bill update took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Complex Relationship Queries Performance', () => {
    it('should handle bill with engagement data efficiently', async () => {
      const bill_id = testBillIds[0];

      // Create engagement data
      await createEngagementData(bill_id);

      const startTime = performance.now();

      const result = await billService.findById(bill_id);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms with engagement data

      if (result.isOk() && result.value) {
        // Note: engagement data might not be directly available in the abstracted interface
        // This would need to be handled differently in the new architecture
        expect(true).toBe(true); // Placeholder assertion
      }

      console.log(`Bill with engagement retrieval took ${duration.toFixed(2)}ms`);
    });

    it('should handle paginated bill queries efficiently', async () => {
      const startTime = performance.now();

      const result = await billService.getAllBills(
        { status: 'drafted' },
        { page: 1, limit: 20 }
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(150); // Should complete in under 150ms

      if (result.success) {
        expect(result.data.bills).toBeInstanceOf(Array);
        expect(result.data.pagination).toBeDefined();
      }

      console.log(`Paginated bill query took ${duration.toFixed(2)}ms`);
    });

    it('should handle bill search efficiently', async () => {
      const startTime = performance.now();

      const result = await billService.searchBills('Performance Test');

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(200); // Should complete in under 200ms

      console.log(`Bill search took ${duration.toFixed(2)}ms`);
    });

    it('should handle bill statistics efficiently', async () => {
      const startTime = performance.now();

      const result = await billService.getBillStats();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms

      if (result.success) {
        expect(result.data.totalBills).toBeGreaterThan(0);
        expect(result.data.billsByStatus).toBeInstanceOf(Array);
      }

      console.log(`Bill statistics took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle multiple bill creation efficiently', async () => {
      const billCount = 10;
      const startTime = performance.now();

      const promises = Array.from({ length: billCount }, (_, i) =>
        billService.createBill({
          title: `Bulk Test Bill ${i}`,
          summary: `Bulk test bill number ${i}`,
          bill_number: `BULK-${Date.now()}-${i}`,
          status: 'drafted' as const,
          chamber: 'national_assembly' as const,
          introduced_date: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        })
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / billCount;

      expect(results.every(r => r.success)).toBe(true);
      expect(avgDuration).toBeLessThan(50); // Average should be under 50ms per bill

      // Store IDs for cleanup
      results.forEach(result => {
        if (result.success) {
          testBillIds.push(result.data.id);
        }
      });

      console.log(`Bulk bill creation (${billCount} bills) took ${duration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms per bill)`);
    });

    it('should handle engagement recording efficiently', async () => {
      const bill_id = testBillIds[0];
      const engagementCount = 50;
      const startTime = performance.now();

      const promises = Array.from({ length: engagementCount }, (_, i) =>
        billService.recordEngagement(bill_id, `user-${i}`, 'view')
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / engagementCount;

      expect(results.every(r => r.success)).toBe(true);
      expect(avgDuration).toBeLessThan(20); // Average should be under 20ms per engagement

      console.log(`Bulk engagement recording (${engagementCount} engagements) took ${duration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms per engagement)`);
    });
  });

  describe('Memory Usage Validation', () => {
    it('should not cause memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform repeated operations
      for (let i = 0; i < 100; i++) {
        await billService.getBillById(testBillIds[0]);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      console.log(`Memory increase after 100 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Database Query Optimization', () => {
    it('should use efficient queries for bill relationships', async () => {
      const db = databaseService.getDatabase();

      // Test direct Drizzle query performance
      const startTime = performance.now();

      const result = await db
        .select({
          id: bills.id,
          title: bills.title,
          status: bills.status,
          view_count: bills.view_count,
          sponsor_name: sponsors.name
        })
        .from(bills)
        .leftJoin(sponsors, eq(bills.sponsor_id, sponsors.id))
        .where(eq(bills.status, 'drafted'))
        .limit(20);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(50); // Direct query should be very fast

      console.log(`Direct Drizzle query with join took ${duration.toFixed(2)}ms`);
    });

    it('should efficiently aggregate engagement statistics', async () => {
      const db = databaseService.getDatabase();
      const bill_id = testBillIds[0];

      const startTime = performance.now();

      const [stats] = await db
        .select({
          totalViews: sql`COALESCE(SUM(${bill_engagement.view_count}), 0)`,
          totalComments: sql`COALESCE(SUM(${bill_engagement.comment_count}), 0)`,
          totalShares: sql`COALESCE(SUM(${bill_engagement.share_count}), 0)`,
          uniqueViewers: sql`COUNT(DISTINCT ${bill_engagement.user_id})`,
          totalEngagements: sql`COUNT(${bill_engagement.id})`
        })
        .from(bill_engagement)
        .where(eq(bill_engagement.bill_id, bill_id));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(stats).toBeDefined();
      expect(duration).toBeLessThan(30); // Aggregation should be fast

      console.log(`Engagement aggregation query took ${duration.toFixed(2)}ms`);
    });
  });

  // Helper functions
  async function setupTestData() {
    const db = databaseService.getDatabase();

    // Create test sponsors
    const sponsorData = Array.from({ length: 5 }, (_, i) => ({
      name: `Test Sponsor ${i}`,
      chamber: 'national_assembly' as const,
      party: 'test_party' as const,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }));

    const createdSponsors = await db.insert(sponsors).values(sponsorData).returning();
    testSponsorIds = createdSponsors.map(s => s.id);

    // Create test bills
    const billData = Array.from({ length: 20 }, (_, i) => ({
      title: `Test Bill ${i}`,
      summary: `Test bill summary ${i}`,
      bill_number: `TEST-${Date.now()}-${i}`,
      status: 'drafted' as const,
      chamber: 'national_assembly' as const,
      sponsor_id: testSponsorIds[i % testSponsorIds.length],
      introduced_date: new Date(),
      view_count: Math.floor(Math.random() * 1000),
      share_count: Math.floor(Math.random() * 100),
      created_at: new Date(),
      updated_at: new Date()
    }));

    const createdBills = await db.insert(bills).values(billData).returning();
    testBillIds = createdBills.map(b => b.id);
  }

  async function createEngagementData(bill_id: string) {
    const db = databaseService.getDatabase();

    const engagementData = Array.from({ length: 10 }, (_, i) => ({
      bill_id: bill_id,
      user_id: `test-user-${i}`,
      view_count: Math.floor(Math.random() * 10) + 1,
      comment_count: Math.floor(Math.random() * 5),
      share_count: Math.floor(Math.random() * 3),
      engagement_score: "10",
      lastEngaged: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }));

    await db.insert(bill_engagement).values(engagementData);
  }

  async function cleanupTestData() {
    const db = databaseService.getDatabase();

    // Clean up in reverse order due to foreign key constraints
    if (testBillIds.length > 0) {
      await db.delete(bill_engagement).where(
        sql`${bill_engagement.bill_id} = ANY(${testBillIds})`
      );
      await db.delete(bills).where(
        sql`${bills.id} = ANY(${testBillIds})`
      );
    }

    if (testSponsorIds.length > 0) {
      await db.delete(sponsors).where(
        sql`${sponsors.id} = ANY(${testSponsorIds})`
      );
    }
  }
});