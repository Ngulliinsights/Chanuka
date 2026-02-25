/**
 * Constitutional Intelligence Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '@server/app';
import { constitutionalService } from '@server/features/constitutional-intelligence/application/constitutional-service';

describe('Constitutional Intelligence Integration Tests', () => {
  const testBillId = 'test-bill-123';
  const testAnalysisId = 'test-analysis-456';
  const testExpertId = 'test-expert-789';

  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
    await constitutionalService.clearCache(testBillId);
  });

  describe('POST /api/constitutional-intelligence/analyze', () => {
    it('should analyze a bill successfully', async () => {
      const response = await request(app)
        .post('/api/constitutional-intelligence/analyze')
        .send({
          billId: testBillId,
          billText: 'This is a test bill that proposes changes to Article 45.',
          billTitle: 'Test Bill 2026',
          billType: 'public',
          affectedInstitutions: ['Parliament'],
          proposedChanges: ['Amend Article 45']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis).toBeDefined();
      expect(response.body.analysis.billId).toBe(testBillId);
      expect(response.body.analysis.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(response.body.analysis.alignmentScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(response.body.analysis.violations)).toBe(true);
      expect(response.body.analysis.processingTime).toBeGreaterThan(0);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/constitutional-intelligence/analyze')
        .send({
          billId: testBillId,
          // Missing billText, billTitle, billType
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should complete analysis within performance target', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/constitutional-intelligence/analyze')
        .send({
          billId: `${testBillId}-perf`,
          billText: 'Performance test bill text.',
          billTitle: 'Performance Test Bill',
          billType: 'public'
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // < 2 seconds
    });
  });

  describe('GET /api/constitutional-intelligence/bill/:billId', () => {
    it('should retrieve cached analysis', async () => {
      // First, create an analysis
      await request(app)
        .post('/api/constitutional-intelligence/analyze')
        .send({
          billId: testBillId,
          billText: 'Test bill for retrieval.',
          billTitle: 'Retrieval Test Bill',
          billType: 'public'
        });

      // Then retrieve it
      const response = await request(app)
        .get(`/api/constitutional-intelligence/bill/${testBillId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis).toBeDefined();
      expect(response.body.analysis.billId).toBe(testBillId);
    });

    it('should return 404 for non-existent analysis', async () => {
      const response = await request(app)
        .get('/api/constitutional-intelligence/bill/non-existent-bill');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/constitutional-intelligence/statistics', () => {
    it('should return statistics', async () => {
      const response = await request(app)
        .get('/api/constitutional-intelligence/statistics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.statistics).toBeDefined();
      expect(typeof response.body.statistics.totalAnalyses).toBe('number');
      expect(typeof response.body.statistics.averageAlignmentScore).toBe('number');
    });
  });

  describe('DELETE /api/constitutional-intelligence/cache/:billId', () => {
    it('should clear cache successfully', async () => {
      const response = await request(app)
        .delete(`/api/constitutional-intelligence/cache/${testBillId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Cache cleared');
    });
  });

  describe('Expert Review Endpoints', () => {
    describe('POST /api/constitutional-intelligence/review/request', () => {
      it('should create review requests', async () => {
        const response = await request(app)
          .post('/api/constitutional-intelligence/review/request')
          .send({
            analysisId: testAnalysisId,
            billId: testBillId,
            expertIds: [testExpertId, 'expert-2']
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.reviews)).toBe(true);
        expect(response.body.reviews.length).toBe(2);
        expect(response.body.reviews[0].status).toBe('pending');
      });

      it('should return 400 for invalid input', async () => {
        const response = await request(app)
          .post('/api/constitutional-intelligence/review/request')
          .send({
            analysisId: testAnalysisId,
            // Missing billId and expertIds
          });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/constitutional-intelligence/review/submit', () => {
      it('should submit review successfully', async () => {
        const response = await request(app)
          .post('/api/constitutional-intelligence/review/submit')
          .send({
            analysisId: testAnalysisId,
            billId: testBillId,
            expertId: testExpertId,
            status: 'approved',
            comments: 'Analysis is accurate and thorough.',
            recommendations: ['Consider additional precedent review']
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.review).toBeDefined();
        expect(response.body.review.status).toBe('approved');
        expect(response.body.review.reviewedAt).toBeDefined();
      });

      it('should return 400 for invalid status', async () => {
        const response = await request(app)
          .post('/api/constitutional-intelligence/review/submit')
          .send({
            analysisId: testAnalysisId,
            billId: testBillId,
            expertId: testExpertId,
            status: 'invalid_status',
            comments: 'Test comments'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid status');
      });
    });

    describe('GET /api/constitutional-intelligence/review/analysis/:analysisId', () => {
      it('should get reviews for analysis', async () => {
        const response = await request(app)
          .get(`/api/constitutional-intelligence/review/analysis/${testAnalysisId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.reviews)).toBe(true);
      });
    });

    describe('GET /api/constitutional-intelligence/review/pending/:expertId', () => {
      it('should get pending reviews for expert', async () => {
        const response = await request(app)
          .get(`/api/constitutional-intelligence/review/pending/${testExpertId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.reviews)).toBe(true);
      });
    });

    describe('GET /api/constitutional-intelligence/review/statistics', () => {
      it('should get review statistics', async () => {
        const response = await request(app)
          .get('/api/constitutional-intelligence/review/statistics');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statistics).toBeDefined();
        expect(typeof response.body.statistics.totalReviews).toBe('number');
      });
    });
  });

  describe('Monitoring Endpoints', () => {
    describe('GET /api/constitutional-intelligence/monitoring/metrics', () => {
      it('should get monitoring metrics', async () => {
        const response = await request(app)
          .get('/api/constitutional-intelligence/monitoring/metrics');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.metrics).toBeDefined();
        expect(typeof response.body.metrics.totalAnalyses).toBe('number');
        expect(typeof response.body.metrics.cacheHitRate).toBe('number');
        expect(typeof response.body.metrics.errorRate).toBe('number');
      });
    });

    describe('GET /api/constitutional-intelligence/monitoring/health', () => {
      it('should check health status', async () => {
        const response = await request(app)
          .get('/api/constitutional-intelligence/monitoring/health');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.health).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.health.status);
        expect(response.body.health.details).toBeDefined();
      });
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full analysis and review workflow', async () => {
      const workflowBillId = 'workflow-test-bill';

      // Step 1: Analyze bill
      const analyzeResponse = await request(app)
        .post('/api/constitutional-intelligence/analyze')
        .send({
          billId: workflowBillId,
          billText: 'Workflow test bill text.',
          billTitle: 'Workflow Test Bill',
          billType: 'public'
        });

      expect(analyzeResponse.status).toBe(200);
      const analysisId = analyzeResponse.body.analysis.billId;

      // Step 2: Create review requests
      const reviewRequestResponse = await request(app)
        .post('/api/constitutional-intelligence/review/request')
        .send({
          analysisId,
          billId: workflowBillId,
          expertIds: ['expert-1', 'expert-2']
        });

      expect(reviewRequestResponse.status).toBe(200);
      expect(reviewRequestResponse.body.reviews.length).toBe(2);

      // Step 3: Submit reviews
      const submitReviewResponse = await request(app)
        .post('/api/constitutional-intelligence/review/submit')
        .send({
          analysisId,
          billId: workflowBillId,
          expertId: 'expert-1',
          status: 'approved',
          comments: 'Workflow test approval'
        });

      expect(submitReviewResponse.status).toBe(200);

      // Step 4: Check metrics
      const metricsResponse = await request(app)
        .get('/api/constitutional-intelligence/monitoring/metrics');

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body.metrics.totalAnalyses).toBeGreaterThan(0);

      // Cleanup
      await constitutionalService.clearCache(workflowBillId);
    });
  });
});
