/**
 * ARGUMENT VALIDATION SCHEMAS — FINAL DRAFT
 *
 * Design principles:
 *  - DRY: shared primitives for repeated patterns (IDs, unit intervals, scores)
 *  - Safe: cross-field refinements where field relationships carry invariants
 *  - Branded ID types prevent accidental ID mix-ups at compile time
 *  - All parse helpers return typed results; no `any` escapes
 */

// Import z through the project's shared validation layer.
// @shared/validation re-exports z and exposes pre-validated primitives (uuidSchema, etc.).
import { z } from '@shared/validation';

// ============================================================================
// PRIMITIVES & BRANDED TYPES
// ============================================================================

/** Opaque branded string type — prevents swapping BillId for UserId, etc. */
function brandedId<T extends string>(brand: T) {
  return z
    .string()
    .min(1, `${brand} must not be empty`)
    .brand<T>();
}

export const BillIdSchema     = brandedId('BillId');
export const UserIdSchema     = brandedId('UserId');
export const ArgumentIdSchema = brandedId('ArgumentId');
export const ClaimIdSchema    = brandedId('ClaimId');
export const EvidenceIdSchema = brandedId('EvidenceId');
export const BriefIdSchema    = brandedId('BriefId');

export type BillId     = z.infer<typeof BillIdSchema>;
export type UserId     = z.infer<typeof UserIdSchema>;
export type ArgumentId = z.infer<typeof ArgumentIdSchema>;
export type ClaimId    = z.infer<typeof ClaimIdSchema>;
export type EvidenceId = z.infer<typeof EvidenceIdSchema>;
export type BriefId    = z.infer<typeof BriefIdSchema>;

/**
 * Returns a trimming string schema with optional length constraints applied
 * BEFORE `.transform()`. This is required because `.transform()` returns
 * `ZodEffects`, which does not expose `.min()` / `.max()` — so constraints
 * must be declared on the underlying `ZodString` first.
 */
function trimmedStr(
  min?: number,
  max?: number,
  msgs?: { min?: string; max?: string },
): z.ZodEffects<z.ZodString, string, string> {
  let s = z.string();
  if (min !== undefined) s = s.min(min, msgs?.min);
  if (max !== undefined) s = s.max(max, msgs?.max);
  return s.transform((v: string) => v.trim());
}

/** Fraction in [0, 1] — used for all scores and confidence values. */
const unitInterval = z
  .number()
  .min(0, 'Score must be ≥ 0')
  .max(1, 'Score must be ≤ 1');

// ============================================================================
// SHARED DOMAIN SCHEMAS
// ============================================================================

export const PositionSchema = z
  .enum(['support', 'oppose', 'neutral', 'conditional'])
  .describe('Argument position on the legislative issue');

export const ArgumentStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'published',
  'archived',
  'removed',
]);

/** Credibility / quality score in [0, 1]. */
export const CredibilityScoreSchema = unitInterval.describe(
  'Score from 0 (lowest) to 1 (highest)'
);

/** Classifier confidence in [0, 1]. */
export const ConfidenceSchema = unitInterval.describe('Classifier confidence score');

// ============================================================================
// ARGUMENT INPUT
// ============================================================================

const CitationSchema = z
  .object({
    text: trimmedStr(1, undefined, { min: 'Citation text must not be blank' }),
    line_number: z.number().int().min(0).optional(),
  })
  .strict();

export const ArgumentInputSchema = z
  .object({
    bill_id:          BillIdSchema,
    user_id:          UserIdSchema,
    text:             trimmedStr(10, 5000, {
                        min: 'Argument must be at least 10 characters',
                        max: 'Argument must not exceed 5 000 characters',
                      }),
    position:         PositionSchema,
    confidence:       ConfidenceSchema.default(0.8),
    supporting_text:  trimmedStr().optional(),
    citations:        z.array(CitationSchema).default([]),
  })
  .strict();

export type ArgumentInput = z.infer<typeof ArgumentInputSchema>;

/** Partial schema for PATCH-style updates. */
export const ArgumentUpdateSchema = ArgumentInputSchema
  .omit({ bill_id: true, user_id: true })
  .partial();

export type ArgumentUpdate = z.infer<typeof ArgumentUpdateSchema>;

// ============================================================================
// CLAIM
// ============================================================================

export const ClaimSchema = z
  .object({
    id:           ClaimIdSchema,
    argument_id:  ArgumentIdSchema,
    text:         trimmedStr(5, 1000, {
                    min: 'Claim must be at least 5 characters',
                    max: 'Claim must not exceed 1 000 characters',
                  }),
    claim_type:   z.enum(['factual', 'value', 'causal', 'predictive', 'prescriptive']),
    confidence:   ConfidenceSchema,
    evidence_ids: z.array(EvidenceIdSchema).default([]),
  })
  .strict();

