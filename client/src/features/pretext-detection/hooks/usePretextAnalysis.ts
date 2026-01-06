/**
 * Hook for pretext analysis functionality
 * Provides analysis of legislative content for potential pretexts
 */

import { useState, useCallback } from 'react';

import { useSafeQuery } from './use-safe-query';

export interface PretextAnalysisResult {
  score: number;
  indicators: string[];
  confidence: number;
  recommendations: string[];
}

export interface PretextAnalysisOptions {
  billId?: string;
  content?: string;
  enabled?: boolean;
}

export function usePretextAnalysis(options: PretextAnalysisOptions = {}) {
  const { billId, content, enabled = true } = options;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PretextAnalysisResult | null>(null);

  // Query for pretext analysis data
  const { data, isLoading, error, refetch } = useSafeQuery<PretextAnalysisResult>({
    queryKey: ['pretext-analysis', billId, content],
    endpoint: billId ? `/api/bills/${billId}/pretext-analysis` : undefined,
    enabled: enabled && (!!billId || !!content),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Manual analysis function for custom content
  const analyzeContent = useCallback(async (textContent: string) => {
    if (!textContent.trim()) {
      return null;
    }

    setIsAnalyzing(true);
    try {
      // Mock analysis for now - replace with actual API call
      const mockResult: PretextAnalysisResult = {
        score: Math.random() * 100,
        indicators: [
          'Vague language detected',
          'Broad authority granted',
          'Limited oversight mechanisms',
        ],
        confidence: 0.75,
        recommendations: [
          'Request more specific language',
          'Add sunset clauses',
          'Include regular review requirements',
        ],
      };

      setAnalysisResult(mockResult);
      return mockResult;
    } catch (error) {
      console.error('Pretext analysis failed:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    data: data || analysisResult,
    isLoading: isLoading || isAnalyzing,
    error,
    analyzeContent,
    refetch,
  };
}

export default usePretextAnalysis;
