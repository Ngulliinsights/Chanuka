/**
 * Service Error Hierarchy and Error Handling Framework
 *
 * Provides a comprehensive error handling system for all services with:
 * - Hierarchical error types for better error categorization
 * - Consistent error handling patterns across services
 * - Error recovery strategies and retry mechanisms
 * - Error logging and monitoring integration
 */

// ============================================================================
// BASE ERROR CLASSES
// ============================================================================

/**
 * Base class for all service errors
 * Provides common error properties and methods
 */
export abstract class ServiceError extends Error {
  public readonly timestamp: Date;
  public readonly service: string;
  public readonly operation?: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    service: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.service = service;
    this.operation = operation;
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Convert error to serializable object for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      service: this.service,
      operation: this.operation,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }
}

// ============================================================================
// AUTHENTICATION ERRORS
// ============================================================================

export class AuthenticationError extends ServiceError {
  constructor(
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'AuthService', operation, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ServiceError {
  constructor(
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'AuthService', operation, context);
    this.name = 'AuthorizationError';
  }
}

export class TokenExpiredError extends ServiceError {
  constructor(
    message = 'Authentication token has expired',
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'AuthService', operation, context);
    this.name = 'TokenExpiredError';
  }
}

export class TwoFactorRequiredError extends ServiceError {
  constructor(
    message = 'Two-factor authentication required',
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'AuthService', operation, context);
    this.name = 'TwoFactorRequiredError';
  }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export class ValidationError extends ServiceError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    service: string,
    operation?: string,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, service, operation, context);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value
    };
  }
}

export class InputValidationError extends ValidationError {
  constructor(
    field: string,
    value: unknown,
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'InputValidation', operation, field, value, context);
    this.name = 'InputValidationError';
  }
}

export class BusinessRuleError extends ValidationError {
  constructor(
    rule: string,
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'BusinessRules', operation, rule, undefined, context);
    this.name = 'BusinessRuleError';
  }
}

// ============================================================================
// NETWORK AND API ERRORS
// ============================================================================

export class NetworkError extends ServiceError {
  public readonly statusCode?: number;
  public readonly url?: string;

  constructor(
    message: string,
    service: string,
    operation?: string,
    statusCode?: number,
    url?: string,
    context?: Record<string, unknown>
  ) {
    super(message, service, operation, context);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.url = url;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      url: this.url
    };
  }
}

export class ApiError extends NetworkError {
  public readonly apiCode?: string;

  constructor(
    message: string,
    service: string,
    operation?: string,
    statusCode?: number,
    url?: string,
    apiCode?: string,
    context?: Record<string, unknown>
  ) {
    super(message, service, operation, statusCode, url, context);
    this.name = 'ApiError';
    this.apiCode = apiCode;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      apiCode: this.apiCode
    };
  }
}

export class TimeoutError extends NetworkError {
  public readonly timeoutDuration?: number;

  constructor(
    message: string,
    service: string,
    operation?: string,
    timeoutDuration?: number,
    url?: string,
    context?: Record<string, unknown>
  ) {
    super(message, service, operation, undefined, url, context);
    this.name = 'TimeoutError';
    this.timeoutDuration = timeoutDuration;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timeoutDuration: this.timeoutDuration
    };
  }
}

// ============================================================================
// CACHE ERRORS
// ============================================================================

export class CacheError extends ServiceError {
  public readonly cacheKey?: string;
  public readonly cacheOperation?: 'get' | 'set' | 'delete' | 'clear';

  constructor(
    message: string,
    operation?: string,
    cacheKey?: string,
    cacheOperation?: 'get' | 'set' | 'delete' | 'clear',
    context?: Record<string, unknown>
  ) {
    super(message, 'CacheService', operation, context);
    this.name = 'CacheError';
    this.cacheKey = cacheKey;
    this.cacheOperation = cacheOperation;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      cacheKey: this.cacheKey,
      cacheOperation: this.cacheOperation
    };
  }
}

export class CacheMissError extends CacheError {
  constructor(
    cacheKey: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(`Cache miss for key: ${cacheKey}`, operation, cacheKey, 'get', context);
    this.name = 'CacheMissError';
  }
}

export class CacheCorruptionError extends CacheError {
  constructor(
    cacheKey: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(`Cache data corruption for key: ${cacheKey}`, operation, cacheKey, undefined, context);
    this.name = 'CacheCorruptionError';
  }
}

// ============================================================================
// BUSINESS LOGIC ERRORS
// ============================================================================

export class BusinessLogicError extends ServiceError {
  public readonly businessCode?: string;

  constructor(
    message: string,
    service: string,
    operation?: string,
    businessCode?: string,
    context?: Record<string, unknown>
  ) {
    super(message, service, operation, context);
    this.name = 'BusinessLogicError';
    this.businessCode = businessCode;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      businessCode: this.businessCode
    };
  }
}

