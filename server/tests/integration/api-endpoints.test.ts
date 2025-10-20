import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index';
import { databaseService } from '../../infrastructure/database/database-service.js';
import { logger } from '../../../shared/core/src/observability/logging';

describe('API Endpoints Integration Tests', () => {
  let server: any;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0); // Use random port for testing
    
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Close server and database connections
    if (server) {
      server.close();
    }
    await databaseService.close();
  });

  beforeEach(async () => {
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'SecureTestPass123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'citizen'
      });

    if (registerResponse.status === 200 || registerResponse.status === 201) {
      authToken = registerResponse.body.data?.token || '';
      testUserId = registerResponse.body.data?.user?.id || '';
    }
  });

  afterEach(async () => {
    // Cleanup test data
    if (authToken) {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);
    }
  });

  describe('Authentication Endpoints', () => {
    it('should register a new user', async () => {
      const userData = {
        email: `newuser-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        role: 'citizen'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should login with valid credentials', async () => {
      // First register a user
      const userData = {
        email: `logintest-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Login',
        lastName: 'Test',
        role: 'citizen'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Then login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect('Content-Type', /json/);

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('user');
      expect(loginResponse.body.data).toHaveProperty('token');
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect('Content-Type', /json/);

      expect([400, 401]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should get current user with valid token', async () => {
      if (!authToken) {
        throw new Error('No auth token available for test');
      }

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should logout successfully', async () => {
      if (!authToken) {
        throw new Error('No auth token available for test');
      }

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Bills Endpoints', () => {
    it('should get bills list', async () => {
      const response = await request(app)
        .get('/api/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should get bills with pagination', async () => {
      const response = await request(app)
        .get('/api/bills?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should filter bills by status', async () => {
      const response = await request(app)
        .get('/api/bills?status=introduced')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Check that all returned bills have the requested status
      if (response.body.data.length > 0) {
        response.body.data.forEach((bill: any) => {
          expect(bill.status).toBe('introduced');
        });
      }
    });

    it('should search bills by title', async () => {
      const response = await request(app)
        .get('/api/bills/search?q=privacy')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should get single bill by ID', async () => {
      // First get a list of bills to get a valid ID
      const billsResponse = await request(app)
        .get('/api/bills?limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      if (billsResponse.body.data.length > 0) {
        const billId = billsResponse.body.data[0].id;

        const response = await request(app)
          .get(`/api/bills/${billId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id', billId);
      }
    });

    it('should return 404 for non-existent bill', async () => {
      const response = await request(app)
        .get('/api/bills/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication for bills access', async () => {
      const response = await request(app)
        .get('/api/bills')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Sponsors Endpoints', () => {
    it('should get sponsors list', async () => {
      const response = await request(app)
        .get('/api/sponsors')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should get single sponsor by ID', async () => {
      // First get a list of sponsors to get a valid ID
      const sponsorsResponse = await request(app)
        .get('/api/sponsors?limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      if (sponsorsResponse.body.data.length > 0) {
        const sponsorId = sponsorsResponse.body.data[0].id;

        const response = await request(app)
          .get(`/api/sponsors/${sponsorId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id', sponsorId);
      }
    });

    it('should filter sponsors by party', async () => {
      const response = await request(app)
        .get('/api/sponsors?party=Liberal')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Check that all returned sponsors have the requested party
      if (response.body.data.length > 0) {
        response.body.data.forEach((sponsor: any) => {
          expect(sponsor.party).toContain('Liberal');
        });
      }
    });
  });

  describe('Comments Endpoints', () => {
    let testBillId: string;

    beforeEach(async () => {
      // Get a bill ID for comment testing
      const billsResponse = await request(app)
        .get('/api/bills?limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      if (billsResponse.body.data.length > 0) {
        testBillId = billsResponse.body.data[0].id;
      }
    });

    it('should create a comment on a bill', async () => {
      if (!testBillId) {
        logger.info('Skipping comment test - no bills available', { component: 'Chanuka' });
        return;
      }

      const commentData = {
        content: 'This is a test comment about the bill.',
        billId: testBillId
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.content).toBe(commentData.content);
    });

    it('should get comments for a bill', async () => {
      if (!testBillId) {
        logger.info('Skipping comment test - no bills available', { component: 'Chanuka' });
        return;
      }

      const response = await request(app)
        .get(`/api/bills/${testBillId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should reject empty comments', async () => {
      if (!testBillId) {
        logger.info('Skipping comment test - no bills available', { component: 'Chanuka' });
        return;
      }

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '',
          billId: testBillId
        })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Analytics Endpoints', () => {
    it('should get dashboard analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalBills');
      expect(response.body.data).toHaveProperty('totalSponsors');
    });

    it('should get bill engagement analytics', async () => {
      // Get a bill ID first
      const billsResponse = await request(app)
        .get('/api/bills?limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      if (billsResponse.body.data.length > 0) {
        const billId = billsResponse.body.data[0].id;

        const response = await request(app)
          .get(`/api/analytics/bills/${billId}/engagement`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('views');
        expect(response.body.data).toHaveProperty('comments');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing required fields
        })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid email formats', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'citizen'
        })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should handle weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `weakpass-${Date.now()}@example.com`,
          password: '123', // Weak password
          firstName: 'Test',
          lastName: 'User',
          role: 'citizen'
        })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting for authentication endpoints', async () => {
      const requests: Promise<any>[] = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/bills')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include database status in health check', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('connected');
    });
  });
});

// Custom Jest matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});











































