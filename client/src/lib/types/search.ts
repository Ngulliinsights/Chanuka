/**
 * Shared Search Types
 *
 * Single source of truth for search-related types across the application.
 * Consolidated from features/search/types and lib/types/search-response.
 */

export interface SearchFilters {
  billStatus?: string[]; // Arrays for multi-select
  categories?: string[];
  dateRange?: {
    start: string;
    end: string;
    preset?: string; // '24h', '7d', etc.
  };
  location?: string;
  tags?: string[];
  sponsors?: string[];
  user_roles?: string[];
  political_party?: string[];
}

export interface AdvancedSearchOptions {
  exactPhrase?: boolean;
  excludeWords?: string[];
  fieldWeights?: Record<string, number>;
  fuzzyMatching?: boolean;
  proximity?: number;
  dateBoost?: 'recent' | 'oldest' | 'none';
}

export type SearchScope = 'bills' | 'legislators' | 'committees' | 'comments' | 'users' | 'all';

export interface SearchRequest {
  q: string;
  type?: SearchScope;
  sort?: 'relevance' | 'date' | 'title' | 'status' | 'popularity';
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  advanced?: AdvancedSearchOptions;
}

export interface SaveSearchRequest {
  name: string;
  query: SearchRequest;
  description?: string;
  is_public?: boolean; // Snake case to match DB/API often
  tags?: string[];
}

export interface SearchHighlight {
  field: string;
  snippet: string;
  positions?: Array<{
    start: number;
    end: number;
  }>;
}

export interface SearchResult {
  id: string;
  type: 'bill' | 'legislator' | 'committee' | 'comment' | 'user' | 'expert' | 'thread' | 'sponsor' | 'insight';
  title: string;
  description?: string; // Unified: use this for body/excerpt
  content?: string; // Full content if available
  excerpt?: string; // Alias for description often used in UI
  url?: string;
  relevanceScore: number;
  metadata: Record<string, any>; // Flexible metadata
  highlights?: SearchHighlight[]; // Standardized structure
}

export interface SearchFacetItem {
  value: string;
  count: number;
  selected?: boolean;
}

export interface SearchFacets {
  types?: Record<string, number>;
  categories?: Record<string, number>;
  statuses?: Record<string, number>;
  tags?: Record<string, number>;
  dates?: {
    last24h: number;
    lastWeek: number;
    lastMonth: number;
    older: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  query: SearchRequest;
  executionTime: number;
  suggestions?: string[];
  facets?: SearchFacets;
}

export interface SearchMetadata {
  totalDocuments: number;
  lastIndexed: string;
  availableFilters: {
    billStatus: string[];
    categories: string[];
    locations: string[];
    tags: string[];
  };
  searchTips: string[];
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchRequest;
  filters?: SearchFilters; // Explicitly included for UI convenience
  description?: string;
  is_public: boolean;
  tags?: string[];
  created_at?: string;
  createdAt: string; // Maintain both for compat or standardize on one (using camelCase preferred)
  updatedAt: string;
  useCount: number;
  lastUsed?: string; // Added for UI display
  lastExecuted?: string;
  emailAlerts?: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    threshold: number;
  };
}

export interface SearchHistory {
  id: string;
  query: string; // or SearchRequest
  timestamp: string;
  resultCount: number;
  filters?: SearchFilters;
}

export interface SearchSuggestion {
  text: string;
  term?: string; // Alias for text for backward compatibility
  type: 'query' | 'filter' | 'entity' | 'completion' | 'correction' | 'related' | 'recent' | 'popular' | 'bill_title';
  category?: string;
  count?: number;
  score?: number;
  frequency?: number;
  id?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  averageResultsPerSearch: number;
  searchSuccessRate?: number;
  topQueries?: Array<{ query: string; count: number }>;
  mostPopularQueries: Array<{ query: string; count: number }>;
  searchTrends: Array<{ date: string; count: number }>;
  noResultsQueries?: string[];
  performanceMetrics: {
    averageExecutionTime: number;
    slowestQueries: Array<{ query: string; time: number }>;
  };
}

export interface SearchExportResponse {
  downloadUrl: string;
  format: 'csv' | 'json';
  expiresAt: string;
  totalRecords: number;
}

export interface AutocompleteResult {
  suggestions: SearchSuggestion[];
  facets: {
    categories: string[];
    sponsors: string[];
    tags: string[];
    statuses: string[];
  };
  query: string;
  totalSuggestions: number;
}

export interface SearchProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentEngine: string;
  searchTime: number;
}

export interface StreamingSearchResponse {
  results: SearchResult[];
  totalCount: number;
  isComplete: boolean;
  progress?: SearchProgress;
}

export interface SearchEngineResult {
  engine: 'postgresql' | 'fuse';
  results: SearchResult[];
  searchTime: number;
  totalCount: number;
  quality?: number;
}

export interface CombinedSearchResult {
  results: SearchResult[];
  engines: SearchEngineResult[];
  totalCount: number;
  searchTime: number;
  suggestions: SearchSuggestion[];
  facets: SearchFacets;
}
