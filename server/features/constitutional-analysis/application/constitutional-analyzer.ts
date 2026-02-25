// ============================================================================
// CONSTITUTIONAL ANALYZER - Core Analysis Engine
// ============================================================================
// Main service that orchestrates constitutional analysis of bills

import { ExpertFlaggingService } from '@server/features/constitutional-analysis/application/expert-flagging-service';
import { PrecedentFinderService } from '@server/features/constitutional-analysis/application/precedent-finder';
import { ProvisionMatcherService } from '@server/features/constitutional-analysis/application/provision-matcher';
import { logger } from '@server/infrastructure/observability';
import type { ConstitutionalProvision, LegalPrecedent } from '@server/infrastructure/schema/index';

// Define the ConstitutionalAnalysis interface based on the schema
export interface ConstitutionalAnalysis {
  id: string;
  bill_id: string;
  provision_id?: string;
  analysis_type: string;
  confidence_percentage: number;
  analysis_text: string;
  reasoning_chain: Record<string, unknown>;
  supporting_precedents: string[];
  constitutional_risk: 'low' | 'medium' | 'high' | 'critical';
  risk_explanation: string;
  impact_severity_percentage: number;
  requires_expert_review: boolean;
  expert_reviewed: boolean;
  analysis_method: string;
  analysis_version: number;
  created_at: Date;
  updated_at: Date;
}

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
    private readonly expertFlagger: ExpertFlaggingService
  ) {}

  /**
   * Performs comprehensive constitutional analysis of a bill
   */
  async analyzeBill(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info({
        component: 'ConstitutionalAnalyzer',
        bill_id: request.bill_id,
        urgent: request.urgentAnalysis
      }, '🏛️ Starting constitutional analysis for bill');

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
          // Note: Save analysis to database via repository when available
        }
      }

      // Step 3: Calculate overall risk and confidence
      const overallRisk = this.calculateOverallRisk(analyses);
      const overallConfidence = this.calculateOverallConfidence(analyses);

      // Step 4: Check if expert review is needed
      // Note: Type casting needed as expertFlagger expects schema type
      const flaggedForExpertReview = await this.expertFlagger.shouldFlagForReview(
        analyses as any,
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

      logger.info({
        component: 'ConstitutionalAnalyzer',
        bill_id: request.bill_id,
        overallRisk,
        overallConfidence,
        analysisCount: analyses.length,
        processingTime: result.processingTime
      }, '✅ Constitutional analysis completed for bill');

      return result;

    } catch (error) {
      logger.error({
        component: 'ConstitutionalAnalyzer',
        bill_id: request.bill_id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, '❌ Constitutional analysis failed for bill');
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
          highRelevancePrecedents: precedents.length > 0 ? Math.ceil(precedents.length * 0.5) : 0
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
        analysis_version: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      return analysis;

    } catch (error) {
      logger.error({
        component: 'ConstitutionalAnalyzer',
        provisionId: provision.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to analyze provision for bill');
      return null;
    }
  }

  private determineAnalysisType(
    billContent: string,
    _provision: ConstitutionalProvision
  ): 'potential_conflict' | 'requires_compliance' | 'empowers' | 'restricts' | 'clarifies' {
    const content = billContent.toLowerCase();

    // Look for conflict indicators
    if (content.includes('prohibit') || content.includes('restrict') || content.includes('limit')) {
      if (_provision.is_fundamental_right) {
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
    if (_provision.is_fundamental_right) {
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
    const keywordMatches = provision.keywords.filter((keyword: string) =>
      billContent.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    confidence += Math.min(keywordMatches * 10, 30);

    // Precedent support confidence - use actual precedent count
    const highQualityPrecedents = Math.min(precedents.length, 4);
    confidence += highQualityPrecedents * 5;

    // Provision specificity confidence
    if (provision.section_number && provision.clause_number) {
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
    if (analysisType === 'potential_conflict' && provision.is_fundamental_right) {
      return 'critical';
    }

    // High risk if conflicting precedents exist
    const conflictingPrecedents = precedents.filter(p => {
      const legalPrinciple = p.legal_principle?.toLowerCase() || '';
      return legalPrinciple.includes('unconstitutional') || legalPrinciple.includes('violation');
    });
    
    if (conflictingPrecedents.length > 0) {
      return 'high';
    }

    // Medium risk for restrictions on rights
    if (analysisType === 'restricts' && provision.is_fundamental_right) {
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
    if (provision.is_fundamental_right) {
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
    
    if (provision.summary) {
      text += `, which ${provision.summary.toLowerCase()}`;
    }
    
    text += '. ';

    if (precedents.length > 0 && precedents[0]) {
      const topPrecedent = precedents[0];
      const year = topPrecedent.judgment_date ? new Date(topPrecedent.judgment_date).getFullYear() : 'unknown';
      const legalPrinciple = topPrecedent.legal_principle || 'established legal principles';
      text += `Relevant precedent includes ${topPrecedent.case_name} (${year}), which ${legalPrinciple.toLowerCase()}. `;
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
        return `High constitutional risk due to ${analysisType.replace('_', ' ')} of constitutional provisions governing ${provision.is_fundamental_right ? 'fundamental rights' : 'governmental powers'}.`;
      case 'medium':
        return `Moderate constitutional risk requiring review of compliance with Article ${provision.article_number} requirements.`;
      default:
        return `Low constitutional risk with apparent compliance with constitutional requirements.`;
    }
  }

  private findContentMatches(billContent: string, provision: ConstitutionalProvision): string[] {
    const matches: string[] = [];
    const content = billContent.toLowerCase();
    
    provision.keywords.forEach((keyword: string) => {
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

    if (provision.is_fundamental_right) {
      factors.push('Affects fundamental rights protections');
    }

    const conflictingPrecedents = precedents.filter(p => {
      const legalPrinciple = p.legal_principle?.toLowerCase() || '';
      return legalPrinciple.includes('unconstitutional');
    });
    
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


