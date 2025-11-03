// ============================================================================
// ARGUMENT INTELLIGENCE - Brief Generator
// ============================================================================
// Generates structured legislative briefs from synthesized citizen arguments

import { logger } from '../../../shared/core/index.js';

export interface BriefGenerationRequest {
  billId: string;
  majorClaims: SynthesizedClaim[];
  evidenceBase: EvidenceAssessment[];
  stakeholderPositions: StakeholderPosition[];
  consensusAreas: string[];
  controversialPoints: string[];
  briefType?: 'committee' | 'plenary' | 'public' | 'executive_summary';
  targetAudience?: 'legislators' | 'committee_staff' | 'public' | 'media';
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

export interface GeneratedBrief {
  id: string;
  billId: string;
  briefType: string;
  targetAudience: string;
  executiveSummary: string;
  keyFindings: KeyFinding[];
  stakeholderAnalysis: StakeholderAnalysisSection;
  evidenceAssessment: EvidenceAssessmentSection;
  recommendationsSection: RecommendationsSection;
  appendices: BriefAppendix[];
  metadata: BriefMetadata;
  generatedAt: Date;
}

export interface KeyFinding {
  finding: string;
  supportingEvidence: string[];
  confidence: number;
  implications: string[];
  stakeholdersAffected: string[];
}

export interface StakeholderAnalysisSection {
  overview: string;
  positionBreakdown: {
    support: StakeholderSummary;
    oppose: StakeholderSummary;
    neutral: StakeholderSummary;
    conditional: StakeholderSummary;
  };
  coalitionOpportunities: string[];
  conflictAreas: string[];
}

export interface StakeholderSummary {
  groups: string[];
  participantCount: number;
  keyArguments: string[];
  evidenceQuality: number;
}

export interface EvidenceAssessmentSection {
  overallQuality: string;
  verifiedClaims: number;
  disputedClaims: number;
  evidenceGaps: string[];
  recommendedVerification: string[];
}

export interface RecommendationsSection {
  processRecommendations: string[];
  contentRecommendations: string[];
  engagementRecommendations: string[];
  nextSteps: string[];
}

export interface BriefAppendix {
  title: string;
  content: string;
  type: 'data_tables' | 'full_quotes' | 'methodology' | 'sources';
}

export interface BriefMetadata {
  totalComments: number;
  totalParticipants: number;
  analysisConfidence: number;
  processingTime: number;
  lastUpdated: Date;
  version: string;
}

export class BriefGeneratorService {
  constructor() {}

