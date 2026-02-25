/**
 * Pretext Detection Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PretextDetectionPage } from '../pages/PretextDetectionPage';
import * as hooks from '../hooks/usePretextDetectionApi';

// Mock analytics service
vi.mock('@client/infrastructure/analytics/service', () => ({
  analyticsService: {
    trackPageView: vi.fn(),
    trackUserAction: vi.fn(),
  },
}));

// Mock hooks
vi.mock('../hooks/usePretextDetectionApi');

const mockAlerts = [
  {
    id: '1',
    billId: 'HB-123',
    detections: [
      {
        type: 'timing_anomaly',
        severity: 'high' as const,
        description: 'Bill introduced shortly after crisis event',
        evidence: ['Event occurred on 2024-01-01', 'Bill introduced on 2024-01-05'],
        confidence: 0.85,
      },
    ],
    score: 75,
    status: 'pending' as const,
    createdAt: '2024-01-05T10:00:00Z',
  },
  {
    id: '2',
    billId: 'SB-456',
    detections: [
      {
        type: 'beneficiary_mismatch',
        severity: 'medium' as const,
        description: 'Stated purpose differs from actual beneficiaries',
        evidence: ['Purpose: public safety', 'Beneficiaries: private contractors'],
        confidence: 0.72,
      },
    ],
    score: 60,
    status: 'approved' as const,
    createdAt: '2024-01-10T14:30:00Z',
  },
];

const mockAnalytics = {
  totalAnalyses: 150,
  totalAlerts: 25,
  averageScore: 65,
  detectionsByType: {
    timing_anomaly: 10,
    beneficiary_mismatch: 8,
    scope_creep: 7,
  },
  alertsByStatus: {
    pending: 5,
    approved: 15,
    rejected: 5,
  },
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('PretextDetectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and description', () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    expect(screen.getByText('Pretext Detection')).toBeInTheDocument();
    expect(screen.getByText(/Identify potential pretext bills/i)).toBeInTheDocument();
  });

  it('displays stats cards with correct data', () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    expect(screen.getByText('150')).toBeInTheDocument(); // Total Analyses
    expect(screen.getByText('1')).toBeInTheDocument(); // Pending Alerts
    expect(screen.getByText('65')).toBeInTheDocument(); // Average Score
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

    renderWithProviders(<PretextDetectionPage />);

    expect(screen.getByText(/Loading alerts/i)).toBeInTheDocument();
  });

  it('displays error state when alerts fail to load', () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    expect(screen.getByText(/Failed to load alerts/i)).toBeInTheDocument();
  });

  it('displays alerts in alerts tab', async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    const alertsTab = screen.getByRole('tab', { name: /Alerts/i });
    await user.click(alertsTab);

    await waitFor(() => {
      expect(screen.getByText('Bill HB-123')).toBeInTheDocument();
      expect(screen.getByText('Bill SB-456')).toBeInTheDocument();
    });
  });

  it('displays analytics in analytics tab', async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    const analyticsTab = screen.getByRole('tab', { name: /Analytics/i });
    await user.click(analyticsTab);

    await waitFor(() => {
      expect(screen.getByText('Detections by Type')).toBeInTheDocument();
      expect(screen.getByText('Alerts by Status')).toBeInTheDocument();
    });
  });

  it('shows badge with pending count on alerts tab', () => {
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    const alertsTab = screen.getByRole('tab', { name: /Alerts/i });
    expect(alertsTab).toHaveTextContent('1'); // Badge with pending count
  });

  it('displays empty state when no alerts exist', async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    const alertsTab = screen.getByRole('tab', { name: /Alerts/i });
    await user.click(alertsTab);

    await waitFor(() => {
      expect(screen.getByText(/No alerts found/i)).toBeInTheDocument();
    });
  });

  it('tracks page view on mount', () => {
    const { analyticsService } = require('@client/infrastructure/analytics/service');
    
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    expect(analyticsService.trackPageView).toHaveBeenCalledWith({
      path: '/pretext-detection',
      title: 'Pretext Detection',
    });
  });

  it('tracks tab changes', async () => {
    const user = userEvent.setup();
    const { analyticsService } = require('@client/infrastructure/analytics/service');
    
    vi.mocked(hooks.usePretextAlerts).mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(hooks.usePretextAnalytics).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
    } as any);

    renderWithProviders(<PretextDetectionPage />);

    const alertsTab = screen.getByRole('tab', { name: /Alerts/i });
    await user.click(alertsTab);

    expect(analyticsService.trackUserAction).toHaveBeenCalledWith({
      action: 'tab_change',
      category: 'pretext_detection',
      label: 'alerts',
    });
  });
});
