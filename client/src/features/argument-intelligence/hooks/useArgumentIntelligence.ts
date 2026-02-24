/**
 * Argument Intelligence Hook
 * 
 * React hook for managing argument intelligence data and operations.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Argument,
  ArgumentCluster,
  ArgumentStatistics,
  ArgumentMap,
  ArgumentFilters,
} from '../types';
import * as api from '../api/argument-intelligence-api';

export function useArgumentIntelligence(billId: string) {
  const [arguments, setArguments] = useState<Argument[]>([]);
  const [statistics, setStatistics] = useState<ArgumentStatistics | null>(null);
  const [clusters, setClusters] = useState<ArgumentCluster[]>([]);
  const [argumentMap, setArgumentMap] = useState<ArgumentMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ArgumentFilters>({});

  // Fetch arguments with filters
  const fetchArguments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getArguments(billId, filters);
      setArguments(data.arguments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch arguments');
    } finally {
      setLoading(false);
    }
  }, [billId, filters]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const data = await api.getArgumentStatistics(billId);
      setStatistics(data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }, [billId]);

  // Fetch and cluster arguments
  const fetchClusters = useCallback(async () => {
    try {
      if (arguments.length === 0) return;
      
      const data = await api.clusterArguments(arguments, {
        method: 'hierarchical',
        minSimilarity: 0.6,
        maxClusters: 10,
      });
      setClusters(data.clusters);
    } catch (err) {
      console.error('Failed to cluster arguments:', err);
    }
  }, [arguments]);

  // Fetch argument map
  const fetchArgumentMap = useCallback(async () => {
    try {
      const data = await api.getArgumentMap(billId);
      setArgumentMap(data);
    } catch (err) {
      console.error('Failed to fetch argument map:', err);
    }
  }, [billId]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ArgumentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchArguments();
    fetchStatistics();
  }, [fetchArguments, fetchStatistics]);

  // Fetch clusters when arguments change
  useEffect(() => {
    if (arguments.length > 0) {
      fetchClusters();
    }
  }, [arguments, fetchClusters]);

  // Fetch argument map
  useEffect(() => {
    fetchArgumentMap();
  }, [fetchArgumentMap]);

  return {
    arguments,
    statistics,
    clusters,
    argumentMap,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refetch: fetchArguments,
  };
}
