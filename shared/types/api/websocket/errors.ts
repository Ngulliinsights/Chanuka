/**
 * WebSocket Error Types - Standard Hierarchy
 *
 * Comprehensive WebSocket error hierarchy following the established error patterns
 * from shared/types/core/errors.ts with WebSocket-specific extensions.
 *
 * @module websocket-errors
 * @version 1.0.0
 */

import { AppError, ErrorSeverity, type ErrorCode } from '../../core/errors';

// ============================================================================
// WebSocket Error Hierarchy
// ============================================================================

/**
 * Base WebSocket error class
 * Extends AppError with WebSocket-specific properties
 */
export abstract class WebSocketError extends AppError {
  /**
   * WebSocket connection ID associated with this error (if applicable)
   */
  public readonly connectionId?: string | undefined;

  /**
   * WebSocket message ID associated with this error (if applicable)
   */
  public readonly messageId?: string | undefined;

  /**
   * Indicates whether the connection can be recovered from this error
   */
  public readonly recoverable?: boolean | undefined;

  /**
   * Additional context for the error
   */
  public readonly context?: Readonly<Record<string, unknown>>;

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean
  ) {
    super(message, code, severity, context);
    this.context = context;
    this.connectionId = connectionId;
    this.messageId = messageId;
    this.recoverable = recoverable;
  }
}

/**
 * WebSocket connection error
 * Errors related to connection establishment, maintenance, and termination
 */
export class WebSocketConnectionError extends WebSocketError {
  override readonly code = 'WEBSOCKET_CONNECTION_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.HIGH;

  /**
   * WebSocket close code (if applicable)
   */
  public readonly closeCode?: number | undefined;

  /**
   * WebSocket close reason (if applicable)
   */
  public readonly closeReason?: string | undefined;

  constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    closeCode?: number,
    closeReason?: string
  ) {
    super(message, 'WEBSOCKET_CONNECTION_ERROR' as ErrorCode, ErrorSeverity.HIGH, context, connectionId, messageId, recoverable);
    this.closeCode = closeCode;
    this.closeReason = closeReason;
  }
}

/**
 * WebSocket authentication error
 * Errors related to authentication and authorization
 */
export class WebSocketAuthError extends WebSocketError {
  override readonly code = 'WEBSOCKET_AUTH_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.HIGH;

  /**
   * Authentication method that failed
   */
  public readonly authMethod?: string | undefined;

  /**
   * Indicates if this is a token expiration issue
   */
  public readonly isTokenExpired?: boolean | undefined;

  constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    authMethod?: string,
    isTokenExpired?: boolean
  ) {
    super(message, 'WEBSOCKET_AUTH_ERROR' as ErrorCode, ErrorSeverity.HIGH, context, connectionId, messageId, recoverable);
    this.authMethod = authMethod;
    this.isTokenExpired = isTokenExpired;
  }
}

/**
 * WebSocket message error
 * Errors related to message processing, validation, and handling
 */
export class WebSocketMessageError extends WebSocketError {
  override readonly code = 'WEBSOCKET_MESSAGE_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.MEDIUM;

  /**
   * Message type that caused the error
   */
  public readonly messageType?: string | undefined;

  /**
   * Indicates if this is a message format/validation error
   */
  public readonly isValidationError?: boolean | undefined;

  constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    messageType?: string,
    isValidationError?: boolean
  ) {
    super(message, 'WEBSOCKET_MESSAGE_ERROR' as ErrorCode, ErrorSeverity.MEDIUM, context, connectionId, messageId, recoverable);
    this.messageType = messageType;
    this.isValidationError = isValidationError;
  }
}

/**
 * WebSocket subscription error
 * Errors related to subscription management
 */
export class WebSocketSubscriptionError extends WebSocketError {
  override readonly code = 'WEBSOCKET_SUBSCRIPTION_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.MEDIUM;

  /**
   * Subscription ID that caused the error
   */
  public readonly subscriptionId?: string | undefined;

  /**
   * Topic that caused the error
   */
  public readonly topic?: string | undefined;

