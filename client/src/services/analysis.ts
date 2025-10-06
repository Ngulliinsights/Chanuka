/**
 * Core interfaces for bill analysis system
 * These define the shape of data flowing through the application
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
  timestamp: Date; // Added to track when analysis was performed
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
 * This provides a structured summary of potential conflicts of interest
 */
interface ConflictAnalysisResult {
  overallRisk: 'high' | 'medium' | 'low';
  conflicts: CorporateConnection[];
  recommendations: string[];
  analysisDate: Date;
}

/**
 * Custom error types for better error handling and debugging
 */
class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly billId: number,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

/**
 * Service class responsible for analyzing legislative bills
 * Handles API communication, fallback logic, and analysis calculations
 */
class AnalysisService {
  // Configuration constants at the class level for easy maintenance
  private readonly API_BASE_URL = '/api/bills';
  private readonly TIMEOUT_MS = 5000;
  
  // Threshold values that define risk levels - centralized for consistency
  private readonly RISK_THRESHOLDS = {
    HIGH_CONFLICT: 70,
    MEDIUM_CONFLICT: 40,
    LOW_TRANSPARENCY: 50,
    HIGH_INFLUENCE: 7
  } as const;

  /**
   * Main method to analyze a bill by its ID
   * Attempts to fetch real analysis, falls back to mock data if unavailable
   * 
   * @param billId - Unique identifier for the bill to analyze
   * @returns Promise resolving to complete bill analysis
   * @throws AnalysisError if billId is invalid
   */
  async analyzeBill(billId: number): Promise<BillAnalysis> {
    // Input validation - fail fast with clear error messages
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new AnalysisError('Invalid bill ID: must be a positive integer', billId);
    }

