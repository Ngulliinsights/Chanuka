import { SearchQuery, SearchResult } from '../../../features/search/engines/types/search.types.js';

/**
 * Search repository interface for encapsulating all search-related database operations
 */
export interface ISearchRepository {
  /**
   * Search bills using full-text search
   */
  searchBillsFullText(tsQuery: string, searchTerms: string[], query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Search sponsors using full-text search
   */
  searchSponsorsFullText(tsQuery: string, searchTerms: string[], query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Search comments using full-text search
   */
  searchCommentsFullText(tsQuery: string, searchTerms: string[], query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Search bills using fuzzy matching
   */
  searchBillsFuzzy(query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Search bills and sponsors using simple matching
   */
  searchSimple(query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Get bill title suggestions for autocomplete
   */
  getBillSuggestions(pattern: string, limit: number): Promise<string[]>;

  /**
   * Get sponsor name suggestions for autocomplete
   */
  getSponsorSuggestions(pattern: string, limit: number): Promise<string[]>;
}