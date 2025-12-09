/**
 * Shared Search Types
 * 
 * These types are used across both core and features to avoid circular dependencies.
 * Moved from features/search/types to enable core API integration.
 */

export interface SearchFilters {
  billStatus?: string[];
  categories?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  location?: string;
  tags?: string[];
}

export interface AdvancedSearchOptions {
  exactPhrase?: boolean;
  excludeWords?: string[];
  fuzzyMatching?: boolean;
  proximity?: number;
  dateBoost?: 'recent' | 'oldest' | 'none';
}

export interface SearchRequest {
  q: string;
  type?: 'bills' | 'legislators' | 'committees' | 'all';
  sort?: 'relevance' | 'date' | 'title' | 'status';
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  advanced?: AdvancedSearchOptions;
}

export interface SaveSearchRequest {
  name: string;
  query: SearchRequest;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface SearchResult {
  id: string;
  type: 'bill' | 'legislator' | 'committee';
  title: string;
  description: string;
  url: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
  highlights?: {
    title?: string[];
    description?: string[];
    content?: string[];
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: SearchRequest;
  executionTime: number;
  suggestions?: string[];
  facets?: Record<string, Array<{ value: string; count: number }>>;
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
  description?: string;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastExecuted?: string;
}

export interface SearchHistory {
  id: string;
  query: SearchRequest;
  resultCount: number;
  executedAt: string;
  executionTime: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'entity';
  category?: string;
  count?: number;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  averageResultsPerSearch: number;
  mostPopularQueries: Array<{ query: string; count: number }>;
  searchTrends: Array<{ date: string; count: number }>;
  performanceMetrics: {
    averageExecutionTime: number;
    slowestQueries: Array<{ query: string; time: number }>;
  };
}