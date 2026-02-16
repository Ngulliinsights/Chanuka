// ============================================================================
// CONSTITUTIONAL ANALYZER - Core Analysis Engine
// ============================================================================
// Main service that orchestrates constitutional analysis of bills

import { ExpertFlaggingService } from '@server/features/constitutional-analysis/application/expert-flagging-service.ts';
import { PrecedentFinderService } from '@server/features/constitutional-analysis/application/precedent-finder.ts';
import { ProvisionMatcherService } from '@server/features/constitutional-analysis/application/provision-matcher.ts';
import { logger  } from '@shared/core';
import { ConstitutionalAnalysesRepository } from '@shared/infrastructure/repositories/constitutional-analyses-repository.js';
import { ConstitutionalProvisionsRepository } from '@shared/infrastructure/repositories/constitutional-provisions-repository.js';
import { LegalPrecedentsRepository } from '@shared/infrastructure/repositories/legal-precedents-repository.js';
import { ConstitutionalAnalysis,ConstitutionalProvision, LegalPrecedent } from '@server/infrastructure/schema/index.js';

export interface AnalysisRequest {
  bill_id: string;
  billTitle: string;
  billContent: string;
  billType?: string;
  urgentAnalysis?: boolean;
}

export interface AnalysisResult {
  bill_id: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  overallConfidence: number; // 0-100
  analyses: ConstitutionalAnalysis[];
  flaggedForExpertReview: boolean;
  summary: {
    totalProvisions: number;
    highRiskCount: number;
    lowConfidenceCount: number;
    requiresUrgentReview: boolean;
  };
  processingTime: number;
}

export class ConstitutionalAnalyzer {
  constructor(
    private readonly provisionMatcher: ProvisionMatcherService,
    private readonly precedentFinder: PrecedentFinderService,
    private readonly expertFlagger: ExpertFlaggingService,
    private readonly provisionsRepo: ConstitutionalProvisionsRepository,
    private readonly precedentsRepo: LegalPrecedentsRepository,
    private readonly analysesRepo: ConstitutionalAnalysesRepository
  ) {}

