// ============================================================================
// ANALYTICS DASHBOARD TESTS
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalyticsDashboard } from '../ui/AnalyticsDashboard';
import type { FlagAnalytics } from '../types';

vi.mock('../hooks/useFeatureFlags', () => ({
  useFlagAnalytics: vi.fn(),
}));

const mockAnalytics: FlagAnalytics = {
  flagName: 'test-flag',
  enabled: true,
  rolloutPercentage: 50,
  totalEvaluations: 1000,
  enabledCount: 600,
  disabledCount: 400,
  enabledPercentage: 60,
  metrics: {
    avgResponseTime: 150,
    errorRate: 0.01,
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('AnalyticsDashboard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    const { useFlagAnalytics } = require('../hooks/useFeatureFlags');
    useFlagAnalytics.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<AnalyticsDashboard flagName="test-flag" onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const { useFlagAnalytics } = require('../hooks/useFeatureFlags');
    useFlagAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    render(<AnalyticsDashboard flagName="test-flag" onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
  });

  it('renders analytics data', () => {
    const { useFlagAnalytics } = require('../hooks/useFeatureFlags');
    useFlagAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    });

    render(<AnalyticsDashboard flagName="test-flag" onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Analytics: test-flag')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument(); // Total evaluations
    expect(screen.getByText('600')).toBeInTheDocument(); // Enabled count
    expect(screen.getByText('400')).toBeInTheDocument(); // Disabled count
  });

  it('displays enabled status', () => {
    const { useFlagAnalytics } = require('../hooks/useFeatureFlags');
    useFlagAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    });

    render(<AnalyticsDashboard flagName="test-flag" onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Rollout: 50%')).toBeInTheDocument();
  });

  it('displays percentages correctly', () => {
    const { useFlagAnalytics } = require('../hooks/useFeatureFlags');
    useFlagAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    });

    render(<AnalyticsDashboard flagName="test-flag" onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('60.0% of evaluations')).toBeInTheDocument();
    expect(screen.getByText('40.0% of evaluations')).toBeInTheDocument();
  });

  it('displays additional metrics when available', () => {
    const { useFlagAnalytics } = require('../hooks/useFeatureFlags');
    useFlagAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    });

    render(<AnalyticsDashboard flagName="test-flag" onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Additional Metrics')).toBeInTheDocument();
    expect(screen.getByText(/"avgResponseTime": 150/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const { useFlagAnalytics } = require('../hooks/useFeatureFlags');
    useFlagAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<AnalyticsDashboard flagName="test-flag" onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    });

    const closeButtons = screen.getAllByText('Close');
    await user.click(closeButtons[0]);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
