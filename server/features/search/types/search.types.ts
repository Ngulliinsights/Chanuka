// Search suggestion interfaces
export interface SearchSuggestion {
  term: string;
  type: 'bill_title' | 'category' | 'sponsor' | 'tag' | 'popular' | 'recent';
  frequency: number;
  metadata?: {
    billId?: number;
    sponsorId?: number;
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
  sponsorId?: number;
  recentSearches?: string[];
  userHistory?: Array<{ query: string; timestamp: number; resultCount: number; frequency: number }>;
  popularTerms?: Array<{ term: string; frequency: number }>;
  timestamp?: number;
}

export interface SearchAnalytics {
  query: string;
  resultCount: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  clickedResults?: number[];
  totalSearches?: number;
  uniqueQueries?: number;
  topQueries?: Array<{ query: string; frequency: number; avgResults?: number }>;
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