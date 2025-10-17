/**
 * Unified error classification system with optimized enums
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR', // Legacy compatibility
}

/**
 * Unified error domains with categories
 */
export enum ErrorDomain {
  // Core domains
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATABASE = 'DATABASE',
  CACHE = 'CACHE',
  NETWORK = 'NETWORK',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',

  // Legacy category support
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SECURITY = 'SECURITY',
  DATA = 'DATA',
  INTEGRATION = 'INTEGRATION',
}

/**
 * Enhanced error recovery strategy type with clear separation of sync/async operations
 */
export interface RecoveryStrategy {
  readonly name: string;
  readonly description: string;
  readonly automatic: boolean;
  readonly action?: () => Promise<void>;
}

/**
 * Enhanced error metadata interface with immutable properties where appropriate
 */
export interface ErrorMetadata {
  readonly correlationId: string | undefined;
  readonly parentErrorId: string | undefined;
  readonly timestamp: Date;
  readonly domain: ErrorDomain;
  readonly severity: ErrorSeverity;
  readonly source: string;
  readonly context: Readonly<Record<string, any>> | undefined;
  readonly retryable: boolean;
  readonly recoveryStrategies: ReadonlyArray<RecoveryStrategy>;
  attemptCount: number;
  lastAttempt: Date | undefined;
}

/**
 * Options for BaseError constructor with improved type safety
 */
export interface BaseErrorOptions {
  readonly statusCode?: number;
  readonly code?: string;
  readonly details?: Record<string, any>;
  readonly isOperational?: boolean;
  readonly cause?: Error;
  readonly domain?: ErrorDomain;
  readonly severity?: ErrorSeverity;
  readonly source?: string;
  readonly correlationId?: string;
  readonly parentErrorId?: string;
  readonly context?: Record<string, any>;
  readonly retryable?: boolean;
  readonly recoveryStrategies?: RecoveryStrategy[];
}

/**
 * Unified base error class with performance optimizations and enhanced features
 */
