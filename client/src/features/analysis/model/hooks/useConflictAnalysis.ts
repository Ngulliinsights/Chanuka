import { useCallback, useState, useEffect } from 'react';

import { ConflictAnalysis } from '@client/features/analysis/types';

/**
 * Hook for fetching and managing conflict analysis data
 * Phase 1: Uses mock data from component logic
 * Phase 2: Will support service layer abstraction
 * Phase 3: Will integrate real API endpoints
 */
export function useConflictAnalysis(billId: number, sponsorId: number) {
  const [data, setData] = useState<ConflictAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      // Phase 1: Generate mock data
      const mockData = generateMockConflictAnalysis(billId, sponsorId);
      setData(mockData);

      // Phase 2: Service abstraction
      // const analysisService = createConflictDetectionService();
      // const data = await analysisService.detectConflicts(sponsorId, ['environment'], mockData.conflicts[0]?.financialExposures || []);

      // Phase 3: Real API integration
      // const response = await fetch(`/api/analysis/${billId}/${sponsorId}`);
      // const data = await response.json();
      // setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
    } finally {
      setLoading(false);
    }
  }, [billId, sponsorId]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return { data, loading, error, refetch: fetchAnalysis };
}

/**
 * Generate mock conflict analysis data matching ConflictOfInterestAnalysis component expectations
 */
function generateMockConflictAnalysis(billId: number, sponsorId: number): ConflictAnalysis {
  const currentYear = new Date().getFullYear();

  return {
    billId,
    sponsorId,
    sponsorName: 'Senator Jane Smith',
    analysisDate: new Date().toISOString(),
    riskAssessment: {
      overallRisk: 72,
      conflictDetected: true,
      riskLevel: 'high',
      confidence: 0.85,
    },
    conflicts: [
      {
        id: '1',
        type: 'financial',
        severity: 'high',
        description: 'Significant financial interests in affected industries',
        relatedInterests: ['Energy', 'Healthcare'],
        financialExposures: [
          {
            id: 'exp1',
            source: 'Energy Sector Holdings',
            amount: 2500000,
            year: currentYear - 1,
            industry: 'Energy',
            category: 'Stocks',
            verificationStatus: 'verified',
            description: 'Direct stock holdings in major energy companies',
          },
          {
            id: 'exp2',
            source: 'Healthcare Investments',
            amount: 1800000,
            year: currentYear - 1,
            industry: 'Healthcare',
            category: 'Bonds',
            verificationStatus: 'verified',
            description: 'Bond portfolio in healthcare sector',
          },
        ],
      },
    ],
    votingHistory: [
      {
        id: 'vote1',
        billId: 1001,
        vote: 'yes',
        billTitle: 'Energy Deregulation Act',
        date: new Date(currentYear - 1, 3, 15).toISOString(),
        financialCorrelation: 0.92,
        explanation: 'Supports energy sector interests',
      },
      {
        id: 'vote2',
        billId: 1002,
        vote: 'yes',
        billTitle: 'Healthcare Tax Incentives',
        date: new Date(currentYear - 1, 5, 10).toISOString(),
        financialCorrelation: 0.88,
        explanation: 'Supports healthcare investments',
      },
    ],
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
    implementationWorkarounds: [
      {
        id: 'work1',
        originalProvision: 'Strict energy company regulation limits',
        rejectionReason: 'lobbying_pressure',
        workaround: 'Exemption for companies with <1000 employees',
        implemented: true,
        successRate: 0.75,
        timeline: `Q2 ${currentYear}`,
      },
    ],
    networkNodes: [
      { id: 'sponsor', label: 'Senator Jane Smith', type: 'sponsor', value: 10 },
      { id: 'company1', label: 'Energy Corp Inc', type: 'company', value: 8 },
      { id: 'company2', label: 'HealthTech Systems', type: 'company', value: 7 },
      { id: 'org1', label: 'Industry Coalition', type: 'organization', value: 6 },
    ],
    networkLinks: [
      { source: 'sponsor', target: 'company1', type: 'financial', strength: 0.9 },
      { source: 'sponsor', target: 'company2', type: 'financial', strength: 0.85 },
      { source: 'sponsor', target: 'org1', type: 'membership', strength: 0.7 },
      { source: 'company1', target: 'org1', type: 'association', strength: 0.8 },
    ],
  };
}

/**
 * Hook for bill-specific analysis filtering
 */
export function useBillAnalysis(billId: number, sponsorIds: number[]) {
  const [analysisData, setAnalysisData] = useState<ConflictAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBillAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      // Phase 1: Generate mock analyses for all sponsors
      const analyses = sponsorIds.map(sponsorId => generateMockConflictAnalysis(billId, sponsorId));
      setAnalysisData(analyses);

      // Phase 3: Real API integration
      // const response = await fetch(`/api/analysis/bill/${billId}`);
      // const data = await response.json();
      // setAnalysisData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analyses');
    } finally {
      setLoading(false);
    }
  }, [billId, sponsorIds]);

  useEffect(() => {
    fetchBillAnalyses();
  }, [fetchBillAnalyses]);

  return { analyses: analysisData, loading, error, refetch: fetchBillAnalyses };
}
