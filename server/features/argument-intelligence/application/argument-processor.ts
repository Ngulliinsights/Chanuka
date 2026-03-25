// ============================================================================
// ARGUMENT INTELLIGENCE — Argument Processor
// ============================================================================
// Main orchestration service: processes citizen comments into structured
// arguments, clusters them, balances stakeholder voices, and produces
// legislative briefs.

import { logger } from '@server/infrastructure/observability';

import { ArgumentIntelligenceService } from './argument-intelligence-service';
import type { BriefGenerationResult, SynthesisData } from './brief-generator';
import { BriefGenerator } from './brief-generator';
import { ArgumentCluster, ClusteredArgument, ClusteringService } from './clustering-service';
import { CoalitionFinderService } from './coalition-finder';
import { EvidenceValidator } from './evidence-validator';
import { PowerBalancerService } from './power-balancer';
import type { ExtractedArgument } from './structure-extractor';
import { StructureExtractorService } from './structure-extractor';

// Re-export so callers import from a single entry point.
export type { ExtractedArgument };

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface UserDemographics {
  county?: string;
  ageGroup?: string;
  occupation?: string;
  organizationAffiliation?: string;
}

export interface SubmissionContext {
  submissionMethod: 'web' | 'ussd' | 'ambassador' | 'api'; // cspell:ignore ussd
  timestamp: Date;
  session_id?: string;
}

export interface CommentProcessingRequest {
  comment_id: string;
  bill_id: string;
  commentText: string;
  user_id: string;
  userDemographics?: UserDemographics;
  submissionContext?: SubmissionContext;
}

export interface ProcessingMetrics {
  extractionConfidence: number;
  processingTime: number;
  flaggedForReview: boolean;
}

export interface CoalitionMatch {
  stakeholderGroup: string;
  similarityScore: number;
  sharedConcerns: string[];
  potentialAlliance: boolean;
}

export interface ArgumentProcessingResult {
  comment_id: string;
  bill_id: string;
  extractedArguments: ExtractedArgument[];
  identifiedClaims: string[];
  coalitionPotential: CoalitionMatch[];
  processingMetrics: ProcessingMetrics;
}

// ============================================================================
// PUBLIC TYPES - Define locally as they don't map 1:1 to imports
// ============================================================================

export interface SynthesizedClaim {
  claimText: string;
  supportingComments: number;
  opposingComments: number;
  evidenceStrength: number;
  stakeholderGroups: string[];
  representativeQuotes: string[];
}

export interface EvidenceAssessment {
  evidenceType: 'statistical' | 'anecdotal' | 'expert_opinion' | 'legal_precedent' | 'comparative';
  source: string;
  verificationStatus: 'verified' | 'unverified' | 'disputed' | 'false';
  credibilityScore: number;
  citationCount: number;
}

