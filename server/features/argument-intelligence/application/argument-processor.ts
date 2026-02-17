// ============================================================================
// ARGUMENT INTELLIGENCE - Argument Processor
// ============================================================================
// Main orchestration service for processing citizen comments into structured arguments

import { logger } from '@shared/core';

import { ArgumentIntelligenceService } from './argument-intelligence-service';
import { BriefGeneratorService, GeneratedBrief } from './brief-generator';
import { ArgumentCluster, ClusteringService } from './clustering-service';
import { CoalitionFinderService } from './coalition-finder';
import { EvidenceValidatorService } from './evidence-validator';
import { PowerBalancerService } from './power-balancer';
import { ExtractedArgument as ServiceExtractedArgument, StructureExtractorService } from './structure-extractor';

export interface CommentProcessingRequest {
  comment_id: string;
  bill_id: string;
  commentText: string;
  user_id: string;
  userDemographics?: {
    county?: string;
    ageGroup?: string;
    occupation?: string;
    organizationAffiliation?: string;
  };
  submissionContext?: {
    submissionMethod: 'web' | 'ussd' | 'ambassador' | 'api';
    timestamp: Date;
    session_id?: string;
  };
}

export interface ArgumentProcessingResult {
  comment_id: string;
  bill_id: string;
  extractedArguments: ExtractedArgument[];
  identifiedClaims: string[];
  coalitionPotential: CoalitionMatch[];
  processingMetrics: {
    extractionConfidence: number;
    processingTime: number;
    flaggedForReview: boolean;
  };
}

// Re-export or redefine to match StructureExtractorService outputs if needed
export interface ExtractedArgument extends ServiceExtractedArgument {
    // Add any processor-specific extensions here if necessary,
    // otherwise this interface extends the base one.
}

export interface CoalitionMatch {
  stakeholderGroup: string;
  similarityScore: number;
  sharedConcerns: string[];
  potentialAlliance: boolean;
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

export class ArgumentProcessor {
  constructor(
    private readonly structureExtractor: StructureExtractorService,
    private readonly clusteringService: ClusteringService,
    private readonly evidenceValidator: EvidenceValidatorService,
    private readonly coalitionFinder: CoalitionFinderService,
    private readonly briefGenerator: BriefGeneratorService,
    private readonly powerBalancer: PowerBalancerService,
    private readonly argumentService: ArgumentIntelligenceService
  ) {}

