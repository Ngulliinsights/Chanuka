/**
 * Community Feature - Constants
 * 
 * Shared constants for community feature
 * Used by both client and server
 */

// ============================================================================
// Comment Sort Options
// ============================================================================

export const COMMENT_SORT_OPTIONS = {
  RECENT: 'recent',
  POPULAR: 'popular',
  QUALITY: 'quality',
  CONTROVERSIAL: 'controversial',
} as const;

export const COMMENT_SORT_LABELS = {
  [COMMENT_SORT_OPTIONS.RECENT]: 'Most Recent',
  [COMMENT_SORT_OPTIONS.POPULAR]: 'Most Popular',
  [COMMENT_SORT_OPTIONS.QUALITY]: 'Highest Quality',
  [COMMENT_SORT_OPTIONS.CONTROVERSIAL]: 'Most Controversial',
} as const;

// ============================================================================
// Vote Types
// ============================================================================

export const VOTE_TYPES = {
  UP: 'up',
  DOWN: 'down',
  REMOVE: 'remove',
} as const;

export const VOTE_TYPE_LABELS = {
  [VOTE_TYPES.UP]: 'Upvote',
  [VOTE_TYPES.DOWN]: 'Downvote',
  [VOTE_TYPES.REMOVE]: 'Remove Vote',
} as const;

export const VOTE_TYPE_VALUES = {
  [VOTE_TYPES.UP]: 1,
  [VOTE_TYPES.DOWN]: -1,
  [VOTE_TYPES.REMOVE]: 0,
} as const;

// ============================================================================
// Claim Types
// ============================================================================

export const CLAIM_TYPES = {
  FACTUAL: 'factual',
  VALUE: 'value',
  POLICY: 'policy',
} as const;

export const CLAIM_TYPE_LABELS = {
  [CLAIM_TYPES.FACTUAL]: 'Factual Claim',
  [CLAIM_TYPES.VALUE]: 'Value Claim',
  [CLAIM_TYPES.POLICY]: 'Policy Claim',
} as const;

export const CLAIM_TYPE_DESCRIPTIONS = {
  [CLAIM_TYPES.FACTUAL]: 'A claim about what is or was true',
  [CLAIM_TYPES.VALUE]: 'A claim about what is good or bad',
  [CLAIM_TYPES.POLICY]: 'A claim about what should be done',
} as const;

// ============================================================================
// Evidence Source Types
// ============================================================================

export const EVIDENCE_SOURCE_TYPES = {
  CITATION: 'citation',
  DATA: 'data',
  EXPERT: 'expert',
  ANECDOTE: 'anecdote',
  NONE: 'none',
} as const;

export const EVIDENCE_SOURCE_LABELS = {
  [EVIDENCE_SOURCE_TYPES.CITATION]: 'Citation',
  [EVIDENCE_SOURCE_TYPES.DATA]: 'Data/Statistics',
  [EVIDENCE_SOURCE_TYPES.EXPERT]: 'Expert Opinion',
  [EVIDENCE_SOURCE_TYPES.ANECDOTE]: 'Anecdotal',
  [EVIDENCE_SOURCE_TYPES.NONE]: 'No Source',
} as const;

export const EVIDENCE_SOURCE_WEIGHTS = {
  [EVIDENCE_SOURCE_TYPES.CITATION]: 0.9,
  [EVIDENCE_SOURCE_TYPES.DATA]: 0.95,
  [EVIDENCE_SOURCE_TYPES.EXPERT]: 0.85,
  [EVIDENCE_SOURCE_TYPES.ANECDOTE]: 0.4,
  [EVIDENCE_SOURCE_TYPES.NONE]: 0.1,
} as const;

// ============================================================================
// Fallacy Types (Community-specific)
// ============================================================================

export const COMMUNITY_FALLACY_TYPES = {
  AD_HOMINEM: 'ad_hominem',
  STRAW_MAN: 'straw_man',
  FALSE_DICHOTOMY: 'false_dichotomy',
  SLIPPERY_SLOPE: 'slippery_slope',
  APPEAL_TO_AUTHORITY: 'appeal_to_authority',
  APPEAL_TO_EMOTION: 'appeal_to_emotion',
  HASTY_GENERALIZATION: 'hasty_generalization',
  CIRCULAR_REASONING: 'circular_reasoning',
  RED_HERRING: 'red_herring',
  FALSE_CAUSE: 'false_cause',
  NONE: 'none',
} as const;

