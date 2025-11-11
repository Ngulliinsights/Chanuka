/**
 * Analysis Repository
 *
 * Domain-specific repository for bill analysis that extends the unified API client.
 * Provides clean interfaces for constitutional analysis, conflict detection, and
 * legislative impact assessment.
 */

import { UnifiedApiClientImpl, globalApiClient } from '../core/api/client';
import { logger } from '../utils/logger';

export interface BillAnalysis {
  id: string;
  bill_id: number;
  conflictScore: number;
  transparencyRating: number;
  stakeholderAnalysis: StakeholderImpact[];
  constitutionalConcerns: string[];
  publicBenefit: number;
  corporateInfluence: CorporateConnection[];
  timestamp: Date;
}

export interface StakeholderImpact {
  group: string;
  impactLevel: 'high' | 'medium' | 'low';
  description: string;
  affectedPopulation: number;
}

export interface CorporateConnection {
  organization: string;
  connectionType: 'financial' | 'advisory' | 'employment';
  influenceLevel: number;
  potentialConflict: boolean;
}

export interface ConflictAnalysisResult {
  overallRisk: 'high' | 'medium' | 'low';
  conflicts: CorporateConnection[];
  recommendations: string[];
  analysisDate: Date;
}

export interface AnalysisRepositoryConfig {
  baseEndpoint: string;
  cacheTTL: {
    analysis: number;
    conflict: number;
    batch: number;
  };
  riskThresholds: {
    highConflict: number;
    mediumConflict: number;
    lowTransparency: number;
    highInfluence: number;
  };
}

export class AnalysisRepository extends UnifiedApiClientImpl {
  private config: AnalysisRepositoryConfig;

  constructor(config: AnalysisRepositoryConfig) {
    super({
      baseUrl: globalApiClient.getConfig().baseUrl,
      timeout: globalApiClient.getConfig().timeout,
      retry: globalApiClient.getConfig().retry,
      cache: globalApiClient.getConfig().cache,
      websocket: globalApiClient.getConfig().websocket,
      headers: globalApiClient.getConfig().headers
    });

    this.config = config;
  }

