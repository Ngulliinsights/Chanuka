/**
 * Argument Intelligence Service
 *
 * Consolidated service for argument intelligence operations using Drizzle ORM.
 * Provides argument storage, claim extraction, evidence management, legislative
 * brief generation, and synthesis job tracking with standardized error handling,
 * strong type safety, and structured logging throughout.
 */

import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';
import {
  argument_relationships,
  argumentTable,
  claims,
  evidence,
} from '@server/infrastructure/schema/argument_intelligence';
import { desc, eq, sql } from 'drizzle-orm';

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class ArgumentNotFoundError extends Error {
  constructor(id: string) {
    super(`Argument not found: ${id}`);
    this.name = 'ArgumentNotFoundError';
  }
}

export class BriefNotFoundError extends Error {
  constructor(id: string) {
    super(`Legislative brief not found: ${id}`);
    this.name = 'BriefNotFoundError';
  }
}

export class JobNotFoundError extends Error {
  constructor(id: string) {
    super(`Synthesis job not found: ${id}`);
    this.name = 'JobNotFoundError';
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ArgumentPosition = 'support' | 'oppose' | 'neutral' | 'conditional';
export type ClaimType = 'factual' | 'normative' | 'causal' | 'predictive';
export type EvidenceType = 'statistical' | 'anecdotal' | 'expert_opinion' | 'legal_precedent' | 'comparative';
export type VerificationStatus = 'verified' | 'unverified' | 'disputed' | 'false';
export type SynthesisJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type SynthesisJobType = 'brief' | 'analysis';

export interface UserContext {
  county?: string;
  ageGroup?: string;
  occupation?: string;
  organizationAffiliation?: string;
}

export interface ArgumentInput {
  bill_id: string;
  text: string;
  position: ArgumentPosition;
  /** 0–1 confidence score */
  confidence: number;
  userContext?: UserContext;
}

export interface ClaimInput {
  text: string;
  type?: ClaimType;
}

export interface EvidenceInput {
  text: string;
  source: string;
  /** Initial credibility override (0–1). Defaults to 0.5. */
  credibilityScore?: number;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// ---- Synthesis / Brief shapes -----------------------------------------------

export interface SynthesizedClaim {
  claimText: string;
  supportingComments: number;
  opposingComments: number;
  evidenceStrength: number;
  stakeholderGroups: string[];
  representativeQuotes: string[];
}

export interface EvidenceAssessment {
  evidenceType: EvidenceType;
  source: string;
  verificationStatus: VerificationStatus;
  credibilityScore: number;
  citationCount: number;
}

export interface StakeholderPosition {
  stakeholderGroup: string;
  position: ArgumentPosition;
  keyArguments: string[];
  evidenceProvided: string[];
  participantCount: number;
}

export interface BillArgumentSynthesis {
  bill_id: string;
  majorClaims: SynthesizedClaim[];
  evidenceBase: EvidenceAssessment[];
  stakeholderPositions: StakeholderPosition[];
  consensusAreas: string[];
  controversialPoints: string[];
  legislativeBrief: string;
  lastUpdated: Date;
}

export interface StoredBrief {
  id: string;
  bill_id: string;
  briefType: string;
  targetAudience: string;
  executiveSummary: string;
  keyFindings: string;
  stakeholderAnalysis: string;
  evidenceAssessment: string;
  recommendationsSection: string;
  appendices: string;
  metadata: string;
  generatedAt: Date;
  updated_at: Date;
}

export interface SynthesisJob {
  id: string;
  bill_id: string;
  job_type: SynthesisJobType;
  status: SynthesisJobStatus;
  result?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// INTERNAL UTILITIES
// ============================================================================

/**
 * Wraps an async operation with consistent structured error logging and
 * re-throws the original error so callers can handle it appropriately.
 */
async function withErrorHandling<T>(
  context: Record<string, unknown>,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const opContext = { ...context, operation };
  logger.debug(opContext, `Starting ${operation}`);
  try {
    const result = await fn();
    return result;
  } catch (error) {
    logger.error(
      {
        ...opContext,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      `Failed: ${operation}`
    );
    throw error;
  }
}

/** Clamp a number to [0, 1]. */
function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Truncate a string to a maximum byte-safe length. */
function truncate(text: string, maxLength = 200): string {
  return text.length > maxLength ? text.substring(0, maxLength) : text;
}

/** Serialize a value to a JSON string safely. */
function toJson(value: unknown): string {
  return JSON.stringify(value);
}

// ============================================================================
// IN-MEMORY STORES
//
// These are intentionally thin wrappers around Maps.  When the schema is
// extended to include `legislative_briefs` and `synthesis_jobs` tables,
// replace the Map operations with Drizzle inserts/selects without touching
// the public method signatures.
// ============================================================================

class InMemoryStore<T extends { id: string }> {
  private readonly store = new Map<string, T>();

  set(record: T): T {
    this.store.set(record.id, record);
    return record;
  }

  get(id: string): T | null {
    return this.store.get(id) ?? null;
  }

  filter(predicate: (record: T) => boolean): T[] {
    return [...this.store.values()].filter(predicate);
  }

  update(id: string, patch: Partial<Omit<T, 'id'>>): T | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch } as T;
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  size(): number {
    return this.store.size;
  }
}

// ============================================================================
// ARGUMENT INTELLIGENCE SERVICE
// ============================================================================

/**
 * Core service for argument processing, claim extraction, evidence validation,
 * legislative brief generation, and synthesis job lifecycle management.
 */
export class ArgumentIntelligenceService {
  private readonly logCtx = { component: 'ArgumentIntelligenceService' };

  // Replace these with DB-backed repositories once schema is extended.
  private readonly briefs = new InMemoryStore<StoredBrief>();
  private readonly jobs = new InMemoryStore<SynthesisJob>();

  // ============================================================================
  // ARGUMENT OPERATIONS
  // ============================================================================

  /**
   * Persist a single processed argument.
   * Confidence is clamped to [0, 1] before storage.
   */
  async storeArgument(input: ArgumentInput) {
    return withErrorHandling(this.logCtx, 'storeArgument', async () => {
      const now = new Date();
      const confidence = clampScore(input.confidence);

      const [stored] = await writeDatabase
        .insert(argumentTable)
        .values({
          id: crypto.randomUUID(),
          bill_id: input.bill_id,
          argument_text: input.text,
          argument_summary: truncate(input.text),
          position: input.position,
          strength_score: confidence.toString(),
          confidence_score: confidence.toString(),
          extraction_method: 'automated',
          support_count: 0,
          opposition_count: 0,
          citizen_endorsements: 0,
          is_verified: false,
          created_at: now,
          updated_at: now,
        })
        .returning();

      logger.info({ ...this.logCtx, argumentId: stored.id }, 'Argument stored');
      return stored;
    });
  }

  /**
   * Bulk-insert multiple arguments in a single DB round-trip.
   * Returns all inserted rows in insertion order.
   */
  async bulkStoreArguments(inputs: ArgumentInput[]) {
    return withErrorHandling(this.logCtx, 'bulkStoreArguments', async () => {
      if (inputs.length === 0) return [];

      const now = new Date();
      const rows = inputs.map((input) => {
        const confidence = clampScore(input.confidence);
        return {
          id: crypto.randomUUID(),
          bill_id: input.bill_id,
          argument_text: input.text,
          argument_summary: truncate(input.text),
          position: input.position,
          strength_score: confidence.toString(),
          confidence_score: confidence.toString(),
          extraction_method: 'automated',
          support_count: 0,
          opposition_count: 0,
          citizen_endorsements: 0,
          is_verified: false,
          created_at: now,
          updated_at: now,
        };
      });

      const stored = await writeDatabase
        .insert(argumentTable)
        .values(rows)
        .returning();

      logger.info(
        { ...this.logCtx, count: stored.length },
        'Bulk arguments stored'
      );
      return stored;
    });
  }

  /**
   * Retrieve arguments for a bill, newest first.
   * Supports cursor-based pagination via limit/offset.
   */
  async getArgumentsForBill(
    billId: string,
    { limit = 100, offset = 0 }: PaginationOptions = {}
  ) {
    return withErrorHandling(
      { ...this.logCtx, billId },
      'getArgumentsForBill',
      async () => {
        const args = await readDatabase
          .select()
          .from(argumentTable)
          .where(eq(argumentTable.bill_id, billId))
          .orderBy(desc(argumentTable.created_at))
          .limit(limit)
          .offset(offset);

        logger.info(
          { ...this.logCtx, billId, count: args.length },
          'Arguments retrieved'
        );
        return args;
      }
    );
  }

  /**
   * Retrieve all relationship edges originating from a given argument.
   */
  async getArgumentRelationships(argumentId: string) {
    return withErrorHandling(
      { ...this.logCtx, argumentId },
      'getArgumentRelationships',
      async () => {
        const relationships = await readDatabase
          .select()
          .from(argument_relationships)
          .where(
            eq(argument_relationships.source_argument_id, argumentId)
          );

        logger.info(
          { ...this.logCtx, argumentId, count: relationships.length },
          'Argument relationships retrieved'
        );
        return relationships;
      }
    );
  }

  // ============================================================================
  // CLAIM OPERATIONS
  // ============================================================================

  /**
   * Extract, classify, and persist claims derived from a source argument.
   * Supports an optional per-claim type; defaults to 'factual'.
   */
  async extractClaims(argumentId: string, claimInputs: ClaimInput[]) {
    return withErrorHandling(
      { ...this.logCtx, argumentId },
      'extractClaims',
      async () => {
        if (claimInputs.length === 0) return [];

        const now = new Date();
        const rows = claimInputs.map(({ text, type = 'factual' }) => ({
          id: crypto.randomUUID(),
          claim_text: text,
          claim_summary: truncate(text),
          claim_type: type,
          verification_status: 'unverified' as VerificationStatus,
          supporting_arguments: toJson([argumentId]),
          support_count: 0,
          citation_count: 0,
          created_at: now,
          updated_at: now,
        }));

        const stored = await writeDatabase
          .insert(claims)
          .values(rows)
          .returning();

        logger.info(
          { ...this.logCtx, argumentId, count: stored.length },
          'Claims extracted and stored'
        );
        return stored;
      }
    );
  }

  /**
   * Find all claims whose `supporting_arguments` JSONB array contains the
   * given argumentId.  Uses a native PostgreSQL JSONB containment operator
   * for index-friendly lookups.
   */
  async getSupportingClaims(argumentId: string) {
    return withErrorHandling(
      { ...this.logCtx, argumentId },
      'getSupportingClaims',
      async () => {
        const relatedClaims = await readDatabase
          .select()
          .from(claims)
          .where(
            sql`${claims.supporting_arguments} @> ${toJson([argumentId])}::jsonb`
          );

        logger.info(
          { ...this.logCtx, argumentId, count: relatedClaims.length },
          'Supporting claims retrieved'
        );
        return relatedClaims;
      }
    );
  }

  // ============================================================================
  // EVIDENCE OPERATIONS
  // ============================================================================

  /**
   * Store evidence items linked to a source argument.
   * Credibility score is clamped to [0, 1]; defaults to 0.5 when omitted.
   */
  async storeEvidence(argumentId: string, evidenceItems: EvidenceInput[]) {
    return withErrorHandling(
      { ...this.logCtx, argumentId },
      'storeEvidence',
      async () => {
        if (evidenceItems.length === 0) return [];

        const now = new Date();
        const rows = evidenceItems.map(
          ({ text, source, credibilityScore = 0.5 }) => ({
            id: crypto.randomUUID(),
            source_argument_id: argumentId,
            evidence_type: 'document',
            title: truncate(text),
            description: text,
            source_url: source,
            credibility_score: clampScore(credibilityScore).toString(),
            citation_count: 0,
            created_at: now,
            updated_at: now,
          })
        );

        const stored = await writeDatabase
          .insert(evidence)
          .values(rows)
          .returning();

        logger.info(
          { ...this.logCtx, argumentId, count: stored.length },
          'Evidence stored'
        );
        return stored;
      }
    );
  }

  /**
   * Retrieve evidence items for a bill that meet a minimum credibility
   * threshold. Filters evidence that supports arguments for the given bill.
   *
   * @param billId       - Target bill.
   * @param minCredibility - Minimum credibility (0–1). Defaults to 0.8.
   * @param options      - Pagination options.
   */
  async getVerifiedEvidence(
    billId: string,
    minCredibility = 0.8,
    { limit = 50, offset = 0 }: PaginationOptions = {}
  ) {
    return withErrorHandling(
      { ...this.logCtx, billId, minCredibility },
      'getVerifiedEvidence',
      async () => {
        // Query evidence with credibility above threshold that supports arguments for this bill
        // Note: We filter evidence.supports_arguments using PostgreSQL's array contains operator (@>)
        const query = readDatabase
          .select()
          .from(evidence)
          .innerJoin(
            argumentTable,
            sql`${evidence.supports_arguments} @> ARRAY[${argumentTable.id}]::uuid[]`
          )
          .where(
            sql`${argumentTable.bill_id} = ${billId} AND CAST(${evidence.credibility_score} AS NUMERIC) >= ${minCredibility}`
          )
          .orderBy(desc(evidence.credibility_score))
          .limit(limit)
          .offset(offset);

        const results = await query;
        const evidenceRows = results.map((row: { evidence: typeof evidence.$inferSelect }) => row.evidence);

        logger.info(
          { ...this.logCtx, billId, count: evidenceRows.length },
          'Verified evidence retrieved'
        );
        return evidenceRows;
      }
    );
  }

  // ============================================================================
  // LEGISLATIVE BRIEF OPERATIONS
  // ============================================================================

  /**
   * Build and persist a legislative brief from a bill synthesis.
   * Truncates the executive summary to 500 characters.
   */
  async generateLegislativeBrief(
    billId: string,
    synthesis: BillArgumentSynthesis
  ): Promise<StoredBrief> {
    return withErrorHandling(
      { ...this.logCtx, billId },
      'generateLegislativeBrief',
      async () => {
        const now = new Date();

        const recommendations = synthesis.controversialPoints.length
          ? `Review contested areas: ${synthesis.controversialPoints.join('; ')}`
          : 'No major contested areas identified.';

        const brief: StoredBrief = {
          id: crypto.randomUUID(),
          bill_id: billId,
          briefType: 'comprehensive',
          targetAudience: 'policymakers',
          executiveSummary: truncate(synthesis.legislativeBrief, 500),
          keyFindings: toJson(synthesis.majorClaims),
          stakeholderAnalysis: toJson(synthesis.stakeholderPositions),
          evidenceAssessment: toJson(synthesis.evidenceBase),
          recommendationsSection: recommendations,
          appendices: toJson({
            consensusAreas: synthesis.consensusAreas,
            lastUpdated: synthesis.lastUpdated,
          }),
          metadata: toJson({
            version: 1,
            generatedBy: 'ArgumentIntelligenceService',
          }),
          generatedAt: now,
          updated_at: now,
        };

        this.briefs.set(brief);

        logger.info(
          { ...this.logCtx, billId, briefId: brief.id },
          'Legislative brief generated'
        );
        return brief;
      }
    );
  }

  /**
   * Retrieve a previously generated legislative brief by its ID.
   * Returns `null` when no brief with that ID exists.
   */
  async getLegislativeBrief(briefId: string): Promise<StoredBrief | null> {
    return withErrorHandling(
      { ...this.logCtx, briefId },
      'getLegislativeBrief',
      async () => {
        const brief = this.briefs.get(briefId);

        if (!brief) {
          logger.warn({ ...this.logCtx, briefId }, 'Brief not found');
        } else {
          logger.info({ ...this.logCtx, briefId }, 'Brief retrieved');
        }

        return brief;
      }
    );
  }

  /**
   * List all briefs generated for a given bill, ordered newest first.
   */
  async getBriefsForBill(billId: string): Promise<StoredBrief[]> {
    return withErrorHandling(
      { ...this.logCtx, billId },
      'getBriefsForBill',
      async () => {
        const results = this.briefs
          .filter((b) => b.bill_id === billId)
          .sort(
            (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()
          );

        logger.info(
          { ...this.logCtx, billId, count: results.length },
          'Briefs listed for bill'
        );
        return results;
      }
    );
  }

  /**
   * Delete a brief by ID.  Returns `true` if the brief existed and was
   * removed, `false` if it was not found.
   */
  async deleteLegislativeBrief(briefId: string): Promise<boolean> {
    return withErrorHandling(
      { ...this.logCtx, briefId },
      'deleteLegislativeBrief',
      async () => {
        const deleted = this.briefs.delete(briefId);
        logger.info(
          { ...this.logCtx, briefId, deleted },
          deleted ? 'Brief deleted' : 'Brief not found for deletion'
        );
        return deleted;
      }
    );
  }

  // ============================================================================
  // SYNTHESIS JOB OPERATIONS
  // ============================================================================

  /**
   * Create a new synthesis job in `pending` state.
   */
  async createSynthesisJob(
    billId: string,
    jobType: SynthesisJobType
  ): Promise<SynthesisJob> {
    return withErrorHandling(
      { ...this.logCtx, billId, jobType },
      'createSynthesisJob',
      async () => {
        const now = new Date();
        const job: SynthesisJob = {
          id: crypto.randomUUID(),
          bill_id: billId,
          job_type: jobType,
          status: 'pending',
          created_at: now,
          updated_at: now,
        };

        this.jobs.set(job);

        logger.info(
          { ...this.logCtx, billId, jobId: job.id },
          'Synthesis job created'
        );
        return job;
      }
    );
  }

  /**
   * Transition a synthesis job to a new status and optionally attach a
   * serialized result payload.  Throws `JobNotFoundError` if the job does
   * not exist so callers are not silently misled.
   */
  async updateSynthesisJobStatus(
    jobId: string,
    status: SynthesisJobStatus,
    result?: string
  ): Promise<SynthesisJob> {
    return withErrorHandling(
      { ...this.logCtx, jobId, status },
      'updateSynthesisJobStatus',
      async () => {
        const patch: Partial<SynthesisJob> = {
          status,
          updated_at: new Date(),
          ...(result !== undefined ? { result } : {}),
        };

        const updated = this.jobs.update(jobId, patch);
        if (!updated) throw new JobNotFoundError(jobId);

        logger.info(
          { ...this.logCtx, jobId, status },
          'Synthesis job status updated'
        );
        return updated;
      }
    );
  }

  /**
   * Retrieve a synthesis job by ID.  Returns `null` if not found.
   */
  async getSynthesisJob(jobId: string): Promise<SynthesisJob | null> {
    return withErrorHandling(
      { ...this.logCtx, jobId },
      'getSynthesisJob',
      async () => {
        const job = this.jobs.get(jobId);

        if (!job) {
          logger.warn({ ...this.logCtx, jobId }, 'Synthesis job not found');
        }

        return job;
      }
    );
  }

  /**
   * List all jobs for a bill, optionally filtered by status.
   */
  async getSynthesisJobsForBill(
    billId: string,
    statusFilter?: SynthesisJobStatus
  ): Promise<SynthesisJob[]> {
    return withErrorHandling(
      { ...this.logCtx, billId, statusFilter },
      'getSynthesisJobsForBill',
      async () => {
        const results = this.jobs.filter(
          (j) =>
            j.bill_id === billId &&
            (statusFilter === undefined || j.status === statusFilter)
        );

        logger.info(
          { ...this.logCtx, billId, count: results.length },
          'Synthesis jobs retrieved for bill'
        );
        return results;
      }
    );
  }

  /**
   * Permanently remove a synthesis job by ID.
   */
  async deleteSynthesisJob(jobId: string): Promise<boolean> {
    return withErrorHandling(
      { ...this.logCtx, jobId },
      'deleteSynthesisJob',
      async () => {
        const deleted = this.jobs.delete(jobId);
        logger.info(
          { ...this.logCtx, jobId, deleted },
          deleted ? 'Job deleted' : 'Job not found for deletion'
        );
        return deleted;
      }
    );
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const argumentIntelligenceService = new ArgumentIntelligenceService();