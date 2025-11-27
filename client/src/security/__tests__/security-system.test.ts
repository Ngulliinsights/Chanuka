/**
 * Security System Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeSecurity, getSecuritySystem, shutdownSecurity } from '@client/index';
import { CSPManager } from '@client/csp-manager';
import { CSRFProtection } from '@client/csrf-protection';
import { InputSanitizer } from '@client/input-sanitizer';
import { RateLimiter } from '@client/rate-limiter';
import { VulnerabilityScanner } from '@client/vulnerability-scanner';
import { SecurityMonitor } from '@client/security-monitor';

// Mock fetch for testing
global.fetch = vi.fn();

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

describe('Security System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await shutdownSecurity();
  });

  describe('Security System Initialization', () => {
    it('should initialize all security components', async () => {
      const config = {
        enableCSP: true,
        enableCSRF: true,
        enableRateLimit: true,
        enableVulnerabilityScanning: true,
        enableInputSanitization: true,
        scanInterval: 60000
      };

      const securitySystem = await initializeSecurity(config);

      expect(securitySystem).toBeDefined();
      expect(securitySystem.csp).toBeInstanceOf(CSPManager);
      expect(securitySystem.csrf).toBeInstanceOf(CSRFProtection);
      expect(securitySystem.sanitizer).toBeInstanceOf(InputSanitizer);
      expect(securitySystem.rateLimiter).toBeInstanceOf(RateLimiter);
      expect(securitySystem.vulnerabilityScanner).toBeInstanceOf(VulnerabilityScanner);
      expect(securitySystem.monitor).toBeInstanceOf(SecurityMonitor);
    });

    it('should return the same instance from getSecuritySystem', async () => {
      const config = {
        enableCSP: true,
        enableCSRF: true,
        enableRateLimit: true,
        enableVulnerabilityScanning: true,
        enableInputSanitization: true,
        scanInterval: 60000
      };

      const securitySystem1 = await initializeSecurity(config);
      const securitySystem2 = getSecuritySystem();

      expect(securitySystem1).toBe(securitySystem2);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock a component that fails to initialize
      vi.spyOn(CSPManager.prototype, 'initialize').mockRejectedValue(new Error('CSP init failed'));

      const config = {
        enableCSP: true,
        enableCSRF: false,
        enableRateLimit: false,
        enableVulnerabilityScanning: false,
        enableInputSanitization: false,
        scanInterval: 60000
      };

      await expect(initializeSecurity(config)).rejects.toThrow('CSP init failed');
    });
  });

  describe('CSP Manager', () => {
    it('should generate and apply CSP policy', async () => {
      const config = {
        enableCSP: true,
        enableCSRF: false,
        enableRateLimit: false,
        enableVulnerabilityScanning: false,
        enableInputSanitization: false,
        scanInterval: 60000
      };

      await initializeSecurity(config);

      // Check if CSP meta tag was added
      const cspMeta = document.querySelector('meta[http-equiv*="Content-Security-Policy"]');
      expect(cspMeta).toBeTruthy();
      
      const policy = cspMeta?.getAttribute('content');
      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("script-src 'self'");
    });

    it('should generate unique nonces', async () => {
      const csp = new CSPManager({
        enabled: true,
        reportUri: '/test',
        reportOnly: false
      });

      await csp.initialize();
      const nonce1 = csp.getNonce();
      
      csp.refreshNonce();
      const nonce2 = csp.getNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[A-Za-z0-9+/]+$/);
      expect(nonce2).toMatch(/^[A-Za-z0-9+/]+$/);
    });
  });

  describe('CSRF Protection', () => {
    it('should generate CSRF tokens', async () => {
      const csrf = new CSRFProtection({
        enabled: true,
        tokenName: 'test-csrf-token',
        headerName: 'X-Test-CSRF-Token'
      });

      await csrf.initialize();
      const token = csrf.getToken();

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should store token in meta tag', async () => {
      const csrf = new CSRFProtection({
        enabled: true,
        tokenName: 'test-csrf-token',
        headerName: 'X-Test-CSRF-Token'
      });

      await csrf.initialize();
      
      const meta = document.querySelector('meta[name="test-csrf-token"]');
      expect(meta).toBeTruthy();
      expect(meta?.getAttribute('content')).toBeTruthy();
    });

    it('should validate tokens correctly', async () => {
      const csrf = new CSRFProtection({
        enabled: true,
        tokenName: 'test-csrf-token',
        headerName: 'X-Test-CSRF-Token'
      });

      await csrf.initialize();
      const token = csrf.getToken();

      expect(csrf.validateToken(token!)).toBe(true);
      expect(csrf.validateToken('invalid-token')).toBe(false);
    });
  });

  describe('Input Sanitizer', () => {
    it('should sanitize HTML content', () => {
      const sanitizer = new InputSanitizer({
        enabled: true,
        allowedTags: ['p', 'b', 'i'],
        allowedAttributes: {}
      });

      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizer.sanitizeHTML(maliciousHTML);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toContain('<p>Safe content</p>');
      expect(result.wasModified).toBe(true);
      expect(result.threats.length).toBeGreaterThan(0);
    });

    it('should sanitize text content', () => {
      const sanitizer = new InputSanitizer({
        enabled: true,
        allowedTags: [],
        allowedAttributes: {}
      });

      const maliciousText = '<script>alert("xss")</script>Safe text';
      const result = sanitizer.sanitizeText(maliciousText);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toBe('Safe text');
      expect(result.wasModified).toBe(true);
    });

    it('should sanitize URLs', () => {
      const sanitizer = new InputSanitizer({
        enabled: true,
        allowedTags: [],
        allowedAttributes: {},
        allowedSchemes: ['http', 'https']
      });

      const maliciousURL = 'javascript:alert("xss")';
      const result = sanitizer.sanitizeURL(maliciousURL);

      expect(result.sanitized).toBe('#');
      expect(result.wasModified).toBe(true);
      expect(result.threats.length).toBeGreaterThan(0);
    });

    it('should detect various threat types', () => {
      const sanitizer = new InputSanitizer({
        enabled: true,
        allowedTags: [],
        allowedAttributes: {}
      });

      const threats = [
        '<script>alert("xss")</script>',
        '<iframe src="evil.com"></iframe>',
        'javascript:alert("xss")',
        'onclick="alert(1)"'
      ];

      threats.forEach(threat => {
        const result = sanitizer.sanitizeHTML(threat);
        expect(result.threats.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Rate Limiter', () => {
    it('should track request counts', async () => {
      const rateLimiter = new RateLimiter({
        enabled: true,
        windowMs: 60000,
        maxRequests: 5,
        skipSuccessfulRequests: false
      });

      await rateLimiter.initialize();

      const key = 'test-key';
      const info = rateLimiter.getRateLimitInfo(key);

      expect(info.currentRequests).toBe(0);
      expect(info.maxRequests).toBe(5);
      expect(info.blocked).toBe(false);
    });

    it('should block requests when limit exceeded', async () => {
      // Mock fetch to avoid actual network requests
      const mockFetch = vi.fn().mockResolvedValue(new Response('OK'));
      global.fetch = mockFetch;

      const rateLimiter = new RateLimiter({
        enabled: true,
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: false
      });

      await rateLimiter.initialize();

      // Make requests that should be rate limited
      const requests = Array(3).fill(null).map(() => 
        fetch('/test-endpoint', { method: 'POST' })
      );

      const responses = await Promise.all(requests);

      // First two should succeed, third should be rate limited
      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[2].status).toBe(429);
    });
  });

  describe('Vulnerability Scanner', () => {
    it('should detect missing CSP', async () => {
      const scanner = new VulnerabilityScanner({
        enabled: true,
        scanInterval: 60000,
        reportEndpoint: '/test'
      });

      await scanner.initialize();
      const vulnerabilities = await scanner.scan();

      const cspVuln = vulnerabilities.find(v => v.type === 'security_misconfiguration');
      expect(cspVuln).toBeTruthy();
    });

    it('should detect HTTPS issues', async () => {
      // Mock location to simulate HTTP
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          hostname: 'example.com'
        },
        writable: true
      });

      const scanner = new VulnerabilityScanner({
        enabled: true,
        scanInterval: 60000,
        reportEndpoint: '/test'
      });

      await scanner.initialize();
      const vulnerabilities = await scanner.scan();

      const httpsVuln = vulnerabilities.find(v => v.type === 'insecure_protocol');
      expect(httpsVuln).toBeTruthy();
    });

    it('should provide vulnerability statistics', async () => {
      const scanner = new VulnerabilityScanner({
        enabled: true,
        scanInterval: 60000,
        reportEndpoint: '/test'
      });

      await scanner.initialize();
      await scanner.scan();

      const stats = scanner.getStats();
      expect(stats).toHaveProperty('lastScanTime');
      expect(stats).toHaveProperty('totalVulnerabilities');
      expect(stats).toHaveProperty('vulnerabilitiesBySeverity');
    });
  });

  describe('Security Monitor', () => {
    it('should record security events', async () => {
      const monitor = new SecurityMonitor({
        enabled: true,
        alertThreshold: 5,
        monitoringInterval: 30000
      });

      await monitor.initialize();

      // Simulate a security event
      const event = new CustomEvent('security-event', {
        detail: {
          type: 'xss_attempt',
          severity: 'high',
          source: 'test',
          details: { test: 'data' }
        }
      });

      document.dispatchEvent(event);

      const events = monitor.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('xss_attempt');
      expect(events[0].severity).toBe('high');
    });

    it('should generate alerts for repeated events', async () => {
      const monitor = new SecurityMonitor({
        enabled: true,
        alertThreshold: 2,
        monitoringInterval: 30000
      });

      await monitor.initialize();

      // Simulate multiple events of the same type
      for (let i = 0; i < 3; i++) {
        const event = new CustomEvent('security-event', {
          detail: {
            type: 'rate_limit_exceeded',
            severity: 'medium',
            source: 'test'
          }
        });
        document.dispatchEvent(event);
      }

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should provide security metrics', async () => {
      const monitor = new SecurityMonitor({
        enabled: true,
        alertThreshold: 5,
        monitoringInterval: 30000
      });

      await monitor.initialize();

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveProperty('totalEvents');
      expect(metrics).toHaveProperty('eventsByType');
      expect(metrics).toHaveProperty('eventsBySeverity');
      expect(metrics).toHaveProperty('systemHealth');
    });
  });

  describe('Integration Tests', () => {
    it('should work together as a complete security system', async () => {
      const config = {
        enableCSP: true,
        enableCSRF: true,
        enableRateLimit: true,
        enableVulnerabilityScanning: true,
        enableInputSanitization: true,
        scanInterval: 60000
      };

      const securitySystem = await initializeSecurity(config);

      // Test CSP
      expect(securitySystem.csp.getNonce()).toBeTruthy();

      // Test CSRF
      expect(securitySystem.csrf.getToken()).toBeTruthy();

      // Test Input Sanitizer
      const sanitizeResult = securitySystem.sanitizer.sanitizeHTML('<script>alert("test")</script>');
      expect(sanitizeResult.wasModified).toBe(true);

      // Test Rate Limiter
      const rateLimitInfo = securitySystem.rateLimiter.getRateLimitInfo('test');
      expect(rateLimitInfo.blocked).toBe(false);

      // Test Vulnerability Scanner
      const vulnerabilities = await securitySystem.vulnerabilityScanner.scan();
      expect(Array.isArray(vulnerabilities)).toBe(true);

      // Test Security Monitor
      const metrics = securitySystem.monitor.getMetrics();
      expect(metrics.systemHealth).toBeDefined();
    });

    it('should handle security events across components', async () => {
      const config = {
        enableCSP: true,
        enableCSRF: true,
        enableRateLimit: true,
        enableVulnerabilityScanning: true,
        enableInputSanitization: true,
        scanInterval: 60000
      };

      const securitySystem = await initializeSecurity(config);

      // Simulate a CSP violation
      const cspEvent = new SecurityPolicyViolationEvent('securitypolicyviolation', {
        documentURI: 'http://example.com',
        referrer: '',
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src',
        originalPolicy: "default-src 'self'",
        disposition: 'enforce',
        blockedURI: 'http://evil.com/script.js',
        statusCode: 200
      });

      document.dispatchEvent(cspEvent);

      // Check if the security monitor recorded the event
      const events = securitySystem.monitor.getEvents();
      const cspViolationEvent = events.find(e => e.type === 'csp_violation');
      expect(cspViolationEvent).toBeTruthy();
    });
  });
});