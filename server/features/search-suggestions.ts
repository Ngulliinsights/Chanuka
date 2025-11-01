import { suggestionEngineService } from './search/engines/suggestion-engine.service';
import { suggestionRankingService } from './search/engines/suggestion-ranking.service';
import { queryBuilderService } from './search/services/query-builder.service';

// Re-export types for backward compatibility
export type {
  SearchSuggestion,
  AutocompleteFacets,
  AutocompleteResult,
  SearchContext,
  SearchAnalytics
} from './search/types/search.types';

// Import types for internal use
import type {
  SearchSuggestion,
  AutocompleteFacets,
  AutocompleteResult,
  SearchContext,
  SearchAnalytics
} from './search/types/search.types';

/**
 * Legacy Search Suggestions Service - Refactored to use modular components
 * 
 * This service now delegates to the new modular search architecture:
 * - SuggestionEngineService: Main suggestion logic
 * - SuggestionRankingService: Ranking algorithms
 * - HistoryCleanupService: History management
 * - QueryBuilderService: Query construction
 * - ParallelQueryExecutor: Concurrent query execution
 */
export class SearchSuggestionsService {

  /**
   * Get autocomplete suggestions - delegates to SuggestionEngineService
   */
  async getAutocompleteSuggestions(
    partialQuery: string,
    limit: number = 10,
    includeMetadata: boolean = true
  ): Promise<AutocompleteResult> {
    return suggestionEngineService.getAutocompleteSuggestions(partialQuery, limit, includeMetadata);
  }

  /**
   * Get contextual suggestions - uses SuggestionEngineService with ranking
   */
  async getContextualSuggestions(
    query: string,
    context: SearchContext,
    limit: number = 8
  ): Promise<SearchSuggestion[]> {
    // Get suggestions from the engine
    const result = await suggestionEngineService.getAutocompleteSuggestions(query, limit * 2);

    // Apply contextual ranking
    const rankingContext = {
      query: queryBuilderService.sanitizeQuery(query),
      searchContext: context
    };

    return suggestionRankingService.rankSuggestions(result.suggestions, rankingContext)
      .slice(0, limit);
  }

  /**
   * Get popular search terms - delegates to SuggestionEngineService
   */
  async getPopularSearchTerms(limit: number = 20): Promise<string[]> {
    const analytics = await suggestionEngineService.getSearchAnalytics();
    return analytics.topTerms.slice(0, limit).map(t => t.term);
  }

  /**
   * Get trending search terms - uses analytics from SuggestionEngineService
   */
  async getTrendingSearchTerms(limit: number = 10): Promise<SearchSuggestion[]> {
    const analytics = await suggestionEngineService.getSearchAnalytics();
    return analytics.topQueries.slice(0, limit).map(q => ({
      term: q.query,
      type: 'recent' as const,
      frequency: q.frequency
    }));
  }

  /**
   * Record search analytics - delegates to SuggestionEngineService
   */
  async recordSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    await suggestionEngineService.updateSearchHistory(analytics.query, analytics.resultCount);
  }

  /**
   * Get spell-corrected suggestions - uses QueryBuilderService
   */
  async getSpellCorrectedSuggestions(query: string): Promise<string[]> {
    const sanitizedQuery = queryBuilderService.sanitizeQuery(query);

    // Get suggestions and use ranking service for similarity
    const result = await suggestionEngineService.getAutocompleteSuggestions(sanitizedQuery, 10);

    return result.suggestions
      .filter(s => suggestionRankingService.calculateRelevanceScore(s, sanitizedQuery) > 0.3)
      .map(s => s.term)
      .slice(0, 5);
  }

  /**
   * Get related search terms - uses contextual suggestions
   */
  async getRelatedSearchTerms(query: string, limit: number = 8): Promise<string[]> {
    const context: SearchContext = { recentSearches: [query] };
    const suggestions = await this.getContextualSuggestions(query, context, limit * 2);

    // Filter out exact matches and return related terms
    return suggestions
      .filter(s => s.term.toLowerCase() !== query.toLowerCase())
      .map(s => s.term)
      .slice(0, limit);
  }
}

// Export singleton instance
export const searchSuggestionsService = new SearchSuggestionsService();














































