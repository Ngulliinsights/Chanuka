/**
 * Server Error Handling Infrastructure
 *
 * Integrates @shared/core error management system with recovery patterns
 * for comprehensive error handling on the server.
 *
 * @example
 * ```typescript
 * // In server initialization
 * import { configureErrorHandling } from '@server/infrastructure/error-handling';
 * import { createErrorMiddleware } from '@shared/core/observability/error-management';
 *
 * const errorConfig = configureErrorHandling();
 * const errorMiddleware = createErrorMiddleware({
 *   handleChain: new ErrorHandlerChain(),
 *   logErrors: true,
 * });
 *
 * app.use(errorMiddleware);
 * ```
 *
 * @example
 * ```typescript
 * // Using recovery patterns
 * import { withRetry, withFallback } from '@server/infrastructure/error-handling';
 *
 * const result = await withRetry(
 *   () => externalApi.fetchData(),
 *   'fetch-external-data',
 *   { maxAttempts: 3 }
 * );
 * ```
 */

export {
  ServerErrorReporter,
  ServerErrorHandler,
  ServiceCircuitBreaker,
  createErrorContext,
  detectErrorCode,
  buildErrorResponse,
  configureErrorHandling,
} from './error-configuration';

export {
  withRetry,
  withTimeout,
  withFallback,
  BulkheadExecutor,
  RecoveryChain,
  TimeoutError,
  type RetryOptions,
} from './recovery-patterns';
