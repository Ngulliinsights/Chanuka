// ============================================================================
// FEATURE FLAGS - Integration Tests
// ============================================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { featureFlagRoutes } from '../index';

const app = express();
app.use(express.json());
app.use('/api/feature-flags', featureFlagRoutes);

describe('Feature Flags Integration Tests', () => {
  let testFlagName: string;

  beforeEach(() => {
    testFlagName = `test-flag-${Date.now()}`;
  });

  describe('POST /api/feature-flags/flags', () => {
    it('should create a new feature flag', async () => {
      const response = await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 50
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(testFlagName);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.rolloutPercentage).toBe(50);
    });
  });

  describe('GET /api/feature-flags/flags', () => {
    it('should get all feature flags', async () => {
      const response = await request(app)
        .get('/api/feature-flags/flags');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/feature-flags/flags/:name', () => {
    it('should get a specific feature flag', async () => {
      // Create a flag first
      await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 50
        });

      const response = await request(app)
        .get(`/api/feature-flags/flags/${testFlagName}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(testFlagName);
    });

    it('should return 404 for non-existent flag', async () => {
      const response = await request(app)
        .get('/api/feature-flags/flags/non-existent-flag');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/feature-flags/flags/:name/toggle', () => {
    it('should toggle a feature flag', async () => {
      // Create a flag first
      await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 50
        });

      // Toggle it off
      const response = await request(app)
        .post(`/api/feature-flags/flags/${testFlagName}/toggle`)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
    });
  });

  describe('POST /api/feature-flags/flags/:name/rollout', () => {
    it('should update rollout percentage', async () => {
      // Create a flag first
      await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 50
        });

      // Update rollout
      const response = await request(app)
        .post(`/api/feature-flags/flags/${testFlagName}/rollout`)
        .send({ percentage: 75 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rolloutPercentage).toBe(75);
    });

    it('should reject invalid percentage', async () => {
      // Create a flag first
      await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 50
        });

      // Try invalid percentage
      const response = await request(app)
        .post(`/api/feature-flags/flags/${testFlagName}/rollout`)
        .send({ percentage: 150 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/feature-flags/flags/:name/evaluate', () => {
    it('should evaluate a feature flag', async () => {
      // Create a flag first
      await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 100
        });

      // Evaluate it
      const response = await request(app)
        .post(`/api/feature-flags/flags/${testFlagName}/evaluate`)
        .send({ userId: 'test-user-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.reason).toBeDefined();
    });

    it('should return false for disabled flag', async () => {
      // Create a disabled flag
      await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: false,
          rolloutPercentage: 100
        });

      // Evaluate it
      const response = await request(app)
        .post(`/api/feature-flags/flags/${testFlagName}/evaluate`)
        .send({ userId: 'test-user-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
    });
  });

  describe('GET /api/feature-flags/flags/:name/analytics', () => {
    it('should get analytics for a flag', async () => {
      // Create a flag first
      await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 50
        });

      // Evaluate it a few times
      await request(app)
        .post(`/api/feature-flags/flags/${testFlagName}/evaluate`)
        .send({ userId: 'user-1' });

      await request(app)
        .post(`/api/feature-flags/flags/${testFlagName}/evaluate`)
        .send({ userId: 'user-2' });

      // Get analytics
      const response = await request(app)
        .get(`/api/feature-flags/flags/${testFlagName}/analytics`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.flagName).toBe(testFlagName);
      expect(response.body.data.totalEvaluations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('DELETE /api/feature-flags/flags/:name', () => {
    it('should delete a feature flag', async () => {
      // Create a flag first
      await request(app)
        .post('/api/feature-flags/flags')
        .send({
          name: testFlagName,
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 50
        });

      // Delete it
      const response = await request(app)
        .delete(`/api/feature-flags/flags/${testFlagName}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/feature-flags/flags/${testFlagName}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
