# Security Components Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the unified security system, ensuring robust coverage of all security components while maintaining the Pareto principle (80% value with 20% effort).

## Testing Philosophy

### Pareto Testing Approach
- Focus on critical security scenarios that deliver maximum protection value
- Prioritize tests that catch the most common and dangerous security vulnerabilities
- Balance test coverage with development efficiency
- Emphasize integration and end-to-end testing over isolated unit tests

### Security Testing Principles
1. **Threat-Driven Testing**: Test against real-world attack vectors
2. **Defense in Depth**: Test multiple layers of security
3. **Fail-Safe Defaults**: Ensure security measures fail securely
4. **Continuous Validation**: Integrate security testing into CI/CD pipeline

## Test Categories

### 1. Unit Tests (20% of effort, 40% of value)

#### CSP Manager Tests
```typescript
describe('UnifiedCSPManager', () => {
  it('should generate correct CSP header', async () => {
    const config = {
      directives: STANDARD_CSP_CONFIG.production,
      reportOnly: false,
    };
    
    const cspManager = new UnifiedCSPManager(config);
    await cspManager.initialize(mockUnifiedConfig);
    
    const cspHeader = cspManager.generateCSPHeader();
    
    expect(cspHeader).toContain("default-src 'self'");
    expect(cspHeader).toContain("script-src 'self' 'strict-dynamic'");
    expect(cspHeader).toContain("style-src 'self'");
    expect(cspHeader).toContain("connect-src 'self'");
  });

  it('should handle CSP violations correctly', async () => {
    const mockViolation = {
      documentUri: 'https://example.com',
      violatedDirective: 'script-src',
      blockedUri: 'https://evil.com/script.js',
      effectiveDirective: 'script-src',
      originalPolicy: "default-src 'self'",
      disposition: 'enforce' as const,
      lineNumber: 1,
      columnNumber: 1,
      sourceFile: 'https://example.com/page.html',
      statusCode: 0,
    };

    const cspManager = new UnifiedCSPManager({ enabled: true, reportOnly: false, directives: {} });
    const violationHandler = vi.fn();
    
    cspManager.onViolation(violationHandler);
    await cspManager.handleViolation(mockViolation);
    
    expect(violationHandler).toHaveBeenCalledWith(mockViolation);
    expect(cspManager.getViolations()).toHaveLength(1);
  });

  it('should refresh nonce correctly', () => {
    const cspManager = new UnifiedCSPManager({ enabled: true, reportOnly: false, directives: {} });
    
    const firstNonce = cspManager.getCurrentNonce();
    const secondNonce = cspManager.refreshNonce();
    
    expect(firstNonce).toBeDefined();
    expect(secondNonce).toBeDefined();
    expect(firstNonce).not.toBe(secondNonce);
    expect(secondNonce).toHaveLength(32); // Standard nonce length
  });
});
```

#### Input Sanitizer Tests
```typescript
describe('UnifiedInputSanitizer', () => {
  it('should sanitize XSS attempts', async () => {
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload="alert(1)">',
    ];

    const sanitizer = new UnifiedInputSanitizer({
      enabled: true,
      mode: 'comprehensive',
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {},
    });

    for (const input of maliciousInputs) {
      const result = await sanitizer.sanitize(input);
      
      expect(result.wasModified).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('onerror');
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.threats.length).toBeGreaterThan(0);
    }
  });

  it('should preserve safe HTML', async () => {
    const safeInput = '<p>This is <strong>safe</strong> HTML content.</p>';
    
    const sanitizer = new UnifiedInputSanitizer({
      enabled: true,
      mode: 'comprehensive',
      allowedTags: ['p', 'strong', 'em', 'b', 'i'],
      allowedAttributes: {},
    });

    const result = await sanitizer.sanitize(safeInput);
    
    expect(result.wasModified).toBe(false);
    expect(result.sanitized).toBe(safeInput);
    expect(result.threats).toHaveLength(0);
  });

  it('should handle different sanitization modes', async () => {
    const input = '<script>alert("test")</script><p>Safe content</p>';
    
    const sanitizer = new UnifiedInputSanitizer({
      enabled: true,
      mode: 'comprehensive',
      allowedTags: ['p'],
      allowedAttributes: {},
    });

    // Test basic mode
    const basicResult = await sanitizer.sanitize(input, { mode: 'basic' });
    expect(basicResult.sanitized).toBe('alert("test")Safe content');
    
    // Test comprehensive mode
    const comprehensiveResult = await sanitizer.sanitize(input, { mode: 'comprehensive' });
    expect(comprehensiveResult.wasModified).toBe(true);
    expect(comprehensiveResult.sanitized).toBe('<p>Safe content</p>');
    expect(comprehensiveResult.threats.length).toBeGreaterThan(0);
  });

  it('should detect and report threats', async () => {
    const input = '<script>alert("xss")</script>';
    
    const sanitizer = new UnifiedInputSanitizer({
      enabled: true,
      mode: 'comprehensive',
      allowedTags: [],
      allowedAttributes: {},
    });

    const result = await sanitizer.sanitize(input);
    
    expect(result.threats).toHaveLength(1);
    expect(result.threats[0].type).toBe('script_injection');
    expect(result.threats[0].severity).toBe('critical');
    expect(result.threats[0].description).toContain('script_injection');
  });
});
```

