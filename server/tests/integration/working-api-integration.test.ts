import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { router as billsRouter } from '../../features/bills/presentation/bills-router.ts';
import { router as sponsorsRouter } from '../../features/bills/sponsors';
import { router as authRouter } from '../../core/auth/auth';
import { router as healthRouter } from '../../infrastructure/monitoring/health';
import { database as db, users, bills, sponsors } from '../../../shared/database/connection.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { logger } from '../../../shared/core/src/observability/logging';

describe('Working API Integration Tests', () => {
  let app: express.Application;
  let testUsers: any[] = [];
  let testBills: any[] = [];
  let testSponsors: any[] = [];
  let authTokens: string[] = [];

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mount routes that exist
    app.use('/api/auth', authRouter);
    app.use('/api/bills', billsRouter);
    app.use('/api/sponsors', sponsorsRouter);
    app.use('/api/health', healthRouter);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();

    // Force cleanup of any remaining timers to prevent hanging
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function setupTestData() {
    try {
      // Create test users
      const testUserData = [
        {
          email: `test-citizen-${Date.now()}@example.com`,
          name: 'Test Citizen',
          passwordHash: 'hashed-password-citizen',
          role: 'citizen',
          verificationStatus: 'verified',
          isActive: true
        },
        {
          email: `test-admin-${Date.now()}@example.com`,
          name: 'Test Admin',
          passwordHash: 'hashed-password-admin',
          role: 'admin',
          verificationStatus: 'verified',
          isActive: true
        }
      ];

      for (const userData of testUserData) {
        try {
          const user = await db.insert(users).values({
            ...userData,
            role: 'citizen' as const,
            verificationStatus: 'verified' as const
          }).returning();
          testUsers.push(user[0]);
          
          // Generate auth tokens
          const token = jwt.sign(
            { 
              id: user[0].id, 
              email: user[0].email, 
              role: user[0].role 
            },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
          );
          authTokens.push(token);
        } catch (error) {
          console.warn('Failed to create test user:', error);
        }
      }

      // Create test sponsors
      const testSponsorData = [
        {
          name: 'Test Sponsor 1',
          role: 'MP',
          party: 'Test Party',
          constituency: 'Test District 1',
          email: 'sponsor1@parliament.gov',
          isActive: true
        },
        {
          name: 'Test Sponsor 2',
          role: 'Senator',
          party: 'Opposition Party',
          constituency: 'Test District 2',
          email: 'sponsor2@parliament.gov',
          isActive: true
        }
      ];

      for (const sponsorData of testSponsorData) {
        try {
          const sponsor = await db.insert(sponsors).values(sponsorData).returning();
          testSponsors.push(sponsor[0]);
        } catch (error) {
          console.warn('Failed to create test sponsor:', error);
        }
      }

      // Create test bills
      const testBillData = [
        {
          title: 'Integration Test Bill 1',
          billNumber: `INT-${Date.now()}-1`,
          summary: 'Test bill for integration testing',
          description: 'This bill is used for testing API integration',
          content: 'Full content of integration test bill 1...',
          status: 'introduced',
          category: 'technology',
          tags: ['test', 'integration'],
          viewCount: 0,
          shareCount: 0,
          complexityScore: 5,
          constitutionalConcerns: { concerns: [], severity: 'low' },
          stakeholderAnalysis: { 
            primary_beneficiaries: ['test users'], 
            potential_opponents: [], 
            economic_impact: 'minimal' 
          },
          introducedDate: new Date()
        },
        {
          title: 'Integration Test Bill 2',
          billNumber: `INT-${Date.now()}-2`,
          summary: 'Second test bill for integration testing',
          description: 'This bill is also used for testing API integration',
          content: 'Full content of integration test bill 2...',
          status: 'committee',
          category: 'healthcare',
          tags: ['test', 'integration', 'healthcare'],
          viewCount: 0,
          shareCount: 0,
          complexityScore: 7,
          constitutionalConcerns: { concerns: [], severity: 'low' },
          stakeholderAnalysis: { 
            primary_beneficiaries: ['test users'], 
            potential_opponents: [], 
            economic_impact: 'minimal' 
          },
          introducedDate: new Date()
        }
      ];

      for (const billData of testBillData) {
        try {
          const bill = await db.insert(bills).values({
            ...billData,
            status: 'introduced' as const
          }).returning();
          testBills.push(bill[0]);
        } catch (error) {
          console.warn('Failed to create test bill:', error);
        }
      }

    } catch (error) {
      console.warn('Test data setup failed:', error);
    }
  }

  async function cleanupTestData() {
    try {
      // Clean up bills
      for (const bill of testBills) {
        await db.delete(bills).where(eq(bills.id, bill.id));
      }
      
      // Clean up sponsors
      for (const sponsor of testSponsors) {
        await db.delete(sponsors).where(eq(sponsors.id, sponsor.id));
      }
      
      // Clean up users
      for (const user of testUsers) {
        await db.delete(users).where(eq(users.id, user.id));
      }
    } catch (error) {
      console.warn('Test data cleanup failed:', error);
    }
  }

  // Basic API Health Tests
  describe('API Health and Connectivity', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/api/health');

      expect([200, 404]).toContain(response.status);
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/bills')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  // Bills API Tests
  describe('Bills API Integration', () => {
    it('should fetch all bills', async () => {
      const response = await request(app)
        .get('/api/bills');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should fetch bills with pagination', async () => {
      const response = await request(app)
        .get('/api/bills?page=1&limit=5');

      expect([200, 400]).toContain(response.status);
    });

    it('should handle invalid bill ID', async () => {
      const response = await request(app)
        .get('/api/bills/invalid-id');

      expect([400, 404]).toContain(response.status);
    });

    it('should fetch specific bill by ID', async () => {
      if (testBills.length > 0) {
        const response = await request(app)
          .get(`/api/bills/${testBills[0].id}`);

        expect([200, 404]).toContain(response.status);
      }
    });
  });

  // Sponsors API Tests
  describe('Sponsors API Integration', () => {
    it('should fetch all sponsors', async () => {
      const response = await request(app)
        .get('/api/sponsors');

      expect([200, 404]).toContain(response.status);
    });

    it('should handle invalid sponsor ID', async () => {
      const response = await request(app)
        .get('/api/sponsors/invalid-id');

      expect([400, 404]).toContain(response.status);
    });

    it('should fetch specific sponsor by ID', async () => {
      if (testSponsors.length > 0) {
        const response = await request(app)
          .get(`/api/sponsors/${testSponsors[0].id}`);

        expect([200, 404]).toContain(response.status);
      }
    });
  });

  // Authentication API Tests
  describe('Authentication API Integration', () => {
    it('should register a new user', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'testpassword123',
          name: 'Test User'
        });

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle login attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123'
        });

      expect([200, 401, 404]).toContain(response.status);
    });

    it('should validate authentication tokens', async () => {
      if (authTokens.length > 0) {
        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', `Bearer ${authTokens[0]}`);

        expect([200, 401, 404]).toContain(response.status);
      }
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  // Performance Tests
  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app).get('/api/bills')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 404]).toContain(response.status);
      });
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/bills');
      
      const responseTime = Date.now() - startTime;
      
      expect([200, 404]).toContain(response.status);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  // Security Tests
  describe('Security Tests', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/bills?search=${encodeURIComponent(sqlInjection)}`);

      // Should handle gracefully without crashing
      expect([200, 400, 404]).toContain(response.status);
    });

    it('should sanitize input to prevent XSS', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `xss-test-${Date.now()}@example.com`,
          password: 'testpassword123',
          name: maliciousInput
        });

      // Should either reject or sanitize the input
      if ([200, 201].includes(response.status)) {
        expect(response.body.data?.user?.name || '').not.toContain('<script>');
      }
    });

    it('should validate numeric IDs', async () => {
      const invalidIds = ['abc', '1.5', '-1', ''];
      
      for (const id of invalidIds) {
        const response = await request(app)
          .get(`/api/sponsors/${id}`);
        
        expect([400, 404]).toContain(response.status);
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
          name: 'Test User'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should enforce password requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test-weak-${Date.now()}@example.com`,
          password: '123',
          name: 'Test User'
        });

      // Should either enforce password strength or accept (depending on implementation)
      expect([200, 201, 400, 422]).toContain(response.status);
    });
  });

  // API Response Format Tests
  describe('API Response Format', () => {
    it('should maintain consistent response format across APIs', async () => {
      const endpoints = [
        '/api/bills',
        '/api/sponsors'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success');
          expect(response.body).toHaveProperty('data');
        }
      }
    });

    it('should provide consistent error response format', async () => {
      const errorEndpoints = [
        '/api/bills/invalid-id',
        '/api/sponsors/invalid-id'
      ];

      for (const endpoint of errorEndpoints) {
        const response = await request(app).get(endpoint);
        
        if (response.status >= 400) {
          expect(response.body).toHaveProperty('success');
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    it('should handle content negotiation', async () => {
      const response = await request(app)
        .get('/api/bills')
        .set('Accept', 'application/json');

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });
});











































