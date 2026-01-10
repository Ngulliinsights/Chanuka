/**
 * Bills Feature Types
 * Defines types for bill management, queries, and responses
 */

export interface Bill {
  id: string;
  title: string;
  status: string;
  // Add other properties as needed
}

export interface BillsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  // Add other params
}

export interface ExtendedBill extends Bill {
  // Add extended properties
}

export interface PaginatedBillsResponse {
  bills: Bill[];
  total: number;
  page: number;
  limit: number;
  // Add other properties
}
