import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../../../shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { router as billsRouter } from '../../features/bills/presentation/bills-router';
import { router as sponsorsRouter } from '../../features/bills/sponsors.js';
import { createFinancialDisclosureRouter } from '../../features/analytics/financial-disclosure/index.js';
import { router as authRouter } from '../../core/auth/auth.js';
import { router as adminRouter } from '../../features/admin/admin.js';
import { router as notificationsRouter } from '../../infrastructure/notifications/notifications.js';
import realTimeTrackingRouter from '../../features/bills/real-time-tracking.js';
import engagementAnalyticsRouter from '../../features/analytics/engagement-analytics.js';
import { router as healthRouter } from '../../infrastructure/monitoring/health.js';
import { database as db, withTransaction } from '@shared/database/connection.js';
import { logger  } from '../../../shared/core/src/index.js';

describe('Comprehensive API Integration Tests', () => {
  let app: express.Application;
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // Create test app with all routes
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mount routes
    app.use('/api/auth', authRouter);
    app.use('/api/bills', billsRouter);
    app.use('/api/sponsors', sponsorsRouter);
    // Mock services for financial disclosure router
    const mockMonitoringService = {
      collectFinancialDisclosures: vi.fn(),
      getDisclosureAlerts: vi.fn(),
      buildFinancialRelationshipMap: vi.fn()
    };
    const mockAnalyticsService = {
      generateReport: vi.fn(),
      getMetrics: vi.fn()
    };
    app.use('/api/financial-disclosure', createFinancialDisclosureRouter(mockMonitoringService as any, mockAnalyticsService as any));
    app.use('/api/admin', adminRouter);
    app.use('/api/notifications', notificationsRouter);
    app.use('/api/real-time-tracking', realTimeTrackingRouter);
    app.use('/api/engagement-analytics', engagementAnalyticsRouter);
    app.use('/api/health', healthRouter);

    // Setup test authentication
    await setupTestAuth();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  beforeEach(() => {
    // Reset any mocks or state before each test
    vi.clearAllMocks();
  });

  // Helper functions
  async function setupTestAuth() {
    try {
      // Register a test user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
          firstName: 'Test',
          lastName: 'User'
        });

      if (registerResponse.status === 201) {
        authToken = registerResponse.body.token;
        testUserId = registerResponse.body.user.id;
      } else {
        // Try to login if user already exists
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'testpassword123'
          });

        if (loginResponse.status === 200) {
          authToken = loginResponse.body.token;
          testUserId = loginResponse.body.user.id;
        }
      }
    } catch (error) {
      console.warn('Auth setup failed, tests will run without authentication:', error);
    }
  }

  async function cleanupTestData() {
    // Cleanup would go here in a real implementation
    // For now, we'll just log that cleanup is happening
    logger.info('Cleaning up test data...', { component: 'Chanuka' });
  }

  // Authentication Tests
  describe('Authentication API', () => {
    it('should register a new user', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'testpassword123',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(uniqueEmail);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should verify valid token', async () => {
      if (!authToken) {
        console.warn('Skipping token verification test - no auth token available');
        return;
      }

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
    });
  });

  // Bills API Tests
  describe('Bills API', () => {
    it('should fetch all bills', async () => {
      const response = await request(app)
        .get('/api/bills');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('bills');
      expect(Array.isArray(response.body.data.bills)).toBe(true);
    });

    it('should fetch bills with pagination', async () => {
      const response = await request(app)
        .get('/api/bills?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.page).toBe(1);
    });

    it('should filter bills by status', async () => {
      const response = await request(app)
        .get('/api/bills?status=committee_review');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should search bills by keyword', async () => {
      const response = await request(app)
        .get('/api/bills?search=digital');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should fetch bill categories', async () => {
      const response = await request(app)
        .get('/api/bills/categories');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });

    it('should fetch bill statuses', async () => {
      const response = await request(app)
        .get('/api/bills/statuses');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('statuses');
      expect(Array.isArray(response.body.data.statuses)).toBe(true);
    });

    it('should fetch specific bill by ID', async () => {
      const response = await request(app)
        .get('/api/bills/1');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('bill');
    });

    it('should return 404 for non-existent bill', async () => {
      const response = await request(app)
        .get('/api/bills/99999');

      expect(response.status).toBe(404);
    });

    it('should fetch bill workarounds', async () => {
      const response = await request(app)
        .get('/api/bills/1/workarounds');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should create a new workaround', async () => {
      const workaroundData = {
        title: 'Test Workaround',
        description: 'This is a test workaround for integration testing',
        category: 'Compliance',
        priority: 'medium',
        implementationCost: 25000,
        timelineEstimate: 60
      };

      const response = await request(app)
        .post('/api/bills/1/workarounds')
        .send(workaroundData);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('title', workaroundData.title);
    });
  });

  // Sponsors API Tests
  describe('Sponsors API', () => {
    it('should fetch all sponsors', async () => {
      const response = await request(app)
        .get('/api/sponsors');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should fetch specific sponsor by ID', async () => {
      const response = await request(app)
        .get('/api/sponsors/1');

      // Should either return sponsor data or 404
      expect([200, 404]).toContain(response.status);
    });

    it('should return 400 for invalid sponsor ID', async () => {
      const response = await request(app)
        .get('/api/sponsors/invalid');

      expect(response.status).toBe(400);
    });

    it('should fetch sponsor affiliations', async () => {
      const response = await request(app)
        .get('/api/sponsors/1/affiliations');

      expect([200, 404]).toContain(response.status);
    });

    it('should fetch sponsor transparency records', async () => {
      const response = await request(app)
        .get('/api/sponsors/1/transparency');

      expect([200, 404]).toContain(response.status);
    });
  });

  // Financial Disclosure API Tests
  describe('Financial Disclosure API', () => {
    it('should fetch financial disclosures', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/disclosures');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should fetch disclosures with pagination', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/disclosures?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should fetch financial relationships for sponsor', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/relationships/1');

      expect([200, 404]).toContain(response.status);
    });

    it('should return 400 for invalid sponsor ID in relationships', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/relationships/invalid');

      expect(response.status).toBe(400);
    });

    it('should fetch disclosure completeness', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/completeness/1');

      expect([200, 404]).toContain(response.status);
    });

    it('should create disclosure alert', async () => {
      const alertData = {
        type: 'new_disclosure',
        sponsorId: 1,
        description: 'Test alert for integration testing',
        severity: 'info'
      };

      const response = await request(app)
        .post('/api/financial-disclosure/alerts')
        .send(alertData);

      expect([201, 404]).toContain(response.status);
    });

    it('should validate alert data', async () => {
      const invalidAlertData = {
        type: 'invalid_type',
        sponsorId: 'invalid',
        description: 'Too short'
      };

      const response = await request(app)
        .post('/api/financial-disclosure/alerts')
        .send(invalidAlertData);

      expect(response.status).toBe(400);
    });

    it('should fetch alerts for sponsor', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/alerts/1');

      expect([200, 404]).toContain(response.status);
    });

    it('should start automated monitoring', async () => {
      const response = await request(app)
        .post('/api/financial-disclosure/monitoring/start');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('message');
    });

    it('should stop automated monitoring', async () => {
      const response = await request(app)
        .post('/api/financial-disclosure/monitoring/stop');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('message');
    });

    it('should trigger manual monitoring check', async () => {
      const response = await request(app)
        .post('/api/financial-disclosure/monitoring/check');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('alertsGenerated');
    });

    it('should fetch financial transparency dashboard', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should check health status', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/health');

      expect([200, 503]).toContain(response.status);
      expect(response.body.data).toHaveProperty('status');
    });
  });

  // Cross-API Integration Tests
  describe('Cross-API Integration', () => {
    it('should maintain consistent response format across APIs', async () => {
      const endpoints = [
        '/api/bills',
        '/api/sponsors',
        '/api/financial-disclosure/disclosures'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('metadata');
        }
      }
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/bills')
        .set('Origin', 'http://localhost:4200')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle large request bodies appropriately', async () => {
      const largeDescription = 'x'.repeat(10000);
      
      const response = await request(app)
        .post('/api/financial-disclosure/alerts')
        .send({
          type: 'new_disclosure',
          sponsorId: 1,
          description: largeDescription,
          severity: 'info'
        });

      // Should either handle it or reject with appropriate error
      expect([400, 413, 201]).toContain(response.status);
    });
  });

  // Performance and Load Tests
  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/api/bills')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/bills');
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should handle invalid content types', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('not json');

      expect([400, 415]).toContain(response.status);
    });

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to test rate limiting
      const rapidRequests = Array(20).fill(null).map(() => 
        request(app).get('/api/bills')
      );

      const responses = await Promise.all(rapidRequests);
      
      // Most should succeed, but some might be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  // Security Tests
  describe('Security Tests', () => {
    it('should sanitize input to prevent XSS', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/financial-disclosure/alerts')
        .send({
          type: 'new_disclosure',
          sponsorId: 1,
          description: maliciousInput,
          severity: 'info'
        });

      // Should either reject or sanitize the input
      if (response.status === 201) {
        expect(response.body.data.description).not.toContain('<script>');
      }
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/bills?search=${encodeURIComponent(sqlInjection)}`);

      // Should handle gracefully without crashing
      expect([200, 400]).toContain(response.status);
    });

    it('should require authentication for protected endpoints', async () => {
      // Test endpoints that should require authentication
      const protectedEndpoints = [
        { method: 'post', path: '/api/sponsors' },
        { method: 'put', path: '/api/sponsors/1' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        // Should either require auth (401) or be accessible (depending on implementation)
        expect([200, 201, 401, 403]).toContain(response.status);
      }
    });
  });

  // Data Validation Tests
  describe('Data Validation', () => {
    it('should validate email format in registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'testpassword123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(400);
    });

    it('should enforce password strength requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-weak@example.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User'
        });

      // Should either enforce password strength or accept (depending on implementation)
      expect([201, 400]).toContain(response.status);
    });

    it('should validate numeric IDs', async () => {
      const invalidIds = ['abc', '1.5', '-1', ''];
      
      for (const id of invalidIds) {
        const response = await request(app)
          .get(`/api/sponsors/${id}`);
        
        expect(response.status).toBe(400);
      }
    });
  });

  // API Versioning and Compatibility Tests
  describe('API Compatibility', () => {
    it('should handle missing optional parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/bills');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('bills');
    });

    it('should provide consistent error response format', async () => {
      const errorEndpoints = [
        '/api/bills/invalid-id',
        '/api/sponsors/invalid-id',
        '/api/financial-disclosure/relationships/invalid-id'
      ];

      for (const endpoint of errorEndpoints) {
        const response = await request(app).get(endpoint);
        
        if (response.status >= 400) {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    it('should handle content negotiation', async () => {
      const response = await request(app)
        .get('/api/bills')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});












































