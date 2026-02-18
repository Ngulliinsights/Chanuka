/**
 * Correlation ID Utilities
 * 
 * Unified correlation ID management for cross-layer tracing.
 * 
 * Features:
 * - Isomorphic UUID generation (works in Node.js and browser)
 * - Async context management with AsyncLocalStorage
 * - Express middleware for HTTP request tracking
 * - Type-safe correlation ID handling
 * 
 * @example
 * ```typescript
 * // Generate a correlation ID
 * import { generateCorrelationId } from '@shared/utils/correlation-id';
 * const id = generateCorrelationId();
 * 
 * // Use in async context
 * import { withCorrelationId } from '@shared/utils/correlation-id';
 * await withCorrelationId(id, async () => {
 *   // All operations here will have the correlation ID
 * });
 * 
 * // Express middleware
 * import { correlationIdMiddleware } from '@shared/utils/correlation-id';
 * app.use(correlationIdMiddleware);
 * ```
 */

// Generator
export {
  generateCorrelationId,
  isValidCorrelationId,
} from './generator';

// Context management
export {
  setCurrentCorrelationId,
  getCurrentCorrelationId,
  clearCurrentCorrelationId,
  withCorrelationId,
  withNewCorrelationId,
  getOrCreateCorrelationId,
} from './context';

// Middleware (server-only, but exported for convenience)
export {
  correlationIdMiddleware,
  getCorrelationIdFromRequest,
  setCorrelationIdInResponse,
  CORRELATION_ID_HEADER,
} from './middleware';
