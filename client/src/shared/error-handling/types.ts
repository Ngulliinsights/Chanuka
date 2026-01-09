/**
 * Unified Error Handling Types
 *
 * Comprehensive type definitions for the cross-system error handling framework.
 * These types ensure consistency across Security, Hooks, Library Services, and Service Architecture.
 */

import { ErrorDomain, ErrorSeverity, RecoveryAction } from './constants';

// ============================================================================
// Core Error Types
// ============================================================================

/**
 * Enhanced error context with cross-system information
 */
export interface ErrorContext {
  component?: string;                    // Component where error originated
  operation?: string;                    // Operation being performed
  userId?: string;                       // User context
  sessionId?: string;                    // Session identifier
  requestId?: string;                    // Request tracking ID
  url?: string;                          // Current URL
  userAgent?: string;                    // Browser information
  retryCount?: number;                   // Number of retry attempts
  route?: string;                        // Current route
  timestamp?: number;                    // Error timestamp
  system?: string;                       // System identifier (security, hooks, library, service)
  subsystem?: string;                    // Subsystem identifier
  correlationId?: string;                // Cross-system correlation ID
  parentErrorId?: string;                // Parent error for error chains
  [key: string]: unknown;                // Additional custom context
}

/**
 * Error metadata for tracking and analysis
 */
export interface ErrorMetadata {
  domain: ErrorDomain;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: ErrorContext;
  retryable: boolean;
  recoverable: boolean;
  correlationId?: string;
  cause?: Error | unknown;
  code: string;
  system: string;                        // System identifier
  version?: string;                      // System version
  environment?: string;                  // Environment (dev, staging, prod)
  tags?: Record<string, string>;         // Additional tags for categorization
}

/**
 * Cross-system error with enhanced context
 */
export interface CrossSystemError extends Error {
  id: string;
  type: ErrorDomain;
  severity: ErrorSeverity;
  code: string;
  statusCode?: number;
  timestamp: number;
  context: ErrorContext;
  metadata: ErrorMetadata;
  system: string;                        // Originating system
  propagated: boolean;                   // Whether error has been propagated
  propagationPath: string[];             // Path the error took through systems
  recoveryAttempts: number;              // Number of recovery attempts
  lastRecoveryStrategy?: string;         // Last recovery strategy attempted
  userMessage?: string;                  // User-friendly error message
  technicalDetails?: string;             // Technical error details
  suggestedActions?: string[];           // Suggested recovery actions
  stack?: string;                        // Stack trace
  cause?: Error;                         // Original error cause
}

// ============================================================================
// Error Recovery Types
// ============================================================================

/**
 * Error recovery action types
 */
export enum ErrorRecoveryAction {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FAIL_FAST = 'fail_fast',
  IGNORE = 'ignore',
  ESCALATE = 'escalate',
  RECOVER = 'recover',
  NOTIFY = 'notify',
}

/**
 * Error recovery strategy configuration
 */
export interface ErrorRecoveryStrategyConfig {
  id: string;
  type: ErrorRecoveryStrategyType;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: RecoveryCondition[];
  parameters: Record<string, unknown>;
  fallbackStrategies?: string[];         // Fallback strategies if this fails
  timeout?: number;                      // Strategy timeout in milliseconds
  maxRetries?: number;                   // Maximum retry attempts
  retryDelay?: number;                   // Delay between retries in milliseconds
  exponentialBackoff?: boolean;          // Whether to use exponential backoff
  circuitBreakerThreshold?: number;      // Circuit breaker failure threshold
  circuitBreakerTimeout?: number;        // Circuit breaker timeout in milliseconds
}

/**
 * Error recovery strategy types
 */
export enum ErrorRecoveryStrategyType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FAIL_FAST = 'fail_fast',
  CACHE_FALLBACK = 'cache_fallback',
  DEGRADED_MODE = 'degraded_mode',
  MANUAL_RECOVERY = 'manual_recovery',
  SYSTEM_RESTART = 'system_restart',
}

/**
 * Recovery condition for strategy selection
 */
