/**
 * Constitutional Intelligence Hook
 * 
 * React Query hook for fetching constitutional analysis data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@client/services/apiService';
import { logger } from '@client/lib/utils/logger';

export interface ConstitutionalViolation {
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedArticles: string[];
  recommendation: string;
}

export interface ConstitutionalPrecedent {
  caseId: string;
  caseName: string;
  relevance: number;
  summary: string;
}

export interface ConstitutionalAnalysis {
  billId: string;
  alignmentScore: number;
  violations: ConstitutionalViolation[];
  recommendations: string[];
  precedents: ConstitutionalPrecedent[];
  analyzedAt: string;
  processingTime: number;
}

export interface AnalyzeRequest {
  billId: string;
  billText: string;
  billTitle: string;
  billType: 'public' | 'private' | 'money' | 'constitutional_amendment';
  affectedInstitutions?: string[];
  proposedChanges?: string[];
}

/**
 * Hook to fetch constitutional analysis for a bill
 */
export function useConstitutionalAnalysis(billId: string | undefined) {
  return useQuery({
    queryKey: ['constitutional-analysis', billId],
    queryFn: async () => {
      if (!billId) throw new Error('Bill ID is required');
      
      const response = await api.get(`/api/constitutional-intelligence/bill/${billId}`);
      return response.data.analysis as ConstitutionalAnalysis;
    },
    enabled: !!billId,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  });
}

/**
 * Hook to trigger constitutional analysis
 */
export function useAnalyzeBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AnalyzeRequest) => {
      logger.info('Analyzing bill for constitutional compliance', {
        component: 'useAnalyzeBill',
        billId: request.billId,
      });

      const response = await api.post('/api/constitutional-intelligence/analyze', request);
      return response.data.analysis as ConstitutionalAnalysis;
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['constitutional-analysis', data.billId] });
      
      logger.info('Constitutional analysis completed', {
        component: 'useAnalyzeBill',
        billId: data.billId,
        alignmentScore: data.alignmentScore,
      });
    },
    onError: (error) => {
      logger.error('Constitutional analysis failed', {
        component: 'useAnalyzeBill',
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

/**
 * Hook to fetch constitutional statistics
 */
export function useConstitutionalStatistics() {
  return useQuery({
    queryKey: ['constitutional-statistics'],
    queryFn: async () => {
      const response = await api.get('/api/constitutional-intelligence/statistics');
      return response.data.statistics;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to clear analysis cache
 */
export function useClearAnalysisCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billId: string) => {
      const response = await api.delete(`/api/constitutional-intelligence/cache/${billId}`);
      return response.data;
    },
    onSuccess: (_, billId) => {
      queryClient.invalidateQueries({ queryKey: ['constitutional-analysis', billId] });
    },
  });
}