  /**
   * Indicates if this is a duplicate subscription
   */
  public readonly isDuplicate?: boolean | undefined;

  constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    subscriptionId?: string,
    topic?: string,
    isDuplicate?: boolean
  ) {
    super(message, 'WEBSOCKET_SUBSCRIPTION_ERROR' as ErrorCode, ErrorSeverity.MEDIUM, context, connectionId, messageId, recoverable);
    this.subscriptionId = subscriptionId;
    this.topic = topic;
    this.isDuplicate = isDuplicate;
  }
}

/**
 * WebSocket protocol error
 * Errors related to protocol violations and compatibility issues
 */
export class WebSocketProtocolError extends WebSocketError {
  override readonly code = 'WEBSOCKET_PROTOCOL_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.HIGH;

  /**
   * Expected protocol version
   */
  public readonly expectedProtocol?: string | undefined;

  /**
   * Actual protocol version
   */
  public readonly actualProtocol?: string | undefined;

  constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    expectedProtocol?: string,
    actualProtocol?: string
  ) {
    super(message, 'WEBSOCKET_PROTOCOL_ERROR' as ErrorCode, ErrorSeverity.HIGH, context, connectionId, messageId, recoverable);
    this.expectedProtocol = expectedProtocol;
    this.actualProtocol = actualProtocol;
  }
}

/**
 * WebSocket timeout error
 * Errors related to timeouts in WebSocket operations
 */
export class WebSocketTimeoutError extends WebSocketError {
  override readonly code = 'WEBSOCKET_TIMEOUT_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.MEDIUM;

  /**
   * Timeout duration in milliseconds
   */
  public readonly timeout: number;

  /**
   * Operation that timed out
   */
  public readonly operation?: string | undefined;

  constructor(
    message: string,
    timeout: number,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    operation?: string
  ) {
    super(message, 'WEBSOCKET_TIMEOUT_ERROR' as ErrorCode, ErrorSeverity.MEDIUM, context, connectionId, messageId, recoverable);
    this.timeout = timeout;
    this.operation = operation;
  }
}

/**
 * WebSocket rate limit error
 * Errors related to rate limiting and throttling
 */
export class WebSocketRateLimitError extends WebSocketError {
  override readonly code = 'WEBSOCKET_RATE_LIMIT_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.MEDIUM;

  /**
   * Rate limit threshold
   */
  public readonly limit: number;

  /**
   * Time window for the rate limit in milliseconds
   */
  public readonly window: number;

  /**
   * Time when the rate limit will reset in milliseconds
   */
  public readonly resetTime?: number | undefined;

  constructor(
    message: string,
    limit: number,
    window: number,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    resetTime?: number
  ) {
    super(message, 'WEBSOCKET_RATE_LIMIT_ERROR' as ErrorCode, ErrorSeverity.MEDIUM, context, connectionId, messageId, recoverable);
    this.limit = limit;
    this.window = window;
    this.resetTime = resetTime;
  }
}

/**
 * WebSocket server error
 * Errors originating from the server side
 */
export class WebSocketServerError extends WebSocketError {
  override readonly code = 'WEBSOCKET_SERVER_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.CRITICAL;

  /**
   * Server component that failed
   */
  public readonly component?: string | undefined;

  /**
   * Original server error (if available)
   */
  public readonly originalError?: Error | undefined;

  constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    component?: string,
    originalError?: Error
  ) {
    super(message, 'WEBSOCKET_SERVER_ERROR' as ErrorCode, ErrorSeverity.CRITICAL, context, connectionId, messageId, recoverable);
    this.component = component;
    this.originalError = originalError;
  }
}

/**
 * WebSocket client error
 * Errors originating from the client side
 */
export class WebSocketClientError extends WebSocketError {
  override readonly code = 'WEBSOCKET_CLIENT_ERROR' as ErrorCode;
  override readonly severity = ErrorSeverity.MEDIUM;

  /**
   * Client platform information
   */
  public readonly platform?: string | undefined;

