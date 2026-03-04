/**
 * Bills Feature - Constants
 * 
 * Shared constants for bills feature
 * Used by both client and server
 */

// ============================================================================
// Bill Status
// ============================================================================

export const BILL_STATUS = {
  DRAFT: 'draft',
  INTRODUCED: 'introduced',
  COMMITTEE_STAGE: 'committee_stage',
  SECOND_READING: 'second_reading',
  THIRD_READING: 'third_reading',
  PASSED: 'passed',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  ENACTED: 'enacted',
} as const;

export const BILL_STATUS_LABELS = {
  [BILL_STATUS.DRAFT]: 'Draft',
  [BILL_STATUS.INTRODUCED]: 'Introduced',
  [BILL_STATUS.COMMITTEE_STAGE]: 'Committee Stage',
  [BILL_STATUS.SECOND_READING]: 'Second Reading',
  [BILL_STATUS.THIRD_READING]: 'Third Reading',
  [BILL_STATUS.PASSED]: 'Passed',
  [BILL_STATUS.REJECTED]: 'Rejected',
  [BILL_STATUS.WITHDRAWN]: 'Withdrawn',
  [BILL_STATUS.ENACTED]: 'Enacted',
} as const;

export const BILL_STATUS_COLORS = {
  [BILL_STATUS.DRAFT]: 'gray',
  [BILL_STATUS.INTRODUCED]: 'blue',
  [BILL_STATUS.COMMITTEE_STAGE]: 'yellow',
  [BILL_STATUS.SECOND_READING]: 'orange',
  [BILL_STATUS.THIRD_READING]: 'purple',
  [BILL_STATUS.PASSED]: 'green',
  [BILL_STATUS.REJECTED]: 'red',
  [BILL_STATUS.WITHDRAWN]: 'gray',
  [BILL_STATUS.ENACTED]: 'green',
} as const;

export const BILL_STATUS_ORDER = [
  BILL_STATUS.DRAFT,
  BILL_STATUS.INTRODUCED,
  BILL_STATUS.COMMITTEE_STAGE,
  BILL_STATUS.SECOND_READING,
  BILL_STATUS.THIRD_READING,
  BILL_STATUS.PASSED,
  BILL_STATUS.ENACTED,
] as const;

// ============================================================================
// Bill Categories
// ============================================================================

export const BILL_CATEGORIES = {
  AGRICULTURE: 'agriculture',
  BUDGET: 'budget',
  DEFENSE: 'defense',
  EDUCATION: 'education',
  ENERGY: 'energy',
  ENVIRONMENT: 'environment',
  FINANCE: 'finance',
  FOREIGN_AFFAIRS: 'foreign_affairs',
  HEALTH: 'health',
  INFRASTRUCTURE: 'infrastructure',
  JUSTICE: 'justice',
  LABOR: 'labor',
  SOCIAL_WELFARE: 'social_welfare',
  TECHNOLOGY: 'technology',
  TRADE: 'trade',
  TRANSPORTATION: 'transportation',
  OTHER: 'other',
} as const;

export const BILL_CATEGORY_LABELS = {
  [BILL_CATEGORIES.AGRICULTURE]: 'Agriculture',
  [BILL_CATEGORIES.BUDGET]: 'Budget',
  [BILL_CATEGORIES.DEFENSE]: 'Defense',
  [BILL_CATEGORIES.EDUCATION]: 'Education',
  [BILL_CATEGORIES.ENERGY]: 'Energy',
  [BILL_CATEGORIES.ENVIRONMENT]: 'Environment',
  [BILL_CATEGORIES.FINANCE]: 'Finance',
  [BILL_CATEGORIES.FOREIGN_AFFAIRS]: 'Foreign Affairs',
  [BILL_CATEGORIES.HEALTH]: 'Health',
  [BILL_CATEGORIES.INFRASTRUCTURE]: 'Infrastructure',
  [BILL_CATEGORIES.JUSTICE]: 'Justice',
  [BILL_CATEGORIES.LABOR]: 'Labor',
  [BILL_CATEGORIES.SOCIAL_WELFARE]: 'Social Welfare',
  [BILL_CATEGORIES.TECHNOLOGY]: 'Technology',
  [BILL_CATEGORIES.TRADE]: 'Trade',
  [BILL_CATEGORIES.TRANSPORTATION]: 'Transportation',
  [BILL_CATEGORIES.OTHER]: 'Other',
} as const;

// ============================================================================
// Bill Sort Options
// ============================================================================

export const BILL_SORT_OPTIONS = {
  RECENT: 'recent',
  TITLE: 'title',
  STATUS: 'status',
  CATEGORY: 'category',
  POPULARITY: 'popularity',
  ENGAGEMENT: 'engagement',
} as const;

export const BILL_SORT_LABELS = {
  [BILL_SORT_OPTIONS.RECENT]: 'Most Recent',
  [BILL_SORT_OPTIONS.TITLE]: 'Title (A-Z)',
  [BILL_SORT_OPTIONS.STATUS]: 'Status',
  [BILL_SORT_OPTIONS.CATEGORY]: 'Category',
  [BILL_SORT_OPTIONS.POPULARITY]: 'Most Popular',
  [BILL_SORT_OPTIONS.ENGAGEMENT]: 'Most Engaged',
} as const;

// ============================================================================
// Bill Limits
// ============================================================================

export const BILL_LIMITS = {
  MIN_TITLE_LENGTH: 5,
  MAX_TITLE_LENGTH: 500,
  MIN_SUMMARY_LENGTH: 20,
  MAX_SUMMARY_LENGTH: 5000,
  MIN_FULL_TEXT_LENGTH: 100,
  MAX_FULL_TEXT_LENGTH: 100000,
  MAX_BILL_NUMBER_LENGTH: 50,
  MAX_SPONSOR_NAME_LENGTH: 200,
  MAX_TAGS: 20,
  MAX_TAG_LENGTH: 50,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_BULK_IDS: 100,
} as const;

// ============================================================================
// Bill Defaults
// ============================================================================

export const BILL_DEFAULTS = {
  STATUS: BILL_STATUS.DRAFT,
  SORT: BILL_SORT_OPTIONS.RECENT,
  PAGE: 1,
  LIMIT: 20,
  INCLUDE_FULL_TEXT: false,
  INCLUDE_SPONSORS: true,
  INCLUDE_COMMENTS: false,
  INCLUDE_ANALYSIS: false,
} as const;

// ============================================================================
// Bill Tracking
// ============================================================================

export const BILL_TRACKING_EVENTS = {
  STATUS_CHANGE: 'status_change',
  AMENDMENT: 'amendment',
  COMMENT_ADDED: 'comment_added',
  VOTE_SCHEDULED: 'vote_scheduled',
  SPONSOR_CHANGE: 'sponsor_change',
} as const;

export const BILL_TRACKING_EVENT_LABELS = {
  [BILL_TRACKING_EVENTS.STATUS_CHANGE]: 'Status Change',
  [BILL_TRACKING_EVENTS.AMENDMENT]: 'Amendment',
  [BILL_TRACKING_EVENTS.COMMENT_ADDED]: 'New Comment',
  [BILL_TRACKING_EVENTS.VOTE_SCHEDULED]: 'Vote Scheduled',
  [BILL_TRACKING_EVENTS.SPONSOR_CHANGE]: 'Sponsor Change',
} as const;
