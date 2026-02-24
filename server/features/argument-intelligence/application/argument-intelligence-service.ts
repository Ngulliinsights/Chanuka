import { logger } from '@server/infrastructure/observability';
import { performanceMonitor } from '@server/infrastructure/observability/monitoring';
import { db } from '@server/infrastructure/database/pool';
import {
  type Argument,
  argument_relationships,
  type ArgumentRelationship,
  argumentTable,
  type Claim,
  claims,
  type Evidence,
  evidence,
  legislative_briefs,
  type LegislativeBrief,
  synthesis_jobs
} from '@server/infrastructure/schema';
import { and, asc, count, desc, eq, like, or, sql } from 'drizzle-orm';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
  updated_at?: Date;
}

// ============================================================================
// ARGUMENT INTELLIGENCE SERVICE
// ============================================================================

/**
 * ArgumentIntelligenceService - Consolidated service for argument intelligence operations
 * * This service replaces the repository pattern with direct Drizzle ORM usage,
 * providing comprehensive argument processing, clustering, evidence validation,
 * and brief generation capabilities.
 */
export class ArgumentIntelligenceService {
  private get database() {
    return db;
  }

  // ============================================================================
  // ARGUMENT OPERATIONS
  // ============================================================================

  /**
   * Store a processed argument in the database
   */
  // TODO: Replace 'any' with proper type definition
  async storeArgument(argumentData: unknown): Promise<Argument> {
    const logContext = { component: 'ArgumentIntelligenceService', operation: 'storeArgument' };
    logger.debug('Storing processed argument', logContext);

    try {
      const now = new Date();
      const [newArgument] = await this.database
        .insert(argumentTable)
        .values({
          ...argumentData,
          created_at: now,
          updated_at: now
        })
        .returning();

      logger.info('✅ Argument stored successfully', {
        ...logContext,
        argument_id: newArgument.id
      });

      return newArgument;
    } catch (error) {
      logger.error('Failed to store argument', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get arguments for a specific bill
   */
  async getArgumentsForBill(bill_id: string): Promise<Argument[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'getArgumentsForBill',
      bill_id
    };
    logger.debug('Fetching arguments for bill', logContext);

    try {
      const results = await this.database
        .select()
        .from(argumentTable)
        .where(eq(argumentTable.bill_id, bill_id))
        .orderBy(desc(argumentTable.created_at));

      logger.debug('✅ Arguments retrieved', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to fetch arguments for bill', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Search arguments by text content
   */
  async searchArguments(searchText: string, limit: number = 50): Promise<Argument[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'searchArguments',
      searchText,
      limit
    };
    logger.debug('Searching arguments', logContext);

    try {
      const searchPattern = `%${searchText}%`;
      const results = await this.database
        .select()
        .from(argumentTable)
        .where(
          or(
            like(argumentTable.content, searchPattern),
            like(argumentTable.summary, searchPattern)
          )
        )
        .limit(limit)
        .orderBy(desc(argumentTable.created_at));

      logger.debug('✅ Argument search completed', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to search arguments', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // CLAIMS OPERATIONS
  // ============================================================================

  /**
   * Store extracted claims
   */
  // TODO: Replace 'any' with proper type definition
  async storeClaims(claimsData: unknown[]): Promise<Claim[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'storeClaims',
      count: claimsData.length
    };
    logger.debug('Storing extracted claims', logContext);

    try {
      const now = new Date();
      const claimsWithTimestamps = claimsData.map(claim => ({
        ...claim,
        created_at: now,
        updated_at: now
      }));

      const newClaims = await this.database
        .insert(claims)
        .values(claimsWithTimestamps)
        .returning();

      logger.info('✅ Claims stored successfully', {
        ...logContext,
        stored_count: newClaims.length
      });

      return newClaims;
    } catch (error) {
      logger.error('Failed to store claims', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get claims for a specific argument
   */
  async getClaimsForArgument(argumentId: string): Promise<Claim[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'getClaimsForArgument',
      argumentId
    };
    logger.debug('Fetching claims for argument', logContext);

    try {
      const results = await this.database
        .select()
        .from(claims)
        .where(eq(claims.argument_id, argumentId))
        .orderBy(asc(claims.position));

      logger.debug('✅ Claims retrieved', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to fetch claims for argument', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // EVIDENCE OPERATIONS
  // ============================================================================

  /**
   * Store evidence records
   */
  // TODO: Replace 'any' with proper type definition
  async storeEvidence(evidenceData: unknown[]): Promise<Evidence[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'storeEvidence',
      count: evidenceData.length
    };
    logger.debug('Storing evidence records', logContext);

    try {
      const now = new Date();
      const evidenceWithTimestamps = evidenceData.map(evidence => ({
        ...evidence,
        created_at: now,
        updated_at: now
      }));

      const newEvidence = await this.database
        .insert(evidence)
        .values(evidenceWithTimestamps)
        .returning();

      logger.info('✅ Evidence stored successfully', {
        ...logContext,
        stored_count: newEvidence.length
      });

      return newEvidence;
    } catch (error) {
      logger.error('Failed to store evidence', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get evidence for a specific claim
   */
  async getEvidenceForClaim(claimId: string): Promise<Evidence[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'getEvidenceForClaim',
      claimId
    };
    logger.debug('Fetching evidence for claim', logContext);

    try {
      const results = await this.database
        .select()
        .from(evidence)
        .where(eq(evidence.claim_id, claimId))
        .orderBy(desc(evidence.credibility_score));

      logger.debug('✅ Evidence retrieved', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to fetch evidence for claim', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // LEGISLATIVE BRIEFS OPERATIONS
  // ============================================================================

  /**
   * Store a generated legislative brief
   */
  // TODO: Replace 'any' with proper type definition
  async storeBrief(briefData: unknown): Promise<LegislativeBrief> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'storeBrief',
      briefType: briefData.brief_type
    };
    logger.debug('Storing legislative brief', logContext);

    try {
      const now = new Date();
      const [newBrief] = await this.database
        .insert(legislative_briefs)
        .values({
          ...briefData,
          created_at: now,
          updated_at: now
        })
        .returning();

      logger.info('✅ Legislative brief stored successfully', {
        ...logContext,
        brief_id: newBrief.id
      });

      return newBrief;
    } catch (error) {
      logger.error('Failed to store legislative brief', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get briefs for a specific bill
   */
  async getBriefsForBill(bill_id: string): Promise<LegislativeBrief[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'getBriefsForBill',
      bill_id
    };
    logger.debug('Fetching briefs for bill', logContext);

    try {
      const results = await this.database
        .select()
        .from(legislative_briefs)
        .where(eq(legislative_briefs.bill_id, bill_id))
        .orderBy(desc(legislative_briefs.created_at));

      logger.debug('✅ Briefs retrieved', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to fetch briefs for bill', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get a specific brief by ID
   */
  async getBriefById(briefId: string): Promise<LegislativeBrief | null> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'getBriefById',
      briefId
    };
    logger.debug('Fetching brief by ID', logContext);

    try {
      const [brief] = await this.database
        .select()
        .from(legislative_briefs)
        .where(eq(legislative_briefs.id, briefId))
        .limit(1);

      if (!brief) {
        logger.debug('Brief not found', logContext);
      }

      return brief || null;
    } catch (error) {
      logger.error('Failed to fetch brief by ID', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // SYNTHESIS OPERATIONS
  // ============================================================================

  /**
   * Store bill argument synthesis
   */
  async storeBillSynthesis(synthesis: BillArgumentSynthesis): Promise<void> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'storeBillSynthesis',
      bill_id: synthesis.bill_id
    };
    logger.debug('Storing bill synthesis', logContext);

    try {
      const now = new Date();
      await this.database
        .insert(synthesis_jobs)
        .values({
          id: `synthesis_${synthesis.bill_id}_${Date.now()}`,
          bill_id: synthesis.bill_id,
          job_type: 'bill_synthesis',
          status: 'completed',
          input_data: JSON.stringify({
            majorClaims: synthesis.majorClaims,
            evidenceBase: synthesis.evidenceBase,
            stakeholderPositions: synthesis.stakeholderPositions,
            consensusAreas: synthesis.consensusAreas,
            controversialPoints: synthesis.controversialPoints
          }),
          output_data: synthesis.legislativeBrief,
          created_at: now,
          updated_at: now,
          completed_at: synthesis.lastUpdated
        });

      logger.info('✅ Bill synthesis stored successfully', logContext);
    } catch (error) {
      logger.error('Failed to store bill synthesis', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get bill argument synthesis
   */
  async getBillSynthesis(bill_id: string): Promise<BillArgumentSynthesis | null> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'getBillSynthesis',
      bill_id
    };
    logger.debug('Fetching bill synthesis', logContext);

    try {
      const [synthesis] = await this.database
        .select()
        .from(synthesis_jobs)
        .where(
          and(
            eq(synthesis_jobs.bill_id, bill_id),
            eq(synthesis_jobs.job_type, 'bill_synthesis'),
            eq(synthesis_jobs.status, 'completed')
          )
        )
        .orderBy(desc(synthesis_jobs.completed_at))
        .limit(1);

      if (!synthesis) {
        logger.debug('Bill synthesis not found', logContext);
        return null;
      }

      const inputData = this.parseJson(synthesis.input_data, {});

      return {
        bill_id: synthesis.bill_id,
        majorClaims: inputData.majorClaims || [],
        evidenceBase: inputData.evidenceBase || [],
        stakeholderPositions: inputData.stakeholderPositions || [],
        consensusAreas: inputData.consensusAreas || [],
        controversialPoints: inputData.controversialPoints || [],
        legislativeBrief: synthesis.output_data || '',
        lastUpdated: synthesis.completed_at || synthesis.updated_at
      };
    } catch (error) {
      logger.error('Failed to fetch bill synthesis', { ...logContext, error });
      return null;
    }
  }

  // ============================================================================
  // ARGUMENT RELATIONSHIPS OPERATIONS
  // ============================================================================

  /**
   * Store argument relationships (clustering, similarity, etc.)
   */
  // TODO: Replace 'any' with proper type definition
  async storeArgumentRelationships(relationships: unknown[]): Promise<ArgumentRelationship[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'storeArgumentRelationships',
      count: relationships.length
    };
    logger.debug('Storing argument relationships', logContext);

    try {
      const now = new Date();
      const relationshipsWithTimestamps = relationships.map(rel => ({
        ...rel,
        created_at: now,
        updated_at: now
      }));

      const newRelationships = await this.database
        .insert(argument_relationships)
        .values(relationshipsWithTimestamps)
        .returning();

      logger.info('✅ Argument relationships stored successfully', {
        ...logContext,
        stored_count: newRelationships.length
      });

      return newRelationships;
    } catch (error) {
      logger.error('Failed to store argument relationships', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get related arguments for clustering and similarity analysis
   */
  async getRelatedArguments(argumentId: string, relationshipType?: string): Promise<ArgumentRelationship[]> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'getRelatedArguments',
      argumentId,
      relationshipType
    };
    logger.debug('Fetching related arguments', logContext);

    try {
      let query = this.database
        .select()
        .from(argument_relationships)
        .where(
          or(
            eq(argument_relationships.source_argument_id, argumentId),
            eq(argument_relationships.target_argument_id, argumentId)
          )
        );

      if (relationshipType) {
        query = query.where(eq(argument_relationships.relationship_type, relationshipType));
      }

      const results = await query.orderBy(desc(argument_relationships.strength));

      logger.debug('✅ Related arguments retrieved', { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to fetch related arguments', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // STATISTICS AND ANALYTICS
  // ============================================================================

  /**
   * Get argument statistics for a bill
   */
  // TODO: Replace 'any' with proper type definition
  async getArgumentStatistics(bill_id: string): Promise<any> {
    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'getArgumentStatistics',
      bill_id
    };
    logger.debug('Calculating argument statistics', logContext);

    try {
      const [stats] = await this.database
        .select({
          totalArguments: count(),
          avgConfidenceScore: sql<number>`AVG(${argumentTable.confidence_score})`,
          avgSentimentScore: sql<number>`AVG(${argumentTable.sentiment_score})`
        })
        .from(argumentTable)
        .where(eq(argumentTable.bill_id, bill_id));

      const [claimStats] = await this.database
        .select({
          totalClaims: count()
        })
        .from(claims)
        .innerJoin(argumentTable, eq(claims.argument_id, argumentTable.id))
        .where(eq(argumentTable.bill_id, bill_id));

      const [evidenceStats] = await this.database
        .select({
          totalEvidence: count(),
          avgCredibilityScore: sql<number>`AVG(${evidence.credibility_score})`
        })
        .from(evidence)
        .innerJoin(claims, eq(evidence.claim_id, claims.id))
        .innerJoin(argumentTable, eq(claims.argument_id, argumentTable.id))
        .where(eq(argumentTable.bill_id, bill_id));

      const statistics = {
        arguments: {
          total: stats.totalArguments,
          avgConfidenceScore: stats.avgConfidenceScore,
          avgSentimentScore: stats.avgSentimentScore
        },
        claims: {
          total: claimStats.totalClaims
        },
        evidence: {
          total: evidenceStats.totalEvidence,
          avgCredibilityScore: evidenceStats.avgCredibilityScore
        }
      };

      logger.debug('✅ Argument statistics calculated', { ...logContext, statistics });
      return statistics;
    } catch (error) {
      logger.error('Failed to calculate argument statistics', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Safely parse JSON with fallback
   */
  // TODO: Replace 'any' with proper type definition
  private parseJson(jsonString: string | null, fallback: unknown = null): unknown {
    if (!jsonString) return fallback;

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn('Failed to parse JSON, using fallback', {
        component: 'ArgumentIntelligenceService',
        jsonString: jsonString?.substring(0, 100),
        error
      });
      return fallback;
    }
  }

  // ============================================================================
  // COMMENT PROCESSING
  // ============================================================================

  /**
   * Process a comment through the argument intelligence pipeline
   * This is the main entry point for real-time comment analysis
   */
  async processComment(request: {
    text: string;
    billId: string;
    userId: string;
    commentId?: string;
    userDemographics?: {
      expertise?: string[];
      organization?: string | null;
      reputation_score?: number | null;
    };
    submissionContext?: {
      commentType?: string;
      parentId?: string;
      timestamp?: Date;
    };
  }): Promise<{
    argumentId: string;
    claimsExtracted: number;
    evidenceFound: number;
    position: string;
    confidence: number;
  }> {
    const operationId = performanceMonitor.startOperation('argument-intelligence', 'processComment', {
      billId: request.billId,
      userId: request.userId,
      textLength: request.text.length,
    });

    const logContext = {
      component: 'ArgumentIntelligenceService',
      operation: 'processComment',
      billId: request.billId,
      userId: request.userId,
    };

    logger.info('Processing comment through argument intelligence', logContext);

    try {
      // Store the argument with basic extraction
      const argument = await this.storeArgument({
        bill_id: request.billId,
        user_id: request.userId,
        comment_id: request.commentId,
        argument_text: request.text,
        argument_type: this.detectArgumentType(request.text),
        position: this.detectPosition(request.text),
        strength: this.calculateStrength(request.text),
        confidence: this.calculateConfidence(request.text),
        metadata: JSON.stringify({
          userDemographics: request.userDemographics,
          submissionContext: request.submissionContext,
          processedAt: new Date().toISOString(),
        }),
      });

      // Extract claims from the text
      const extractedClaims = this.extractClaims(request.text);
      const claims = await this.storeClaims(
        extractedClaims.map((claim) => ({
          argument_id: argument.id,
          claim_text: claim.text,
          claim_type: claim.type,
          confidence: claim.confidence,
          supporting_evidence: JSON.stringify(claim.evidence || []),
        }))
      );

      // Extract evidence
      const extractedEvidence = this.extractEvidence(request.text);
      const evidence = await this.storeEvidence(
        extractedEvidence.map((ev) => ({
          claim_id: claims[0]?.id || argument.id, // Link to first claim or argument
          evidence_text: ev.text,
          evidence_type: ev.type,
          source: ev.source,
          verification_status: 'unverified',
          credibility_score: ev.credibility,
        }))
      );

      performanceMonitor.endOperation(operationId, true, {
        claimsExtracted: claims.length,
        evidenceFound: evidence.length,
      });

      logger.info('Comment processed successfully', {
        ...logContext,
        argumentId: argument.id,
        claimsExtracted: claims.length,
        evidenceFound: evidence.length,
      });

      return {
        argumentId: argument.id,
        claimsExtracted: claims.length,
        evidenceFound: evidence.length,
        position: argument.position,
        confidence: argument.confidence,
      };
    } catch (error) {
      performanceMonitor.endOperation(operationId, false, error as Error);

      logger.error('Failed to process comment', {
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect argument type from text
   */
  private detectArgumentType(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('evidence') || lowerText.includes('data') || lowerText.includes('study')) {
      return 'evidence-based';
    }
    if (lowerText.includes('should') || lowerText.includes('must') || lowerText.includes('ought')) {
      return 'normative';
    }
    if (lowerText.includes('because') || lowerText.includes('therefore') || lowerText.includes('thus')) {
      return 'causal';
    }
    if (lowerText.includes('similar') || lowerText.includes('like') || lowerText.includes('compared')) {
      return 'comparative';
    }

    return 'general';
  }

  /**
   * Detect position from text
   */
  private detectPosition(text: string): string {
    const lowerText = text.toLowerCase();

    const supportWords = ['support', 'agree', 'favor', 'approve', 'endorse', 'beneficial', 'positive'];
    const opposeWords = ['oppose', 'disagree', 'against', 'reject', 'harmful', 'negative', 'concern'];

    const supportCount = supportWords.filter((word) => lowerText.includes(word)).length;
    const opposeCount = opposeWords.filter((word) => lowerText.includes(word)).length;

    if (supportCount > opposeCount) return 'support';
    if (opposeCount > supportCount) return 'oppose';

    return 'neutral';
  }

  /**
   * Calculate argument strength
   */
  private calculateStrength(text: string): number {
    let strength = 0.5; // Base strength

    // Length factor (longer arguments tend to be more detailed)
    if (text.length > 200) strength += 0.1;
    if (text.length > 500) strength += 0.1;

    // Evidence indicators
    if (text.includes('evidence') || text.includes('data') || text.includes('study')) {
      strength += 0.15;
    }

    // Reasoning indicators
    if (text.includes('because') || text.includes('therefore') || text.includes('thus')) {
      strength += 0.1;
    }

    // Source citations
    if (text.includes('http') || text.includes('www') || text.includes('source:')) {
      strength += 0.15;
    }

    return Math.min(strength, 1.0);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(text: string): number {
    let confidence = 0.6; // Base confidence

    // Clear structure
    if (text.split('.').length > 2) confidence += 0.1;

    // Specific claims
    if (text.includes('specifically') || text.includes('particularly')) {
      confidence += 0.1;
    }

    // Hedging reduces confidence
    if (text.includes('maybe') || text.includes('perhaps') || text.includes('might')) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(confidence, 1.0));
  }

  /**
   * Extract claims from text
   */
  private extractClaims(text: string): Array<{
    text: string;
    type: string;
    confidence: number;
    evidence?: string[];
  }> {
    const claims: Array<{ text: string; type: string; confidence: number; evidence?: string[] }> = [];

    // Split by sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 20) continue; // Skip very short sentences

      claims.push({
        text: trimmed,
        type: this.detectArgumentType(trimmed),
        confidence: this.calculateConfidence(trimmed),
        evidence: [],
      });
    }

    return claims;
  }

  /**
   * Extract evidence from text
   */
  private extractEvidence(text: string): Array<{
    text: string;
    type: string;
    source: string;
    credibility: number;
  }> {
    const evidence: Array<{ text: string; type: string; source: string; credibility: number }> = [];

    // Look for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];

    for (const url of urls) {
      evidence.push({
        text: `Source: ${url}`,
        type: 'external_source',
        source: url,
        credibility: 0.7,
      });
    }

    // Look for statistical claims
    const numberRegex = /\d+(\.\d+)?%|\d+(\.\d+)?\s*(million|billion|thousand)/gi;
    const numbers = text.match(numberRegex) || [];

    if (numbers.length > 0) {
      evidence.push({
        text: `Statistical claim: ${numbers.join(', ')}`,
        type: 'statistical',
        source: 'user_provided',
        credibility: 0.5,
      });
    }

    return evidence;
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      // Simple query to test database connectivity
      await this.database.select({ count: count() }).from(argumentTable).limit(1);

      return {
        status: 'healthy',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Health check failed', {
        component: 'ArgumentIntelligenceService',
        error
      });

      return {
        status: 'unhealthy',
        timestamp: new Date()
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of ArgumentIntelligenceService for application-wide use.
 */
export const argumentIntelligenceService = new ArgumentIntelligenceService();