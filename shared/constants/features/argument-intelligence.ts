/**
 * Argument Intelligence Feature - Constants
 * 
 * Shared constants for argument intelligence feature
 * Used by both client and server
 */

// ============================================================================
// Argument Types
// ============================================================================

export const ARGUMENT_TYPES = {
  SUPPORTING: 'supporting',
  OPPOSING: 'opposing',
  NEUTRAL: 'neutral',
  CONDITIONAL: 'conditional',
  COMPARATIVE: 'comparative',
} as const;

export const ARGUMENT_TYPE_LABELS = {
  [ARGUMENT_TYPES.SUPPORTING]: 'Supporting',
  [ARGUMENT_TYPES.OPPOSING]: 'Opposing',
  [ARGUMENT_TYPES.NEUTRAL]: 'Neutral',
  [ARGUMENT_TYPES.CONDITIONAL]: 'Conditional',
  [ARGUMENT_TYPES.COMPARATIVE]: 'Comparative',
} as const;

// ============================================================================
// Argument Quality
// ============================================================================

export const ARGUMENT_QUALITY = {
  WEAK: 'weak',
  MODERATE: 'moderate',
  STRONG: 'strong',
  VERY_STRONG: 'very_strong',
} as const;

export const ARGUMENT_QUALITY_LABELS = {
  [ARGUMENT_QUALITY.WEAK]: 'Weak',
  [ARGUMENT_QUALITY.MODERATE]: 'Moderate',
  [ARGUMENT_QUALITY.STRONG]: 'Strong',
  [ARGUMENT_QUALITY.VERY_STRONG]: 'Very Strong',
} as const;

export const ARGUMENT_QUALITY_SCORES = {
  [ARGUMENT_QUALITY.WEAK]: 0.25,
  [ARGUMENT_QUALITY.MODERATE]: 0.5,
  [ARGUMENT_QUALITY.STRONG]: 0.75,
  [ARGUMENT_QUALITY.VERY_STRONG]: 1.0,
} as const;

// ============================================================================
// Logical Fallacies
// ============================================================================

export const LOGICAL_FALLACIES = {
  AD_HOMINEM: 'ad_hominem',
  STRAW_MAN: 'straw_man',
  FALSE_DILEMMA: 'false_dilemma',
  SLIPPERY_SLOPE: 'slippery_slope',
  CIRCULAR_REASONING: 'circular_reasoning',
  APPEAL_TO_AUTHORITY: 'appeal_to_authority',
  APPEAL_TO_EMOTION: 'appeal_to_emotion',
  HASTY_GENERALIZATION: 'hasty_generalization',
  RED_HERRING: 'red_herring',
  FALSE_CAUSE: 'false_cause',
  NONE: 'none',
} as const;

export const LOGICAL_FALLACY_LABELS = {
  [LOGICAL_FALLACIES.AD_HOMINEM]: 'Ad Hominem',
  [LOGICAL_FALLACIES.STRAW_MAN]: 'Straw Man',
  [LOGICAL_FALLACIES.FALSE_DILEMMA]: 'False Dilemma',
  [LOGICAL_FALLACIES.SLIPPERY_SLOPE]: 'Slippery Slope',
  [LOGICAL_FALLACIES.CIRCULAR_REASONING]: 'Circular Reasoning',
  [LOGICAL_FALLACIES.APPEAL_TO_AUTHORITY]: 'Appeal to Authority',
  [LOGICAL_FALLACIES.APPEAL_TO_EMOTION]: 'Appeal to Emotion',
  [LOGICAL_FALLACIES.HASTY_GENERALIZATION]: 'Hasty Generalization',
  [LOGICAL_FALLACIES.RED_HERRING]: 'Red Herring',
  [LOGICAL_FALLACIES.FALSE_CAUSE]: 'False Cause',
  [LOGICAL_FALLACIES.NONE]: 'No Fallacy Detected',
} as const;

