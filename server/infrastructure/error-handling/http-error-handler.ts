/**
 * HTTP Error Handler
 *
 * Everything that bridges the domain error model and the HTTP layer.
 * This module is the only place in the system that knows about Express,
 * HTTP status codes as outbound signals, and JSON response shape.
 *
 * Responsibilities:
 *  1. extractRequestContext — builds an ErrorContext from an Express Request
 *     so domain errors carry full request tracing without the domain layer
 *     importing Express types.
 *
 *  2. classifyHttpError — maps raw thrown values (unknown library errors,
 *     Boom instances, string messages) to an ErrorCategory so the middleware
 *     can make a single consistent routing decision.
 *
 *  3. toErrorResponse — converts a StandardizedError to the canonical JSON
 *     response body. The only place `ErrorResponse` is constructed.
 *
 *  4. createExpressErrorMiddleware — returns a four-argument Express error
 *     handler that handles all edge cases: Boom errors, StandardizedErrors,
 *     unrecognised thrown values, and validation library errors.
 *
 * Design contract:
 *  - Domain/service code never imports from this file.
 *  - Only route handlers, middleware registration, and integration tests
 *    depend on this module.
 *  - HTTP status codes exist here as outbound decisions, never as domain
 *    values flowing into service layer logic.
 *
 * Dependency rule: http-error-handler.ts → types.ts, error-factory.ts, result-types.ts
 */

import Boom from '@hapi/boom';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../observability';

