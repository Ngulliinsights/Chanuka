/**
 * External Data Integration Infrastructure
 * 
 * This module provides the core infrastructure for integrating with external
 * government data sources, including API management, data synchronization,
 * and fallback mechanisms.
 */

// export { GovernmentDataService } from './government-data-service'; // Commented out due to missing axios dependency
// export { DataSynchronizationService } from './data-synchronization-service'; // Commented out due to missing cron and db dependencies
export { UnifiedExternalAPIManagementService } from './external-api-manager';
// export { ConflictResolutionService } from './conflict-resolution-service'; // Commented out due to missing db dependencies

// Types and interfaces
export type {
  DataSource,
  SyncJob,
  ApiEndpoint,
  DataValidationResult,
  ConflictResolution,
  ExternalDataConfig
} from './types';












































