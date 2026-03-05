/**
 * Electoral Accountability Validation
 * 
 * Centralized validation logic for electoral accountability data
 */

import { z } from 'zod';
import {
  ALLOWED_VOTES,
  ALLOWED_GAP_SEVERITIES,
  ALLOWED_CAMPAIGN_STATUSES,
  ALLOWED_EXPORT_TYPES,
  ALLOWED_EXPORT_STATUSES,
  VALIDATION_RANGES,
} from './electoral-accountability.constants';
import {
  InvalidVoteError,
  InvalidSentimentScoreError,
  InvalidDateRangeError,
  ValidationError,
} from './electoral-accountability.errors';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const voteSchema = z.enum(ALLOWED_VOTES);
export const gapSeveritySchema = z.enum(ALLOWED_GAP_SEVERITIES);
export const campaignStatusSchema = z.enum(ALLOWED_CAMPAIGN_STATUSES);
export const exportTypeSchema = z.enum(ALLOWED_EXPORT_TYPES);
export const exportStatusSchema = z.enum(ALLOWED_EXPORT_STATUSES);

export const sentimentScoreSchema = z
  .number()
  .min(VALIDATION_RANGES.SENTIMENT_SCORE.MIN)
  .max(VALIDATION_RANGES.SENTIMENT_SCORE.MAX);

export const alignmentGapSchema = z
  .number()
  .min(VALIDATION_RANGES.ALIGNMENT_GAP.MIN)
  .max(VALIDATION_RANGES.ALIGNMENT_GAP.MAX);

export const electoralRiskSchema = z
  .number()
  .min(VALIDATION_RANGES.ELECTORAL_RISK.MIN)
  .max(VALIDATION_RANGES.ELECTORAL_RISK.MAX);

export const confidenceLevelSchema = z
  .number()
  .min(VALIDATION_RANGES.CONFIDENCE_LEVEL.MIN)
  .max(VALIDATION_RANGES.CONFIDENCE_LEVEL.MAX);

// ============================================================================
// VOTING RECORD VALIDATION
// ============================================================================

export const votingRecordImportSchema = z.object({
  billId: z.string().uuid('Invalid bill ID format'),
  sponsorId: z.string().uuid('Invalid sponsor ID format'),
  vote: voteSchema,
  voteDate: z.coerce.date(),
  chamber: z.enum(['national_assembly', 'senate', 'county_assembly', 'both']),
  readingStage: z.string().optional(),
  county: z.string().min(1, 'County is required'),
  constituency: z.string().min(1, 'Constituency is required'),
  ward: z.string().optional(),
  sessionNumber: z.string().optional(),
  hansardReference: z.string().optional(),
  videoTimestamp: z.string().optional(),
  sourceUrl: z.string().url('Invalid source URL').optional(),
});

export type VotingRecordImportData = z.infer<typeof votingRecordImportSchema>;

// ============================================================================
// SENTIMENT VALIDATION
// ============================================================================

export const constituencySentimentSchema = z.object({
  billId: z.string().uuid(),
  county: z.string().min(1),
  constituency: z.string().min(1),
  ward: z.string().optional(),
  supportCount: z.number().int().min(0),
  opposeCount: z.number().int().min(0),
  neutralCount: z.number().int().min(0),
  sentimentScore: sentimentScoreSchema.optional(),
  confidenceLevel: confidenceLevelSchema.optional(),
});

// ============================================================================
// GAP ANALYSIS VALIDATION
// ============================================================================

export const gapAnalysisSchema = z.object({
  votingRecordId: z.string().uuid(),
  sentimentId: z.string().uuid(),
  alignmentGap: alignmentGapSchema,
  gapSeverity: gapSeveritySchema,
  electoralRiskScore: electoralRiskSchema,
});

// ============================================================================
// CAMPAIGN VALIDATION
// ============================================================================

export const pressureCampaignSchema = z.object({
  campaignName: z.string().min(3).max(255),
  description: z.string().min(10),
  targetSponsorId: z.string().uuid(),
  targetConstituency: z.string().min(1),
  targetCounty: z.string().min(1),
  triggeredByBillId: z.string().uuid().optional(),
  triggeredByGapId: z.string().uuid().optional(),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate vote value
 */
export function validateVote(vote: string): asserts vote is typeof ALLOWED_VOTES[number] {
  if (!ALLOWED_VOTES.includes(vote as any)) {
    throw new InvalidVoteError(vote, ALLOWED_VOTES);
  }
}

/**
 * Validate sentiment score range
 */
export function validateSentimentScore(score: number): void {
  const { MIN, MAX } = VALIDATION_RANGES.SENTIMENT_SCORE;
  if (score < MIN || score > MAX) {
    throw new InvalidSentimentScoreError(score, MIN, MAX);
  }
}

/**
 * Validate alignment gap range
 */
export function validateAlignmentGap(gap: number): void {
  const { MIN, MAX } = VALIDATION_RANGES.ALIGNMENT_GAP;
  if (gap < MIN || gap > MAX) {
    throw new ValidationError(
      `Alignment gap ${gap} is out of range. Must be between ${MIN} and ${MAX}`,
      { gap, min: MIN, max: MAX }
    );
  }
}

/**
 * Validate electoral risk range
 */
export function validateElectoralRisk(risk: number): void {
  const { MIN, MAX } = VALIDATION_RANGES.ELECTORAL_RISK;
  if (risk < MIN || risk > MAX) {
    throw new ValidationError(
      `Electoral risk ${risk} is out of range. Must be between ${MIN} and ${MAX}`,
      { risk, min: MIN, max: MAX }
    );
  }
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date, endDate: Date): void {
  if (startDate > endDate) {
    throw new InvalidDateRangeError(startDate, endDate);
  }
}

/**
 * Validate constituency name format
 */
export function validateConstituency(constituency: string): void {
  if (!constituency || constituency.trim().length === 0) {
    throw new ValidationError('Constituency name cannot be empty');
  }

  if (constituency.length > 100) {
    throw new ValidationError('Constituency name is too long (max 100 characters)', {
      constituency,
      length: constituency.length,
    });
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string, fieldName: string = 'ID'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`, { id, fieldName });
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Validate and sanitize constituency name
 */
export function sanitizeConstituency(constituency: string): string {
  const sanitized = sanitizeString(constituency);
  validateConstituency(sanitized);
  return sanitized;
}
