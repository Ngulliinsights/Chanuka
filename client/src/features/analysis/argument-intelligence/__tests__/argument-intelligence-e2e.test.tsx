/**
 * Argument Intelligence E2E Tests
 * 
 * End-to-end tests for the complete argument intelligence workflow.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArgumentIntelligenceDashboard } from '../ui/ArgumentIntelligenceDashboard';
import * as api from '../api/argument-intelligence-api';

vi.mock('../api/argument-intelligence-api');

describe('Argument Intelligence E2E', () => {
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
    {
      id: 'arg_2',
      bill_id: mockBillId,
      user_id: 'user_2',
      argument_text: 'Privacy concerns are not addressed',
      argument_type: 'normative' as const,
      position: 'oppose' as const,
      strength: 0.78,
      confidence: 0.85,
      created_at: '2026-02-24T11:00:00Z',
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
      name: 'Transparency concerns',
      size: 15,
      position: 'support' as const,
      cohesion: 0.82,
      representativeClaims: ['This bill improves transparency', 'Better access to information'],
      members: ['arg_1'],
    },
    {
      id: 'cluster_2',
      name: 'Privacy issues',
      size: 10,
      position: 'oppose' as const,
      cohesion: 0.75,
      representativeClaims: ['Privacy concerns', 'Data protection insufficient'],
      members: ['arg_2'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.getArguments).mockResolvedValue({
      arguments: mockArguments,
      count: 2,
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

  it('loads and displays argument intelligence dashboard', async () => {
    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    // Should show loading state initially
    expect(screen.getByText(/Loading argument intelligence/)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Argument Intelligence')).toBeInTheDocument();
    });

    // Should display statistics
    expect(screen.getByText('100')).toBeInTheDocument(); // Total arguments
    expect(screen.getByText('75%')).toBeInTheDocument(); // Avg strength
  });

  it('navigates between tabs', async () => {
    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    await waitFor(() => {
      expect(screen.getByText('Argument Intelligence')).toBeInTheDocument();
    });

    // Click on Clusters tab
    const clustersTab = screen.getByText('Clusters');
    fireEvent.click(clustersTab);

    await waitFor(() => {
      expect(screen.getByText('Argument Clusters')).toBeInTheDocument();
      expect(screen.getByText('Transparency concerns')).toBeInTheDocument();
    });

    // Click on Sentiment tab
    const sentimentTab = screen.getByText('Sentiment');
    fireEvent.click(sentimentTab);

    await waitFor(() => {
      expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument();
    });

    // Click on Quality tab
    const qualityTab = screen.getByText('Quality');
    fireEvent.click(qualityTab);

    await waitFor(() => {
      expect(screen.getByText('Quality Metrics')).toBeInTheDocument();
    });
  });

  it('filters arguments by position', async () => {
    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    await waitFor(() => {
      expect(screen.getByText('Argument Intelligence')).toBeInTheDocument();
    });

    // Click support filter
    const supportButton = screen.getByText(/Support/);
    fireEvent.click(supportButton);

    await waitFor(() => {
      expect(api.getArguments).toHaveBeenCalledWith(
        mockBillId,
        expect.objectContaining({ position: 'support' })
      );
    });
  });

  it('searches arguments', async () => {
    vi.mocked(api.searchArguments).mockResolvedValue({
      query: 'transparency',
      arguments: [
        {
          id: 'arg_1',
          text: 'This bill improves transparency',
          relevance: 0.95,
          bill_id: mockBillId,
        },
      ],
      count: 1,
    });

    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    await waitFor(() => {
      expect(screen.getByText('Argument Intelligence')).toBeInTheDocument();
    });

    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search arguments...');
    fireEvent.change(searchInput, { target: { value: 'transparency' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(api.getArguments).toHaveBeenCalledWith(
        mockBillId,
        expect.objectContaining({ searchQuery: 'transparency' })
      );
    });
  });

  it('selects and displays cluster details', async () => {
    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    await waitFor(() => {
      expect(screen.getByText('Argument Intelligence')).toBeInTheDocument();
    });

    // Navigate to clusters tab
    const clustersTab = screen.getByText('Clusters');
    fireEvent.click(clustersTab);

    await waitFor(() => {
      expect(screen.getByText('Transparency concerns')).toBeInTheDocument();
    });

    // Click on a cluster
    const cluster = screen.getByText('Transparency concerns');
    fireEvent.click(cluster.closest('div')!);

    await waitFor(() => {
      expect(screen.getByText('Cluster: Transparency concerns')).toBeInTheDocument();
      expect(screen.getByText('Representative Claims:')).toBeInTheDocument();
    });
  });

  it('clears filters', async () => {
    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    await waitFor(() => {
      expect(screen.getByText('Argument Intelligence')).toBeInTheDocument();
    });

    // Apply a filter
    const supportButton = screen.getByText(/Support/);
    fireEvent.click(supportButton);

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    // Clear filters
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(api.getArguments).toHaveBeenCalledWith(mockBillId, {});
    });
  });

  it('handles errors gracefully', async () => {
    vi.mocked(api.getArguments).mockRejectedValue(new Error('Network error'));

    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    await waitFor(() => {
      expect(screen.getByText('Error loading argument intelligence')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays empty state when no arguments', async () => {
    vi.mocked(api.getArguments).mockResolvedValue({
      arguments: [],
      count: 0,
      pagination: {},
    });

    vi.mocked(api.getArgumentStatistics).mockResolvedValue({
      ...mockStatistics,
      totalArguments: 0,
    });

    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    await waitFor(() => {
      expect(screen.getByText('No arguments available for analysis')).toBeInTheDocument();
    });
  });

  it('updates when filters change', async () => {
    render(<ArgumentIntelligenceDashboard billId={mockBillId} />);

    await waitFor(() => {
      expect(screen.getByText('Argument Intelligence')).toBeInTheDocument();
    });

    vi.clearAllMocks();

    // Change confidence filter
    const confidenceSlider = screen.getByLabelText(/Minimum Confidence/);
    fireEvent.change(confidenceSlider, { target: { value: '80' } });

    await waitFor(() => {
      expect(api.getArguments).toHaveBeenCalledWith(
        mockBillId,
        expect.objectContaining({ minConfidence: 0.8 })
      );
    });
  });
});
