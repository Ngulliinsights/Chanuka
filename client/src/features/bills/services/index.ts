/**
 * Bills Feature Services
 * 
 * Business logic services for bill-related operations.
 * Integrated from client/src/services/ following FSD principles.
 */

// Re-export the consolidated bill service
export { BillService, billService } from './bill-service';

// Cache service for bills data
export { billsCache } from './cache';

// Pagination service for bills
export { billsPagination } from './pagination';

// Tracking service for bills
export { BillTrackingService, billTrackingService } from './tracking';

// Export types
export type {
  BillServiceConfig,
  BillSearchOptions,
  BillAnalysisRequest,
  BillUpdateRequest
} from './bill-service';

export type {
  CacheEntry,
  CacheConfig,
  CacheStats,
  OfflineQueueItem
} from './cache';

export type {
  PaginationConfig,
  PaginationState,
  PageData,
  VirtualScrollData
} from './pagination';