export class ResourceNotFoundError extends BusinessLogicError {
  public readonly resourceId?: string;
  public readonly resourceType?: string;

  constructor(
    resourceType: string,
    resourceId: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(`${resourceType} with ID ${resourceId} not found`, 'BusinessLogic', operation, undefined, context);
    this.name = 'ResourceNotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resourceId: this.resourceId,
      resourceType: this.resourceType
    };
  }
}

export class ConflictError extends BusinessLogicError {
  public readonly conflictType?: string;

  constructor(
    message: string,
    operation?: string,
    conflictType?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'BusinessLogic', operation, 'CONFLICT', context);
    this.name = 'ConflictError';
    this.conflictType = conflictType;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      conflictType: this.conflictType
    };
  }
}

// ============================================================================
// SYSTEM ERRORS
// ============================================================================

export class SystemError extends ServiceError {
  public readonly systemComponent?: string;

  constructor(
    message: string,
    service: string,
    operation?: string,
    systemComponent?: string,
    context?: Record<string, unknown>
  ) {
    super(message, service, operation, context);
    this.name = 'SystemError';
    this.systemComponent = systemComponent;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      systemComponent: this.systemComponent
    };
  }
}

export class DependencyError extends SystemError {
  public readonly dependencyName?: string;

  constructor(
    dependencyName: string,
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'Dependency', operation, dependencyName, context);
    this.name = 'DependencyError';
    this.dependencyName = dependencyName;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      dependencyName: this.dependencyName
    };
  }
}

export class ConfigurationError extends SystemError {
  public readonly configKey?: string;

  constructor(
    configKey: string,
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'Configuration', operation, configKey, context);
    this.name = 'ConfigurationError';
    this.configKey = configKey;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      configKey: this.configKey
    };
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FAIL_FAST = 'fail_fast'
}

/**
 * Error recovery configuration
 */
export interface RecoveryConfig {
  strategy: RecoveryStrategy;
  maxRetries?: number;
  retryDelay?: number;
  fallbackValue?: unknown;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}

/**
 * Error handler interface for consistent error processing
 */
export interface ErrorHandler {
  handle(error: ServiceError): Promise<unknown>;
  canHandle(error: ServiceError): boolean;
}

/**
 * Error recovery manager for implementing retry logic and fallbacks
 */
export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  private constructor() {}

  public static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  /**
   * Execute operation with error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    config: RecoveryConfig,
    errorContext: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ServiceError) {
        return this.handleServiceError(error, config, errorContext);
      }
      throw error;
    }
  }

  /**
   * Handle service errors with appropriate recovery strategy
   */
  private async handleServiceError<T>(
    error: ServiceError,
    config: RecoveryConfig,
    errorContext: string
  ): Promise<T> {
    switch (config.strategy) {
      case RecoveryStrategy.RETRY:
        return this.handleRetry(error, config, errorContext);
      case RecoveryStrategy.FALLBACK:
        return this.handleFallback(error, config, errorContext);
      case RecoveryStrategy.CIRCUIT_BREAKER:
        return this.handleCircuitBreaker(error, config, errorContext);
      case RecoveryStrategy.FAIL_FAST:
      default:
        throw error;
    }
  }

  /**
   * Handle retry strategy with exponential backoff
   */
  private async handleRetry<T>(
    error: ServiceError,
    config: RecoveryConfig,
    errorContext: string
  ): Promise<T> {
    const maxRetries = config.maxRetries ?? 3;
    const retryDelay = config.retryDelay ?? 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(retryDelay * Math.pow(2, attempt - 1));
        }
        // Re-execute the operation
        throw new Error('Operation needs to be re-executed');
      } catch (retryError) {
        if (attempt === maxRetries || !(retryError instanceof ServiceError)) {
          throw retryError;
        }
        console.warn(`Retry attempt ${attempt + 1} failed:`, retryError.message);
      }
    }

    throw error;
  }

  /**
   * Handle fallback strategy
   */
  private handleFallback<T>(
    error: ServiceError,
    config: RecoveryConfig,
    errorContext: string
  ): T {
    if (config.fallbackValue !== undefined) {
      console.warn(`Using fallback value for ${errorContext}:`, error.message);
      return config.fallbackValue as T;
    }
    throw error;
  }

  /**
   * Handle circuit breaker strategy
   */
  private async handleCircuitBreaker<T>(
    error: ServiceError,
    config: RecoveryConfig,
    errorContext: string
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(errorContext, config);

    if (circuitBreaker.state === 'OPEN') {
      throw new SystemError(
        `Circuit breaker is open for ${errorContext}`,
        'CircuitBreaker',
        error.operation,
        undefined,
        { circuitBreakerState: 'OPEN' }
      );
    }

    try {
      const result = await errorContext; // This should be the actual operation
      circuitBreaker.recordSuccess();
      return result as T;
    } catch (circuitError) {
      circuitBreaker.recordFailure();
      throw circuitError;
    }
  }

  /**
   * Get or create circuit breaker for error context
   */
  private getCircuitBreaker(
    errorContext: string,
    config: RecoveryConfig
  ): CircuitBreakerState {
    if (!this.circuitBreakers.has(errorContext)) {
      this.circuitBreakers.set(
        errorContext,
        new CircuitBreakerState(
          config.circuitBreakerThreshold ?? 5,
          config.circuitBreakerTimeout ?? 60000
        )
      );
    }
    return this.circuitBreakers.get(errorContext)!;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker state management
 */
class CircuitBreakerState {
  public state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private failureThreshold: number,
    private timeout: number
  ) {}

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state === 'OPEN';
  }
}

