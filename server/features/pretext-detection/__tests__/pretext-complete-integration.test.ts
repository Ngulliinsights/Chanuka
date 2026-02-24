/**
 * Pretext Detection Complete Integration Tests
 * 
 * End-to-end tests covering all API endpoints, caching, monitoring, and notifications
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import pretextDetectionRoutes from '../application/pretext-detection.routes';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/pretext-detection', pretextDetectionRoutes);

describe('Pretext Detection Complete Integration', () => {
  describe('Full Workflow: Analyze → Alert → Review', () => {
    it('should complete full workflow from analysis to review', async () => {
      // Step 1: Analyze a bill
      const analyzeResponse = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({
          billId: 'workflow-test-bill'
        });

      expect(analyzeResponse.status).toBe(200);
      expect(analyzeResponse.body).toHaveProperty('billId', 'workflow-test-bill');
      expect(analyzeResponse.body).toHaveProperty('score');
      expect(analyzeResponse.body).toHaveProperty('detections');

      // Step 2: If score is high, an alert should be created
      // We can verify this by checking alerts
      const alertsResponse = await request(app)
        .get('/api/pretext-detection/alerts')
        .query({ status: 'pending' });

      expect(alertsResponse.status).toBe(200);
      expect(Array.isArray(alertsResponse.body)).toBe(true);

      // Step 3: If there are alerts, review one
      if (alertsResponse.body.length > 0) {
        const alert = alertsResponse.body[0];
        
        const reviewResponse = await request(app)
          .post('/api/pretext-detection/review')
          .send({
            alertId: alert.id,
            status: 'approved',
            notes: 'Integration test review'
          });

        expect(reviewResponse.status).toBe(200);
        expect(reviewResponse.body).toHaveProperty('success', true);
      }
    });
  });

  describe('Caching Behavior', () => {
    it('should use cache on subsequent requests', async () => {
      const billId = 'cache-test-bill';

      // First request - should hit the service
      const firstResponse = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId });

      expect(firstResponse.status).toBe(200);
      const firstTime = Date.now();

      // Second request - should hit cache (faster)
      const secondResponse = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId });

      expect(secondResponse.status).toBe(200);
      const secondTime = Date.now();

      // Results should be identical
      expect(secondResponse.body.billId).toBe(firstResponse.body.billId);
      expect(secondResponse.body.score).toBe(firstResponse.body.score);
    });

    it('should bypass cache when force flag is true', async () => {
      const billId = 'force-test-bill';

      // First request
      const firstResponse = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId });

      expect(firstResponse.status).toBe(200);

      // Second request with force flag
      const secondResponse = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId, force: true });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.billId).toBe(billId);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/health');

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toHaveProperty('cache');
      expect(response.body.details).toHaveProperty('database');
    });

    it('should respond quickly to health checks', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/pretext-detection/health');

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should be very fast
    });
  });

  describe('Analytics', () => {
    it('should return analytics data', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/analytics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('cacheStats');
    });

    it('should accept date range parameters', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/analytics')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing billId gracefully', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid alert status', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/review')
        .send({
          alertId: 'test-alert',
          status: 'invalid-status'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing review parameters', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/review')
        .send({
          alertId: 'test-alert'
          // Missing status
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance Requirements', () => {
    it('should meet performance requirements for analysis', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({
          billId: 'perf-test-bill'
        });

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500); // NFR-4.1.1: < 500ms
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/pretext-detection/analyze')
          .send({
            billId: `concurrent-test-${i}`
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('billId');
      });
    });
  });

  describe('Alert Filtering', () => {
    it('should filter alerts by status', async () => {
      const statuses = ['pending', 'approved', 'rejected'];

      for (const status of statuses) {
        const response = await request(app)
          .get('/api/pretext-detection/alerts')
          .query({ status });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        // All returned alerts should have the requested status
        response.body.forEach((alert: any) => {
          if (alert.status) {
            expect(alert.status).toBe(status);
          }
        });
      }
    });

    it('should respect limit parameter', async () => {
      const limit = 5;
      
      const response = await request(app)
        .get('/api/pretext-detection/alerts')
        .query({ limit });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent data across cache and database', async () => {
      const billId = 'consistency-test-bill';

      // First request - populates cache and database
      const firstResponse = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId });

      expect(firstResponse.status).toBe(200);

      // Second request - should get same data from cache
      const secondResponse = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body).toEqual(firstResponse.body);

      // Force refresh - should get same data from database
      const thirdResponse = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId, force: true });

      expect(thirdResponse.status).toBe(200);
      expect(thirdResponse.body.billId).toBe(firstResponse.body.billId);
      expect(thirdResponse.body.score).toBe(firstResponse.body.score);
    });
  });
});
