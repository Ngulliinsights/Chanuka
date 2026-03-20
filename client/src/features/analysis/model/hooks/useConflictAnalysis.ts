import { useCallback, useState, useEffect } from 'react';

import { ConflictAnalysis } from '@client/features/analysis/types/index';

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
    sponsorId: sponsorId,
    sponsorName: 'Senator Jane Smith',
    financialInterests: [
      {
        id: 'exp1',
        source: 'Energy Sector Holdings',
        amount: 2500000,
        industry: 'Energy',
        category: 'investment',
        date: `${currentYear - 1}-12-31`,
        description: 'Direct stock holdings in major energy companies',
        verified: true,
      },
      {
        id: 'exp2',
        source: 'Healthcare Investments',
        amount: 1800000,
        industry: 'Healthcare',
        category: 'investment',
        date: `${currentYear - 1}-12-31`,
        description: 'Bond portfolio in healthcare sector',
        verified: true,
      },
    ],
    organizationalConnections: [
      {
        id: 'org1',
        organizationName: 'Energy Corp Inc',
        organizationType: 'corporation',
        connectionType: 'board_member',
        strength: 0.9,
        startDate: `${currentYear - 3}-01-01`,
        description: 'Board member of major energy corporation',
        verified: true,
      },
      {
        id: 'org2',
        organizationName: 'HealthTech Systems',
        organizationType: 'corporation',
        connectionType: 'consultant',
        strength: 0.85,
        startDate: `${currentYear - 2}-06-01`,
        description: 'Consulting role for healthcare technology company',
        verified: true,
      },
    ],
    votingPatterns: [
      {
        billId: '1001',
        billTitle: 'Energy Deregulation Act',
        vote: 'yes',
        date: new Date(currentYear - 1, 3, 15).toISOString(),
        relatedIndustries: ['Energy'],
        financialCorrelation: 0.92,
      },
      {
        billId: '1002',
        billTitle: 'Healthcare Tax Incentives',
        vote: 'yes',
        date: new Date(currentYear - 1, 5, 10).toISOString(),
        relatedIndustries: ['Healthcare'],
        financialCorrelation: 0.88,
      },
    ],
    transparencyScore: {
      overall: 58,
      financialDisclosure: 65,
      votingHistory: 52,
      industryConnections: 48,
      methodology: 'Multi-factor transparency scoring',
      lastUpdated: new Date().toISOString(),
    },
    riskLevel: 'high',
    summary: 'Significant financial interests in affected industries with high correlation to voting patterns',
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
