/**
 * Unified error classification system
 */
export enum ErrorSeverity {
  LOW = 'LOW',       // Minor issues that don't affect core functionality
  MEDIUM = 'MEDIUM', // Issues that degrade but don't prevent functionality
  HIGH = 'HIGH',     // Issues that prevent specific features from working
  CRITICAL = 'CRITICAL', // Issues that make the system unusable
  ERROR = 'ERROR',   // Legacy compatibility
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
 * Enhanced error recovery strategy type
 */
export interface RecoveryStrategy {
  name: string;
  description: string;
  automatic: boolean;
  action?: () => Promise<void>;
}

/**
 * Enhanced error metadata interface
 */
export interface ErrorMetadata {
  correlationId: string | undefined;
  parentErrorId: string | undefined;
  timestamp: Date;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  source: string;
  context: Record<string, any> | undefined;
  retryable: boolean;
  recoveryStrategies: RecoveryStrategy[];
  attemptCount: number;
  lastAttempt: Date | undefined;
}

/**
 * Unified base error class combining features from both implementations
 */
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, any> | undefined;
  public readonly isOperational: boolean;
  public readonly metadata: ErrorMetadata;
  public readonly errorId: string;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      details?: Record<string, any>;
      isOperational?: boolean;
      cause?: Error;
      domain?: ErrorDomain;
      severity?: ErrorSeverity;
      source?: string;
      correlationId?: string;
      parentErrorId?: string;
      context?: Record<string, any>;
      retryable?: boolean;
      recoveryStrategies?: RecoveryStrategy[];
    } = {}
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'INTERNAL_SERVER_ERROR';
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.errorId = this.generateErrorId();
    this.cause = options.cause;

    this.metadata = {
      correlationId: options.correlationId,
      parentErrorId: options.parentErrorId,
      timestamp: new Date(),
      domain: options.domain || ErrorDomain.SYSTEM,
      severity: options.severity || ErrorSeverity.MEDIUM,
      source: options.source || 'unknown',
      context: options.context,
      retryable: options.retryable ?? false,
      recoveryStrategies: options.recoveryStrategies || [],
      attemptCount: 0,
      lastAttempt: undefined,
    };
  }

  /**
   * Generates a unique error ID for correlation
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Checks if this error is related to another error
   */
  isRelatedTo(other: BaseError): boolean {
    return (
      this.metadata.correlationId === other.metadata.correlationId ||
      this.metadata.parentErrorId === other.errorId ||
      other.metadata.parentErrorId === this.errorId
    );
  }

  /**
   * Creates a child error that maintains correlation
   */
  createChildError(
    message: string,
    options: Omit<ConstructorParameters<typeof BaseError>[1], 'correlationId' | 'parentErrorId'> = {}
  ): BaseError {
    return new BaseError(message, {
      ...options,
      ...(this.metadata.correlationId && { correlationId: this.metadata.correlationId }),
      ...(this.errorId && { parentErrorId: this.errorId }),
    });
  }

  /**
   * Gets a user-friendly message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Attempts to execute a recovery strategy
   */
  async attemptRecovery(): Promise<boolean> {
    const availableStrategies = this.metadata.recoveryStrategies.filter(s => s.automatic);
    if (availableStrategies.length === 0) return false;

    this.metadata.attemptCount++;
    this.metadata.lastAttempt = new Date();

    for (const strategy of availableStrategies) {
      if (strategy.action) {
        try {
          await strategy.action();
          return true;
        } catch (error) {
          console.error(`Recovery strategy ${strategy.name} failed:`, error);
        }
      }
    }
    return false;
  }

  /**
   * Enhanced serialization with all metadata
   */
  toJSON() {
    return {
      error: {
        id: this.errorId,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
        metadata: {
          ...this.metadata,
          timestamp: this.metadata.timestamp.toISOString(),
          lastAttempt: this.metadata.lastAttempt?.toISOString(),
          recoveryStrategies: this.metadata.recoveryStrategies.map(({ action, ...rest }) => rest),
        },
        cause: this.cause instanceof Error ? this.cause.message : undefined,
      },
    };
  }

  /**
   * Enhanced deserialization with metadata
   */
  static fromJSON(json: string | object): BaseError {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const { error } = data;

    return new BaseError(error.message, {
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
      recoveryStrategies: error.metadata?.recoveryStrategies || [],
    });
  }
}







