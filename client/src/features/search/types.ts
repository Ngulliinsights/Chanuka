// Re-export shared search types to maintain compatibility
export type {
  SearchRequest,
  SaveSearchRequest,
  SearchFilters,
  AdvancedSearchOptions,
  SearchResult,
  SearchResponse,
  SearchMetadata,
  SavedSearch,
  SearchHistory,
  SearchSuggestion,
  SearchAnalytics,
  SearchHighlight,
  AutocompleteResult,
  SearchExportResponse,
  SearchScope,
} from '@client/lib/types/search';

// Feature-specific extensions
export interface SearchQuery {
  q: string;
  type?: string; 
  filters?: Record<string, any>;
  sort?: string;
  limit?: number;
  offset?: number;
}

// Real-time search types
export interface SearchEvent {
  type: 'search_started' | 'search_completed' | 'search_error';
  queryId: string;
  query: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface LiveSearchResult {
  query: string;
  results: import('@client/lib/types/search').SearchResult[];
  isLoading: boolean;
  error?: string;
}