export interface StakeholderPosition {
  stakeholderGroup: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
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

export interface ArgumentMap {
  claims: SynthesizedClaim[];
  relationships: ArgumentRelationship[];
  stakeholders: StakeholderPosition[];
  evidenceNetwork: EvidenceNetwork;
}

// ============================================================================
// PRIVATE TYPES
// ============================================================================

/** Shape of a DB argument row as returned by ArgumentIntelligenceService. */
interface DbArgument {
  id: string;
  content: string;
  user_id: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  /** Grouped stakeholders / affected groups stored on the DB record. */
  affectedGroups?: string[];
  created_at: Date;
}

/**
 * Storage interface for synthesis results.
 * Assumes ArgumentIntelligenceService has storeBillSynthesis and getBillSynthesis.
 */
interface ArgumentServiceWithSynthesis extends ArgumentIntelligenceService {
  storeBillSynthesis(synthesis: BillArgumentSynthesis): Promise<void>;
  getBillSynthesis(bill_id: string): Promise<BillArgumentSynthesis | null>;
}

/**
 * Extends ArgumentCluster with the typed member list.
 * TODO: verify the actual property name ('members') against clustering-service.ts
 * and update if it differs (e.g. 'items', 'clusterArguments').
 */
type ClusterWithMembers = ArgumentCluster & { members: ClusteredArgument[] };

/** Input shape for ClusteringService — satisfies all ClusteredArgument fields. */
interface ClusterInput extends ClusteredArgument {
  // similarityScore and isRepresentative are required by ClusteredArgument.
  // We supply pre-clustering defaults; the service overwrites them on output.
}

/** Input shape for PowerBalancerService. */
interface BalanceInput {
  id: string;
  text: string;
  user_id: string;
  submissionTime: Date;
}

interface ArgumentRelationship {
  fromClaim: string;
  toClaim: string;
  relationshipType: 'supports' | 'contradicts' | 'refines' | 'depends_on';
  strength: number;
}

interface EvidenceNetwork {
  nodes: { id: string; type: string }[];
  edges: { from: string; to: string; weight: number }[];
}

// ============================================================================
// HELPERS
// ============================================================================

type SimplePosition = 'support' | 'oppose' | 'neutral';

/** Keyword-based position inference used when no structured position is available. */
function inferPositionFromText(text: string): SimplePosition {
  const lower = text.toLowerCase();
  if (lower.includes('support') || lower.includes('agree')) return 'support';
  if (lower.includes('oppose') || lower.includes('disagree')) return 'oppose';
  return 'neutral';
}

/** Maps a DB argument to ClusteredArgument for ClusteringService input. */
function toClusterInput(arg: DbArgument): ClusterInput {
  return {
    id: arg.id,
    text: arg.content,
    normalizedText: arg.content,
    confidence: 0.8,
    user_id: arg.user_id,
    userDemographics: undefined,
    // Pre-clustering defaults — overwritten by the clustering algorithm.
    similarityScore: 1.0,
    isRepresentative: false,
  };
}

/** Maps a DB argument to BalanceInput for PowerBalancerService. */
function toBalanceInput(arg: DbArgument): BalanceInput {
  return {
    id: arg.id,
    text: arg.content,
    user_id: arg.user_id,
    submissionTime: arg.created_at,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export class ArgumentProcessor {
  private readonly synthService: ArgumentServiceWithSynthesis;

  constructor(
    private readonly structureExtractor: StructureExtractorService,
    private readonly clusteringService: ClusteringService,
    private readonly evidenceValidator: EvidenceValidator,
    private readonly coalitionFinder: CoalitionFinderService,
    private readonly briefGenerator: BriefGenerator,
    private readonly powerBalancer: PowerBalancerService,
    argumentService: ArgumentIntelligenceService,
  ) {
    // Cast once here; remove when storeBillSynthesis/getBillSynthesis are added
    // to the official ArgumentIntelligenceService interface.
    this.synthService = argumentService as ArgumentServiceWithSynthesis;
  }

  // --------------------------------------------------------------------------
  // PUBLIC — Single-comment pipeline
  // --------------------------------------------------------------------------

  /**
   * Runs a single citizen comment through the full argument-intelligence
   * pipeline: extraction → deduplication → coalition-finding → storage.
   */
  async processComment(
    request: CommentProcessingRequest,
  ): Promise<ArgumentProcessingResult> {
    const startTime = Date.now();
    const log = this.commentLogger(request.comment_id, request.bill_id);

    log.info('Processing comment for argument extraction');

    try {
      // 1. Extract argumentative structure.
      const extractedArguments = await this.structureExtractor.extractArguments(
        request.commentText,
        {
          bill_id: request.bill_id,
          userContext: request.userDemographics,
          submissionContext: request.submissionContext,
        },
      );

      // 2. Deduplicate claims across the extracted set.
      const identifiedClaims = this.identifyUniqueClaims(extractedArguments);

      // 3. Find potential coalitions.
      const coalitionPotential = await this.coalitionFinder.findPotentialCoalitions(
        extractedArguments,
        request.userDemographics,
      );

      // 4. Persist extracted arguments.
      await this.storeExtractedArguments(request, extractedArguments);

      // 5. Metrics.
      const processingMetrics: ProcessingMetrics = {
        extractionConfidence: this.averageConfidence(extractedArguments),
        processingTime: Date.now() - startTime,
        flaggedForReview: this.shouldFlagForReview(extractedArguments),
      };

      // 6. Asynchronously refresh bill synthesis when high-signal arguments arrive.
      if (this.shouldUpdateBillSynthesis(extractedArguments)) {
        this.scheduleBillSynthesisUpdate(request.bill_id);
      }

      const result: ArgumentProcessingResult = {
        comment_id: request.comment_id,
        bill_id: request.bill_id,
        extractedArguments,
        identifiedClaims,
        coalitionPotential,
        processingMetrics,
      };

      log.info(
        `Comment processed — ${extractedArguments.length} arguments extracted` +
          ` in ${processingMetrics.processingTime} ms`,
      );

      return result;
    } catch (error) {
      log.error('Comment processing failed', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // PUBLIC — Bill-level synthesis
  // --------------------------------------------------------------------------

  /**
   * Aggregates all arguments for a bill into a structured synthesis,
   * balancing stakeholder voices and producing a legislative brief.
   */
  async synthesizeBillArguments(bill_id: string): Promise<BillArgumentSynthesis> {
    const log = this.billLogger(bill_id);
    log.info('Synthesizing arguments for bill');

    try {
      // 1. Fetch all stored arguments for the bill.
      const billArguments = await this.synthService.getArgumentsForBill(
        bill_id,
      ) as DbArgument[];

      // 2. Cluster similar arguments.
      const clusterInputs = billArguments.map(toClusterInput);
      const { clusters } = await this.clusteringService.clusterArguments(clusterInputs);

      // 3. Synthesize major claims from clusters.
      const majorClaims = this.synthesizeClaims(clusters as ClusterWithMembers[]);

      // 4. Collect evidence assessments from validated evidence.
      const evidenceBase = billArguments
        .filter((arg) => arg.created_at)
        .map((arg) => ({
          evidenceType: 'anecdotal' as const,
          source: arg.content.substring(0, 100),
          verificationStatus: 'unverified' as const,
          credibilityScore: 0.5,
          citationCount: 0,
        }));

      // 5. Determine raw stakeholder positions.
      const rawStakeholderPositions = this.identifyStakeholderPositions(billArguments);

      // 6. Apply power balancing so minority voices are not drowned out.
      const balanceInputs = billArguments.map(toBalanceInput);
      const { balancedPositions } = await this.powerBalancer.balanceStakeholderVoices(
        rawStakeholderPositions,
        balanceInputs,
      );

      // 7. Derive consensus and controversy signals.
      const consensusAreas = this.identifyConsensusAreas(majorClaims);
      const controversialPoints = this.identifyControversialPoints(majorClaims);

      // 8. Generate the legislative brief.
      const briefInput: SynthesisData = {
        billId: bill_id,
        arguments: majorClaims.map((claim) => ({
          id: `claim-${Date.now()}`,
          text: claim.claimText,
          position: 'neutral',
          stakeholders: claim.stakeholderGroups,
          evidence_count: claim.representativeQuotes.length,
          confidence: 0.8,
        })),
        summary: consensusAreas.join('; '),
        topTopics: [],
        minorityVoices: [],
        mainClusters: [],
        equityMetrics: {
          minorityRepresentation: 0.5,
          organizationalDiversity: 0.5,
          geographicDiversity: 0.5,
          demographicBalance: 0.5,
        },
        generatedAt: new Date(),
      };

      const briefResult: BriefGenerationResult = await this.briefGenerator.generateBrief(briefInput);

      const synthesis: BillArgumentSynthesis = {
        bill_id,
        majorClaims: majorClaims.map((claim) => ({
          claimText: claim.claimText,
          supportingComments: claim.supportingComments,
          opposingComments: claim.opposingComments,
          evidenceStrength: claim.evidenceStrength,
          stakeholderGroups: claim.stakeholderGroups,
          representativeQuotes: claim.representativeQuotes,
        })),
        evidenceBase,
        stakeholderPositions: balancedPositions,
        consensusAreas,
        controversialPoints,
        legislativeBrief: JSON.stringify(briefResult),
        lastUpdated: new Date(),
      };

      await this.synthService.storeBillSynthesis(synthesis);

      log.info(
        `Bill synthesis complete — ${majorClaims.length} claims,` +
          ` ${balancedPositions.length} stakeholder groups`,
      );

      return synthesis;
    } catch (error) {
      log.error('Bill argument synthesis failed', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // PUBLIC — Argument map for visualization
  // --------------------------------------------------------------------------

  async getArgumentMap(bill_id: string): Promise<ArgumentMap> {
    const synthesis = await this.synthService.getBillSynthesis(bill_id);
    if (!synthesis) {
      throw new Error(`No argument synthesis found for bill ${bill_id}`);
    }

    const [relationships, evidenceNetwork] = await Promise.all([
      this.identifyArgumentRelationships(synthesis.majorClaims),
      this.buildEvidenceNetwork(synthesis.evidenceBase),
    ]);

    return {
      claims: synthesis.majorClaims,
      relationships,
      stakeholders: synthesis.stakeholderPositions,
      evidenceNetwork,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE — Extraction helpers
  // --------------------------------------------------------------------------

  private identifyUniqueClaims(args: ExtractedArgument[]): string[] {
    const claimTexts = args
      .filter((arg) => arg.type === 'claim')
      .map((arg) => arg.normalizedText);

    // ClusteringService does not expose a deduplication helper — use a Set.
    return [...new Set(claimTexts)];
  }

  private async storeExtractedArguments(
    request: CommentProcessingRequest,
    args: ExtractedArgument[],
  ): Promise<void> {
    await Promise.all(
      args.map((argument) =>
        this.synthService.storeArgument({
          bill_id: request.bill_id,
          text: argument.normalizedText,
          position: argument.position,
          confidence: argument.confidence,
          userContext: {
            county: request.userDemographics?.county,
            ageGroup: request.userDemographics?.ageGroup,
            occupation: request.userDemographics?.occupation,
            organizationAffiliation: request.userDemographics?.organizationAffiliation,
          },
        }),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // PRIVATE — Metrics & flags
  // --------------------------------------------------------------------------

  private averageConfidence(args: ExtractedArgument[]): number {
    if (args.length === 0) return 0;
    return args.reduce((sum, arg) => sum + arg.confidence, 0) / args.length;
  }

  private shouldFlagForReview(args: ExtractedArgument[]): boolean {
    if (this.averageConfidence(args) < 0.7) return true;

    // Flag dense, long-form argumentative submissions for human review.
    const hasComplexStructure =
      args.length > 5 &&
      args.some((arg) => arg.type === 'reasoning' && arg.text.length > 500);

    return hasComplexStructure;
  }

  private shouldUpdateBillSynthesis(args: ExtractedArgument[]): boolean {
    return args.some(
      (arg) =>
        arg.type === 'claim' &&
        arg.confidence > 0.8 &&
        arg.evidenceQuality !== 'none',
    );
  }

  /**
   * Schedules an async bill synthesis refresh.
   * TODO: replace with a proper job queue (Bull / BullMQ / Agenda) so jobs
   * survive process restarts and can be deduplicated per bill_id.
   */
  private scheduleBillSynthesisUpdate(bill_id: string): void {
    const log = this.billLogger(bill_id);
    log.info('Scheduling background synthesis update');

    setTimeout(() => {
      this.synthesizeBillArguments(bill_id).catch((error: unknown) => {
        log.error('Background synthesis update failed', error);
      });
    }, 1_000);
  }

  // --------------------------------------------------------------------------
  // PRIVATE — Synthesis helpers
  // --------------------------------------------------------------------------

  private synthesizeClaims(clusters: ClusterWithMembers[]): SynthesizedClaim[] {
    return clusters.map((cluster) => {
      const supporting = cluster.members.filter(
        (a: ClusteredArgument) => inferPositionFromText(a.text) === 'support',
      ).length;
      const opposing = cluster.members.filter(
        (a: ClusteredArgument) => inferPositionFromText(a.text) === 'oppose',
      ).length;

      return {
        claimText: cluster.representativeText,
        supportingComments: supporting,
        opposingComments: opposing,
        evidenceStrength: cluster.evidenceStrength,
        stakeholderGroups: cluster.stakeholderGroups,
        // Up to three representative quotes from the cluster.
        representativeQuotes: cluster.members.slice(0, 3).map((a: ClusteredArgument) => a.text),
      };
    });
  }

  private identifyStakeholderPositions(args: DbArgument[]): StakeholderPosition[] {
    // Group arguments by every affected-group tag they carry.
    const byGroup = new Map<string, DbArgument[]>();

    for (const arg of args) {
      for (const group of arg.affectedGroups ?? []) {
        const bucket = byGroup.get(group);
        if (bucket) {
          bucket.push(arg);
        } else {
          byGroup.set(group, [arg]);
        }
      }
    }

    return Array.from(byGroup.entries()).map(([group, groupArgs]) => ({
      stakeholderGroup: group,
      position: this.determineGroupPosition(groupArgs),
      keyArguments: this.extractKeyArguments(groupArgs),
      evidenceProvided: this.extractEvidenceTexts(groupArgs),
      participantCount: new Set(groupArgs.map((a) => a.user_id)).size,
    }));
  }

  private determineGroupPosition(
    args: DbArgument[],
  ): 'support' | 'oppose' | 'neutral' | 'conditional' {
    let support = 0;
    let oppose = 0;
    let conditional = 0;

    for (const arg of args) {
      if (arg.position === 'support') support++;
      else if (arg.position === 'oppose') oppose++;
      else if (arg.position === 'conditional') conditional++;
    }

    if (support > oppose * 2) return 'support';
    if (oppose > support * 2) return 'oppose';
    if (conditional > 0) return 'conditional';
    return 'neutral';
  }

  /**
   * Returns up to 5 high-signal claim texts for the stakeholder group.
   * NOTE: DbArgument does not currently carry an `extractionConfidence` field —
   * filtering is based on position presence only. Enrich DbArgument with
   * `extractionConfidence` when the DB schema supports it.
   */
  private extractKeyArguments(args: DbArgument[]): string[] {
    return args
      .filter((arg) => arg.position !== 'neutral')
      .map((arg) => arg.content)
      .filter(Boolean)
      .slice(0, 5);
  }

  private extractEvidenceTexts(args: DbArgument[]): string[] {
    // Evidence rows are identified by neutral position in this simplified
    // model. Replace with `arg.argumentType === 'evidence'` once the DB
    // entity exposes that field.
    return args
      .filter((arg) => arg.position === 'neutral')
      .map((arg) => arg.content)
      .filter(Boolean)
      .slice(0, 3);
  }

  private identifyConsensusAreas(claims: SynthesizedClaim[]): string[] {
    return claims
      .filter(
        (c) =>
          c.supportingComments > c.opposingComments * 3 &&
          c.supportingComments > 10,
      )
      .map((c) => c.claimText);
  }

  private identifyControversialPoints(claims: SynthesizedClaim[]): string[] {
    return claims
      .filter((c) => {
        const total = c.supportingComments + c.opposingComments;
        if (total < 20) return false;
        const minorityShare =
          Math.min(c.supportingComments, c.opposingComments) / total;
        return minorityShare > 0.3;
      })
      .map((c) => c.claimText);
  }

  // --------------------------------------------------------------------------
  // PRIVATE — Graph / network builders (stubs for future implementation)
  // --------------------------------------------------------------------------

  private async identifyArgumentRelationships(
    _claims: SynthesizedClaim[],
  ): Promise<ArgumentRelationship[]> {
    // TODO: implement semantic relationship detection between claims.
    return [];
  }

  private async buildEvidenceNetwork(
    evidenceBase: EvidenceAssessment[],
  ): Promise<EvidenceNetwork> {
    // TODO: derive edges from shared sources / co-citation analysis.
    return {
      nodes: evidenceBase.map((e) => ({ id: e.source, type: e.evidenceType })),
      edges: [],
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE — Structured logging helpers
  // --------------------------------------------------------------------------

  private commentLogger(comment_id: string, bill_id: string) {
    const ctx = { component: 'ArgumentProcessor', comment_id, bill_id };
    return {
      info: (msg: string) => logger.info(ctx, msg),
      error: (msg: string, err?: unknown) =>
        logger.error(
          { ...ctx, error: err instanceof Error ? err.message : String(err) },
          msg,
        ),
    };
  }

  private billLogger(bill_id: string) {
    const ctx = { component: 'ArgumentProcessor', bill_id };
    return {
      info: (msg: string) => logger.info(ctx, msg),
      error: (msg: string, err?: unknown) =>
        logger.error(
          { ...ctx, error: err instanceof Error ? err.message : String(err) },
          msg,
        ),
    };
  }
}