  /**
   * Client version information
   */
  public readonly version?: string | undefined;

  constructor(
    message: string,
    context?: Readonly<Record<string, unknown>>,
    connectionId?: string,
    messageId?: string,
    recoverable?: boolean,
    platform?: string,
    version?: string
  ) {
    super(message, 'WEBSOCKET_CLIENT_ERROR' as ErrorCode, ErrorSeverity.MEDIUM, context, connectionId, messageId, recoverable);
    this.platform = platform;
    this.version = version;
  }
}

// ============================================================================
// Type Guards for WebSocket Errors
// ============================================================================

/**
 * Type guard for WebSocketError
 */
export function isWebSocketError(error: unknown): error is WebSocketError {
  return error instanceof WebSocketError;
}

/**
 * Type guard for WebSocketConnectionError
 */
export function isWebSocketConnectionError(error: unknown): error is WebSocketConnectionError {
  return error instanceof WebSocketConnectionError;
}

/**
 * Type guard for WebSocketAuthError
 */
export function isWebSocketAuthError(error: unknown): error is WebSocketAuthError {
  return error instanceof WebSocketAuthError;
}

/**
 * Type guard for WebSocketMessageError
 */
export function isWebSocketMessageError(error: unknown): error is WebSocketMessageError {
  return error instanceof WebSocketMessageError;
}

/**
 * Type guard for WebSocketSubscriptionError
 */
export function isWebSocketSubscriptionError(error: unknown): error is WebSocketSubscriptionError {
  return error instanceof WebSocketSubscriptionError;
}

/**
 * Type guard for WebSocketProtocolError
 */
export function isWebSocketProtocolError(error: unknown): error is WebSocketProtocolError {
  return error instanceof WebSocketProtocolError;
}

/**
 * Type guard for WebSocketTimeoutError
 */
export function isWebSocketTimeoutError(error: unknown): error is WebSocketTimeoutError {
  return error instanceof WebSocketTimeoutError;
}

/**
 * Type guard for WebSocketRateLimitError
 */
export function isWebSocketRateLimitError(error: unknown): error is WebSocketRateLimitError {
  return error instanceof WebSocketRateLimitError;
}

/**
 * Type guard for WebSocketServerError
 */
export function isWebSocketServerError(error: unknown): error is WebSocketServerError {
  return error instanceof WebSocketServerError;
}

/**
 * Type guard for WebSocketClientError
 */
export function isWebSocketClientError(error: unknown): error is WebSocketClientError {
  return error instanceof WebSocketClientError;
}

// ============================================================================
// Error Creation Utilities
// ============================================================================

/**
 * Create a WebSocket connection error
 */
export function createConnectionError(
  message: string,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    closeCode?: number;
    closeReason?: string;
  }
): WebSocketConnectionError {
  return new WebSocketConnectionError(
    message,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.closeCode,
    options?.closeReason
  );
}

/**
 * Create a WebSocket authentication error
 */
export function createAuthError(
  message: string,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    authMethod?: string;
    isTokenExpired?: boolean;
  }
): WebSocketAuthError {
  return new WebSocketAuthError(
    message,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.authMethod,
    options?.isTokenExpired
  );
}

/**
 * Create a WebSocket message error
 */
export function createMessageError(
  message: string,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    messageType?: string;
    isValidationError?: boolean;
  }
): WebSocketMessageError {
  return new WebSocketMessageError(
    message,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.messageType,
    options?.isValidationError
  );
}

/**
 * Create a WebSocket subscription error
 */
export function createSubscriptionError(
  message: string,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    subscriptionId?: string;
    topic?: string;
    isDuplicate?: boolean;
  }
): WebSocketSubscriptionError {
  return new WebSocketSubscriptionError(
    message,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.subscriptionId,
    options?.topic,
    options?.isDuplicate
  );
}

/**
 * Create a WebSocket protocol error
 */
