/**
 * Community Hub Tests
 * 
 * Basic tests to verify Community Hub components render correctly
 */

import { render, screen } from '@testing-library/react';
import { CommunityHub } from '@client/CommunityHub';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock the media query hook
jest.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn(() => false), // Default to desktop
}));

// Mock the store
jest.mock('../../../store/slices/communitySlice', () => ({
  useCommunityStore: () => ({
    loading: false,
    error: null,
    stats: {
      totalMembers: 1000,
      activeToday: 50,
      activeThisWeek: 200,
      totalDiscussions: 100,
      totalComments: 500,
      expertContributions: 25,
      activeCampaigns: 5,
      activePetitions: 8,
      lastUpdated: new Date().toISOString(),
    },
    isConnected: true,
    setLoading: jest.fn(),
    setError: jest.fn(),
    handleRealTimeUpdate: jest.fn(),
    setConnectionStatus: jest.fn(),
    updateTrendingScores: jest.fn(),
  }),
  useCommunitySelectors: () => ({
    paginatedActivityFeed: [],
    filteredTrendingTopics: [],
    filteredExpertInsights: [],
    filteredCampaigns: [],
    filteredPetitions: [],
    hasMoreItems: false,
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CommunityHub', () => {
  it('renders the community hub header', () => {
    render(
      <TestWrapper>
        <CommunityHub />
      </TestWrapper>
    );

    expect(screen.getByText('Community Hub')).toBeInTheDocument();
    expect(screen.getByText('Connect, discuss, and take action on legislation that matters')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    render(
      <TestWrapper>
        <CommunityHub />
      </TestWrapper>
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('displays action buttons', () => {
    render(
      <TestWrapper>
        <CommunityHub />
      </TestWrapper>
    );

    expect(screen.getByText('Local Impact')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});