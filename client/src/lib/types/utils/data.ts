/**
 * Data manipulation utility types
 */

// Data table utilities
export type SortDirection = 'asc' | 'desc';

export type SortConfig<T = any> = {
  key: keyof T;
  direction: SortDirection;
};

export type FilterOperator = 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn';

export type FilterConfig<T = any> = {
  key: keyof T;
  value: any;
  operator: FilterOperator;
};

export type ColumnDef<T> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

// Search utilities
export type SearchResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  query: string;
};

export type SearchOptions = {
  query: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  filters?: Record<string, any>;
};

// Cache utilities
export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl?: number;
  expiresAt?: number;
};

export type CacheKey = string | readonly (string | number)[];
