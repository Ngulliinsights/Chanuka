/**
 * Core Module Exports
 *
 * Centralized exports for core graph database functionality.
 */

export {
  initializeGraphSchema,
  createConstraints,
  createIndexes,
  verifyGraphSchema,
  getDatabaseStats,
} from './schema';

export {
  executeInTransaction,
  executeBatchInTransaction,
} from './transaction-executor';

export {
  runBatchSync,
  startSyncScheduler,
  stopSyncScheduler,
  getSyncSchedulerStatus,
  type SyncResult,
  type BatchSyncStats,
} from './batch-sync-runner';

export {
  Neo4jClient,
  createNeo4jClient,
  type Neo4jClientConfig,
} from './neo4j-client';

export {
  initializeSyncService,
  shutdownSyncService,
  triggerFullSync,
  getSyncServiceStatus,
  verifyDataConsistency,
  detectConflicts,
  resolveConflict,
  isServiceInitialized,
  getServiceConfig,
  getNeo4jDriver,
  type SyncServiceConfig,
} from './sync-executor';

export default {
  schema: () => import('./schema'),
  transactionExecutor: () => import('./transaction-executor'),
  batchSyncRunner: () => import('./batch-sync-runner'),
  neo4jClient: () => import('./neo4j-client'),
  syncExecutor: () => import('./sync-executor'),
};
