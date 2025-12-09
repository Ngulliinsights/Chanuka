import type {
  SearchRequest,
  SaveSearchRequest
} from '@client/shared/types/search';

import { globalApiClient as api } from './index';

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
  async search(request: SearchRequest): Promise<any> {
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
   * Perform PostgreSQL full-text search
   */
  async searchPostgreSQL(params: Record<string, string | number | boolean>): Promise<any> {
    return api.get('/api/search/postgresql', { params, timeout: 10000 });
  },

  /**
   * Perform streaming search with real-time results
   */
  async streamSearch(params: Record<string, string | number | boolean>): Promise<any> {
    return api.get('/api/search/stream', {
      params,
      timeout: 30000
    });
  },

  /**
   * Cancel a streaming search
   */
  async cancelSearch(searchId: string): Promise<any> {
    return api.delete(`/api/search/cancel/${searchId}`);
  },

  /**
   * Get search data for fuzzy matching
   */
  async getSearchData(type?: string): Promise<any> {
    return api.get('/api/search/data', {
      params: { type: type || 'bills' },
      timeout: 5000
    });
  },

  /**
   * Get search suggestions/autocomplete
   */
  async getSuggestions(query: string, limit = 10): Promise<any> {
    return api.get(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  /**
   * Get recent searches
   */
  async getRecentSearches(limit = 5): Promise<any> {
    return api.get(`/api/search/recent?limit=${limit}`);
  },

  /**
   * Get popular searches
   */
  async getPopularSearches(limit = 5): Promise<any> {
    return api.get(`/api/search/popular?limit=${limit}`);
  },

  /**
   * Get search history for current user
   */
  async getSearchHistory(limit = 20): Promise<any> {
    return api.get(`/api/search/history?limit=${limit}`);
  },

  /**
   * Save a search query
   */
  async saveSearch(request: SaveSearchRequest): Promise<any> {
    return api.post('/api/search/saved', request);
  },

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<any> {
    return api.get('/api/search/saved');
  },

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(searchId: string): Promise<any> {
    return api.delete(`/api/search/saved/${searchId}`);
  },

  /**
   * Execute a saved search
   */
  async executeSavedSearch(searchId: string): Promise<any> {
    return api.post(`/api/search/saved/${searchId}/execute`);
  },

  /**
   * Get search analytics (admin only)
   */
  async getSearchAnalytics(): Promise<any> {
    return api.get('/api/search/analytics');
  },

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<any> {
    return api.delete('/api/search/history');
  },

  /**
   * Get advanced search options metadata
   */
  async getSearchMetadata(): Promise<any> {
    return api.get('/api/search/metadata');
  },

  /**
   * Perform live search (for autocomplete/typeahead)
   */
  async liveSearch(query: string, type?: string): Promise<any> {
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
  async getRelatedSearches(query: string): Promise<any> {
    return api.get(`/api/search/related?q=${encodeURIComponent(query)}`);
  }
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
  getRelatedSearches
} = searchApiClient;

// Default export for convenience
export default searchApiClient;