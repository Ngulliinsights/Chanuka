// ============================================================================
// ARGUMENT INTELLIGENCE - Argument Processor
// ============================================================================
// Main orchestration service for processing citizen comments into structured arguments

import { logger } from '@shared/core/index.js';
import { StructureExtractorService } from './structure-extractor.js';
import { ClusteringService } from './clustering-service.js';
import { EvidenceValidatorService } from './evidence-validator.js';
import { CoalitionFinderService } from './coalition-finder.js';
import { BriefGeneratorService } from './brief-generator.js';
import { PowerBalancerService } from './power-balancer.js';
import { ArgumentRepository } from '../infrastructure/repositories/argument-repository.js';
import { BriefRepository } from '../infrastructure/repositories/brief-repository.js';

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

export interface ExtractedArgument {
  id: string;
  type: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment';
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  text: string;
  normalizedText: string;
  confidence: number;
  topicTags: string[];
  affectedGroups: string[];
  evidenceQuality: 'none' | 'weak' | 'moderate' | 'strong';
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
    private readonly argumentRepo: ArgumentRepository,
    private readonly briefRepo: BriefRepository
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
      const extractedArguments = await this.structureExtractor.extractArguments(
        request.commentText,
        {
          bill_id: request.bill_id,
          userContext: request.userDemographics,
          submissionContext: request.submissionContext
        }
      );

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
        flaggedForReview: this.shouldFlagForReview(extractedArguments, request)
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
      const billArguments = await this.argumentRepo.getArgumentsByBill(bill_id);

      // Step 2: Cluster similar arguments
      const clusteredArguments = await this.clusteringService.clusterArguments(billArguments);

      // Step 3: Synthesize major claims
      const majorClaims = await this.synthesizeClaims(clusteredArguments);

      // Step 4: Assess evidence base
      const evidenceBase = await this.evidenceValidator.assessEvidenceBase(billArguments);

      // Step 5: Identify stakeholder positions
      const stakeholderPositions = await this.identifyStakeholderPositions(billArguments);

      // Step 6: Apply power balancing to ensure minority voices
      const balancedPositions = await this.powerBalancer.balanceStakeholderVoices(
        stakeholderPositions,
        billArguments
      );

      // Step 7: Identify consensus and controversial areas
      const consensusAreas = this.identifyConsensusAreas(majorClaims);
      const controversialPoints = this.identifyControversialPoints(majorClaims);

      // Step 8: Generate legislative brief
      const legislativeBrief = await this.briefGenerator.generateBrief({
        bill_id,
        majorClaims,
        evidenceBase,
        stakeholderPositions: balancedPositions,
        consensusAreas,
        controversialPoints
      });

      const synthesis: BillArgumentSynthesis = {
        bill_id,
        majorClaims,
        evidenceBase,
        stakeholderPositions: balancedPositions,
        consensusAreas,
        controversialPoints,
        legislativeBrief,
        lastUpdated: new Date()
      };

      // Store the synthesis
      await this.briefRepo.storeBillSynthesis(synthesis);

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
    const synthesis = await this.briefRepo.getBillSynthesis(bill_id);
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

  private async identifyUniqueClaims(arguments: ExtractedArgument[]): Promise<string[]> {
    const claims = arguments
      .filter(arg => arg.type === 'claim')
      .map(arg => arg.normalizedText);
    
    // Use clustering to identify unique claims
    return await this.clusteringService.deduplicateClaims(claims);
  }

  private async storeExtractedArguments(
    request: CommentProcessingRequest,
    arguments: ExtractedArgument[]
  ): Promise<void> {
    for (const argument of arguments) {
      await this.argumentRepo.storeArgument({
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

  private calculateExtractionConfidence(arguments: ExtractedArgument[]): number {
    if (arguments.length === 0) return 0;
    
    const totalConfidence = arguments.reduce((sum, arg) => sum + arg.confidence, 0);
    return totalConfidence / arguments.length;
  }

  private shouldFlagForReview(
    arguments: ExtractedArgument[],
    request: CommentProcessingRequest
  ): boolean {
    // Flag for review if:
    // - Low extraction confidence
    // - Complex argumentative structure
    // - Potential coordinated campaign
    // - Novel claims not seen before

    const avgConfidence = this.calculateExtractionConfidence(arguments);
    if (avgConfidence < 0.7) return true;

    const complexStructure = arguments.length > 5 && 
      arguments.some(arg => arg.type === 'reasoning' && arg.text.length > 500);
    if (complexStructure) return true;

    return false;
  }

  private shouldUpdateBillSynthesis(arguments: ExtractedArgument[]): boolean {
    // Update synthesis if we have high-confidence new claims
    return arguments.some(arg => 
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

  private async synthesizeClaims(clusteredArguments: any[]): Promise<SynthesizedClaim[]> {
    // Implementation would analyze clusters and create synthesized claims
    // This is a simplified version
    return clusteredArguments.map(cluster => ({
      claimText: cluster.representativeText,
      supportingComments: cluster.supportingCount,
      opposingComments: cluster.opposingCount,
      evidenceStrength: cluster.averageEvidenceQuality,
      stakeholderGroups: cluster.stakeholderGroups,
      representativeQuotes: cluster.topQuotes
    }));
  }

  private async identifyStakeholderPositions(arguments: any[]): Promise<StakeholderPosition[]> {
    // Group arguments by stakeholder and analyze positions
    const stakeholderGroups = new Map<string, any[]>();
    
    arguments.forEach(arg => {
      arg.affectedGroups?.forEach((group: string) => {
        if (!stakeholderGroups.has(group)) {
          stakeholderGroups.set(group, []);
        }
        stakeholderGroups.get(group)!.push(arg);
      });
    });

    return Array.from(stakeholderGroups.entries()).map(([group, args]) => ({
      stakeholderGroup: group,
      position: this.determineGroupPosition(args),
      keyArguments: this.extractKeyArguments(args),
      evidenceProvided: this.extractEvidence(args),
      participantCount: new Set(args.map(a => a.user_id)).size
    }));
  }

  private determineGroupPosition(arguments: any[]): 'support' | 'oppose' | 'neutral' | 'conditional' {
    const positions = arguments.map(arg => arg.position);
    const supportCount = positions.filter(p => p === 'support').length;
    const opposeCount = positions.filter(p => p === 'oppose').length;
    
    if (supportCount > opposeCount * 2) return 'support';
    if (opposeCount > supportCount * 2) return 'oppose';
    if (positions.some(p => p === 'conditional')) return 'conditional';
    return 'neutral';
  }

  private extractKeyArguments(arguments: any[]): string[] {
    return arguments
      .filter(arg => arg.type === 'claim' && arg.confidence > 0.7)
      .map(arg => arg.normalizedText)
      .slice(0, 5); // Top 5 arguments
  }

  private extractEvidence(arguments: any[]): string[] {
    return arguments
      .filter(arg => arg.type === 'evidence' && arg.evidenceQuality !== 'none')
      .map(arg => arg.normalizedText)
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
        const ratio = Math.min(claim.supportingComments, claim.opposingComments) / total;
        return ratio > 0.3 && total > 20; // Significant disagreement
      })
      .map(claim => claim.claimText);
  }

  private async identifyArgumentRelationships(claims: SynthesizedClaim[]): Promise<ArgumentRelationship[]> {
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