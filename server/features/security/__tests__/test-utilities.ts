import { secureQueryBuilderService } from '../application/services/secure-query-builder.service';
import { inputSanitizationService } from '../domain/services/input-sanitization.service';

/**
 * Security Test Utilities
 * Provides helpers for testing security features
 */

export interface SQLInjectionTestCase {
  name: string;
  input: string;
  shouldFail: boolean;
  expectedError?: string;
}

export interface XSSTestCase {
  name: string;
  input: string;
  expectedOutput: string;
}

/**
 * Common SQL injection attack patterns for testing
 */
export const SQL_INJECTION_PATTERNS: SQLInjectionTestCase[] = [
  {
    name: 'Basic OR injection',
    input: "' OR '1'='1",
    shouldFail: true,
    expectedError: 'SQL injection'
  },
  {
    name: 'UNION injection',
    input: "' UNION SELECT * FROM users--",
    shouldFail: true,
    expectedError: 'SQL injection'
  },
  {
    name: 'Comment injection',
    input: "admin'--",
    shouldFail: true,
    expectedError: 'SQL injection'
  },
  {
    name: 'Stacked queries',
    input: "'; DROP TABLE users;--",
    shouldFail: true,
    expectedError: 'SQL injection'
  },
  {
    name: 'Time-based blind injection',
    input: "' OR SLEEP(5)--",
    shouldFail: true,
    expectedError: 'SQL injection'
  },
  {
    name: 'Boolean-based blind injection',
    input: "' AND 1=1--",
    shouldFail: true,
    expectedError: 'SQL injection'
  },
  {
    name: 'Safe input',
    input: 'normal search term',
    shouldFail: false
  }
];

/**
 * Common XSS attack patterns for testing
 */
export const XSS_PATTERNS: XSSTestCase[] = [
  {
    name: 'Basic script tag',
    input: '<script>alert("XSS")</script>',
    expectedOutput: ''
  },
  {
    name: 'Image onerror',
    input: '<img src=x onerror="alert(\'XSS\')">',
    expectedOutput: ''
  },
  {
    name: 'Event handler',
    input: '<div onload="alert(\'XSS\')">',
    expectedOutput: ''
  },
  {
    name: 'JavaScript protocol',
    input: '<a href="javascript:alert(\'XSS\')">Click</a>',
    expectedOutput: '<a>Click</a>'
  },
  {
    name: 'Safe HTML',
    input: '<p>This is safe content</p>',
    expectedOutput: '<p>This is safe content</p>'
  }
];

/**
 * Test SQL injection protection
 */
export function testSQLInjection(input: string): {
  passed: boolean;
  error?: string;
} {
  try {
    const sanitized = inputSanitizationService.sanitizeString(input);
    
    // Check if dangerous patterns remain
    const dangerousPatterns = [
      /(\bOR\b.*=.*)/i,
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(--|;|\/\*|\*\/)/,
      /(\bSLEEP\b|\bWAITFOR\b)/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        return {
          passed: false,
          error: 'SQL injection pattern detected in sanitized output'
        };
      }
    }

    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test XSS protection
 */
export function testXSSProtection(input: string): {
  passed: boolean;
  sanitized: string;
  error?: string;
} {
  try {
    const sanitized = inputSanitizationService.sanitizeHtml(input);
    
    // Check if dangerous patterns remain
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /onclick=/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        return {
          passed: false,
          sanitized,
          error: 'XSS pattern detected in sanitized output'
        };
      }
    }

    return { passed: true, sanitized };
  } catch (error) {
    return {
      passed: false,
      sanitized: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test query parameterization
 */
export function testQueryParameterization(
  template: string,
  params: Record<string, unknown>
): {
  passed: boolean;
  error?: string;
} {
  try {
    const query = secureQueryBuilderService.buildParameterizedQuery(template, params);
    
    // Verify query was built successfully
    if (!query || !query.queryId) {
      return {
        passed: false,
        error: 'Failed to build parameterized query'
      };
    }

    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test bulk operation safety
 */
export async function testBulkOperationSafety<T>(
  items: unknown[],
  operation: (item: unknown) => Promise<T>
): Promise<{
  passed: boolean;
  result?: any;
  error?: string;
}> {
  try {
    const result = await secureQueryBuilderService.executeBulkOperation(
      items,
      operation,
      { validateEach: true, continueOnError: false }
    );

    // Check if all items were processed
    if (result.totalProcessed !== items.length) {
      return {
        passed: false,
        result,
        error: `Only ${result.totalProcessed} of ${items.length} items processed`
      };
    }

    return { passed: true, result };
  } catch (error) {
    return {
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Generate test data for security testing
 */
export function generateSecurityTestData(): {
  safeInputs: string[];
  maliciousInputs: string[];
  edgeCases: string[];
} {
  return {
    safeInputs: [
      'normal text',
      'user@example.com',
      '123-456-7890',
      'https://example.com',
      'Safe content with spaces'
    ],
    maliciousInputs: [
      ...SQL_INJECTION_PATTERNS.filter(p => p.shouldFail).map(p => p.input),
      ...XSS_PATTERNS.map(p => p.input)
    ],
    edgeCases: [
      '',
      ' ',
      '\n\t',
      'a'.repeat(10000),
      '🔥💯✨',
      'null',
      'undefined',
      '0',
      'false'
    ]
  };
}

/**
 * Run comprehensive security test suite
 */
export async function runSecurityTestSuite(): Promise<{
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; error?: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  // Test SQL injection protection
  for (const testCase of SQL_INJECTION_PATTERNS) {
    const result = testSQLInjection(testCase.input);
    const testPassed = testCase.shouldFail ? !result.passed : result.passed;
    
    results.push({
      test: `SQL Injection: ${testCase.name}`,
      passed: testPassed,
      error: result.error
    });

    if (testPassed) passed++;
    else failed++;
  }

  // Test XSS protection
  for (const testCase of XSS_PATTERNS) {
    const result = testXSSProtection(testCase.input);
    const testPassed = result.passed && result.sanitized === testCase.expectedOutput;
    
    results.push({
      test: `XSS Protection: ${testCase.name}`,
      passed: testPassed,
      error: result.error
    });

    if (testPassed) passed++;
    else failed++;
  }

  return { passed, failed, results };
}

/**
 * Mock security audit logger for testing
 */
export class MockSecurityAuditLogger {
  private events: any[] = [];

  logEvent(event: any): void {
    this.events.push({
      ...event,
      timestamp: new Date()
    });
  }

  getEvents(): any[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }

  getEventsByType(type: string): any[] {
    return this.events.filter(e => e.eventType === type);
  }
}

/**
 * Create test request object for middleware testing
 */
export function createTestRequest(overrides: Partial<any> = {}): any {
  return {
    method: 'GET',
    path: '/test',
    query: {},
    params: {},
    body: {},
    headers: {},
    ip: '127.0.0.1',
    get: (header: string) => overrides.headers?.[header],
    ...overrides
  };
}

/**
 * Create test response object for middleware testing
 */
export function createTestResponse(): any {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status: function(code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(data: any) {
      this.body = data;
      return this;
    },
    setHeader: function(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    on: function() {
      return this;
    }
  };
  return res;
}
