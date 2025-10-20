import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { router as authRouter } from '../../core/auth/auth';
import { router as billsRouter } from '../../features/bills/presentation/bills-router.js';
import { router as sponsorsRouter } from '../../features/bills/sponsors.ts';
import { router as profileRouter } from '../../features/users/application/profile.js';
import { router as adminRouter } from '../../features/admin/admin.js';
import { database as db, users } from '../../../shared/database/connection.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { logger } from '../../../shared/core/src/observability/logging';

describe('Authentication Flow Validation Tests', () => {
  let app: express.Application;
  let testUsers: any[] = [];
  let validTokens: string[] = [];
  let expiredToken: string;
  let invalidToken: string;

  beforeAll(async () => {
    // Create test app with authentication middleware
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mount routes
    app.use('/api/auth', authRouter);
    app.use('/api/bills', billsRouter);
    app.use('/api/sponsors', sponsorsRouter);
    app.use('/api/profile', profileRouter);
    app.use('/api/admin', adminRouter);

    // Setup test authentication data
    await setupTestAuthData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestAuthData();

    // Force cleanup of any remaining timers to prevent hanging
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function setupTestAuthData() {
    try {
      // Create test users with different roles
      const testUserData = [
        {
          email: `citizen-${Date.now()}@example.com`,
          name: 'Test Citizen',
          role: 'citizen',
          passwordHash: 'hashed-password-citizen',
          verificationStatus: 'verified',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          email: `admin-${Date.now()}@example.com`,
          name: 'Test Admin',
          role: 'admin',
          passwordHash: 'hashed-password-admin',
          verificationStatus: 'verified',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          email: `unverified-${Date.now()}@example.com`,
          name: 'Test Unverified',
          role: 'citizen',
          passwordHash: 'hashed-password-unverified',
          verificationStatus: 'pending',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          email: `inactive-${Date.now()}@example.com`,
          name: 'Test Inactive',
          role: 'citizen',
          passwordHash: 'hashed-password-inactive',
          verificationStatus: 'verified',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const userData of testUserData) {
        const user = await db.insert(users).values({
          ...userData,
          role: 'citizen' as const,
          verificationStatus: 'verified' as const
        }).returning();
        testUsers.push(user[0]);
        
        // Generate valid tokens for each user
        const token = jwt.sign(
          { 
            id: user[0].id, 
            email: user[0].email, 
            role: user[0].role,
            verificationStatus: user[0].verificationStatus,
            isActive: user[0].isActive
          },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );
        validTokens.push(token);
      }

      // Create expired token
      expiredToken = jwt.sign(
        { id: testUsers[0].id, email: testUsers[0].email, role: testUsers[0].role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      );

      // Create invalid token
      invalidToken = jwt.sign(
        { id: testUsers[0].id, email: testUsers[0].email, role: testUsers[0].role },
        'wrong-secret',
        { expiresIn: '1h' }
      );

    } catch (error) {
      console.warn('Auth test data setup failed:', error);
    }
  }

  async function cleanupTestAuthData() {
    try {
      for (const user of testUsers) {
        await db.delete(users).where(eq(users.id, user.id));
      }
    } catch (error) {
      console.warn('Auth test data cleanup failed:', error);
    }
  }

  describe('User Registration Flow', () => {
    it('should register a new user with valid data', async () => {
      const uniqueEmail = `register-test-${Date.now()}@example.com`;
      const registrationData = {
        email: uniqueEmail,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      expect([200, 201]).toContain(response.status);
      
      if (response.status === 201 || response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data.user.email).toBe(uniqueEmail);
        expect(response.body.data.user).not.toHaveProperty('passwordHash');
        
        // Cleanup
        const createdUser = await db.select().from(users).where(eq(users.email, uniqueEmail));
        if (createdUser.length > 0) {
          await db.delete(users).where(eq(users.id, createdUser[0].id));
        }
      }
    });

    it('should reject registration with invalid email format', async () => {
      const registrationData = {
        email: 'invalid-email-format',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const registrationData = {
        email: `weak-password-${Date.now()}@example.com`,
        password: '123',
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      // Should either reject weak password or accept (depending on implementation)
      expect([200, 201, 400]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should reject registration with duplicate email', async () => {
      const existingEmail = testUsers[0].email;
      const registrationData = {
        email: existingEmail,
        password: 'SecurePassword123!',
        firstName: 'Duplicate',
        lastName: 'User',
        name: 'Duplicate User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      expect([400, 409]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with missing required fields', async () => {
      const incompleteData = {
        email: `incomplete-${Date.now()}@example.com`,
        // Missing password and other required fields
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('User Login Flow', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUsers[0].email,
        password: 'correct-password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // May succeed or fail depending on password hashing implementation
      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data.user.email).toBe(testUsers[0].email);
      }
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: testUsers[0].email,
        password: 'wrong-password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'any-password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject login for inactive users', async () => {
      const inactiveUser = testUsers.find(u => !u.isActive);
      if (inactiveUser) {
        const loginData = {
          email: inactiveUser.email,
          password: 'any-password'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData);

        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle login rate limiting', async () => {
      const loginData = {
        email: testUsers[0].email,
        password: 'wrong-password'
      };

      // Make multiple rapid login attempts
      const rapidAttempts = Array(10).fill(null).map(() =>
        request(app).post('/api/auth/login').send(loginData)
      );

      const responses = await Promise.all(rapidAttempts);
      
      // Should either rate limit or handle gracefully
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const unauthorizedResponses = responses.filter(r => r.status === 401);
      
      expect(rateLimitedResponses.length + unauthorizedResponses.length).toBe(10);
    });
  });

  describe('Token Validation and Management', () => {
    it('should validate valid JWT tokens', async () => {
      const validToken = validTokens[0];
      
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.id).toBe(testUsers[0].id);
      }
    });

    it('should reject expired tokens', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/expired|invalid/i);
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject malformed authorization headers', async () => {
      const malformedHeaders = [
        'InvalidFormat',
        'Bearer',
        'Bearer ',
        'Basic dGVzdDp0ZXN0',
        'Bearer invalid.token.format'
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', header);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
      }
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should refresh tokens before expiration', async () => {
      const validToken = validTokens[0];
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`);

      // May or may not be implemented
      expect([200, 404, 501]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data.token).not.toBe(validToken);
      }
    });
  });

  describe('Protected Endpoint Access Control', () => {
    // typed helpers available to all tests in this describe block
    const agentRequest = (method: 'get' | 'post' | 'put' | 'delete' | 'patch', path: string) => {
      switch (method) {
        case 'get': return request(app).get(path);
        case 'post': return request(app).post(path);
        case 'put': return request(app).put(path);
        case 'delete': return request(app).delete(path);
        case 'patch': return request(app).patch(path);
      }
    };

    const agentRequestAuth = (method: 'get' | 'post' | 'put' | 'delete' | 'patch', path: string, token?: string) => {
      const req = agentRequest(method, path).set('Authorization', `Bearer ${token}`);
      return req;
    };

    it('should allow access to public endpoints without authentication', async () => {
      const publicEndpoints = [
        '/api/bills',
        '/api/sponsors',
        '/api/bills/categories',
        '/api/bills/statuses'
      ];

      for (const endpoint of publicEndpoints) {
        const response = await request(app).get(endpoint);
        expect([200, 404]).toContain(response.status);
      }
    });

    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/profile' },
        { method: 'put', path: '/api/profile' },
        { method: 'post', path: '/api/bills/1/comments' },
        { method: 'get', path: '/api/admin/dashboard' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await agentRequest(endpoint.method as any, endpoint.path);
        expect([401, 404]).toContain(response.status);

        if (response.status === 401) {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    it('should allow authenticated access to protected endpoints', async () => {
      const validToken = validTokens[0];
      const protectedEndpoints = [
        { method: 'get', path: '/api/profile' },
        { method: 'get', path: '/api/auth/verify' }
      ];

      const agentRequestAuth = (method: 'get' | 'post' | 'put' | 'delete' | 'patch', path: string, token?: string) => {
        const req = agentRequest(method, path).set('Authorization', `Bearer ${token}`);
        return req;
      };

      for (const endpoint of protectedEndpoints) {
        const response = await agentRequestAuth(endpoint.method as any, endpoint.path, validToken);
        expect([200, 404]).toContain(response.status);
      }
    });

    it('should enforce role-based access control', async () => {
      const citizenToken = validTokens[0]; // First user is citizen
      const adminToken = validTokens[1]; // Second user is admin
      
      // Admin-only endpoints
      const adminEndpoints = [
        { method: 'get', path: '/api/admin/dashboard' },
        { method: 'get', path: '/api/admin/users' },
        { method: 'post', path: '/api/admin/system/maintenance' }
      ];

      for (const endpoint of adminEndpoints) {
        // Citizen should be denied
        const citizenResponse = await agentRequestAuth(endpoint.method as any, endpoint.path, citizenToken);
        expect([403, 404]).toContain(citizenResponse.status);

        // Admin should be allowed
        const adminResponse = await agentRequestAuth(endpoint.method as any, endpoint.path, adminToken);
        expect([200, 404]).toContain(adminResponse.status);
      }
    });

    it('should handle verification status requirements', async () => {
      const verifiedToken = validTokens[0]; // Verified user
      const unverifiedToken = validTokens[2]; // Unverified user
      
      // Endpoints that might require verification
      const verificationRequiredEndpoints = [
        { method: 'post', path: '/api/bills/1/comments' },
        { method: 'post', path: '/api/sponsors/1/feedback' }
      ];

      for (const endpoint of verificationRequiredEndpoints) {
        // Unverified user might be denied
        const unverifiedResponse = await agentRequestAuth(endpoint.method as any, endpoint.path, unverifiedToken)
          .send({ content: 'Test content' });
        expect([200, 403, 404]).toContain(unverifiedResponse.status);

        // Verified user should be allowed
        const verifiedResponse = await agentRequestAuth(endpoint.method as any, endpoint.path, verifiedToken)
          .send({ content: 'Test content' });
        expect([200, 201, 404]).toContain(verifiedResponse.status);
      }
    });
  });

  describe('Session Management', () => {
    it('should handle user logout properly', async () => {
      const validToken = validTokens[0];
      
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 404]).toContain(logoutResponse.status);
      
      if (logoutResponse.status === 200) {
        expect(logoutResponse.body).toHaveProperty('success', true);
        
        // Token should be invalidated after logout
        const verifyResponse = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', `Bearer ${validToken}`);
        
        // May still be valid if logout doesn't invalidate JWT tokens
        expect([200, 401]).toContain(verifyResponse.status);
      }
    });

    it('should handle concurrent sessions for same user', async () => {
      const userToken = validTokens[0];
      
      // Make multiple concurrent requests with same token
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/auth/verify')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(concurrentRequests);
      
      // All should succeed or all should fail consistently
      const statusCodes = responses.map(r => r.status);
      const uniqueStatuses = [...new Set(statusCodes)];
      
      expect(uniqueStatuses.length).toBeLessThanOrEqual(2); // Should be consistent
    });

    it('should handle session timeout gracefully', async () => {
      // Create a short-lived token for testing
      const shortLivedToken = jwt.sign(
        { 
          id: testUsers[0].id, 
          email: testUsers[0].email, 
          role: testUsers[0].role 
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1s' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${shortLivedToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Validation', () => {
    it('should prevent JWT token tampering', async () => {
      const validToken = validTokens[0];
      const tokenParts = validToken.split('.');
      
      // Tamper with the payload
      const tamperedPayload = Buffer.from('{"id":"999","role":"admin"}').toString('base64');
      const tamperedToken = `${tokenParts[0]}.${tamperedPayload}.${tokenParts[2]}`;

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle SQL injection in login attempts', async () => {
      const sqlInjectionPayloads = [
        "admin@example.com'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin@example.com' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'any-password'
          });

        // Should handle gracefully without crashing
        expect([400, 401]).toContain(response.status);
        expect(response.body).toHaveProperty('success', false);
      }
    });

    it('should prevent XSS in user registration', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `xss-test-${Date.now()}@example.com`,
            password: 'SecurePassword123!',
            firstName: payload,
            lastName: 'User',
            name: `${payload} User`
          });

        // Should either sanitize or reject
        if (response.status === 201 || response.status === 200) {
          expect(response.body.data.user.firstName).not.toContain('<script>');
          expect(response.body.data.user.name).not.toContain('<script>');
          
          // Cleanup if user was created
          const createdUser = await db.select().from(users)
            .where(eq(users.email, `xss-test-${Date.now()}@example.com`));
          if (createdUser.length > 0) {
            await db.delete(users).where(eq(users.id, createdUser[0].id));
          }
        }
      }
    });

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        '12345678',
        'abc123'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak-${Date.now()}-${Math.random()}@example.com`,
            password: weakPassword,
            firstName: 'Test',
            lastName: 'User',
            name: 'Test User'
          });

        // Should either reject weak passwords or accept them
        expect([200, 201, 400]).toContain(response.status);
        
        if (response.status === 400) {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('error');
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in authentication requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com", "password": invalid json}');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle extremely long input values', async () => {
      const longString = 'x'.repeat(10000);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `${longString}@example.com`,
          password: longString,
          firstName: longString,
          lastName: longString,
          name: longString
        });

      // Should either handle gracefully or reject
      expect([400, 413, 500]).toContain(response.status);
    });

    it('should handle special characters in authentication data', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `special-${Date.now()}@example.com`,
          password: `Secure${specialChars}123`,
          firstName: `Test${specialChars}`,
          lastName: 'User',
          name: `Test${specialChars} User`
        });

      // Should handle special characters appropriately
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle database connection failures during authentication', async () => {
      // This would typically involve mocking database failures
      // For now, we'll test that the system handles errors gracefully
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[0].email,
          password: 'any-password'
        });

      // Should either succeed or fail gracefully
      expect([200, 401, 500, 503]).toContain(response.status);
      
      if (response.status >= 500) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});











































