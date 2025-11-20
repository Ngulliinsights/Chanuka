// ============================================================================
// SEARCH ENGINE TYPES
// ============================================================================
// Consolidated type definitions for search engines

// Core search types from domain
export interface SearchQuery {
  query: string;
  filters?: {
    type?: ('bills' | 'sponsors' | 'comments')[];
    status?: string[];
    chamber?: string[];
    county?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface SearchResult {
  id: string;
  type: 'bill' | 'sponsor' | 'comment';
  title: string;
  summary?: string;
  relevanceScore: number;
  metadata: Record<string, any>;
  highlights?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets: {
    types: Record<string, number>;
    statuses: Record<string, number>;
    chambers: Record<string, number>;
    counties: Record<string, number>;
  };
  suggestions: string[];
  searchTime: number;
  query: SearchQuery;
}

export interface SearchEngine {
  name: string;
  priority: number;
  isAvailable: boolean;
  search(query: SearchQuery): Promise<SearchResult[]>;
}

export interface ParsedSearchSyntax {
  terms: string[];
  operators: string[];
  phrases: string[];
}

export interface SearchQualityMetrics {
  hasResults: boolean;
  avgRelevanceScore: number;
  searchSpeed: 'fast' | 'normal' | 'slow';
  hasSuggestions: boolean;
}

export interface SearchQualityScore {
  score: number;
  metrics: SearchQualityMetrics;
}

// Suggestion types
export interface SearchSuggestion {
  term: string;
  type: 'bill_title' | 'category' | 'sponsor' | 'tag' | 'popular' | 'recent';
  frequency: number;
  score?: number;
  id?: string;
  metadata?: {
    bill_id?: number;
    sponsor_id?: number;
    category?: string;
    description?: string;
  };
}

export interface AutocompleteFacets {
  categories: Array<{ name: string; count: number; value?: string; label?: string }>;
  sponsors: Array<{ name: string; id: number; count: number; value?: string; label?: string }>;
  tags: Array<{ name: string; count: number; value?: string; label?: string }>;
  statuses: Array<{ name: string; count: number; value?: string; label?: string }>;
  dateRanges?: Array<{ value: string; label: string; count: number; days?: number | null }>;
}

export interface AutocompleteResult {
  suggestions: SearchSuggestion[];
  facets: AutocompleteFacets;
  popularSearches?: string[];
  query?: string;
  totalSuggestions?: number;
  metadata?: {
    totalResults?: number;
    searchTime?: number;
    query?: string;
  };
}

export interface SearchContext {
  category?: string;
  status?: string;
  sponsor_id?: number;
  recentSearches?: string[];
  userHistory?: Array<{ query: string; timestamp: number; resultCount: number; frequency: number }>;
  popularTerms?: Array<{ term: string; frequency: number }>;
  timestamp?: number;
}

export interface SearchAnalytics {
  query: string;
  resultCount: number;
  timestamp: Date;
  user_id?: string;
  session_id?: string;
  clickedResults?: number[];
  totalSearches?: number;
  uniqueQueries?: number;
  topQueries?: Array<{ query: string; frequency: number; avgResults?: number  }>;
  topTerms?: Array<{ term: string; frequency: number }>;
  avgResultsPerQuery?: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface QueryCondition {
  field: string;
  operator: 'eq' | 'ilike' | 'gt' | 'lt' | 'in';
  value: any;
}
