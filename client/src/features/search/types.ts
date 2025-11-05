// Search feature types
export interface SearchQuery {
  q: string;
  type?: 'bills' | 'users' | 'comments' | 'all';
  filters?: SearchFilters;
  sort?: 'relevance' | 'date' | 'popularity';
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  billStatus?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  categories?: string[];
  sponsors?: string[];
  user_roles?: string[];
  location?: string;
  tags?: string[];
}

export interface SearchResult {
  id: string;
  type: 'bill' | 'user' | 'comment' | 'thread';
  title: string;
  content: string;
  excerpt: string;
  relevanceScore: number;
  metadata: SearchMetadata;
  highlights: SearchHighlight[];
}

export interface SearchMetadata { bill_id?: string;
  user_id?: string;
  comment_id?: string;
  threadId?: string;
  authorName?: string;
  authorId?: string;
  created_at: string;
  updated_at?: string;
  tags?: string[];
  status?: string;
  category?: string;
  view_count?: number;
  comment_count?: number;
  vote_count?: number;
  }

export interface SearchHighlight {
  field: string;
  snippet: string;
  positions: Array<{
    start: number;
    end: number;
  }>;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
  facets: SearchFacets;
  suggestions: string[];
  took: number; // milliseconds
  hasMore: boolean;
}

export interface SearchFacets {
  types: Record<string, number>;
  categories: Record<string, number>;
  statuses: Record<string, number>;
  dates: {
    last24h: number;
    lastWeek: number;
    lastMonth: number;
    older: number;
  };
  tags: Record<string, number>;
}

export interface SearchSuggestion {
  text: string;
  type: 'completion' | 'correction' | 'related';
  score: number;
}

export interface AdvancedSearchOptions {
  exactPhrase?: boolean;
  excludeWords?: string[];
  fieldWeights?: Record<string, number>;
  fuzzyMatching?: boolean;
  proximity?: number;
  dateBoost?: 'recent' | 'none';
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  filters: SearchFilters;
  created_at: string;
  lastUsed?: string;
  useCount: number;
  is_public: boolean;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  filters?: SearchFilters;
}

// API request/response types
export interface SearchRequest extends SearchQuery {
  advanced?: AdvancedSearchOptions;
}

export interface SaveSearchRequest {
  name: string;
  query: SearchQuery;
  is_public?: boolean;
}

export interface SearchAnalytics {
  popularQueries: Array<{
    query: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  noResultsQueries: string[];
  averageResponseTime: number;
  searchSuccessRate: number;
}

// Real-time search types
export interface SearchEvent {
  type: 'search_started' | 'search_completed' | 'search_error';
  queryId: string;
  query: string;
  timestamp: string;
  data?: any;
}

export interface LiveSearchResult {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error?: string;
}





