  /**
   * Performs comprehensive constitutional analysis of a bill
   */
  async analyzeBill(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🏛️ Starting constitutional analysis for bill ${request.bill_id}`, {
        component: 'ConstitutionalAnalyzer',
        bill_id: request.bill_id,
        urgent: request.urgentAnalysis
      });

      // Step 1: Find relevant constitutional provisions
      const relevantProvisions = await this.provisionMatcher.findRelevantProvisions(
        request.billContent,
        request.billTitle
      );

      if (relevantProvisions.length === 0) {
        logger.info(`No constitutional provisions identified for bill ${request.bill_id}`);
        return this.createMinimalResult(request.bill_id, startTime);
      }

      // Step 2: Analyze each provision against the bill
      const analyses: ConstitutionalAnalysis[] = [];
      
      for (const provision of relevantProvisions) {
        const analysis = await this.analyzeProvision(request, provision);
        if (analysis) {
          analyses.push(analysis);
          // Save analysis to database
          await this.analysesRepo.save(analysis);
        }
      }

      // Step 3: Calculate overall risk and confidence
      const overallRisk = this.calculateOverallRisk(analyses);
      const overallConfidence = this.calculateOverallConfidence(analyses);

      // Step 4: Check if expert review is needed
      const flaggedForExpertReview = await this.expertFlagger.shouldFlagForReview(
        analyses,
        overallRisk,
        overallConfidence
      );

      // Step 5: Generate summary
      const summary = this.generateSummary(analyses);

      const result: AnalysisResult = {
        bill_id: request.bill_id,
        overallRisk,
        overallConfidence,
        analyses,
        flaggedForExpertReview,
        summary,
        processingTime: Date.now() - startTime
      };

      logger.info(`✅ Constitutional analysis completed for bill ${request.bill_id}`, {
        component: 'ConstitutionalAnalyzer',
        bill_id: request.bill_id,
        overallRisk,
        overallConfidence,
        analysisCount: analyses.length,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      logger.error(`❌ Constitutional analysis failed for bill ${request.bill_id}`, {
        component: 'ConstitutionalAnalyzer',
        bill_id: request.bill_id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Analyzes a specific constitutional provision against the bill
   */
  private async analyzeProvision(
    request: AnalysisRequest,
    provision: ConstitutionalProvision
  ): Promise<ConstitutionalAnalysis | null> {
    try {
      // Find relevant precedents for this provision
      const precedents = await this.precedentFinder.findRelevantPrecedents(
        provision.id,
        request.billContent
      );

      // Determine analysis type based on content analysis
      const analysisType = this.determineAnalysisType(request.billContent, provision);
      
      // Calculate confidence based on multiple factors
      const confidence = this.calculateProvisionConfidence(
        request.billContent,
        provision,
        precedents
      );

      // Assess constitutional risk
      const risk = this.assessConstitutionalRisk(
        analysisType,
        provision,
        precedents,
        confidence
      );

      // Calculate impact severity
      const impactSeverity = this.calculateImpactSeverity(
        provision,
        analysisType,
        risk
      );

      // Generate human-readable analysis
      const analysisText = this.generateAnalysisText(
        provision,
        analysisType,
        precedents,
        risk
      );

      // Create reasoning chain for transparency
      const reasoningChain = {
        provisionMatched: {
          article: provision.article_number,
          section: provision.section_number,
          keywords: provision.keywords
        },
        analysisFactors: {
          contentMatches: this.findContentMatches(request.billContent, provision),
          precedentCount: precedents.length,
          highRelevancePrecedents: precedents.filter(p => p.relevance_score_percentage > 80).length
        },
        riskFactors: this.identifyRiskFactors(provision, analysisType, precedents)
      };

      const analysis: ConstitutionalAnalysis = {
        id: crypto.randomUUID(),
        bill_id: request.bill_id,
        provision_id: provision.id,
        analysis_type: analysisType,
        confidence_percentage: confidence,
        analysis_text: analysisText,
        reasoning_chain: reasoningChain,
        supporting_precedents: precedents.map(p => p.id),
        constitutional_risk: risk,
        risk_explanation: this.generateRiskExplanation(risk, provision, analysisType),
        impact_severity_percentage: impactSeverity,
        requires_expert_review: confidence < 75 || risk === 'critical',
        expert_reviewed: false,
        analysis_method: 'automated_v1',
        analysis_version: '1.0.0',
        created_at: new Date(),
        updated_at: new Date()
      };

      return analysis;

    } catch (error) {
      logger.error(`Failed to analyze provision ${provision.id} for bill ${request.bill_id}`, {
        component: 'ConstitutionalAnalyzer',
        provisionId: provision.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private determineAnalysisType(
    billContent: string,
    provision: ConstitutionalProvision
  ): 'potential_conflict' | 'requires_compliance' | 'empowers' | 'restricts' | 'clarifies' {
    const content = billContent.toLowerCase();
    const provisionText = provision.provision_text.toLowerCase();

    // Look for conflict indicators
    if (content.includes('prohibit') || content.includes('restrict') || content.includes('limit')) {
      if (provision.rights_category === 'expression' || provision.rights_category === 'religion') {
        return 'potential_conflict';
      }
      return 'restricts';
    }

    // Look for empowerment indicators
    if (content.includes('empower') || content.includes('authorize') || content.includes('enable')) {
      return 'empowers';
    }

    // Look for compliance requirements
    if (content.includes('comply') || content.includes('accordance') || content.includes('pursuant')) {
      return 'requires_compliance';
    }

    // Look for clarification indicators
    if (content.includes('clarify') || content.includes('define') || content.includes('interpret')) {
      return 'clarifies';
    }

    // Default to potential conflict for rights-related provisions
    if (provision.rights_category) {
      return 'potential_conflict';
    }

    return 'requires_compliance';
  }

  private calculateProvisionConfidence(
    billContent: string,
    provision: ConstitutionalProvision,
    precedents: LegalPrecedent[]
  ): number {
    let confidence = 50; // Base confidence

    // Keyword matching confidence
    const keywordMatches = provision.keywords.filter(keyword =>
      billContent.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    confidence += Math.min(keywordMatches * 10, 30);

    // Precedent support confidence
    const highQualityPrecedents = precedents.filter(p => p.relevance_score_percentage > 70).length;
    confidence += Math.min(highQualityPrecedents * 5, 20);

    // Provision specificity confidence
    if (provision.section_number && provision.subsection_number) {
      confidence += 10; // More specific provisions = higher confidence
    }

    return Math.min(confidence, 100);
  }

  private assessConstitutionalRisk(
    analysisType: string,
    provision: ConstitutionalProvision,
    precedents: LegalPrecedent[],
    confidence: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical risk factors
    if (analysisType === 'potential_conflict' && provision.rights_category === 'expression') {
      return 'critical';
    }

    if (analysisType === 'potential_conflict' && provision.rights_category === 'religion') {
      return 'high';
    }

    // High risk if conflicting precedents exist
    const conflictingPrecedents = precedents.filter(p => 
      p.holding.toLowerCase().includes('unconstitutional') ||
      p.holding.toLowerCase().includes('violation')
    );
    
    if (conflictingPrecedents.length > 0) {
      return 'high';
    }

    // Medium risk for restrictions on rights
    if (analysisType === 'restricts' && provision.rights_category) {
      return 'medium';
    }

    // Low confidence = higher risk
    if (confidence < 60) {
      return 'medium';
    }

    return 'low';
  }

  private calculateImpactSeverity(
    provision: ConstitutionalProvision,
    analysisType: string,
    risk: string
  ): number {
    let severity = 30; // Base severity

    // Risk-based severity
    const riskMultipliers = {
      'low': 1.0,
      'medium': 1.5,
      'high': 2.0,
      'critical': 2.5
    };
    severity *= riskMultipliers[risk as keyof typeof riskMultipliers];

    // Rights category severity
    if (provision.rights_category === 'expression' || provision.rights_category === 'religion') {
      severity += 20;
    }

    // Analysis type severity
    if (analysisType === 'potential_conflict') {
      severity += 15;
    }

    return Math.min(Math.round(severity), 100);
  }

  private generateAnalysisText(
    provision: ConstitutionalProvision,
    analysisType: string,
    precedents: LegalPrecedent[],
    risk: string
  ): string {
    const article = `Article ${provision.article_number}`;
    const section = provision.section_number ? `, Section ${provision.section_number}` : '';
    
    let text = `This bill ${analysisType.replace('_', ' ')} ${article}${section} of the Constitution`;
    
    if (provision.provision_summary) {
      text += `, which ${provision.provision_summary.toLowerCase()}`;
    }
    
    text += '. ';

    if (precedents.length > 0) {
      const topPrecedent = precedents[0];
      text += `Relevant precedent includes ${topPrecedent.case_name} (${topPrecedent.judgment_date.getFullYear()}), which ${topPrecedent.holding.toLowerCase()}. `;
    }

    if (risk === 'critical' || risk === 'high') {
      text += 'This raises significant constitutional concerns that require careful legal review.';
    } else if (risk === 'medium') {
      text += 'This may raise constitutional questions that should be considered during legislative review.';
    } else {
      text += 'This appears to be consistent with constitutional requirements.';
    }

    return text;
  }

  private generateRiskExplanation(
    risk: string,
    provision: ConstitutionalProvision,
    analysisType: string
  ): string {
    switch (risk) {
      case 'critical':
        return `Critical constitutional risk identified due to potential conflict with fundamental rights protected under Article ${provision.article_number}.`;
      case 'high':
        return `High constitutional risk due to ${analysisType.replace('_', ' ')} of constitutional provisions governing ${provision.rights_category || 'governmental powers'}.`;
      case 'medium':
        return `Moderate constitutional risk requiring review of compliance with Article ${provision.article_number} requirements.`;
      default:
        return `Low constitutional risk with apparent compliance with constitutional requirements.`;
    }
  }

  private findContentMatches(billContent: string, provision: ConstitutionalProvision): string[] {
    const matches: string[] = [];
    const content = billContent.toLowerCase();
    
    provision.keywords.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        matches.push(keyword);
      }
    });

    return matches;
  }

  private identifyRiskFactors(
    provision: ConstitutionalProvision,
    analysisType: string,
    precedents: LegalPrecedent[]
  ): string[] {
    const factors: string[] = [];

    if (analysisType === 'potential_conflict') {
      factors.push('Potential constitutional conflict identified');
    }

    if (provision.rights_category === 'expression') {
      factors.push('Affects fundamental freedom of expression');
    }

    if (provision.rights_category === 'religion') {
      factors.push('Affects religious freedom protections');
    }

    const conflictingPrecedents = precedents.filter(p => 
      p.holding.toLowerCase().includes('unconstitutional')
    );
    
    if (conflictingPrecedents.length > 0) {
      factors.push(`${conflictingPrecedents.length} precedent(s) found constitutional violations`);
    }

    return factors;
  }

  private calculateOverallRisk(analyses: ConstitutionalAnalysis[]): 'low' | 'medium' | 'high' | 'critical' {
    if (analyses.some(a => a.constitutional_risk === 'critical')) return 'critical';
    if (analyses.some(a => a.constitutional_risk === 'high')) return 'high';
    if (analyses.some(a => a.constitutional_risk === 'medium')) return 'medium';
    return 'low';
  }

  private calculateOverallConfidence(analyses: ConstitutionalAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    const totalConfidence = analyses.reduce((sum, a) => sum + a.confidence_percentage, 0);
    return Math.round(totalConfidence / analyses.length);
  }

  private generateSummary(analyses: ConstitutionalAnalysis[]) {
    return {
      totalProvisions: analyses.length,
      highRiskCount: analyses.filter(a => a.constitutional_risk === 'high' || a.constitutional_risk === 'critical').length,
      lowConfidenceCount: analyses.filter(a => a.confidence_percentage < 75).length,
      requiresUrgentReview: analyses.some(a => a.constitutional_risk === 'critical' && a.confidence_percentage > 80)
    };
  }

  private createMinimalResult(bill_id: string, startTime: number): AnalysisResult {
    return {
      bill_id,
      overallRisk: 'low',
      overallConfidence: 95,
      analyses: [],
      flaggedForExpertReview: false,
      summary: {
        totalProvisions: 0,
        highRiskCount: 0,
        lowConfidenceCount: 0,
        requiresUrgentReview: false
      },
      processingTime: Date.now() - startTime
    };
  }
}


