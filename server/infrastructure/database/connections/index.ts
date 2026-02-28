/**
 * Database Connections
 *
 * Exports all connection management components for easy importing.
 */

// Pool Manager
export { PoolManager } from './pool-manager';
export type {
  PoolManagerConfig,
  PoolMetrics,
  PoolHealthStatus,
  EnhancedPool,
} from './pool-manager';
export {
  createPoolManager,
  createProductionPoolManager,
  createTestPoolManager,
} from './pool-manager';

// Transaction Manager
export { TransactionManager } from './transaction-manager';
export type {
  TransactionOptions,
  TransactionManagerConfig,
  DatabaseTransaction,
} from './transaction-manager';
export {
  createTransactionManager,
  createProductionTransactionManager,
  createTestTransactionManager,
  withTransaction,
} from './transaction-manager';

// Connection Router
export { ConnectionRouter } from './connection-router';
export type {
  ConnectionRouterConfig,
  ConnectionPools,
} from './connection-router';
export {
  createConnectionRouter,
  createProductionConnectionRouter,
  createTestConnectionRouter,
} from './connection-router';
