import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { router as externalApiManagementRouter } from '../../infrastructure/monitoring/external-api-management.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('External API Management Integration Tests', () => {
  let app: express.Application;
  let mockFetch: any;

  beforeAll(() => {
    mockFetch = global.fetch as any;
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/external-api', externalApiManagementRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/external-api/analytics', () => {
    it('should return comprehensive API analytics', async () => {
      const response = await request(app)
        .get('/api/external-api/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('totalRequests');
      expect(response.body.data).toHaveProperty('totalCost');
      expect(response.body.data).toHaveProperty('averageResponseTime');
      expect(response.body.data).toHaveProperty('overallSuccessRate');
      expect(response.body.data).toHaveProperty('cacheHitRate');
      expect(response.body.data).toHaveProperty('topPerformingSources');
      expect(response.body.data).toHaveProperty('costBreakdown');
    });

    it('should filter analytics by source when specified', async () => {
      const response = await request(app)
        .get('/api/external-api/analytics?source=parliament-ca')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sources).toHaveLength(1);
      expect(response.body.data.sources[0].source).toBe('parliament-ca');
    });

    it('should filter analytics by time window when specified', async () => {
      const timeWindow = 3600000; // 1 hour
      const response = await request(app)
        .get(`/api/external-api/analytics?timeWindow=${timeWindow}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sources');
    });
  });

  describe('GET /api/external-api/health', () => {
    it('should return health status for all API sources', async () => {
      const response = await request(app)
        .get('/api/external-api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('overallStatus');
      
      expect(Array.isArray(response.