// ============================================================================
// ERROR MIDDLEWARE AND LOGGING
// ============================================================================

/**
 * Error logging interface
 */
export interface ErrorLogger {
  logError(error: ServiceError): void;
  logWarning(message: string, context?: Record<string, unknown>): void;
  logInfo(message: string, context?: Record<string, unknown>): void;
}

/**
 * Console error logger implementation
 */
export class ConsoleErrorLogger implements ErrorLogger {
  logError(error: ServiceError): void {
    console.error('[SERVICE ERROR]', error.toJSON());
  }

  logWarning(message: string, context?: Record<string, unknown>): void {
    console.warn('[SERVICE WARNING]', message, context);
  }

  logInfo(message: string, context?: Record<string, unknown>): void {
    console.info('[SERVICE INFO]', message, context);
  }
}

/**
 * Global error handler for unhandled service errors
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private logger: ErrorLogger;

  private constructor(logger: ErrorLogger = new ConsoleErrorLogger()) {
    this.logger = logger;
  }

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Handle unhandled service errors
   */
  handleUnhandledError(error: unknown): void {
    if (error instanceof ServiceError) {
      this.logger.logError(error);
    } else {
      this.logger.logError(new SystemError(
        'Unhandled error occurred',
        'GlobalErrorHandler',
        undefined,
        undefined,
        { originalError: error }
      ));
    }
  }

  /**
   * Set custom error logger
   */
  setErrorLogger(logger: ErrorLogger): void {
    this.logger = logger;
  }
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

/**
 * Factory for creating service errors with consistent formatting
 */
export class ServiceErrorFactory {
  /**
   * Create authentication error
   */
  static createAuthError(
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ): AuthenticationError {
    return new AuthenticationError(message, operation, context);
  }

  /**
   * Create validation error
   */
  static createValidationError(
    field: string,
    value: unknown,
    message: string,
    service: string,
    operation?: string,
    context?: Record<string, unknown>
  ): ValidationError {
    return new ValidationError(message, service, operation, field, value, context);
  }

  /**
   * Create API error
   */
  static createApiError(
    message: string,
    statusCode: number,
    url?: string,
    operation?: string,
    context?: Record<string, unknown>
  ): ApiError {
    return new ApiError(message, 'ApiService', operation, statusCode, url, undefined, context);
  }

  /**
   * Create cache error
   */
  static createCacheError(
    message: string,
    cacheKey?: string,
    operation?: string,
    cacheOperation?: 'get' | 'set' | 'delete' | 'clear',
    context?: Record<string, unknown>
  ): CacheError {
    return new CacheError(message, operation, cacheKey, cacheOperation, context);
  }

  /**
   * Create resource not found error
   */
  static createNotFoundError(
    resourceType: string,
    resourceId: string,
    operation?: string,
    context?: Record<string, unknown>
  ): ResourceNotFoundError {
    return new ResourceNotFoundError(resourceType, resourceId, operation, context);
  }

  /**
   * Create system error
   */
  static createSystemError(
    message: string,
    component?: string,
    operation?: string,
    context?: Record<string, unknown>
  ): SystemError {
    return new SystemError(message, 'System', operation, component, context);
  }

  /**
   * Create dependency error
   */
  static createDependencyError(
    dependencyName: string,
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ): DependencyError {
    return new DependencyError(dependencyName, message, operation, context);
  }

  /**
   * Create configuration error
   */
  static createConfigurationError(
    configKey: string,
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ): ConfigurationError {
    return new ConfigurationError(configKey, message, operation, context);
  }
}

// Export default error logger and handler
export const globalErrorHandler = GlobalErrorHandler.getInstance();
export const errorRecoveryManager = ErrorRecoveryManager.getInstance();