#### Rate Limiter Tests
```typescript
describe('UnifiedRateLimiter', () => {
  it('should enforce rate limits correctly', async () => {
    const rateLimiter = new UnifiedRateLimiter({
      enabled: true,
      windowMs: 60000, // 1 minute
      maxRequests: 5,
    });

    const key = 'test-user';
    const configName = 'api-endpoint';

    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      const result = await rateLimiter.checkLimit(key, configName);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }

    // Next request should be blocked
    const blockedResult = await rateLimiter.checkLimit(key, configName);
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.remaining).toBe(0);
    expect(blockedResult.resetTime).toBeGreaterThan(Date.now());
  });

  it('should handle different rate limit configurations', async () => {
    const configs = [
      { name: 'strict', windowMs: 60000, maxRequests: 5 },
      { name: 'permissive', windowMs: 300000, maxRequests: 100 },
      { name: 'burst', windowMs: 10000, maxRequests: 10 },
    ];

    const rateLimiter = new UnifiedRateLimiter({ enabled: true, windowMs: 60000, maxRequests: 100 });

    for (const config of configs) {
      const result = await rateLimiter.checkLimit('user', config.name);
      expect(result).toBeDefined();
      expect(result.windowMs).toBe(config.windowMs);
      expect(result.maxRequests).toBe(config.maxRequests);
    }
  });

  it('should reset usage correctly', async () => {
    const rateLimiter = new UnifiedRateLimiter({
      enabled: true,
      windowMs: 60000,
      maxRequests: 10,
    });

    const key = 'test-user';
    const configName = 'api-endpoint';

    // Make some requests
    for (let i = 0; i < 3; i++) {
      await rateLimiter.checkLimit(key, configName);
    }

    // Reset usage
    rateLimiter.reset(key, configName);

    // Should be able to make requests again
    const result = await rateLimiter.checkLimit(key, configName);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });
});
```

### 2. Integration Tests (30% of effort, 40% of value)