export const COMMUNITY_FALLACY_LABELS = {
  [COMMUNITY_FALLACY_TYPES.AD_HOMINEM]: 'Ad Hominem',
  [COMMUNITY_FALLACY_TYPES.STRAW_MAN]: 'Straw Man',
  [COMMUNITY_FALLACY_TYPES.FALSE_DICHOTOMY]: 'False Dichotomy',
  [COMMUNITY_FALLACY_TYPES.SLIPPERY_SLOPE]: 'Slippery Slope',
  [COMMUNITY_FALLACY_TYPES.APPEAL_TO_AUTHORITY]: 'Appeal to Authority',
  [COMMUNITY_FALLACY_TYPES.APPEAL_TO_EMOTION]: 'Appeal to Emotion',
  [COMMUNITY_FALLACY_TYPES.HASTY_GENERALIZATION]: 'Hasty Generalization',
  [COMMUNITY_FALLACY_TYPES.CIRCULAR_REASONING]: 'Circular Reasoning',
  [COMMUNITY_FALLACY_TYPES.RED_HERRING]: 'Red Herring',
  [COMMUNITY_FALLACY_TYPES.FALSE_CAUSE]: 'False Cause',
  [COMMUNITY_FALLACY_TYPES.NONE]: 'No Fallacy',
} as const;

// ============================================================================
// Fallacy Severity
// ============================================================================

export const COMMUNITY_FALLACY_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const COMMUNITY_FALLACY_SEVERITY_LABELS = {
  [COMMUNITY_FALLACY_SEVERITY.LOW]: 'Low',
  [COMMUNITY_FALLACY_SEVERITY.MEDIUM]: 'Medium',
  [COMMUNITY_FALLACY_SEVERITY.HIGH]: 'High',
} as const;

export const COMMUNITY_FALLACY_SEVERITY_SCORES = {
  [COMMUNITY_FALLACY_SEVERITY.LOW]: 0.1,
  [COMMUNITY_FALLACY_SEVERITY.MEDIUM]: 0.3,
  [COMMUNITY_FALLACY_SEVERITY.HIGH]: 0.5,
} as const;

// ============================================================================
// Reasoning Types
// ============================================================================

export const REASONING_TYPES = {
  DEDUCTIVE: 'deductive',
  INDUCTIVE: 'inductive',
  ABDUCTIVE: 'abductive',
  ANALOGICAL: 'analogical',
  UNCLEAR: 'unclear',
} as const;

export const REASONING_TYPE_LABELS = {
  [REASONING_TYPES.DEDUCTIVE]: 'Deductive',
  [REASONING_TYPES.INDUCTIVE]: 'Inductive',
  [REASONING_TYPES.ABDUCTIVE]: 'Abductive',
  [REASONING_TYPES.ANALOGICAL]: 'Analogical',
  [REASONING_TYPES.UNCLEAR]: 'Unclear',
} as const;

export const REASONING_TYPE_DESCRIPTIONS = {
  [REASONING_TYPES.DEDUCTIVE]: 'Reasoning from general to specific',
  [REASONING_TYPES.INDUCTIVE]: 'Reasoning from specific to general',
  [REASONING_TYPES.ABDUCTIVE]: 'Reasoning to best explanation',
  [REASONING_TYPES.ANALOGICAL]: 'Reasoning by comparison',
  [REASONING_TYPES.UNCLEAR]: 'Reasoning pattern unclear',
} as const;

// ============================================================================
// Time Periods
// ============================================================================

export const TIME_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  ALL: 'all',
} as const;

export const TIME_PERIOD_LABELS = {
  [TIME_PERIODS.DAY]: 'Today',
  [TIME_PERIODS.WEEK]: 'This Week',
  [TIME_PERIODS.MONTH]: 'This Month',
  [TIME_PERIODS.YEAR]: 'This Year',
  [TIME_PERIODS.ALL]: 'All Time',
} as const;

// ============================================================================
// Flag Reasons
// ============================================================================

export const FLAG_REASONS = {
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  MISINFORMATION: 'misinformation',
  OFF_TOPIC: 'off_topic',
  INAPPROPRIATE: 'inappropriate',
  OTHER: 'other',
} as const;

