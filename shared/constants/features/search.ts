/**
 * Search Feature - Constants
 * 
 * Shared constants for search feature
 * Used by both client and server
 */

// ============================================================================
// Search Types
// ============================================================================

export const SEARCH_TYPES = {
  BILLS: 'bills',
  USERS: 'users',
  COMMENTS: 'comments',
  DISCUSSIONS: 'discussions',
  ALL: 'all',
} as const;

export const SEARCH_TYPE_LABELS = {
  [SEARCH_TYPES.BILLS]: 'Bills',
  [SEARCH_TYPES.USERS]: 'Users',
  [SEARCH_TYPES.COMMENTS]: 'Comments',
  [SEARCH_TYPES.DISCUSSIONS]: 'Discussions',
  [SEARCH_TYPES.ALL]: 'All',
} as const;

// ============================================================================
// Search Sort Options
// ============================================================================

export const SEARCH_SORT_OPTIONS = {
  RELEVANCE: 'relevance',
  DATE: 'date',
  POPULARITY: 'popularity',
  ENGAGEMENT: 'engagement',
} as const;

export const SEARCH_SORT_LABELS = {
  [SEARCH_SORT_OPTIONS.RELEVANCE]: 'Most Relevant',
  [SEARCH_SORT_OPTIONS.DATE]: 'Most Recent',
  [SEARCH_SORT_OPTIONS.POPULARITY]: 'Most Popular',
  [SEARCH_SORT_OPTIONS.ENGAGEMENT]: 'Most Engaged',
} as const;

// ============================================================================
// Search Contexts
// ============================================================================

export const SEARCH_CONTEXTS = {
  BILLS: 'bills',
  USERS: 'users',
  TOPICS: 'topics',
  TAGS: 'tags',
} as const;

export const SEARCH_CONTEXT_LABELS = {
  [SEARCH_CONTEXTS.BILLS]: 'Bills',
  [SEARCH_CONTEXTS.USERS]: 'Users',
  [SEARCH_CONTEXTS.TOPICS]: 'Topics',
  [SEARCH_CONTEXTS.TAGS]: 'Tags',
} as const;

// ============================================================================
// Search Facets
// ============================================================================

export const SEARCH_FACETS = {
  CATEGORY: 'category',
  STATUS: 'status',
  DATE: 'date',
  TAGS: 'tags',
  AUTHOR: 'author',
} as const;

export const SEARCH_FACET_LABELS = {
  [SEARCH_FACETS.CATEGORY]: 'Category',
  [SEARCH_FACETS.STATUS]: 'Status',
  [SEARCH_FACETS.DATE]: 'Date',
  [SEARCH_FACETS.TAGS]: 'Tags',
  [SEARCH_FACETS.AUTHOR]: 'Author',
} as const;

// ============================================================================
// Search Timeframes
// ============================================================================

export const SEARCH_TIMEFRAMES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  ALL: 'all',
} as const;

export const SEARCH_TIMEFRAME_LABELS = {
  [SEARCH_TIMEFRAMES.DAY]: 'Today',
  [SEARCH_TIMEFRAMES.WEEK]: 'This Week',
  [SEARCH_TIMEFRAMES.MONTH]: 'This Month',
  [SEARCH_TIMEFRAMES.ALL]: 'All Time',
} as const;

// ============================================================================
// Search Limits
// ============================================================================

export const SEARCH_LIMITS = {
  MIN_QUERY_LENGTH: 1,
  MAX_QUERY_LENGTH: 500,
  MIN_AUTOCOMPLETE_LENGTH: 1,
  MAX_AUTOCOMPLETE_LENGTH: 100,
  MIN_SUGGESTION_LENGTH: 1,
  MAX_SUGGESTION_LENGTH: 100,
  MAX_EXACT_PHRASE_LENGTH: 200,
  MAX_CATEGORY_LENGTH: 100,
  MAX_STATUS_LENGTH: 50,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS: 20,
  MAX_MUST_INCLUDE: 10,
  MAX_MUST_EXCLUDE: 10,
  MAX_EXPERTISE: 20,
  MIN_FACETS: 1,
  MAX_FACETS: 5,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_AUTOCOMPLETE_LIMIT: 10,
  MAX_AUTOCOMPLETE_LIMIT: 20,
  DEFAULT_SUGGESTIONS_LIMIT: 5,
  MAX_SUGGESTIONS_LIMIT: 20,
} as const;

// ============================================================================
// Search Defaults
// ============================================================================

export const SEARCH_DEFAULTS = {
  TYPE: SEARCH_TYPES.ALL,
  SORT: SEARCH_SORT_OPTIONS.RELEVANCE,
  PAGE: 1,
  LIMIT: 20,
  AUTOCOMPLETE_LIMIT: 10,
  SUGGESTIONS_LIMIT: 5,
  TIMEFRAME: SEARCH_TIMEFRAMES.WEEK,
} as const;