#### Complete Security Workflow Tests
```typescript
describe('Security Integration Tests', () => {
  let unifiedSecurity: UnifiedSecuritySystem;

  beforeEach(async () => {
    unifiedSecurity = new UnifiedSecuritySystem();
    
    const config: UnifiedSecurityConfig = {
      csp: {
        enabled: true,
        reportOnly: false,
        directives: STANDARD_CSP_CONFIG.development,
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

    await unifiedSecurity.initialize(config);
  });

  it('should handle complete security workflow', async () => {
    const workflow = {
      input: '<script>alert("test")</script><p>Safe content</p>',
      endpoint: 'api/test',
      user: 'test-user',
    };

    // 1. Sanitize input
    const sanitizationResult = await unifiedSecurity.sanitizer.sanitize(workflow.input);
    expect(sanitizationResult.wasModified).toBe(true);
    expect(sanitizationResult.sanitized).toBe('<p>Safe content</p>');
    expect(sanitizationResult.threats.length).toBeGreaterThan(0);

    // 2. Check rate limit
    const rateLimitResult = await unifiedSecurity.rateLimiter.checkLimit(workflow.user, workflow.endpoint);
    expect(rateLimitResult.allowed).toBe(true);
    expect(rateLimitResult.remaining).toBe(9);

    // 3. Verify CSP is active
    const cspStatus = unifiedSecurity.cspManager.getHealthStatus();
    expect(cspStatus.status).toBe('healthy');

    // 4. Verify error handling is working
    const errorStats = unifiedSecurity.errorHandler.getErrorStats();
    expect(errorStats.totalErrors).toBeGreaterThanOrEqual(0);
  });

  it('should handle security breach scenarios', async () => {
    const breachInputs = [
      '<script>alert("xss")</script>',
      "'; DROP TABLE users; --",
      'javascript:alert("injection")',
      '<iframe src="javascript:alert(1)"></iframe>',
    ];

    for (const input of breachInputs) {
      const result = await unifiedSecurity.sanitizer.sanitize(input);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.wasModified).toBe(true);
      
      // Verify threats are reported
      expect(result.threats.some(t => t.severity === 'high' || t.severity === 'critical')).toBe(true);
    }
  });

  it('should maintain security under load', async () => {
    const inputs = Array.from({ length: 100 }, (_, i) => 
      `<script>alert("test${i}")</script><p>Content ${i}</p>`
    );

    const startTime = performance.now();

    // Process all inputs concurrently
    const promises = inputs.map(input => unifiedSecurity.sanitizer.sanitize(input));
    const results = await Promise.all(promises);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify all inputs were processed
    expect(results).toHaveLength(100);
    
    // Verify all malicious content was detected and sanitized
    results.forEach(result => {
      expect(result.wasModified).toBe(true);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('<script>');
    });

    // Performance should be reasonable (under 5 seconds for 100 inputs)
    expect(duration).toBeLessThan(5000);
  });
});
```

#### Error Handling Integration Tests
```typescript
describe('Security Error Handling Integration', () => {
  it('should handle security errors consistently', async () => {
    const errorHandler = new SecurityErrorHandler({
      mode: 'strict',
      logLevel: 'info',
      reportToBackend: true,
    });

    const testErrors = [
      {
        type: SecurityErrorType.CSP_VIOLATION,
        message: 'CSP violation detected',
        component: 'CSPManager',
      },
      {
        type: SecurityErrorType.INPUT_VALIDATION_FAILED,
        message: 'Invalid input detected',
        component: 'InputSanitizer',
      },
      {
        type: SecurityErrorType.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        component: 'RateLimiter',
      },
    ];

    for (const testError of testErrors) {
      const securityError = SecurityErrorFactory.createError(
        testError.type,
        testError.message,
        testError.component
      );

      const errorResult = errorHandler.handleSecurityError(securityError);
      
      expect(errorResult.handled).toBe(true);
      expect(errorResult.error.type).toBe(testError.type);
      expect(errorResult.error.component).toBe(testError.component);
      expect(errorResult.error.severity).toBeDefined();
      expect(errorResult.id).toBeDefined();
    }
  });

  it('should provide appropriate error context', async () => {
    const errorHandler = new SecurityErrorHandler({
      mode: 'strict',
      logLevel: 'info',
      reportToBackend: true,
    });

    const context = {
      operation: 'sanitize',
      inputLength: 1000,
      threatCount: 5,
    };

    const originalError = new Error('Test error');

    const securityError = SecurityErrorFactory.createError(
      SecurityErrorType.INPUT_VALIDATION_FAILED,
      'Input validation failed',
      'InputSanitizer',
      context,
      originalError
    );

    const errorResult = errorHandler.handleSecurityError(securityError);
    
    expect(errorResult.error.context).toEqual(context);
    expect(errorResult.error.originalError).toBe(originalError);
    expect(errorResult.suggestedAction).toBeDefined();
  });
});
```

### 3. Performance Tests (20% of effort, 15% of value)