export interface RecoveryCondition {
  field: string;                         // Field to check (e.g., 'type', 'severity', 'context.system')
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: unknown;                        // Value to compare against
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  success: boolean;
  action: ErrorRecoveryAction;
  message?: string;
  nextAction?: ErrorRecoveryAction;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  id: string;
  type: ErrorRecoveryStrategyType;
  name: string;
  description: string;
  canRecover(error: CrossSystemError): boolean;
  recover(error: CrossSystemError): Promise<RecoveryResult>;
  getPriority(): number;
  isEnabled(): boolean;
  getTimeout(): number;
  getMaxRetries(): number;
}

// ============================================================================
// Error Propagation Types
// ============================================================================

/**
 * Error propagation modes
 */
export enum ErrorPropagationMode {
  IMMEDIATE = 'immediate',               // Propagate immediately
  BATCHED = 'batched',                   // Batch errors before propagation
  THROTTLED = 'throttled',               // Throttle propagation rate
  FILTERED = 'filtered',                 // Filter errors before propagation
  NONE = 'none',                         // No propagation
}

/**
 * Error propagation context
 */
export interface ErrorPropagationContext {
  sourceSystem: string;                  // System where error originated
  targetSystems: string[];               // Systems to propagate to
  propagationMode: ErrorPropagationMode;
  correlationId: string;                 // Correlation ID for tracking
  timestamp: number;                     // Propagation timestamp
  metadata: Record<string, unknown>;     // Additional propagation metadata
  filters?: ErrorPropagationFilter[];    // Filters to apply
}

/**
 * Error propagation filter
 */
export interface ErrorPropagationFilter {
  type: 'severity' | 'domain' | 'system' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: unknown;
  condition?: (error: CrossSystemError) => boolean;
}

/**
 * Error propagation result
 */
export interface ErrorPropagationResult {
  success: boolean;
  propagatedTo: string[];
  failedSystems: string[];
  error?: Error;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Error Handling Modes
// ============================================================================

/**
 * Error handling modes
 */
export enum ErrorHandlingMode {
  STRICT = 'strict',                     // Strict error handling, no recovery
  RECOVERABLE = 'recoverable',           // Allow recovery strategies
  GRACEFUL = 'graceful',                 // Graceful degradation
  MONITORING_ONLY = 'monitoring_only',   // Only log and monitor
  DISABLED = 'disabled',                 // Disable error handling
}

// ============================================================================
// Error Categories and Severity Levels
// ============================================================================

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  SYSTEM = 'system',                     // System-level errors
  NETWORK = 'network',                   // Network-related errors
  AUTHENTICATION = 'authentication',     // Authentication errors
  AUTHORIZATION = 'authorization',       // Authorization errors
  VALIDATION = 'validation',             // Data validation errors
  BUSINESS_LOGIC = 'business_logic',     // Business rule violations
  INTEGRATION = 'integration',           // Integration errors
  PERFORMANCE = 'performance',           // Performance-related errors
  USER_INPUT = 'user_input',             // User input errors
  CONFIGURATION = 'configuration',       // Configuration errors
  EXTERNAL_SERVICE = 'external_service', // External service errors
  DATABASE = 'database',                 // Database errors
  CACHE = 'cache',                       // Cache-related errors
  FILE_SYSTEM = 'file_system',           // File system errors
}

/**
 * Error severity levels
 */
export enum ErrorSeverityLevel {
  LOW = 'low',                           // Minor issues, no immediate action needed
  MEDIUM = 'medium',                     // Moderate issues, should be addressed
  HIGH = 'high',                         // High priority issues, immediate attention needed
  CRITICAL = 'critical',                 // Critical issues, system may be unstable
  BLOCKER = 'blocker',                   // Blocker issues, system unusable
}

// ============================================================================
// User Context and Messages
// ============================================================================

/**
 * User context for error handling
 */
