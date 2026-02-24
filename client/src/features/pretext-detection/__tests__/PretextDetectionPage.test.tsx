/**
 * Pretext Detection Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PretextDetectionPage } from '../pages/PretextDetectionPage';
import * as hooks from '../hooks/usePretextDetectionApi';

// Mock the hooks
vi.mock('../hooks/usePretextDetectionApi');

// Mock analytics service
vi.mock('@client/infrastructure/analytics/service', () => ({
  analyticsService: {
    trackPageView: vi.fn(),
    trackUserAction: vi.fn(),
  },
}));

// Mock Helmet
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PretextDetectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title and description', () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    render(<PretextDetectionPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Pretext Detection')).toBeInTheDocument();
    expect(
      screen.getByText(/Identify potential pretext bills using advanced pattern recognition/)
    ).toBeInTheDocument();
  });

  it('displays loading state while fetching alerts', () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<PretextDetectionPage />, { wrapper: createWrapper() });

    // Stats should show loading state
    expect(screen.getAllByText('...').length).toBeGreaterThan(0);
  });

  it('displays alerts when data is loaded', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        billId: 'HB-123',
        score: 85,
        status: 'pending' as const,
        detections: [
          {
            type: 'timing',
            severity: 'high' as const,
            description: 'Bill introduced shortly after crisis',
            evidence: ['Evidence 1'],
            confidence: 0.9,
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: {
        totalAnalyses: 10,
        totalAlerts: 5,
        averageScore: 65,
        detectionsByType: {},
        alertsByStatus: {},
      },
      isLoading: false,
    } as any);

    render(<PretextDetectionPage />, { wrapper: createWrapper() });

    // Switch to alerts tab
    const alertsTab = screen.getByRole('tab', { name: /Alerts/ });
    alertsTab.click();

    await waitFor(() => {
      expect(screen.getByText('Bill HB-123')).toBeInTheDocument();
      expect(screen.getByText(/Risk Score: 85\/100/)).toBeInTheDocument();
    });
  });

  it('displays error state when alerts fail to load', async () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    render(<PretextDetectionPage />, { wrapper: createWrapper() });

    // Switch to alerts tab
    const alertsTab = screen.getByRole('tab', { name: /Alerts/ });
    alertsTab.click();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load alerts/)).toBeInTheDocument();
    });
  });

  it('displays empty state when no alerts exist', async () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    render(<PretextDetectionPage />, { wrapper: createWrapper() });

    // Switch to alerts tab
    const alertsTab = screen.getByRole('tab', { name: /Alerts/ });
    alertsTab.click();

    await waitFor(() => {
      expect(screen.getByText(/No alerts found/)).toBeInTheDocument();
    });
  });

  it('displays analytics data correctly', () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: {
        totalAnalyses: 42,
        totalAlerts: 15,
        averageScore: 68,
        detectionsByType: {
          timing: 10,
          beneficiary: 5,
        },
        alertsByStatus: {
          pending: 8,
          approved: 5,
          rejected: 2,
        },
      },
      isLoading: false,
    } as any);

    render(<PretextDetectionPage />, { wrapper: createWrapper() });

    expect(screen.getByText('42')).toBeInTheDocument(); // Total analyses
    expect(screen.getByText('68')).toBeInTheDocument(); // Average score
  });

  it('calculates pending and high risk alerts correctly', () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        billId: 'HB-123',
        score: 85,
        status: 'pending' as const,
        detections: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert-2',
        billId: 'HB-124',
        score: 75,
        status: 'pending' as const,
        detections: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert-3',
        billId: 'HB-125',
        score: 50,
        status: 'approved' as const,
        detections: [],
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    render(<PretextDetectionPage />, { wrapper: createWrapper() });

    // Should show 2 pending alerts
    const pendingBadges = screen.getAllByText('2');
    expect(pendingBadges.length).toBeGreaterThan(0);
  });
});
