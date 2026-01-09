/**
 * Unified Error Handling Constants
 *
 * Centralized constants for the cross-system error handling framework.
 * These constants ensure consistency across Security, Hooks, Library Services, and Service Architecture.
 */

// ============================================================================
// Error Domains (Extended from core)
// ============================================================================

export enum ErrorDomain {
  SYSTEM = 'system',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  USER_INPUT = 'user_input',
  CONFIGURATION = 'configuration',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  CACHE = 'cache',
  FILE_SYSTEM = 'file_system',
  SECURITY = 'security',
  HOOKS = 'hooks',
  LIBRARY_SERVICES = 'library_services',
  SERVICE_ARCHITECTURE = 'service_architecture',
  CROSS_SYSTEM = 'cross_system',
  UNKNOWN = 'unknown',
}

// ============================================================================
// Error Severity Levels (Extended from core)
// ============================================================================

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  BLOCKER = 'blocker',
}

// ============================================================================
// Recovery Actions (Extended from core)
// ============================================================================

export enum RecoveryAction {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FAIL_FAST = 'fail_fast',
  IGNORE = 'ignore',
  ESCALATE = 'escalate',
  RECOVER = 'recover',
  NOTIFY = 'notify',
  CACHE_CLEAR = 'cache_clear',
  PAGE_RELOAD = 'page_reload',
  REDIRECT = 'redirect',
  DEGRADED_MODE = 'degraded_mode',
  MANUAL_RECOVERY = 'manual_recovery',
}

// ============================================================================
// Error Propagation Modes
// ============================================================================

export enum ErrorPropagationMode {
  IMMEDIATE = 'immediate',               // Propagate immediately
  BATCHED = 'batched',                   // Batch errors before propagation
  THROTTLED = 'throttled',               // Throttle propagation rate
  FILTERED = 'filtered',                 // Filter errors before propagation
  NONE = 'none',                         // No propagation
}

// ============================================================================
// Error Handling Modes
// ============================================================================

export enum ErrorHandlingMode {
  STRICT = 'strict',                     // Strict error handling, no recovery
  RECOVERABLE = 'recoverable',           // Allow recovery strategies
  GRACEFUL = 'graceful',                 // Graceful degradation
  MONITORING_ONLY = 'monitoring_only',   // Only log and monitor
  DISABLED = 'disabled',                 // Disable error handling
}

// ============================================================================
// Error Recovery Strategy Types
// ============================================================================

export enum ErrorRecoveryStrategyType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FAIL_FAST = 'fail_fast',
  CACHE_FALLBACK = 'cache_fallback',
  DEGRADED_MODE = 'degraded_mode',
  MANUAL_RECOVERY = 'manual_recovery',
  SYSTEM_RESTART = 'system_restart',
  NETWORK_RETRY = 'network_retry',
  AUTH_REFRESH = 'auth_refresh',
  PAGE_RELOAD = 'page_reload',
  CACHE_CLEAR = 'cache_clear',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  OFFLINE_MODE = 'offline_mode',
  REDUCED_FUNCTIONALITY = 'reduced_functionality',
}

// ============================================================================
// Circuit Breaker States
// ============================================================================

export enum CircuitBreakerState {
  CLOSED = 'closed',                     // Normal operation
  OPEN = 'open',                         // Circuit breaker open, blocking calls
  HALF_OPEN = 'half_open',               // Testing if service is recovered
}

// ============================================================================
// Error Categories
// ============================================================================

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
  SECURITY = 'security',                 // Security-related errors
  HOOKS = 'hooks',                       // Hooks-related errors
  LIBRARY_SERVICES = 'library_services', // Library services errors
  SERVICE_ARCHITECTURE = 'service_architecture', // Service architecture errors
  CROSS_SYSTEM = 'cross_system',         // Cross-system errors
}

// ============================================================================
// Error Severity Levels (Extended)
// ============================================================================