export type Claim = z.infer<typeof ClaimSchema>;

// ============================================================================
// EVIDENCE
// ============================================================================

const QuotePositionSchema = z
  .object({
    start_char: z.number().int().min(0),
    end_char:   z.number().int().min(0),
  })
  .refine(
    ({ start_char, end_char }: { start_char: number; end_char: number }) => end_char > start_char,
    { message: 'end_char must be greater than start_char', path: ['end_char'] }
  );

export const EvidenceSchema = z
  .object({
    id:                    EvidenceIdSchema,
    claim_id:              ClaimIdSchema,
    text:                  trimmedStr(10, 2000, {
                             min: 'Evidence text must be at least 10 characters',
                             max: 'Evidence text must not exceed 2 000 characters',
                           }),
    source_url:            z.string().url('source_url must be a valid URL').optional(),
    quote_position:        QuotePositionSchema.optional(),
    credibility_score:     CredibilityScoreSchema,
    methodology_soundness: CredibilityScoreSchema,
    recency_score:         CredibilityScoreSchema,
    is_verified:           z.boolean().default(false),
    fact_check_status:     z
                             .enum(['verified', 'disputed', 'unverified', 'retracted'])
                             .default('unverified'),
    created_at:            z.date(),
  })
  .strict()
  .refine(
    ({ is_verified, fact_check_status }: { is_verified: boolean; fact_check_status: string }) =>
      !is_verified || fact_check_status === 'verified',
    {
      message: 'is_verified can only be true when fact_check_status is "verified"',
      path: ['is_verified'],
    }
  );

export type Evidence = z.infer<typeof EvidenceSchema>;

// ============================================================================
// COMPARISON
// ============================================================================

export const CompareArgumentsSchema = z
  .object({
    argument_ids:          z
                             .array(ArgumentIdSchema)
                             .min(2,  'At least 2 arguments are required for comparison')
                             .max(10, 'Maximum 10 arguments can be compared'),
    comparison_type:       z.enum([
                             'semantic_similarity',
                             'position_alignment',
                             'evidence_quality',
                             'stakeholder_overlap',
                           ]),
    include_relationships: z.boolean().default(true),
  })
  .strict();

export type CompareArguments = z.infer<typeof CompareArgumentsSchema>;

// ============================================================================
// CLUSTERING
// ============================================================================

const ClusteringConfigSchema = z
  .object({
    similarity_threshold:   unitInterval.default(0.7),
    min_cluster_size:       z.number().int().min(1).default(3),
    max_clusters:           z.number().int().min(1).default(50),
    use_semantic_similarity: z.boolean().default(true),
  })
  .partial();

export const ClusterArgumentsSchema = z
  .object({
    arguments: z.array(ArgumentInputSchema).min(1, 'At least one argument is required'),
    config:    ClusteringConfigSchema.default({}),
  })
  .strict();

export type ClusterArguments = z.infer<typeof ClusterArgumentsSchema>;

// ============================================================================
// STAKEHOLDER & DIVERSITY
// ============================================================================

export const StakeholderDemographicsSchema = z
  .object({
    user_id:                  UserIdSchema,
    county:                   trimmedStr().optional(),
    age_group:                z
                                .enum(['18-25', '26-35', '36-45', '46-55', '56-65', '65+', 'unknown'])
                                .optional(),
    occupation:               trimmedStr().optional(),
    organization_affiliation: trimmedStr().optional(),
    contribution_type:        z.enum([
                                'testimony',
                                'written_comment',
                                'survey_response',
                                'meeting_attendance',
                              ]),
  })
  .strict();

export type StakeholderDemographics = z.infer<typeof StakeholderDemographicsSchema>;

/** Threshold in (0, 0.5] — a minority group cannot be the majority. */
const MinorityThresholdSchema = z
  .number()
  .min(0.01, 'minority_threshold must be > 0')
  .max(0.5,  'minority_threshold must be ≤ 0.5');

export const DiversityAnalysisSchema = z
  .object({
    bill_id:               BillIdSchema,
    include_geographic:    z.boolean().default(true),
    include_demographic:   z.boolean().default(true),
    include_organizational: z.boolean().default(true),
    minority_threshold:    MinorityThresholdSchema.default(0.1),
  })
  .strict();

export type DiversityAnalysis = z.infer<typeof DiversityAnalysisSchema>;

