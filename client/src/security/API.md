# Unified Security System API Documentation

## Core Interfaces

### UnifiedSecurityConfig
```typescript
interface UnifiedSecurityConfig {
  csp: {
    enabled: boolean;
    reportOnly: boolean;
    directives: CSPDirectives;
    nonce?: string;
  };
  inputSanitization: {
    enabled: boolean;
    mode: 'basic' | 'comprehensive';
    allowedTags: string[];
    allowedAttributes: Record<string, string[]>;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  errorHandling: {
    mode: 'strict' | 'permissive';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    reportToBackend: boolean;
  };
}
```

### SecurityComponent
```typescript
interface SecurityComponent {
  initialize(config: UnifiedSecurityConfig): Promise<void>;
  shutdown(): Promise<void>;
  getHealthStatus(): SecurityHealth;
  getMetrics(): SecurityMetrics;
}
```

## CSP Manager API

### UnifiedCSPManager
```typescript
class UnifiedCSPManager implements SecurityComponent {
  constructor(config: CSPConfig);

  // Initialize CSP with configuration
  async initialize(config: UnifiedSecurityConfig): Promise<void>;

  // Get current CSP header
  generateCSPHeader(): string;

  // Get current nonce
  getCurrentNonce(): string;

  // Refresh nonce
  refreshNonce(): string;

  // Handle CSP violations
  handleViolation(violation: CSPViolation): void;

  // Get violation history
  getViolations(): CSPViolation[];

  // Clear violation history
  clearViolations(): void;

  // Check if a source is allowed by current policy
  isSourceAllowed(directive: string, source: string): boolean;

  // Get health status
  getHealthStatus(): SecurityHealth;

  // Get metrics
  getMetrics(): SecurityMetrics;

  // Shutdown the CSP manager
  async shutdown(): Promise<void>;
}
```

### CSP Configuration
```typescript
interface CSPConfig {
  enabled: boolean;
  reportOnly: boolean;
  directives: CSPDirectives;
  nonce?: string;
  reportUri: string;
}

interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'media-src': string[];
  'object-src': string[];
  'child-src': string[];
  'worker-src': string[];
  'frame-src': string[];
  'form-action': string[];
  'frame-ancestors': string[];
  'base-uri': string[];
  'upgrade-insecure-requests'?: string[];
  'block-all-mixed-content'?: string[];
}
```

## Input Sanitizer API

### UnifiedInputSanitizer
```typescript
class UnifiedInputSanitizer implements SecurityComponent {
  constructor(config: InputSanitizationConfig);

  // Sanitize input with options
  async sanitize(
    input: string, 
    options?: SanitizationOptions
  ): Promise<SanitizationResult>;

  // Sanitize HTML content
  async sanitizeHTML(input: string, options?: SanitizationOptions): Promise<SanitizationResult>;

  // Sanitize plain text input
  async sanitizeText(input: string, options?: SanitizationOptions): Promise<SanitizationResult>;

  // Sanitize URL
  async sanitizeURL(url: string): Promise<SanitizationResult>;

  // Batch sanitize multiple inputs
  async sanitizeBatch(
    inputs: Record<string, string>,
    type?: 'html' | 'text' | 'url'
  ): Promise<Record<string, SanitizationResult>>;

  // Check if input is safe without sanitization
  isSafe(input: string, type?: 'html' | 'text' | 'url'): boolean;

  // Perform security check without sanitization
  performSecurityCheck(input: string): boolean;

  // Get sanitizer statistics
  getStats(): {
    threatsDetected: number;
    criticalThreats: number;
    sanitizationsPerformed: number;
  };

  // Get health status
  getHealthStatus(): SecurityHealth;

  // Get metrics
  getMetrics(): SecurityMetrics;

  // Shutdown the sanitizer
  async shutdown(): Promise<void>;
}
```

### Input Sanitization Configuration
```typescript
interface InputSanitizationConfig {
  enabled: boolean;
  mode: 'basic' | 'comprehensive';
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedSchemes?: string[];
  maxLength?: number;
  stripUnknownTags?: boolean;
}

interface SanitizationOptions {
  mode?: 'basic' | 'comprehensive' | 'auto';
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
}

interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  threats: ThreatDetection[];
  removedElements: string[];
  removedAttributes: string[];
}

interface ThreatDetection {
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  originalContent: string;
  location?: string;
}

type ThreatType =
  | 'script_injection'
  | 'html_injection'
  | 'attribute_injection'
  | 'url_injection'
  | 'css_injection'
  | 'data_uri_abuse'
  | 'protocol_violation'
  | 'suspicious_pattern';
```

## Rate Limiter API

