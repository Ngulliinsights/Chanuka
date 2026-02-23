/**
 * Error Handling - Shared Types
 *
 * The canonical type contracts for the entire error handling system.
 * This module has zero logic — only definitions. Every other module
 * in this system depends on these types; nothing here depends on anything else.
 *
 * Dependency rule: types.ts → nothing
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enumerations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Functional category of an error. Determines default severity,
 * HTTP status code, user-facing message, and retryability. When you add
 * a new category here you must also update the lookup tables in error-factory.ts.
 */
export enum ErrorCategory {
  VALIDATION       = 'validation',
  AUTHENTICATION   = 'authentication',
  AUTHORIZATION    = 'authorization',
  NOT_FOUND        = 'not_found',
  CONFLICT         = 'conflict',
  RATE_LIMIT       = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE         = 'database',
  BUSINESS_LOGIC   = 'business_logic',
  SYSTEM           = 'system',
}

/**
 * Operational severity — imported from the shared single source of truth.
 * Re-exported here so downstream server modules can keep importing from this file.
 */
import { ErrorSeverity } from '@shared/core';
export { ErrorSeverity };

/**
 * Circuit breaker operating states (see resilience.ts).
 */
export enum CircuitState {
  CLOSED    = 'CLOSED',    // Normal operation — requests pass through
  OPEN      = 'OPEN',      // Failure threshold exceeded — requests rejected immediately
  HALF_OPEN = 'HALF_OPEN', // Probe window — one trial request allowed through
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Error Shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contextual metadata attached to every error at the point it is raised.
 * service + operation are required so errors are always attributable; all
 * HTTP / user fields are optional since errors can originate outside requests.
 */
export interface ErrorContext {
  service:        string;
  operation:      string;
  timestamp:      Date;
  requestId?:     string;
  correlationId?: string;
  userId?:        string;
  metadata?:      Record<string, unknown>;
}

/**
 * The canonical error representation used throughout the application.
 * Created exclusively by error-factory.ts; never constructed ad-hoc.
 *
 * Design rules:
 *  - `message`     is the internal, developer-facing description
 *  - `userMessage` is safe for end-users and never contains stack frames
 *  - `retryable`   drives client retry strategies and Result-type helpers
 *  - `originalError` is kept for server-side logging only; never serialised to API responses
 */
export interface StandardizedError {
  id:              string;
  code:            string;
  category:        ErrorCategory;
  severity:        ErrorSeverity;
  message:         string;
  userMessage:     string;
  context:         ErrorContext;
  retryable:       boolean;
  httpStatusCode:  number;
  originalError?:  Error;
  stackTrace?:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP / API Response Shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The JSON body shape returned to API consumers when an operation fails.
 * Constructed exclusively by http-error-handler.ts; never by service code.
 */
export interface ErrorResponse {
  success: false;
  error: {
    id:        string;
    code:      string;
    message:   string;   // userMessage, not internal message
    category:  string;
    retryable: boolean;
    timestamp: string;
  };
  metadata: {
    requestId?:     string;
    correlationId?: string;
    service:        string;
    operation:      string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resilience / Retry Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?:        number;
  /** Delay before first retry in ms (default: 200) */
  initialDelayMs?:     number;
  /** Cap on retry delay in ms (default: 10 000) */
  maxDelayMs?:         number;
  /** Multiplier applied to delay on each failure (default: 2) */
  backoffMultiplier?:  number;
  /** Predicate used to decide if a thrown error warrants a retry */
  retryableErrors?:    (error: unknown) => boolean;
  /** Called each time a retry is scheduled — useful for telemetry */
  onRetry?:            (attempt: number, error: unknown, nextDelayMs: number) => void;
}

export interface CircuitBreakerOptions {
  /** How many consecutive failures before opening the circuit (default: 5) */
  failureThreshold:    number;
  /** Milliseconds the circuit stays open before allowing a probe (default: 60 000) */
  resetTimeoutMs:      number;
  /** Milliseconds of inactivity after which failure counter resets (default: 120 000) */
  rollingWindowMs?:    number;
}

export interface CircuitBreakerStats {
  state:            CircuitState;
  consecutiveFails: number;
  lastFailureTime:  number | null;
  totalSuccess:     number;
  totalFailure:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Tracker / Observability Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackedError {
  id:               string;
  message:          string;
  stack?:           string;
  code?:            string;
  severity:         ErrorSeverity;
  category:         ErrorCategory;
  timestamp:        Date;
  requestContext?:  RequestErrorContext;
  resolved:         boolean;
  resolvedAt?:      Date;
  resolvedBy?:      string;
  occurrenceCount:  number;
  firstOccurrence:  Date;
  lastOccurrence:   Date;
  fingerprint:      string;
}

/**
 * HTTP-specific context captured by the tracker when errors originate from
 * an Express request. Kept separate from ErrorContext so the tracker can
 * record fields (raw headers, body) that we do not want flowing through
 * the domain layer.
 */
export interface RequestErrorContext {
  traceId?:   string;
  userId?:    string;
  userAgent?: string;
  ip?:        string;
  url?:       string;
  method?:    string;
  endpoint?:  string;
  headers?:   Record<string, string>;
  body?:      unknown;
  query?:     unknown;
  params?:    unknown;
}

export interface ErrorPattern {
  fingerprint:    string;
  message:        string;
  category:       ErrorCategory;
  severity:       ErrorSeverity;
  occurrences:    number;
  firstSeen:      Date;
  lastSeen:       Date;
  resolved:       boolean;
  alertSent:      boolean;
  alertThreshold: number;
}

export interface AlertRule {
  id:      string;
  name:    string;
  condition: {
    errorRate?:  number;   // percentage
    errorCount?: number;   // count within timeWindow
    timeWindow:  number;   // minutes
    severity?:   ErrorSeverity[];
    category?:   ErrorCategory[];
  };
  actions: AlertAction[];
  enabled:        boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface AlertAction {
  type:             'email' | 'webhook' | 'log' | 'external_integration';
  target:           string;
  template?:        string;
  integrationName?: string;
}