// ============================================================================
// SYNTHESIS
// ============================================================================

export const SynthesisInputSchema = z
  .object({
    bill_id:                  BillIdSchema,
    argument_ids:             z
                                .array(ArgumentIdSchema)
                                .min(5, 'Synthesis requires at least 5 arguments'),
    include_equity_analysis:  z.boolean().default(true),
    include_minority_voices:  z.boolean().default(true),
    summary_length:           z.enum(['brief', 'standard', 'comprehensive']).default('standard'),
  })
  .strict();

export type SynthesisInput = z.infer<typeof SynthesisInputSchema>;

// ============================================================================
// LEGISLATIVE BRIEF
// ============================================================================

export const LegislativeBriefSchema = z
  .object({
    id:                         BriefIdSchema,
    bill_id:                    BillIdSchema,
    title:                      trimmedStr(5,  200),
    summary:                    trimmedStr(50, 5000),
    key_arguments_support:      z.array(z.string()),
    key_arguments_oppose:       z.array(z.string()),
    minority_perspectives:      z.array(z.string()).default([]),
    recommendations:            z.array(z.string()).default([]),
    evidence_quality_score:     CredibilityScoreSchema,
    stakeholder_diversity_score: CredibilityScoreSchema,
    geographic_diversity_score: CredibilityScoreSchema,
    demographic_diversity_score: CredibilityScoreSchema,
    created_at:                 z.date(),
    updated_at:                 z.date(),
  })
  .strict()
  .refine(
    (val: { created_at: Date; updated_at: Date }) => val.updated_at >= val.created_at,
    { message: 'updated_at must be on or after created_at', path: ['updated_at'] }
  );

export type LegislativeBrief = z.infer<typeof LegislativeBriefSchema>;

// ============================================================================
// POWER BALANCING
// ============================================================================

export const PowerBalancingConfigSchema = z
  .object({
    bill_id:               BillIdSchema,
    minority_threshold:    MinorityThresholdSchema.default(0.1),
    amplification_factor:  z
                             .number()
                             .min(1,  'amplification_factor must be ≥ 1 (no suppression)')
                             .max(10, 'amplification_factor must be ≤ 10')
                             .default(1.5),
    detect_coordination:   z.boolean().default(true),
    coordination_threshold: unitInterval.default(0.8),
  })
  .strict();

export type PowerBalancingConfig = z.infer<typeof PowerBalancingConfigSchema>;

// ============================================================================
// PARSE UTILITIES
// ============================================================================

export type ParseSuccess<T> = { success: true;  data: T };
export type ParseFailure     = { success: false; errors: z.ZodError };
export type ParseResult<T>   = ParseSuccess<T> | ParseFailure;

/**
 * Attempts to parse `data` against `schema`.
 * Returns a discriminated-union result — never throws.
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data);
  return result.success
    ? { success: true,  data: result.data }
    : { success: false, errors: result.error };
}

/**
 * Formats a ZodError into a flat, human-readable string array —
 * useful for API error responses.
 */
export function formatErrors(error: z.ZodError<unknown>): string[] {
  return error.issues.map(
    (issue: z.ZodIssue) => `${issue.path.join('.') || 'root'}: ${issue.message}`
  );
}

// Convenience parse functions — throw on invalid input.
export const parseArgument         = (d: unknown) => ArgumentInputSchema.parse(d);
export const parseArgumentUpdate   = (d: unknown) => ArgumentUpdateSchema.parse(d);
export const parseCompareArguments = (d: unknown) => CompareArgumentsSchema.parse(d);
export const parseSynthesis        = (d: unknown) => SynthesisInputSchema.parse(d);
export const parsePowerBalancing   = (d: unknown) => PowerBalancingConfigSchema.parse(d);
export const parseEvidence         = (d: unknown) => EvidenceSchema.parse(d);
export const parseClaim            = (d: unknown) => ClaimSchema.parse(d);

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

/** Central registry for programmatic access (e.g. OpenAPI generation). */
export const Schemas = {
  Argument:             ArgumentInputSchema,
  ArgumentUpdate:       ArgumentUpdateSchema,
  Claim:                ClaimSchema,
  Evidence:             EvidenceSchema,
  CompareArguments:     CompareArgumentsSchema,
  ClusterArguments:     ClusterArgumentsSchema,
  StakeholderDemographics: StakeholderDemographicsSchema,
  DiversityAnalysis:    DiversityAnalysisSchema,
  SynthesisInput:       SynthesisInputSchema,
  LegislativeBrief:     LegislativeBriefSchema,
  PowerBalancingConfig: PowerBalancingConfigSchema,
} as const;