  /**
   * Process a single comment through the argument intelligence pipeline
   */
  async processComment(request: CommentProcessingRequest): Promise<ArgumentProcessingResult> {
    const startTime = Date.now();

    try {
      logger.info(`🧠 Processing comment for argument extraction`, {
        component: 'ArgumentProcessor',
        comment_id: request.comment_id,
        bill_id: request.bill_id
      });

      // Step 1: Extract argumentative structure from comment
      // Explicitly map properties to avoid strict type mismatch with optional undefined
      const extractionContext = {
        bill_id: request.bill_id,
        userContext: request.userDemographics ? { ...request.userDemographics } : undefined,
        submissionContext: request.submissionContext
      };

      const extractedArgs = await this.structureExtractor.extractArguments(
        request.commentText,
        extractionContext
      );

      // Cast to local interface if needed, or use shared interface
      const extractedArguments = extractedArgs as ExtractedArgument[];

      // Step 2: Identify and normalize claims
      const identifiedClaims = await this.identifyUniqueClaims(extractedArguments);

      // Step 3: Find potential coalitions based on argument similarity
      const coalitionPotential = await this.coalitionFinder.findPotentialCoalitions(
        extractedArguments,
        request.userDemographics
      );

      // Step 4: Store extracted arguments
      await this.storeExtractedArguments(request, extractedArguments);

      // Step 5: Calculate processing metrics
      const processingMetrics = {
        extractionConfidence: this.calculateExtractionConfidence(extractedArguments),
        processingTime: Date.now() - startTime,
        flaggedForReview: this.shouldFlagForReview(extractedArguments)
      };

      // Step 6: Trigger bill synthesis update if significant new arguments
      if (this.shouldUpdateBillSynthesis(extractedArguments)) {
        this.triggerBillSynthesisUpdate(request.bill_id);
      }

      const result: ArgumentProcessingResult = {
        comment_id: request.comment_id,
        bill_id: request.bill_id,
        extractedArguments,
        identifiedClaims,
        coalitionPotential,
        processingMetrics
      };

      logger.info(`✅ Comment processing completed`, {
        component: 'ArgumentProcessor',
        comment_id: request.comment_id,
        argumentsExtracted: extractedArguments.length,
        processingTime: processingMetrics.processingTime
      });

      return result;

    } catch (error) {
      logger.error(`❌ Comment processing failed`, {
        component: 'ArgumentProcessor',
        comment_id: request.comment_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive argument synthesis for a bill
   */
  async synthesizeBillArguments(bill_id: string): Promise<BillArgumentSynthesis> {
    try {
      logger.info(`🔄 Synthesizing arguments for bill`, {
        component: 'ArgumentProcessor',
        bill_id
      });

      // Step 1: Retrieve all arguments for the bill
      const billArguments = await this.argumentService.getArgumentsForBill(bill_id);

      // Map DB arguments to Clustering arguments format
      // Note: In a real scenario, you'd map the DB entity to the service DTO explicitly.
      // Assuming billArguments are compatible enough for this context or passing as unknown for now
      // to resolve the immediate flow, though strict mapping is better.
      const argumentsForClustering = billArguments.map(arg => ({
        id: arg.id,
        text: arg.content || '', // Assuming content field exists
        normalizedText: arg.content || '',
        confidence: 0.8, // Default or fetch from DB
        user_id: arg.user_id || '',
        userDemographics: undefined // Map if available
      }));

      // Step 2: Cluster similar arguments
      const clusteringResult = await this.clusteringService.clusterArguments(argumentsForClustering);

      // Step 3: Synthesize major claims
      const majorClaims = await this.synthesizeClaims(clusteringResult.clusters);

      // Step 4: Assess evidence base
      // Use original DB arguments for evidence assessment
      const evidenceBase = await this.evidenceValidator.assessEvidenceBase(billArguments);

      // Step 5: Identify stakeholder positions
      const stakeholderPositions = await this.identifyStakeholderPositions(billArguments);

      // Step 6: Apply power balancing to ensure minority voices
      // Needs mapping from DB args to ArgumentData interface expected by PowerBalancer
      const argumentData = billArguments.map(arg => ({
        id: arg.id,
        text: arg.content || '',
        user_id: arg.user_id || '',
        submissionTime: arg.created_at || new Date()
      }));

      const balancingResult = await this.powerBalancer.balanceStakeholderVoices(
        stakeholderPositions,
        argumentData
      );

      const balancedPositions = balancingResult.balancedPositions;

      // Step 7: Identify consensus and controversial areas
      const consensusAreas = this.identifyConsensusAreas(majorClaims);
      const controversialPoints = this.identifyControversialPoints(majorClaims);

      // Step 8: Generate legislative brief
      const generatedBriefObject: GeneratedBrief = await this.briefGenerator.generateBrief({
        bill_id,
        majorClaims,
        evidenceBase: evidenceBase.evidenceBase, // Pass array of results
        stakeholderPositions: balancedPositions,
        consensusAreas,
        controversialPoints
      });

      const synthesis: BillArgumentSynthesis = {
        bill_id,
        majorClaims,
        evidenceBase: evidenceBase.evidenceBase,
        stakeholderPositions: balancedPositions,
        consensusAreas,
        controversialPoints,
        legislativeBrief: JSON.stringify(generatedBriefObject), // Serialize to string
        lastUpdated: new Date()
      };

      // Store the synthesis
      await this.argumentService.storeBillSynthesis(synthesis);

      logger.info(`✅ Bill argument synthesis completed`, {
        component: 'ArgumentProcessor',
        bill_id,
        majorClaims: majorClaims.length,
        stakeholderGroups: balancedPositions.length
      });

      return synthesis;

    } catch (error) {
      logger.error(`❌ Bill argument synthesis failed`, {
        component: 'ArgumentProcessor',
        bill_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get argument map for bill visualization
   */
  async getArgumentMap(bill_id: string): Promise<{
    claims: SynthesizedClaim[];
    relationships: ArgumentRelationship[];
    stakeholders: StakeholderPosition[];
    evidenceNetwork: EvidenceNetwork;
  }> {
    const synthesis = await this.argumentService.getBillSynthesis(bill_id);
    if (!synthesis) {
      throw new Error(`No argument synthesis found for bill ${bill_id}`);
    }

    const relationships = await this.identifyArgumentRelationships(synthesis.majorClaims);
    const evidenceNetwork = await this.buildEvidenceNetwork(synthesis.evidenceBase);

    return {
      claims: synthesis.majorClaims,
      relationships,
      stakeholders: synthesis.stakeholderPositions,
      evidenceNetwork
    };
  }

  // Private helper methods

  private async identifyUniqueClaims(args: ExtractedArgument[]): Promise<string[]> {
    const claims = args
      .filter(arg => arg.type === 'claim')
      .map(arg => arg.normalizedText);

    // Use clustering to identify unique claims
    return await this.clusteringService.deduplicateClaims(claims);
  }

  private async storeExtractedArguments(
    request: CommentProcessingRequest,
    args: ExtractedArgument[]
  ): Promise<void> {
    for (const argument of args) {
      await this.argumentService.storeArgument({
        id: argument.id,
        comment_id: request.comment_id,
        bill_id: request.bill_id,
        user_id: request.user_id,
        argumentType: argument.type,
        position: argument.position,
        extractedText: argument.text,
        normalizedText: argument.normalizedText,
        topicTags: argument.topicTags,
        affectedGroups: argument.affectedGroups,
        extractionConfidence: argument.confidence,
        evidenceQuality: argument.evidenceQuality,
        created_at: new Date()
      });
    }
  }

  private calculateExtractionConfidence(args: ExtractedArgument[]): number {
    if (args.length === 0) return 0;

    const totalConfidence = args.reduce((sum, arg) => sum + arg.confidence, 0);
    return totalConfidence / args.length;
  }

  private shouldFlagForReview(
    args: ExtractedArgument[]
  ): boolean {
    // Flag for review if:
    // - Low extraction confidence
    // - Complex argumentative structure
    // - Potential coordinated campaign
    // - Novel claims not seen before

    const avgConfidence = this.calculateExtractionConfidence(args);
    if (avgConfidence < 0.7) return true;

    const complexStructure = args.length > 5 &&
      args.some(arg => arg.type === 'reasoning' && arg.text.length > 500);
    if (complexStructure) return true;

    return false;
  }

  private shouldUpdateBillSynthesis(args: ExtractedArgument[]): boolean {
    // Update synthesis if we have high-confidence new claims
    return args.some(arg =>
      arg.type === 'claim' &&
      arg.confidence > 0.8 &&
      arg.evidenceQuality !== 'none'
    );
  }

  private async triggerBillSynthesisUpdate(bill_id: string): Promise<void> {
    // Queue background job to update bill synthesis
    logger.info(`🔄 Queuing bill synthesis update`, {
      component: 'ArgumentProcessor',
      bill_id
    });

    // This would typically use a job queue like Bull or Agenda
    setTimeout(() => {
      this.synthesizeBillArguments(bill_id).catch(error => {
        logger.error(`Background synthesis update failed`, {
          component: 'ArgumentProcessor',
          bill_id,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, 1000);
  }

  private async synthesizeClaims(clusters: ArgumentCluster[]): Promise<SynthesizedClaim[]> {
    return clusters.map(cluster => ({
      claimText: cluster.representativeText,
      supportingComments: cluster.arguments.filter(a => this.inferPosition(a.text) === 'support').length, // Simplified count
      opposingComments: cluster.arguments.filter(a => this.inferPosition(a.text) === 'oppose').length,
      evidenceStrength: cluster.evidenceStrength,
      stakeholderGroups: cluster.stakeholderGroups,
      representativeQuotes: cluster.arguments.slice(0, 3).map(a => a.text)
    }));
  }

  // Helper to infer position for the count above (if not directly available on ClusteredArgument)
  private inferPosition(text: string): 'support' | 'oppose' | 'neutral' {
      const lower = text.toLowerCase();
      if (lower.includes('support') || lower.includes('agree')) return 'support';
      if (lower.includes('oppose') || lower.includes('disagree')) return 'oppose';
      return 'neutral';
  }

  private async identifyStakeholderPositions(args: unknown[]): Promise<StakeholderPosition[]> {
    // Group arguments by stakeholder and analyze positions
    const stakeholderGroups = new Map<string, unknown[]>();

    args.forEach(arg => {
      arg.affectedGroups?.forEach((group: string) => {
        if (!stakeholderGroups.has(group)) {
          stakeholderGroups.set(group, []);
        }
        stakeholderGroups.get(group)!.push(arg);
      });
    });

    return Array.from(stakeholderGroups.entries()).map(([group, groupArgs]) => ({
      stakeholderGroup: group,
      position: this.determineGroupPosition(groupArgs),
      keyArguments: this.extractKeyArguments(groupArgs),
      evidenceProvided: this.extractEvidence(groupArgs),
      participantCount: new Set(groupArgs.map((a: unknown) => a.user_id)).size
    }));
  }

  private determineGroupPosition(args: unknown[]): 'support' | 'oppose' | 'neutral' | 'conditional' {
    const positions = args.map(arg => arg.position);
    const supportCount = positions.filter((p: string) => p === 'support').length;
    const opposeCount = positions.filter((p: string) => p === 'oppose').length;

    if (supportCount > opposeCount * 2) return 'support';
    if (opposeCount > supportCount * 2) return 'oppose';
    if (positions.some((p: string) => p === 'conditional')) return 'conditional';
    return 'neutral';
  }

  private extractKeyArguments(args: unknown[]): string[] {
    return args
      .filter((arg: unknown) => arg.type === 'claim' && (arg.confidence || 0) > 0.7)
      .map((arg: unknown) => arg.normalizedText || arg.extractedText || '')
      .slice(0, 5); // Top 5 arguments
  }

  private extractEvidence(args: unknown[]): string[] {
    return args
      .filter((arg: unknown) => arg.type === 'evidence' && arg.evidenceQuality !== 'none')
      .map((arg: unknown) => arg.normalizedText || arg.extractedText || '')
      .slice(0, 3); // Top 3 pieces of evidence
  }

  private identifyConsensusAreas(claims: SynthesizedClaim[]): string[] {
    return claims
      .filter(claim =>
        claim.supportingComments > claim.opposingComments * 3 &&
        claim.supportingComments > 10
      )
      .map(claim => claim.claimText);
  }

  private identifyControversialPoints(claims: SynthesizedClaim[]): string[] {
    return claims
      .filter(claim => {
        const total = claim.supportingComments + claim.opposingComments;
        if (total === 0) return false;
        const ratio = Math.min(claim.supportingComments, claim.opposingComments) / total;
        return ratio > 0.3 && total > 20; // Significant disagreement
      })
      .map(claim => claim.claimText);
  }

  private async identifyArgumentRelationships(_claims: SynthesizedClaim[]): Promise<ArgumentRelationship[]> {
    // Analyze logical relationships between claims
    return []; // Simplified for now
  }

  private async buildEvidenceNetwork(evidenceBase: EvidenceAssessment[]): Promise<EvidenceNetwork> {
    // Build network of evidence relationships
    return {
      nodes: evidenceBase.map(e => ({ id: e.source, type: e.evidenceType })),
      edges: [] // Simplified for now
    };
  }
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