  /**
   * Generate a comprehensive legislative brief
   */
  async generateBrief(request: BriefGenerationRequest): Promise<GeneratedBrief> {
    const startTime = Date.now();
    
    try {
      logger.info(`📄 Generating legislative brief`, {
        component: 'BriefGenerator',
        billId: request.billId,
        briefType: request.briefType || 'committee',
        targetAudience: request.targetAudience || 'legislators'
      });

      // Step 1: Generate executive summary
      const executiveSummary = this.generateExecutiveSummary(request);

      // Step 2: Extract key findings
      const keyFindings = this.extractKeyFindings(request);

      // Step 3: Analyze stakeholder positions
      const stakeholderAnalysis = this.analyzeStakeholderPositions(request);

      // Step 4: Assess evidence quality
      const evidenceAssessment = this.assessEvidenceQuality(request);

      // Step 5: Generate recommendations
      const recommendationsSection = this.generateRecommendations(request);

      // Step 6: Create appendices
      const appendices = this.createAppendices(request);

      // Step 7: Generate metadata
      const metadata = this.generateMetadata(request, Date.now() - startTime);

      const brief: GeneratedBrief = {
        id: crypto.randomUUID(),
        billId: request.billId,
        briefType: request.briefType || 'committee',
        targetAudience: request.targetAudience || 'legislators',
        executiveSummary,
        keyFindings,
        stakeholderAnalysis,
        evidenceAssessment,
        recommendationsSection,
        appendices,
        metadata,
        generatedAt: new Date()
      };

      logger.info(`✅ Legislative brief generated successfully`, {
        component: 'BriefGenerator',
        billId: request.billId,
        briefLength: executiveSummary.length,
        keyFindings: keyFindings.length,
        processingTime: metadata.processingTime
      });

      return brief;

    } catch (error) {
      logger.error(`❌ Brief generation failed`, {
        component: 'BriefGenerator',
        billId: request.billId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate a quick executive summary
   */
  async generateExecutiveSummary(request: BriefGenerationRequest): Promise<string> {
    const totalParticipants = this.calculateTotalParticipants(request.stakeholderPositions);
    const dominantPosition = this.identifyDominantPosition(request.stakeholderPositions);
    const topConcerns = this.identifyTopConcerns(request.majorClaims);

    let summary = `This brief analyzes ${totalParticipants} citizen submissions regarding the proposed legislation. `;

    // Position summary
    if (dominantPosition.position !== 'mixed') {
      summary += `The majority of stakeholders ${dominantPosition.position} the bill (${dominantPosition.percentage}%). `;
    } else {
      summary += `Stakeholder positions are divided, with significant representation across support, opposition, and conditional positions. `;
    }

    // Key concerns
    if (topConcerns.length > 0) {
      summary += `Primary concerns center on ${topConcerns.slice(0, 3).join(', ')}. `;
    }

    // Consensus and controversy
    if (request.consensusAreas.length > 0) {
      summary += `Areas of broad consensus include ${request.consensusAreas.slice(0, 2).join(' and ')}. `;
    }

    if (request.controversialPoints.length > 0) {
      summary += `Significant disagreement exists regarding ${request.controversialPoints.slice(0, 2).join(' and ')}. `;
    }

    // Evidence quality
    const evidenceQuality = this.assessOverallEvidenceQuality(request.evidenceBase);
    summary += `The overall quality of evidence provided is ${evidenceQuality.toLowerCase()}, with ${this.countVerifiedEvidence(request.evidenceBase)} verified claims supporting the analysis.`;

    return summary;
  }

  /**
   * Generate brief formatted for specific committee
   */
  async generateCommitteeBrief(
    request: BriefGenerationRequest,
    committeeType: 'budget' | 'constitutional' | 'sectoral'
  ): Promise<GeneratedBrief> {
    // Customize brief based on committee type
    const customizedRequest = this.customizeForCommittee(request, committeeType);
    return this.generateBrief(customizedRequest);
  }

  /**
   * Generate public-facing summary
   */
  async generatePublicSummary(request: BriefGenerationRequest): Promise<string> {
    const totalComments = request.majorClaims.reduce((sum, claim) => 
      sum + claim.supportingComments + claim.opposingComments, 0);

    let summary = `Based on analysis of ${totalComments} public comments, here's what citizens are saying about this bill:\n\n`;

    // Top concerns in plain language
    const topClaims = request.majorClaims
      .sort((a, b) => (b.supportingComments + b.opposingComments) - (a.supportingComments + a.opposingComments))
      .slice(0, 5);

    summary += "**Main Points Raised:**\n";
    topClaims.forEach((claim, index) => {
      const totalMentions = claim.supportingComments + claim.opposingComments;
      const supportPercentage = Math.round((claim.supportingComments / totalMentions) * 100);
      
      summary += `${index + 1}. ${this.simplifyLanguage(claim.claimText)} (${totalMentions} comments, ${supportPercentage}% supportive)\n`;
    });

    // Stakeholder breakdown
    summary += "\n**Who's Participating:**\n";
    request.stakeholderPositions.forEach(stakeholder => {
      summary += `- ${this.formatStakeholderName(stakeholder.stakeholderGroup)}: ${stakeholder.participantCount} participants\n`;
    });

    // Areas of agreement and disagreement
    if (request.consensusAreas.length > 0) {
      summary += "\n**Areas of Agreement:**\n";
      request.consensusAreas.forEach(area => {
        summary += `- ${this.simplifyLanguage(area)}\n`;
      });
    }

    if (request.controversialPoints.length > 0) {
      summary += "\n**Areas of Disagreement:**\n";
      request.controversialPoints.forEach(point => {
        summary += `- ${this.simplifyLanguage(point)}\n`;
      });
    }

    return summary;
  }

  // Private helper methods

  private generateExecutiveSummary(request: BriefGenerationRequest): string {
    const totalParticipants = this.calculateTotalParticipants(request.stakeholderPositions);
    const dominantPosition = this.identifyDominantPosition(request.stakeholderPositions);
    const topConcerns = this.identifyTopConcerns(request.majorClaims);

    let summary = `**Executive Summary**\n\n`;
    summary += `This analysis synthesizes input from ${totalParticipants} citizens across ${request.stakeholderPositions.length} stakeholder groups regarding the proposed legislation.\n\n`;

    // Position overview
    summary += `**Overall Position:** `;
    if (dominantPosition.position !== 'mixed') {
      summary += `${dominantPosition.percentage}% of stakeholders ${dominantPosition.position} the bill, with `;
      summary += `${request.stakeholderPositions.filter(s => s.position === 'conditional').length} groups expressing conditional support.\n\n`;
    } else {
      summary += `Stakeholder positions are evenly divided, indicating significant complexity in the proposed legislation.\n\n`;
    }

    // Key themes
    if (topConcerns.length > 0) {
      summary += `**Primary Concerns:** ${topConcerns.slice(0, 3).join(', ')}\n\n`;
    }

    // Evidence quality
    const evidenceQuality = this.assessOverallEvidenceQuality(request.evidenceBase);
    summary += `**Evidence Quality:** ${evidenceQuality} - ${this.countVerifiedEvidence(request.evidenceBase)} verified claims, `;
    summary += `${request.evidenceBase.filter(e => e.verificationStatus === 'disputed').length} disputed claims\n\n`;

    // Recommendations preview
    summary += `**Key Recommendations:** `;
    if (request.controversialPoints.length > 2) {
      summary += `Address controversial provisions through stakeholder consultation. `;
    }
    if (request.consensusAreas.length > 0) {
      summary += `Build on areas of consensus for smoother implementation.`;
    }

    return summary;
  }

  private extractKeyFindings(request: BriefGenerationRequest): KeyFinding[] {
    const findings: KeyFinding[] = [];

    // Finding 1: Stakeholder engagement level
    const totalParticipants = this.calculateTotalParticipants(request.stakeholderPositions);
    findings.push({
      finding: `High level of citizen engagement with ${totalParticipants} participants across diverse stakeholder groups`,
      supportingEvidence: [
        `${request.stakeholderPositions.length} distinct stakeholder groups identified`,
        `Average of ${Math.round(totalParticipants / request.stakeholderPositions.length)} participants per group`
      ],
      confidence: 95,
      implications: [
        'Strong public interest in the legislation',
        'Diverse perspectives need to be considered',
        'Implementation will require broad stakeholder buy-in'
      ],
      stakeholdersAffected: request.stakeholderPositions.map(s => s.stakeholderGroup)
    });

    // Finding 2: Position distribution
    const positionBreakdown = this.calculatePositionBreakdown(request.stakeholderPositions);
    findings.push({
      finding: `Stakeholder positions show ${positionBreakdown.support > 50 ? 'majority support' : positionBreakdown.oppose > 50 ? 'majority opposition' : 'divided opinion'}`,
      supportingEvidence: [
        `${positionBreakdown.support}% support, ${positionBreakdown.oppose}% oppose, ${positionBreakdown.conditional}% conditional`
      ],
      confidence: 90,
      implications: this.generatePositionImplications(positionBreakdown),
      stakeholdersAffected: request.stakeholderPositions.map(s => s.stakeholderGroup)
    });

    // Finding 3: Evidence quality assessment
    const evidenceQuality = this.assessOverallEvidenceQuality(request.evidenceBase);
    const verifiedCount = this.countVerifiedEvidence(request.evidenceBase);
    findings.push({
      finding: `Evidence quality is ${evidenceQuality.toLowerCase()} with ${verifiedCount} verified claims`,
      supportingEvidence: [
        `${request.evidenceBase.filter(e => e.verificationStatus === 'verified').length} verified sources`,
        `${request.evidenceBase.filter(e => e.verificationStatus === 'disputed').length} disputed claims`,
        `Average credibility score: ${this.calculateAverageCredibility(request.evidenceBase)}`
      ],
      confidence: 85,
      implications: [
        evidenceQuality === 'High' ? 'Strong factual basis for decision-making' : 'Additional verification may be needed',
        'Evidence gaps should be addressed through expert consultation'
      ],
      stakeholdersAffected: request.stakeholderPositions.filter(s => s.evidenceProvided.length > 0).map(s => s.stakeholderGroup)
    });

    // Finding 4: Consensus and controversy analysis
    if (request.consensusAreas.length > 0 || request.controversialPoints.length > 0) {
      findings.push({
        finding: `${request.consensusAreas.length} areas of consensus identified, ${request.controversialPoints.length} controversial points require attention`,
        supportingEvidence: [
          ...request.consensusAreas.map(area => `Consensus: ${area}`),
          ...request.controversialPoints.map(point => `Controversial: ${point}`)
        ],
        confidence: 80,
        implications: [
          'Build legislative strategy around consensus areas',
          'Address controversial points through targeted consultation',
          'Consider phased implementation for disputed provisions'
        ],
        stakeholdersAffected: request.stakeholderPositions.map(s => s.stakeholderGroup)
      });
    }

    return findings;
  }

  private analyzeStakeholderPositions(request: BriefGenerationRequest): StakeholderAnalysisSection {
    const positionBreakdown = {
      support: this.summarizeStakeholdersByPosition(request.stakeholderPositions, 'support'),
      oppose: this.summarizeStakeholdersByPosition(request.stakeholderPositions, 'oppose'),
      neutral: this.summarizeStakeholdersByPosition(request.stakeholderPositions, 'neutral'),
      conditional: this.summarizeStakeholdersByPosition(request.stakeholderPositions, 'conditional')
    };

    const overview = this.generateStakeholderOverview(request.stakeholderPositions);
    const coalitionOpportunities = this.identifyCoalitionOpportunities(request.stakeholderPositions);
    const conflictAreas = this.identifyConflictAreas(request.stakeholderPositions, request.controversialPoints);

    return {
      overview,
      positionBreakdown,
      coalitionOpportunities,
      conflictAreas
    };
  }

  private assessEvidenceQuality(request: BriefGenerationRequest): EvidenceAssessmentSection {
    const overallQuality = this.assessOverallEvidenceQuality(request.evidenceBase);
    const verifiedClaims = request.evidenceBase.filter(e => e.verificationStatus === 'verified').length;
    const disputedClaims = request.evidenceBase.filter(e => e.verificationStatus === 'disputed').length;
    const evidenceGaps = this.identifyEvidenceGaps(request);
    const recommendedVerification = this.recommendVerificationActions(request.evidenceBase);

    return {
      overallQuality,
      verifiedClaims,
      disputedClaims,
      evidenceGaps,
      recommendedVerification
    };
  }

  private generateRecommendations(request: BriefGenerationRequest): RecommendationsSection {
    const processRecommendations = this.generateProcessRecommendations(request);
    const contentRecommendations = this.generateContentRecommendations(request);
    const engagementRecommendations = this.generateEngagementRecommendations(request);
    const nextSteps = this.generateNextSteps(request);

    return {
      processRecommendations,
      contentRecommendations,
      engagementRecommendations,
      nextSteps
    };
  }

  private createAppendices(request: BriefGenerationRequest): BriefAppendix[] {
    const appendices: BriefAppendix[] = [];

    // Data tables appendix
    appendices.push({
      title: 'Stakeholder Participation Data',
      content: this.generateDataTablesContent(request),
      type: 'data_tables'
    });

    // Representative quotes
    appendices.push({
      title: 'Representative Citizen Quotes',
      content: this.generateQuotesContent(request),
      type: 'full_quotes'
    });

    // Methodology
    appendices.push({
      title: 'Analysis Methodology',
      content: this.generateMethodologyContent(),
      type: 'methodology'
    });

    return appendices;
  }

  private generateMetadata(request: BriefGenerationRequest, processingTime: number): BriefMetadata {
    const totalComments = request.majorClaims.reduce((sum, claim) => 
      sum + claim.supportingComments + claim.opposingComments, 0);
    const totalParticipants = this.calculateTotalParticipants(request.stakeholderPositions);
    const analysisConfidence = this.calculateAnalysisConfidence(request);

    return {
      totalComments,
      totalParticipants,
      analysisConfidence,
      processingTime,
      lastUpdated: new Date(),
      version: '1.0.0'
    };
  }

  // Helper methods for calculations and formatting

  private calculateTotalParticipants(stakeholderPositions: StakeholderPosition[]): number {
    return stakeholderPositions.reduce((sum, position) => sum + position.participantCount, 0);
  }

  private identifyDominantPosition(stakeholderPositions: StakeholderPosition[]): { position: string; percentage: number } {
    const positionCounts = {
      support: 0,
      oppose: 0,
      neutral: 0,
      conditional: 0
    };

    stakeholderPositions.forEach(pos => {
      positionCounts[pos.position] += pos.participantCount;
    });

    const total = Object.values(positionCounts).reduce((sum, count) => sum + count, 0);
    const maxCount = Math.max(...Object.values(positionCounts));
    const maxPosition = Object.entries(positionCounts).find(([_, count]) => count === maxCount)?.[0] || 'mixed';
    const percentage = total > 0 ? Math.round((maxCount / total) * 100) : 0;

    return { position: maxPosition, percentage };
  }

  private identifyTopConcerns(majorClaims: SynthesizedClaim[]): string[] {
    return majorClaims
      .sort((a, b) => (b.supportingComments + b.opposingComments) - (a.supportingComments + a.opposingComments))
      .slice(0, 5)
      .map(claim => this.extractConcernFromClaim(claim.claimText));
  }

  private extractConcernFromClaim(claimText: string): string {
    // Simplified concern extraction - in practice would use NLP
    const lowerText = claimText.toLowerCase();
    
    if (lowerText.includes('cost') || lowerText.includes('expensive')) return 'economic impact';
    if (lowerText.includes('job') || lowerText.includes('employment')) return 'employment effects';
    if (lowerText.includes('health') || lowerText.includes('safety')) return 'health and safety';
    if (lowerText.includes('environment') || lowerText.includes('pollution')) return 'environmental impact';
    if (lowerText.includes('fair') || lowerText.includes('equality')) return 'fairness and equity';
    
    return 'implementation concerns';
  }

  private assessOverallEvidenceQuality(evidenceBase: EvidenceAssessment[]): string {
    if (evidenceBase.length === 0) return 'No Evidence';
    
    const avgCredibility = evidenceBase.reduce((sum, e) => sum + e.credibilityScore, 0) / evidenceBase.length;
    const verifiedPercentage = (evidenceBase.filter(e => e.verificationStatus === 'verified').length / evidenceBase.length) * 100;
    
    if (avgCredibility > 80 && verifiedPercentage > 70) return 'High';
    if (avgCredibility > 60 && verifiedPercentage > 50) return 'Moderate';
    return 'Low';
  }

  private countVerifiedEvidence(evidenceBase: EvidenceAssessment[]): number {
    return evidenceBase.filter(e => e.verificationStatus === 'verified').length;
  }

  private calculatePositionBreakdown(stakeholderPositions: StakeholderPosition[]): {
    support: number;
    oppose: number;
    neutral: number;
    conditional: number;
  } {
    const total = this.calculateTotalParticipants(stakeholderPositions);
    const counts = { support: 0, oppose: 0, neutral: 0, conditional: 0 };
    
    stakeholderPositions.forEach(pos => {
      counts[pos.position] += pos.participantCount;
    });

    return {
      support: Math.round((counts.support / total) * 100),
      oppose: Math.round((counts.oppose / total) * 100),
      neutral: Math.round((counts.neutral / total) * 100),
      conditional: Math.round((counts.conditional / total) * 100)
    };
  }

  private generatePositionImplications(breakdown: { support: number; oppose: number; neutral: number; conditional: number }): string[] {
    const implications: string[] = [];
    
    if (breakdown.support > 60) {
      implications.push('Strong public support suggests smooth implementation');
      implications.push('Focus on addressing concerns of opposing groups');
    } else if (breakdown.oppose > 60) {
      implications.push('Significant opposition requires careful consideration');
      implications.push('Major revisions or stakeholder consultation may be needed');
    } else {
      implications.push('Divided opinion requires balanced approach');
      implications.push('Build consensus through targeted engagement');
    }

    if (breakdown.conditional > 20) {
      implications.push('Conditional support suggests room for compromise');
    }

    return implications;
  }

  private calculateAverageCredibility(evidenceBase: EvidenceAssessment[]): number {
    if (evidenceBase.length === 0) return 0;
    return Math.round(evidenceBase.reduce((sum, e) => sum + e.credibilityScore, 0) / evidenceBase.length);
  }

  private summarizeStakeholdersByPosition(
    stakeholderPositions: StakeholderPosition[],
    position: 'support' | 'oppose' | 'neutral' | 'conditional'
  ): StakeholderSummary {
    const filtered = stakeholderPositions.filter(s => s.position === position);
    
    return {
      groups: filtered.map(s => s.stakeholderGroup),
      participantCount: filtered.reduce((sum, s) => sum + s.participantCount, 0),
      keyArguments: filtered.flatMap(s => s.keyArguments).slice(0, 5),
      evidenceQuality: this.calculateGroupEvidenceQuality(filtered)
    };
  }

  private calculateGroupEvidenceQuality(stakeholders: StakeholderPosition[]): number {
    const totalEvidence = stakeholders.reduce((sum, s) => sum + s.evidenceProvided.length, 0);
    const totalParticipants = stakeholders.reduce((sum, s) => sum + s.participantCount, 0);
    
    return totalParticipants > 0 ? Math.min(100, (totalEvidence / totalParticipants) * 50) : 0;
  }

  private generateStakeholderOverview(stakeholderPositions: StakeholderPosition[]): string {
    const totalGroups = stakeholderPositions.length;
    const totalParticipants = this.calculateTotalParticipants(stakeholderPositions);
    const avgParticipation = Math.round(totalParticipants / totalGroups);

    return `Analysis covers ${totalGroups} distinct stakeholder groups with ${totalParticipants} total participants (average ${avgParticipation} per group). Stakeholder engagement shows strong diversity across sectors, with representation from both organized groups and individual citizens.`;
  }

  private identifyCoalitionOpportunities(stakeholderPositions: StakeholderPosition[]): string[] {
    const opportunities: string[] = [];
    
    // Groups with same position
    const positionGroups = new Map<string, StakeholderPosition[]>();
    stakeholderPositions.forEach(pos => {
      if (!positionGroups.has(pos.position)) {
        positionGroups.set(pos.position, []);
      }
      positionGroups.get(pos.position)!.push(pos);
    });

    for (const [position, groups] of positionGroups.entries()) {
      if (groups.length > 1 && position !== 'neutral') {
        opportunities.push(`${groups.length} stakeholder groups share ${position} position - potential for unified advocacy`);
      }
    }

    return opportunities;
  }

  private identifyConflictAreas(stakeholderPositions: StakeholderPosition[], controversialPoints: string[]): string[] {
    const conflicts: string[] = [];
    
    controversialPoints.forEach(point => {
      conflicts.push(`Disagreement on: ${point}`);
    });

    // Position-based conflicts
    const supportGroups = stakeholderPositions.filter(s => s.position === 'support').length;
    const opposeGroups = stakeholderPositions.filter(s => s.position === 'oppose').length;
    
    if (supportGroups > 0 && opposeGroups > 0) {
      conflicts.push(`${supportGroups} groups support vs ${opposeGroups} groups oppose - fundamental position divide`);
    }

    return conflicts;
  }

  private identifyEvidenceGaps(request: BriefGenerationRequest): string[] {
    const gaps: string[] = [];
    
    const unverifiedCount = request.evidenceBase.filter(e => e.verificationStatus === 'unverified').length;
    if (unverifiedCount > request.evidenceBase.length * 0.3) {
      gaps.push('High proportion of unverified claims');
    }

    const statisticalEvidence = request.evidenceBase.filter(e => e.evidenceType === 'statistical').length;
    if (statisticalEvidence < 3) {
      gaps.push('Limited statistical evidence provided');
    }

    const expertOpinions = request.evidenceBase.filter(e => e.evidenceType === 'expert_opinion').length;
    if (expertOpinions < 2) {
      gaps.push('Few expert opinions cited');
    }

    return gaps;
  }

  private recommendVerificationActions(evidenceBase: EvidenceAssessment[]): string[] {
    const actions: string[] = [];
    
    const disputedClaims = evidenceBase.filter(e => e.verificationStatus === 'disputed');
    if (disputedClaims.length > 0) {
      actions.push(`Resolve ${disputedClaims.length} disputed claims through expert review`);
    }

    const lowCredibility = evidenceBase.filter(e => e.credibilityScore < 50);
    if (lowCredibility.length > 0) {
      actions.push(`Verify ${lowCredibility.length} low-credibility sources`);
    }

    return actions;
  }

  private generateProcessRecommendations(request: BriefGenerationRequest): string[] {
    const recommendations: string[] = [];
    
    if (request.controversialPoints.length > 2) {
      recommendations.push('Conduct additional stakeholder consultation on controversial provisions');
    }

    const conditionalGroups = request.stakeholderPositions.filter(s => s.position === 'conditional').length;
    if (conditionalGroups > 0) {
      recommendations.push('Explore compromise solutions with conditionally supportive stakeholders');
    }

    if (request.evidenceBase.filter(e => e.verificationStatus === 'verified').length < 5) {
      recommendations.push('Strengthen evidence base through expert consultation');
    }

    return recommendations;
  }

  private generateContentRecommendations(request: BriefGenerationRequest): string[] {
    const recommendations: string[] = [];
    
    request.controversialPoints.forEach(point => {
      recommendations.push(`Address concerns about: ${point}`);
    });

    if (request.consensusAreas.length > 0) {
      recommendations.push('Build on consensus areas for broader support');
    }

    return recommendations;
  }

  private generateEngagementRecommendations(request: BriefGenerationRequest): string[] {
    const recommendations: string[] = [];
    
    const lowParticipationGroups = request.stakeholderPositions.filter(s => s.participantCount < 5);
    if (lowParticipationGroups.length > 0) {
      recommendations.push('Increase outreach to underrepresented stakeholder groups');
    }

    recommendations.push('Maintain ongoing dialogue throughout legislative process');
    recommendations.push('Provide regular updates on how citizen input influences decisions');

    return recommendations;
  }

  private generateNextSteps(request: BriefGenerationRequest): string[] {
    const steps: string[] = [];
    
    steps.push('Present findings to relevant parliamentary committee');
    steps.push('Schedule follow-up consultation on controversial points');
    
    if (request.evidenceBase.filter(e => e.verificationStatus === 'disputed').length > 0) {
      steps.push('Conduct expert review of disputed evidence claims');
    }

    steps.push('Monitor ongoing citizen engagement and update analysis');

    return steps;
  }

  private generateDataTablesContent(request: BriefGenerationRequest): string {
    let content = '**Stakeholder Participation Summary**\n\n';
    content += '| Stakeholder Group | Position | Participants | Key Arguments |\n';
    content += '|-------------------|----------|--------------|---------------|\n';
    
    request.stakeholderPositions.forEach(pos => {
      content += `| ${pos.stakeholderGroup} | ${pos.position} | ${pos.participantCount} | ${pos.keyArguments.slice(0, 2).join('; ')} |\n`;
    });

    return content;
  }

  private generateQuotesContent(request: BriefGenerationRequest): string {
    let content = '**Representative Citizen Quotes**\n\n';
    
    request.majorClaims.forEach((claim, index) => {
      content += `**Claim ${index + 1}:** ${claim.claimText}\n`;
      content += `*Support: ${claim.supportingComments} comments, Opposition: ${claim.opposingComments} comments*\n\n`;
      
      claim.representativeQuotes.slice(0, 2).forEach(quote => {
        content += `> "${quote}"\n\n`;
      });
    });

    return content;
  }

  private generateMethodologyContent(): string {
    return `**Analysis Methodology**

This brief was generated using automated argument intelligence analysis with the following methodology:

1. **Argument Extraction**: Natural language processing to identify claims, evidence, and reasoning from citizen comments
2. **Clustering**: Semantic similarity analysis to group related arguments and identify patterns
3. **Evidence Validation**: Automated verification of cited sources and fact-checking where possible
4. **Stakeholder Analysis**: Demographic and positional analysis of participant groups
5. **Coalition Identification**: Analysis of shared concerns and potential alliances
6. **Synthesis**: Automated generation of structured findings and recommendations

**Confidence Levels**: Analysis confidence is calculated based on argument extraction accuracy, evidence quality, and stakeholder representation diversity.

**Limitations**: Automated analysis may miss nuanced arguments or context. Expert review is recommended for complex or controversial findings.`;
  }

  private calculateAnalysisConfidence(request: BriefGenerationRequest): number {
    let confidence = 70; // Base confidence
    
    // Boost for good evidence
    const evidenceQuality = this.assessOverallEvidenceQuality(request.evidenceBase);
    if (evidenceQuality === 'High') confidence += 15;
    else if (evidenceQuality === 'Moderate') confidence += 5;
    
    // Boost for diverse stakeholder participation
    if (request.stakeholderPositions.length > 5) confidence += 10;
    
    // Boost for clear consensus or controversy patterns
    if (request.consensusAreas.length > 2 || request.controversialPoints.length > 2) {
      confidence += 5;
    }

    return Math.min(95, confidence);
  }

  private customizeForCommittee(
    request: BriefGenerationRequest,
    committeeType: 'budget' | 'constitutional' | 'sectoral'
  ): BriefGenerationRequest {
    const customized = { ...request };
    
    switch (committeeType) {
      case 'budget':
        customized.briefType = 'committee';
        customized.targetAudience = 'legislators';
        // Filter for economic-related claims
        customized.majorClaims = request.majorClaims.filter(claim => 
          claim.claimText.toLowerCase().includes('cost') || 
          claim.claimText.toLowerCase().includes('budget') ||
          claim.claimText.toLowerCase().includes('economic')
        );
        break;
        
      case 'constitutional':
        customized.briefType = 'committee';
        // Filter for rights-related claims
        customized.majorClaims = request.majorClaims.filter(claim =>
          claim.claimText.toLowerCase().includes('right') ||
          claim.claimText.toLowerCase().includes('constitutional') ||
          claim.claimText.toLowerCase().includes('freedom')
        );
        break;
        
      case 'sectoral':
        customized.briefType = 'committee';
        // Keep all claims but emphasize sector-specific impacts
        break;
    }

    return customized;
  }

  private simplifyLanguage(text: string): string {
    // Simplified language conversion for public summaries
    return text
      .replace(/pursuant to/g, 'according to')
      .replace(/notwithstanding/g, 'despite')
      .replace(/aforementioned/g, 'mentioned')
      .replace(/heretofore/g, 'previously')
      .replace(/whereas/g, 'while');
  }

  private formatStakeholderName(group: string): string {
    return group
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}