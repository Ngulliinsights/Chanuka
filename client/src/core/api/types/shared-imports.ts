/**
 * Shared Type Imports Bridge
 *
 * This module re-exports types from @shared/types/api/ to maintain backward compatibility
 * while consolidating the type system to use shared definitions.
 *
 * MIGRATION: Client types have been consolidated to use @shared/types/api/
 * This bridge ensures existing imports continue to work while migrating to shared types.
 *
 * @deprecated - Remove once all imports have been migrated to @shared/types/api/
 */

// Re-export all API types from shared
export * from '@shared/types/api';
export * from '@shared/types/api/request-types';
export * from '@shared/types/api/error-types';
export * from '@shared/types/api/response-types';
