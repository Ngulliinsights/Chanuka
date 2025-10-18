import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { authService } from '../core/auth/auth-service';
import { getEmailService } from '../infrastructure/notifications/email-service';
import { database as db, users, sessions, passwordResets } from '../../shared/database/connection.js';
import { eq } from 'drizzle-orm';
import { router as authRouter } from '../core/auth/auth.js';
import { logger } from '../../shared/core/src/utils/logger';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Authentication System', () => {
  const testUser = {
    email: `test-auth-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  let userToken: string;
  let refreshToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await db.delete(users).where(eq(users.email, testUser.email));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Final cleanup
    try {
      await db.delete(users).where(eq(users.email, testUser.email));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.firstName).toBe(testUser.firstName);
      expect(response.body.data.user.lastName).toBe(testUser.lastName);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.requiresVerification).toBe(true);

      // Store tokens for later tests
      userToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
      userId = response.body.data.user.id;
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordUser = {
        ...testUser,
        email: `weak-${testUser.email}`,
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password must be at least 12 characters');
    });

    it('should reject registration with invalid email', async () => {
      const invalidEmailUser = {
        ...testUser,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid email format');
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Attempt duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User with this email already exists');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Ensure user exists for login tests
      if (!userId) {
        const registerResponse = await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        userToken = registerResponse.body.data.token;
        refreshToken = registerResponse.body.data.refreshToken;
        userId = registerResponse.body.data.user.id;
      }
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Token Verification', () => {
    beforeEach(async () => {
      if (!userToken) {
        const registerResponse = await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        userToken = registerResponse.body.data.token;
        refreshToken = registerResponse.body.data.refreshToken;
        userId = registerResponse.body.data.user.id;
      }
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('Token Refresh', () => {
    beforeEach(async () => {
      if (!refreshToken) {
        const registerResponse = await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        userToken = registerResponse.body.data.token;
        refreshToken = registerResponse.body.data.refreshToken;
        userId = registerResponse.body.data.user.id;
      }
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();

      // Update tokens for subsequent tests
      userToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Password Reset', () => {
    beforeEach(async () => {
      if (!userId) {
        const registerResponse = await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        userId = registerResponse.body.data.user.id;
      }
    });

    it('should request password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('password reset link has been sent');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not reveal whether email exists or not
      expect(response.body.data.message).toContain('password reset link has been sent');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid email format');
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      if (!userToken) {
        const registerResponse = await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        userToken = registerResponse.body.data.token;
      }
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should handle logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData);

        if (i < 5) {
          expect(response.status).toBe(401);
        } else {
          // 6th attempt should be rate limited
          expect(response.status).toBe(429);
          expect(response.body.error).toContain('Too many authentication attempts');
        }
      }
    }, 10000); // Increase timeout for rate limiting test
  });
});

describe('AuthService Unit Tests', () => {
  const testUser = {
    email: `unit-test-${Date.now()}@example.com`,
    password: 'UnitTestPassword123!',
    firstName: 'Unit',
    lastName: 'Test',
    role: 'citizen' as const
  };

  afterAll(async () => {
    // Cleanup
    try {
      await db.delete(users).where(eq(users.email, testUser.email));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Registration', () => {
    it('should register user with valid data', async () => {
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any;
      const result = await authService.register(testUser, mockReq);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.email).toBe(testUser.email);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.requiresVerification).toBe(true);
    });

    it('should reject duplicate email', async () => {
      // First registration
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any;
      await authService.register(testUser, mockReq);

      // Attempt duplicate
      const result = await authService.register(testUser, mockReq);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User with this email already exists');
    });
  });

  describe('Login', () => {
    beforeAll(async () => {
      // Ensure user exists
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any;
      await authService.register({
        ...testUser,
        email: `login-test-${Date.now()}@example.com`
      }, mockReq);
    });

    it('should login with valid credentials', async () => {
      const loginEmail = `login-test-${Date.now()}@example.com`;
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any;
      await authService.register({
        ...testUser,
        email: loginEmail
      }, mockReq);

      const result = await authService.login({
        email: loginEmail,
        password: testUser.password
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const result = await authService.login({
        email: testUser.email,
        password: 'wrongpassword'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Token Operations', () => {
    let token: string;
    let refreshToken: string;

    beforeAll(async () => {
      const email = `token-test-${Date.now()}@example.com`;
      const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any;
      const registerResult = await authService.register({
        ...testUser,
        email
      }, mockReq);

      token = registerResult.token!;
      refreshToken = registerResult.refreshToken!;
    });

    it('should verify valid token', async () => {
      const result = await authService.verifyToken(token);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should refresh token', async () => {
      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should logout and invalidate session', async () => {
      const result = await authService.logout(token);

      expect(result.success).toBe(true);

      // Token should now be invalid
      const verifyResult = await authService.verifyToken(token);
      expect(verifyResult.success).toBe(false);
    });
  });
});






