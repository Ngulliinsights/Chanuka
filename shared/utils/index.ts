/**
 * Shared Utilities
 *
 * Centralized utility functions used across all layers.
 * 
 * @example
 * ```typescript
 * // Correlation ID
 * import { generateCorrelationId, withCorrelationId } from '@shared/utils';
 * 
 * // Error handling
 * import { BaseError, ErrorContext } from '@shared/utils';
 * 
 * // Data transformation
 * import { Transformer, TransformerRegistry } from '@shared/utils';
 * ```
 */

export * from './correlation-id';
export * from './errors';
export * from './transformers';
export * from './serialization';