### RateLimiter (from client/src/security/rate-limiter.ts)
```typescript
class RateLimiter {
  constructor(maxAttempts?: number, windowMs?: number);

  // Check if request is allowed
  checkLimit(key: string, configName: string): RateLimitResult;

  // Increment usage counter
  increment(key: string, configName: string): void;

  // Reset usage for key
  reset(key: string, configName: string): void;

  // Get current usage
  getUsage(key: string, configName: string): RateLimitUsage;

  // Block user temporarily
  blockUser(key: string, duration: number): void;

  // Unblock user
  unblockUser(key: string): void;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked?: boolean;
  reason?: string;
}

interface RateLimitUsage {
  count: number;
  windowStart: number;
  windowEnd: number;
}
```

## Error Handler API

### SecurityErrorHandler
```typescript
class SecurityErrorHandler {
  constructor(config: ErrorHandlingConfig);

  // Handle security error
  handleSecurityError(error: SecurityError): SecurityErrorResult;

  // Create security error
  createError(
    type: SecurityErrorType,
    message: string,
    component: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ): SecurityError;

  // Report error to backend
  reportToBackend(error: SecurityErrorResult): Promise<void>;

  // Get error statistics
  getErrorStatistics(): ErrorStatistics;

  // Get error summary
  getErrorSummary(): {
    totalErrors: number;
    criticalErrors: number;
    highSeverityErrors: number;
    errorRate: number;
    topErrorTypes: Array<{ type: SecurityErrorType; count: number }>;
  };

  // Subscribe to error notifications
  onError(callback: (error: SecurityErrorResult) => void): () => void;

  // Clear error statistics
  clearStatistics(): void;

  // Check if error handling is healthy
  isHealthy(): boolean;

  // Get health status
  getHealthStatus(): SecurityHealth;

  // Get metrics
  getMetrics(): SecurityMetrics;

  // Shutdown the error handler
  async shutdown(): Promise<void>;
}
```

### Security Error Factory
```typescript
class SecurityErrorFactory {
  // Create standardized security error
  static createError(
    type: SecurityErrorType,
    message: string,
    component: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ): SecurityError;
}

class SecurityOperationError extends Error {
  constructor(
    public securityError: SecurityError,
    public errorResult: SecurityErrorResult
  );
}

enum SecurityErrorType {
  CSP_VIOLATION = 'csp_violation',
  INPUT_VALIDATION_FAILED = 'input_validation_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  AUTHENTICATION_FAILED = 'authentication_failed',
  CSRF_TOKEN_INVALID = 'csrf_token_invalid',
  VULNERABILITY_DETECTED = 'vulnerability_detected',
  CONFIGURATION_ERROR = 'configuration_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
}

interface SecurityError {
  type: SecurityErrorType;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  originalError?: Error;
}

interface SecurityErrorResult {
  id: string;
  error: SecurityError;
  handled: boolean;
  reported: boolean;
  suggestedAction?: string;
}

interface ErrorHandlingConfig {
  mode: 'strict' | 'permissive';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  reportToBackend: boolean;
}

interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<SecurityErrorType, number>;
  errorsBySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
  lastErrorTime: Date | null;
  averageResolutionTime: number;
}
```

## Error Middleware API

### SecurityErrorMiddleware
```typescript
class SecurityErrorMiddleware {
  constructor(config: ErrorHandlingConfig);

  // Handle security operation with error handling
  async handleSecurityOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: string
  ): Promise<T>;

  // Wrap a function with error handling
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationName: string,
    component: string
  ): T;

  // Handle batch operations with error handling
  async handleBatchOperation<T>(
    operations: Array<() => Promise<T>>,
    operationName: string,
    component: string
  ): Promise<Array<T | Error>>;

  // Handle retryable operations
  async handleRetryableOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: string,
    maxRetries?: number,
    retryDelay?: number
  ): Promise<T>;

  // Get error statistics
  getErrorStatistics(): ErrorStatistics;

  // Get error summary
  getErrorSummary(): {
    totalErrors: number;
    criticalErrors: number;
    highSeverityErrors: number;
    errorRate: number;
    topErrorTypes: Array<{ type: SecurityErrorType; count: number }>;
  };

  // Subscribe to error notifications
  onError(callback: (error: SecurityErrorResult) => void): () => void;

  // Get health status
  getHealthStatus(): SecurityHealth;

  // Get metrics
  getMetrics(): SecurityMetrics;

  // Shutdown the middleware
  async shutdown(): Promise<void>;
}
```

## Health and Metrics API

### SecurityHealth
```typescript
interface SecurityHealth {
  enabled: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  issues: string[];
}
```

