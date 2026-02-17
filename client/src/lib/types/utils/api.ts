/**
 * API-related utility types
 */

// API response types - re-exported from common.ts to avoid duplication
export type { ApiResponse } from './common';

// API error structure
export type ApiError = {
  message: string;
  code?: string | number;
  details?: Record<string, unknown>;
  statusCode?: number;
};

// Paginated API response
export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

// HTTP methods
// Async state utilities
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type AsyncState<T, E = Error> = {
  data?: T;
  loading: boolean;
  error?: E;
  status: LoadingState;
};

export type PromiseState<T> =
  | { status: 'pending' }
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; error: Error };
