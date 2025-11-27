/**
 * UserDashboardSection Tests
 * Tests for the consolidated user dashboard functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import UserDashboardSection from '@client/UserDashboardSection';
import { MockUserFactory } from '@client/test-utils';

// Mock the services
const mockUserService = {
  getUserDashboard: vi.fn(),
  getUserActivity: vi.fn(),
  getUserMetrics: vi.fn(),
  getUserBadges: vi.fn(),
};

const mockBillsService = {
  getTrackedBills: vi.fn(),
  getBillEngagement: vi.fn(),
};

vi.mock('../../../services/userService', () => ({
  userService: mockUserService,
}));

vi.mock('../../../services/billsService', () => ({
  billsService: mockBillsService,
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('UserDashboardSection', () => {
  const mockUser = MockUserFactory.createMockCitizenUser({
    name: 'John Doe',
    id: 'user-123',
  });

  const mockDashboardData = {
    metrics: {
      billsTracked: 15,
      commentsPosted: 8,
      votesParticipated: 12,
      engagementScore: 85,
    },
    recentActivity: [
      {
        id: '1',
        type: 'comment',
        description: 'Commented on Bill HB-123',
        timestamp: '2023-11-18T10:00:00Z',
      },
      {
        id: '2',
        type: 'vote',
        description: 'Voted on Bill SB-456',
        timestamp: '2023-11-17T15:30:00Z',
      },
    ],
    badges: [
      {
        id: 'civic-champion',
        name: 'Civic Champion',
        description: 'Actively engaged in civic discussions',
        earned: true,
        earnedDate: '2023-11-01T00:00:00Z',
      },
      {
        id: 'bill-tracker',
        name: 'Bill Tracker',
        description: 'Tracks multiple bills regularly',
        earned: true,
        earnedDate: '2023-10-15T00:00:00Z',
      },
    ],
    trackedBills: [
      {
        id: 'bill-1',
        title: 'Healthcare Reform Act',
        status: 'In Committee',
        lastUpdate: '2023-11-18T08:00:00Z',
      },
      {
        id: 'bill-2',
        title: 'Education Funding Bill',
        status: 'Passed House',
        lastUpdate: '2023-11-17T14:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserService.getUserDashboard.mockResolvedValue({
      success: true,
      data: mockDashboardData,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dashboard Overview', () => {
    it('displays user metrics correctly', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument(); // Bills tracked
        expect(screen.getByText('8')).toBeInTheDocument();  // Comments posted
        expect(screen.getByText('12')).toBeInTheDocument(); // Votes participated
        expect(screen.getByText('85')).toBeInTheDocument(); // Engagement score
      });

      expect(screen.getByText(/bills tracked/i)).toBeInTheDocument();
      expect(screen.getByText(/comments posted/i)).toBeInTheDocument();
      expect(screen.getByText(/votes participated/i)).toBeInTheDocument();
      expect(screen.getByText(/engagement score/i)).toBeInTheDocument();
    });

    it('shows loading state while fetching data', () => {
      mockUserService.getUserDashboard.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('handles empty dashboard data gracefully', async () => {
      mockUserService.getUserDashboard.mockResolvedValue({
        success: true,
        data: {
          metrics: { billsTracked: 0, commentsPosted: 0, votesParticipated: 0, engagementScore: 0 },
          recentActivity: [],
          badges: [],
          trackedBills: [],
        },
      });

      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/get started/i)).toBeInTheDocument();
      });
    });
  });

  describe('Recent Activity', () => {
    it('displays recent activity items', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Commented on Bill HB-123')).toBeInTheDocument();
        expect(screen.getByText('Voted on Bill SB-456')).toBeInTheDocument();
      });
    });

    it('shows activity timestamps in relative format', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/ago/)).toBeInTheDocument();
      });
    });

    it('handles empty activity list', async () => {
      mockUserService.getUserDashboard.mockResolvedValue({
        success: true,
        data: { ...mockDashboardData, recentActivity: [] },
      });

      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
      });
    });

    it('provides links to activity details', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const activityLink = screen.getByRole('link', { name: /commented on bill hb-123/i });
        expect(activityLink).toHaveAttribute('href', expect.stringContaining('/bills/HB-123'));
      });
    });
  });

  describe('Badge System', () => {
    it('displays earned badges', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Civic Champion')).toBeInTheDocument();
        expect(screen.getByText('Bill Tracker')).toBeInTheDocument();
      });
    });

    it('shows badge descriptions on hover', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const badge = screen.getByTestId('badge-civic-champion');
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getByTestId('badge-civic-champion');
      await user.hover(badge);

      expect(screen.getByText('Actively engaged in civic discussions')).toBeInTheDocument();
    });

    it('displays badge earned dates', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/earned/i)).toBeInTheDocument();
      });
    });

    it('handles no badges gracefully', async () => {
      mockUserService.getUserDashboard.mockResolvedValue({
        success: true,
        data: { ...mockDashboardData, badges: [] },
      });

      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/no badges earned yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tracked Bills', () => {
    it('displays tracked bills with status', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Healthcare Reform Act')).toBeInTheDocument();
        expect(screen.getByText('Education Funding Bill')).toBeInTheDocument();
        expect(screen.getByText('In Committee')).toBeInTheDocument();
        expect(screen.getByText('Passed House')).toBeInTheDocument();
      });
    });

    it('shows last update timestamps', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/last updated/i)).toBeInTheDocument();
      });
    });

    it('provides links to bill details', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const billLink = screen.getByRole('link', { name: /healthcare reform act/i });
        expect(billLink).toHaveAttribute('href', expect.stringContaining('/bills/bill-1'));
      });
    });

    it('handles no tracked bills', async () => {
      mockUserService.getUserDashboard.mockResolvedValue({
        success: true,
        data: { ...mockDashboardData, trackedBills: [] },
      });

      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/start tracking bills/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tabbed Interface', () => {
    it('switches between different dashboard views', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      // Should start with overview tab
      expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');

      // Switch to activity tab
      const activityTab = screen.getByRole('tab', { name: /activity/i });
      await user.click(activityTab);

      expect(activityTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('loads data for each tab when selected', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockUserService.getUserActivity.mockResolvedValue({
        success: true,
        data: { activities: [] },
      });

      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      const activityTab = screen.getByRole('tab', { name: /activity/i });
      await user.click(activityTab);

      await waitFor(() => {
        expect(mockUserService.getUserActivity).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles dashboard loading errors gracefully', async () => {
      mockUserService.getUserDashboard.mockRejectedValue(new Error('Network error'));

      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument();
      });
    });

    it('provides retry mechanism for failed requests', async () => {
      const user = userEvent.setup();
      mockUserService.getUserDashboard.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, data: mockDashboardData });

      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockUserService.getUserDashboard).toHaveBeenCalledTimes(2);
        expect(screen.getByText('15')).toBeInTheDocument(); // Bills tracked
      });
    });
  });

  describe('Real-time Updates', () => {
    it('updates metrics when receiving real-time data', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
      });

      // Simulate real-time update
      const updateEvent = new CustomEvent('dashboardUpdate', {
        detail: { metrics: { billsTracked: 16 } }
      });
      
      window.dispatchEvent(updateEvent);

      await waitFor(() => {
        expect(screen.getByText('16')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      const firstTab = screen.getByRole('tab', { name: /overview/i });
      firstTab.focus();

      await user.keyboard('{ArrowRight}');
      
      const secondTab = screen.getByRole('tab', { name: /activity/i });
      expect(secondTab).toHaveFocus();
    });

    it('provides screen reader friendly content', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /metrics/i })).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('lazy loads tab content', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      // Should only load overview data initially
      expect(mockUserService.getUserDashboard).toHaveBeenCalledTimes(1);
      expect(mockUserService.getUserActivity).not.toHaveBeenCalled();
    });

    it('caches loaded data between tab switches', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserDashboardSection user={mockUser} />, { wrapper: TestWrapper });

      // Switch to activity tab
      const activityTab = screen.getByRole('tab', { name: /activity/i });
      await user.click(activityTab);

      // Switch back to overview
      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      await user.click(overviewTab);

      // Should not reload overview data
      expect(mockUserService.getUserDashboard).toHaveBeenCalledTimes(1);
    });
  });
});