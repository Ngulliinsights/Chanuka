/**
 * Legislative Domain Types
 * Standardized legislative types following the exemplary pattern
 */

export * from './bill';
export * from './comment';
export * from './actions';

/**
 * Legislative domain version and metadata
 */
export const LEGISLATIVE_DOMAIN_VERSION = '1.0.0' as const;
export const LEGISLATIVE_DOMAIN_DESCRIPTION = 'Standardized legislative system types' as const;