/**
 * Search Feature UI Components
 *
 * All UI components specific to the search feature organized by FSD principles.
 * These components handle search interfaces, results, filters, and analytics.
 */

// Search Interface Components
export { default as AdvancedSearch } from './interface/AdvancedSearch';
export { SearchTips } from './interface/SearchTips';
export { default as IntelligentAutocomplete } from './interface/IntelligentAutocomplete';
export { default as SearchBar } from './interface/SearchBar';
export { default as SearchProgressIndicator } from './interface/SearchProgressIndicator';
export { default as SavedSearches } from './interface/SavedSearches';
export { default as SearchAnalyticsDashboard } from './interface/SearchAnalyticsDashboard';

// Search Results Components
export { SearchResults } from './results/SearchResults';
export { default as SearchResultCard } from './results/SearchResultCard';

// Search Filter Components
export { SearchFilters as SearchFiltersComponent } from './filters/SearchFilters';