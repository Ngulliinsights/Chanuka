/**
 * Bills Feature Services
 * Consolidated business logic services for bill-related operations
 */

// Re-export all services from their individual files
export { billsCache } from './services/cache';
export { billsPagination } from './services/pagination';
export { BillTrackingService, billTrackingService } from './services/tracking';

// Export types
export type {
  CacheEntry,
  CacheConfig,
  CacheStats,
  OfflineQueueItem
} from './services/cache';

export type {
  PaginationConfig,
  PaginationState,
  PageData,
  VirtualScrollData
} from './services/pagination';

// Legacy service placeholder for compatibility
export class BillService {
  static instance = new BillService();
}
export const billService = BillService.instance;

// Service configuration interfaces
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