  /**
   * Analyze a bill by its ID
   */
  async analyzeBill(billId: number): Promise<BillAnalysis> {
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new Error('Invalid bill ID: must be a positive integer');
    }

    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/analysis`;

    const response = await this.get<BillAnalysis>(endpoint, {
      cache: { ttl: this.config.cacheTTL.analysis }
    });

    return this.validateAnalysisData(response.data);
  }

  /**
   * Perform conflict of interest analysis
   */
  async getConflictAnalysis(billId: number): Promise<ConflictAnalysisResult> {
    const analysis = await this.analyzeBill(billId);

    const overallRisk = this.calculateRiskLevel(analysis.conflictScore);
    const conflicts = analysis.corporateInfluence.filter(c => c.potentialConflict);

    return {
      overallRisk,
      conflicts,
      recommendations: this.generateRecommendations(analysis),
      analysisDate: analysis.timestamp
    };
  }

  /**
   * Batch analyze multiple bills
   */
  async analyzeBills(billIds: number[]): Promise<Map<number, BillAnalysis>> {
    const analyses = await Promise.allSettled(
      billIds.map(id => this.analyzeBill(id))
    );

    const results = new Map<number, BillAnalysis>();

    analyses.forEach((result, index) => {
      const billId = billIds[index];
      if (!billId) return;

      if (result.status === 'fulfilled') {
        results.set(billId, result.value);
      } else {
        logger.error(`Failed to analyze bill ${billId} in batch`, {
          component: 'AnalysisRepository',
          error: result.reason
        });
      }
    });

    return results;
  }

  /**
   * Get constitutional analysis for a bill
   */
  async getConstitutionalAnalysis(billId: number): Promise<{
    provisions: any[];
    concerns: string[];
    compliance_score: number;
    recommendations: string[];
  }> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/constitutional-analysis`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.analysis }
    });

    return response.data as {
      provisions: any[];
      concerns: string[];
      compliance_score: number;
      recommendations: string[];
    };
  }

  /**
   * Get argument synthesis for a bill
   */
  async getArgumentSynthesis(billId: number): Promise<{
    arguments: any[];
    claims: any[];
    evidence: any[];
    synthesis_status: string;
    last_updated: string;
  }> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/argument-synthesis`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.analysis }
    });

    return response.data as {
      arguments: any[];
      claims: any[];
      evidence: any[];
      synthesis_status: string;
      last_updated: string;
    };
  }

  /**
   * Get financial conflict analysis
   */
  async getFinancialConflicts(billId: number): Promise<{
    corporate_entities: any[];
    financial_interests: any[];
    lobbying_activities: any[];
    conflict_score: number;
    risk_level: string;
  }> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/financial-conflicts`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.conflict }
    });

    return response.data as {
      corporate_entities: any[];
      financial_interests: any[];
      lobbying_activities: any[];
      conflict_score: number;
      risk_level: string;
    };
  }

  /**
   * Get impact assessment for a bill
   */
  async getImpactAssessment(billId: number): Promise<{
    stakeholder_impacts: StakeholderImpact[];
    economic_impact: any;
    social_impact: any;
    environmental_impact: any;
    overall_benefit_score: number;
  }> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/impact-assessment`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.analysis }
    });

    return response.data as {
      stakeholder_impacts: StakeholderImpact[];
      economic_impact: any;
      social_impact: any;
      environmental_impact: any;
      overall_benefit_score: number;
    };
  }

  /**
   * Validate analysis data structure
   */
  private validateAnalysisData(data: any): BillAnalysis {
    const required = ['id', 'bill_id', 'conflictScore', 'transparencyRating'];

    const missing = required.filter(field => !(field in data));

    if (missing.length > 0) {
      throw new Error(`Invalid analysis data from API: missing fields ${missing.join(', ')}`);
    }

    return {
      ...data,
      timestamp: new Date(data.timestamp || Date.now())
    };
  }

  /**
   * Calculate risk level based on conflict score
   */
  private calculateRiskLevel(score: number): 'high' | 'medium' | 'low' {
    if (score > this.config.riskThresholds.highConflict) return 'high';
    if (score > this.config.riskThresholds.mediumConflict) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on analysis results
   */
  private generateRecommendations(analysis: BillAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.conflictScore > this.config.riskThresholds.highConflict) {
      recommendations.push(
        'Recommend independent ethics review before proceeding with vote'
      );
    }

    if (analysis.transparencyRating < this.config.riskThresholds.lowTransparency) {
      recommendations.push(
        'Require additional disclosure documentation and public comment period'
      );
    }

    const hasHighInfluence = analysis.corporateInfluence.some(
      c => c.influenceLevel > this.config.riskThresholds.highInfluence
    );
    if (hasHighInfluence) {
      recommendations.push(
        'Consider recusal from voting by sponsors with direct financial ties'
      );
    }

    const hasHighImpactStakeholders = analysis.stakeholderAnalysis.some(
      s => s.impactLevel === 'high'
    );
    if (hasHighImpactStakeholders) {
      recommendations.push(
        'Conduct public hearings with affected stakeholder groups'
      );
    }

    if (analysis.publicBenefit < 50 && analysis.conflictScore > 60) {
      recommendations.push(
        'Re-evaluate bill provisions: low public benefit with high conflict risk'
      );
    }

    return recommendations;
  }
}

// Default configuration
const defaultConfig: AnalysisRepositoryConfig = {
  baseEndpoint: '/api',
  cacheTTL: {
    analysis: 10 * 60 * 1000, // 10 minutes
    conflict: 5 * 60 * 1000, // 5 minutes
    batch: 2 * 60 * 1000 // 2 minutes
  },
  riskThresholds: {
    highConflict: 70,
    mediumConflict: 40,
    lowTransparency: 50,
    highInfluence: 7
  }
};

// Export singleton instance
export const analysisRepository = new AnalysisRepository(defaultConfig);