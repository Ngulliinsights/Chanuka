/**
 * Bills Feature Types
 * Defines types for bill management, queries, and responses
 */

// Re-export base Bill type from shared types
export type { Bill, ExtendedBill, Sponsor, BillStatus, UrgencyLevel } from '@client/lib/types/bill/bill-base';

/**
 * Query parameters for filtering bills
 */
export interface BillsQueryParams {
  // Pagination
  page?: number;
  limit?: number;
  
  // Array filters
  status?: string[];
  urgency?: string[];
  policyAreas?: string[];
  sponsors?: string[];
  controversyLevels?: string[];
  
  // Boolean filters
  constitutionalFlags?: boolean;
  
  // Date filters
  dateRange?: {
    start?: string;
    end?: string;
  };
  
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // Search
  query?: string;
}

/**
 * Paginated response for bills
 */
export interface PaginatedBillsResponse {
  data: import('@client/lib/types/bill/bill-base').Bill[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}
