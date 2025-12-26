// ============================================================================
// ML INTEGRATION SERVICE - Database Integration for ML Models
// ============================================================================
// Integrates ML model outputs with database schemas and provides data persistence

import { z } from 'zod';
import { mlOrchestrator } from './ml-orchestrator';
import { analysisPipeline } from './analysis-pipeline';

// Integration schemas matching database tables
export const MLAnalysisResultSchema = z.object({
  id: z.string().uuid(),
  bill_id: z.string().uuid(),
  analysis_type: z.string(),
  results: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  model_version: z.string(),
  metadata: z.record(z.any()),
  is_approved: z.boolean().default(false),
  approved_by: z.string().uuid().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const TrojanBillAnalysisSchema = z.object({
  bill_id: z.string().uuid(),
  bill_name: z.string(),
  trojan_risk_score: z.number().min(0).max(100),
  stated_purpose: z.string().optional(),
  hidden_provisions: z.array(z.any()),
  detection_method: z.string(),
  detection_date: z.date(),
  detection_confidence: z.number().min(0).max(1),
  analysis_summary: z.string(),
  detailed_analysis: z.string(),
  red_flags: z.array(z.string()),
  public_alert_issued: z.boolean().default(false),
  alert_issued_date: z.date().optional(),
  alert_channels: z.array(z.string()),
  alert_reach: z.number().optional(),
  media_coverage: z.boolean().default(false),
  media_mentions: z.number().default(0),
  parliamentary_awareness: z.boolean().default(false),
  amendments_proposed: z.boolean().default(false),
  outcome: z.string().optional(),
  outcome_date: z.date().optional(),
  detection_impact_score: z.number().min(0).max(100).optional(),
  analyzed_by: z.string().uuid().optional(),
  analysis_version: z.number().default(1),
});

export const ConstitutionalAnalysisSchema = z.object({
  bill_id: z.string().uuid(),
  analysis_type: z.string(),
  confidence_score: z.number().min(0).max(1),
  constitutional_provisions_cited: z.array(z.string().uuid()),
  potential_violations: z.array(z.any()),
  constitutional_alignment: z.string(),
  executive_summary: z.string(),
  detailed_analysis: z.string().optional(),
  recommendations: z.string().optional(),
  requires_expert_review: z.boolean().default(false),
  expert_reviewed: z.boolean().default(false),
  expert_reviewer_id: z.string().uuid().optional(),
  expert_notes: z.string().optional(),
  expert_reviewed_at: z.date().optional(),
  analysis_version: z.number().default(1),
  is_published: z.boolean().default(false),
  published_at: z.date().optional(),
});

export const ConflictDetectionSchema = z.object({
  bill_id: z.string().uuid(),
  sponsor_id: z.string().uuid(),
  conflict_type: z.string(),
  severity_level: z.string(),
  confidence_score: z.number().min(0).max(1),
  detection_method: z.string(),
  evidence_data: z.record(z.any()),
  reviewed_by_expert: z.boolean().default(false),
  expert_consensus: z.string().optional(),
  public_disclosure_quality: z.string().optional(),
  resolution_status: z.string().optional(),
  resolution_date: z.date().optional(),
});

export type MLAnalysisResult = z.infer<typeof MLAnalysisResultSchema>;
export type TrojanBillAnalysisData = z.infer<typeof TrojanBillAnalysisSchema>;
export type ConstitutionalAnalysisData = z.infer<typeof ConstitutionalAnalysisSchema>;
export type ConflictDetectionData = z.infer<typeof ConflictDetectionSchema>;

export class MLIntegrationService {
  // Process bill through comprehensive analysis pipeline
  async analyzeBill(billData: {
    billId: string;
    billText: string;
    billTitle: string;
    sponsorId: string;
    sponsorFinancialInterests: any[];
    transparencyData?: any;
    contextualFactors?: any;
  }) {
    try {
      // Execute comprehensive bill analysis pipeline
      const pipelineResult = await analysisPipeline.executePipeline({
        pipelineId: 'comprehensive-bill-analysis',
        input: billData,
        options: {
          timeout: 120000, // 2 minutes
          continueOnError: false,
        },
      });

      if (!pipelineResult.success) {
        throw new Error(`Pipeline execution failed: ${pipelineResult.error}`);
      }

      // Transform results for database storage
      const analysisResults = await this.transformBillAnalysisResults(
        billData.billId,
        pipelineResult.results
      );

      return {
        success: true,
        results: analysisResults,
        processingTime: pipelineResult.totalProcessingTime,
        stepResults: pipelineResult.stepResults,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: null,
      };
    }
  }

  // Process real-time content
  async processRealTimeContent(contentData: {
    content: {
      text: string;
      title?: string;
      source: 'bill' | 'comment' | 'news' | 'social_media' | 'official_statement';
      timestamp: string;
    };
    userContext?: any;
  }) {
    try {
      const pipelineResult = await analysisPipeline.executePipeline({
        pipelineId: 'real-time-content-processing',
        input: contentData,
        options: {
          timeout: 30000, // 30 seconds
          continueOnError: true,
        },
      });

      return {
        success: pipelineResult.success,
        classification: pipelineResult.results.classification,
        sentiment: pipelineResult.results.sentiment,
        engagement: pipelineResult.results.engagement,
        moderationAction: pipelineResult.results.moderationAction,
        priority: pipelineResult.results.priority,
        processingTime: pipelineResult.totalProcessingTime,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Assess sponsor integrity
  async assessSponsorIntegrity(sponsorData: {
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
  }) {
    try {
      const pipelineResult = await analysisPipeline.executePipeline({
        pipelineId: 'sponsor-integrity-assessment',
        input: sponsorData,
        options: {
          timeout: 90000, // 90 seconds
          continueOnError: false,
        },
      });

      if (!pipelineResult.success) {
        throw new Error(`Sponsor assessment failed: ${pipelineResult.error}`);
      }

      return {
        success: true,
        transparencyScore: pipelineResult.results.transparencyScore,
        conflicts: pipelineResult.results.conflicts,
        influenceAnalysis: pipelineResult.results.influenceAnalysis,
        integrityScore: pipelineResult.results.integrityScore,
        riskLevel: pipelineResult.results.riskLevel,
        recommendations: pipelineResult.results.recommendations,
        processingTime: pipelineResult.totalProcessingTime,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Transform pipeline results to database format
  private async transformBillAnalysisResults(billId: string, results: any) {
    const transformedResults: any = {};

    // Transform Trojan Bill Analysis
    if (results.trojanAnalysis) {
      transformedResults.trojanBillAnalysis = this.transformTrojanAnalysis(
        billId,
        results.trojanAnalysis
      );
    }

    // Transform Constitutional Analysis
    if (results.constitutionalAnalysis) {
      transformedResults.constitutionalAnalysis = this.transformConstitutionalAnalysis(
        billId,
        results.constitutionalAnalysis
      );
    }

    // Transform Conflict Analysis
    if (results.conflictAnalysis) {
      transformedResults.conflictDetection = this.transformConflictAnalysis(
        billId,
        results.conflictAnalysis
      );
    }

    // Transform Transparency Score
    if (results.transparencyScore) {
      transformedResults.transparencyScore = results.transparencyScore;
    }

    // Transform Engagement Prediction
    if (results.engagementPrediction) {
      transformedResults.engagementPrediction = results.engagementPrediction;
    }

    // Add overall assessment
    transformedResults.overallAssessment = {
      riskScore: results.overallRiskScore || 0,
      recommendedActions: results.recommendedActions || [],
      analysisDate: new Date(),
      requiresExpertReview: this.determineExpertReviewRequirement(results),
      publicAlertRequired: this.determinePublicAlertRequirement(results),
    };

    return transformedResults;
  }

  private transformTrojanAnalysis(billId: string, analysis: any): TrojanBillAnalysisData {
    return {
      bill_id: billId,
      bill_name: analysis.billTitle || 'Unknown Bill',
      trojan_risk_score: analysis.trojanRiskScore,
      stated_purpose: analysis.statedPurpose,
      hidden_provisions: analysis.hiddenProvisions,
      detection_method: 'automated',
      detection_date: new Date(),
      detection_confidence: analysis.confidence,
      analysis_summary: this.generateTrojanSummary(analysis),
      detailed_analysis: this.generateTrojanDetailedAnalysis(analysis),
      red_flags: analysis.redFlags,
      public_alert_issued: false,
      alert_channels: [],
      media_coverage: false,
      media_mentions: 0,
      parliamentary_awareness: false,
      amendments_proposed: false,
      analysis_version: 1,
    };
  }

  private transformConstitutionalAnalysis(billId: string, analysis: any): ConstitutionalAnalysisData {
    return {
      bill_id: billId,
      analysis_type: 'automated',
      confidence_score: analysis.confidence,
      constitutional_provisions_cited: analysis.citedProvisions.map((p: any) => p.article),
      potential_violations: analysis.violations,
      constitutional_alignment: analysis.alignment,
      executive_summary: this.generateConstitutionalSummary(analysis),
      detailed_analysis: this.generateConstitutionalDetailedAnalysis(analysis),
      recommendations: analysis.recommendations.join('; '),
      requires_expert_review: analysis.alignment === 'violates' || analysis.confidence < 0.7,
      expert_reviewed: false,
      analysis_version: 1,
      is_published: false,
    };
  }

  private transformConflictAnalysis(billId: string, analysis: any): ConflictDetectionData {
    const highestSeverityConflict = analysis.conflicts.reduce((highest: any, current: any) => {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      const currentSeverity = severityOrder[current.severity as keyof typeof severityOrder] || 0;
      const highestSeverity = severityOrder[highest?.severity as keyof typeof severityOrder] || 0;
      return currentSeverity > highestSeverity ? current : highest;
    }, null);

    return {
      bill_id: billId,
      sponsor_id: analysis.sponsorId,
      conflict_type: highestSeverityConflict?.type || 'none',
      severity_level: highestSeverityConflict?.severity || 'low',
      confidence_score: analysis.confidence,
      detection_method: 'automated',
      evidence_data: {
        conflicts: analysis.conflicts,
        riskFactors: analysis.riskFactors,
        disclosureQuality: analysis.disclosureQuality,
      },
      reviewed_by_expert: false,
      public_disclosure_quality: analysis.disclosureQuality,
      resolution_status: 'unresolved',
    };
  }

  // Generate analysis summaries
  private generateTrojanSummary(analysis: any): string {
    const riskLevel = analysis.trojanRiskScore > 70 ? 'HIGH' : 
                     analysis.trojanRiskScore > 40 ? 'MEDIUM' : 'LOW';
    
    return `Trojan Bill Risk Assessment: ${riskLevel} (Score: ${analysis.trojanRiskScore}/100). ` +
           `Detected ${analysis.hiddenProvisions.length} hidden provisions and ` +
           `${analysis.redFlags.length} red flags. Confidence: ${Math.round(analysis.confidence * 100)}%.`;
  }

  private generateTrojanDetailedAnalysis(analysis: any): string {
    let detailed = `TROJAN BILL ANALYSIS REPORT\n\n`;
    
    detailed += `Risk Score: ${analysis.trojanRiskScore}/100\n`;
    detailed += `Confidence: ${Math.round(analysis.confidence * 100)}%\n\n`;
    
    if (analysis.hiddenProvisions.length > 0) {
      detailed += `HIDDEN PROVISIONS DETECTED:\n`;
      analysis.hiddenProvisions.forEach((provision: any, index: number) => {
        detailed += `${index + 1}. ${provision.section}: ${provision.hiddenAgenda}\n`;
        detailed += `   Severity: ${provision.severity}\n`;
        if (provision.constitutionalConcern) {
          detailed += `   Constitutional Concern: ${provision.constitutionalConcern}\n`;
        }
        detailed += `\n`;
      });
    }
    
    if (analysis.redFlags.length > 0) {
      detailed += `RED FLAGS:\n`;
      analysis.redFlags.forEach((flag: string) => {
        detailed += `- ${flag}\n`;
      });
      detailed += `\n`;
    }
    
    if (analysis.deceptionTechniques.length > 0) {
      detailed += `DECEPTION TECHNIQUES:\n`;
      analysis.deceptionTechniques.forEach((technique: any) => {
        detailed += `- ${technique.technique} (Effectiveness: ${technique.effectiveness}/10)\n`;
        detailed += `  Example: ${technique.example}\n`;
      });
    }
    
    return detailed;
  }

  private generateConstitutionalSummary(analysis: any): string {
    return `Constitutional Analysis: ${analysis.alignment.toUpperCase()}. ` +
           `${analysis.violations.length} potential violations detected. ` +
           `${analysis.citedProvisions.length} constitutional provisions cited. ` +
           `Confidence: ${Math.round(analysis.confidence * 100)}%.`;
  }

  private generateConstitutionalDetailedAnalysis(analysis: any): string {
    let detailed = `CONSTITUTIONAL ANALYSIS REPORT\n\n`;
    
    detailed += `Overall Alignment: ${analysis.alignment}\n`;
    detailed += `Confidence: ${Math.round(analysis.confidence * 100)}%\n\n`;
    
    if (analysis.violations.length > 0) {
      detailed += `CONSTITUTIONAL VIOLATIONS:\n`;
      analysis.violations.forEach((violation: any, index: number) => {
        detailed += `${index + 1}. ${violation.provision} - ${violation.violationType}\n`;
        detailed += `   Severity: ${violation.severity}\n`;
        detailed += `   Explanation: ${violation.explanation}\n`;
        detailed += `   Recommended Action: ${violation.recommendedAction}\n\n`;
      });
    }
    
    if (analysis.citedProvisions.length > 0) {
      detailed += `RELEVANT CONSTITUTIONAL PROVISIONS:\n`;
      analysis.citedProvisions.forEach((provision: any) => {
        detailed += `- ${provision.article}: ${provision.title}\n`;
        detailed += `  Relevance: ${provision.relevance}, Impact: ${provision.impact}\n`;
      });
      detailed += `\n`;
    }
    
    if (analysis.precedents.length > 0) {
      detailed += `RELEVANT LEGAL PRECEDENTS:\n`;
      analysis.precedents.forEach((precedent: any) => {
        detailed += `- ${precedent.caseName} (${precedent.court})\n`;
        detailed += `  Relevance: ${Math.round(precedent.relevance * 100)}%\n`;
        detailed += `  Outcome: ${precedent.outcome}\n`;
      });
    }
    
    return detailed;
  }

  private determineExpertReviewRequirement(results: any): boolean {
    // Require expert review for high-risk cases
    if (results.trojanAnalysis?.trojanRiskScore > 70) return true;
    if (results.constitutionalAnalysis?.alignment === 'violates') return true;
    if (results.conflictAnalysis?.hasConflict && 
        results.conflictAnalysis.conflicts.some((c: any) => c.severity === 'critical')) return true;
    if (results.transparencyScore?.overallScore < 40) return true;
    
    return false;
  }

  private determinePublicAlertRequirement(results: any): boolean {
    // Require public alert for critical issues
    if (results.trojanAnalysis?.trojanRiskScore > 80) return true;
    if (results.constitutionalAnalysis?.violations.some((v: any) => v.severity === 'critical')) return true;
    
    return false;
  }

  // Batch processing for multiple bills
  async analyzeBillsBatch(bills: Array<{
    billId: string;
    billText: string;
    billTitle: string;
    sponsorId: string;
    sponsorFinancialInterests: any[];
  }>) {
    const results = [];
    
    for (const bill of bills) {
      try {
        const result = await this.analyzeBill(bill);
        results.push({
          billId: bill.billId,
          success: result.success,
          results: result.results,
          error: result.error,
        });
      } catch (error) {
        results.push({
          billId: bill.billId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }

  // Get analysis status for a bill
  async getAnalysisStatus(billId: string) {
    // This would typically query the database
    // For now, return a mock status
    return {
      billId,
      hasAnalysis: true,
      analysisTypes: ['trojan_detection', 'constitutional_analysis', 'conflict_detection'],
      lastAnalyzed: new Date(),
      requiresUpdate: false,
    };
  }

  // Update analysis results
  async updateAnalysisResults(billId: string, analysisType: string, results: any) {
    // This would typically update the database
    // Implementation depends on your database layer
    return {
      success: true,
      billId,
      analysisType,
      updatedAt: new Date(),
    };
  }
}

// Singleton instance
export const mlIntegrationService = new MLIntegrationService();