#### Security Component Performance
```typescript
describe('Security Performance Tests', () => {
  describe('Input Sanitization Performance', () => {
    it('should sanitize large inputs efficiently', async () => {
      const largeInput = '<p>' + 'A'.repeat(10000) + '</p>';
      const sanitizer = new UnifiedInputSanitizer({
        enabled: true,
        mode: 'comprehensive',
        allowedTags: ['p'],
        allowedAttributes: {},
      });

      const startTime = performance.now();
      const result = await sanitizer.sanitize(largeInput);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result.sanitized).toBeDefined();
      expect(result.wasModified).toBe(false); // Safe input should not be modified
    });

    it('should handle concurrent sanitization requests', async () => {
      const inputs = Array.from({ length: 100 }, (_, i) => `<p>Input ${i}</p>`);
      const sanitizer = new UnifiedInputSanitizer({
        enabled: true,
        mode: 'comprehensive',
        allowedTags: ['p'],
        allowedAttributes: {},
      });

      const startTime = performance.now();
      const promises = inputs.map(input => sanitizer.sanitize(input));
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.wasModified).toBe(false);
        expect(result.threats).toHaveLength(0);
      });
    });

    it('should handle malicious input efficiently', async () => {
      const maliciousInput = '<script>' + 'alert("xss");'.repeat(1000) + '</script>';
      const sanitizer = new UnifiedInputSanitizer({
        enabled: true,
        mode: 'comprehensive',
        allowedTags: [],
        allowedAttributes: {},
      });

      const startTime = performance.now();
      const result = await sanitizer.sanitize(maliciousInput);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should handle malicious input efficiently
      expect(result.wasModified).toBe(true);
      expect(result.sanitized).toBe('');
      expect(result.threats.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle high request volumes', async () => {
      const rateLimiter = new UnifiedRateLimiter({
        enabled: true,
        windowMs: 60000,
        maxRequests: 1000,
      });

      const startTime = performance.now();

      // Simulate 1000 requests
      const promises = Array.from({ length: 1000 }, (_, i) =>
        rateLimiter.checkLimit(`user-${i % 10}`, 'api-endpoint')
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(results).toHaveLength(1000);
      
      // Most requests should be allowed (only 10 unique users)
      const allowedCount = results.filter(r => r.allowed).length;
      expect(allowedCount).toBeGreaterThan(950);
    });
  });

  describe('CSP Performance', () => {
    it('should generate CSP headers efficiently', () => {
      const cspManager = new UnifiedCSPManager({
        enabled: true,
        reportOnly: false,
        directives: STANDARD_CSP_CONFIG.production,
      });

      const startTime = performance.now();
      
      // Generate CSP header multiple times
      for (let i = 0; i < 100; i++) {
        cspManager.generateCSPHeader();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should be very fast
    });
  });
});
```

### 4. Security-Specific Tests (30% of effort, 25% of value)

#### Threat Detection Tests
```typescript
describe('Threat Detection Tests', () => {
  let threatDetector: ThreatDetector;

  beforeEach(() => {
    threatDetector = new ThreatDetector();
  });

  it('should detect XSS attempts', () => {
    const xssInputs = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("xss")',
      '<svg onload="alert(1)">',
      '"><script>alert("xss")</script>',
    ];

    for (const input of xssInputs) {
      const threats = threatDetector.detect(input);
      expect(threats.length).toBeGreaterThan(0);
      expect(threats.some(t => t.type === 'script_injection' || t.type === 'html_injection')).toBe(true);
    }
  });

  it('should detect SQL injection attempts', () => {
    const sqlInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' UNION SELECT * FROM users --",
    ];

    for (const input of sqlInputs) {
      const threats = threatDetector.detect(input);
      expect(threats.length).toBeGreaterThan(0);
      expect(threats.some(t => t.type === 'attribute_injection')).toBe(true);
    }
  });

  it('should detect path traversal attempts', () => {
    const pathInputs = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    ];

    for (const input of pathInputs) {
      const threats = threatDetector.detect(input);
      expect(threats.length).toBeGreaterThan(0);
      expect(threats.some(t => t.type === 'suspicious_pattern')).toBe(true);
    }
  });

  it('should assess threat severity correctly', () => {
    const testCases = [
      { input: '<script>alert("xss")</script>', expectedSeverity: 'critical' },
      { input: '<img src="x" onerror="alert(1)">', expectedSeverity: 'high' },
      { input: 'normal text', expectedSeverity: 'low' },
      { input: 'data:text/html,<script>alert(1)</script>', expectedSeverity: 'critical' },
    ];

    for (const testCase of testCases) {
      const threats = threatDetector.detect(testCase.input);
      if (threats.length > 0) {
        expect(threats[0].severity).toBe(testCase.expectedSeverity);
      }
    }
  });

  it('should provide threat context', () => {
    const input = '<script>alert("xss")</script>';
    const threats = threatDetector.detect(input);
    
    expect(threats.length).toBeGreaterThan(0);
    expect(threats[0].description).toBeDefined();
    expect(threats[0].originalContent).toBeDefined();
    expect(threats[0].location).toBeDefined();
  });
});
```

