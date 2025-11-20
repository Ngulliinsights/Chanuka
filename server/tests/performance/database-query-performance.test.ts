import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../../../shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { database as db, bill as bills, bill_engagement, comments as comments, sponsor as sponsors } from '@shared/database/connection.js';
import { eq, sql, desc } from 'drizzle-orm';
import { logger  } from '@shared/core/src/index.js';

describe('Database Query Performance Tests', () => {
  // Performance thresholds remain conservative but realistic
  const PERFORMANCE_THRESHOLD_MS = 200;
  const SLOW_QUERY_THRESHOLD_MS = 500;
  
  // Helper function to measure query execution time consistently
  const measureQueryTime = async (queryFn: () => Promise<any>): Promise<{ result: any; queryTime: number }> => {
    const startTime = performance.now(); // More precise than Date.now()
    const result = await queryFn();
    const endTime = performance.now();
    const queryTime = Math.round(endTime - startTime);
    return { result, queryTime };
  };

  // Helper to log performance results consistently
  const logPerformance = (testName: string, queryTime: number, threshold: number) => {
    const status = queryTime < threshold ? '✓' : '✗';
    logger.info(`${status} ${testName}: ${queryTime}ms (threshold: ${threshold}ms)`, {
      component: 'PerformanceTest',
      queryTime,
      threshold
    });
  };
  
  beforeAll(async () => {
    logger.info('Initializing performance test suite...', { component: 'PerformanceTest' });
    
    // Optionally verify database connection and warm up connection pool
    try {
      await db.select({ count: sql<number>`1` }).from(bills).limit(1);
      logger.info('Database connection verified', { component: 'PerformanceTest' });
    } catch (error) {
      logger.error('Database connection failed', { 
        component: 'PerformanceTest', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  });

  afterAll(async () => {
    logger.info('Performance test suite completed', { component: 'PerformanceTest' });
  });

  describe('Bill Engagement Statistics Queries', () => {
    it('should retrieve engagement stats within performance threshold', async () => {
      const { result, queryTime } = await measureQueryTime(async () => { // Optimized engagement query using proper aggregations
        return db
          .select({
            bill_id: bill_engagement.bill_id,
            totalViews: sql<number>`COALESCE(SUM(${bill_engagement.view_count }), 0)::int`,
            totalComments: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
            totalShares: sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
            uniqueViewers: sql<number>`COUNT(DISTINCT ${bill_engagement.user_id})::int`
          })
          .from(bill_engagement)
          .leftJoin(comments, eq(bill_engagement.bill_id, comments.bill_id))
          .groupBy(bill_engagement.bill_id)
          .orderBy(desc(sql`SUM(${bill_engagement.view_count})`)) // Added ordering for deterministic results
          .limit(10);
      });
      
      logPerformance('Engagement stats query', queryTime, PERFORMANCE_THRESHOLD_MS);
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle large dataset queries efficiently', async () => {
      const { result, queryTime } = await measureQueryTime(async () => { // Optimized to reduce data transfer and computation
        return db
          .select({
            bill_id: bills.id,
            title: bills.title,
            engagementCount: sql<number>`COUNT(${bill_engagement.id })::int`
          })
          .from(bills)
          .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
          .groupBy(bills.id, bills.title)
          .orderBy(desc(sql`COUNT(${bill_engagement.id})`)) // Most engaged bills first
          .limit(100);
      });
      
      logPerformance('Large dataset query', queryTime, SLOW_QUERY_THRESHOLD_MS);
      
      expect(queryTime).toBeLessThan(SLOW_QUERY_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Bill Search Performance', () => {
    it('should perform full-text search within threshold', async () => {
      const searchTerm = 'healthcare';
      
      const { result, queryTime } = await measureQueryTime(async () => {
        // Use parameterized queries for better query plan caching
        const pattern = `%${searchTerm}%`;
        return db
          .select({
            id: bills.id,
            title: bills.title,
            description: bills.description
          })
          .from(bills)
          .where(sql`
            ${bills.title} ILIKE ${pattern} OR 
            ${bills.description} ILIKE ${pattern}
          `)
          .orderBy(bills.id) // Consistent ordering for reproducible results
          .limit(20);
      });
      
      logPerformance('Full-text search query', queryTime, PERFORMANCE_THRESHOLD_MS);
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should handle pagination efficiently', async () => {
      const { result, queryTime } = await measureQueryTime(async () => {
        // Pagination query with stable ordering
        return db
          .select({
            id: bills.id,
            title: bills.title,
            status: bills.status
          })
          .from(bills)
          .orderBy(bills.id) // Using indexed column for efficient pagination
          .limit(50)
          .offset(100);
      });
      
      logPerformance('Pagination query', queryTime, PERFORMANCE_THRESHOLD_MS);
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Sponsor Analysis Performance', () => {
    it('should retrieve sponsor data efficiently', async () => {
      const { result, queryTime } = await measureQueryTime(async () => {
        // Optimized sponsor aggregation
        return db
          .select({
            id: sponsors.id,
            name: sponsors.name,
            billCount: sql<number>`COUNT(${bills.id})::int`
          })
          .from(sponsors)
          .leftJoin(bills, eq(sponsors.id, bills.sponsor_id))
          .groupBy(sponsors.id, sponsors.name)
          .orderBy(desc(sql`COUNT(${bills.id})`)) // Most active sponsors first
          .limit(25);
      });
      
      logPerformance('Sponsor analysis query', queryTime, PERFORMANCE_THRESHOLD_MS);
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(25);
    });
  });

  describe('Query Optimization Verification', () => {
    it('should avoid N+1 query patterns', async () => {
      const { result, queryTime } = await measureQueryTime(async () => { // Single optimized query replacing potential N+1 pattern
        // This demonstrates fetching bills with all related data in one query
        return db
          .select({
            bill_id: bills.id,
            billTitle: bills.title,
            view_count: sql<number>`COALESCE(SUM(${bill_engagement.view_count }), 0)::int`,
            comment_count: sql<number>`COUNT(DISTINCT ${comments.id})::int`
          })
          .from(bills)
          .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
          .leftJoin(comments, eq(bills.id, comments.bill_id))
          .groupBy(bills.id, bills.title)
          .orderBy(bills.id) // Deterministic ordering
          .limit(10);
      });
      
      logPerformance('N+1 prevention query', queryTime, PERFORMANCE_THRESHOLD_MS);
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Verify that we're getting aggregated data properly
      if (result.length > 0) { expect(result[0]).toHaveProperty('bill_id');
        expect(result[0]).toHaveProperty('billTitle');
        expect(result[0]).toHaveProperty('view_count');
        expect(result[0]).toHaveProperty('comment_count');
       }
    });

    it('should efficiently retrieve bills with multiple relationships', async () => {
      const { result, queryTime } = await measureQueryTime(async () => { // Complex query demonstrating efficient multi-join pattern
        return db
          .select({
            bill_id: bills.id,
            billTitle: bills.title,
            sponsorName: sponsors.name,
            totalEngagement: sql<number>`
              COALESCE(SUM(${bill_engagement.view_count }), 0) + 
              COALESCE(SUM(${bill_engagement.share_count}), 0)
            `,
            comment_count: sql<number>`COUNT(DISTINCT ${comments.id})::int`
          })
          .from(bills)
          .leftJoin(sponsors, eq(bills.sponsor_id, sponsors.id))
          .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
          .leftJoin(comments, eq(bills.id, comments.bill_id))
          .groupBy(bills.id, bills.title, sponsors.name)
          .orderBy(desc(sql`
            COALESCE(SUM(${bill_engagement.view_count}), 0) + 
            COALESCE(SUM(${bill_engagement.share_count}), 0)
          `))
          .limit(15);
      });
      
      logPerformance('Multi-relationship query', queryTime, PERFORMANCE_THRESHOLD_MS);
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(15);
    });
  });
});






































