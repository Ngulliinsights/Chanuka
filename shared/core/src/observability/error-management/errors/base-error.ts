/**
 * Consolidated Base Error Implementation
 * 
 * This combines the best features from both error-handling and errors directories
 * into a single, unified base error class.
 */

// Temporarily disable complex logging to avoid circular dependencies
const logger = {
  error: (msg: string, meta?: any) => console.error(msg, meta),
  warn: (msg: string, meta?: any) => console.warn(msg, meta),
  info: (msg: string, meta?: any) => console.info(msg, meta),
  debug: (msg: string, meta?: any) => console.debug(msg, meta)
};

// Error domains for categorization
export enum ErrorDomain {
  SYSTEM = 'system',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  CACHE = 'cache',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  BUSINESS_LOGIC = 'business_logic',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  DATA = 'data',
  INTEGRATION = 'integration'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Recovery strategy interface
export interface RecoveryStrategy {
  readonly name: string;
  readonly description: string;
  readonly automatic: boolean;
  readonly action?: () => Promise<void>;
}

// Error metadata interface
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

// Error options interface
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
 * Unified Base Error Class
 * 
 * Combines the best features from both implementations:
 * - Enhanced metadata from error-handling
 * - Performance optimizations from errors
 * - Comprehensive recovery strategies
 * - Proper serialization and correlation
 */
export class BaseError extends Error {
  public readonly errorId: string;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, any> | undefined;
  public readonly isOperational: boolean;
  public readonly metadata: ErrorMetadata;
  public readonly cause?: Error;

  // Cache for computed properties
  private _userMessage?: string;

  constructor(message: string, options: BaseErrorOptions = {}) {
    super(message);
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.errorId = this.generateErrorId();
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_SERVER_ERROR';
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.cause = options.cause;

    // Build metadata with proper defaults
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

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Generates a unique error ID for correlation
   */
  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Checks if this error is related to another error
   */
  isRelatedTo(other: BaseError): boolean {
    if (!other || !(other instanceof BaseError)) {
      return false;
    }

    // Check correlation ID
    if (this.metadata.correlationId && 
        this.metadata.correlationId === other.metadata.correlationId) {
      return true;
    }

    // Check parent-child relationship
    if (this.metadata.parentErrorId === other.errorId) {
      return true;
    }

    if (other.metadata.parentErrorId === this.errorId) {
      return true;
    }

    return false;
  }

  /**
   * Creates a child error that maintains correlation
   */
  createChildError(
    message: string,
    options: Omit<BaseErrorOptions, 'correlationId' | 'parentErrorId'> = {}
  ): BaseError {
    return new BaseError(message, {
      ...options,
      correlationId: this.metadata.correlationId ?? this.errorId,
      parentErrorId: this.errorId,
    });
  }

  /**
   * Gets a user-friendly message
   */
  getUserMessage(): string {
    if (this._userMessage === undefined) {
      this._userMessage = this.computeUserMessage();
    }
    return this._userMessage;
  }

  /**
   * Override this method in subclasses to customize user-facing messages
   */
  protected computeUserMessage(): string {
    return this.isOperational ? this.message : 'An unexpected error occurred';
  }

  /**
   * Attempts to execute recovery strategies
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

    // Try each strategy in order
    for (const strategy of availableStrategies) {
      try {
        await strategy.action();
        logger.info('Error recovery successful', { 
          component: 'ErrorManagement',
          errorId: this.errorId,
          strategy: strategy.name 
        });
        return true;
      } catch (recoveryError) {
        logger.error('Recovery strategy failed', { 
          component: 'ErrorManagement',
          errorId: this.errorId,
          strategy: strategy.name,
          error: recoveryError 
        });
      }
    }

    return false;
  }

  /**
   * Enhanced serialization
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
        ...(this.stack && { stack: this.stack }),
      },
    };
  }

  /**
   * Helper method to check if error should be retried
   */
  shouldRetry(maxAttempts: number = 3): boolean {
    return this.metadata.retryable && this.metadata.attemptCount < maxAttempts;
  }

  /**
   * Creates a sanitized version safe for logging
   */
  toSafeLog(): Record<string, any> {
    const json = this.toJSON();
    
    // Remove potentially sensitive context data
    if (json.error.metadata.context) {
      delete json.error.metadata.context;
    }
    
    return json;
  }

  /**
   * Static method to create error from JSON
   */
  static fromJSON(json: string | object): BaseError {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      
      if (!data?.error) {
        throw new Error('Invalid error JSON structure: missing error property');
      }

      const { error } = data;

      return new BaseError(error.message ?? 'Unknown error', {
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
}

// Authentication error messages for backward compatibility
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again',
  TOKEN_INVALID: 'Invalid authentication token',
  TOKEN_MISSING: 'Authentication token is missing',
  SESSION_EXPIRED: 'Session has expired',
  SESSION_INVALID: 'Invalid session',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access forbidden',
  TOKEN_REQUIRED: 'Authentication token required'
} as const;





































