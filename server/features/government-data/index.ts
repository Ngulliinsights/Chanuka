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
export { governmentDataService } from './application/government-data.service';
export { governmentDataSyncService } from './application/sync-service';

// Routes
export { default as governmentDataRoutes } from './presentation/government-data.routes';

// Types
export type { 
  GovernmentDataEntity as GovernmentData, 
  GovernmentSyncLogEntity as GovernmentSyncLog 
} from './domain/entities/government-data.entity';