// ============================================================================
// FUZZY MATCHING SEARCH ENGINE
// ============================================================================
// Typo-tolerant search using PostgreSQL's pg_trgm extension for similarity matching

import { repositoryFactory } from '../../../../infrastructure/database/repositories/repository-factory.js';
import { SearchQuery, SearchResult } from '../types/search.types.js';

export class FuzzyMatchingEngine {
  private searchRepository = repositoryFactory.getSearchRepository();

  /**
   * Execute fuzzy matching search for typo tolerance.
   * Uses PostgreSQL's pg_trgm extension for similarity matching.
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    return this.searchRepository.searchBillsFuzzy(query);
  }

}