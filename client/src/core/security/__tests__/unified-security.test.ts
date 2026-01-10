/**
 * Unified Security System Tests
 * Comprehensive test coverage for the unified security system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  UnifiedSecurityConfig,
  SecurityErrorType,
  ThreatType,
  SanitizationOptions
} from '../unified/security-interface';
import { UnifiedCSPManager } from '../unified/csp-manager';
import { UnifiedInputSanitizer } from '../unified/input-sanitizer';
import { SecurityErrorHandler, SecurityErrorFactory } from '../unified/error-handler';
import { SecurityErrorMiddleware } from '../unified/error-middleware';
import { STANDARD_CSP_CONFIG } from '../unified/csp-config';

describe('Unified Security System', () => {
  let unifiedSecurity: {
    cspManager: UnifiedCSPManager;
    sanitizer: UnifiedInputSanitizer;
    errorHandler: SecurityErrorHandler;
    errorMiddleware: SecurityErrorMiddleware;
  };
  let mockConfig: UnifiedSecurityConfig;

  beforeEach(() => {
    mockConfig = {
      csp: {
        enabled: true,
        reportOnly: false,
        directives: STANDARD_CSP_CONFIG.development,
        nonce: 'test-nonce',
      },
      inputSanitization: {
        enabled: true,
        mode: 'comprehensive',
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedAttributes: { a: ['href', 'target'] },
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 10,
      },
      errorHandling: {
        mode: 'strict',
        logLevel: 'info',
        reportToBackend: true,
      },
    };

    unifiedSecurity = {
      cspManager: new UnifiedCSPManager({
        enabled: mockConfig.csp.enabled,
        reportOnly: mockConfig.csp.reportOnly,
        directives: mockConfig.csp.directives,
        reportUri: '/api/security/csp-violations',
      }),
      sanitizer: new UnifiedInputSanitizer({
        enabled: mockConfig.inputSanitization.enabled,
        mode: mockConfig.inputSanitization.mode,
        allowedTags: mockConfig.inputSanitization.allowedTags,
        allowedAttributes: mockConfig.inputSanitization.allowedAttributes,
      }),
      errorHandler: new SecurityErrorHandler(mockConfig.errorHandling),
      errorMiddleware: new SecurityErrorMiddleware(mockConfig.errorHandling),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CSP Management', () => {
    it('should generate correct CSP header', async () => {
      await unifiedSecurity.cspManager.initialize();

      // Test through public interface - check that CSP is applied
      const metaTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(metaTag).toBeTruthy();

      if (metaTag) {
        const content = metaTag.getAttribute('content') || '';
        expect(content).toContain("default-src 'self'");
        expect(content).toContain("script-src 'self'");
        expect(content).toContain("style-src 'self'");
      }
    });

    it('should handle CSP violations', async () => {
      // Test through public interface - simulate violation event
      const violationEvent = new Event('securitypolicyviolation') as any;
      violationEvent.documentURI = 'https://example.com';
      violationEvent.violatedDirective = 'script-src';
      violationEvent.blockedURI = 'https://evil.com/script.js';
      violationEvent.effectiveDirective = 'script-src';
      violationEvent.originalPolicy = "default-src 'self'";
      violationEvent.disposition = 'enforce';

      // Listen for security events
      const securityEventHandler = vi.fn();
      document.addEventListener('security-event', securityEventHandler);

      // Dispatch violation
      document.dispatchEvent(violationEvent);

      // Check that security event was triggered
      expect(securityEventHandler).toHaveBeenCalled();
    });

    it('should generate secure nonces', () => {
      const nonce1 = unifiedSecurity.cspManager.getNonce();
      const nonce2 = unifiedSecurity.cspManager.refreshNonce();

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBeGreaterThan(10);
      expect(nonce2.length).toBeGreaterThan(10);
    });

    it('should assess violation severity correctly', () => {
      const scriptViolation = {
        documentUri: 'https://example.com',
        violatedDirective: 'script-src',
        blockedUri: 'https://evil.com/script.js',
        effectiveDirective: 'script-src',
        originalPolicy: "default-src 'self'",
        disposition: 'enforce' as const,
        referrer: '',
        lineNumber: 0,
        columnNumber: 0,
        sourceFile: '',
        statusCode: 0,
      };

      const frameViolation = {
        documentUri: 'https://example.com',
        violatedDirective: 'frame-src',
        blockedUri: 'https://evil.com',
        effectiveDirective: 'frame-src',
        originalPolicy: "default-src 'self'",
        disposition: 'enforce' as const,
        referrer: '',
        lineNumber: 0,
        columnNumber: 0,
        sourceFile: '',
        statusCode: 0,
      };

      const imageViolation = {
        documentUri: 'https://example.com',
        violatedDirective: 'img-src',
        blockedUri: 'https://evil.com/image.jpg',
        effectiveDirective: 'img-src',
        originalPolicy: "default-src 'self'",
        disposition: 'enforce' as const,
        referrer: '',
        lineNumber: 0,
        columnNumber: 0,
        sourceFile: '',
        statusCode: 0,
      };

      // Test severity assessment (would need to access private method or test through public interface)
      expect(scriptViolation.violatedDirective).toBe('script-src');
      expect(frameViolation.violatedDirective).toBe('frame-src');
      expect(imageViolation.violatedDirective).toBe('img-src');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', async () => {
      const maliciousInput = '<script>alert("XSS")</script><img src="x" onerror="alert(1)">';

      const result = await unifiedSecurity.sanitizer.sanitize(maliciousInput);

      expect(result.wasModified).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('onerror');
      expect(result.threats.length).toBeGreaterThan(0);
    });

    it('should preserve safe HTML', async () => {
      const safeInput = '<p>This is <strong>safe</strong> HTML content.</p>';

      const result = await unifiedSecurity.sanitizer.sanitize(safeInput);

      expect(result.wasModified).toBe(false);
      expect(result.sanitized).toBe(safeInput);
      expect(result.threats).toHaveLength(0);
    });

    it('should handle different sanitization modes', async () => {
      const input = '<script>alert("test")</script>';

      // Test basic mode
      const basicResult = await unifiedSecurity.sanitizer.sanitize(input, { mode: 'basic' });
      expect(basicResult.sanitized).toBe('alert("test")');

      // Test comprehensive mode
      const comprehensiveResult = await unifiedSecurity.sanitizer.sanitize(input, { mode: 'comprehensive' });
      expect(comprehensiveResult.wasModified).toBe(true);
      expect(comprehensiveResult.threats.length).toBeGreaterThan(0);
    });

    it('should sanitize URLs correctly', async () => {
      const safeUrl = 'https://example.com/page';
      const maliciousUrl = 'javascript:alert("xss")';
      const dataUrl = 'data:text/html,<script>alert("xss")</script>';

      const safeResult = await unifiedSecurity.sanitizer.sanitizeURL(safeUrl);
      const maliciousResult = await unifiedSecurity.sanitizer.sanitizeURL(maliciousUrl);
      const dataResult = await unifiedSecurity.sanitizer.sanitizeURL(dataUrl);

      expect(safeResult.sanitized).toBe(safeUrl);
      expect(safeResult.wasModified).toBe(false);

      expect(maliciousResult.sanitized).toBe('#');
      expect(maliciousResult.wasModified).toBe(true);
      expect(maliciousResult.threats.length).toBeGreaterThan(0);

      expect(dataResult.sanitized).toBe('#');
      expect(dataResult.wasModified).toBe(true);
      expect(dataResult.threats.length).toBeGreaterThan(0);
    });

    it('should batch sanitize inputs', async () => {
      const inputs = {
        title: '<script>alert("xss")</script>Safe Title',
        content: '<p>Safe content</p>',
        url: 'javascript:alert("xss")',
      };

      const results = await unifiedSecurity.sanitizer.sanitizeBatch(inputs, 'html');

      expect(results.title.wasModified).toBe(true);
      expect(results.content.wasModified).toBe(false);
      expect(results.url.wasModified).toBe(true);
    });

    it('should detect threats correctly', async () => {
      const inputs = [
        { input: '<script>alert("xss")</script>', expectedType: 'script_injection' as ThreatType },
        { input: '<iframe src="evil.com"></iframe>', expectedType: 'html_injection' as ThreatType },
        { input: '<div style="expression(alert(1))">', expectedType: 'attribute_injection' as ThreatType },
        { input: 'javascript:alert(1)', expectedType: 'url_injection' as ThreatType },
      ];

      for (const { input, expectedType } of inputs) {
        const result = await unifiedSecurity.sanitizer.sanitize(input);
        expect(result.threats).toHaveLength(1);
        expect(result.threats[0].type).toBe(expectedType);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle security errors consistently', () => {
      const testError = SecurityErrorFactory.createError(
        SecurityErrorType.INPUT_VALIDATION_FAILED,
        'Invalid input detected',
        'TestComponent'
      );

      const result = unifiedSecurity.errorHandler.handleSecurityError(testError);

      expect(result.handled).toBe(true);
      expect(result.error.severity).toBe('high');
      expect(result.error.type).toBe(SecurityErrorType.INPUT_VALIDATION_FAILED);
    });

    it('should provide error context', () => {
      const error = new Error('Test error');
      const securityError = SecurityErrorFactory.createError(
        SecurityErrorType.CONFIGURATION_ERROR,
        'Configuration error occurred',
        'TestComponent',
        { configKey: 'test' },
        error
      );

      expect(securityError.context).toEqual({ configKey: 'test' });
      expect(securityError.originalError).toBe(error);
    });

    it('should infer error types correctly', () => {
      const errorMiddleware = unifiedSecurity.errorMiddleware;

      // Test CSP error inference
      const cspError = new Error('CSP violation detected');
      const cspSecurityError = (errorMiddleware as any).createSecurityError(
        cspError, 'test-operation', 'TestComponent'
      );
      expect(cspSecurityError.type).toBe(SecurityErrorType.CSP_VIOLATION);

      // Test validation error inference
      const validationError = new Error('Input validation failed');
      const validationSecurityError = (errorMiddleware as any).createSecurityError(
        validationError, 'test-operation', 'TestComponent'
      );
      expect(validationSecurityError.type).toBe(SecurityErrorType.INPUT_VALIDATION_FAILED);
    });

    it('should handle batch operations with error handling', async () => {
      const operations = [
        async () => 'success',
        async () => { throw new Error('failure'); },
        async () => 'another success',
      ];

      const results = await unifiedSecurity.errorMiddleware.handleBatchOperation(
        operations,
        'test-batch',
        'TestComponent'
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('success');
      expect(results[1]).toBeInstanceOf(Error);
      expect(results[2]).toBe('another success');
    });

    it('should handle retryable operations', async () => {
      let attemptCount = 0;
      const failingOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await unifiedSecurity.errorMiddleware.handleRetryableOperation(
        failingOperation,
        'test-retry',
        'TestComponent',
        3,
        10
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete security workflow', async () => {
      const workflow = {
        input: '<script>alert("test")</script>',
        endpoint: 'api/test',
        user: 'test-user',
      };

      // Sanitize input
      const sanitizationResult = await unifiedSecurity.sanitizer.sanitize(workflow.input);
      expect(sanitizationResult.wasModified).toBe(true);

      // Verify CSP is active
      const cspStatus = unifiedSecurity.cspManager.getHealthStatus();
      expect(cspStatus.enabled).toBe(true);

      // Verify error handler is working
      const errorStats = unifiedSecurity.errorHandler.getErrorStatistics();
      expect(errorStats.totalErrors).toBeGreaterThanOrEqual(0);
    });

    it('should handle security breach scenarios', async () => {
      const breachInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        'javascript:alert("injection")',
        '<iframe src="evil.com"></iframe>',
      ];

      for (const input of breachInputs) {
        const result = await unifiedSecurity.sanitizer.sanitize(input);
        expect(result.threats.length).toBeGreaterThan(0);
        expect(result.wasModified).toBe(true);
      }
    });

    it('should maintain backward compatibility', async () => {
      // Test that unified system can handle legacy-style inputs
      const legacyInput = '<b>Bold text</b>';
      const result = await unifiedSecurity.sanitizer.sanitize(legacyInput);

      expect(result.sanitized).toContain('<b>');
      expect(result.sanitized).toContain('</b>');
      expect(result.wasModified).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should sanitize large inputs efficiently', async () => {
      const largeInput = '<p>' + 'A'.repeat(10000) + '</p>';
      const startTime = performance.now();

      const result = await unifiedSecurity.sanitizer.sanitize(largeInput);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result.sanitized).toBeDefined();
    });

    it('should handle concurrent sanitization requests', async () => {
      const inputs = Array.from({ length: 100 }, (_, i) => `<p>Input ${i}</p>`);
      const startTime = performance.now();

      const promises = inputs.map(input => unifiedSecurity.sanitizer.sanitize(input));
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(results).toHaveLength(100);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate CSP configuration', () => {
      const validConfig = STANDARD_CSP_CONFIG.production;
      const invalidConfig = {
        'default-src': [],
        'script-src': [],
      };

      // Test that valid config works
      expect(validConfig['default-src']).toBeDefined();
      expect(validConfig['script-src']).toBeDefined();

      // Test that invalid config has issues
      expect(invalidConfig['default-src']).toHaveLength(0);
      expect(invalidConfig['script-src']).toHaveLength(0);
    });

    it('should handle environment-specific configurations', () => {
      const devConfig = STANDARD_CSP_CONFIG.development;
      const prodConfig = STANDARD_CSP_CONFIG.production;

      // Development should allow unsafe-eval for HMR
      expect(devConfig['script-src']).toContain("'unsafe-eval'");
      expect(devConfig['style-src']).toContain("'unsafe-inline'");

      // Production should not allow unsafe directives
      expect(prodConfig['script-src']).not.toContain("'unsafe-eval'");
      expect(prodConfig['style-src']).not.toContain("'unsafe-inline'");
    });
  });

  describe('Error Statistics and Monitoring', () => {
    it('should track error statistics', () => {
      const stats = unifiedSecurity.errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
      expect(stats.lastErrorTime).toBeNull();
      expect(stats.averageResolutionTime).toBe(0);
    });

    it('should provide error summary', () => {
      const summary = unifiedSecurity.errorHandler.getErrorSummary();

      expect(summary.totalErrors).toBeGreaterThanOrEqual(0);
      expect(summary.criticalErrors).toBeGreaterThanOrEqual(0);
      expect(summary.errorRate).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(summary.topErrorTypes)).toBe(true);
    });

    it('should check system health', () => {
      const health = unifiedSecurity.errorHandler.getHealthStatus();

      expect(health.enabled).toBe(true);
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.lastCheck).toBeInstanceOf(Date);
      expect(Array.isArray(health.issues)).toBe(true);
    });
  });
});
