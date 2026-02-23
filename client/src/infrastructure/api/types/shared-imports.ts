/**
 * Workspace Type Imports Bridge
 *
 * This module re-exports types from @workspace/types/api/ to maintain backward compatibility
 * while consolidating the type system to use workspace definitions.
 *
 * MIGRATION: Client types have been consolidated to use @workspace/types/api/
 * This bridge ensures existing imports continue to work while migrating to workspace types.
 *
 * @deprecated - Remove once all imports have been migrated to @workspace/types/api/
 */

// Re-export all API types from workspace
export * from '@workspace/types/api';
export * from '@workspace/types/api/request-types';
export * from '@workspace/types/api/error-types';
export * from '@workspace/types/api/response-types';
