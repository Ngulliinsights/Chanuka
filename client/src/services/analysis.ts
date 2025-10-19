import { logger } from '../../../shared/core/src/observability/logging';
import { apiService, ApiResponse, ApiError } from './apiService'; // <-- Import the new service

/**
 * Core interfaces for bill analysis system
 */
export interface BillAnalysis {
  id: string;
  billId: number;
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

// REFACTORED: Removed local AnalysisError, will use ApiError from apiService.ts

/**
 * Service class responsible for analyzing legislative bills
 * REFACTORED: No longer handles API communication directly. Uses apiService.
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
   * Fetches analysis from the API service and handles success or fallback.
   * * @param billId - Unique identifier for the bill to analyze
   * @returns Promise resolving to complete bill analysis
   * @throws ApiError if billId is invalid or API fails without fallback
   */
  async analyzeBill(billId: number): Promise<BillAnalysis> {
    if (!Number.isInteger(billId) || billId <= 0) {
      // Still good to have input validation
      throw new Error('Invalid bill ID: must be a positive integer');
    }

    // REFACTORED: Use the centralized apiService
    const response = await apiService.get<BillAnalysis>(
      `/api/bills/${billId}/analysis`,
      {
        // Provide mock data as a fallback on failure
        fallbackData: this.generateMockAnalysis(billId) 
      }
    );

    if (response.success) {
      // Real or cached data was returned
      return this.validateAnalysisData(response.data);
    } else {
      // Fallback data was used
      logger.warn(`Using fallback analysis for bill ${billId}`, {
        component: 'AnalysisService',
        error: response.error.message,
        status: response.error.status
      });
      return response.data; // This is the mock data
    }
  }

  /**
   * Validates that the analysis data has all required fields
   */
  private validateAnalysisData(data: any): BillAnalysis {
    const required = ['id', 'billId', 'conflictScore', 'transparencyRating'];
    const missing = required.filter(field => !(field in data));
    
    if (missing.length > 0) {
      // This is a critical error, API returned bad data
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
  private generateMockAnalysis(billId: number): BillAnalysis {
    const seed = billId * 9301 + 49297;
    const seededRandom = () => ((seed * 233280) % 2147483647) / 2147483647;
    
    return {
      id: `analysis-${billId}-${Date.now()}`,
      billId,
      conflictScore: Math.floor(seededRandom() * 100),
      transparencyRating: Math.floor(seededRandom() * 100),
      stakeholderAnalysis: this.generateMockStakeholders(billId),
      constitutionalConcerns: this.generateMockConcerns(billId),
      publicBenefit: Math.floor(seededRandom() * 100),
      corporateInfluence: this.generateMockCorporateInfluence(billId),
      timestamp: new Date()
    };
  }

  // --- Mock data helper functions remain unchanged ---

  private generateMockStakeholders(billId: number): StakeholderImpact[] {
    const stakeholderGroups = [
      { group: 'Small Businesses', population: 150000, impact: 'high' as const },
      { group: 'Healthcare Workers', population: 45000, impact: 'medium' as const },
      { group: 'Rural Communities', population: 200000, impact: 'medium' as const },
      { group: 'Tech Sector', population: 85000, impact: 'low' as const }
    ];
    const count = 2 + (billId % 2);
    return stakeholderGroups.slice(0, count).map(s => ({
      group: s.group,
      impactLevel: s.impact,
      affectedPopulation: s.population,
      description: `${s.impact.charAt(0).toUpperCase() + s.impact.slice(1)} impact on ${s.group.toLowerCase()}`
    }));
  }

  private generateMockConcerns(billId: number): string[] {
    const concerns = [
      'Potential federalism issues with state authority',
      'Due process considerations in enforcement mechanisms',
      'First Amendment implications for speech regulations',
      'Commerce Clause scope and limitations'
    ];
    return concerns.slice(0, 1 + (billId % 2));
  }

  private generateMockCorporateInfluence(billId: number): CorporateConnection[] {
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
    return billId % 2 === 0 ? connections : [connections[0]];
  }

  /**
   * Performs conflict of interest analysis on a bill
   */
  async getConflictAnalysis(billId: number): Promise<ConflictAnalysisResult> {
    // This method now benefits from the fallback logic in analyzeBill
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
  async analyzeBills(billIds: number[]): Promise<Map<number, BillAnalysis>> {
    // Process all bills in parallel
    const analyses = await Promise.allSettled(
      billIds.map(id => this.analyzeBill(id))
    );

    const results = new Map<number, BillAnalysis>();
    
    analyses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.set(billIds[index], result.value);
      } else {
        // Log failed analyses but continue processing others
        logger.error(`Failed to analyze bill ${billIds[index]} in batch`, {
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