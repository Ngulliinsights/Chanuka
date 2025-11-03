// ============================================================================
// SIMPLE MATCHING SEARCH ENGINE
// ============================================================================
// Basic LIKE matching as final fallback - always available and works without extensions

import { repositoryFactory } from '../../../../infrastructure/database/repositories/repository-factory.js';
import { SearchQuery, SearchResult } from '../types/search.types.js';

export class SimpleMatchingEngine {
  private searchRepository = repositoryFactory.getSearchRepository();

  /**
   * Execute simple LIKE matching search as final fallback.
   * Always available and works even without PostgreSQL extensions.
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    return this.searchRepository.searchSimple(query);
  }

}