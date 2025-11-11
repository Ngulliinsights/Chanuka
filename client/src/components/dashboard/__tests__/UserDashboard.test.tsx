/**
 * UserDashboard Component Tests
 * 
 * Tests for the personalized user dashboard functionality.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserDashboard } from '../UserDashboard';
import { useAuthStore } from '../../../store/slices/authSlice';

// Mock the auth store
vi.mock('../../../store/slices/authSlice');
const mockUseAuthStore = useAuthStore as ReturnType<typeof vi.mocked<typeof useAuthStore>>;

// Mock the user dashboard store
vi.mock('../../../store/slices/userDashboardSlice', () => ({
  useUserDashboardSelectors: () => ({
    dashboardData: null,
    loading: false,
    error: null,
    preferences: {
      layout: 'cards',
      showWelcomeMessage: true,
      defaultTimeFilter: 'month',
      pinnedSections: ['tracked-bills', 'civic-metrics'],
      hiddenSections: [],
      refreshInterval: 15
    },
    privacyControls: {
      profileVisibility: 'public',
      showActivity: true,
      showMetrics: true,
      showRecommendations: true,
      allowDataExport: true,
      allowAnalytics: true
    },
    timeFilter: { period: 'month' },
    hasData: false,
    isDataStale: false,
    filteredEngagementHistory: [],
    engagementStats: {
      totalActivities: 0,
      commentCount: 0,
      shareCount: 0,
      viewCount: 0,
      saveCount: 0
    },
    refreshDashboard: vi.fn(),
    setTimeFilter: vi.fn(),
    setError: vi.fn()
  }),
  useUserDashboardStore: {
    getState: () => ({
      setDashboardData: vi.fn(),
      updatePreferences: vi.fn(),
      updatePrivacyControls: vi.fn(),
      requestDataExport: vi.fn()
    })
  }
}));

// Mock UI components
vi.mock('../../ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="card-title">{children}</div>
}));

vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => 
    <button onClick={onClick} data-testid="button">{children}</button>
}));

vi.mock('../../ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>
}));

vi.mock('../../ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-content">{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button data-testid="tabs-trigger">{children}</button>
}));

// Mock section components
vi.mock('../sections/TrackedBillsSection', () => ({
  TrackedBillsSection: () => <div data-testid="tracked-bills-section">Tracked Bills</div>
}));

vi.mock('../sections/EngagementHistorySection', () => ({
  EngagementHistorySection: () => <div data-testid="engagement-history-section">Engagement History</div>
}));

vi.mock('../sections/CivicMetricsSection', () => ({
  CivicMetricsSection: () => <div data-testid="civic-metrics-section">Civic Metrics</div>
}));

vi.mock('../sections/RecommendationsSection', () => ({
  RecommendationsSection: () => <div data-testid="recommendations-section">Recommendations</div>
}));

// Mock modal components
vi.mock('../modals/PrivacyControlsModal', () => ({
  PrivacyControlsModal: () => <div data-testid="privacy-controls-modal">Privacy Controls</div>
}));

vi.mock('../modals/DataExportModal', () => ({
  DataExportModal: () => <div data-testid="data-export-modal">Data Export</div>
}));

vi.mock('../modals/DashboardPreferencesModal', () => ({
  DashboardPreferencesModal: () => <div data-testid="dashboard-preferences-modal">Dashboard Preferences</div>
}));

// Mock component components
vi.mock('../components/TimeFilterSelector', () => ({
  TimeFilterSelector: () => <div data-testid="time-filter-selector">Time Filter</div>
}));

vi.mock('../components/DashboardStats', () => ({
  DashboardStats: () => <div data-testid="dashboard-stats">Dashboard Stats</div>
}));

vi.mock('../components/WelcomeMessage', () => ({
  WelcomeMessage: () => <div data-testid="welcome-message">Welcome Message</div>
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('UserDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign in message when user is not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      clearError: vi.fn(),
      updatePreferences: vi.fn()
    });

    renderWithRouter(<UserDashboard />);

    expect(screen.getByText('Please sign in')).toBeInTheDocument();
    expect(screen.getByText('You need to be signed in to view your personalized dashboard.')).toBeInTheDocument();
  });

  it('shows dashboard content when user is authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
        verified: true,
        preferences: {
          notifications: true,
          emailAlerts: false,
          theme: 'system'
        }
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      sessionExpiry: null,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      clearError: vi.fn(),
      updatePreferences: vi.fn()
    });

    renderWithRouter(<UserDashboard />);

    expect(screen.getByText('Your Civic Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Track legislation, measure your impact, and stay engaged')).toBeInTheDocument();
  });

  it('renders all main sections', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen',
        verified: true,
        preferences: {
          notifications: true,
          emailAlerts: false,
          theme: 'system'
        }
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      sessionExpiry: null,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      clearError: vi.fn(),
      updatePreferences: vi.fn()
    });

    renderWithRouter(<UserDashboard />);

    expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('time-filter-selector')).toBeInTheDocument();
  });
});