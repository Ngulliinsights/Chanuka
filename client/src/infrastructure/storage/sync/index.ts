/**
 * Sync Infrastructure Module
 *
 * Provides background synchronization and offline capabilities for the application.
 * Manages data sync between client and server, handles offline queuing,
 * and ensures data consistency across network conditions.
 *
 * @module infrastructure/sync
 * @example
 * ```typescript
 * import { backgroundSyncManager } from '@/infrastructure/sync';
 *
 * // Register a sync task
 * await backgroundSyncManager.register('sync-user-data', {
 *   url: '/api/sync',
 *   method: 'POST',
 *   data: userData
 * });
 *
 * // Check sync status
 * const status = backgroundSyncManager.getStatus();
 * ```
 */

export * from './background-sync-manager';

/**
 * Global background sync manager instance.
 * Handles background synchronization tasks, offline queue management,
 * and automatic retry logic for failed sync operations.
 *
 * @example
 * ```typescript
 * // Register a background sync task
 * await backgroundSyncManager.register('sync-task', {
 *   url: '/api/sync',
 *   method: 'POST',
 *   data: { key: 'value' }
 * });
 *
 * // Get pending sync tasks
 * const pending = backgroundSyncManager.getPendingTasks();
 * ```
 */
export { backgroundSyncManager } from './background-sync-manager';