export const LOGICAL_FALLACY_DESCRIPTIONS = {
  [LOGICAL_FALLACIES.AD_HOMINEM]: 'Attacking the person instead of the argument',
  [LOGICAL_FALLACIES.STRAW_MAN]: 'Misrepresenting an argument to make it easier to attack',
  [LOGICAL_FALLACIES.FALSE_DILEMMA]: 'Presenting only two options when more exist',
  [LOGICAL_FALLACIES.SLIPPERY_SLOPE]: 'Assuming one action will lead to extreme consequences',
  [LOGICAL_FALLACIES.CIRCULAR_REASONING]: 'Using the conclusion as a premise',
  [LOGICAL_FALLACIES.APPEAL_TO_AUTHORITY]: 'Citing authority instead of evidence',
  [LOGICAL_FALLACIES.APPEAL_TO_EMOTION]: 'Using emotions instead of logic',
  [LOGICAL_FALLACIES.HASTY_GENERALIZATION]: 'Drawing conclusions from insufficient evidence',
  [LOGICAL_FALLACIES.RED_HERRING]: 'Introducing irrelevant information',
  [LOGICAL_FALLACIES.FALSE_CAUSE]: 'Assuming correlation implies causation',
  [LOGICAL_FALLACIES.NONE]: 'No logical fallacy detected',
} as const;

// ============================================================================
// Evidence Types
// ============================================================================

export const EVIDENCE_TYPES = {
  STATISTICAL: 'statistical',
  EXPERT_TESTIMONY: 'expert_testimony',
  CASE_STUDY: 'case_study',
  HISTORICAL: 'historical',
  SCIENTIFIC: 'scientific',
  LEGAL: 'legal',
  ANECDOTAL: 'anecdotal',
} as const;

export const EVIDENCE_TYPE_LABELS = {
  [EVIDENCE_TYPES.STATISTICAL]: 'Statistical Data',
  [EVIDENCE_TYPES.EXPERT_TESTIMONY]: 'Expert Testimony',
  [EVIDENCE_TYPES.CASE_STUDY]: 'Case Study',
  [EVIDENCE_TYPES.HISTORICAL]: 'Historical Evidence',
  [EVIDENCE_TYPES.SCIENTIFIC]: 'Scientific Research',
  [EVIDENCE_TYPES.LEGAL]: 'Legal Precedent',
  [EVIDENCE_TYPES.ANECDOTAL]: 'Anecdotal Evidence',
} as const;

export const EVIDENCE_TYPE_WEIGHTS = {
  [EVIDENCE_TYPES.STATISTICAL]: 0.9,
  [EVIDENCE_TYPES.EXPERT_TESTIMONY]: 0.85,
  [EVIDENCE_TYPES.CASE_STUDY]: 0.8,
  [EVIDENCE_TYPES.HISTORICAL]: 0.75,
  [EVIDENCE_TYPES.SCIENTIFIC]: 0.95,
  [EVIDENCE_TYPES.LEGAL]: 0.9,
  [EVIDENCE_TYPES.ANECDOTAL]: 0.4,
} as const;

// ============================================================================
// Comparison Criteria
// ============================================================================

export const COMPARISON_CRITERIA = {
  LOGICAL_STRENGTH: 'logical_strength',
  EVIDENCE_QUALITY: 'evidence_quality',
  RHETORICAL_EFFECTIVENESS: 'rhetorical_effectiveness',
  FACTUAL_ACCURACY: 'factual_accuracy',
} as const;

export const COMPARISON_CRITERIA_LABELS = {
  [COMPARISON_CRITERIA.LOGICAL_STRENGTH]: 'Logical Strength',
  [COMPARISON_CRITERIA.EVIDENCE_QUALITY]: 'Evidence Quality',
  [COMPARISON_CRITERIA.RHETORICAL_EFFECTIVENESS]: 'Rhetorical Effectiveness',
  [COMPARISON_CRITERIA.FACTUAL_ACCURACY]: 'Factual Accuracy',
} as const;

