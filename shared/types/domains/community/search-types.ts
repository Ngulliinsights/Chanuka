/**
 * Community Domain - Search Types
 * 
 * Types for search operations, filtering, pagination, and results.
 * Migrated from server/features/search/domain/search.dto.ts
 * 
 * @module shared/types/domains/community/search-types
 */

// ============================================================================
// Search Filters and Options
// ============================================================================

/**
 * Search filter criteria
 */
export interface SearchFilters {
  query?: string;
  category?: string[];
  status?: string[];
  sponsor_id?: number[];
  dateFrom?: Date;
  dateTo?: Date;
  complexityMin?: number;
  complexityMax?: number;
  tags?: string[];
}

/**
 * Search pagination parameters
 */
export interface SearchPagination {
  page: number;
  limit: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'engagement';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search execution options
 */
export interface SearchOptions {
  includeSnippets?: boolean;
  includeHighlights?: boolean;
  minRelevanceScore?: number;
  searchType?: 'simple' | 'phrase' | 'boolean';
}

/**
 * Complete search query
 */
export interface SearchQuery {
  text: string;
  filters?: SearchFilters;
  pagination?: SearchPagination;
  options?: SearchOptions;
}

// ============================================================================
// Search Results
// ============================================================================

/**
 * Single search result
 */
export interface SearchResultDto {
  bill: Record<string, unknown>;
  relevanceScore: number;
  snippet?: string;
  highlights?: string[];
  matchedFields: string[];
}

/**
 * Search response with facets and metadata
 */
export interface SearchResponseDto {
  results: SearchResultDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  facets: {
    status: Array<{ value: string; count: number }>;
    category: Array<{ value: string; count: number }>;
    sponsors: Array<{ value: number; count: number }>;
    complexity: Array<{ range: string; count: number; min: number; max: number }>;
    dateRanges: Array<{ range: string; count: number; from: Date; to: Date }>;
  };
  suggestions?: string[];
  metadata: {
    searchTime: number;
    source: 'cache' | 'db' | 'fallback';
    queryType: string;
  };
}

// ============================================================================
// Search Analytics and Metrics
// ============================================================================

/**
 * Search analytics event
 */
export interface SearchAnalyticsEvent {
  eventId: string;
  userId: string;
  query: string;
  resultCount: number;
  selectedResult?: string;
  durationMs: number;
  source: string;
  timestamp: Date;
}

/**
 * Search metrics across time period
 */
export interface SearchMetrics {
  totalSearches: number;
  uniqueUsers: number;
  averageResultsPerSearch: number;
  averageResponseTime: number;
  topQueries: Array<{ query: string; count: number }>;
  topResultsClicked: Array<{ billId: string; clickCount: number }>;
}

// ============================================================================
// Search Validation and Corrections
// ============================================================================

/**
 * Search validation result
 */
export interface SearchValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Typo correction suggestion
 */
export interface CorrectionResult {
  original: string;
  corrected: string;
  confidence: number;
  alternatives?: string[];
}

/**
 * Synonym suggestion
 */
export interface SynonymResult {
  term: string;
  synonyms: string[];
  category?: string;
}

/**
 * Intent classification for search
 */
export interface IntentClassification {
  intent: 'search' | 'filter' | 'aggregate' | 'browse' | 'help';
  confidence: number;
  relatedIntents?: string[];
}

/**
 * Search strategy based on query analysis
 */
export interface SearchStrategy {
  strategyType: 'simple' | 'boolean' | 'faceted' | 'semantic' | 'hybrid';
  fields: string[];
  weights: Record<string, number>;
  useFilters: boolean;
  useFacets: boolean;
  minRelevance: number;
}
