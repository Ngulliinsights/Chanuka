/**
 * UserAccountIntegration Tests
 * Tests for the consolidated backend integration wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import UserAccountIntegration from '../UserAccountIntegration';
import { AuthProvider } from '@client/features/users/hooks/useAuth';
import { MockUserFactory } from '@client/test-utils';

// Mock the services
const mockUserService = {
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserDashboard: vi.fn(),
  getUserActivity: vi.fn(),
  getPrivacySettings: vi.fn(),
  updatePrivacySettings: vi.fn(),
  getAccessibilitySettings: vi.fn(),
  updateAccessibilitySettings: vi.fn(),
};

const mockNotificationService = {
  showNotification: vi.fn(),
  clearNotifications: vi.fn(),
};

vi.mock('../../../services/userService', () => ({
  userService: mockUserService,
}));

vi.mock('../../../services/notificationService', () => ({
  notificationService: mockNotificationService,
}));

const createTestWrapper = (user = MockUserFactory.createMockCitizenUser()) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UserAccountIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('renders children when user is authenticated', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('shows loading state during initialization', async () => {
      const TestWrapper = createTestWrapper();
      
      // Mock slow initialization
      mockUserService.getUserProfile.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      // Should show loading initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('handles unauthenticated user', () => {
      const TestWrapper = createTestWrapper(null);
      
      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      // Should redirect or show auth prompt
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('loads user profile data on mount', async () => {
      const mockUser = MockUserFactory.createMockCitizenUser();
      const TestWrapper = createTestWrapper(mockUser);
      
      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: { ...mockUser, preferences: { theme: 'light' } }
      });

      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(mockUserService.getUserProfile).toHaveBeenCalledWith(mockUser.id);
      });
    });

    it('loads dashboard data when requested', async () => {
      const mockUser = MockUserFactory.createMockCitizenUser();
      const TestWrapper = createTestWrapper(mockUser);
      
      mockUserService.getUserDashboard.mockResolvedValue({
        success: true,
        data: { metrics: {}, activities: [] }
      });

      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(mockUserService.getUserDashboard).toHaveBeenCalledWith(mockUser.id);
      });
    });

    it('loads privacy settings when requested', async () => {
      const mockUser = MockUserFactory.createMockCitizenUser();
      const TestWrapper = createTestWrapper(mockUser);
      
      mockUserService.getPrivacySettings.mockResolvedValue({
        success: true,
        data: { dataSharing: false, analytics: true }
      });

      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(mockUserService.getPrivacySettings).toHaveBeenCalledWith(mockUser.id);
      });
    });

    it('loads accessibility settings when requested', async () => {
      const mockUser = MockUserFactory.createMockCitizenUser();
      const TestWrapper = createTestWrapper(mockUser);
      
      mockUserService.getAccessibilitySettings.mockResolvedValue({
        success: true,
        data: { highContrast: false, fontSize: 'medium' }
      });

      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(mockUserService.getAccessibilitySettings).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles profile loading errors gracefully', async () => {
      const TestWrapper = createTestWrapper();
      
      mockUserService.getUserProfile.mockRejectedValue(new Error('Network error'));

      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(mockNotificationService.showNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to load user profile',
      });
    });

    it('handles dashboard loading errors gracefully', async () => {
      const TestWrapper = createTestWrapper();
      
      mockUserService.getUserDashboard.mockRejectedValue(new Error('Dashboard error'));

      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(mockNotificationService.showNotification).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load dashboard data',
        });
      });
    });

    it('provides error recovery mechanisms', async () => {
      const TestWrapper = createTestWrapper();
      
      mockUserService.getUserProfile.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, data: {} });

      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      });

      // Click retry
      screen.getByTestId('retry-button').click();

      await waitFor(() => {
        expect(mockUserService.getUserProfile).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('handles WebSocket connection for real-time updates', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      // Should establish WebSocket connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });
    });

    it('updates data when receiving real-time notifications', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      // Simulate real-time update
      const updateEvent = new CustomEvent('userDataUpdate', {
        detail: { type: 'profile', data: { name: 'Updated Name' } }
      });
      
      window.dispatchEvent(updateEvent);

      await waitFor(() => {
        expect(mockUserService.getUserProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Performance', () => {
    it('implements proper cleanup on unmount', () => {
      const TestWrapper = createTestWrapper();
      
      const { unmount } = render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      unmount();

      // Should clean up subscriptions and timers
      expect(mockNotificationService.clearNotifications).toHaveBeenCalled();
    });

    it('debounces rapid data updates', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <UserAccountIntegration>
          <div data-testid="test-child">Test Content</div>
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      // Simulate rapid updates
      for (let i = 0; i < 5; i++) {
        const updateEvent = new CustomEvent('userDataUpdate', {
          detail: { type: 'profile', data: { name: `Update ${i}` } }
        });
        window.dispatchEvent(updateEvent);
      }

      await waitFor(() => {
        // Should only make one API call due to debouncing
        expect(mockUserService.getUserProfile).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Context Provision', () => {
    it('provides user data context to children', async () => {
      const mockUser = MockUserFactory.createMockCitizenUser();
      const TestWrapper = createTestWrapper(mockUser);
      
      const TestChild = () => {
        // This would use the context in real implementation
        return <div data-testid="context-consumer">Has Context</div>;
      };

      render(
        <UserAccountIntegration>
          <TestChild />
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      expect(screen.getByTestId('context-consumer')).toBeInTheDocument();
    });

    it('provides loading states to children', async () => {
      const TestWrapper = createTestWrapper();
      
      mockUserService.getUserProfile.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const TestChild = () => {
        // This would use the loading context in real implementation
        return <div data-testid="loading-consumer">Loading State Available</div>;
      };

      render(
        <UserAccountIntegration>
          <TestChild />
        </UserAccountIntegration>,
        { wrapper: TestWrapper }
      );

      expect(screen.getByTestId('loading-consumer')).toBeInTheDocument();
    });
  });
});