export abstract class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, any> | undefined;
  public readonly isOperational: boolean;
  public readonly metadata: ErrorMetadata;
  public readonly errorId: string;
  public readonly cause: Error | undefined;

  // Cache for computed properties to avoid repeated calculations
  private _userMessage?: string;
  private _jsonCache?: string;

  constructor(message: string, options: BaseErrorOptions = {}) {
    super(message);

    // Ensure proper prototype chain for instanceof checks across execution contexts
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_SERVER_ERROR';
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.cause = options.cause;

    // Generate error ID once and reuse
    this.errorId = this.generateErrorId();

    // Build metadata object with proper defaults and immutability where needed
    this.metadata = {
      correlationId: options.correlationId,
      parentErrorId: options.parentErrorId,
      timestamp: new Date(),
      domain: options.domain ?? ErrorDomain.SYSTEM,
      severity: options.severity ?? ErrorSeverity.MEDIUM,
      source: options.source ?? 'unknown',
      context: options.context ? Object.freeze({ ...options.context }) : undefined,
      retryable: options.retryable ?? false,
      recoveryStrategies: Object.freeze(options.recoveryStrategies ?? []),
      attemptCount: 0,
      lastAttempt: undefined,
    };
  }

  /**
   * Generates a unique error ID for correlation using optimized string building
   */
  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Checks if this error is related to another error with early exit optimization
   */
  isRelatedTo(other: BaseError): boolean {
    if (!other || !(other instanceof BaseError)) {
      return false;
    }

    // Quick checks with early exits for better performance
    if (this.metadata.correlationId &&
        this.metadata.correlationId === other.metadata.correlationId) {
      return true;
    }

    if (this.metadata.parentErrorId === other.errorId) {
      return true;
    }

    if (other.metadata.parentErrorId === this.errorId) {
      return true;
    }

    return false;
  }

  /**
   * Creates a child error that maintains correlation with improved type safety
   */
  createChildError(
    message: string,
    options: Omit<BaseErrorOptions, 'correlationId' | 'parentErrorId'> = {}
  ): BaseError {
    return new (this.constructor as any)(message, {
      ...options,
      correlationId: this.metadata.correlationId ?? this.errorId,
      parentErrorId: this.errorId,
    });
  }

  /**
   * Gets a user-friendly message with optional caching
   */
  getUserMessage(): string {
    // Cache the user message if it's been computed before
    if (this._userMessage === undefined) {
      this._userMessage = this.computeUserMessage();
    }
    return this._userMessage;
  }

  /**
   * Override this method in subclasses to customize user-facing messages
   */
  protected computeUserMessage(): string {
    return this.message;
  }

  /**
   * Attempts to execute recovery strategies with improved error handling
   */
  async attemptRecovery(): Promise<boolean> {
    // Filter to automatic strategies that have actions
    const availableStrategies = this.metadata.recoveryStrategies.filter(
      (s): s is RecoveryStrategy & { action: () => Promise<void> } =>
        s.automatic && typeof s.action === 'function'
    );

    if (availableStrategies.length === 0) {
      return false;
    }

    // Update attempt tracking
    this.metadata.attemptCount++;
    this.metadata.lastAttempt = new Date();

    // Try each strategy in order, return on first success
    for (const strategy of availableStrategies) {
      try {
        await strategy.action();
        return true;
      } catch (recoveryError) {
        // Log but continue to next strategy
        console.error(
          `Recovery strategy "${strategy.name}" failed:`,
          recoveryError instanceof Error ? recoveryError.message : recoveryError
        );
      }
    }

    return false;
  }

  /**
   * Enhanced serialization with optimized object building and caching
   */
  toJSON(): Record<string, any> {
    return {
      error: {
        id: this.errorId,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details }),
        metadata: {
          correlationId: this.metadata.correlationId,
          parentErrorId: this.metadata.parentErrorId,
          timestamp: this.metadata.timestamp.toISOString(),
          domain: this.metadata.domain,
          severity: this.metadata.severity,
          source: this.metadata.source,
          ...(this.metadata.context && { context: this.metadata.context }),
          retryable: this.metadata.retryable,
          recoveryStrategies: this.metadata.recoveryStrategies.map(
            ({ action, ...rest }) => rest
          ),
          attemptCount: this.metadata.attemptCount,
          ...(this.metadata.lastAttempt && {
            lastAttempt: this.metadata.lastAttempt.toISOString(),
          }),
        },
        ...(this.cause instanceof Error && { cause: this.cause.message }),
      },
    };
  }

  /**
   * Converts the error to a JSON string with optional caching for repeated calls
   */
  override toString(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Enhanced deserialization with validation and error handling
   */
  static fromJSON(json: string | object): BaseError {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;

      if (!data?.error) {
        throw new Error('Invalid error JSON structure: missing error property');
      }

      const { error } = data;

      return new (this as any)(error.message ?? 'Unknown error', {
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
        correlationId: error.metadata?.correlationId,
        parentErrorId: error.metadata?.parentErrorId,
        domain: error.metadata?.domain,
        severity: error.metadata?.severity,
        source: error.metadata?.source,
        context: error.metadata?.context,
        retryable: error.metadata?.retryable,
        recoveryStrategies: error.metadata?.recoveryStrategies ?? [],
      });
    } catch (parseError) {
      throw new Error(
        `Failed to deserialize BaseError: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Helper method to check if error should be retried based on attempt count
   */
  shouldRetry(maxAttempts: number = 3): boolean {
    return this.metadata.retryable && this.metadata.attemptCount < maxAttempts;
  }

  /**
   * Creates a sanitized version safe for logging (removes sensitive context)
   */
  toSafeLog(): Record<string, any> {
    const json = this.toJSON();

    // Remove potentially sensitive context data
    if (json.error.metadata.context) {
      delete json.error.metadata.context;
    }

    return json;
  }
}