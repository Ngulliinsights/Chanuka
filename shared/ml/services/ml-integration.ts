// ============================================================================
// ML INTEGRATION SERVICE - Database Integration for ML Models
// ============================================================================
// Integrates ML model outputs with database schemas with enhanced reliability

import { z } from 'zod';

import { analysisPipeline, type PipelineResult } from './analysis-pipeline';
import { mlOrchestrator } from './ml-orchestrator';

// ============================================================================
// DATABASE SCHEMAS
// ============================================================================

export const MLAnalysisResultSchema = z.object({
  id: z.string().uuid(),
  bill_id: z.string().uuid(),
  analysis_type: z.string().min(1).max(100),
  results: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  model_version: z.string().max(50),
  metadata: z.record(z.any()),
  is_approved: z.boolean().default(false),
  approved_by: z.string().uuid().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const TrojanBillAnalysisSchema = z.object({
  bill_id: z.string().uuid(),
  bill_name: z.string().min(1).max(500),
  trojan_risk_score: z.number().min(0).max(100),
  stated_purpose: z.string().max(2000).optional(),
  hidden_provisions: z.array(z.any()).default([]),
  detection_method: z.string().max(100),
  detection_date: z.date(),
  detection_confidence: z.number().min(0).max(1),
  analysis_summary: z.string().max(5000),
  detailed_analysis: z.string().max(50000),
  red_flags: z.array(z.string().max(500)).default([]),
  public_alert_issued: z.boolean().default(false),
  alert_issued_date: z.date().optional(),
  alert_channels: z.array(z.string().max(100)).default([]),
  alert_reach: z.number().int().nonnegative().optional(),
  media_coverage: z.boolean().default(false),
  media_mentions: z.number().int().nonnegative().default(0),
  parliamentary_awareness: z.boolean().default(false),
  amendments_proposed: z.boolean().default(false),
  outcome: z.string().max(1000).optional(),
  outcome_date: z.date().optional(),
  detection_impact_score: z.number().min(0).max(100).optional(),
  analyzed_by: z.string().uuid().optional(),
  analysis_version: z.number().int().positive().default(1),
});

export const ConstitutionalAnalysisSchema = z.object({
  bill_id: z.string().uuid(),
  analysis_type: z.string().max(100),
  confidence_score: z.number().min(0).max(1),
  constitutional_provisions_cited: z.array(z.string().uuid()).default([]),
  potential_violations: z.array(z.any()).default([]),
  constitutional_alignment: z.enum(['complies', 'uncertain', 'violates', 'requires_review']),
  executive_summary: z.string().max(5000),
  detailed_analysis: z.string().max(50000).optional(),
  recommendations: z.string().max(5000).optional(),
  requires_expert_review: z.boolean().default(false),
  expert_reviewed: z.boolean().default(false),
  expert_reviewer_id: z.string().uuid().optional(),
  expert_notes: z.string().max(10000).optional(),
  expert_reviewed_at: z.date().optional(),
  analysis_version: z.number().int().positive().default(1),
  is_published: z.boolean().default(false),
  published_at: z.date().optional(),
});

export const ConflictDetectionSchema = z.object({
  bill_id: z.string().uuid(),
  sponsor_id: z.string().uuid(),
  conflict_type: z.string().max(100),
  severity_level: z.enum(['low', 'medium', 'high', 'critical']),
  confidence_score: z.number().min(0).max(1),
  detection_method: z.string().max(100),
  evidence_data: z.record(z.any()),
  reviewed_by_expert: z.boolean().default(false),
  expert_consensus: z.string().max(2000).optional(),
  public_disclosure_quality: z.enum(['excellent', 'good', 'fair', 'poor', 'none']).optional(),
  resolution_status: z.enum(['unresolved', 'disclosed', 'recused', 'resolved']).optional(),
  resolution_date: z.date().optional(),
});

export type MLAnalysisResult = z.infer<typeof MLAnalysisResultSchema>;
export type TrojanBillAnalysisData = z.infer<typeof TrojanBillAnalysisSchema>;
export type ConstitutionalAnalysisData = z.infer<typeof ConstitutionalAnalysisSchema>;
export type ConflictDetectionData = z.infer<typeof ConflictDetectionSchema>;

// ============================================================================
// INTERFACES
// ============================================================================

interface BillAnalysisInput {
  billId: string;
  billText: string;
  billTitle: string;
  sponsorId: string;
  sponsorFinancialInterests: any[];
  transparencyData?: any;
  contextualFactors?: any;
}

interface ContentAnalysisInput {
  content: {
    text: string;
    title?: string;
    source: 'bill' | 'comment' | 'news' | 'social_media' | 'official_statement';
    timestamp: string;
  };
  userContext?: any;
}

interface SponsorAssessmentInput {
  sponsorId: string;
  billId: string;
  billText: string;
  billTitle: string;
  sponsorFinancialInterests: any[];
  sponsorData: any;
  networkEntities: any[];
  networkRelationships: any[];
  timeframe: { start: string; end: string };
  contextualFactors: any;
}

interface AnalysisResult<T = any> {
  success: boolean;
  results?: T;
  error?: string;
  processingTime?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// ML INTEGRATION SERVICE
// ============================================================================

export class MLIntegrationService {
  private readonly DEFAULT_TIMEOUT = 120000; // 2 minutes
  private readonly BATCH_SIZE = 10;
  private analysisCache = new Map<string, AnalysisResult>();

  // ============================================================================
  // BILL ANALYSIS
  // ============================================================================

  async analyzeBill(billData: BillAnalysisInput): Promise<AnalysisResult> {
    try {
      // Validate input
      this.validateBillInput(billData);

      // Check cache
      const cacheKey = this.generateCacheKey('bill', billData.billId);
      const cached = this.analysisCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return { ...cached, metadata: { ...cached.metadata, cached: true } };
      }

      // Execute pipeline
      const pipelineResult = await analysisPipeline.executePipeline({
        pipelineId: 'comprehensive-bill-analysis',
        input: billData,
        options: {
          timeout: this.DEFAULT_TIMEOUT,
          continueOnError: false,
          validateOutput: true,
        },
      });

      if (!pipelineResult.success) {
        throw new Error(`Pipeline execution failed: ${pipelineResult.error}`);
      }

      // Transform results
      const transformedResults = await this.transformBillAnalysisResults(
        billData.billId,
        pipelineResult
      );

      const result: AnalysisResult = {
        success: true,
        results: transformedResults,
        processingTime: pipelineResult.totalProcessingTime,
        metadata: {
          executionId: pipelineResult.metadata.executionId,
          timestamp: pipelineResult.metadata.timestamp,
          stepsExecuted: pipelineResult.metadata.stepsExecuted,
        },
      };

      // Cache result
      this.analysisCache.set(cacheKey, result);

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async analyzeBillsBatch(bills: BillAnalysisInput[]): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < bills.length; i += this.BATCH_SIZE) {
      const batch = bills.slice(i, i + this.BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(bill => this.analyzeBill(bill))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Batch processing failed',
          });
        }
      }
    }

    return results;
  }

  // ============================================================================
  // CONTENT ANALYSIS
  // ============================================================================

  async processRealTimeContent(contentData: ContentAnalysisInput): Promise<AnalysisResult> {
    try {
      this.validateContentInput(contentData);

      const pipelineResult = await analysisPipeline.executePipeline({
        pipelineId: 'real-time-content-processing',
        input: contentData,
        options: {
          timeout: 30000, // 30 seconds for real-time
          continueOnError: true,
          validateOutput: false,
        },
      });

      return {
        success: pipelineResult.success,
        results: {
          classification: pipelineResult.results.classification,
          sentiment: pipelineResult.results.sentiment,
          engagement: pipelineResult.results.engagement,
          moderationAction: this.determineModerationAction(pipelineResult.results),
          priority: pipelineResult.results.priority,
        },
        processingTime: pipelineResult.totalProcessingTime,
        metadata: {
          executionId: pipelineResult.metadata.executionId,
          realTime: true,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // SPONSOR ASSESSMENT
  // ============================================================================

  async assessSponsorIntegrity(sponsorData: SponsorAssessmentInput): Promise<AnalysisResult> {
    try {
      this.validateSponsorInput(sponsorData);

      const pipelineResult = await analysisPipeline.executePipeline({
        pipelineId: 'sponsor-integrity-assessment',
        input: sponsorData,
        options: {
          timeout: 90000, // 90 seconds
          continueOnError: false,
          validateOutput: true,
        },
      });

      if (!pipelineResult.success) {
        throw new Error(`Sponsor assessment failed: ${pipelineResult.error}`);
      }

      return {
        success: true,
        results: {
          transparencyScore: pipelineResult.results.transparencyScore,
          conflicts: pipelineResult.results.conflicts,
          influenceAnalysis: pipelineResult.results.influenceAnalysis,
          integrityScore: pipelineResult.results.integrityScore,
          riskLevel: pipelineResult.results.riskLevel,
          recommendations: this.generateSponsorRecommendations(pipelineResult.results),
        },
        processingTime: pipelineResult.totalProcessingTime,
        metadata: {
          executionId: pipelineResult.metadata.executionId,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  private async transformBillAnalysisResults(
    billId: string,
    pipelineResult: PipelineResult
  ): Promise<any> {
    const results = pipelineResult.results;
    const transformed: any = {};

    // Transform Trojan Analysis
    if (results.trojanAnalysis) {
      try {
        transformed.trojanBillAnalysis = this.transformTrojanAnalysis(
          billId,
          results.trojanAnalysis
        );
      } catch (error) {
        console.error('Failed to transform trojan analysis:', error);
        transformed.trojanBillAnalysis = null;
      }
    }

    // Transform Constitutional Analysis
    if (results.constitutionalAnalysis) {
      try {
        transformed.constitutionalAnalysis = this.transformConstitutionalAnalysis(
          billId,
          results.constitutionalAnalysis
        );
      } catch (error) {
        console.error('Failed to transform constitutional analysis:', error);
        transformed.constitutionalAnalysis = null;
      }
    }

    // Transform Conflict Analysis
    if (results.conflictAnalysis) {
      try {
        transformed.conflictDetection = this.transformConflictAnalysis(
          billId,
          results.conflictAnalysis
        );
      } catch (error) {
        console.error('Failed to transform conflict analysis:', error);
        transformed.conflictDetection = null;
      }
    }

    // Add other results
    transformed.transparencyScore = results.transparencyScore;
    transformed.engagementPrediction = results.engagementPrediction;

    // Add overall assessment
    transformed.overallAssessment = {
      riskScore: results.overallRiskScore || 0,
      recommendedActions: this.generateBillRecommendations(results),
      analysisDate: new Date(),
      requiresExpertReview: this.determineExpertReviewRequirement(results),
      publicAlertRequired: this.determinePublicAlertRequirement(results),
      qualityScore: this.calculateAnalysisQuality(pipelineResult),
    };

    return transformed;
  }

  private transformTrojanAnalysis(billId: string, analysis: any): TrojanBillAnalysisData {
    const data = {
      bill_id: billId,
      bill_name: this.sanitizeString(analysis.billTitle || 'Unknown Bill', 500),
      trojan_risk_score: this.clampNumber(analysis.trojanRiskScore, 0, 100),
      stated_purpose: this.sanitizeString(analysis.statedPurpose, 2000),
      hidden_provisions: Array.isArray(analysis.hiddenProvisions) ? analysis.hiddenProvisions : [],
      detection_method: 'automated',
      detection_date: new Date(),
      detection_confidence: this.clampNumber(analysis.confidence || 0, 0, 1),
      analysis_summary: this.generateTrojanSummary(analysis),
      detailed_analysis: this.generateTrojanDetailedAnalysis(analysis),
      red_flags: Array.isArray(analysis.redFlags) ? analysis.redFlags.map((f: any) => 
        this.sanitizeString(String(f), 500)
      ) : [],
      public_alert_issued: false,
      alert_channels: [],
      media_coverage: false,
      media_mentions: 0,
      parliamentary_awareness: false,
      amendments_proposed: false,
      analysis_version: 1,
    };

    return TrojanBillAnalysisSchema.parse(data);
  }

  private transformConstitutionalAnalysis(billId: string, analysis: any): ConstitutionalAnalysisData {
    const alignment = this.normalizeAlignment(analysis.alignment);
    
    const data = {
      bill_id: billId,
      analysis_type: 'automated',
      confidence_score: this.clampNumber(analysis.confidence || 0, 0, 1),
      constitutional_provisions_cited: Array.isArray(analysis.citedProvisions)
        ? analysis.citedProvisions.map((p: any) => p.article).filter((a: any) => a)
        : [],
      potential_violations: Array.isArray(analysis.violations) ? analysis.violations : [],
      constitutional_alignment: alignment,
      executive_summary: this.generateConstitutionalSummary(analysis),
      detailed_analysis: this.generateConstitutionalDetailedAnalysis(analysis),
      recommendations: Array.isArray(analysis.recommendations)
        ? this.sanitizeString(analysis.recommendations.join('; '), 5000)
        : undefined,
      requires_expert_review: alignment === 'violates' || (analysis.confidence || 0) < 0.7,
      expert_reviewed: false,
      analysis_version: 1,
      is_published: false,
    };

    return ConstitutionalAnalysisSchema.parse(data);
  }

  private transformConflictAnalysis(billId: string, analysis: any): ConflictDetectionData {
    const conflicts = Array.isArray(analysis.conflicts) ? analysis.conflicts : [];
    const highestSeverityConflict = this.findHighestSeverityConflict(conflicts);

    const data = {
      bill_id: billId,
      sponsor_id: analysis.sponsorId || '00000000-0000-0000-0000-000000000000',
      conflict_type: highestSeverityConflict?.type || 'none',
      severity_level: this.normalizeSeverity(highestSeverityConflict?.severity || 'low'),
      confidence_score: this.clampNumber(analysis.confidence || 0, 0, 1),
      detection_method: 'automated',
      evidence_data: {
        conflicts: conflicts,
        riskFactors: analysis.riskFactors || [],
        disclosureQuality: analysis.disclosureQuality,
      },
      reviewed_by_expert: false,
      public_disclosure_quality: this.normalizeDisclosureQuality(analysis.disclosureQuality),
      resolution_status: 'unresolved',
    };

    return ConflictDetectionSchema.parse(data);
  }

  // ============================================================================
  // ANALYSIS GENERATORS
  // ============================================================================

  private generateTrojanSummary(analysis: any): string {
    const riskScore = analysis.trojanRiskScore || 0;
    const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';
    const hiddenCount = Array.isArray(analysis.hiddenProvisions) ? analysis.hiddenProvisions.length : 0;
    const redFlagCount = Array.isArray(analysis.redFlags) ? analysis.redFlags.length : 0;
    const confidence = Math.round((analysis.confidence || 0) * 100);
    
    return this.sanitizeString(
      `Trojan Bill Risk Assessment: ${riskLevel} (Score: ${riskScore}/100). ` +
      `Detected ${hiddenCount} hidden provisions and ${redFlagCount} red flags. ` +
      `Confidence: ${confidence}%.`,
      5000
    );
  }

  private generateTrojanDetailedAnalysis(analysis: any): string {
    let detailed = 'TROJAN BILL ANALYSIS REPORT\n\n';
    
    detailed += `Risk Score: ${analysis.trojanRiskScore || 0}/100\n`;
    detailed += `Confidence: ${Math.round((analysis.confidence || 0) * 100)}%\n\n`;
    
    const hiddenProvisions = Array.isArray(analysis.hiddenProvisions) ? analysis.hiddenProvisions : [];
    if (hiddenProvisions.length > 0) {
      detailed += 'HIDDEN PROVISIONS DETECTED:\n';
      hiddenProvisions.forEach((provision: any, index: number) => {
        detailed += `${index + 1}. ${provision.section || 'Unknown'}: ${provision.hiddenAgenda || 'N/A'}\n`;
        detailed += `   Severity: ${provision.severity || 'Unknown'}\n`;
        if (provision.constitutionalConcern) {
          detailed += `   Constitutional Concern: ${provision.constitutionalConcern}\n`;
        }
        detailed += '\n';
      });
    }
    
    const redFlags = Array.isArray(analysis.redFlags) ? analysis.redFlags : [];
    if (redFlags.length > 0) {
      detailed += 'RED FLAGS:\n';
      redFlags.forEach((flag: string) => {
        detailed += `- ${flag}\n`;
      });
      detailed += '\n';
    }
    
    const techniques = Array.isArray(analysis.deceptionTechniques) ? analysis.deceptionTechniques : [];
    if (techniques.length > 0) {
      detailed += 'DECEPTION TECHNIQUES:\n';
      techniques.forEach((technique: any) => {
        detailed += `- ${technique.technique || 'Unknown'} (Effectiveness: ${technique.effectiveness || 0}/10)\n`;
        if (technique.example) {
          detailed += `  Example: ${technique.example}\n`;
        }
      });
    }
    
    return this.sanitizeString(detailed, 50000);
  }

  private generateConstitutionalSummary(analysis: any): string {
    const alignment = analysis.alignment || 'uncertain';
    const violationCount = Array.isArray(analysis.violations) ? analysis.violations.length : 0;
    const citationCount = Array.isArray(analysis.citedProvisions) ? analysis.citedProvisions.length : 0;
    const confidence = Math.round((analysis.confidence || 0) * 100);
    
    return this.sanitizeString(
      `Constitutional Analysis: ${alignment.toUpperCase()}. ` +
      `${violationCount} potential violations detected. ` +
      `${citationCount} constitutional provisions cited. ` +
      `Confidence: ${confidence}%.`,
      5000
    );
  }

  private generateConstitutionalDetailedAnalysis(analysis: any): string {
    let detailed = 'CONSTITUTIONAL ANALYSIS REPORT\n\n';
    
    detailed += `Overall Alignment: ${analysis.alignment || 'Unknown'}\n`;
    detailed += `Confidence: ${Math.round((analysis.confidence || 0) * 100)}%\n\n`;
    
    const violations = Array.isArray(analysis.violations) ? analysis.violations : [];
    if (violations.length > 0) {
      detailed += 'CONSTITUTIONAL VIOLATIONS:\n';
      violations.forEach((violation: any, index: number) => {
        detailed += `${index + 1}. ${violation.provision || 'Unknown'} - ${violation.violationType || 'Unspecified'}\n`;
        detailed += `   Severity: ${violation.severity || 'Unknown'}\n`;
        detailed += `   Explanation: ${violation.explanation || 'N/A'}\n`;
        detailed += `   Recommended Action: ${violation.recommendedAction || 'N/A'}\n\n`;
      });
    }
    
    const provisions = Array.isArray(analysis.citedProvisions) ? analysis.citedProvisions : [];
    if (provisions.length > 0) {
      detailed += 'RELEVANT CONSTITUTIONAL PROVISIONS:\n';
      provisions.forEach((provision: any) => {
        detailed += `- ${provision.article || 'Unknown'}: ${provision.title || 'N/A'}\n`;
        detailed += `  Relevance: ${provision.relevance || 'N/A'}, Impact: ${provision.impact || 'N/A'}\n`;
      });
      detailed += '\n';
    }
    
    const precedents = Array.isArray(analysis.precedents) ? analysis.precedents : [];
    if (precedents.length > 0) {
      detailed += 'RELEVANT LEGAL PRECEDENTS:\n';
      precedents.forEach((precedent: any) => {
        detailed += `- ${precedent.caseName || 'Unknown'} (${precedent.court || 'Unknown Court'})\n`;
        detailed += `  Relevance: ${Math.round((precedent.relevance || 0) * 100)}%\n`;
        detailed += `  Outcome: ${precedent.outcome || 'Unknown'}\n`;
      });
    }
    
    return this.sanitizeString(detailed, 50000);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateBillRecommendations(results: any): string[] {
    const recommendations: string[] = [];
    
    if ((results.trojanAnalysis?.trojanRiskScore || 0) > 70) {
      recommendations.push('High trojan risk detected - requires expert review');
    }
    
    if (results.constitutionalAnalysis?.alignment === 'violates') {
      recommendations.push('Constitutional violations detected - legal review required');
    }
    
    if ((results.transparencyScore?.overallScore || 100) < 50) {
      recommendations.push('Low transparency score - improve public disclosure');
    }
    
    if (results.conflictAnalysis?.hasConflict) {
      recommendations.push('Conflicts of interest detected - sponsor should disclose or recuse');
    }
    
    return recommendations;
  }

  private generateSponsorRecommendations(results: any): string[] {
    const recommendations: string[] = [];
    const riskLevel = results.riskLevel || 'low';
    
    if (riskLevel === 'high') {
      recommendations.push('Enhanced monitoring required');
      recommendations.push('Full financial disclosure audit recommended');
    }
    
    if (results.conflicts?.hasConflict) {
      recommendations.push('Address identified conflicts of interest');
    }
    
    if ((results.transparencyScore?.overallScore || 100) < 70) {
      recommendations.push('Improve transparency and public disclosure');
    }
    
    if (results.influenceAnalysis?.riskAssessment?.corruptionRisk > 50) {
      recommendations.push('High corruption risk - investigate network connections');
    }
    
    return recommendations;
  }

  private determineModerationAction(results: any): string {
    const classification = results.classification?.classifications;
    
    if (classification?.misinformationRisk?.riskLevel === 'very_high') {
      return 'flag_for_review';
    }
    
    if (classification?.urgencyLevel?.level === 'emergency') {
      return 'escalate_immediately';
    }
    
    if (results.sentiment?.toxicity?.isToxic) {
      return 'moderate_content';
    }
    
    return 'no_action';
  }

  private determineExpertReviewRequirement(results: any): boolean {
    if ((results.trojanAnalysis?.trojanRiskScore || 0) > 70) return true;
    if (results.constitutionalAnalysis?.alignment === 'violates') return true;
    if ((results.conflictAnalysis?.conflictScore || 0) > 70) return true;
    if ((results.transparencyScore?.overallScore || 100) < 40) return true;
    return false;
  }

  private determinePublicAlertRequirement(results: any): boolean {
    if ((results.trojanAnalysis?.trojanRiskScore || 0) > 80) return true;
    
    const violations = results.constitutionalAnalysis?.violations || [];
    if (violations.some((v: any) => v.severity === 'critical')) return true;
    
    return false;
  }

  private calculateAnalysisQuality(pipelineResult: PipelineResult): number {
    const { metadata } = pipelineResult;
    const successRate = metadata.stepsExecuted / (metadata.stepsExecuted + metadata.stepsFailed);
    const completionRate = 1 - (metadata.stepsSkipped / metadata.stepsExecuted);
    
    return Math.round((successRate * 0.7 + completionRate * 0.3) * 100);
  }

  // ============================================================================
  // NORMALIZATION & VALIDATION
  // ============================================================================

  private findHighestSeverityConflict(conflicts: any[]): any {
    const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    
    return conflicts.reduce((highest, current) => {
      const currentSeverity = severityOrder[current.severity] || 0;
      const highestSeverity = severityOrder[highest?.severity] || 0;
      return currentSeverity > highestSeverity ? current : highest;
    }, null);
  }

  private normalizeAlignment(alignment: string): 'complies' | 'uncertain' | 'violates' | 'requires_review' {
    const normalized = alignment?.toLowerCase() || 'uncertain';
    if (['complies', 'compliant', 'aligned'].includes(normalized)) return 'complies';
    if (['violates', 'violation', 'non-compliant'].includes(normalized)) return 'violates';
    if (['requires_review', 'review'].includes(normalized)) return 'requires_review';
    return 'uncertain';
  }

  private normalizeSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    const normalized = severity?.toLowerCase() || 'low';
    if (['critical', 'severe'].includes(normalized)) return 'critical';
    if (['high'].includes(normalized)) return 'high';
    if (['medium', 'moderate'].includes(normalized)) return 'medium';
    return 'low';
  }

  private normalizeDisclosureQuality(quality: string): 'excellent' | 'good' | 'fair' | 'poor' | 'none' | undefined {
    if (!quality) return undefined;
    const normalized = quality.toLowerCase();
    if (['excellent', 'outstanding'].includes(normalized)) return 'excellent';
    if (['good'].includes(normalized)) return 'good';
    if (['fair', 'adequate'].includes(normalized)) return 'fair';
    if (['poor', 'inadequate'].includes(normalized)) return 'poor';
    if (['none'].includes(normalized)) return 'none';
    return undefined;
  }

  private sanitizeString(str: string | undefined, maxLength: number): string {
    if (!str) return '';
    return String(str).substring(0, maxLength).trim();
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // ============================================================================
  // INPUT VALIDATION
  // ============================================================================

  private validateBillInput(billData: BillAnalysisInput): void {
    if (!billData.billId || !this.isValidUUID(billData.billId)) {
      throw new Error('Invalid bill ID');
    }
    if (!billData.billText || billData.billText.length < 10) {
      throw new Error('Bill text too short');
    }
    if (!billData.billTitle || billData.billTitle.length < 3) {
      throw new Error('Bill title too short');
    }
    if (!billData.sponsorId || !this.isValidUUID(billData.sponsorId)) {
      throw new Error('Invalid sponsor ID');
    }
  }

  private validateContentInput(contentData: ContentAnalysisInput): void {
    if (!contentData.content?.text || contentData.content.text.length < 1) {
      throw new Error('Content text is required');
    }
    if (!contentData.content.source) {
      throw new Error('Content source is required');
    }
  }

  private validateSponsorInput(sponsorData: SponsorAssessmentInput): void {
    if (!sponsorData.sponsorId || !this.isValidUUID(sponsorData.sponsorId)) {
      throw new Error('Invalid sponsor ID');
    }
    if (!sponsorData.billId || !this.isValidUUID(sponsorData.billId)) {
      throw new Error('Invalid bill ID');
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private generateCacheKey(type: string, id: string): string {
    return `${type}:${id}`;
  }

  private isCacheValid(result: AnalysisResult): boolean {
    const cacheTime = result.metadata?.timestamp;
    if (!cacheTime) return false;
    
    const age = Date.now() - new Date(cacheTime).getTime();
    return age < 3600000; // 1 hour
  }

  clearCache(): void {
    this.analysisCache.clear();
  }

  // ============================================================================
  // STATUS QUERIES
  // ============================================================================

  async getAnalysisStatus(billId: string): Promise<any> {
    // This would typically query a database
    return {
      billId,
      hasAnalysis: this.analysisCache.has(this.generateCacheKey('bill', billId)),
      analysisTypes: ['trojan_detection', 'constitutional_analysis', 'conflict_detection'],
      lastAnalyzed: new Date(),
      requiresUpdate: false,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const mlIntegrationService = new MLIntegrationService();