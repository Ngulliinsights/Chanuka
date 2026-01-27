import type { SearchRequest, SaveSearchRequest } from '@client/lib/types/search';
import type {
  SearchResponse,
  SearchSuggestion,
  SearchHistory,
  SearchAnalytics,
  SearchMetadata,
  SearchResult,
  SavedSearch,
  SearchExportResponse,
} from '@client/lib/types/search-response';

import { globalApiClient as api } from './client';

/**
 * Search API Client - Core API wrapper for search endpoints
 *
 * Provides direct access to search API endpoints without business logic.
 * This is a pure API client that should be used by higher-level services.
 */
export const searchApiClient = {
  /**
   * Perform a search query
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const params = new URLSearchParams();

    params.append('q', request.q);
    if (request.type) params.append('type', request.type);
    if (request.sort) params.append('sort', request.sort);
    if (request.limit) params.append('limit', request.limit.toString());
    if (request.offset) params.append('offset', request.offset.toString());

    // Add filters
    if (request.filters) {
      const { billStatus, categories, dateRange, location, tags } = request.filters;

      billStatus?.forEach(status => params.append('billStatus', status));
      categories?.forEach(cat => params.append('category', cat));

      if (dateRange) {
        params.append('dateStart', dateRange.start);
        params.append('dateEnd', dateRange.end);
      }

      if (location) params.append('location', location);
      tags?.forEach(tag => params.append('tag', tag));
    }

    // Add advanced options
    if (request.advanced) {
      const { exactPhrase, excludeWords, fuzzyMatching, proximity, dateBoost } = request.advanced;

      if (exactPhrase) params.append('exactPhrase', 'true');
      if (excludeWords?.length) params.append('excludeWords', excludeWords.join(','));
      if (fuzzyMatching) params.append('fuzzy', 'true');
      if (proximity) params.append('proximity', proximity.toString());
      if (dateBoost) params.append('dateBoost', dateBoost);
    }

    const response = await api.get<SearchResponse>(`/api/search?${params.toString()}`);
    return response.data;
  },

  /**
   * Perform PostgreSQL full-text search
   */
  async searchPostgreSQL(
    params: Record<string, string | number | boolean>
  ): Promise<SearchResponse> {
    const response = await api.get<SearchResponse>('/api/search/postgresql', {
      params,
      timeout: 10000,
    });
    return response.data;
  },

  /**
   * Perform streaming search with real-time results
   */
  async streamSearch(params: Record<string, string | number | boolean>): Promise<SearchResponse> {
    const response = await api.get<SearchResponse>('/api/search/stream', {
      params,
      timeout: 30000,
    });
    return response.data;
  },

  /**
   * Cancel a streaming search
   */
  async cancelSearch(searchId: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/api/search/cancel/${searchId}`);
    return response.data;
  },

  /**
   * Get search data for fuzzy matching
   */
  async getSearchData(type?: string): Promise<SearchResult[]> {
    const response = await api.get<SearchResult[]>('/api/search/data', {
      params: { type: type || 'bills' },
      timeout: 5000,
    });
    return response.data;
  },

  /**
   * Get search suggestions/autocomplete
   */
  async getSuggestions(query: string, limit = 10): Promise<SearchSuggestion[]> {
    const response = await api.get<SearchSuggestion[]>(
      `/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get recent searches
   */
  async getRecentSearches(limit = 5): Promise<SearchHistory[]> {
    const response = await api.get<SearchHistory[]>(`/api/search/recent?limit=${limit}`);
    return response.data;
  },

  /**
   * Get popular searches
   */
  async getPopularSearches(limit = 5): Promise<SearchHistory[]> {
    const response = await api.get<SearchHistory[]>(`/api/search/popular?limit=${limit}`);
    return response.data;
  },

  /**
   * Get search history for current user
   */
  async getSearchHistory(limit = 20): Promise<SearchHistory[]> {
    const response = await api.get<SearchHistory[]>(`/api/search/history?limit=${limit}`);
    return response.data;
  },

  /**
   * Save a search query
   */
  async saveSearch(request: SaveSearchRequest): Promise<SavedSearch> {
    const response = await api.post<SavedSearch>('/api/search/saved', request);
    return response.data;
  },

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    const response = await api.get<SavedSearch[]>('/api/search/saved');
    return response.data;
  },

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(searchId: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/api/search/saved/${searchId}`);
    return response.data;
  },

  /**
   * Execute a saved search
   */
  async executeSavedSearch(searchId: string): Promise<SearchResponse> {
    const response = await api.post<SearchResponse>(`/api/search/saved/${searchId}/execute`);
    return response.data;
  },

  /**
   * Get search analytics (admin only)
   */
  async getSearchAnalytics(): Promise<SearchAnalytics> {
    const response = await api.get<SearchAnalytics>('/api/search/analytics');
    return response.data;
  },

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>('/api/search/history');
    return response.data;
  },

  /**
   * Get advanced search options metadata
   */
  async getSearchMetadata(): Promise<SearchMetadata> {
    const response = await api.get<SearchMetadata>('/api/search/metadata');
    return response.data;
  },

  /**
   * Perform live search (for autocomplete/typeahead)
   */
  async liveSearch(query: string, type?: string): Promise<SearchSuggestion[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (type) params.append('type', type);

    const response = await api.get<SearchSuggestion[]>(`/api/search/live?${params.toString()}`);
    return response.data;
  },

  /**
   * Get search result details
   */
  async getSearchResult(resultId: string, type: string): Promise<SearchResult> {
    const response = await api.get<SearchResult>(`/api/search/result/${type}/${resultId}`);
    return response.data;
  },

  /**
   * Export search results
   */
  async exportSearchResults(
    searchRequest: SearchRequest,
    format: 'csv' | 'json' = 'json'
  ): Promise<SearchExportResponse> {
    const params = new URLSearchParams();
    params.append('format', format);
    params.append('q', searchRequest.q);
    if (searchRequest.type) params.append('type', searchRequest.type);

    const response = await api.post<SearchExportResponse>(
      `/api/search/export?${params.toString()}`,
      searchRequest
    );
    return response.data;
  },

  /**
   * Get related searches
   */
  async getRelatedSearches(query: string): Promise<SearchSuggestion[]> {
    const response = await api.get<SearchSuggestion[]>(
      `/api/search/related?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },
};

// Export individual methods for backward compatibility
export const {
  search,
  searchPostgreSQL,
  streamSearch,
  cancelSearch,
  getSearchData,
  getSuggestions,
  getRecentSearches,
  getPopularSearches,
  getSearchHistory,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  executeSavedSearch,
  getSearchAnalytics,
  clearSearchHistory,
  getSearchMetadata,
  liveSearch,
  getSearchResult,
  exportSearchResults,
  getRelatedSearches,
} = searchApiClient;

// Default export for convenience
export default searchApiClient;