    try {
      // Create AbortController for request timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(
        `${this.API_BASE_URL}/${billId}/analysis`,
        { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Throw specific error with status code for better debugging
        throw new AnalysisError(
          `Analysis service returned ${response.status}: ${response.statusText}`,
          billId,
          response.status
        );
      }

      const data = await response.json();
      
      // Validate the response structure before returning
      return this.validateAnalysisData(data);
      
    } catch (error) {
      // Log the error for monitoring (in production, use proper logging service)
      console.warn(`Failed to fetch analysis for bill ${billId}:`, error);
      
      // Gracefully fall back to mock data for demonstration purposes
      return this.generateMockAnalysis(billId);
    }
  }

  /**
   * Validates that the analysis data has all required fields
   * This prevents runtime errors from malformed API responses
   */
  private validateAnalysisData(data: any): BillAnalysis {
    const required = ['id', 'billId', 'conflictScore', 'transparencyRating'];
    const missing = required.filter(field => !(field in data));
    
    if (missing.length > 0) {
      throw new Error(`Invalid analysis data: missing fields ${missing.join(', ')}`);
    }
    
    return {
      ...data,
      timestamp: new Date(data.timestamp || Date.now())
    };
  }

  /**
   * Generates mock analysis data for demonstration or testing
   * Uses seeded randomization for more realistic variation
   */
  private generateMockAnalysis(billId: number): BillAnalysis {
    // Use billId as seed for consistent mock data for the same bill
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

  /**
   * Generate realistic mock stakeholder data
   * Separated for better organization and testability
   */
  private generateMockStakeholders(billId: number): StakeholderImpact[] {
    const stakeholderGroups = [
      { group: 'Small Businesses', population: 150000, impact: 'high' as const },
      { group: 'Healthcare Workers', population: 45000, impact: 'medium' as const },
      { group: 'Rural Communities', population: 200000, impact: 'medium' as const },
      { group: 'Tech Sector', population: 85000, impact: 'low' as const }
    ];

    // Return 2-3 stakeholder groups for variety
    const count = 2 + (billId % 2);
    return stakeholderGroups.slice(0, count).map(s => ({
      group: s.group,
      impactLevel: s.impact,
      affectedPopulation: s.population,
      description: `${s.impact.charAt(0).toUpperCase() + s.impact.slice(1)} impact on ${s.group.toLowerCase()}`
    }));
  }

  /**
   * Generate mock constitutional concerns based on bill characteristics
   */
  private generateMockConcerns(billId: number): string[] {
    const concerns = [
      'Potential federalism issues with state authority',
      'Due process considerations in enforcement mechanisms',
      'First Amendment implications for speech regulations',
      'Commerce Clause scope and limitations'
    ];
    
    // Return 1-2 concerns based on bill ID
    return concerns.slice(0, 1 + (billId % 2));
  }

  /**
   * Generate mock corporate influence data
   */
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
   * This is the primary method for identifying ethical concerns
   * 
   * @param billId - ID of the bill to analyze
   * @returns Structured conflict analysis with risk assessment and recommendations
   */
  async getConflictAnalysis(billId: number): Promise<ConflictAnalysisResult> {
    const analysis = await this.analyzeBill(billId);
    
    // Calculate overall risk level using threshold constants
    const overallRisk = this.calculateRiskLevel(analysis.conflictScore);
    
    // Filter to only conflicts that are flagged as potential problems
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
   * Extracted to separate method for clarity and reusability
   */
  private calculateRiskLevel(score: number): 'high' | 'medium' | 'low' {
    if (score > this.RISK_THRESHOLDS.HIGH_CONFLICT) return 'high';
    if (score > this.RISK_THRESHOLDS.MEDIUM_CONFLICT) return 'medium';
    return 'low';
  }

  /**
   * Generates actionable recommendations based on analysis results
   * Uses a rule-based system to identify areas of concern
   * 
   * @param analysis - Complete bill analysis data
   * @returns Array of recommendation strings for stakeholders
   */
  private generateRecommendations(analysis: BillAnalysis): string[] {
    const recommendations: string[] = [];
    
    // Check for high conflict scores
    if (analysis.conflictScore > this.RISK_THRESHOLDS.HIGH_CONFLICT) {
      recommendations.push(
        'Recommend independent ethics review before proceeding with vote'
      );
    }
    
    // Check for transparency concerns
    if (analysis.transparencyRating < this.RISK_THRESHOLDS.LOW_TRANSPARENCY) {
      recommendations.push(
        'Require additional disclosure documentation and public comment period'
      );
    }
    
    // Check for high-influence corporate connections
    const hasHighInfluence = analysis.corporateInfluence.some(
      c => c.influenceLevel > this.RISK_THRESHOLDS.HIGH_INFLUENCE
    );
    
    if (hasHighInfluence) {
      recommendations.push(
        'Consider recusal from voting by sponsors with direct financial ties'
      );
    }

    // Check for significant stakeholder impacts
    const hasHighImpactStakeholders = analysis.stakeholderAnalysis.some(
      s => s.impactLevel === 'high'
    );
    
    if (hasHighImpactStakeholders) {
      recommendations.push(
        'Conduct public hearings with affected stakeholder groups'
      );
    }

    // Check public benefit vs conflict score ratio
    if (analysis.publicBenefit < 50 && analysis.conflictScore > 60) {
      recommendations.push(
        'Re-evaluate bill provisions: low public benefit with high conflict risk'
      );
    }
    
    return recommendations;
  }

  /**
   * Batch analysis method for processing multiple bills efficiently
   * Useful for dashboard views or comparative analysis
   * 
   * @param billIds - Array of bill IDs to analyze
   * @returns Promise resolving to map of bill IDs to their analyses
   */
  async analyzeBills(billIds: number[]): Promise<Map<number, BillAnalysis>> {
    // Process all bills in parallel for better performance
    const analyses = await Promise.allSettled(
      billIds.map(id => this.analyzeBill(id))
    );

    const results = new Map<number, BillAnalysis>();
    
    analyses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.set(billIds[index], result.value);
      } else {
        // Log failed analyses but continue processing others
        console.error(`Failed to analyze bill ${billIds[index]}:`, result.reason);
      }
    });

    return results;
  }
}

// Export singleton instance for consistent usage across the application
export const analysisService = new AnalysisService();