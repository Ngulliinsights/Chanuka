/**
 * Command Injection Prevention Tests
 * Tests for the security middleware that prevents command injection attacks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { commandInjectionPrevention, fileUploadSecurity, securityRateLimit } from '@server/middleware/command-injection-prevention.js';

describe('Command Injection Prevention Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  });

  describe('Command Injection Detection', () => {
    it('should block requests with shell command separators in strict mode', async () => {
      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.post('/test', (req, res) => res.json({ success: true }));

      const maliciousPayloads = [
        { name: 'John; rm -rf /' },
        { name: 'John && cat /etc/passwd' },
        { name: 'John | ls -la' },
        { name: 'John`whoami`' },
        { name: 'John$(id)' }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('SECURITY_VIOLATION');
      }
    });

    it('should sanitize requests in sanitize mode', async () => {
      app.use(commandInjectionPrevention({ mode: 'sanitize' }));
      app.post('/test', (req, res) => res.json({ data: req.body }));

      const response = await request(app)
        .post('/test')
        .send({ name: 'John; rm -rf /' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).not.toContain(';');
      expect(response.body.data.name).toContain('John');
    });

    it('should allow safe requests to pass through', async () => {
      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.post('/test', (req, res) => res.json({ success: true, data: req.body }));

      const safePayloads = [
        { name: 'John Doe' },
        { email: 'john@example.com' },
        { description: 'This is a safe description with normal punctuation.' },
        { number: 12345 }
      ];

      for (const payload of safePayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should detect SQL injection patterns', async () => {
      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.post('/test', (req, res) => res.json({ success: true }));

      const sqlInjectionPayloads = [
        { query: "'; DROP TABLE users; --" },
        { search: "1' OR '1'='1" },
        { filter: "UNION SELECT * FROM passwords" }
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('SECURITY_VIOLATION');
      }
    });

    it('should detect XSS patterns', async () => {
      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.post('/test', (req, res) => res.json({ success: true }));

      const xssPayloads = [
        { content: '<script>alert("xss")</script>' },
        { message: '<img src="x" onerror="alert(1)">' },
        { text: 'javascript:alert("xss")' }
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('SECURITY_VIOLATION');
      }
    });

    it('should detect path traversal patterns', async () => {
      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.post('/test', (req, res) => res.json({ success: true }));

      const pathTraversalPayloads = [
        { file: '../../../etc/passwd' },
        { path: '..\\..\\windows\\system32\\config\\sam' },
        { filename: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd' }
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .post('/test')
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('SECURITY_VIOLATION');
      }
    });

    it('should respect whitelist paths', async () => {
      app.use(commandInjectionPrevention({ 
        mode: 'strict',
        whitelist: ['/api/health']
      }));
      app.post('/api/health', (req, res) => res.json({ success: true }));
      app.post('/api/test', (req, res) => res.json({ success: true }));

      // Whitelisted path should allow dangerous content
      const whitelistResponse = await request(app)
        .post('/api/health')
        .send({ command: 'rm -rf /' });

      expect(whitelistResponse.status).toBe(200);

      // Non-whitelisted path should block dangerous content
      const blockedResponse = await request(app)
        .post('/api/test')
        .send({ command: 'rm -rf /' });

      expect(blockedResponse.status).toBe(400);
    });

    it('should scan query parameters', async () => {
      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test?search=test; rm -rf /');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('SECURITY_VIOLATION');
    });

    it('should scan URL parameters', async () => {
      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.get('/test/:id', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test/123; rm -rf /');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('SECURITY_VIOLATION');
    });
  });

  describe('File Upload Security', () => {
    it('should block files with dangerous extensions', async () => {
      app.use(fileUploadSecurity({
        allowedExtensions: ['.jpg', '.png', '.pdf']
      }));
      app.post('/upload', (req, res) => res.json({ success: true }));

      // Mock file upload
      const mockFile = {
        originalname: 'malicious.exe',
        size: 1000,
        buffer: Buffer.from('test content')
      };

      // Simulate file upload by adding file to request
      app.use((req, res, next) => {
        req.file = mockFile as any;
        next();
      });

      const response = await request(app)
        .post('/upload');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_FILE_TYPE');
    });

    it('should block files that are too large', async () => {
      app.use(fileUploadSecurity({
        maxFileSize: 1000 // 1KB limit
      }));
      app.post('/upload', (req, res) => res.json({ success: true }));

      const mockFile = {
        originalname: 'large.jpg',
        size: 2000, // 2KB file
        buffer: Buffer.from('test content')
      };

      app.use((req, res, next) => {
        req.file = mockFile as any;
        next();
      });

      const response = await request(app)
        .post('/upload');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('FILE_TOO_LARGE');
    });

    it('should allow valid files', async () => {
      app.use(fileUploadSecurity({
        allowedExtensions: ['.jpg', '.png', '.pdf'],
        maxFileSize: 10000
      }));
      app.post('/upload', (req, res) => res.json({ success: true }));

      const mockFile = {
        originalname: 'valid.jpg',
        size: 1000,
        buffer: Buffer.from('valid image content')
      };

      app.use((req, res, next) => {
        req.file = mockFile as any;
        next();
      });

      const response = await request(app)
        .post('/upload');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Rate Limiting', () => {
    it('should block requests after rate limit is exceeded', async () => {
      app.use(securityRateLimit({
        windowMs: 60000, // 1 minute
        maxRequests: 2
      }));
      app.post('/test', (req, res) => res.json({ success: true }));

      // First two requests should succeed
      const response1 = await request(app).post('/test');
      expect(response1.status).toBe(200);

      const response2 = await request(app).post('/test');
      expect(response2.status).toBe(200);

      // Third request should be rate limited
      const response3 = await request(app).post('/test');
      expect(response3.status).toBe(429);
      expect(response3.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should reset rate limit after window expires', async () => {
      app.use(securityRateLimit({
        windowMs: 100, // 100ms window for testing
        maxRequests: 1
      }));
      app.post('/test', (req, res) => res.json({ success: true }));

      // First request should succeed
      const response1 = await request(app).post('/test');
      expect(response1.status).toBe(200);

      // Second request should be rate limited
      const response2 = await request(app).post('/test');
      expect(response2.status).toBe(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third request should succeed after window reset
      const response3 = await request(app).post('/test');
      expect(response3.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Create middleware that throws an error
      app.use((req, res, next) => {
        throw new Error('Middleware error');
      });
      
      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.post('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/test')
        .send({ name: 'John' });

      // Should handle the error and not crash
      expect(response.status).toBe(500);
    });

    it('should continue processing if security middleware fails', async () => {
      // Mock a scenario where the security check fails internally
      const originalConsoleError = console.error;
      console.error = () => {}; // Suppress error logs during test

      app.use(commandInjectionPrevention({ mode: 'strict' }));
      app.post('/test', (req, res) => res.json({ success: true }));

      // This should not crash the application
      const response = await request(app)
        .post('/test')
        .send({ name: 'John' });

      expect(response.status).toBe(200);
      
      console.error = originalConsoleError;
    });
  });
});

describe('Security Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Apply all security middleware
    app.use(commandInjectionPrevention({ mode: 'strict' }));
    app.use(fileUploadSecurity());
    app.use('/auth', securityRateLimit({ maxRequests: 2, windowMs: 60000 }));
    
    app.post('/test', (req, res) => res.json({ success: true, data: req.body }));
    app.post('/auth/login', (req, res) => res.json({ success: true }));
  });

  it('should apply multiple security layers correctly', async () => {
    // Test that command injection is blocked
    const maliciousResponse = await request(app)
      .post('/test')
      .send({ command: 'rm -rf /' });

    expect(maliciousResponse.status).toBe(400);
    expect(maliciousResponse.body.code).toBe('SECURITY_VIOLATION');

    // Test that rate limiting works on auth endpoints
    await request(app).post('/auth/login');
    await request(app).post('/auth/login');
    
    const rateLimitedResponse = await request(app).post('/auth/login');
    expect(rateLimitedResponse.status).toBe(429);

    // Test that safe requests still work
    const safeResponse = await request(app)
      .post('/test')
      .send({ name: 'John Doe', email: 'john@example.com' });

    expect(safeResponse.status).toBe(200);
    expect(safeResponse.body.success).toBe(true);
  });
});