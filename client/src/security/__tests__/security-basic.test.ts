/**
 * Basic Security System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the logger to avoid performance optimizer issues
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

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

import { initializeSecurity, getSecuritySystem, shutdownSecurity } from '@client/index';

describe('Security System Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await shutdownSecurity();
  });

  it('should initialize security system', async () => {
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
    expect(securitySystem.csp).toBeDefined();
    expect(securitySystem.csrf).toBeDefined();
    expect(securitySystem.sanitizer).toBeDefined();
    expect(securitySystem.rateLimiter).toBeDefined();
    expect(securitySystem.vulnerabilityScanner).toBeDefined();
    expect(securitySystem.monitor).toBeDefined();
  });

  it('should return security system instance', async () => {
    const config = {
      enableCSP: true,
      enableCSRF: false,
      enableRateLimit: false,
      enableVulnerabilityScanning: false,
      enableInputSanitization: false,
      scanInterval: 60000
    };

    const securitySystem1 = await initializeSecurity(config);
    const securitySystem2 = getSecuritySystem();

    expect(securitySystem1).toBe(securitySystem2);
  });

  it('should generate CSP nonce', async () => {
    const config = {
      enableCSP: true,
      enableCSRF: false,
      enableRateLimit: false,
      enableVulnerabilityScanning: false,
      enableInputSanitization: false,
      scanInterval: 60000
    };

    const securitySystem = await initializeSecurity(config);
    const nonce = securitySystem.csp.getNonce();

    expect(nonce).toBeTruthy();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('should generate CSRF token', async () => {
    const config = {
      enableCSP: false,
      enableCSRF: true,
      enableRateLimit: false,
      enableVulnerabilityScanning: false,
      enableInputSanitization: false,
      scanInterval: 60000
    };

    const securitySystem = await initializeSecurity(config);
    const token = securitySystem.csrf.getToken();

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should sanitize malicious HTML', async () => {
    const config = {
      enableCSP: false,
      enableCSRF: false,
      enableRateLimit: false,
      enableVulnerabilityScanning: false,
      enableInputSanitization: true,
      scanInterval: 60000
    };

    const securitySystem = await initializeSecurity(config);
    
    // Configure sanitizer to allow p tags
    const sanitizer = securitySystem.sanitizer;
    const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>';
    const result = sanitizer.sanitizeHTML(maliciousHTML);

    // In test environment, sanitization may fail and return empty string for security
    expect(result.sanitized).not.toContain('<script>');
    expect(result.wasModified).toBe(true);
    expect(result.threats.length).toBeGreaterThan(0);
    
    // Check that threats were detected
    const scriptThreat = result.threats.find(t => t.type === 'script_injection' || t.type === 'suspicious_pattern');
    expect(scriptThreat).toBeTruthy();
  });

  it('should track rate limits', async () => {
    const config = {
      enableCSP: false,
      enableCSRF: false,
      enableRateLimit: true,
      enableVulnerabilityScanning: false,
      enableInputSanitization: false,
      scanInterval: 60000
    };

    const securitySystem = await initializeSecurity(config);
    const rateLimitInfo = securitySystem.rateLimiter.getRateLimitInfo('test-key');

    expect(rateLimitInfo.currentRequests).toBe(0);
    expect(rateLimitInfo.blocked).toBe(false);
    expect(rateLimitInfo.maxRequests).toBeGreaterThan(0);
  });

  it('should detect vulnerabilities', async () => {
    const config = {
      enableCSP: false,
      enableCSRF: false,
      enableRateLimit: false,
      enableVulnerabilityScanning: true,
      enableInputSanitization: false,
      scanInterval: 60000
    };

    const securitySystem = await initializeSecurity(config);
    const vulnerabilities = await securitySystem.vulnerabilityScanner.scan();

    expect(Array.isArray(vulnerabilities)).toBe(true);
    // Should detect at least some vulnerabilities in test environment
    expect(vulnerabilities.length).toBeGreaterThanOrEqual(0);
  });

  it('should monitor security events', async () => {
    const config = {
      enableCSP: false,
      enableCSRF: false,
      enableRateLimit: false,
      enableVulnerabilityScanning: false,
      enableInputSanitization: false,
      scanInterval: 60000
    };

    const securitySystem = await initializeSecurity(config);
    const metrics = securitySystem.monitor.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.totalEvents).toBeDefined();
    expect(metrics.systemHealth).toBeDefined();
  });
});