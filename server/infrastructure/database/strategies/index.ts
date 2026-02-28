/**
 * Database Strategies
 *
 * Exports all database strategy implementations for easy importing.
 * Strategies provide reusable logic for retry, routing, and circuit breaking.
 */

// Retry Strategy
export { RetryStrategy } from './retry-strategy';
export type { RetryConfig } from './retry-strategy';
export {
  createDefaultRetryStrategy,
  createProductionRetryStrategy,
  createTestRetryStrategy,
} from './retry-strategy';

// Routing Strategy
export { RoutingStrategy } from './routing-strategy';
export type { RoutingConfig, DatabaseOperation } from './routing-strategy';
export {
  createDefaultRoutingStrategy,
  createProductionRoutingStrategy,
  createTestRoutingStrategy,
} from './routing-strategy';

// Circuit Breaker Strategy (reused from cache infrastructure)
export {
  CircuitBreakerStrategy,
  type CircuitBreakerConfig,
  type CircuitBreakerState,
} from '../../cache/strategies/circuit-breaker-strategy';