import {
  createError,
  createSystemError,
  createValidationError,
} from './error-factory';
import {
  // FIX: removed unused `boomFromStandardized` import (TS6133)
  standardizedFromBoom,
} from './result-types';
import {
  ErrorCategory,
  ErrorContext,
  ErrorResponse,
  StandardizedError,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Internal Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FIX (TS2339): Express's bare `Request` type has no `user` property — that is
 * added by Passport or similar auth middleware at runtime. Using a local
 * intersection type avoids augmenting the global `Express.Request` namespace,
 * keeping this file self-contained.
 */
type RequestWithUser = Request & {
  user?: { id?: string | number; [key: string]: unknown };
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Request Context Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds an ErrorContext from an Express Request. All HTTP-specific fields
 * (IP, user-agent, path) are placed in `metadata` so domain code never
 * needs to look inside them — they exist purely for observability.
 *
 * The request object is typed as `unknown` at the call site so this function
 * can be used in tests without a full Express mock; the internal assertions
 * handle missing fields gracefully.
 */
export function extractRequestContext(
  req:        Request,
  operation?: string,
): ErrorContext {
  // FIX (TS2339): cast to RequestWithUser locally so `req.user` is accessible
  // without modifying the global Express namespace.
  const r = req as RequestWithUser;

  const correlationId =
    (req.headers['x-correlation-id'] as string | undefined) ??
    (req as unknown as { id?: string }).id;

  return {
    service:   'api',
    operation: operation ?? `${req.method} ${req.path}`,
    timestamp: new Date(),
    ...(correlationId  != null && { correlationId }),
    ...(r.user?.id     != null && { userId: String(r.user.id) }),
    metadata: {
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
      path:      req.path,
      method:    req.method,
      ...(Object.keys(req.query).length > 0 && { query: req.query }),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Error Classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifies an unknown thrown value into an ErrorCategory.
 *
 * This is the decision tree the middleware uses to produce a meaningful
 * category when the thrown value did not come from our own error-factory.
 * It handles the most common conventions from popular Node.js libraries
 * (Joi, Zod, Sequelize, Mongoose, Passport, etc.).
 */
export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    // Already a StandardizedError
    if ('category' in error) return (error as unknown as StandardizedError).category;

    // Boom errors carry their category in .data if set by our code,
    // otherwise we infer from status
    if (Boom.isBoom(error)) {
      const data = (error as Boom.Boom).data as Record<string, unknown> | undefined;
      if (data?.['category']) return data['category'] as ErrorCategory;
      return categoryFromStatus((error as Boom.Boom).output.statusCode);
    }

    // Joi / express-validator
    if (error.name === 'ValidationError' || 'details' in error) {
      return ErrorCategory.VALIDATION;
    }

    // Passport / JWT
    if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
      return ErrorCategory.AUTHENTICATION;
    }
    if (error.name === 'TokenExpiredError') {
      return ErrorCategory.AUTHENTICATION;
    }
    if (error.name === 'ForbiddenError') {
      return ErrorCategory.AUTHORIZATION;
    }

    // Sequelize / Mongoose naming conventions
    if (error.name === 'SequelizeUniqueConstraintError') return ErrorCategory.CONFLICT;
    if (error.name === 'SequelizeValidationError')       return ErrorCategory.VALIDATION;
    if (error.name?.includes('Database') || error.name?.includes('Sequelize')) {
      return ErrorCategory.DATABASE;
    }

    // HTTP status duck-typing (Axios, got, node-fetch wrappers)
    const status =
      (error as { status?: number; statusCode?: number }).status ??
      (error as { status?: number; statusCode?: number }).statusCode;
    if (status !== undefined) return categoryFromStatus(status);

    // Message heuristics for timeout scenarios
    if (error.message.toLowerCase().includes('timeout'))      return ErrorCategory.EXTERNAL_SERVICE;
    if (error.message.toLowerCase().includes('econnrefused')) return ErrorCategory.EXTERNAL_SERVICE;
  }

  return ErrorCategory.SYSTEM;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Error Response Building
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a StandardizedError to the canonical API response body.
 * This is the single place `ErrorResponse` is constructed; no other module
 * should build this shape inline.
 *
 * Note: `message` in the response is `userMessage` — the internal developer
 * message is never sent to clients.
 */
export function toErrorResponse(error: StandardizedError): ErrorResponse {
  return {
    success: false,
    error: {
      id:        error.id,
      code:      error.code,
      message:   error.userMessage,
      category:  error.category,
      retryable: error.retryable,
      timestamp: error.context.timestamp.toISOString(),
    },
    metadata: {
      ...(error.context.requestId     != null && { requestId:     error.context.requestId }),
      ...(error.context.correlationId != null && { correlationId: error.context.correlationId }),
      service:   error.context.service,
      operation: error.context.operation,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Express Error Middleware
// ─────────────────────────────────────────────────────────────────────────────

export interface ErrorMiddlewareOptions {
  /**
   * When true, the full internal `message` and `stack` are included in
   * the response. Should only be true in development environments.
   */
  exposeInternals?: boolean;

  /**
   * Called after an error is handled, useful for external reporting (Sentry etc).
   * Does not affect the response.
   */
  onError?: (error: StandardizedError) => void;
}

/**
 * Returns a four-argument Express error middleware.
 *
 * Normalisation priority:
 *  1. Already a StandardizedError (came from our service layer) → use as-is
 *  2. Boom error → convert via standardizedFromBoom
 *  3. Joi / Zod ValidationError (has `.details` or `.issues`) → extract fields
 *  4. Any other Error → classify and wrap via createError
 *  5. Non-Error thrown values → wrap in a system error
 *
 * The response always uses `error.userMessage`; internal messages are only
 * included when `exposeInternals` is true (development only).
 */
export function createExpressErrorMiddleware(
  options: ErrorMiddlewareOptions = {},
) {
  const { exposeInternals = false, onError } = options;

  return function expressErrorHandler(
    err:   unknown,
    req:   Request,
    res:   Response,
    _next: NextFunction,
  ): void {
    const context = extractRequestContext(req);

    // ── Normalise to StandardizedError ──────────────────────────────────────
    let standardized: StandardizedError;

    if (isStandardizedError(err)) {
      standardized = err;

    } else if (Boom.isBoom(err)) {
      standardized = standardizedFromBoom(err, context);

    } else if (isJoiValidationError(err)) {
      const fields = err.details.map((d: { path: string[]; message: string }) => ({
        field:   d.path.join('.') || 'unknown',
        message: d.message,
      }));
      standardized = createValidationError(fields, context);

    } else if (isZodValidationError(err)) {
      const fields = err.issues.map((i: { path: (string | number)[]; message: string }) => ({
        field:   i.path.join('.') || 'unknown',
        message: i.message,
      }));
      standardized = createValidationError(fields, context);

    } else if (err instanceof Error) {
      const category = classifyError(err);
      const status   =
        (err as { status?: number; statusCode?: number }).status ??
        (err as { status?: number; statusCode?: number }).statusCode;
      standardized = createError(err, category, context, {
        ...(status != null && { httpStatusCode: status }),
      });

    } else {
      const message = typeof err === 'string' ? err : JSON.stringify(err) ?? 'Unknown error';
      standardized  = createSystemError(new Error(message), context);
    }

    // ── Log ──────────────────────────────────────────────────────────────────
    logError(standardized);

    // ── Notify external reporters ────────────────────────────────────────────
    try {
      onError?.(standardized);
    } catch (reporterError) {
      // FIX (TS2769): pino requires object first, message string second
      logger.error({ error: reporterError }, 'Error reporter threw; ignoring');
    }

    // ── Build response ───────────────────────────────────────────────────────
    const body = toErrorResponse(standardized);

    if (exposeInternals) {
      // FIX (TS2352): ErrorResponse has no index signature so a direct cast to
      // Record<string, unknown> is rejected. Passing through `unknown` first
      // satisfies TypeScript while preserving the intended runtime behaviour.
      (body as unknown as Record<string, unknown>)['_internal'] = {
        message:    standardized.message,
        stackTrace: standardized.stackTrace,
      };
    }

    if (res.headersSent) return;
    res.status(standardized.httpStatusCode).json(body);
  };
}

/**
 * Sends a ServiceResult as an HTTP response. Handles both success and error
 * paths so route handlers are reduced to a single expression.
 *
 * @example
 * router.get('/:id', async (req, res, next) => {
 *   const ctx    = extractRequestContext(req, 'getBill');
 *   const result = await billService.getBill(req.params.id, ctx);
 *   sendResult(result, res, 200);
 * });
 */
export function sendResult<T>(
  result:         { isOk(): boolean; value: T; isErr(): boolean; error: StandardizedError },
  res:            Response,
  successStatus = 200,
): void {
  if (result.isOk()) {
    res.status(successStatus).json({ success: true, data: result.value });
    return;
  }
  res.status(result.error.httpStatusCode).json(toErrorResponse(result.error));
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isStandardizedError(value: unknown): value is StandardizedError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id'             in value &&
    'category'       in value &&
    'userMessage'    in value &&
    'httpStatusCode' in value
  );
}

function isJoiValidationError(
  value: unknown,
): value is { name: string; details: Array<{ path: string[]; message: string }> } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { name?: string }).name === 'ValidationError' &&
    Array.isArray((value as { details?: unknown }).details)
  );
}

function isZodValidationError(
  value: unknown,
): value is { issues: Array<{ path: (string | number)[]; message: string }> } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { issues?: unknown }).issues) &&
    typeof (value as { name?: string }).name === 'string' &&
    (value as { name: string }).name === 'ZodError'
  );
}

