/**
 * Recovery Infrastructure Module
 *
 * Provides error recovery and resilience utilities for the application.
 * Handles automatic recovery strategies, state restoration, and graceful
 * degradation when errors occur.
 *
 * @module infrastructure/recovery
 * @example
 * ```typescript
 * import { recoverDashboardState, saveDashboardCheckpoint } from '@/infrastructure/recovery';
 *
 * // Save a recovery checkpoint
 * await saveDashboardCheckpoint(dashboardState);
 *
 * // Recover from saved state
 * const recovered = await recoverDashboardState();
 * ```
 */

/**
 * Dashboard recovery utilities for state persistence and restoration.
 * Provides checkpoint management, automatic state recovery, and rollback
 * capabilities for dashboard configurations.
 *
 * @example
 * ```typescript
 * import { recoverDashboardState, saveDashboardCheckpoint } from '@/infrastructure/recovery';
 *
 * // Save current dashboard state
 * await saveDashboardCheckpoint({
 *   widgets: [...],
 *   layout: {...},
 *   preferences: {...}
 * });
 *
 * // Recover dashboard state after error
 * const state = await recoverDashboardState();
 * if (state) {
 *   // Restore dashboard to recovered state
 *   restoreDashboard(state);
 * }
 * ```
 */
export * from './dashboard-recovery';
