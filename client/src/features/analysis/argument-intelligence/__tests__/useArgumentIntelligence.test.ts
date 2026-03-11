/**
 * useArgumentIntelligence Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useArgumentIntelligence } from '../hooks/useArgumentIntelligence';
import * as api from '../api/argument-intelligence-api';

vi.mock('../api/argument-intelligence-api');

describe('useArgumentIntelligence', () => {
  const mockBillId = 'bill_123';
  
  const mockArguments = [
    {
      id: 'arg_1',
      bill_id: mockBillId,
      user_id: 'user_1',
      argument_text: 'This bill improves transparency',
      argument_type: 'evidence-based' as const,
      position: 'support' as const,
      strength: 0.85,
      confidence: 0.92,
      created_at: '2026-02-24T10:00:00Z',
    },
  ];

  const mockStatistics = {
    bill_id: mockBillId,
    totalArguments: 100,
    positionBreakdown: {
      support: 60,
      oppose: 30,
      neutral: 10,
    },
    typeBreakdown: {
      'evidence-based': 40,
      normative: 30,
      causal: 20,
      comparative: 10,
    },
    averageStrength: 0.75,
    averageConfidence: 0.82,
    claimsExtracted: 250,
    evidenceFound: 180,
    topStakeholders: [],
  };

  const mockClusters = [
    {
      id: 'cluster_1',
      name: 'Transparency',
      size: 15,
      position: 'support' as const,
      cohesion: 0.82,
      representativeClaims: ['Claim 1'],
      members: ['arg_1'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(api.getArguments).mockResolvedValue({
      arguments: mockArguments,
      count: 1,
      pagination: {},
    });
    
    vi.mocked(api.getArgumentStatistics).mockResolvedValue(mockStatistics);
    
    vi.mocked(api.clusterArguments).mockResolvedValue({
      clusters: mockClusters,
      outliers: [],
      metrics: {},
    });
    
    vi.mocked(api.getArgumentMap).mockResolvedValue({
      nodes: [],
      edges: [],
      clusters: [],
    });
  });

  it('fetches arguments on mount', async () => {
    const { result } = renderHook(() => useArgumentIntelligence(mockBillId));
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(api.getArguments).toHaveBeenCalledWith(mockBillId, {});
    expect(result.current.arguments).toEqual(mockArguments);
  });

  it('fetches statistics on mount', async () => {
    const { result } = renderHook(() => useArgumentIntelligence(mockBillId));
    
    await waitFor(() => {
      expect(result.current.statistics).toEqual(mockStatistics);
    });
    
    expect(api.getArgumentStatistics).toHaveBeenCalledWith(mockBillId);
  });

  it('fetches clusters after arguments are loaded', async () => {
    const { result } = renderHook(() => useArgumentIntelligence(mockBillId));
    
    await waitFor(() => {
      expect(result.current.clusters).toEqual(mockClusters);
    });
    
    expect(api.clusterArguments).toHaveBeenCalled();
  });

  it('updates filters correctly', async () => {
    const { result } = renderHook(() => useArgumentIntelligence(mockBillId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    result.current.updateFilters({ position: 'support' });
    
    await waitFor(() => {
      expect(result.current.filters.position).toBe('support');
    });
  });

  it('clears filters correctly', async () => {
    const { result } = renderHook(() => useArgumentIntelligence(mockBillId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    result.current.updateFilters({ position: 'support', minConfidence: 0.8 });
    result.current.clearFilters();
    
    await waitFor(() => {
      expect(result.current.filters).toEqual({});
    });
  });

  it('handles errors gracefully', async () => {
    vi.mocked(api.getArguments).mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useArgumentIntelligence(mockBillId));
    
    await waitFor(() => {
      expect(result.current.error).toBe('API Error');
      expect(result.current.loading).toBe(false);
    });
  });

  it('refetches data when refetch is called', async () => {
    const { result } = renderHook(() => useArgumentIntelligence(mockBillId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    vi.clearAllMocks();
    
    result.current.refetch();
    
    await waitFor(() => {
      expect(api.getArguments).toHaveBeenCalled();
    });
  });
});
