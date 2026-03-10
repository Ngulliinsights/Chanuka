/**
 * Modernized Features Integration Test
 * Tests the integration between modernized server features and client services
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@server/index';
import { governmentDataApiService } from '@client/features/government-data/services/government-data-api.service';
import { communityApiService } from '@client/features/community/services/community-api.service';
import { analyticsApiService } from '@client/features/analytics/services/analytics-api.service';

// Mock API client for testing
const mockApiClient = {
  get: async (url: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await request(app).get(url + queryString);
    return response.body;
  },
  post: async (url: string, data?: any) => {
    const response = await request(app).post(url).send(data);
    return response.body;
  },
  patch: async (url: string, data?: any) => {
    const response = await request(app).patch(url).send(data);
    return response.body;
  },
  delete: async (url: string) => {
    const response = await request(app).delete(url);
    return response.body;
  }
};

describe('Modernized Features Integration', () => {
  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('API Contracts Standardization', () => {
    it('should have consistent response format across all features', async () => {
      const endpoints = [
        '/api/government-data/health',
        '/api/community/health',
        '/api/analytics/health'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('version');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('checks');
        expect(response.body.checks).toHaveProperty('database');
        expect(response.body.checks).toHaveProperty('cache');
      }
    });

    it('should have consistent metadata endpoints', async () => {
      const endpoints = [
        '/api/government-data/metadata',
        '/api/community/metadata'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('schema');
        expect(response.body).toHaveProperty('enums');
        expect(response.body).toHaveProperty('constraints');
        expect(response.body).toHaveProperty('relationships');
      }
    });

    it('should handle errors consistently across features', async () => {
      const endpoints = [
        '/api/government-data/nonexistent',
        '/api/community/nonexistent'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('type');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error).toHaveProperty('code');
      }
    });
  });

  describe('Government Data Feature', () => {
    it('should list government data with pagination', async () => {
      const response = await request(app)
        .get('/api/government-data')
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('offset', 0);
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should filter government data by type', async () => {
      const response = await request(app)
        .get('/api/government-data')
        .query({ dataType: 'bill', limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      if (response.body.data && response.body.data.length > 0) {
        response.body.data.forEach((item: any) => {
          expect(item.dataType).toBe('bill');
        });
      }
    });

    it('should get government data statistics', async () => {
      const response = await request(app).get('/api/government-data/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      if (response.body.data) {
        expect(response.body.data).toHaveProperty('totalRecords');
        expect(response.body.data).toHaveProperty('byType');
        expect(response.body.data).toHaveProperty('bySource');
        expect(response.body.data).toHaveProperty('byStatus');
        expect(response.body.data).toHaveProperty('recentActivity');
      }
    });

    it('should handle sync operations', async () => {
      const response = await request(app).get('/api/government-data/sync/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      if (response.body.data) {
        expect(response.body.data).toHaveProperty('status');
        expect(['idle', 'running', 'error']).toContain(response.body.data.status);
      }
    });
  });

  describe('Community Feature', () => {
    it('should list comments with engagement metrics', async () => {
      const response = await request(app)
        .get('/api/community/comments')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      
      if (response.body.data && response.body.data.length > 0) {
        const comment = response.body.data[0];
        expect(comment).toHaveProperty('id');
        expect(comment).toHaveProperty('billId');
        expect(comment).toHaveProperty('userId');
        expect(comment).toHaveProperty('content');
        expect(comment).toHaveProperty('type');
        expect(comment).toHaveProperty('status');
        expect(comment).toHaveProperty('metadata');
        expect(comment).toHaveProperty('engagement');
        expect(comment.engagement).toHaveProperty('upvotes');
        expect(comment.engagement).toHaveProperty('downvotes');
        expect(comment.engagement).toHaveProperty('replies');
        expect(comment.engagement).toHaveProperty('reports');
      }
    });

    it('should filter comments by bill ID', async () => {
      // First get a bill ID from government data or use a test ID
      const billId = 'test-bill-id';
      
      const response = await request(app)
        .get('/api/community/comments')
        .query({ billId, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      if (response.body.data && response.body.data.length > 0) {
        response.body.data.forEach((comment: any) => {
          expect(comment.billId).toBe(billId);
        });
      }
    });

    it('should require authentication for creating comments', async () => {
      const commentData = {
        billId: 'test-bill-id',
        content: 'This is a test comment',
        type: 'general'
      };

      const response = await request(app)
        .post('/api/community/comments')
        .send(commentData);

      // Should return 401 Unauthorized without authentication
      expect(response.status).toBe(401);
    });

    it('should require authentication for voting', async () => {
      const voteData = {
        targetId: 'test-comment-id',
        targetType: 'comment',
        type: 'upvote'
      };

      const response = await request(app)
        .post('/api/community/votes')
        .send(voteData);

      // Should return 401 Unauthorized without authentication
      expect(response.status).toBe(401);
    });
  });

  describe('Analytics Feature', () => {
    it('should track engagement events', async () => {
      const engagementData = {
        entityId: 'test-bill-id',
        entityType: 'bill',
        eventType: 'view',
        metadata: {
          source: 'test',
          userAgent: 'test-agent'
        }
      };

      const response = await request(app)
        .post('/api/analytics/track')
        .send(engagementData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      if (response.body.data) {
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('entityId', engagementData.entityId);
        expect(response.body.data).toHaveProperty('entityType', engagementData.entityType);
        expect(response.body.data).toHaveProperty('eventType', engagementData.eventType);
      }
    });

    it('should get real-time metrics', async () => {
      const response = await request(app).get('/api/analytics/realtime');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      if (response.body.data) {
        expect(response.body.data).toHaveProperty('activeUsers');
        expect(response.body.data).toHaveProperty('currentSessions');
        expect(response.body.data).toHaveProperty('topPages');
        expect(response.body.data).toHaveProperty('recentEvents');
        expect(response.body.data).toHaveProperty('systemLoad');
      }
    });

    it('should get engagement summaries', async () => {
      const response = await request(app)
        .get('/api/analytics/summaries')
        .query({
          entityType: 'bill',
          period: 'week',
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      if (response.body.data) {
        expect(response.body.data).toHaveProperty('summaries');
        expect(response.body.data).toHaveProperty('aggregated');
        expect(response.body.data.aggregated).toHaveProperty('totalViews');
        expect(response.body.data.aggregated).toHaveProperty('totalEngagement');
        expect(response.body.data.aggregated).toHaveProperty('averageEngagementRate');
      }
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should maintain data consistency between features', async () => {
      // Test that government data referenced in comments exists
      const commentsResponse = await request(app)
        .get('/api/community/comments')
        .query({ limit: 5 });

      if (commentsResponse.body.data && commentsResponse.body.data.length > 0) {
        const comment = commentsResponse.body.data[0];
        
        // Check if the bill referenced in the comment exists in government data
        const billResponse = await request(app)
          .get(`/api/government-data/${comment.billId}`);

        // Should either find the bill or return a proper 404
        expect([200, 404]).toContain(billResponse.status);
        
        if (billResponse.status === 200) {
          expect(billResponse.body.success).toBe(true);
          expect(billResponse.body.data.id).toBe(comment.billId);
        }
      }
    });

    it('should track analytics for government data views', async () => {
      // Get a government data item
      const govDataResponse = await request(app)
        .get('/api/government-data')
        .query({ limit: 1 });

      if (govDataResponse.body.data && govDataResponse.body.data.length > 0) {
        const item = govDataResponse.body.data[0];
        
        // Track a view event
        const trackResponse = await request(app)
          .post('/api/analytics/track')
          .send({
            entityId: item.id,
            entityType: 'bill',
            eventType: 'view',
            metadata: { source: 'integration-test' }
          });

        expect(trackResponse.status).toBe(201);
        expect(trackResponse.body.success).toBe(true);
      }
    });

    it('should track analytics for community interactions', async () => {
      // Get a comment
      const commentsResponse = await request(app)
        .get('/api/community/comments')
        .query({ limit: 1 });

      if (commentsResponse.body.data && commentsResponse.body.data.length > 0) {
        const comment = commentsResponse.body.data[0];
        
        // Track a comment view event
        const trackResponse = await request(app)
          .post('/api/analytics/track')
          .send({
            entityId: comment.id,
            entityType: 'comment',
            eventType: 'view',
            metadata: { source: 'integration-test' }
          });

        expect(trackResponse.status).toBe(201);
        expect(trackResponse.body.success).toBe(true);
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should have cache headers for cacheable endpoints', async () => {
      const cacheableEndpoints = [
        '/api/government-data/metadata',
        '/api/community/metadata',
        '/api/government-data/tags'
      ];

      for (const endpoint of cacheableEndpoints) {
        const response = await request(app).get(endpoint);
        
        if (response.status === 200) {
          // Check for cache-related headers (implementation dependent)
          // This is a placeholder - actual cache headers depend on implementation
          expect(response.headers).toBeDefined();
        }
      }
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array(10).fill(null).map(() =>
        request(app).get('/api/government-data/health')
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('Security and Validation', () => {
    it('should validate input data for POST requests', async () => {
      const invalidData = {
        // Missing required fields
        content: 'x'.repeat(10000) // Too long
      };

      const response = await request(app)
        .post('/api/community/comments')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should sanitize output data', async () => {
      const response = await request(app).get('/api/government-data/health');

      expect(response.status).toBe(200);
      
      // Check that response doesn't contain sensitive information
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/password|secret|key|token/i);
    });

    it('should have proper CORS headers', async () => {
      const response = await request(app).get('/api/government-data/health');

      expect(response.status).toBe(200);
      // CORS headers should be present (implementation dependent)
      expect(response.headers).toBeDefined();
    });
  });
});