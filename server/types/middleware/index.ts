/**
 * Server Middleware Types
 * Standardized middleware interfaces following the unified type system
 */

import { BaseEntity } from '@shared/types/core/base';
import { Result } from '@shared/types/core/errors';

/**
 * Middleware Context
 * Standardized context passed through middleware chain
 */
export interface MiddlewareContext extends BaseEntity {
  readonly requestId: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly timestamp: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Middleware Result
 * Standardized middleware result with error handling
 */
export interface MiddlewareResult<T = unknown> extends Result<T> {
  readonly context: MiddlewareContext;
  readonly timestamp: Date;
  readonly duration?: number;
}

/**
 * Request Middleware Interface
 * Standardized request middleware contract
 */
export interface RequestMiddleware<TContext extends MiddlewareContext = MiddlewareContext> {
  (context: TContext, next: () => Promise<MiddlewareResult<unknown>>): Promise<MiddlewareResult<unknown>>;
}

/**
 * Error Middleware Interface
 * Standardized error middleware contract
 */
export interface ErrorMiddleware {
  (error: Error, context: MiddlewareContext): Promise<MiddlewareResult<never>>;
}

/**
 * Authentication Middleware Result
 * Specialized for authentication operations
 */
export interface AuthMiddlewareResult extends MiddlewareResult<{
  readonly userId: string;
  readonly roles: string[];
  readonly permissions: string[];
}> {
  readonly isAuthenticated: boolean;
  readonly authenticationMethod?: string;
}

/**
 * Rate Limit Middleware Result
 * Specialized for rate limiting operations
 */
export interface RateLimitMiddlewareResult extends MiddlewareResult<{
  readonly remaining: number;
  readonly resetTime: Date;
  readonly isLimited: boolean;
}> {
  readonly limitType: string;
  readonly limitKey: string;
}

/**
 * Validation Middleware Result
 * Specialized for request validation operations
 */
export interface ValidationMiddlewareResult extends MiddlewareResult<{
  readonly isValid: boolean;
  readonly validatedData: unknown;
}> {
  readonly validationErrors?: readonly {
    readonly field: string;
    readonly message: string;
    readonly code?: string;
  }[];
}

/**
 * Middleware Configuration
 * Standardized middleware configuration
 */
export interface MiddlewareConfig {
  readonly timeout?: number;
  readonly order?: number;
  readonly enabled?: boolean;
  readonly conditions?: Readonly<Record<string, unknown>>;
}

/**
 * Middleware Factory Options
 * Configuration for creating middleware instances
 */
export interface MiddlewareFactoryOptions<TContext extends MiddlewareContext = MiddlewareContext> {
  readonly context: TContext;
  readonly config?: MiddlewareConfig;
  readonly dependencies?: Readonly<Record<string, unknown>>;
}

/**
 * Middleware Error Types
 * Standardized error types for middleware operations
 */
export class MiddlewareError extends Error {
  constructor(
    public readonly context: MiddlewareContext,
    message: string,
    public readonly code?: string,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    public readonly metadata?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'MiddlewareError';
    Object.setPrototypeOf(this, MiddlewareError.prototype);
  }
}

export class AuthenticationError extends MiddlewareError {
  constructor(context: MiddlewareContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'AUTHENTICATION_FAILED', 'high', metadata);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends MiddlewareError {
  constructor(context: MiddlewareContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'AUTHORIZATION_FAILED', 'high', metadata);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class RateLimitError extends MiddlewareError {
  constructor(context: MiddlewareContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'RATE_LIMIT_EXCEEDED', 'medium', metadata);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ValidationError extends MiddlewareError {
  constructor(context: MiddlewareContext, message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(context, message, 'VALIDATION_FAILED', 'medium', metadata);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}