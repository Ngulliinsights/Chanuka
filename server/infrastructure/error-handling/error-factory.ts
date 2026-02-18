/**
 * Error Factory
 *
 * The single authoritative source for constructing StandardizedError objects.
 * All business rules for severity, user messages, HTTP status codes, and
 * retryability live here and nowhere else.
 *
 * Design contract:
 *  - Pure construction. Zero side effects (no logging, no tracking, no I/O).
 *  - Does not import Boom, neverthrow, Express, or any framework.
 *  - Does not return Result types — that is the responsibility of result-types.ts.
 *  - Callers decide whether to log or track the returned error.
 *
 * Why this exists:
 *  Both error-standardization.ts and error-adapter.ts maintained their own
 *  near-identical copies of severity/message/retryability tables and factory
 *  methods. The two diverged silently (different user messages, different
 *  retryability for DATABASE, different code strings for the same concept).
 *  This module is the single place those rules are defined.
 *
 * Dependency rule: error-factory.ts → types.ts only
 */

import {
  ErrorCategory,
  ErrorContext,
  ErrorSeverity,
  StandardizedError,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Business-Rule Tables
// ─────────────────────────────────────────────────────────────────────────────
// These are the canonical definitions. Updating them here propagates everywhere.

const SEVERITY_BY_CATEGORY: Readonly<Record<ErrorCategory, ErrorSeverity>> = {
  [ErrorCategory.VALIDATION]:       ErrorSeverity.LOW,
  [ErrorCategory.NOT_FOUND]:        ErrorSeverity.LOW,
  [ErrorCategory.AUTHENTICATION]:   ErrorSeverity.MEDIUM,
  [ErrorCategory.AUTHORIZATION]:    ErrorSeverity.MEDIUM,
  [ErrorCategory.CONFLICT]:         ErrorSeverity.MEDIUM,
  [ErrorCategory.RATE_LIMIT]:       ErrorSeverity.MEDIUM,
  [ErrorCategory.BUSINESS_LOGIC]:   ErrorSeverity.MEDIUM,
  [ErrorCategory.EXTERNAL_SERVICE]: ErrorSeverity.HIGH,
  [ErrorCategory.DATABASE]:         ErrorSeverity.HIGH,
  [ErrorCategory.SYSTEM]:           ErrorSeverity.CRITICAL,
};

const HTTP_STATUS_BY_CATEGORY: Readonly<Record<ErrorCategory, number>> = {
  [ErrorCategory.VALIDATION]:       400,
  [ErrorCategory.AUTHENTICATION]:   401,
  [ErrorCategory.AUTHORIZATION]:    403,
  [ErrorCategory.NOT_FOUND]:        404,
  [ErrorCategory.CONFLICT]:         409,
  [ErrorCategory.RATE_LIMIT]:       429,
  [ErrorCategory.EXTERNAL_SERVICE]: 503,
  [ErrorCategory.DATABASE]:         500,
  [ErrorCategory.BUSINESS_LOGIC]:   422,
  [ErrorCategory.SYSTEM]:           500,
};

const USER_MESSAGE_BY_CATEGORY: Readonly<Record<ErrorCategory, string>> = {
  [ErrorCategory.VALIDATION]:       'Please check your input and try again.',
  [ErrorCategory.AUTHENTICATION]:   'Please log in to continue.',
  [ErrorCategory.AUTHORIZATION]:    'You do not have permission to perform this action.',
  [ErrorCategory.NOT_FOUND]:        'The requested resource could not be found.',
  [ErrorCategory.CONFLICT]:         'This action conflicts with existing data. Please check and try again.',
  [ErrorCategory.RATE_LIMIT]:       'Too many requests. Please wait a moment before trying again.',
  [ErrorCategory.EXTERNAL_SERVICE]: 'A required service is temporarily unavailable. Please try again later.',
  [ErrorCategory.DATABASE]:         'A database error occurred. Please try again later.',
  [ErrorCategory.BUSINESS_LOGIC]:   'This action is not permitted by business rules.',
  [ErrorCategory.SYSTEM]:           'An internal error occurred. Please contact support if this persists.',
};

/**
 * Categories whose errors are transiently retryable by default.
 * Note: DATABASE connection errors are retryable but query errors are not —
 * that distinction is made at call sites via the `retryable` override.
 */
const RETRYABLE_CATEGORIES: ReadonlySet<ErrorCategory> = new Set([
  ErrorCategory.RATE_LIMIT,
  ErrorCategory.EXTERNAL_SERVICE,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Internal Utilities
// ─────────────────────────────────────────────────────────────────────────────

function generateErrorId(): string {
  // Timestamp component ensures sortability; random component avoids collisions
  // under high concurrency without a UUID library dependency.
  const ts   = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `err_${ts}_${rand}`;
}

/**
 * Produces a code like `VALIDATION_FAILED` or `DATABASE_OPERATION_ERROR`.
 * The category portion is normalised (spaces → underscores, uppercase).
 */
function defaultCodeForCategory(
  category: ErrorCategory,
  suffix: string = 'ERROR',
): string {
  const base = category.toUpperCase().replace(/-/g, '_');
  return `${base}_${suffix}`;
}

function buildContext(partial: Partial<ErrorContext>): ErrorContext {
  return {
    service:   partial.service   ?? 'unknown',
    operation: partial.operation ?? 'unknown',
    timestamp: partial.timestamp ?? new Date(),
    ...(partial.requestId     != null && { requestId:     partial.requestId }),
    ...(partial.correlationId != null && { correlationId: partial.correlationId }),
    ...(partial.userId        != null && { userId:        partial.userId }),
    ...(partial.metadata      != null && { metadata:      partial.metadata }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Builder
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateErrorOptions {
  /** Override the generated error code */
  code?:           string;
  /** Override the derived severity */
  severity?:       ErrorSeverity;
  /** Override the safe user-facing message */
  userMessage?:    string;
  /** Override whether the error is retryable */
  retryable?:      boolean;
  /** Override the HTTP status code */
  httpStatusCode?: number;
}

/**
 * Core factory. All the domain-specific helpers below delegate here.
 * Accepts either an `Error` instance (preserves stack trace) or a raw string.
 */
export function createError(
  input:    Error | string,
  category: ErrorCategory,
  context:  Partial<ErrorContext>,
  options:  CreateErrorOptions = {},
): StandardizedError {
  const originalError = input instanceof Error ? input : new Error(input);

  const severity      = options.severity      ?? SEVERITY_BY_CATEGORY[category];
  const httpStatusCode = options.httpStatusCode ?? HTTP_STATUS_BY_CATEGORY[category];
  const userMessage   = options.userMessage   ?? USER_MESSAGE_BY_CATEGORY[category];
  const retryable     = options.retryable     ?? RETRYABLE_CATEGORIES.has(category);
  const code          = options.code          ?? defaultCodeForCategory(category);

  return {
    id:            generateErrorId(),
    code,
    category,
    severity,
    message:       originalError.message,
    userMessage,
    context:       buildContext(context),
    retryable,
    httpStatusCode,
    originalError,
    ...(originalError.stack != null && { stackTrace: originalError.stack }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain-Specific Factories
// ─────────────────────────────────────────────────────────────────────────────
// Each factory encapsulates the domain knowledge for its error class and
// expresses it through `createError` — there is exactly one place to look for
// each category's defaults.

export function createValidationError(
  fields:  Array<{ field: string; message: string; value?: unknown }>,
  context: Partial<ErrorContext>,
): StandardizedError {
  const detail  = fields.map(f => `${f.field}: ${f.message}`).join('; ');
  const message = `Validation failed — ${detail}`;

  return createError(message, ErrorCategory.VALIDATION, context, {
    code:        'VALIDATION_FAILED',
    severity:    ErrorSeverity.LOW,
    userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.VALIDATION],
    retryable:   false,
  });
}

export function createAuthenticationError(
  reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials',
  context: Partial<ErrorContext>,
): StandardizedError {
  const internalMessages: Record<typeof reason, string> = {
    invalid_token:       'Authentication token failed signature verification',
    expired_token:       'Authentication token has expired',
    missing_token:       'No authentication token was provided',
    invalid_credentials: 'Username or password is incorrect',
  };

  // User messages are deliberately less specific to avoid leaking auth state
  const safeUserMessages: Record<typeof reason, string> = {
    invalid_token:       'Your session is invalid. Please log in again.',
    expired_token:       'Your session has expired. Please log in again.',
    missing_token:       'Authentication is required. Please log in.',
    invalid_credentials: 'Invalid username or password.',
  };

  return createError(
    internalMessages[reason],
    ErrorCategory.AUTHENTICATION,
    context,
    {
      code:        `AUTH_${reason.toUpperCase()}`,
      severity:    ErrorSeverity.MEDIUM,
      userMessage: safeUserMessages[reason],
      retryable:   false,
    },
  );
}

export function createAuthorizationError(
  resource: string,
  action:   string,
  context:  Partial<ErrorContext>,
): StandardizedError {
  return createError(
    `Insufficient permissions to perform '${action}' on '${resource}'`,
    ErrorCategory.AUTHORIZATION,
    context,
    {
      code:        'ACCESS_DENIED',
      severity:    ErrorSeverity.MEDIUM,
      userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.AUTHORIZATION],
      retryable:   false,
    },
  );
}

export function createNotFoundError(
  resource:   string,
  identifier: string,
  context:    Partial<ErrorContext>,
): StandardizedError {
  return createError(
    `${resource} not found with identifier '${identifier}'`,
    ErrorCategory.NOT_FOUND,
    context,
    {
      code:        'RESOURCE_NOT_FOUND',
      severity:    ErrorSeverity.LOW,
      userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.NOT_FOUND],
      retryable:   false,
    },
  );
}

export function createConflictError(
  resource: string,
  reason:   string,
  context:  Partial<ErrorContext>,
): StandardizedError {
  return createError(
    `Conflict with ${resource}: ${reason}`,
    ErrorCategory.CONFLICT,
    context,
    {
      code:        'RESOURCE_CONFLICT',
      severity:    ErrorSeverity.MEDIUM,
      userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.CONFLICT],
      retryable:   false,
    },
  );
}

export function createRateLimitError(
  limit:   number,
  window:  string,
  context: Partial<ErrorContext>,
): StandardizedError {
  return createError(
    `Rate limit of ${limit} requests per ${window} exceeded`,
    ErrorCategory.RATE_LIMIT,
    context,
    {
      code:        'RATE_LIMIT_EXCEEDED',
      severity:    ErrorSeverity.MEDIUM,
      userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.RATE_LIMIT],
      retryable:   true,
    },
  );
}

export function createExternalServiceError(
  serviceName:   string,
  originalError: Error,
  context:       Partial<ErrorContext>,
): StandardizedError {
  // Network-layer signals that are unambiguously transient
  const isTransient = isTransientNetworkError(originalError);

  return createError(
    `External service '${serviceName}' returned an error: ${originalError.message}`,
    ErrorCategory.EXTERNAL_SERVICE,
    context,
    {
      code:        'EXTERNAL_SERVICE_ERROR',
      severity:    isTransient ? ErrorSeverity.HIGH : ErrorSeverity.CRITICAL,
      userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.EXTERNAL_SERVICE],
      retryable:   isTransient,
    },
  );
}

export function createDatabaseError(
  operation:     string,
  originalError: Error,
  context:       Partial<ErrorContext>,
): StandardizedError {
  // Connection / timeout failures are transient; constraint violations are not.
  const isConnectionError = isTransientDatabaseError(originalError);

  return createError(
    `Database error during '${operation}': ${originalError.message}`,
    ErrorCategory.DATABASE,
    context,
    {
      code:        isConnectionError ? 'DATABASE_CONNECTION_ERROR' : 'DATABASE_OPERATION_ERROR',
      severity:    isConnectionError ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
      userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.DATABASE],
      retryable:   isConnectionError,
    },
  );
}

export function createBusinessLogicError(
  rule:    string,
  details: string,
  context: Partial<ErrorContext>,
): StandardizedError {
  return createError(
    `Business rule violation — ${rule}: ${details}`,
    ErrorCategory.BUSINESS_LOGIC,
    context,
    {
      code:        'BUSINESS_RULE_VIOLATION',
      severity:    ErrorSeverity.MEDIUM,
      userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.BUSINESS_LOGIC],
      retryable:   false,
    },
  );
}

export function createSystemError(
  originalError: Error,
  context:       Partial<ErrorContext>,
  code = 'INTERNAL_ERROR',
): StandardizedError {
  return createError(
    originalError.message,
    ErrorCategory.SYSTEM,
    context,
    {
      code,
      severity:    ErrorSeverity.CRITICAL,
      userMessage: USER_MESSAGE_BY_CATEGORY[ErrorCategory.SYSTEM],
      retryable:   false,
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Read-Only Table Accessors
// ─────────────────────────────────────────────────────────────────────────────
// Exposed so that http-error-handler.ts and result-types.ts can look up
// mappings without duplicating the tables themselves.

export function severityForCategory(category: ErrorCategory): ErrorSeverity {
  return SEVERITY_BY_CATEGORY[category] ?? ErrorSeverity.MEDIUM;
}

export function httpStatusForCategory(category: ErrorCategory): number {
  return HTTP_STATUS_BY_CATEGORY[category] ?? 500;
}

export function userMessageForCategory(category: ErrorCategory): string {
  return USER_MESSAGE_BY_CATEGORY[category] ?? 'An error occurred. Please try again.';
}

export function categoryIsRetryable(category: ErrorCategory): boolean {
  return RETRYABLE_CATEGORIES.has(category);
}

// ─────────────────────────────────────────────────────────────────────────────
// Private Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isTransientNetworkError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  const code = (error as NodeJS.ErrnoException).code ?? '';
  return (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT'    ||
    code === 'ENOTFOUND'    ||
    code === 'ECONNRESET'   ||
    msg.includes('timeout')  ||
    msg.includes('connection') ||
    msg.includes('network')    ||
    msg.includes('unavailable')
  );
}

function isTransientDatabaseError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('connection') ||
    msg.includes('timeout')    ||
    msg.includes('econnrefused') ||
    msg.includes('too many connections')
  );
}