### SecurityMetrics
```typescript
interface SecurityMetrics {
  requestsProcessed: number;
  threatsBlocked: number;
  averageResponseTime: number;
  errorRate: number;
}
```

## Usage Examples

### Basic Usage
```typescript
import { 
  UnifiedCSPManager, 
  UnifiedInputSanitizer, 
  SecurityErrorHandler,
  STANDARD_CSP_CONFIG 
} from '@client/security/unified';

// Initialize CSP Manager
const cspManager = new UnifiedCSPManager({
  enabled: true,
  reportOnly: false,
  directives: STANDARD_CSP_CONFIG.production,
  reportUri: '/api/security/csp-violations',
});

await cspManager.initialize();

// Initialize Input Sanitizer
const sanitizer = new UnifiedInputSanitizer({
  enabled: true,
  mode: 'comprehensive',
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
  allowedAttributes: { a: ['href', 'target'] },
});

await sanitizer.initialize();

// Initialize Error Handler
const errorHandler = new SecurityErrorHandler({
  mode: 'strict',
  logLevel: 'info',
  reportToBackend: true,
});

// Use security components
const userInput = '<script>alert("xss")</script>';
const result = await sanitizer.sanitize(userInput);
console.log('Sanitized:', result.sanitized);
console.log('Threats detected:', result.threats.length);

// Check health status
const health = cspManager.getHealthStatus();
console.log('CSP Status:', health.status);

// Get metrics
const metrics = sanitizer.getMetrics();
console.log('Threats blocked:', metrics.threatsBlocked);
```

### Advanced Usage
```typescript
import { SecurityErrorMiddleware } from '@client/security/unified';

// Create error middleware
const errorMiddleware = new SecurityErrorMiddleware({
  mode: 'strict',
  logLevel: 'info',
  reportToBackend: true,
});

// Wrap security operations
const secureSanitize = errorMiddleware.wrap(
  sanitizer.sanitize.bind(sanitizer),
  'input-sanitization',
  'UserService'
);

// Use wrapped function
try {
  const result = await secureSanitize(userInput);
  console.log('Success:', result.sanitized);
} catch (error) {
  console.error('Security operation failed:', error);
}

// Handle batch operations
const inputs = {
  title: '<script>alert("xss")</script>Safe Title',
  content: '<p>Safe content</p>',
  url: 'https://example.com',
};

const results = await errorMiddleware.handleBatchOperation(
  Object.values(inputs).map(input => () => sanitizer.sanitize(input)),
  'batch-sanitization',
  'ContentService'
);

// Handle retryable operations
const retryableOperation = async () => {
  // Operation that might fail
  return await someSecurityOperation();
};

const result = await errorMiddleware.handleRetryableOperation(
  retryableOperation,
  'retryable-operation',
  'SecurityService',
  3, // max retries
  1000 // retry delay
);
```

### Configuration Examples
```typescript
// Development configuration
const devConfig: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: true,
    directives: STANDARD_CSP_CONFIG.development,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive',
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'script'], // Allow script for HMR
  },
  rateLimiting: {
    enabled: false,
    windowMs: 60000,
    maxRequests: 1000,
  },
  errorHandling: {
    mode: 'permissive',
    logLevel: 'debug',
    reportToBackend: false,
  },
};

// Production configuration
const prodConfig: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: STANDARD_CSP_CONFIG.production,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive',
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
  },
  rateLimiting: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 100,
  },
  errorHandling: {
    mode: 'strict',
    logLevel: 'warn',
    reportToBackend: true,
  },
};
```

### Error Handling Patterns
```typescript
// Pattern 1: Try-catch with security error handling
try {
  const result = await secureOperation();
  return result;
} catch (error) {
  if (error instanceof SecurityOperationError) {
    console.error('Security error occurred:', error.securityError);
    // Handle security-specific error
    return { success: false, error: 'Security validation failed' };
  } else {
    console.error('Unexpected error:', error);
    // Handle general error
    return { success: false, error: 'Operation failed' };
  }
}

// Pattern 2: Error callback subscription
const unsubscribe = errorHandler.onError((error) => {
  console.warn('Security error detected:', error.error.message);
  
  if (error.error.severity === 'critical') {
    // Take immediate action for critical errors
    alert('Critical security issue detected!');
  }
});

// Unsubscribe when no longer needed
// unsubscribe();

// Pattern 3: Error statistics monitoring
setInterval(() => {
  const stats = errorHandler.getErrorStatistics();
  const summary = errorHandler.getErrorSummary();
  
  if (summary.criticalErrors > 10) {
    console.error('High number of critical errors detected!');
    // Alert monitoring system
  }
}, 60000); // Check every minute
```

This comprehensive API documentation provides all the necessary information for implementing and using the unified security system effectively.
