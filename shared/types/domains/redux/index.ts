/**
 * Redux Domain Types - Main Export
 *
 * Centralized exports for all Redux state management types following
 * the exemplary loading pattern and standardized architecture.
 */

export * from './slice-state';
export * from './thunk-result';
export * from './validation';

/**
 * Redux domain version and metadata
 */
export const REDUX_DOMAIN_VERSION = '1.0.0' as const;
export const REDUX_DOMAIN_DESCRIPTION = 'Standardized Redux state management types with comprehensive validation' as const;