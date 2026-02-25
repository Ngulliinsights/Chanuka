/**
 * Advocacy Dashboard Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AdvocacyDashboard } from '../pages/AdvocacyDashboard';

// Mock the hooks
vi.mock('../hooks/useAdvocacy', () => ({
  useCampaigns: vi.fn(),
  useTrendingCampaigns: vi.fn(),
  useUserActions: vi.fn(),
  useUserDashboard: vi.fn(),
  useJoinCampaign: vi.fn(),
}));

const mockCampaigns = [
  {
    id: '1',
    title: 'Test Campaign 1',
    description: 'Test description 1',
    bill_id: 'bill-1',
    organizerId: 'org-1',
    status: 'active' as const,
    goals: ['Goal 1', 'Goal 2'],
    start_date: '2026-02-01',
    end_date: '2026-03-01',
    participantCount: 50,
    impactScore: 75,
    is_public: true,
    created_at: '2026-02-01',
    updated_at: '2026-02-01',
  },
];

const mockActions = [
  {
    id: '1',
    campaign_id: '1',
    user_id: 'user-1',
    actionType: 'contact_representative' as const,
    title: 'Contact your MP',
    description: 'Send an email',
    status: 'pending' as const,
    priority: 'high' as const,
    estimatedTimeMinutes: 15,
    created_at: '2026-02-01',
  },
];

const mockDashboard = {
  activeCampaigns: 3,
  pendingActions: 5,
  completedActions: 12,
  totalImpact: 250,
};

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('AdvocacyDashboard', () => {
  beforeEach(() => {
    const {
      useCampaigns,
      useTrendingCampaigns,
      useUserActions,
      useUserDashboard,
      useJoinCampaign,
    } = require('../hooks/useAdvocacy');

    useCampaigns.mockReturnValue({
      data: mockCampaigns,
      isLoading: false,
    });

    useTrendingCampaigns.mockReturnValue({
      data: mockCampaigns,
    });

    useUserActions.mockReturnValue({
      data: mockActions,
    });

    useUserDashboard.mockReturnValue({
      data: mockDashboard,
    });

    useJoinCampaign.mockReturnValue({
      mutate: vi.fn(),
    });
  });

  it('should render dashboard header', () => {
    renderWithProviders(<AdvocacyDashboard />);

    expect(screen.getByText(/advocacy coordination/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create campaign/i })).toBeInTheDocument();
  });

  it('should display stats overview', () => {
    renderWithProviders(<AdvocacyDashboard />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Active campaigns
    expect(screen.getByText('5')).toBeInTheDocument(); // Pending actions
    expect(screen.getByText('12')).toBeInTheDocument(); // Completed actions
    expect(screen.getByText('250')).toBeInTheDocument(); // Total impact
  });

  it('should display trending campaigns', () => {
    renderWithProviders(<AdvocacyDashboard />);

    expect(screen.getByText(/trending campaigns/i)).toBeInTheDocument();
    expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
  });

  it('should display pending actions', () => {
    renderWithProviders(<AdvocacyDashboard />);

    expect(screen.getByText(/your pending actions/i)).toBeInTheDocument();
    expect(screen.getByText('Contact your MP')).toBeInTheDocument();
  });

  it('should switch between tabs', async () => {
    renderWithProviders(<AdvocacyDashboard />);

    const campaignsTab = screen.getByRole('tab', { name: /campaigns/i });
    await userEvent.click(campaignsTab);

    expect(screen.getByText(/all active campaigns/i)).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    const { useCampaigns } = require('../hooks/useAdvocacy');
    useCampaigns.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderWithProviders(<AdvocacyDashboard />);

    const campaignsTab = screen.getByRole('tab', { name: /campaigns/i });
    userEvent.click(campaignsTab);

    waitFor(() => {
      expect(screen.getByText(/loading campaigns/i)).toBeInTheDocument();
    });
  });

  it('should handle empty state', () => {
    const { useCampaigns, useUserActions } = require('../hooks/useAdvocacy');
    useCampaigns.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useUserActions.mockReturnValue({
      data: [],
    });

    renderWithProviders(<AdvocacyDashboard />);

    expect(screen.getByText(/no pending actions/i)).toBeInTheDocument();
  });
});
