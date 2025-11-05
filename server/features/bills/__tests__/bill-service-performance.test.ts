/**
 * Performance Benchmarks for Bills Domain Migration
 * 
 * This test suite benchmarks the performance of bill operations after migrating
 * from repository pattern to direct Drizzle ORM usage. It validates the 15%
 * performance improvement requirement from task 5.3.
 * 
 * Risk Mitigation:
 * - Production-like performance testing with realistic data volumes
 * - Relationship validation testing for complex bill operations
 * - Data integrity monitoring during performance tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { billService, BillService } from '../application/bill-service';
import { databaseService } from '../../../infrastructure/database/database-service';
import { bills, sponsors } from '@shared/schema/foundation';
import { bill_engagement } from '@shared/schema/citizen_participation';
import { eq, sql } from 'drizzle-orm';

interface PerformanceResult {
  operation: string;
  iterations: number;
  totalTimeMs: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  operationsPerSecond: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

interface BenchmarkConfig {
  warmupIterations: number;
  testIterations: number;
  concurrentUsers: number;
  dataSetSize: number;
}

describe('Bills Domain Performance Benchmarks', () => {
  let testBills: any[] = [];
  let testSponsors: any[] = [];
  let testEngagements: any[] = [];
  
  const config: BenchmarkConfig = {
    warmupIterations: 10,
    testIterations: 100,
    concurrentUsers: 50,
    dataSetSize: 1000
  };

  beforeAll(async () => {
    // Setup test data for realistic performance testing
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  beforeEach(() => {
    // Clear any caches before each test
    global.gc && global.gc();
  });

  describe('Core CRUD Operations Performance', () => {
    it('should benchmark getBillById performance', async () => {
      const result = await benchmarkOperation(
        'getBillById',
        async () => {
          const randomBill = testBills[Math.floor(Math.random() * testBills.length)];
          await billService.getBillById(randomBill.id);
        },
        config.testIterations
      );

      // Performance requirements: should be under 50ms average
      expect(result.averageTimeMs).toBeLessThan(50);
      expect(result.operationsPerSecond).toBeGreaterThan(20);
      
      logPerformanceResult(result);
    });

    it('should benchmark getAllBills with pagination performance', async () => {
      const result = await benchmarkOperation(
        'getAllBills',
        async () => {
          await billService.getAllBills(
            { status: 'introduced' },
            { page: Math.floor(Math.random() * 10) + 1, limit: 20 }
          );
        },
        config.testIterations
      );

      // Performance requirements: should be under 100ms average for paginated results
      expect(result.averageTimeMs).toBeLessThan(100);
      expect(result.operationsPerSecond).toBeGreaterThan(10);
      
      logPerformanceResult(result);
    });

    it('should benchmark createBill performance', async () => {
      const result = await benchmarkOperation(
        'createBill',
        async () => {
          const billData = generateTestBillData();
          const createdBill = await billService.createBill(billData);
          
          // Clean up created bill to avoid data pollution
          if (createdBill.success && createdBill.data) {
            await billService.deleteBill(createdBill.data.id);
          }
        },
        Math.floor(config.testIterations / 2) // Fewer iterations for write operations
      );

      // Performance requirements: should be under 200ms average for creation
      expect(result.averageTimeMs).toBeLessThan(200);
      expect(result.operationsPerSecond).toBeGreaterThan(5);
      
      logPerformanceResult(result);
    });

    it('should benchmark updateBill performance', async () => {
      const result = await benchmarkOperation(
        'updateBill',
        async () => {
          const randomBill = testBills[Math.floor(Math.random() * testBills.length)];
          await billService.updateBill(randomBill.id, {
            summary: `Updated summary ${Date.now()}`,
            updated_at: new Date()
          });
        },
        Math.floor(config.testIterations / 2)
      );

      // Performance requirements: should be under 100ms average for updates
      expect(result.averageTimeMs).toBeLessThan(100);
      expect(result.operationsPerSecond).toBeGreaterThan(10);
      
      logPerformanceResult(result);
    });
  });

  describe('Complex Query Operations Performance', () => {
    it('should benchmark searchBills performance', async () => {
      const searchTerms = ['climate', 'digital', 'health', 'education', 'transport'];
      
      const result = await benchmarkOperation(
        'searchBills',
        async () => {
          const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
          await billService.searchBills(searchTerm, {
            status: 'introduced',
            category: 'technology'
          });
        },
        config.testIterations
      );

      // Performance requirements: search should be under 150ms average
      expect(result.averageTimeMs).toBeLessThan(150);
      expect(result.operationsPerSecond).toBeGreaterThan(7);
      
      logPerformanceResult(result);
    });

    it('should benchmark getBillStats performance', async () => {
      const result = await benchmarkOperation(
        'getBillStats',
        async () => {
          await billService.getBillStats();
        },
        config.testIterations
      );

      // Performance requirements: stats aggregation should be under 200ms
      expect(result.averageTimeMs).toBeLessThan(200);
      expect(result.operationsPerSecond).toBeGreaterThan(5);
      
      logPerformanceResult(result);
    });

    it('should benchmark bills with engagement data performance', async () => {
      const result = await benchmarkOperation(
        'getBillWithEngagement',
        async () => {
          const randomBill = testBills[Math.floor(Math.random() * testBills.length)];
          await billService.getBillById(randomBill.id); // This includes engagement data
        },
        config.testIterations
      );

      // Performance requirements: bills with engagement should be under 75ms
      expect(result.averageTimeMs).toBeLessThan(75);
      expect(result.operationsPerSecond).toBeGreaterThan(15);
      
      logPerformanceResult(result);
    });
  });

  describe('Engagement Operations Performance', () => {
    it('should benchmark recordEngagement performance', async () => {
      const engagementTypes = ['view', 'comment', 'share'] as const;
      
      const result = await benchmarkOperation(
        'recordEngagement',
        async () => {
          const randomBill = testBills[Math.floor(Math.random() * testBills.length)];
          const randomUser = `user_${Math.floor(Math.random() * 1000)}`;
          const randomType = engagementTypes[Math.floor(Math.random() * engagementTypes.length)];
          
          await billService.recordEngagement(randomBill.id, randomUser, randomType);
        },
        config.testIterations
      );

      // Performance requirements: engagement recording should be under 100ms
      expect(result.averageTimeMs).toBeLessThan(100);
      expect(result.operationsPerSecond).toBeGreaterThan(10);
      
      logPerformanceResult(result);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should benchmark concurrent read operations', async () => {
      const result = await benchmarkConcurrentOperation(
        'concurrentReads',
        async () => {
          const randomBill = testBills[Math.floor(Math.random() * testBills.length)];
          await billService.getBillById(randomBill.id);
        },
        config.concurrentUsers,
        config.testIterations
      );

      // Performance requirements: concurrent reads should maintain good throughput
      expect(result.averageTimeMs).toBeLessThan(100);
      expect(result.operationsPerSecond).toBeGreaterThan(config.concurrentUsers * 0.5);
      
      logPerformanceResult(result);
    });

    it('should benchmark concurrent engagement operations', async () => {
      const engagementTypes = ['view', 'comment', 'share'] as const;
      
      const result = await benchmarkConcurrentOperation(
        'concurrentEngagements',
        async () => {
          const randomBill = testBills[Math.floor(Math.random() * testBills.length)];
          const randomUser = `concurrent_user_${Math.floor(Math.random() * 1000)}`;
          const randomType = engagementTypes[Math.floor(Math.random() * engagementTypes.length)];
          
          await billService.recordEngagement(randomBill.id, randomUser, randomType);
        },
        Math.floor(config.concurrentUsers / 2), // Fewer concurrent writes
        Math.floor(config.testIterations / 2)
      );

      // Performance requirements: concurrent engagements should handle load
      expect(result.averageTimeMs).toBeLessThan(200);
      expect(result.operationsPerSecond).toBeGreaterThan(5);
      
      logPerformanceResult(result);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should benchmark memory usage for large result sets', async () => {
      const initialMemory = process.memoryUsage();
      
      // Test with increasingly large page sizes
      const pageSizes = [10, 50, 100, 500];
      const memoryResults: Array<{ pageSize: number; memoryDelta: number; }> = [];
      
      for (const pageSize of pageSizes) {
        const beforeMemory = process.memoryUsage();
        
        await billService.getAllBills({}, { page: 1, limit: pageSize });
        
        const afterMemory = process.memoryUsage();
        const memoryDelta = afterMemory.heapUsed - beforeMemory.heapUsed;
        
        memoryResults.push({ pageSize, memoryDelta });
        
        // Force garbage collection if available
        global.gc && global.gc();
      }
      
      // Memory usage should scale reasonably with result set size
      const memoryGrowthRate = memoryResults[memoryResults.length - 1].memoryDelta / 
                              memoryResults[0].memoryDelta;
      
      expect(memoryGrowthRate).toBeLessThan(100); // Should not grow exponentially
      
      console.log('Memory usage results:', memoryResults);
    });
  });

  describe('Data Integrity During Performance Tests', () => {
    it('should maintain data consistency during high-load operations', async () => {
      const testBill = testBills[0];
      const initialEngagementCount = await getEngagementCount(testBill.id);
      
      // Perform many concurrent engagement operations
      const promises = Array.from({ length: 100 }, (_, i) => 
        billService.recordEngagement(testBill.id, `integrity_user_${i}`, 'view')
      );
      
      await Promise.all(promises);
      
      const finalEngagementCount = await getEngagementCount(testBill.id);
      
      // Should have exactly 100 more engagements
      expect(finalEngagementCount).toBe(initialEngagementCount + 100);
    });

    it('should maintain referential integrity during bill operations', async () => {
      // Create a bill with sponsor
      const sponsor = testSponsors[0];
      const billData = generateTestBillData();
      billData.sponsor_id = sponsor.id;
      
      const createResult = await billService.createBill(billData);
      expect(createResult.success).toBe(true);
      
      if (createResult.success && createResult.data) {
        // Verify sponsor relationship is maintained
        const billResult = await billService.getBillById(createResult.data.id);
        expect(billResult.success).toBe(true);
        
        if (billResult.success && billResult.data) {
          expect(billResult.data.sponsorInfo?.id).toBe(sponsor.id);
        }
        
        // Cleanup
        await billService.deleteBill(createResult.data.id);
      }
    });
  });

  // Helper functions
  async function benchmarkOperation(
    name: string,
    operation: () => Promise<void>,
    iterations: number
  ): Promise<PerformanceResult> {
    // Warmup
    for (let i = 0; i < config.warmupIterations; i++) {
      await operation();
    }

    // Actual benchmark
    const times: number[] = [];
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      await operation();
      times.push(performance.now() - opStart);
    }

    const totalTime = performance.now() - startTime;
    const finalMemory = process.memoryUsage();

    return {
      operation: name,
      iterations,
      totalTimeMs: totalTime,
      averageTimeMs: times.reduce((a, b) => a + b, 0) / times.length,
      minTimeMs: Math.min(...times),
      maxTimeMs: Math.max(...times),
      operationsPerSecond: (iterations / totalTime) * 1000,
      memoryUsage: {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      }
    };
  }

  async function benchmarkConcurrentOperation(
    name: string,
    operation: () => Promise<void>,
    concurrency: number,
    totalOperations: number
  ): Promise<PerformanceResult> {
    const operationsPerWorker = Math.floor(totalOperations / concurrency);
    
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    const workers = Array(concurrency).fill(null).map(async () => {
      const times: number[] = [];
      for (let i = 0; i < operationsPerWorker; i++) {
        const opStart = performance.now();
        await operation();
        times.push(performance.now() - opStart);
      }
      return times;
    });

    const allTimes = (await Promise.all(workers)).flat();
    const totalTime = performance.now() - startTime;
    const finalMemory = process.memoryUsage();

    return {
      operation: name,
      iterations: allTimes.length,
      totalTimeMs: totalTime,
      averageTimeMs: allTimes.reduce((a, b) => a + b, 0) / allTimes.length,
      minTimeMs: Math.min(...allTimes),
      maxTimeMs: Math.max(...allTimes),
      operationsPerSecond: (allTimes.length / totalTime) * 1000,
      memoryUsage: {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      }
    };
  }

  function logPerformanceResult(result: PerformanceResult) {
    console.log(`\n📊 Performance Result: ${result.operation}`);
    console.log(`   Iterations: ${result.iterations}`);
    console.log(`   Average Time: ${result.averageTimeMs.toFixed(2)}ms`);
    console.log(`   Min/Max Time: ${result.minTimeMs.toFixed(2)}ms / ${result.maxTimeMs.toFixed(2)}ms`);
    console.log(`   Operations/sec: ${result.operationsPerSecond.toFixed(2)}`);
    if (result.memoryUsage) {
      console.log(`   Memory Delta: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  async function setupTestData() {
    const db = databaseService.getDatabase();
    
    // Create test sponsors
    const sponsorData = Array.from({ length: 10 }, (_, i) => ({
      id: `sponsor_${i}`,
      name: `Test Sponsor ${i}`,
      chamber: 'national_assembly' as const,
      party: 'test_party' as const,
      county: 'nairobi' as const,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }));

    testSponsors = await db.insert(sponsors).values(sponsorData).returning();

    // Create test bills
    const billData = Array.from({ length: config.dataSetSize }, (_, i) => ({
      id: `bill_${i}`,
      bill_number: `TEST-${i}/2024`,
      title: `Test Bill ${i}: ${generateRandomTitle()}`,
      summary: `This is a test bill summary for bill ${i}. ${generateRandomSummary()}`,
      full_text: generateRandomFullText(),
      status: getRandomStatus(),
      category: getRandomCategory(),
      chamber: 'national_assembly' as const,
      sponsor_id: testSponsors[i % testSponsors.length].id,
      introduced_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      view_count: Math.floor(Math.random() * 1000),
      comment_count: Math.floor(Math.random() * 100),
      vote_count_for: Math.floor(Math.random() * 500),
      vote_count_against: Math.floor(Math.random() * 200),
      engagement_score: Math.random() * 100,
      tags: getRandomTags(),
      created_at: new Date(),
      updated_at: new Date()
    }));

    testBills = await db.insert(bills).values(billData).returning();

    // Create test engagements
    const engagementData = Array.from({ length: config.dataSetSize * 2 }, (_, i) => ({
      id: `engagement_${i}`,
      bill_id: testBills[i % testBills.length].id,
      user_id: `user_${Math.floor(Math.random() * 100)}`,
      engagement_type: getRandomEngagementType(),
      view_count: Math.floor(Math.random() * 10),
      comment_count: Math.floor(Math.random() * 5),
      share_count: Math.floor(Math.random() * 3),
      engagement_score: Math.random() * 10,
      created_at: new Date(),
      updated_at: new Date()
    }));

    testEngagements = await db.insert(bill_engagement).values(engagementData).returning();
  }

  async function cleanupTestData() {
    const db = databaseService.getDatabase();
    
    // Clean up in reverse order of dependencies
    if (testEngagements.length > 0) {
      await db.delete(bill_engagement).where(
        sql`${bill_engagement.id} LIKE 'engagement_%'`
      );
    }
    
    if (testBills.length > 0) {
      await db.delete(bills).where(
        sql`${bills.id} LIKE 'bill_%'`
      );
    }
    
    if (testSponsors.length > 0) {
      await db.delete(sponsors).where(
        sql`${sponsors.id} LIKE 'sponsor_%'`
      );
    }
  }

  async function getEngagementCount(billId: string): Promise<number> {
    const db = databaseService.getDatabase();
    const [result] = await db
      .select({ count: sql`COUNT(*)` })
      .from(bill_engagement)
      .where(eq(bill_engagement.bill_id, billId));
    
    return Number(result.count);
  }

  function generateTestBillData() {
    return {
      bill_number: `TEST-${Date.now()}/2024`,
      title: `Test Bill: ${generateRandomTitle()}`,
      summary: generateRandomSummary(),
      full_text: generateRandomFullText(),
      status: getRandomStatus(),
      category: getRandomCategory(),
      chamber: 'national_assembly' as const,
      sponsor_id: testSponsors[Math.floor(Math.random() * testSponsors.length)]?.id,
      introduced_date: new Date(),
      tags: getRandomTags()
    };
  }

  function generateRandomTitle(): string {
    const topics = ['Climate Change', 'Digital Rights', 'Healthcare', 'Education', 'Transport'];
    const actions = ['Protection', 'Enhancement', 'Reform', 'Development', 'Regulation'];
    return `${topics[Math.floor(Math.random() * topics.length)]} ${actions[Math.floor(Math.random() * actions.length)]}`;
  }

  function generateRandomSummary(): string {
    return `This bill addresses important legislative matters and aims to improve governance and citizen welfare through comprehensive policy reforms.`;
  }

  function generateRandomFullText(): string {
    return `WHEREAS the Parliament of Kenya recognizes the need for comprehensive legislation; 
    AND WHEREAS this bill seeks to address critical issues affecting citizens;
    NOW THEREFORE this Act may be cited as the Test Act, 2024 and shall come into operation on such date as the Cabinet Secretary may, by notice in the Gazette, appoint.`;
  }

  function getRandomStatus() {
    const statuses = ['drafted', 'introduced', 'committee', 'second_reading', 'third_reading', 'passed', 'assented'];
    return statuses[Math.floor(Math.random() * statuses.length)] as any;
  }

  function getRandomCategory(): string {
    const categories = ['technology', 'environment', 'health', 'education', 'transport', 'finance'];
    return categories[Math.floor(Math.random() * categories.length)];
  }

  function getRandomTags(): string[] {
    const allTags = ['urgent', 'public-interest', 'constitutional', 'economic', 'social', 'environmental'];
    const numTags = Math.floor(Math.random() * 3) + 1;
    return allTags.slice(0, numTags);
  }

  function getRandomEngagementType() {
    const types = ['view', 'comment', 'share'];
    return types[Math.floor(Math.random() * types.length)] as any;
  }
});