export enum ErrorSeverityLevel {
  LOW = 'low',                           // Minor issues, no immediate action needed
  MEDIUM = 'medium',                     // Moderate issues, should be addressed
  HIGH = 'high',                         // High priority issues, immediate attention needed
  CRITICAL = 'critical',                 // Critical issues, system may be unstable
  BLOCKER = 'blocker',                   // Blocker issues, system unusable
}

// ============================================================================
// System Identifiers
// ============================================================================

export enum SystemIdentifier {
  SECURITY = 'security',
  HOOKS = 'hooks',
  LIBRARY_SERVICES = 'library_services',
  SERVICE_ARCHITECTURE = 'service_architecture',
  CORE = 'core',
  SHARED = 'shared',
  CLIENT = 'client',
  SERVER = 'server',
  BROWSER = 'browser',
  MOBILE = 'mobile',
}

// ============================================================================
// Recovery Condition Operators
// ============================================================================

export enum RecoveryConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  MATCHES = 'matches',
}

// ============================================================================
// Error Analytics Event Types
// ============================================================================

export enum ErrorAnalyticsEventType {
  ERROR_OCCURRED = 'error_occurred',
  ERROR_RECOVERED = 'error_recovered',
  ERROR_PROPAGATED = 'error_propagated',
  RECOVERY_ATTEMPTED = 'recovery_attempted',
  RECOVERY_SUCCESS = 'recovery_success',
  RECOVERY_FAILURE = 'recovery_failure',
  CIRCUIT_BREAKER_OPENED = 'circuit_breaker_opened',
  CIRCUIT_BREAKER_CLOSED = 'circuit_breaker_closed',
  CIRCUIT_BREAKER_HALF_OPEN = 'circuit_breaker_half_open',
  FALLBACK_USED = 'fallback_used',
  RETRY_ATTEMPTED = 'retry_attempted',
  RETRY_SUCCESS = 'retry_success',
  RETRY_FAILURE = 'retry_failure',
  USER_MESSAGE_DISPLAYED = 'user_message_displayed',
  ERROR_MONITORING_ALERT = 'error_monitoring_alert',
}

// ============================================================================
// Error Monitoring Alert Types
// ============================================================================

export enum ErrorMonitoringAlertType {
  ERROR_RATE_THRESHOLD = 'error_rate_threshold',
  ERROR_COUNT_THRESHOLD = 'error_count_threshold',
  RESPONSE_TIME_THRESHOLD = 'response_time_threshold',
  SYSTEM_HEALTH_DEGRADED = 'system_health_degraded',
  CIRCUIT_BREAKER_OPENED = 'circuit_breaker_opened',
  RECOVERY_FAILURE_RATE_HIGH = 'recovery_failure_rate_high',
  CROSS_SYSTEM_ERROR_SPIKE = 'cross_system_error_spike',
  CRITICAL_ERROR_DETECTED = 'critical_error_detected',
}

// ============================================================================
// Error Propagation Filters
// ============================================================================

export enum ErrorPropagationFilterType {
  SEVERITY = 'severity',
  DOMAIN = 'domain',
  SYSTEM = 'system',
  CUSTOM = 'custom',
  CATEGORY = 'category',
  TIMESTAMP = 'timestamp',
  USER_CONTEXT = 'user_context',
  SYSTEM_CONTEXT = 'system_context',
}

// ============================================================================
// Middleware Types
// ============================================================================

export enum MiddlewareType {
  ERROR_CAPTURE = 'error_capture',
  ERROR_TRANSFORM = 'error_transform',
  ERROR_RECOVERY = 'error_recovery',
  ERROR_PROPAGATION = 'error_propagation',
  ERROR_MONITORING = 'error_monitoring',
  ERROR_USER_MESSAGE = 'error_user_message',
  ERROR_ANALYTICS = 'error_analytics',
  ERROR_REPORTING = 'error_reporting',
}

// ============================================================================
// Integration Types
// ============================================================================

