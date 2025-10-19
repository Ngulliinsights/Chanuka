import { test, expect } from '@playwright/test';

// API Testing with Playwright - Migration from Jest + Supertest
test.describe('Authentication API', () => {
  const testUser = {
    email: `test-auth-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    name: 'Test User'
  };

  test.describe('User Registration', () => {
    test('should register a new user successfully', async ({ request }) => {
      const response = await request.post('/auth/register', {
        data: testUser
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.name).toBe(testUser.name);
      expect(data.user.password).toBeUndefined(); // Password should not be returned
    });

    test('should reject registration with weak password', async ({ request }) => {
      const weakPasswordUser = {
        ...testUser,
        email: `weak-${Date.now()}@example.com`,
        password: '123'
      };

      const response = await request.post('/auth/register', {
        data: weakPasswordUser
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('password');
    });

    test('should reject duplicate email registration', async ({ request }) => {
      // First registration
      await request.post('/auth/register', {
        data: {
          ...testUser,
          email: `duplicate-${Date.now()}@example.com`
        }
      });

      // Duplicate registration
      const response = await request.post('/auth/register', {
        data: {
          ...testUser,
          email: `duplicate-${Date.now()}@example.com`
        }
      });

      expect(response.status()).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });
  });

  test.describe('User Login', () => {
    let registeredUser: typeof testUser;

    test.beforeEach(async ({ request }) => {
      // Ensure user exists for login tests
      registeredUser = {
        ...testUser,
        email: `login-${Date.now()}@example.com`
      };
      
      await request.post('/auth/register', {
        data: registeredUser
      });
    });

    test('should login with valid credentials', async ({ request }) => {
      const response = await request.post('/auth/login', {
        data: {
          email: registeredUser.email,
          password: registeredUser.password
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe(registeredUser.email);
    });

    test('should reject login with invalid password', async ({ request }) => {
      const response = await request.post('/auth/login', {
        data: {
          email: registeredUser.email,
          password: 'wrongpassword'
        }
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid credentials');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should rate limit login attempts', async ({ request }) => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      const promises = Array.from({ length: 6 }, () =>
        request.post('/auth/login', { data: loginData })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});




































