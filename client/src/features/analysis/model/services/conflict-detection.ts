import { ConflictAnalysis, FinancialInterest } from '@client/features/analysis/types';

/**
 * Service interface for conflict detection
 * Supports both mock and real implementations
 */
export interface ConflictDetectionService {
  detectConflicts(
    sponsorId: string,
    billTopics: string[],
    financialInterests: FinancialInterest[]
  ): Promise<ConflictAnalysis>;

  analyzeFinancialExposure(sponsorId: string): Promise<FinancialInterest[]>;

  calculateTransparencyScore(sponsorId: string): Promise<number>;
}

/**
 * Mock implementation using hardcoded data
 * Currently what ConflictOfInterestAnalysis component uses
 */
export class MockConflictDetectionService implements ConflictDetectionService {
  async detectConflicts(
    _sponsorId: string,
    _billTopics: string[],
    _financialInterests: FinancialInterest[]
  ): Promise<ConflictAnalysis> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      billId: 1,
      sponsorId: parseInt(sponsorId),
      sponsorName: `Sponsor ${sponsorId}`,
      analysisDate: new Date().toISOString(),
      riskAssessment: {
        overallRisk: 72,
        conflictDetected: true,
        riskLevel: 'high',
        confidence: 0.85,
      },
      conflicts: [],
      votingHistory: [],
      transparencyScore: {
        overallScore: 58,
        components: {
          financialDisclosure: { score: 65, weight: 0.4, details: 'Complete but late disclosure' },
          votingHistory: { score: 52, weight: 0.35, details: 'Limited voting explanations' },
          industryConnections: {
            score: 48,
            weight: 0.25,
            details: 'Significant undisclosed connections',
          },
        },
        methodology: 'Multi-factor transparency scoring',
      },
      implementationWorkarounds: [],
      networkNodes: [],
      networkLinks: [],
    };
  }

  async analyzeFinancialExposure(_sponsorId: string): Promise<FinancialInterest[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [];
  }

  async calculateTransparencyScore(_sponsorId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return 58;
  }
}

/**
 * Real implementation calling backend API
 * To be implemented in Phase 3
 */
export class RealConflictDetectionService implements ConflictDetectionService {
  constructor(private apiBaseUrl: string) {}

  async detectConflicts(
    sponsorId: string,
    billTopics: string[],
    financialInterests: FinancialInterest[]
  ): Promise<ConflictAnalysis> {
    const response = await fetch(`${this.apiBaseUrl}/api/analysis/conflicts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sponsorId, billTopics, financialInterests }),
    });

    if (!response.ok) {
      throw new Error(`Failed to detect conflicts: ${response.statusText}`);
    }

    return response.json();
  }

  async analyzeFinancialExposure(sponsorId: string): Promise<FinancialInterest[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/analysis/financial/${sponsorId}`);

    if (!response.ok) {
      throw new Error(`Failed to analyze financial exposure: ${response.statusText}`);
    }

    return response.json();
  }

  async calculateTransparencyScore(sponsorId: string): Promise<number> {
    const response = await fetch(`${this.apiBaseUrl}/api/analysis/transparency/${sponsorId}`);

    if (!response.ok) {
      throw new Error(`Failed to calculate transparency score: ${response.statusText}`);
    }

    const data = await response.json();
    return data.score;
  }
}

/**
 * Factory function for creating service instances
 * Environment-based selection: mock (Phase 1) or real (Phase 3)
 */
export function createConflictDetectionService(): ConflictDetectionService {
  const useRealData = process.env.REACT_APP_USE_REAL_ANALYSIS === 'true';
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  if (useRealData) {
    return new RealConflictDetectionService(apiUrl);
  }

  return new MockConflictDetectionService();
}
