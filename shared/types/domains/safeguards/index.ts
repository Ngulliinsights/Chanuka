/**
 * Safeguards Domain Types
 * Centralized exports for all safeguards-related types
 */

export * from './moderation';

/**
 * Safeguards domain version and metadata
 */
export const SAFEGUARDS_DOMAIN_VERSION = '1.0.0' as const;
export const SAFEGUARDS_DOMAIN_DESCRIPTION = 'Standardized safeguards system types with moderation, rate limiting, and type safety' as const;