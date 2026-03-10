/**
 * Government Data Feature - Server-side Exports
 * Complete modernized government data management feature
 */

// Repository
export { governmentDataRepository } from './domain/repositories/government-data.repository';
export type { 
  GovernmentDataQueryOptions,
  GovernmentDataCreateInput,
  GovernmentDataUpdateInput,
  SyncLogCreateInput
} from './domain/repositories/government-data.repository';

// Services
export { enhancedGovernmentDataService } from './application/enhanced-government-data-service';
export { governmentDataSyncService } from './application/sync-service';

// Routes
export { default as governmentDataRoutes } from './presentation/government-data.routes';

// Types (re-export from schema)
export type { GovernmentData, GovernmentSyncLog } from '@server/infrastructure/schema';