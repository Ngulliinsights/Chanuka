/**
 * Government Data Feature Exports
 * Complete client-side implementation for government data management
 */

// Types
export * from './types';

// API Service
export { governmentDataApiService } from './services/api';

// React Query Hooks
export * from './hooks';

// UI Components
export { GovernmentDataCard } from './ui/GovernmentDataCard';
export { GovernmentDataList } from './ui/GovernmentDataList';

// Pages
export { GovernmentDataPage } from './pages/GovernmentDataPage';

// Re-export commonly used types for convenience
export type {
  GovernmentData,
  GovernmentDataQueryOptions,
  GovernmentDataCreateInput,
  GovernmentDataUpdateInput,
  GovernmentDataFilters,
  GovernmentDataMetadata,
  HealthStatus,
  DataAnalytics,
} from './types';