#### Security Configuration Tests
```typescript
describe('Security Configuration Tests', () => {
  it('should validate CSP configuration', () => {
    const validConfig = STANDARD_CSP_CONFIG.production;
    const validationResult = SecurityMigrationUtils.validateMigration({
      csp: {
        enabled: true,
        reportOnly: false,
        directives: validConfig,
      },
      inputSanitization: {
        enabled: true,
        mode: 'comprehensive',
        allowedTags: ['p', 'b', 'i'],
        allowedAttributes: {},
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 100,
      },
      errorHandling: {
        mode: 'strict',
        logLevel: 'info',
        reportToBackend: true,
      },
    });

    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('should detect invalid CSP configuration', () => {
    const invalidConfig = {
      ...STANDARD_CSP_CONFIG.production,
      'script-src': ["'unsafe-inline'"], // Reduces security
    };

    const validationResult = SecurityMigrationUtils.validateMigration({
      csp: {
        enabled: true,
        reportOnly: false,
        directives: invalidConfig,
      },
      inputSanitization: {
        enabled: true,
        mode: 'comprehensive',
        allowedTags: [],
        allowedAttributes: {},
      },
      rateLimiting: {
        enabled: true,
        windowMs: 0, // Invalid
        maxRequests: 0, // Invalid
      },
      errorHandling: {
        mode: 'strict',
        logLevel: 'info',
        reportToBackend: true,
      },
    });

    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors.length).toBeGreaterThan(0);
  });

  it('should handle environment-specific configurations', () => {
    const devConfig = {
      csp: {
        enabled: true,
        reportOnly: true, // Should be report-only in development
        directives: STANDARD_CSP_CONFIG.development,
      },
      inputSanitization: {
        enabled: true,
        mode: 'comprehensive',
        allowedTags: ['script', 'p', 'b', 'i'], // Allow script in development
        allowedAttributes: {},
      },
      rateLimiting: {
        enabled: false, // Disable in development
        windowMs: 60000,
        maxRequests: 1000,
      },
      errorHandling: {
        mode: 'permissive', // Don't break development flow
        logLevel: 'debug', // Maximum logging
        reportToBackend: false, // Don't spam backend
      },
    };

    const prodConfig = {
      csp: {
        enabled: true,
        reportOnly: false, // Enforce in production
        directives: STANDARD_CSP_CONFIG.production,
      },
      inputSanitization: {
        enabled: true,
        mode: 'comprehensive',
        allowedTags: ['p', 'b', 'i'], // Strict filtering in production
        allowedAttributes: {},
      },
      rateLimiting: {
        enabled: true, // Enable in production
        windowMs: 900000, // 15 minutes
        maxRequests: 100,
      },
      errorHandling: {
        mode: 'strict', // Fail fast on security issues
        logLevel: 'warn', // Don't log too much
        reportToBackend: true, // Report security events
      },
    };

    const devValidation = SecurityMigrationUtils.validateMigration(devConfig);
    const prodValidation = SecurityMigrationUtils.validateMigration(prodConfig);

    expect(devValidation.valid).toBe(true);
    expect(prodValidation.valid).toBe(true);
  });
});
```

## Test Execution Strategy

### CI/CD Integration
```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security unit tests
      run: npm run test:security:unit
    
    - name: Run security integration tests
      run: npm run test:security:integration
    
    - name: Run security performance tests
      run: npm run test:security:performance
    
    - name: Run security-specific tests
      run: npm run test:security:threats
    
    - name: Generate security test report
      run: npm run test:security:report
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      with:
        name: security-test-results
        path: test-results/
```

