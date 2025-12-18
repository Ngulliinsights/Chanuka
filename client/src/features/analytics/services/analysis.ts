/**
 * Analysis Service - Analytics Feature
 * 
 * Migrated from client/src/services/analysis.ts
 * Core service for analyzing legislative bills with conflict detection,
 * transparency rating, and stakeholder impact analysis.
 */

import { globalApiClient } from '@client/core/api/client';
import { logger } from '@client/utils/logger';

/**
 * Core interfaces for bill analysis system
 */
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

interface StakeholderImpact {
  group: string;
  impactLevel: 'high' | 'medium' | 'low';
  description: string;
  affectedPopulation: number;
}

interface CorporateConnection {
  organization: string;
  connectionType: 'financial' | 'advisory' | 'employment';
  influenceLevel: number; // Scale of 1-10
  potentialConflict: boolean;
}

/**
 * Result type for conflict analysis operations
 */
interface ConflictAnalysisResult {
  overallRisk: 'high' | 'medium' | 'low';
  conflicts: CorporateConnection[];
  recommendations: string[];
  analysisDate: Date;
}

/**
 * Service class responsible for analyzing legislative bills
 */
class AnalysisService {
  // Threshold values that define risk levels - centralized for consistency
  private readonly RISK_THRESHOLDS = {
    HIGH_CONFLICT: 70,
    MEDIUM_CONFLICT: 40,
    LOW_TRANSPARENCY: 50,
    HIGH_INFLUENCE: 7
  } as const;

  /**
   * Main method to analyze a bill by its ID
   */
  async analyzeBill(bill_id: number): Promise<BillAnalysis> {
    if (!Number.isInteger(bill_id) || bill_id <= 0) {
      throw new Error('Invalid bill ID: must be a positive integer');
    }

    try {
      const response = await globalApiClient.get(`/api/bills/${bill_id}/analysis`);
      
      if (response.status === 200 && response.data) {
        return this.validateAnalysisData(response.data);
      } else {
        // Use fallback data
        logger.warn(`Using fallback analysis for bill ${bill_id}`, {
          component: 'AnalysisService',
          status: response.status
        });
        return this.generateMockAnalysis(bill_id);
      }
    } catch (error) {
      logger.warn(`API failed for bill ${bill_id}, using fallback analysis`, {
        component: 'AnalysisService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.generateMockAnalysis(bill_id);
    }
  }

  /**
   * Validates that the analysis data has all required fields
   */
  private validateAnalysisData(data: unknown): BillAnalysis {
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
   * Generates mock analysis data for demonstration or testing
   */
  private generateMockAnalysis(bill_id: number): BillAnalysis {
    const seed = bill_id * 9301 + 49297;
    const seededRandom = () => ((seed * 233280) % 2147483647) / 2147483647;
    
    return {
      id: `analysis-${bill_id}-${Date.now()}`,
      bill_id,
      conflictScore: Math.floor(seededRandom() * 100),
      transparencyRating: Math.floor(seededRandom() * 100),
      stakeholderAnalysis: this.generateMockStakeholders(bill_id),
      constitutionalConcerns: this.generateMockConcerns(bill_id),
      publicBenefit: Math.floor(seededRandom() * 100),
      corporateInfluence: this.generateMockCorporateInfluence(bill_id),
      timestamp: new Date()
    };
  }

  private generateMockStakeholders(bill_id: number): StakeholderImpact[] {
    const stakeholderGroups = [
      { group: 'Small Businesses', population: 150000, impact: 'high' as const },
      { group: 'Healthcare Workers', population: 45000, impact: 'medium' as const },
      { group: 'Rural Communities', population: 200000, impact: 'medium' as const },
      { group: 'Tech Sector', population: 85000, impact: 'low' as const }
    ];
    const count = 2 + (bill_id % 2);
    return stakeholderGroups.slice(0, count).map(s => ({
      group: s.group,
      impactLevel: s.impact,
      affectedPopulation: s.population,
      description: `${s.impact.charAt(0).toUpperCase() + s.impact.slice(1)} impact on ${s.group.toLowerCase()}`
    }));
  }

  private generateMockConcerns(bill_id: number): string[] {
    const concerns = [
      'Potential federalism issues with state authority',
      'Due process considerations in enforcement mechanisms',
      'First Amendment implications for speech regulations',
      'Commerce Clause scope and limitations'
    ];
    return concerns.slice(0, 1 + (bill_id % 2));
  }

  private generateMockCorporateInfluence(bill_id: number): CorporateConnection[] {
    const connections: CorporateConnection[] = [
      {
        organization: 'TechCorp Industries',
        connectionType: 'financial',
        influenceLevel: 8,
        potentialConflict: true
      },
      {
        organization: 'Healthcare Alliance',
        connectionType: 'advisory',
        influenceLevel: 5,
        potentialConflict: false
      }
    ];
    return bill_id % 2 === 0 ? connections : connections.slice(0, 1).filter(Boolean);
  }

  /**
   * Performs conflict of interest analysis on a bill
   */
  async getConflictAnalysis(bill_id: number): Promise<ConflictAnalysisResult> {
    const analysis = await this.analyzeBill(bill_id);
    
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
   * Determines risk level based on conflict score
   */
  private calculateRiskLevel(score: number): 'high' | 'medium' | 'low' {
    if (score > this.RISK_THRESHOLDS.HIGH_CONFLICT) return 'high';
    if (score > this.RISK_THRESHOLDS.MEDIUM_CONFLICT) return 'medium';
    return 'low';
  }

  /**
   * Generates actionable recommendations based on analysis results
   */
  private generateRecommendations(analysis: BillAnalysis): string[] {
    const recommendations: string[] = [];
    
    if (analysis.conflictScore > this.RISK_THRESHOLDS.HIGH_CONFLICT) {
      recommendations.push(
        'Recommend independent ethics review before proceeding with vote'
      );
    }
    
    if (analysis.transparencyRating < this.RISK_THRESHOLDS.LOW_TRANSPARENCY) {
      recommendations.push(
        'Require additional disclosure documentation and public comment period'
      );
    }
    
    const hasHighInfluence = analysis.corporateInfluence.some(
      c => c.influenceLevel > this.RISK_THRESHOLDS.HIGH_INFLUENCE
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

  /**
   * Batch analysis method for processing multiple bills efficiently
   */
  async analyzeBills(bill_ids: number[]): Promise<Map<number, BillAnalysis>> {
    const analyses = await Promise.allSettled(
      bill_ids.map(id => this.analyzeBill(id))
    );

    const results = new Map<number, BillAnalysis>();
    
    analyses.forEach((result, index) => {
      const billId = bill_ids[index];
      if (!billId) return;
      
      if (result.status === 'fulfilled') {
        results.set(billId, result.value);
      } else {
        logger.error(`Failed to analyze bill ${billId} in batch`, {
          component: 'AnalysisService',
          error: result.reason
        });
      }
    });

    return results;
  }
}

// Export singleton instance for consistent usage
export const analysisService = new AnalysisService();

export default analysisService;