export interface ErrorUserContext {
  userId?: string;
  userName?: string;
  userRole?: string;
  userPreferences?: Record<string, unknown>;
  sessionData?: Record<string, unknown>;
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screenSize: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

/**
 * User-friendly error message
 */
export interface ErrorUserMessage {
  title: string;                         // Error title for display
  description: string;                   // Detailed description
  suggestedActions: string[];            // List of suggested actions
  technicalDetails?: string;             // Technical details (optional)
  estimatedResolutionTime?: string;      // Estimated time to resolve
  contactSupport?: boolean;              // Whether to show support contact
  supportLink?: string;                  // Link to support resources
  recoverySteps?: string[];              // Step-by-step recovery instructions
}

// ============================================================================
// System Context
// ============================================================================

/**
 * System context for error handling
 */
export interface ErrorSystemContext {
  systemName: string;                    // Name of the system
  systemVersion: string;                 // Version of the system
  environment: string;                   // Environment (dev, staging, prod)
  dependencies: string[];                // System dependencies
  configuration: Record<string, unknown>; // System configuration
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: Date;
  uptime: number;                        // System uptime in milliseconds
}

// ============================================================================
// Circuit Breaker Configuration
// ============================================================================

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;              // Number of failures before opening
  recoveryTimeout: number;               // Time to wait before attempting recovery
  halfOpenMaxCalls: number;              // Max calls allowed in half-open state
  monitoringPeriod: number;              // Time window for failure counting
  errorThresholdPercentage: number;      // Percentage of errors to trigger circuit breaker
  enabled: boolean;                      // Whether circuit breaker is enabled
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',                     // Normal operation
  OPEN = 'open',                         // Circuit breaker open, blocking calls
  HALF_OPEN = 'half_open',               // Testing if service is recovered
}

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;                    // Maximum number of retry attempts
  baseDelay: number;                     // Base delay between retries in milliseconds
  maxDelay: number;                      // Maximum delay between retries
  backoffMultiplier: number;             // Multiplier for exponential backoff
  jitter: boolean;                       // Whether to add random jitter
  retryableErrors: string[];             // List of error codes that are retryable
  nonRetryableErrors: string[];          // List of error codes that are not retryable
  enabled: boolean;                      // Whether retry is enabled
}

// ============================================================================
// Fallback Configuration
// ============================================================================

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  enabled: boolean;                      // Whether fallback is enabled
  fallbackData?: unknown;                // Static fallback data
  fallbackFunction?: () => Promise<unknown>; // Function to generate fallback data
  fallbackTimeout: number;               // Timeout for fallback operations
  cacheFallback: boolean;                // Whether to cache fallback results
  cacheTTL: number;                      // Time to live for cached fallbacks
}

// ============================================================================
// Fail-Fast Configuration
// ============================================================================

/**
 * Fail-fast configuration
 */
export interface FailFastConfig {
  enabled: boolean;                      // Whether fail-fast is enabled
  failureThreshold: number;              // Number of consecutive failures before failing fast
  monitoringWindow: number;              // Time window for counting failures
  recoveryCheckInterval: number;         // Interval to check if system has recovered
  maxFailuresPerMinute: number;          // Maximum failures allowed per minute
}

// ============================================================================
// Error Handling Configuration
// ============================================================================

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  mode: ErrorHandlingMode;               // Error handling mode
  propagationMode: ErrorPropagationMode; // Error propagation mode
  recoveryEnabled: boolean;              // Whether recovery is enabled
  monitoringEnabled: boolean;            // Whether monitoring is enabled
  userMessagesEnabled: boolean;          // Whether user messages are enabled
  circuitBreaker: CircuitBreakerConfig;  // Circuit breaker configuration
  retry: RetryConfig;                    // Retry configuration
  fallback: FallbackConfig;              // Fallback configuration
  failFast: FailFastConfig;              // Fail-fast configuration
  systems: string[];                     // List of systems to handle errors for
  defaultRecoveryStrategies: string[];   // Default recovery strategies
  errorReporting: {
    enabled: boolean;
    endpoints: string[];
    batchSize: number;
    flushInterval: number;
  };
  userContext: ErrorUserContext;         // Default user context
  systemContext: ErrorSystemContext;     // Default system context
}

// ============================================================================
// Error Analytics and Monitoring
// ============================================================================

/**
 * Error analytics configuration
 */
