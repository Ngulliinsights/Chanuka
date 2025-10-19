/**
 * Search domain public API – drop-in replacement for search.ts + search-service.ts
 * Every original function signature is preserved.
 */
export {
  searchBills,
  getSearchSuggestions,
  getPopularSearchTerms,
  rebuildSearchIndexes,
  getSearchIndexHealth,
  warmupSearchCache,
  getSearchMetrics,
} from './application/SearchService';

export type {
  SearchQuery,
  SearchResponseDto,
  SearchFilters,
  SearchPagination,
  SearchOptions,
  PlainBill,
} from './domain/search.dto';




