export enum IntegrationType {
  SECURITY = 'security',
  HOOKS = 'hooks',
  LIBRARY_SERVICES = 'library_services',
  SERVICE_ARCHITECTURE = 'service_architecture',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  CACHE = 'cache',
  FILE_SYSTEM = 'file_system',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
}

// ============================================================================
// Default Configuration Values
// ============================================================================

export const DEFAULT_ERROR_HANDLING_CONFIG = {
  mode: ErrorHandlingMode.RECOVERABLE,
  propagationMode: ErrorPropagationMode.IMMEDIATE,
  recoveryEnabled: true,
  monitoringEnabled: true,
  userMessagesEnabled: true,
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    halfOpenMaxCalls: 3,
    monitoringPeriod: 60000,
    errorThresholdPercentage: 50,
    enabled: true,
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'],
    nonRetryableErrors: ['AUTH_ERROR', 'VALIDATION_ERROR', 'NOT_FOUND'],
    enabled: true,
  },
  fallback: {
    enabled: true,
    fallbackTimeout: 5000,
    cacheFallback: true,
    cacheTTL: 300000, // 5 minutes
  },
  failFast: {
    enabled: true,
    failureThreshold: 10,
    monitoringWindow: 60000, // 1 minute
    recoveryCheckInterval: 30000, // 30 seconds
    maxFailuresPerMinute: 20,
  },
  systems: [
    SystemIdentifier.SECURITY,
    SystemIdentifier.HOOKS,
    SystemIdentifier.LIBRARY_SERVICES,
    SystemIdentifier.SERVICE_ARCHITECTURE,
  ],
  defaultRecoveryStrategies: [
    ErrorRecoveryStrategyType.RETRY,
    ErrorRecoveryStrategyType.FALLBACK,
    ErrorRecoveryStrategyType.CACHE_FALLBACK,
  ],
  errorReporting: {
    enabled: true,
    endpoints: [],
    batchSize: 10,
    flushInterval: 5000,
  },
};

// ============================================================================
// Error Message Templates
// ============================================================================

export const ERROR_MESSAGE_TEMPLATES = {
  NETWORK_ERROR: {
    title: 'Connection Problem',
    description: 'We\'re having trouble connecting to our servers. Please check your internet connection and try again.',
    suggestedActions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Contact support if the problem persists',
    ],
  },
  AUTHENTICATION_ERROR: {
    title: 'Authentication Required',
    description: 'You need to sign in to access this feature.',
    suggestedActions: [
      'Sign in to your account',
      'Check if your session has expired',
      'Try clearing your browser cache',
    ],
  },
  AUTHORIZATION_ERROR: {
    title: 'Access Denied',
    description: 'You don\'t have permission to access this resource.',
    suggestedActions: [
      'Contact your administrator',
      'Check your account permissions',
      'Try accessing a different resource',
    ],
  },
  VALIDATION_ERROR: {
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
    suggestedActions: [
      'Review the form fields',
      'Check for required fields',
      'Ensure data format is correct',
    ],
  },
  SYSTEM_ERROR: {
    title: 'System Error',
    description: 'We\'re experiencing a technical issue. Our team has been notified.',
    suggestedActions: [
      'Try again in a few minutes',
      'Contact support for assistance',
      'Check our status page for updates',
    ],
  },
  PERFORMANCE_ERROR: {
    title: 'Slow Response',
    description: 'The system is responding slowly. Please wait while we process your request.',
    suggestedActions: [
      'Wait a moment and try again',
      'Try reducing the amount of data',
      'Contact support if the issue continues',
    ],
  },
  CACHE_ERROR: {
    title: 'Data Unavailable',
    description: 'We\'re unable to retrieve cached data. This may affect performance.',
    suggestedActions: [
      'Try refreshing the page',
      'Wait a moment and try again',
      'Contact support if the issue persists',
    ],
  },
  DATABASE_ERROR: {
    title: 'Database Error',
    description: 'We\'re having trouble accessing our database. Please try again later.',
    suggestedActions: [
      'Wait a few minutes and try again',
      'Contact support if the problem continues',
      'Check our status page for updates',
    ],
  },
};

