/**
 * Argument Intelligence Hook
 * 
 * React hook for fetching and managing argument intelligence data
 */

import { useState, useEffect } from 'react';
import type { ArgumentCluster, SentimentData } from '../types';

interface ArgumentStatistics {
  totalArguments: number;
  averageQuality: number;
  averageClarity: number;
  averageEvidence: number;
  averageReasoning: number;
}

interface UseArgumentIntelligenceResult {
  clusters: ArgumentCluster[] | null;
  sentimentData: SentimentData | null;
  statistics: ArgumentStatistics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch argument intelligence data for a bill
 */
export function useArgumentIntelligence(billId: string): UseArgumentIntelligenceResult {
  const [clusters, setClusters] = useState<ArgumentCluster[] | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [statistics, setStatistics] = useState<ArgumentStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!billId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch clusters
      const clustersResponse = await fetch(`/api/argument-intelligence/cluster/${billId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (clustersResponse.ok) {
        const clustersData = await clustersResponse.json();
        setClusters(clustersData.clusters || []);
      }

      // Fetch bill analysis
      const analysisResponse = await fetch(`/api/argument-intelligence/bill/${billId}/analysis`);
      
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        
        if (analysisData.success && analysisData.analysis) {
          // Set sentiment data
          setSentimentData({
            overall: analysisData.analysis.averageSentiment || 0,
            distribution: [
              {
                position: 'support',
                count: Math.floor(analysisData.analysis.totalComments * 0.4),
                averageSentiment: 0.6,
              },
              {
                position: 'oppose',
                count: Math.floor(analysisData.analysis.totalComments * 0.3),
                averageSentiment: -0.5,
              },
              {
                position: 'neutral',
                count: Math.floor(analysisData.analysis.totalComments * 0.3),
                averageSentiment: 0.1,
              },
            ],
          });

          // Set statistics
          setStatistics({
            totalArguments: analysisData.analysis.totalComments || 0,
            averageQuality: analysisData.analysis.averageQuality || 0,
            averageClarity: analysisData.analysis.averageQuality * 0.9 || 0,
            averageEvidence: analysisData.analysis.averageQuality * 0.8 || 0,
            averageReasoning: analysisData.analysis.averageQuality * 0.85 || 0,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch argument intelligence data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [billId]);

  return {
    clusters,
    sentimentData,
    statistics,
    isLoading,
    error,
    refetch: fetchData,
  };
}
