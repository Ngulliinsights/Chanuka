/**
 * Search Response Types
 * 
 * Type definitions for search API responses
 */

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets?: SearchFacets;
  suggestions?: string[];
  executionTime?: number;
}

export interface SearchResultItem {
  id: string;
  type: 'bill' | 'comment' | 'user' | 'expert';
  title: string;
  description?: string;
  url?: string;
  score: number;
  highlights?: Record<string, string[]>;
  metadata?: Record<string, unknown>;
}

export interface SearchFacets {
  categories?: FacetItem[];
  status?: FacetItem[];
  dateRange?: FacetItem[];
  location?: FacetItem[];
  tags?: FacetItem[];
}

export interface FacetItem {
  value: string;
  count: number;
  selected?: boolean;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'entity' | 'category';
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  filters?: Record<string, unknown>;
}

export interface SearchAnalytics {
  topQueries: Array<{ query: string; count: number }>;
  popularFilters: Array<{ filter: string; count: number }>;
  averageResultCount: number;
  searchVolume: Array<{ date: string; count: number }>;
  noResultQueries: Array<{ query: string; count: number }>;
}

export interface SearchMetadata {
  availableFilters: Array<{
    key: string;
    label: string;
    type: 'select' | 'multiselect' | 'range' | 'date';
    options?: Array<{ value: string; label: string }>;
  }>;
  sortOptions: Array<{
    key: string;
    label: string;
    direction: 'asc' | 'desc';
  }>;
  searchTips: string[];
}

export interface SearchResult {
  id: string;
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchRequest;
  createdAt: string;
  lastExecuted?: string;
  isPublic: boolean;
}

export interface SearchExportResponse {
  downloadUrl: string;
  format: 'csv' | 'json';
  expiresAt: string;
  totalRecords: number;
}