// ============================================================================
// Error Recovery Strategy Priorities
// ============================================================================

export const RECOVERY_STRATEGY_PRIORITIES = {
  [ErrorRecoveryStrategyType.RETRY]: 1,
  [ErrorRecoveryStrategyType.CACHE_FALLBACK]: 2,
  [ErrorRecoveryStrategyType.FALLBACK]: 3,
  [ErrorRecoveryStrategyType.GRACEFUL_DEGRADATION]: 4,
  [ErrorRecoveryStrategyType.OFFLINE_MODE]: 5,
  [ErrorRecoveryStrategyType.REDUCED_FUNCTIONALITY]: 6,
  [ErrorRecoveryStrategyType.PAGE_RELOAD]: 7,
  [ErrorRecoveryStrategyType.AUTH_REFRESH]: 8,
  [ErrorRecoveryStrategyType.CACHE_CLEAR]: 9,
  [ErrorRecoveryStrategyType.MANUAL_RECOVERY]: 10,
  [ErrorRecoveryStrategyType.SYSTEM_RESTART]: 11,
};

// ============================================================================
// Error Monitoring Thresholds
// ============================================================================

export const ERROR_MONITORING_THRESHOLDS = {
  ERROR_RATE: 5,                        // 5% error rate threshold
  ERROR_COUNT: 100,                     // 100 errors per time window
  RESPONSE_TIME: 5000,                  // 5 seconds response time threshold
  RECOVERY_FAILURE_RATE: 20,            // 20% recovery failure rate
  CIRCUIT_BREAKER_FAILURES: 5,          // 5 consecutive failures
  SYSTEM_HEALTH_SCORE: 70,              // 70% health score threshold
};

// ============================================================================
// Error Context Keys
// ============================================================================

export const ERROR_CONTEXT_KEYS = {
  COMPONENT: 'component',
  OPERATION: 'operation',
  USER_ID: 'userId',
  SESSION_ID: 'sessionId',
  REQUEST_ID: 'requestId',
  URL: 'url',
  USER_AGENT: 'userAgent',
  RETRY_COUNT: 'retryCount',
  ROUTE: 'route',
  TIMESTAMP: 'timestamp',
  SYSTEM: 'system',
  SUBSYSTEM: 'subsystem',
  CORRELATION_ID: 'correlationId',
  PARENT_ERROR_ID: 'parentErrorId',
  ERROR_CHAIN: 'errorChain',
  USER_ROLE: 'userRole',
  DEVICE_TYPE: 'deviceType',
  BROWSER_INFO: 'browserInfo',
  OS_INFO: 'osInfo',
  ENVIRONMENT: 'environment',
  VERSION: 'version',
  DEPENDENCIES: 'dependencies',
  CONFIGURATION: 'configuration',
  HEALTH_STATUS: 'healthStatus',
  UPTIME: 'uptime',
};

// ============================================================================
// Error Metadata Keys
// ============================================================================

export const ERROR_METADATA_KEYS = {
  DOMAIN: 'domain',
  SEVERITY: 'severity',
  TIMESTAMP: 'timestamp',
  CONTEXT: 'context',
  RETRYABLE: 'retryable',
  RECOVERABLE: 'recoverable',
  CORRELATION_ID: 'correlationId',
  CAUSE: 'cause',
  CODE: 'code',
  SYSTEM: 'system',
  VERSION: 'version',
  ENVIRONMENT: 'environment',
  TAGS: 'tags',
  STACK_TRACE: 'stackTrace',
  USER_MESSAGE: 'userMessage',
  TECHNICAL_DETAILS: 'technicalDetails',
  SUGGESTED_ACTIONS: 'suggestedActions',
  PROPAGATION_PATH: 'propagationPath',
  RECOVERY_ATTEMPTS: 'recoveryAttempts',
  LAST_RECOVERY_STRATEGY: 'lastRecoveryStrategy',
};
