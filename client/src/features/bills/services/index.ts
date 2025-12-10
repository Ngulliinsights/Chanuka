/**
 * Bills Feature Services
 * 
 * Business logic services for bill-related operations.
 * Integrated from client/src/services/ following FSD principles.
 */

// BillService placeholder - use BillTrackingService instead
export class BillService {
  static instance = new BillService();
}
export const billService = BillService.instance;

// Cache service for bills data
export { billsCache } from './cache';

// Pagination service for bills
export { billsPagination } from './pagination';

// Tracking service for bills
export { BillTrackingService, billTrackingService } from './tracking';

// Export types
export interface BillServiceConfig {
  maxRetries?: number;
  timeout?: number;
}

export interface BillSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

export interface BillAnalysisRequest {
  billId: string;
}

export interface BillUpdateRequest {
  billId: string;
  data: Record<string, any>;
}

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