export interface ErrorAnalyticsConfig {
  enabled: boolean;                      // Whether analytics is enabled
  collectionInterval: number;            // Interval for collecting metrics
  retentionPeriod: number;               // Data retention period in days
  aggregationEnabled: boolean;           // Whether to aggregate error data
  trendAnalysisEnabled: boolean;         // Whether to perform trend analysis
  alertThresholds: {
    errorRate: number;                   // Error rate threshold for alerts
    errorCount: number;                  // Error count threshold for alerts
    responseTime: number;                // Response time threshold for alerts
  };
  backends: string[];                    // Analytics backends to use
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  totalErrors: number;                   // Total number of errors
  errorRate: number;                     // Error rate percentage
  errorByType: Record<string, number>;   // Errors by type
  errorBySeverity: Record<string, number>; // Errors by severity
  errorBySystem: Record<string, number>; // Errors by system
  recoverySuccessRate: number;           // Recovery success rate
  averageRecoveryTime: number;           // Average time to recover
  topErrors: Array<{
    message: string;
    count: number;
    lastSeen: Date;
  }>;
  performanceImpact: {
    avgResponseTime: number;
    errorResponseTime: number;
    impactScore: number;                 // 0-100 impact score
  };
}

// ============================================================================
// Middleware Configuration
// ============================================================================

/**
 * Error handling middleware configuration
 */
export interface MiddlewareConfig {
  order: number;                         // Middleware execution order
  enabled: boolean;                      // Whether middleware is enabled
  systems: string[];                     // Systems this middleware applies to
  errorTypes: ErrorDomain[];             // Error types this middleware handles
  parameters: Record<string, unknown>;   // Middleware-specific parameters
}

/**
 * Middleware chain configuration
 */
export interface MiddlewareChainConfig {
  name: string;                          // Chain name
  middlewares: MiddlewareConfig[];       // Ordered list of middleware
  enabled: boolean;                      // Whether chain is enabled
  errorHandlingMode: ErrorHandlingMode;  // Error handling mode for this chain
}

// ============================================================================
// Integration Configuration
// ============================================================================

/**
 * System integration configuration
 */
export interface SystemIntegrationConfig {
  systemName: string;                    // Name of the system
  integrationType: 'security' | 'hooks' | 'library' | 'service';
  errorMapping: Record<string, string>;  // Map system-specific errors to standard errors
  recoveryStrategies: string[];          // Recovery strategies for this system
  propagationEnabled: boolean;           // Whether to propagate errors from this system
  monitoringEnabled: boolean;            // Whether to monitor errors from this system
  userMessagesEnabled: boolean;          // Whether to show user messages for this system
}

// ============================================================================
// Testing and Simulation
// ============================================================================

/**
 * Error simulation configuration
 */
export interface ErrorSimulationConfig {
  enabled: boolean;                      // Whether simulation is enabled
  errorRate: number;                     // Percentage of operations that should fail
  errorTypes: ErrorDomain[];             // Types of errors to simulate
  systems: string[];                     // Systems to simulate errors for
  duration: number;                      // Duration of simulation in milliseconds
  recoveryEnabled: boolean;              // Whether recovery should be simulated
}

/**
 * Error test configuration
 */
export interface ErrorTestConfig {
  testSuite: string;                     // Name of the test suite
  scenarios: ErrorTestScenario[];        // Test scenarios
  assertions: ErrorTestAssertion[];      // Test assertions
  cleanup: boolean;                      // Whether to clean up after tests
}

/**
 * Error test scenario
 */
export interface ErrorTestScenario {
  name: string;                          // Scenario name
  description: string;                   // Scenario description
  errorType: ErrorDomain;                // Type of error to test
  severity: ErrorSeverity;               // Severity of error
  recoveryStrategy: string;              // Recovery strategy to test
  expectedOutcome: 'success' | 'failure' | 'partial'; // Expected outcome
  timeout: number;                       // Test timeout in milliseconds
}

/**
 * Error test assertion
 */
export interface ErrorTestAssertion {
  type: 'error_handled' | 'recovery_success' | 'propagation_success' | 'user_message_displayed';
  description: string;                   // Assertion description
  expected: unknown;                     // Expected value
  actual: unknown;                       // Actual value
  passed: boolean;                       // Whether assertion passed
}
