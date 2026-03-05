/**
 * Electoral Accountability Constants
 * 
 * Centralized configuration for gap calculation thresholds and risk factors
 */

// ============================================================================
// GAP SEVERITY THRESHOLDS
// ============================================================================

export const GAP_SEVERITY_THRESHOLDS = {
  CRITICAL: 75,
  HIGH: 50,
  MEDIUM: 25,
  LOW: 0,
} as const;

export const GAP_SEVERITY_LABELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

// ============================================================================
// ELECTORAL RISK FACTORS
// ============================================================================

export const ELECTORAL_RISK_MULTIPLIERS = {
  FINAL_YEAR: 1.5,        // Within 365 days of election
  SECOND_YEAR: 1.25,      // Within 730 days of election
  HIGH_CONFIDENCE: 1.2,   // Sample size > 500
  LOW_CONFIDENCE: 0.7,    // Sample size < 50
} as const;

export const ELECTORAL_RISK_THRESHOLDS = {
  FINAL_YEAR_DAYS: 365,
  SECOND_YEAR_DAYS: 730,
  HIGH_CONFIDENCE_SAMPLE: 500,
  LOW_CONFIDENCE_SAMPLE: 50,
} as const;

// ============================================================================
// VOTE SCORING
// ============================================================================

export const VOTE_SCORES = {
  YES: 100,
  NO: 0,
  ABSTAIN: 50,
  ABSENT: 50,
} as const;

// ============================================================================
// SENTIMENT THRESHOLDS
// ============================================================================

export const SENTIMENT_THRESHOLDS = {
  SUPPORT: 20,      // > 20 = support
  OPPOSE: -20,      // < -20 = oppose
  NEUTRAL_MIN: -20, // Between -20 and 20 = neutral
  NEUTRAL_MAX: 20,
} as const;

export const SENTIMENT_POSITIONS = {
  SUPPORT: 'support',
  OPPOSE: 'oppose',
  NEUTRAL: 'neutral',
} as const;

// ============================================================================
// MISALIGNMENT THRESHOLD
// ============================================================================

export const MISALIGNMENT_THRESHOLD = 40; // Gap > 40 = misaligned

// ============================================================================
// VALIDATION RANGES
// ============================================================================

export const VALIDATION_RANGES = {
  SENTIMENT_SCORE: { MIN: -100, MAX: 100 },
  ALIGNMENT_GAP: { MIN: 0, MAX: 100 },
  ELECTORAL_RISK: { MIN: 0, MAX: 100 },
  CONFIDENCE_LEVEL: { MIN: 0, MAX: 100 },
} as const;

// ============================================================================
// ALLOWED VALUES
// ============================================================================

export const ALLOWED_VOTES = ['yes', 'no', 'abstain', 'absent'] as const;
export type AllowedVote = typeof ALLOWED_VOTES[number];

export const ALLOWED_GAP_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type AllowedGapSeverity = typeof ALLOWED_GAP_SEVERITIES[number];

export const ALLOWED_CAMPAIGN_STATUSES = ['active', 'successful', 'failed', 'closed'] as const;
export type AllowedCampaignStatus = typeof ALLOWED_CAMPAIGN_STATUSES[number];

export const ALLOWED_EXPORT_TYPES = ['mp_scorecard', 'constituency_report', 'campaign_data'] as const;
export type AllowedExportType = typeof ALLOWED_EXPORT_TYPES[number];

export const ALLOWED_EXPORT_STATUSES = ['pending', 'approved', 'delivered', 'rejected'] as const;
export type AllowedExportStatus = typeof ALLOWED_EXPORT_STATUSES[number];

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export const CACHE_TTL = {
  MP_SCORECARD: 3600,        // 1 hour
  CRITICAL_GAPS: 1800,       // 30 minutes
  VOTING_RECORD: 7200,       // 2 hours
  CONSTITUENCY_SENTIMENT: 1800, // 30 minutes
} as const;

export const CACHE_TAGS = {
  ELECTORAL_ACCOUNTABILITY: 'electoral-accountability',
  VOTING_RECORDS: 'voting-records',
  GAP_ANALYSIS: 'gap-analysis',
  CAMPAIGNS: 'campaigns',
  SCORECARDS: 'scorecards',
} as const;

// ============================================================================
// QUERY LIMITS
// ============================================================================

export const QUERY_LIMITS = {
  CRITICAL_GAPS_DEFAULT: 50,
  CRITICAL_GAPS_MAX: 100,
  VOTING_RECORDS_DEFAULT: 100,
  VOTING_RECORDS_MAX: 500,
} as const;

// ============================================================================
// SAMPLE SIZE REQUIREMENTS
// ============================================================================

export const SAMPLE_SIZE_REQUIREMENTS = {
  MINIMUM_ADEQUATE: 30,
  RECOMMENDED: 100,
  HIGH_CONFIDENCE: 500,
} as const;
