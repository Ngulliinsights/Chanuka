/**
 * Security Service Tests
 * Tests for the main security service functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityService } from '../security-service';
import { inputSanitizer } from '../input-sanitizer';
import { csrfProtection } from '../csrf-protection';
import { clientRateLimiter } from '../rate-limiter';

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
});

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = SecurityService.getInstance({
      enableCSP: true,
      enableCSRF: true,
      enableRateLimit: true,
      enableVulnerabilityScanning: true,
      enableInputSanitization: true
    });
  });

  afterEach(() => {
    // Clean up
    clientRateLimiter.clearAll();
    csrfProtection.clearToken();
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = securityService.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
      // Note: DOMPurify removes tags but may leave some content
    });

    it('should sanitize HTML content', () => {
      const htmlInput = '<div onclick="alert()">Safe content</div>';
      const sanitized = securityService.sanitizeHtml(htmlInput);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert');
    });

    it('should perform security checks', () => {
      const suspiciousInput = "'; DROP TABLE users; --";
      const result = securityService.performSecurityCheck(suspiciousInput);
      
      expect(result.isSafe).toBe(false);
      expect(result.threats).toContain('SQL Injection attempt detected');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const result = securityService.checkRateLimit('test-key', 'api');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should block requests exceeding limit', () => {
      const key = 'test-limit-key';
      
      // Exhaust the limit
      for (let i = 0; i < 101; i++) {
        securityService.checkRateLimit(key, 'api');
      }
      
      const result = securityService.checkRateLimit(key, 'api');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Security Status', () => {
    it('should return security status', () => {
      const status = securityService.getSecurityStatus();
      
      expect(status).toHaveProperty('csp');
      expect(status).toHaveProperty('csrf');
      expect(status).toHaveProperty('rateLimit');
      expect(status).toHaveProperty('vulnerabilityScanning');
      expect(status).toHaveProperty('inputSanitization');
      
      expect(status.csp.enabled).toBe(true);
      expect(status.csrf.enabled).toBe(true);
      expect(status.rateLimit.enabled).toBe(true);
      expect(status.vulnerabilityScanning.enabled).toBe(true);
      expect(status.inputSanitization.enabled).toBe(true);
    });
  });

  describe('Threat Detection', () => {
    it('should detect XSS attempts', () => {
      const xssInput = '<img src="x" onerror="alert(1)">';
      const result = inputSanitizer.detectXSS(xssInput);
      
      expect(result).toBe(true);
    });

    it('should detect SQL injection attempts', () => {
      const sqlInput = "1' OR '1'='1";
      const result = inputSanitizer.detectSQLInjection(sqlInput);
      
      expect(result).toBe(true);
    });
  });

  describe('CSRF Protection', () => {
    it('should generate CSRF tokens', () => {
      const token = csrfProtection.getToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should validate CSRF tokens', () => {
      const token = csrfProtection.getToken();
      const isValid = csrfProtection.validateToken(token);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid CSRF tokens', () => {
      const isValid = csrfProtection.validateToken('invalid-token');
      
      expect(isValid).toBe(false);
    });
  });
});

describe('Input Sanitizer', () => {
  it('should sanitize dangerous HTML', () => {
    const dangerousHtml = '<script>alert("xss")</script><p>Safe content</p>';
    const sanitized = inputSanitizer.sanitizeHtml(dangerousHtml);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Safe content');
  });

  it('should sanitize text input', () => {
    const dangerousText = 'Hello <script>alert("xss")</script> World';
    const sanitized = inputSanitizer.sanitizeText(dangerousText);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Hello');
    expect(sanitized).toContain('World');
  });

  it('should validate with Zod schemas', async () => {
    const { ValidationSchemas } = await import('../input-sanitizer');
    const schema = ValidationSchemas.safeString;
    const validInput = 'This is a safe string';
    const invalidInput = '<script>alert("xss")</script>';
    
    const validResult = await inputSanitizer.validateAndSanitize(schema, validInput);
    const invalidResult = await inputSanitizer.validateAndSanitize(schema, invalidInput);
    
    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });
});