function categoryFromStatus(status: number): ErrorCategory {
  if (status === 400 || status === 422) return ErrorCategory.VALIDATION;
  if (status === 401)                   return ErrorCategory.AUTHENTICATION;
  if (status === 403)                   return ErrorCategory.AUTHORIZATION;
  if (status === 404)                   return ErrorCategory.NOT_FOUND;
  if (status === 409)                   return ErrorCategory.CONFLICT;
  if (status === 429)                   return ErrorCategory.RATE_LIMIT;
  if (status === 502 || status === 503 || status === 504)
    return ErrorCategory.EXTERNAL_SERVICE;
  return ErrorCategory.SYSTEM;
}

/**
 * Logs a StandardizedError at the appropriate pino level.
 *
 * Routing:
 *  5xx → error  (server fault; always requires attention)
 *  4xx → warn   (client fault; noisy at error level)
 *  other → info
 *
 * FIX (TS2345, TS2769):
 *  - pino's signature is logger.level(object, message) — object first.
 *  - `originalError` was previously passed as a third argument, which pino
 *    does not support. It is now merged into the log object instead.
 */
function logError(error: StandardizedError): void {
  const base = {
    errorId:       error.id,
    code:          error.code,
    category:      error.category,
    severity:      error.severity,
    service:       error.context.service,
    operation:     error.context.operation,
    userId:        error.context.userId,
    requestId:     error.context.requestId,
    correlationId: error.context.correlationId,
    retryable:     error.retryable,
    httpStatus:    error.httpStatusCode,
  };

  if (error.httpStatusCode >= 500) {
    logger.error(
      { ...base, ...(error.originalError != null && { originalError: error.originalError }) },
      error.message,
    );
  } else if (error.httpStatusCode >= 400) {
    logger.warn(base, error.message);
  } else {
    logger.info(base, error.message);
  }
}