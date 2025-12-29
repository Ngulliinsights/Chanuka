// ============================================================================
// DEPRECATED: This file is now a direct export of the consolidated SuggestionEngineService
// ============================================================================
// This file has been updated to directly export the consolidated SuggestionEngineService
// instead of being a deprecated wrapper. All imports should now use the direct service.

export {
  SuggestionEngineService as SearchSuggestionsService,
  suggestionEngineService as searchSuggestionsService
} from './search/engines/suggestion/suggestion-engine.service';

// Re-export types for backward compatibility
export type {
  SearchSuggestion,
  AutocompleteFacets,
  AutocompleteResult,
  SearchContext,
  SearchAnalytics
} from './search/engines/types/search.types';

















