export function createProtocolError(
  message: string,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    expectedProtocol?: string;
    actualProtocol?: string;
  }
): WebSocketProtocolError {
  return new WebSocketProtocolError(
    message,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.expectedProtocol,
    options?.actualProtocol
  );
}

/**
 * Create a WebSocket timeout error
 */
export function createTimeoutError(
  message: string,
  timeout: number,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    operation?: string;
  }
): WebSocketTimeoutError {
  return new WebSocketTimeoutError(
    message,
    timeout,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.operation
  );
}

/**
 * Create a WebSocket rate limit error
 */
export function createRateLimitError(
  message: string,
  limit: number,
  window: number,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    resetTime?: number;
  }
): WebSocketRateLimitError {
  return new WebSocketRateLimitError(
    message,
    limit,
    window,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.resetTime
  );
}

/**
 * Create a WebSocket server error
 */
export function createServerError(
  message: string,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    component?: string;
    originalError?: Error;
  }
): WebSocketServerError {
  return new WebSocketServerError(
    message,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.component,
    options?.originalError
  );
}

/**
 * Create a WebSocket client error
 */
export function createClientError(
  message: string,
  options?: {
    context?: Readonly<Record<string, unknown>>;
    connectionId?: string;
    messageId?: string;
    recoverable?: boolean;
    platform?: string;
    version?: string;
  }
): WebSocketClientError {
  return new WebSocketClientError(
    message,
    options?.context,
    options?.connectionId,
    options?.messageId,
    options?.recoverable,
    options?.platform,
    options?.version
  );
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Extract WebSocket-specific error information for logging and monitoring
 */
export function extractWebSocketErrorInfo(error: unknown): {
  code?: string | undefined;
  severity?: ErrorSeverity | undefined;
  message?: string;
  context?: Readonly<Record<string, unknown>> | undefined;
  connectionId?: string | undefined;
  messageId?: string | undefined;
  recoverable?: boolean | undefined;
  stack?: string | undefined;
} {
  if (isWebSocketError(error)) {
    return {
      code: error.code,
      severity: error.severity,
      message: error.message,
      context: error.context,
      connectionId: error.connectionId,
      messageId: error.messageId,
      recoverable: error.recoverable,
      stack: error.stack,
    };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}

/**
 * Convert WebSocket error to safe object for serialization
 */
export function websocketErrorToSafeObject(error: unknown): Record<string, unknown> {
  if (isWebSocketError(error)) {
    const result: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      code: error.code,
      severity: error.severity,
      context: error.context,
      connectionId: error.connectionId,
      messageId: error.messageId,
      recoverable: error.recoverable,
      stack: error.stack,
    };

    // Add type-specific properties
    if (isWebSocketConnectionError(error)) {
      result.closeCode = error.closeCode;
      result.closeReason = error.closeReason;
    } else if (isWebSocketAuthError(error)) {
      result.authMethod = error.authMethod;
      result.isTokenExpired = error.isTokenExpired;
    } else if (isWebSocketMessageError(error)) {
      result.messageType = error.messageType;
      result.isValidationError = error.isValidationError;
    } else if (isWebSocketSubscriptionError(error)) {
      result.subscriptionId = error.subscriptionId;
      result.topic = error.topic;
      result.isDuplicate = error.isDuplicate;
    } else if (isWebSocketProtocolError(error)) {
      result.expectedProtocol = error.expectedProtocol;
      result.actualProtocol = error.actualProtocol;
    } else if (isWebSocketTimeoutError(error)) {
      result.timeout = error.timeout;
      result.operation = error.operation;
    } else if (isWebSocketRateLimitError(error)) {
      result.limit = error.limit;
      result.window = error.window;
      result.resetTime = error.resetTime;
    } else if (isWebSocketServerError(error)) {
      result.component = error.component;
      result.originalError = error.originalError ? errorToSafeObject(error.originalError) : undefined;
    } else if (isWebSocketClientError(error)) {
      result.platform = error.platform;
      result.version = error.version;
    }

    return result;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack as string | undefined,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Helper function to convert regular errors to safe objects
 */
function errorToSafeObject(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}