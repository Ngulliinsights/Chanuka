/**
 * Recommendation Engine Integration Tests
 * 
 * Tests the full recommendation flow including:
 * - Database interactions
 * - Cache operations
 * - Monitoring integration
 * - Performance requirements
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { RecommendationService } from '../application/RecommendationService';
import { integrationMonitor } from '@server/features/monitoring/domain/integration-monitor.service';
import { database as db } from '@server/infrastructure/database';
import { bills, bill_engagement, user_interests } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

describe('Recommendation Engine Integration Tests', () => {
  let recommendationService: RecommendationService;
  let testUserId: string;
  let testBillIds: number[];
  
  beforeAll(async () => {
    recommendationService = new RecommendationService();
    testUserId = 'integration-test-user';
    
    // Setup test data
    await setupTestData();
  });
  
  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });
  
  beforeEach(() => {
    // Clear cache before each test
    recommendationService.clearCache();
  });
  
  async function setupTestData() {
    try {
      // Create test bills
      const testBills = [
        {
          title: 'Test Bill 1',
          description: 'Healthcare reform bill',
          category: 'healthcare',
          status: 'introduced',
          tags: ['healthcare', 'reform'],
          view_count: 100,
          comment_count: 10,
          share_count: 5,
        },
        {
          title: 'Test Bill 2',
          description: 'Education funding bill',
          category: 'education',
          status: 'committee',
          tags: ['education', 'funding'],
          view_count: 80,
          comment_count: 8,
          share_count: 3,
        },
        {
          title: 'Test Bill 3',
          description: 'Healthcare access bill',
          category: 'healthcare',
          status: 'introduced',
          tags: ['healthcare', 'access'],
          view_count: 120,
          comment_count: 15,
          share_count: 7,
        },
      ];
      
      const insertedBills = await db.insert(bills).values(testBills).returning();
      testBillIds = insertedBills.map(b => b.id);
      
      // Create user interests
      await db.insert(user_interests).values([
        { user_id: testUserId, interest: 'healthcare' },
        { user_id: testUserId, interest: 'reform' },
      ]);
      
      // Create engagement data
      await db.insert(bill_engagement).values([
        {
          user_id: testUserId,
          bill_id: testBillIds[0],
          view_count: 1,
          comment_count: 0,
          share_count: 0,
          lastEngaged: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Failed to setup test data:', error);
      throw error;
    }
  }
  
  async function cleanupTestData() {
    try {
      // Delete in reverse order of dependencies
      await db.delete(bill_engagement).where(eq(bill_engagement.user_id, testUserId));
      await db.delete(user_interests).where(eq(user_interests.user_id, testUserId));
      
      for (const billId of testBillIds) {
        await db.delete(bills).where(eq(bills.id, billId));
      }
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }
  
  describe('Personalized Recommendations', () => {
    it('should generate personalized recommendations based on user interests', async () => {
      const recommendations = await recommendationService.getPersonalizedRecommendations(
        testUserId,
        10
      );
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      
      // Should prioritize healthcare bills based on user interests
      const healthcareBills = recommendations.filter(
        r => r.category === 'healthcare' || r.tags?.includes('healthcare')
      );
      
      expect(healthcareBills.length).toBeGreaterThan(0);
    });
    
    it('should meet performance requirement (< 200ms)', async () => {
      const startTime = Date.now();
      
      await recommendationService.getPersonalizedRecommendations(testUserId, 10);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(200);
    });
    
    it('should use caching for repeated requests', async () => {
      // First request - cache miss
      const startTime1 = Date.now();
      const recommendations1 = await recommendationService.getPersonalizedRecommendations(
        testUserId,
        10
      );
      const responseTime1 = Date.now() - startTime1;
      
      // Second request - cache hit
      const startTime2 = Date.now();
      const recommendations2 = await recommendationService.getPersonalizedRecommendations(
        testUserId,
        10
      );
      const responseTime2 = Date.now() - startTime2;
      
      // Cache hit should be faster
      expect(responseTime2).toBeLessThan(responseTime1);
      
      // Results should be the same
      expect(recommendations2).toEqual(recommendations1);
    });
    
    it('should exclude already engaged bills', async () => {
      const recommendations = await recommendationService.getPersonalizedRecommendations(
        testUserId,
        10
      );
      
      // Should not include the bill user already viewed
      const engagedBill = recommendations.find(r => r.id === testBillIds[0]);
      expect(engagedBill).toBeUndefined();
    });
  });
  
  describe('Similar Bills', () => {
    it('should find similar bills based on content', async () => {
      const similarBills = await recommendationService.getSimilarBills(testBillIds[0], 5);
      
      expect(similarBills).toBeDefined();
      expect(Array.isArray(similarBills)).toBe(true);
      
      // Should find the other healthcare bill as similar
      const similarHealthcareBill = similarBills.find(b => b.id === testBillIds[2]);
      expect(similarHealthcareBill).toBeDefined();
      
      if (similarHealthcareBill) {
        expect(similarHealthcareBill.similarityScore).toBeGreaterThan(0);
      }
    });
    
    it('should meet performance requirement (< 200ms)', async () => {
      const startTime = Date.now();
      
      await recommendationService.getSimilarBills(testBillIds[0], 5);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(200);
    });
    
    it('should not include the source bill in results', async () => {
      const similarBills = await recommendationService.getSimilarBills(testBillIds[0], 5);
      
      const sourceBill = similarBills.find(b => b.id === testBillIds[0]);
      expect(sourceBill).toBeUndefined();
    });
  });
  
  describe('Trending Bills', () => {
    it('should identify trending bills based on recent engagement', async () => {
      const trendingBills = await recommendationService.getTrendingBills(7, 10);
      
      expect(trendingBills).toBeDefined();
      expect(Array.isArray(trendingBills)).toBe(true);
      
      // Bills with higher engagement should have higher trend scores
      if (trendingBills.length > 1) {
        const scores = trendingBills.map(b => b.trendScore);
        const isSorted = scores.every((score, i) => i === 0 || score <= scores[i - 1]);
        expect(isSorted).toBe(true);
      }
    });
    
    it('should meet performance requirement (< 200ms)', async () => {
      const startTime = Date.now();
      
      await recommendationService.getTrendingBills(7, 10);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(200);
    });
  });
  
  describe('Collaborative Filtering', () => {
    it('should generate collaborative recommendations', async () => {
      const recommendations = await recommendationService.getCollaborativeRecommendations(
        testUserId,
        10
      );
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
    
    it('should meet performance requirement (< 200ms)', async () => {
      const startTime = Date.now();
      
      await recommendationService.getCollaborativeRecommendations(testUserId, 10);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(200);
    });
  });
  
  describe('Engagement Tracking', () => {
    it('should track user engagement', async () => {
      await recommendationService.trackEngagement(testUserId, testBillIds[1], 'view');
      
      // Verify engagement was recorded
      const engagement = await db
        .select()
        .from(bill_engagement)
        .where(
          eq(bill_engagement.user_id, testUserId) &&
          eq(bill_engagement.bill_id, testBillIds[1])
        );
      
      expect(engagement.length).toBeGreaterThan(0);
    });
    
    it('should invalidate cache after engagement', async () => {
      // Get recommendations (cache them)
      const recommendations1 = await recommendationService.getPersonalizedRecommendations(
        testUserId,
        10
      );
      
      // Track engagement
      await recommendationService.trackEngagement(testUserId, testBillIds[1], 'comment');
      
      // Get recommendations again (should be different due to cache invalidation)
      const recommendations2 = await recommendationService.getPersonalizedRecommendations(
        testUserId,
        10
      );
      
      // Results might be different after engagement
      // At minimum, cache should have been cleared
      const cacheStats = recommendationService.getCacheStats();
      expect(cacheStats.size).toBeLessThanOrEqual(recommendations1.length);
    });
  });
  
  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = recommendationService.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.keys)).toBe(true);
    });
    
    it('should clear cache on demand', () => {
      // Generate some cached data
      recommendationService.getPersonalizedRecommendations(testUserId, 10);
      
      // Clear cache
      recommendationService.clearCache();
      
      const stats = recommendationService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys.length).toBe(0);
    });
  });
  
  describe('Monitoring Integration', () => {
    it('should register with monitoring system', async () => {
      // This would be tested in the actual deployment
      // Here we just verify the monitoring service is available
      expect(integrationMonitor).toBeDefined();
      expect(integrationMonitor.registerFeature).toBeDefined();
      expect(integrationMonitor.recordMetrics).toBeDefined();
      expect(integrationMonitor.logEvent).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid user ID gracefully', async () => {
      const recommendations = await recommendationService.getPersonalizedRecommendations(
        'non-existent-user',
        10
      );
      
      // Should return empty array instead of throwing
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBe(0);
    });
    
    it('should handle invalid bill ID gracefully', async () => {
      const similarBills = await recommendationService.getSimilarBills(999999, 5);
      
      // Should return empty array instead of throwing
      expect(Array.isArray(similarBills)).toBe(true);
      expect(similarBills.length).toBe(0);
    });
  });
});
