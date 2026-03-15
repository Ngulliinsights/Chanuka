/**
 * Integration Monitoring API Integration Tests
 * 
 * Tests the complete monitoring API flow including:
 * - Dashboard data retrieval
 * - Feature registration and management
 * - Metrics recording and retrieval
 * - Health checks
 * - Alert management
 * - Log management
 * 
 * These tests use real database connections and test the full stack.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import monitoringRoutes from '../application/monitoring.routes';
import { integrationMonitor } from '../domain/integration-monitor.service';
import { database as db } from '@server/infrastructure/database';
import {
  integrationFeatures,
  featureMetrics,
  healthChecks,
  integrationAlerts,
  alertRules,
  integrationLogs,
} from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

describe('Monitoring API Integration Tests', () => {
  let app: Express;
  let testFeatureId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/monitoring', monitoringRoutes);
  });

  beforeEach(async () => {
    // Create a test feature for each test
    const feature = await integrationMonitor.registerFeature({
      id: `test-feature-${Date.now()}`,
      name: 'test-feature',
      displayName: 'Test Feature',
      description: 'A test feature for monitoring',
      category: 'quick-wins',
      phase: 1,
      enabled: false,
      healthStatus: 'unknown',
    });
    testFeatureId = feature.id;
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db.delete(integrationLogs).where(eq(integrationLogs.featureId, testFeatureId));
      await db.delete(integrationAlerts).where(eq(integrationAlerts.featureId, testFeatureId));
      await db.delete(alertRules).where(eq(alertRules.featureId, testFeatureId));
      await db.delete(healthChecks).where(eq(healthChecks.featureId, testFeatureId));
      await db.delete(featureMetrics).where(eq(featureMetrics.featureId, testFeatureId));
      await db.delete(integrationFeatures).where(eq(integrationFeatures.id, testFeatureId));
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('GET /api/monitoring/health', () => {
    it('should return system health status', async () => {
      const response = await request(app).get('/api/monitoring/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(['healthy', 'degraded', 'down']).toContain(response.body.status);
    });

    it('should include health metrics', async () => {
      const response = await request(app).get('/api/monitoring/health');

      expect(response.body).toHaveProperty('totalFeatures');
      expect(response.body).toHaveProperty('healthyFeatures');
      expect(response.body).toHaveProperty('degradedFeatures');
      expect(response.body).toHaveProperty('downFeatures');
      expect(typeof response.body.totalFeatures).toBe('number');
      expect(typeof response.body.healthyFeatures).toBe('number');
    });

    it('should reflect degraded status when features are down', async () => {
      // Update test feature to down status
      await integrationMonitor.updateFeatureStatus(testFeatureId, true, 'down');

      const response = await request(app).get('/api/monitoring/health');

      expect(response.body.downFeatures).toBeGreaterThan(0);
      expect(['degraded', 'down']).toContain(response.body.status);
    });
  });

  describe('GET /api/monitoring/dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app).get('/api/monitoring/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('systemHealth');
    });

    it('should include feature list', async () => {
      const response = await request(app).get('/api/monitoring/dashboard');

      expect(Array.isArray(response.body.features)).toBe(true);
    });

    it('should include system health summary', async () => {
      const response = await request(app).get('/api/monitoring/dashboard');

      const { systemHealth } = response.body;
      expect(systemHealth).toHaveProperty('totalFeatures');
      expect(systemHealth).toHaveProperty('totalAlerts');
      expect(systemHealth).toHaveProperty('criticalAlerts');
    });
  });

  describe('POST /api/monitoring/features', () => {
    it('should register a new feature', async () => {
      const feature = {
        id: `new-feature-${Date.now()}`,
        name: 'new-test-feature',
        displayName: 'New Test Feature',
        description: 'A new test feature for monitoring',
        category: 'quick-wins',
        phase: 1,
        enabled: false,
        healthStatus: 'unknown',
      };

      const response = await request(app)
        .post('/api/monitoring/features')
        .send(feature);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('new-test-feature');
      expect(response.body.displayName).toBe('New Test Feature');

      // Clean up
      await db.delete(integrationFeatures).where(eq(integrationFeatures.id, response.body.id));
    });

    it('should handle duplicate feature registration', async () => {
      const feature = {
        id: testFeatureId,
        name: 'test-feature',
        displayName: 'Test Feature',
        description: 'Duplicate feature',
        category: 'quick-wins',
        phase: 1,
        enabled: false,
        healthStatus: 'unknown',
      };

      const response = await request(app)
        .post('/api/monitoring/features')
        .send(feature);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/monitoring/features/:featureId/metrics', () => {
    it('should return feature metrics', async () => {
      // Record some metrics first
      await integrationMonitor.recordMetrics(
        testFeatureId,
        {
          activeUsers: 10,
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
        },
        {
          avgResponseTime: 150,
          p95ResponseTime: 300,
          p99ResponseTime: 500,
        }
      );

      const response = await request(app).get(
        `/api/monitoring/features/${testFeatureId}/metrics`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('featureId', testFeatureId);
      expect(response.body[0]).toHaveProperty('activeUsers');
      expect(response.body[0]).toHaveProperty('totalRequests');
    });

    it('should support time range filtering', async () => {
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();

      const response = await request(app)
        .get(`/api/monitoring/features/${testFeatureId}/metrics`)
        .query({ startTime, endTime });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for feature with no metrics', async () => {
      const newFeatureId = `no-metrics-${Date.now()}`;
      await integrationMonitor.registerFeature({
        id: newFeatureId,
        name: 'no-metrics-feature',
        displayName: 'No Metrics Feature',
        description: 'Feature with no metrics',
        category: 'test',
        phase: 1,
        enabled: false,
        healthStatus: 'unknown',
      });

      const response = await request(app).get(
        `/api/monitoring/features/${newFeatureId}/metrics`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);

      // Clean up
      await db.delete(integrationFeatures).where(eq(integrationFeatures.id, newFeatureId));
    });
  });

  describe('POST /api/monitoring/features/:featureId/metrics', () => {
    it('should record feature metrics', async () => {
      const metrics = {
        usage: {
          activeUsers: 10,
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
        },
        performance: {
          avgResponseTime: 150,
          p95ResponseTime: 300,
          p99ResponseTime: 500,
        },
      };

      const response = await request(app)
        .post(`/api/monitoring/features/${testFeatureId}/metrics`)
        .send(metrics);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify metrics were recorded
      const metricsResponse = await request(app).get(
        `/api/monitoring/features/${testFeatureId}/metrics`
      );
      expect(metricsResponse.body.length).toBeGreaterThan(0);
    });

    it('should calculate error rate correctly', async () => {
      const metrics = {
        usage: {
          activeUsers: 5,
          totalRequests: 100,
          successfulRequests: 90,
          failedRequests: 10,
        },
        performance: {
          avgResponseTime: 200,
          p95ResponseTime: 400,
          p99ResponseTime: 600,
        },
      };

      await request(app)
        .post(`/api/monitoring/features/${testFeatureId}/metrics`)
        .send(metrics);

      const metricsResponse = await request(app).get(
        `/api/monitoring/features/${testFeatureId}/metrics`
      );

      const recordedMetric = metricsResponse.body[0];
      expect(recordedMetric.errorRate).toBe('0.1'); // 10/100 = 0.1
    });
  });

  describe('POST /api/monitoring/features/:featureId/health-check', () => {
    it('should perform health check', async () => {
      const featureId = 'test-feature-id';
      const healthCheckConfig = {
        endpoint: 'http://localhost:3000/health',
        expectedStatus: 200,
      };

      const response = await request(app)
        .post(`/api/monitoring/features/${featureId}/health-check`)
        .send(healthCheckConfig);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('GET /api/monitoring/features/:featureId/alerts', () => {
    it('should return feature alerts', async () => {
      // Create an alert first
      await integrationMonitor.createAlert({
        featureId: testFeatureId,
        severity: 'high',
        type: 'error_rate',
        title: 'Test Alert',
        message: 'Test alert message',
      });

      const response = await request(app).get(
        `/api/monitoring/features/${testFeatureId}/alerts`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('featureId', testFeatureId);
    });

    it('should filter by resolved status', async () => {
      // Create resolved and unresolved alerts
      await integrationMonitor.createAlert({
        featureId: testFeatureId,
        severity: 'medium',
        type: 'performance',
        title: 'Unresolved Alert',
        message: 'This alert is not resolved',
      });

      const response = await request(app)
        .get(`/api/monitoring/features/${testFeatureId}/alerts`)
        .query({ resolved: 'false' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // All alerts should be unresolved
      response.body.forEach((alert: any) => {
        expect(alert.resolved).toBe(false);
      });
    });
  });

  describe('POST /api/monitoring/alerts', () => {
    it('should create a new alert', async () => {
      const alert = {
        featureId: testFeatureId,
        severity: 'high',
        type: 'error_rate',
        title: 'High Error Rate',
        message: 'Error rate exceeded threshold',
      };

      const response = await request(app).post('/api/monitoring/alerts').send(alert);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.severity).toBe('high');
      expect(response.body.featureId).toBe(testFeatureId);
    });

    it('should create alert with threshold information', async () => {
      const alert = {
        featureId: testFeatureId,
        severity: 'critical',
        type: 'response_time',
        title: 'Slow Response Time',
        message: 'Response time exceeded 2 seconds',
        threshold: { value: 2000, operator: 'gt' },
        actualValue: 2500,
      };

      const response = await request(app).post('/api/monitoring/alerts').send(alert);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('threshold');
      expect(response.body).toHaveProperty('actualValue');
    });
  });

  describe('PUT /api/monitoring/alerts/:alertId/acknowledge', () => {
    it('should acknowledge an alert', async () => {
      // Create an alert first
      const alert = await integrationMonitor.createAlert({
        featureId: testFeatureId,
        severity: 'medium',
        type: 'test',
        title: 'Test Alert',
        message: 'Alert to be acknowledged',
      });

      const response = await request(app).put(
        `/api/monitoring/alerts/${alert.id}/acknowledge`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify alert was acknowledged
      const alerts = await integrationMonitor.getFeatureAlerts(testFeatureId);
      const acknowledgedAlert = alerts.find((a) => a.id === alert.id);
      expect(acknowledgedAlert?.acknowledged).toBe(true);
    });
  });

  describe('PUT /api/monitoring/alerts/:alertId/resolve', () => {
    it('should resolve an alert', async () => {
      // Create an alert first
      const alert = await integrationMonitor.createAlert({
        featureId: testFeatureId,
        severity: 'low',
        type: 'test',
        title: 'Test Alert',
        message: 'Alert to be resolved',
      });

      const response = await request(app).put(
        `/api/monitoring/alerts/${alert.id}/resolve`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify alert was resolved
      const alerts = await integrationMonitor.getFeatureAlerts(testFeatureId);
      const resolvedAlert = alerts.find((a) => a.id === alert.id);
      expect(resolvedAlert?.resolved).toBe(true);
    });
  });

  describe('POST /api/monitoring/features/:featureId/alert-rules', () => {
    it('should add an alert rule', async () => {
      const rule = {
        name: 'High Error Rate',
        metric: 'error_rate',
        operator: 'gt',
        threshold: '0.05',
        timeWindow: 5,
        severity: 'high',
        cooldown: 15,
        enabled: true,
      };

      const response = await request(app)
        .post(`/api/monitoring/features/${testFeatureId}/alert-rules`)
        .send(rule);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.metric).toBe('error_rate');
      expect(response.body.featureId).toBe(testFeatureId);
    });

    it('should trigger alert when rule conditions are met', async () => {
      // Add alert rule
      await integrationMonitor.addAlertRule({
        featureId: testFeatureId,
        name: 'High Response Time',
        metric: 'avg_response_time',
        operator: 'gt',
        threshold: '500',
        timeWindow: 5,
        severity: 'high',
        cooldown: 15,
        enabled: true,
      });

      // Record metrics that exceed threshold
      await integrationMonitor.recordMetrics(
        testFeatureId,
        {
          activeUsers: 10,
          totalRequests: 100,
          successfulRequests: 100,
          failedRequests: 0,
        },
        {
          avgResponseTime: 600, // Exceeds threshold of 500
          p95ResponseTime: 800,
          p99ResponseTime: 1000,
        }
      );

      // Check if alert was created
      const alerts = await integrationMonitor.getFeatureAlerts(testFeatureId, false);
      const highResponseAlert = alerts.find((a) => a.type === 'avg_response_time');
      expect(highResponseAlert).toBeDefined();
    });
  });

  describe('GET /api/monitoring/features/:featureId/logs', () => {
    it('should return feature logs', async () => {
      // Log some events first
      await integrationMonitor.logEvent(
        testFeatureId,
        'info',
        'test',
        'Test log message'
      );

      const response = await request(app).get(
        `/api/monitoring/features/${testFeatureId}/logs`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('featureId', testFeatureId);
    });

    it('should filter by log level', async () => {
      // Log events with different levels
      await integrationMonitor.logEvent(
        testFeatureId,
        'error',
        'test',
        'Error log message'
      );
      await integrationMonitor.logEvent(
        testFeatureId,
        'info',
        'test',
        'Info log message'
      );

      const response = await request(app)
        .get(`/api/monitoring/features/${testFeatureId}/logs`)
        .query({ level: 'error' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // All returned logs should be error level
      response.body.forEach((log: any) => {
        expect(log.level).toBe('error');
      });
    });

    it('should limit results', async () => {
      // Log multiple events
      for (let i = 0; i < 10; i++) {
        await integrationMonitor.logEvent(
          testFeatureId,
          'info',
          'test',
          `Log message ${i}`
        );
      }

      const response = await request(app)
        .get(`/api/monitoring/features/${testFeatureId}/logs`)
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /api/monitoring/features/:featureId/logs', () => {
    it('should log an event', async () => {
      const logEntry = {
        level: 'info',
        category: 'api',
        message: 'Test log message',
        details: { test: true },
      };

      const response = await request(app)
        .post(`/api/monitoring/features/${testFeatureId}/logs`)
        .send(logEntry);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify log was created
      const logs = await integrationMonitor.getFeatureLogs(testFeatureId);
      const createdLog = logs.find((l) => l.message === 'Test log message');
      expect(createdLog).toBeDefined();
      expect(createdLog?.level).toBe('info');
      expect(createdLog?.category).toBe('api');
    });

    it('should log events with different severity levels', async () => {
      const levels = ['debug', 'info', 'warn', 'error'] as const;

      for (const level of levels) {
        await request(app)
          .post(`/api/monitoring/features/${testFeatureId}/logs`)
          .send({
            level,
            category: 'test',
            message: `${level} level message`,
          });
      }

      const logs = await integrationMonitor.getFeatureLogs(testFeatureId);
      expect(logs.length).toBeGreaterThanOrEqual(4);
    });
  });
});
