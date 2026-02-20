/**
 * Error Adapter V2 (REFACTORED)
 * 
 * Standardized error handling for graph operations.
 * 
 * IMPROVEMENTS:
 * - ✅ Typed error codes
 * - ✅ Error classification
 * - ✅ Context preservation
 * - ✅ Logging integration
 * - ✅ Stack trace capture
 */

import { logger } from '@server/infrastructure/observability';

export enum GraphErrorCode {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  
  // Query errors
  QUERY_FAILED = 'QUERY_FAILED',
  INVALID_QUERY = 'INVALID_QUERY',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  
  // Data errors
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTITY = 'DUPLICATE_ENTITY',
  
  // Sync errors
  SYNC_FAILED = 'SYNC_FAILED',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  
  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  DEADLOCK_DETECTED = 'DEADLOCK_DETECTED',
  
  // System errors
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface GraphErrorOptions {
  code: GraphErrorCode;
  message: string;
  cause?: Error;
  context?: Record<string, unknown>;
  retryable?: boolean;
}

export class GraphError extends Error {
  public readonly code: GraphErrorCode;
  public readonly cause?: Error;
  public readonly context?: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly timestamp: Date;

  constructor(options: GraphErrorOptions) {
    super(options.message);
    this.name = 'GraphError';
    this.code = options.code;
    this.cause = options.cause;
    this.context = options.context;
    this.retryable = options.retryable ?? false;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      cause: this.cause ? {
        message: this.cause.message,
        name: this.cause.name,
      } : undefined,
    };
  }
}

export class GraphErrorHandler {
  /**
   * Handle and log error with context.
   */
  handle(error: Error, context?: Record<string, unknown>): void {
    if (error instanceof GraphError) {
      logger.error('Graph operation error', {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        context: { ...error.context, ...context },
        cause: error.cause?.message,
      });
    } else {
      logger.error('Unexpected error', {
        message: error.message,
        name: error.name,
        context,
        stack: error.stack,
      });
    }
  }

  /**
   * Wrap native error in GraphError.
   */
  wrap(error: Error, code: GraphErrorCode, context?: Record<string, unknown>): GraphError {
    if (error instanceof GraphError) {
      return error;
    }

    return new GraphError({
      code,
      message: error.message || 'An error occurred',
      cause: error,
      context,
      retryable: this.isRetryable(error),
    });
  }

  /**
   * Determine if error is retryable.
   */
  private isRetryable(error: Error): boolean {
    const retryablePatterns = [
      'timeout',
      'connection',
      'transient',
      'deadlock',
      'unavailable',
      'ECONNRESET',
      'ETIMEDOUT',
    ];

    const errorMsg = error.message.toLowerCase();
    return retryablePatterns.some(pattern => errorMsg.includes(pattern));
  }

  /**
   * Create error from Neo4j error.
   */
  fromNeo4jError(error: unknown, context?: Record<string, unknown>): GraphError {
    // Neo4j error codes start with "Neo."
    const neo4jCode = error.code || '';
    
    let code: GraphErrorCode = GraphErrorCode.UNKNOWN_ERROR;
    let retryable = false;

    if (neo4jCode.includes('ClientError')) {
      code = GraphErrorCode.INVALID_QUERY;
    } else if (neo4jCode.includes('TransientError')) {
      code = GraphErrorCode.QUERY_TIMEOUT;
      retryable = true;
    } else if (neo4jCode.includes('DatabaseError')) {
      code = GraphErrorCode.QUERY_FAILED;
    } else if (neo4jCode.includes('Deadlock')) {
      code = GraphErrorCode.DEADLOCK_DETECTED;
      retryable = true;
    }

    return new GraphError({
      code,
      message: error.message || 'Neo4j error occurred',
      cause: error,
      context: { ...context, neo4jCode },
      retryable,
    });
  }
}

/**
 * Create GraphError from any error.
 */
export function createGraphError(
  error: unknown,
  code: GraphErrorCode = GraphErrorCode.UNKNOWN_ERROR,
  context?: Record<string, unknown>
): GraphError {
  if (error instanceof GraphError) {
    return error;
  }

  if (error instanceof Error) {
    return new GraphError({
      code,
      message: error.message,
      cause: error,
      context,
    });
  }

  return new GraphError({
    code,
    message: String(error),
    context,
  });
}

export default GraphErrorHandler;
