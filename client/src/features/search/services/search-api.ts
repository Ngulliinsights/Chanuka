import { api } from '@/services/api';
import type {
  SearchRequest,
  SearchResponse,
  SearchSuggestion,
  SavedSearch,
  SearchHistory,
  SaveSearchRequest,
  SearchAnalytics
} from '../types';

/**
 * Search API service - handles all search-related API calls
 * Centralizes API endpoints and response handling for the search feature
 */
export const searchApi = {
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
      const filters = request.filters;
      if (filters.billStatus?.length) {
        filters.billStatus.forEach(status => params.append('billStatus', status));
      }
      if (filters.categories?.length) {
        filters.categories.forEach(cat => params.append('category', cat));
      }
      if (filters.dateRange) {
        params.append('dateStart', filters.dateRange.start);
        params.append('dateEnd', filters.dateRange.end);
      }
      if (filters.location) params.append('location', filters.location);
      if (filters.tags?.length) {
        filters.tags.forEach(tag => params.append('tag', tag));
      }
    }

    // Add advanced options
    if (request.advanced) {
      const advanced = request.advanced;
      if (advanced.exactPhrase) params.append('exactPhrase', 'true');
      if (advanced.excludeWords?.length) {
        params.append('excludeWords', advanced.excludeWords.join(','));
      }
      if (advanced.fuzzyMatching) params.append('fuzzy', 'true');
      if (advanced.proximity) params.append('proximity', advanced.proximity.toString());
      if (advanced.dateBoost) params.append('dateBoost', advanced.dateBoost);
    }

    return api.get(`/api/search?${params.toString()}`);
  },

  /**
   * Get search suggestions/autocomplete
   */
  async getSuggestions(query: string, limit = 10): Promise<SearchSuggestion[]> {
    return api.get(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  /**
   * Get search history for current user
   */
  async getSearchHistory(limit = 20): Promise<SearchHistory[]> {
    return api.get(`/api/search/history?limit=${limit}`);
  },

  /**
   * Save a search query
   */
  async saveSearch(request: SaveSearchRequest): Promise<SavedSearch> {
    return api.post('/api/search/saved', request);
  },

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    return api.get('/api/search/saved');
  },

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(searchId: string): Promise<void> {
    return api.delete(`/api/search/saved/${searchId}`);
  },

  /**
   * Execute a saved search
   */
  async executeSavedSearch(searchId: string): Promise<SearchResponse> {
    return api.post(`/api/search/saved/${searchId}/execute`);
  },

  /**
   * Get popular search queries
   */
  async getPopularSearches(limit = 10): Promise<Array<{ query: string; count: number }>> {
    return api.get(`/api/search/popular?limit=${limit}`);
  },

  /**
   * Get search analytics (admin only)
   */
  async getSearchAnalytics(): Promise<SearchAnalytics> {
    return api.get('/api/search/analytics');
  },

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    return api.delete('/api/search/history');
  },

  /**
   * Get advanced search options metadata
   */
  async getSearchMetadata(): Promise<{
    availableCategories: string[];
    availableStatuses: string[];
    availableTags: string[];
    supportedTypes: string[];
    maxLimit: number;
  }> {
    return api.get('/api/search/metadata');
  },

  /**
   * Perform live search (for autocomplete/typeahead)
   */
  async liveSearch(query: string, type?: string): Promise<{
    suggestions: string[];
    results: any[];
    total: number;
  }> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (type) params.append('type', type);

    return api.get(`/api/search/live?${params.toString()}`);
  },

  /**
   * Get search result details
   */
  async getSearchResult(resultId: string, type: string): Promise<any> {
    return api.get(`/api/search/result/${type}/${resultId}`);
  },

  /**
   * Export search results
   */
  async exportSearchResults(searchRequest: SearchRequest, format: 'csv' | 'json' = 'json'): Promise<any> {
    const params = new URLSearchParams();
    params.append('format', format);

    // Add search parameters
    params.append('q', searchRequest.q);
    if (searchRequest.type) params.append('type', searchRequest.type);

    return api.post(`/api/search/export?${params.toString()}`, searchRequest);
  },

  /**
   * Get related searches
   */
  async getRelatedSearches(query: string): Promise<string[]> {
    return api.get(`/api/search/related?q=${encodeURIComponent(query)}`);
  }
};




