export const FLAG_REASON_LABELS = {
  [FLAG_REASONS.SPAM]: 'Spam',
  [FLAG_REASONS.HARASSMENT]: 'Harassment',
  [FLAG_REASONS.MISINFORMATION]: 'Misinformation',
  [FLAG_REASONS.OFF_TOPIC]: 'Off Topic',
  [FLAG_REASONS.INAPPROPRIATE]: 'Inappropriate Content',
  [FLAG_REASONS.OTHER]: 'Other',
} as const;

// ============================================================================
// Flag Status
// ============================================================================

export const FLAG_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
  ALL: 'all',
} as const;

export const FLAG_STATUS_LABELS = {
  [FLAG_STATUS.PENDING]: 'Pending Review',
  [FLAG_STATUS.REVIEWED]: 'Reviewed',
  [FLAG_STATUS.RESOLVED]: 'Resolved',
  [FLAG_STATUS.ALL]: 'All Flags',
} as const;

// ============================================================================
// Quality Score Ranges
// ============================================================================

export const QUALITY_SCORE_RANGES = {
  LOW: { min: 0, max: 4 },
  MEDIUM: { min: 5, max: 7 },
  HIGH: { min: 8, max: 10 },
} as const;

export const QUALITY_SCORE_LABELS = {
  LOW: 'Low Quality',
  MEDIUM: 'Medium Quality',
  HIGH: 'High Quality',
} as const;

// ============================================================================
// Comment Limits
// ============================================================================

export const COMMENT_LIMITS = {
  MIN_CONTENT_LENGTH: 10,
  MAX_CONTENT_LENGTH: 5000,
  MIN_CLAIM_LENGTH: 5,
  MAX_CLAIM_LENGTH: 500,
  MIN_EVIDENCE_LENGTH: 10,
  MAX_EVIDENCE_LENGTH: 1000,
  MAX_SOURCE_LENGTH: 500,
  MAX_REASON_LENGTH: 500,
  MAX_VOTE_REASON_LENGTH: 200,
  MAX_FALLACY_DESCRIPTION_LENGTH: 500,
  MAX_FALLACY_LOCATION_LENGTH: 200,
  MAX_IMPROVEMENT_LENGTH: 200,
  DEFAULT_COMMENTS_LIMIT: 50,
  MAX_COMMENTS_LIMIT: 100,
  MIN_THREAD_DEPTH: 1,
  MAX_THREAD_DEPTH: 10,
  DEFAULT_THREAD_DEPTH: 5,
  MIN_CLUSTER_SIZE: 2,
  MAX_CLUSTERS: 20,
  DEFAULT_CLUSTERS: 10,
  DEFAULT_RELATED_LIMIT: 10,
  DEFAULT_COUNTER_LIMIT: 5,
} as const;

// ============================================================================
// Similarity Thresholds
// ============================================================================

export const SIMILARITY_THRESHOLDS = {
  MIN: 0,
  MAX: 1,
  DEFAULT: 0.7,
  HIGH: 0.85,
  MEDIUM: 0.7,
  LOW: 0.5,
} as const;

// ============================================================================
// Score Ranges
// ============================================================================

export const SCORE_RANGES = {
  QUALITY: { min: 0, max: 10 },
  CONFIDENCE: { min: 0, max: 1 },
  STRENGTH: { min: 0, max: 1 },
  COHERENCE: { min: 0, max: 1 },
  EVIDENCE_STRENGTH: { min: 0, max: 1 },
  LOGICAL_VALIDITY: { min: 0, max: 1 },
  CLARITY: { min: 0, max: 1 },
  RELEVANCE: { min: 0, max: 1 },
  FALLACY_PENALTY: { min: 0, max: 1 },
  ENGAGEMENT_RATE: { min: 0, max: 1 },
} as const;

// ============================================================================
// Analysis Options
// ============================================================================

export const COMMUNITY_ANALYSIS_OPTIONS = {
  ANALYZE_ARGUMENT: true,
  REANALYZE: true,
  INCLUDE_ANALYSIS: true,
  INCLUDE_RELATED: true,
  INCLUDE_COUNTER_ARGUMENTS: true,
  FORCE_REANALYSIS: false,
} as const;
