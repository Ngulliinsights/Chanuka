/**
 * External Data Integration Infrastructure
 * 
 * This module provides the core infrastructure for integrating with external
 * government data sources, including API management, data synchronization,
 * and fallback mechanisms.
 */

export { GovernmentDataService } from './government-data-service.js';
export { DataSynchronizationService } from './data-synchronization-service.js';
export { UnifiedExternalAPIManagementService } from './external-api-manager.js';
export { ConflictResolutionService } from './conflict-resolution-service.js';

// Types and interfaces
export type {
  DataSource,
  SyncJob,
  ApiEndpoint,
  DataValidationResult,
  ConflictResolution,
  ExternalDataConfig
} from './types.js';