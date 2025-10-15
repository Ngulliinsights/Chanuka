// Error domains for categorization
export enum ErrorDomain {
  SYSTEM = 'system',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  BUSINESS_LOGIC = 'business_logic'
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
  name: string;
  description: string;
  automatic: boolean;
  handler?: () => Promise<boolean>;
}

// Error metadata interface
export interface ErrorMetadata {
  domain: ErrorDomain;
  severity: ErrorSeverity;
  correlationId?: string;
  timestamp: Date;
  retryable?: boolean;
  attemptCount?: number;
  recoveryStrategies: RecoveryStrategy[];
  context?: Record<string, any>;
}

// Error options interface
export interface BaseErrorOptions {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
  cause?: Error;
  domain?: ErrorDomain;
  severity?: ErrorSeverity;
  correlationId?: string;
  context?: Record<string, any>;
  retryable?: boolean;
  recoveryStrategies?: RecoveryStrategy[];
}

// Base error class with enhanced features
export class BaseError extends Error {
  readonly errorId: string;
  readonly statusCode: number;
  readonly code: string;
  readonly details?: any;
  readonly isOperational: boolean;
  readonly cause?: Error;
  readonly metadata: ErrorMetadata;
  
  constructor(message: string, options: BaseErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'UNKNOWN_ERROR';
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.cause = options.cause;

    this.metadata = {
      domain: options.domain || ErrorDomain.SYSTEM,
      severity: options.severity || ErrorSeverity.MEDIUM,
      correlationId: options.correlationId,
      timestamp: new Date(),
      retryable: options.retryable ?? false,
      attemptCount: 0,
      recoveryStrategies: options.recoveryStrategies || [],
      context: options.context || {}
    };

    Error.captureStackTrace(this, this.constructor);
  }

  getUserMessage(): string {
    return this.isOperational ? this.message : 'An unexpected error occurred';
  }

  toJSON(): Record<string, any> {
    return {
      errorId: this.errorId,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      isOperational: this.isOperational,
      metadata: {
        ...this.metadata,
        timestamp: this.metadata.timestamp.toISOString()
      },
      stack: this.stack
    };
  }

  async attemptRecovery(): Promise<boolean> {
    if (!this.metadata.retryable || !this.metadata.recoveryStrategies.length) {
      return false;
    }

    this.metadata.attemptCount = (this.metadata.attemptCount || 0) + 1;
    
    for (const strategy of this.metadata.recoveryStrategies) {
      if (strategy.automatic && strategy.handler) {
        try {
          const recovered = await strategy.handler();
          if (recovered) return true;
        } catch (error) {
          logger.error('Recovery strategy failed:', { component: 'Chanuka' }, error);
        }
      }
    }

    return false;
  }
}

// Authentication error messages
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







