// ============================================================================
// API INTEGRATION TESTS
// ============================================================================
// End-to-end API integration tests covering all major features

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index.js';
import { TestDataManager, ApiResponseValidator, SecurityTestHelper } from '../../tests/utils/test-helpers.js';
import { databaseService } from '../../infrastructure/database/database-service.js';
import { logger } from '@shared/core/index.js';

describe('API Integration Tests', () => {
  let testDataManager: TestDataManager;
  let authToken: string;
  let testUser: any;
  let testBill: any;

  beforeAll(async () => {
    testDataManager = new TestDataManager();
    
    // Create test user and get auth token
    testUser = await testDataManager.createTestUser({
      email: 'api-test-user@test.com',
      name: 'API Test User',
      role: 'citizen'
    });

    // Simulate authentication (in real app, this would be through login endpoint)
    authToken = 'Bearer test-token-' + testUser.id;

    logger.info('🧪 Starting API integration tests');
  });

  afterAll(async () => {
    await testDataManager.cleanup();
    logger.info('✅ API integration tests completed');
  });

  beforeEach(async () => {
    // Create fresh test bill for each test
    testBill = await testDataManager.createTestBill({
      title: 'API Test Bill',
      status: 'introduced'
    });
  });

  describe('Bills API Integration', () => {
    it('should handle complete bill lifecycle through API', async () => {
      // Get all bills
      const billsResponse = await request(app)
        .get('/api/bills')
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(billsResponse);
      expect(Array.isArray(billsResponse.body.data.bills)).toBe(true);

      // Get specific bill
      const billResponse = await request(app)
        .get(`/api/bills/${testBill.id}`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(billResponse);
      expect(billResponse.body.data.bill.id).toBe(testBill.id);

      // Search bills
      const searchResponse = await request(app)
        .get('/api/search/bills')
        .query({ q: 'API Test' })
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(searchResponse);
      expect(searchResponse.body.data.results).toBeDefined();

      // Vote on bill
      const voteResponse = await request(app)
        .post(`/api/bills/${testBill.id}/vote`)
        .set('Authorization', authToken)
        .send({ voteType: 'support', comment: 'I support this bill' })
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(voteResponse);

      // Comment on bill
      const commentResponse = await request(app)
        .post(`/api/bills/${testBill.id}/comments`)
        .set('Authorization', authToken)
        .send({ 
          content: 'This is a test comment on the bill',
          is_public: true 
        })
        .expect(201);

      ApiResponseValidator.validateSuccessResponse(commentResponse, 201);

      // Get bill comments
      const commentsResponse = await request(app)
        .get(`/api/bills/${testBill.id}/comments`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(commentsResponse);
      expect(Array.isArray(commentsResponse.body.data.comments)).toBe(true);

      logger.info('✅ Bills API lifecycle test completed');
    });

    it('should handle bill engagement tracking', async () => {
      // Track bill view
      const viewResponse = await request(app)
        .post(`/api/bills/${testBill.id}/engagement`)
        .set('Authorization', authToken)
        .send({ engagementType: 'view' })
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(viewResponse);

      // Get bill engagement metrics
      const metricsResponse = await request(app)
        .get(`/api/bills/${testBill.id}/metrics`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(metricsResponse);
      expect(metricsResponse.body.data.metrics.view_count).toBeGreaterThan(0);

      logger.info('✅ Bill engagement tracking test completed');
    });
  });

  describe('Advocacy API Integration', () => {
    it('should handle complete campaign lifecycle through API', async () => {
      // Create campaign
      const campaignData = {
        title: 'API Test Campaign',
        description: 'Testing campaign creation through API',
        bill_id: testBill.id,
        objectives: ['Test API functionality', 'Validate integration'],
        strategy: { approach: 'API testing' },
        targetCounties: ['Nairobi', 'Mombasa'],
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_public: true
      };

      const createResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', authToken)
        .send(campaignData)
        .expect(201);

      ApiResponseValidator.validateSuccessResponse(createResponse, 201);
      const campaign_id = createResponse.body.data.campaign.id;

      // Get campaign
      const getResponse = await request(app)
        .get(`/api/campaigns/${campaign_id}`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(getResponse);
      expect(getResponse.body.data.campaign.title).toBe(campaignData.title);

      // Join campaign
      const joinResponse = await request(app)
        .post(`/api/campaigns/${campaign_id}/join`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(joinResponse);

      // Create action
      const actionData = {
        actionTitle: 'API Test Action',
        actionDescription: 'Testing action creation through API',
        actionType: 'contact_representative',
        estimatedTimeMinutes: 30,
        difficultyLevel: 'easy',
        priority: 7
      };

      const actionResponse = await request(app)
        .post(`/api/campaigns/${campaign_id}/actions`)
        .set('Authorization', authToken)
        .send(actionData)
        .expect(201);

      ApiResponseValidator.validateSuccessResponse(actionResponse, 201);
      const actionId = actionResponse.body.data.action.id;

      // Complete action
      const completionData = {
        completionMethod: 'email',
        completionNotes: 'Successfully completed the action',
        completionEvidence: {
          evidenceType: 'screenshot',
          evidenceDescription: 'Screenshot of completed action'
        }
      };

      const completionResponse = await request(app)
        .post(`/api/actions/${actionId}/complete`)
        .set('Authorization', authToken)
        .send(completionData)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(completionResponse);

      // Get campaign metrics
      const metricsResponse = await request(app)
        .get(`/api/campaigns/${campaign_id}/metrics`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(metricsResponse);
      expect(metricsResponse.body.data.metrics.participantCount).toBeGreaterThan(0);

      logger.info('✅ Campaign API lifecycle test completed');
    });

    it('should handle campaign analytics and optimization', async () => {
      // Create campaign for analytics testing
      const campaignData = {
        title: 'Analytics Test Campaign',
        description: 'Testing analytics functionality',
        bill_id: testBill.id,
        objectives: ['Test analytics'],
        strategy: { approach: 'analytics testing' },
        targetCounties: ['Nairobi'],
        start_date: new Date().toISOString(),
        is_public: true
      };

      const createResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', authToken)
        .send(campaignData)
        .expect(201);

      const campaign_id = createResponse.body.data.campaign.id;

      // Get campaign analytics
      const analyticsResponse = await request(app)
        .get(`/api/campaigns/${campaign_id}/analytics`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(analyticsResponse);
      expect(analyticsResponse.body.data.analytics).toBeDefined();

      // Get optimization recommendations
      const optimizationResponse = await request(app)
        .get(`/api/campaigns/${campaign_id}/optimization`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(optimizationResponse);
      expect(optimizationResponse.body.data.recommendations).toBeDefined();

      // Get coalition opportunities
      const coalitionResponse = await request(app)
        .get(`/api/campaigns/${campaign_id}/coalition-opportunities`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(coalitionResponse);
      expect(Array.isArray(coalitionResponse.body.data.opportunities)).toBe(true);

      logger.info('✅ Campaign analytics API test completed');
    });
  });

  describe('Search API Integration', () => {
    it('should handle comprehensive search functionality', async () => {
      // Basic search
      const searchResponse = await request(app)
        .get('/api/search')
        .query({ q: 'test', type: 'bills' })
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(searchResponse);
      expect(searchResponse.body.data.results).toBeDefined();
      expect(searchResponse.body.data.facets).toBeDefined();

      // Advanced search with filters
      const advancedResponse = await request(app)
        .get('/api/search')
        .query({ 
          q: 'test',
          type: 'bills',
          status: 'introduced',
          chamber: 'National Assembly',
          limit: 10
        })
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(advancedResponse);

      // Search suggestions
      const suggestionsResponse = await request(app)
        .get('/api/search/suggestions')
        .query({ q: 'test' })
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(suggestionsResponse);
      expect(Array.isArray(suggestionsResponse.body.data.suggestions)).toBe(true);

      // Popular searches
      const popularResponse = await request(app)
        .get('/api/search/popular')
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(popularResponse);
      expect(Array.isArray(popularResponse.body.data.searches)).toBe(true);

      logger.info('✅ Search API test completed');
    });
  });

  describe('Recommendations API Integration', () => {
    it('should provide personalized recommendations', async () => {
      // Get personalized bill recommendations
      const recommendationsResponse = await request(app)
        .get('/api/recommendations/bills')
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(recommendationsResponse);
      expect(Array.isArray(recommendationsResponse.body.data.recommendations)).toBe(true);

      // Get similar bills
      const similarResponse = await request(app)
        .get(`/api/bills/${testBill.id}/similar`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(similarResponse);
      expect(Array.isArray(similarResponse.body.data.similarBills)).toBe(true);

      // Get trending bills
      const trendingResponse = await request(app)
        .get('/api/recommendations/trending')
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(trendingResponse);
      expect(Array.isArray(trendingResponse.body.data.trendingBills)).toBe(true);

      logger.info('✅ Recommendations API test completed');
    });
  });

  describe('Constitutional Analysis API Integration', () => {
    it('should provide constitutional analysis for bills', async () => {
      // Request constitutional analysis
      const analysisResponse = await request(app)
        .post(`/api/bills/${testBill.id}/constitutional-analysis`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(analysisResponse);

      // Get analysis results
      const resultsResponse = await request(app)
        .get(`/api/bills/${testBill.id}/constitutional-analysis`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(resultsResponse);
      expect(resultsResponse.body.data.analysis).toBeDefined();

      logger.info('✅ Constitutional analysis API test completed');
    });
  });

  describe('User Profile API Integration', () => {
    it('should handle user profile management', async () => {
      // Get user profile
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(profileResponse);
      expect(profileResponse.body.data.profile.user_id).toBe(testUser.id);

      // Update user profile
      const updateData = {
        bio: 'Updated bio for API testing',
        interests: ['environment', 'healthcare', 'education'],
        county: 'Nairobi',
        constituency: 'Westlands'
      };

      const updateResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(updateResponse);

      // Get user engagement history
      const historyResponse = await request(app)
        .get('/api/users/engagement-history')
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(historyResponse);
      expect(Array.isArray(historyResponse.body.data.history)).toBe(true);

      logger.info('✅ User profile API test completed');
    });
  });

  describe('Analytics API Integration', () => {
    it('should provide comprehensive analytics data', async () => {
      // Get platform analytics
      const platformResponse = await request(app)
        .get('/api/analytics/platform')
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(platformResponse);
      expect(platformResponse.body.data.analytics).toBeDefined();

      // Get engagement analytics
      const engagementResponse = await request(app)
        .get('/api/analytics/engagement')
        .query({ timeframe: '30d' })
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(engagementResponse);
      expect(engagementResponse.body.data.metrics).toBeDefined();

      // Get bill analytics
      const billAnalyticsResponse = await request(app)
        .get(`/api/analytics/bills/${testBill.id}`)
        .set('Authorization', authToken)
        .expect(200);

      ApiResponseValidator.validateSuccessResponse(billAnalyticsResponse);
      expect(billAnalyticsResponse.body.data.analytics).toBeDefined();

      logger.info('✅ Analytics API test completed');
    });
  });

  describe('Security and Error Handling', () => {
    it('should handle authentication and authorization properly', async () => {
      // Test unauthenticated request
      await request(app)
        .get('/api/bills')
        .expect(401);

      // Test invalid token
      await request(app)
        .get('/api/bills')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test accessing protected resource
      const protectedResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', authToken)
        .expect(403); // Should be forbidden for regular user

      logger.info('✅ Authentication/authorization test completed');
    });

    it('should handle input validation and sanitization', async () => {
      // Test XSS prevention
      for (const payload of SecurityTestHelper.XSS_PAYLOADS) {
        const response = await request(app)
          .post(`/api/bills/${testBill.id}/comments`)
          .set('Authorization', authToken)
          .send({ content: payload, is_public: true })
          .expect(400); // Should reject malicious input

        ApiResponseValidator.validateErrorResponse(response, 400);
      }

      // Test SQL injection prevention
      for (const payload of SecurityTestHelper.SQL_INJECTION_PAYLOADS) {
        const response = await request(app)
          .get('/api/search')
          .query({ q: payload })
          .set('Authorization', authToken)
          .expect(200); // Should handle gracefully without error

        SecurityTestHelper.validateSQLInjectionPrevention(response);
      }

      // Test invalid IDs
      for (const invalidId of SecurityTestHelper.INVALID_IDS) {
        await request(app)
          .get(`/api/bills/${invalidId}`)
          .set('Authorization', authToken)
          .expect(400); // Should reject invalid IDs
      }

      logger.info('✅ Input validation and security test completed');
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/bills')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);

      logger.info('✅ Rate limiting test completed', { rateLimitedCount });
    });

    it('should handle concurrent requests gracefully', async () => {
      // Test concurrent campaign creation
      const campaignPromises = Array(5).fill(null).map((_, i) =>
        request(app)
          .post('/api/campaigns')
          .set('Authorization', authToken)
          .send({
            title: `Concurrent Campaign ${i}`,
            description: 'Testing concurrent creation',
            bill_id: testBill.id,
            objectives: ['Test concurrency'],
            strategy: { approach: 'concurrent testing' },
            targetCounties: ['Nairobi'],
            start_date: new Date().toISOString(),
            is_public: true
          })
      );

      const responses = await Promise.all(campaignPromises);
      
      // All should succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 201, 400, 409]).toContain(response.status);
      });

      logger.info('✅ Concurrent requests test completed');
    });

    it('should provide proper error responses', async () => {
      // Test 404 for non-existent resource
      const notFoundResponse = await request(app)
        .get('/api/bills/non-existent-id')
        .set('Authorization', authToken)
        .expect(404);

      ApiResponseValidator.validateErrorResponse(notFoundResponse, 404);

      // Test 400 for invalid request body
      const badRequestResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', authToken)
        .send({ invalid: 'data' })
        .expect(400);

      ApiResponseValidator.validateErrorResponse(badRequestResponse, 400);

      logger.info('✅ Error handling test completed');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle reasonable load efficiently', async () => {
      const startTime = Date.now();
      
      // Simulate moderate load
      const loadPromises = Array(50).fill(null).map(async (_, i) => {
        const response = await request(app)
          .get('/api/bills')
          .set('Authorization', authToken)
          .query({ page: Math.floor(i / 10) + 1, limit: 10 });
        
        return response.status === 200;
      });

      const results = await Promise.all(loadPromises);
      const successRate = results.filter(Boolean).length / results.length;
      const duration = Date.now() - startTime;

      expect(successRate).toBeGreaterThan(0.9); // 90% success rate
      expect(duration).toBeLessThan(10000); // Complete within 10 seconds

      logger.info('✅ Load testing completed', {
        requests: results.length,
        successRate,
        duration
      });
    });
  });
});