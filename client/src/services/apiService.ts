/**
 * API Service Export
 * 
 * Re-exports the API client from the infrastructure/api layer.
 * This provides backward compatibility while maintaining a single source of truth
 * in the infrastructure layer.
 */

export { get, post, put, del as delete, api } from '@client/infrastructure/api';
export { default } from '@client/infrastructure/api';
