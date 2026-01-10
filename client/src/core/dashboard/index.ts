/**
 * Unified Dashboard System - Consolidated from multiple client implementations
 * Moved to shared/core for cross-platform reusability
 */

export * from './context';
export * from './hooks';
export * from './widgets';
// Note: utils re-exports only ChartData, types are imported from './types'
export type { ChartData } from './utils';
