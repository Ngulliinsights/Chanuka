/**
 * Middleware Types - Phase 3
 * Covers authentication, error handling, validation, and context middleware
 */

import { Express, Request, Response, NextFunction } from 'express';
import { BaseError, ValidationError } from '@shared/core';
import { RequestContext, ErrorDetail } from './api-response';

// ============================================================================
// Middleware Function Types
// ============================================================================

/**
 * Standard Express middleware function
 */
export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Error handling middleware
 */
export type ErrorMiddleware = (
  error: BaseError | ValidationError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void;

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Authenticated request with user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string | number;
    email?: string;
    role: string;
    permissions?: string[];
    token?: string;
  };
  context?: RequestContext;
  startTime?: number;
}

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedRequest['user'];
  error?: string;
}

/**
 * Token payload from JWT or session
 */
export interface TokenPayload {
  id: string | number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

// ============================================================================
// Error Handling Middleware
// ============================================================================

/**
 * Error formatting result
 */
export interface FormattedError {
  statusCode: number;
  body: {
    success: false;
    error: ErrorDetail;
    metadata: {
      timestamp: string;
      correlationId?: string;
    };
  };
}

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
  logErrors: boolean;
  exposeDetails: boolean; // In production, hide internal details
  environment: 'development' | 'production' | 'test';
}

/**
 * Error to response mapping
 */
export interface ErrorToResponseMap {
  BaseError: (error: BaseError) => FormattedError;
  ValidationError: (error: ValidationError) => FormattedError;
  Default: (error: Error) => FormattedError;
}

// ============================================================================
// Request Context Middleware
// ============================================================================

/**
 * Context generation options
 */
export interface ContextGenerationOptions {
  includeUserAgent: boolean;
  includeIpAddress: boolean;
  generateTraceId: () => string;
  generateSpanId: () => string;
}

/**
 * Context middleware result
 */
export interface ContextMiddlewareResult {
  context: RequestContext;
  startTime: number;
}

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Validation middleware for request body/params/query
 */
export interface ValidatorMiddleware {
  body?: (data: unknown) => Promise<Record<string, unknown>>;
  params?: (data: unknown) => Promise<Record<string, unknown>>;
  query?: (data: unknown) => Promise<Record<string, unknown>>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  data?: Record<string, unknown>;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================================================
// Rate Limiting Middleware
// ============================================================================

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
}

/**
 * Rate limit config
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipFailed?: boolean;
  skipSuccessful?: boolean;
  keyGenerator?: (req: Request) => string;
}

// ============================================================================
// Logging Middleware
// ============================================================================

/**
 * Request log entry
 */
export interface RequestLogEntry {
  timestamp: string;
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId?: string | number;
  error?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Log level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// CORS Middleware
// ============================================================================

/**
 * CORS configuration
 */
export interface CorsConfig {
  origin: string | string[] | ((origin: string) => boolean);
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

// ============================================================================
// Middleware Chain
// ============================================================================

/**
 * Middleware registry for centralized management
 */
export interface MiddlewareRegistry {
  register(name: string, middleware: Middleware): void;
  unregister(name: string): void;
  get(name: string): Middleware | undefined;
  getAll(): Map<string, Middleware>;
  apply(app: Express.Application, names: string[]): void;
}

/**
 * Middleware execution order
 */
export type MiddlewareExecutionOrder = 'request-context' | 'authentication' | 'validation' | 'rate-limit' | 'logging';
