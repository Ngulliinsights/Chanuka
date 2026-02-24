/**
 * Pretext Detection Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import pretextDetectionRoutes from '../application/pretext-detection.routes';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/pretext-detection', pretextDetectionRoutes);

describe('Pretext Detection API Integration', () => {
  describe('POST /api/pretext-detection/analyze', () => {
    it('should analyze a bill', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({
          billId: 'test-bill-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('billId');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('detections');
      expect(response.body).toHaveProperty('confidence');
    });

    it('should return 400 when billId is missing', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should force re-analysis when force flag is true', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({
          billId: 'test-bill-123',
          force: true
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('billId');
    });
  });

  describe('GET /api/pretext-detection/alerts', () => {
    it('should retrieve alerts', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/alerts');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter alerts by status', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/alerts')
        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should limit number of alerts', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/alerts')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /api/pretext-detection/review', () => {
    it('should review an alert', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/review')
        .send({
          alertId: 'alert-123',
          status: 'approved'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 when alertId is missing', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/review')
        .send({
          status: 'approved'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when status is invalid', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/review')
        .send({
          alertId: 'alert-123',
          status: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/pretext-detection/analytics', () => {
    it('should retrieve analytics', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/analytics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('cacheStats');
    });

    it('should retrieve analytics for date range', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
    });
  });

  describe('Performance', () => {
    it('should respond within 500ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/pretext-detection/analyze')
        .send({
          billId: 'test-bill-perf'
        });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });
  });
});