### Test Configuration
```typescript
// vitest.config.ts - Security test configuration
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    
    // Security test specific configuration
    testTimeout: 10000, // 10 seconds for security tests
    hookTimeout: 5000,  // 5 seconds for setup/teardown
    
    // Environment variables for security tests
    env: {
      NODE_ENV: 'test',
      USE_UNIFIED_SECURITY: 'true',
      SECURITY_LOG_LEVEL: 'debug',
    },
    
    // Coverage configuration for security components
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'client/src/security/**/*.{js,ts,tsx}',
        'client/src/core/security/**/*.{js,ts,tsx}',
      ],
      exclude: [
        'client/src/security/**/*.test.{js,ts,tsx}',
        'client/src/security/**/*.spec.{js,ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        // Higher thresholds for security-critical components
        'client/src/security/unified/**/*.{js,ts,tsx}': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
  },
});
```

### Test Scripts
```json
// package.json - Security test scripts
{
  "scripts": {
    "test:security": "vitest run --config vitest.security.config.ts",
    "test:security:unit": "vitest run --config vitest.security.config.ts --testNamePattern='Unit'",
    "test:security:integration": "vitest run --config vitest.security.config.ts --testNamePattern='Integration'",
    "test:security:performance": "vitest run --config vitest.security.config.ts --testNamePattern='Performance'",
    "test:security:threats": "vitest run --config vitest.security.config.ts --testNamePattern='Threat'",
    "test:security:report": "vitest run --config vitest.security.config.ts --coverage --reporter=json --outputFile=test-results/security-coverage.json"
  }
}
```

## Test Data Management

### Test Fixtures
```typescript
// test/fixtures/security-fixtures.ts
export const SECURITY_FIXTURES = {
  // XSS attack vectors
  xssVectors: [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(1)">',
    'javascript:alert("XSS")',
    '<svg onload="alert(1)">',
    '"><script>alert("XSS")</script>',
    "'; DROP TABLE users; --",
    '<iframe src="javascript:alert(1)"></iframe>',
  ],
  
  // SQL injection vectors
  sqlVectors: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; INSERT INTO users VALUES ('hacker', 'password'); --",
    "' UNION SELECT * FROM users --",
    "admin'; --",
  ],
  
  // Path traversal vectors
  pathTraversalVectors: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ],
  
  // Safe inputs
  safeInputs: [
    'Hello, world!',
    '<p>This is <strong>safe</strong> HTML content.</p>',
    'user@example.com',
    '+254712345678',
    'https://example.com',
  ],
  
  // CSP configurations
  cspConfigs: {
    development: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'connect-src': ["'self'", 'ws://localhost:*', 'http://localhost:*'],
    },
    production: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'strict-dynamic'"],
      'style-src': ["'self'"],
      'connect-src': ["'self'", 'wss://ws.chanuka.ke'],
    },
  },
};
```

### Test Utilities
```typescript
// test/utils/security-test-utils.ts
export class SecurityTestUtils {
  static async waitForSecurityEvent(eventType: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Security event ${eventType} not received within ${timeout}ms`));
      }, timeout);

      const handler = (event: CustomEvent) => {
        if (event.detail.type === eventType) {
          clearTimeout(timeoutId);
          document.removeEventListener('security-event', handler as EventListener);
          resolve(event.detail);
        }
      };

      document.addEventListener('security-event', handler as EventListener);
    });
  }

  static async simulateCSPViolation(violation: Partial<CSPViolation>): Promise<void> {
    const fullViolation: CSPViolation = {
      documentUri: 'https://example.com',
      referrer: '',
      violatedDirective: 'script-src',
      effectiveDirective: 'script-src',
      originalPolicy: "default-src 'self'",
      disposition: 'enforce',
      blockedUri: 'https://evil.com/script.js',
      lineNumber: 1,
      columnNumber: 1,
      sourceFile: 'https://example.com/page.html',
      statusCode: 0,
      ...violation,
    };

    const event = new CustomEvent('securitypolicyviolation', {
      detail: fullViolation,
    });

    document.dispatchEvent(event);
  }

  static async simulateThreatDetection(threats: ThreatDetection[]): Promise<void> {
    const event = new CustomEvent('security-event', {
      detail: {
        type: 'input_threat_detected',
        severity: 'high',
        source: 'Test',
        details: { threats },
      },
    });

    document.dispatchEvent(event);
  }

  static measurePerformance<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve) => {
      const startTime = performance.now();
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      resolve({ result, duration });
    });
  }
}
```

This comprehensive testing strategy ensures that the unified security system is thoroughly tested across all critical scenarios while maintaining development efficiency and focusing on the most important security protections.
