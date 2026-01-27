/**
 * API-related utility types
 */

// Standard API response wrapper
export type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
  timestamp?: number;
};

// API error structure
export type ApiError = {
  message: string;
  code?: string | number;
  details?: Record<string, any>;
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
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
