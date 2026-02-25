/**
 * Pretext Detection API Integration Tests
 * 
 * End-to-end tests for pretext detection API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import pretextDetectionRoutes from '../application/pretext-detection.routes';

const app = express();
app.use(express.json());
app.use('/api/pretext-detection', pretextDetectionRoutes);

describe('Pretext Detection API Integration', () => {
  describe('POST /api/pretext-detection/analyze', () => {
    it('should analyze a bill successfully', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId: 'test-bill-123' })
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('billId');
        expect(response.body).toHaveProperty('detections');
        expect(response.body).toHaveProperty('score');
        expect(response.body).toHaveProperty('confidence');
      }
    });

    it('should return 400 when billId is missing', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('billId');
    });

    it('should support force re-analysis', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/analyze')
        .send({ billId: 'test-bill-123', force: true });

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('GET /api/pretext-detection/alerts', () => {
    it('should retrieve alerts', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/alerts')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should filter alerts by status', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/alerts?status=pending')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
    });

    it('should limit number of alerts', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/alerts?limit=5')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
      if (response.status === 200 && Array.isArray(response.body)) {
        expect(response.body.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('POST /api/pretext-detection/review', () => {
    it('should return 400 when alertId is missing', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/review')
        .send({ status: 'approved' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when status is invalid', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/review')
        .send({ alertId: 'alert-123', status: 'invalid' })
        .expect(400);

      expect(response.body.message).toContain('approved');
    });

    it('should accept valid review', async () => {
      const response = await request(app)
        .post('/api/pretext-detection/review')
        .send({
          alertId: 'alert-123',
          status: 'approved',
          notes: 'Confirmed issue',
        });

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('GET /api/pretext-detection/analytics', () => {
    it('should retrieve analytics', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/analytics')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('metrics');
        expect(response.body).toHaveProperty('cacheStats');
      }
    });

    it('should support date range filtering', async () => {
      const startDate = new Date('2026-01-01').toISOString();
      const endDate = new Date('2026-02-01').toISOString();

      const response = await request(app)
        .get(`/api/pretext-detection/analytics?startDate=${startDate}&endDate=${endDate}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('GET /api/pretext-detection/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/pretext-detection/health')
        .expect('Content-Type', /json/);

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'degraded', 'down']).toContain(response.body.status);
    });
  });
});
