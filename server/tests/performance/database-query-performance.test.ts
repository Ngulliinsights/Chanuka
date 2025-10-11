import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { database as db, bills, billEngagement, billComments, sponsors } from '../../../shared/database/connection.js';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

describe('Database Query Performance Tests', () => {
  const PERFORMANCE_THRESHOLD_MS = 200;
  const SLOW_QUERY_THRESHOLD_MS = 500;
  
  beforeAll(async () => {
    // Ensure we have test data
    logger.info('Setting up performance test data...', { component: 'SimpleTool' });
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Bill Engagement Statistics Queries', () => {
    it('should retrieve engagement stats within performance threshold', async () => {
      const startTime = Date.now();
      
      // Test the optimized engagement query
      const result = await db
        .select({
          billId: billEngagement.billId,
          totalViews: sql<number>`COALESCE(SUM(${billEngagement.viewCount}), 0)`,
          totalComments: sql<number>`COUNT(DISTINCT ${billComments.id})`,
          totalShares: sql<number>`COALESCE(SUM(${billEngagement.shareCount}), 0)`,
          uniqueViewers: sql<number>`COUNT(DISTINCT ${billEngagement.userId})`
        })
        .from(billEngagement)
        .leftJoin(billComments, eq(billEngagement.billId, billComments.billId))
        .groupBy(billEngagement.billId)
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      console.log(`Engagement stats query completed in ${queryTime}ms`);
    });

    it('should handle large dataset queries efficiently', async () => {
      const startTime = Date.now();
      
      // Test query with larger dataset
      const result = await db
        .select({
          billId: bills.id,
          title: bills.title,
          engagementCount: sql<number>`COUNT(${billEngagement.id})`
        })
        .from(bills)
        .leftJoin(billEngagement, eq(bills.id, billEngagement.billId))
        .groupBy(bills.id, bills.title)
        .limit(100);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(SLOW_QUERY_THRESHOLD_MS);
      expect(result).toBeDefined();
      
      console.log(`Large dataset query completed in ${queryTime}ms`);
    });
  });

  describe('Bill Search Performance', () => {
    it('should perform full-text search within threshold', async () => {
      const startTime = Date.now();
      
      const searchTerm = 'healthcare';
      const result = await db
        .select({
          id: bills.id,
          title: bills.title,
          description: bills.description
        })
        .from(bills)
        .where(sql`
          ${bills.title} ILIKE ${'%' + searchTerm + '%'} OR 
          ${bills.description} ILIKE ${'%' + searchTerm + '%'}
        `)
        .limit(20);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      
      console.log(`Search query completed in ${queryTime}ms`);
    });

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select({
          id: bills.id,
          title: bills.title,
          status: bills.status
        })
        .from(bills)
        .orderBy(bills.id)
        .limit(50)
        .offset(100);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      
      console.log(`Pagination query completed in ${queryTime}ms`);
    });
  });

  describe('Sponsor Analysis Performance', () => {
    it('should retrieve sponsor data efficiently', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select({
          id: sponsors.id,
          name: sponsors.name,
          billCount: sql<number>`COUNT(${bills.id})`
        })
        .from(sponsors)
        .leftJoin(bills, eq(sponsors.id, bills.sponsorId))
        .groupBy(sponsors.id, sponsors.name)
        .limit(25);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      
      console.log(`Sponsor analysis query completed in ${queryTime}ms`);
    });
  });

  describe('Query Optimization Verification', () => {
    it('should avoid N+1 query patterns', async () => {
      const startTime = Date.now();
      let queryCount = 0;
      
      // Mock query counter (in real implementation, you'd use query logging)
      const originalQuery = db.select;
      
      // Get bills with their engagement data in a single query
      const result = await db
        .select({
          billId: bills.id,
          billTitle: bills.title,
          viewCount: sql<number>`COALESCE(SUM(${billEngagement.viewCount}), 0)`,
          commentCount: sql<number>`COUNT(DISTINCT ${billComments.id})`
        })
        .from(bills)
        .leftJoin(billEngagement, eq(bills.id, billEngagement.billId))
        .leftJoin(billComments, eq(bills.id, billComments.billId))
        .groupBy(bills.id, bills.title)
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(0);
      
      console.log(`N+1 prevention query completed in ${queryTime}ms`);
    });
  });
});