// ============================================================================
// Fallacy Severity
// ============================================================================

export const FALLACY_SEVERITY = {
  MINOR: 'minor',
  MODERATE: 'moderate',
  MAJOR: 'major',
} as const;

export const FALLACY_SEVERITY_LABELS = {
  [FALLACY_SEVERITY.MINOR]: 'Minor',
  [FALLACY_SEVERITY.MODERATE]: 'Moderate',
  [FALLACY_SEVERITY.MAJOR]: 'Major',
} as const;

// ============================================================================
// Sort Options
// ============================================================================

export const ARGUMENT_SORT_OPTIONS = {
  QUALITY: 'quality',
  DATE: 'date',
  RATING: 'rating',
  ENGAGEMENT: 'engagement',
} as const;

export const ARGUMENT_SORT_LABELS = {
  [ARGUMENT_SORT_OPTIONS.QUALITY]: 'Quality',
  [ARGUMENT_SORT_OPTIONS.DATE]: 'Date',
  [ARGUMENT_SORT_OPTIONS.RATING]: 'Rating',
  [ARGUMENT_SORT_OPTIONS.ENGAGEMENT]: 'Engagement',
} as const;

// ============================================================================
// Timeframes
// ============================================================================

export const ARGUMENT_TIMEFRAMES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
} as const;

export const ARGUMENT_TIMEFRAME_LABELS = {
  [ARGUMENT_TIMEFRAMES.DAY]: 'Daily',
  [ARGUMENT_TIMEFRAMES.WEEK]: 'Weekly',
  [ARGUMENT_TIMEFRAMES.MONTH]: 'Monthly',
  [ARGUMENT_TIMEFRAMES.QUARTER]: 'Quarterly',
} as const;

// ============================================================================
// Metrics
// ============================================================================

export const ARGUMENT_METRICS = {
  COUNT: 'count',
  QUALITY: 'quality',
  ENGAGEMENT: 'engagement',
  FALLACY_RATE: 'fallacy_rate',
} as const;

export const ARGUMENT_METRIC_LABELS = {
  [ARGUMENT_METRICS.COUNT]: 'Argument Count',
  [ARGUMENT_METRICS.QUALITY]: 'Average Quality',
  [ARGUMENT_METRICS.ENGAGEMENT]: 'Engagement Level',
  [ARGUMENT_METRICS.FALLACY_RATE]: 'Fallacy Rate',
} as const;

// ============================================================================
// Limits and Constraints
// ============================================================================

export const ARGUMENT_LIMITS = {
  MIN_TEXT_LENGTH: 20,
  MAX_TEXT_LENGTH: 10000,
  MIN_CLAIM_LENGTH: 10,
  MAX_CLAIM_LENGTH: 1000,
  MIN_REASONING_LENGTH: 20,
  MAX_REASONING_LENGTH: 5000,
  MIN_EVIDENCE_COUNT: 1,
  MAX_EVIDENCE_COUNT: 10,
  MAX_COUNTERARGUMENTS: 5,
  MAX_ARGUMENT_DEPTH: 5,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// Analysis Options
// ============================================================================

export const ANALYSIS_OPTIONS = {
  ANALYZE_FALLACIES: true,
  ANALYZE_EVIDENCE: true,
  ANALYZE_RHETORIC: true,
  EXTRACT_CLAIMS: true,
  EXTRACT_EVIDENCE: true,
  EXTRACT_REASONING: true,
  INCLUDE_COUNTERARGUMENTS: true,
  INCLUDE_QUALITY_WEIGHTING: true,
} as const;

// ============================================================================
// Rating Ranges
// ============================================================================

export const RATING_RANGES = {
  MIN: 1,
  MAX: 5,
} as const;

// ============================================================================
// Credibility Score Ranges
// ============================================================================

export const CREDIBILITY_RANGES = {
  MIN: 0,
  MAX: 1,
} as const;
