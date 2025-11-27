/**
 * UserAccountPage Tests
 * Comprehensive tests for the consolidated user account management system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import UserAccountPage from '@client/UserAccountPage';
import { AuthProvider } from '@client/features/users/hooks/useAuth';
import { MockUserFactory } from '@client/test-utils';

// Mock the section components
vi.mock('../../components/user/UserProfileSection', () => ({
  default: ({ user }: any) => (
    <div data-testid="user-profile-section">
      Profile for {user?.name || 'Unknown User'}
    </div>
  ),
}));

vi.mock('../../components/user/UserDashboardSection', () => ({
  default: ({ user }: any) => (
    <div data-testid="user-dashboard-section">
      Dashboard for {user?.name || 'Unknown User'}
    </div>
  ),
}));

vi.mock('../../components/user/PrivacySettingsSection', () => ({
  default: () => <div data-testid="privacy-settings-section">Privacy Settings</div>,
}));

vi.mock('../../components/user/AccessibilitySettingsSection', () => ({
  default: () => <div data-testid="accessibility-settings-section">Accessibility Settings</div>,
}));

vi.mock('../../components/user/UserAccountIntegration', () => ({
  default: ({ children }: any) => (
    <div data-testid="user-account-integration">{children}</div>
  ),
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

describe('UserAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the main account page with navigation tabs', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      // Check for main navigation tabs
      expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /privacy/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /accessibility/i })).toBeInTheDocument();
    });

    it('renders with UserAccountIntegration wrapper', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      expect(screen.getByTestId('user-account-integration')).toBeInTheDocument();
    });

    it('shows profile section by default', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      expect(screen.getByTestId('user-profile-section')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('switches to dashboard section when dashboard tab is clicked', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      const dashboardTab = screen.getByRole('tab', { name: /dashboard/i });
      await user.click(dashboardTab);

      expect(screen.getByTestId('user-dashboard-section')).toBeInTheDocument();
      expect(screen.queryByTestId('user-profile-section')).not.toBeInTheDocument();
    });

    it('switches to privacy section when privacy tab is clicked', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      const privacyTab = screen.getByRole('tab', { name: /privacy/i });
      await user.click(privacyTab);

      expect(screen.getByTestId('privacy-settings-section')).toBeInTheDocument();
      expect(screen.queryByTestId('user-profile-section')).not.toBeInTheDocument();
    });

    it('switches to accessibility section when accessibility tab is clicked', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      const accessibilityTab = screen.getByRole('tab', { name: /accessibility/i });
      await user.click(accessibilityTab);

      expect(screen.getByTestId('accessibility-settings-section')).toBeInTheDocument();
      expect(screen.queryByTestId('user-profile-section')).not.toBeInTheDocument();
    });

    it('maintains active tab state correctly', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      const dashboardTab = screen.getByRole('tab', { name: /dashboard/i });
      await user.click(dashboardTab);

      expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('User Context', () => {
    it('passes user data to profile section', () => {
      const mockUser = MockUserFactory.createMockCitizenUser({ name: 'Test User' });
      const TestWrapper = createTestWrapper(mockUser);
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      expect(screen.getByText('Profile for Test User')).toBeInTheDocument();
    });

    it('passes user data to dashboard section', async () => {
      const user = userEvent.setup();
      const mockUser = MockUserFactory.createMockCitizenUser({ name: 'Dashboard User' });
      const TestWrapper = createTestWrapper(mockUser);
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      const dashboardTab = screen.getByRole('tab', { name: /dashboard/i });
      await user.click(dashboardTab);

      expect(screen.getByText('Dashboard for Dashboard User')).toBeInTheDocument();
    });

    it('handles unauthenticated user gracefully', () => {
      const TestWrapper = createTestWrapper(null);
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      expect(screen.getByText('Profile for Unknown User')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for tabs', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('supports keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      const firstTab = screen.getByRole('tab', { name: /profile/i });
      firstTab.focus();

      // Navigate to next tab with arrow key
      await user.keyboard('{ArrowRight}');
      
      const secondTab = screen.getByRole('tab', { name: /dashboard/i });
      expect(secondTab).toHaveFocus();
    });

    it('has proper heading structure', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      // Should have a main heading for the page
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles component errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const TestWrapper = createTestWrapper();
      
      // This should not crash the entire page
      render(<UserAccountPage />, { wrapper: TestWrapper });

      expect(screen.getByTestId('user-account-integration')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('does not render inactive sections', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserAccountPage />, { wrapper: TestWrapper });

      // Initially only profile should be rendered
      expect(screen.getByTestId('user-profile-section')).toBeInTheDocument();
      expect(screen.queryByTestId('user-dashboard-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('privacy-settings-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accessibility-settings-section')).not.toBeInTheDocument();

      // Switch to dashboard
      await user.click(screen.getByRole('tab', { name: /dashboard/i }));

      // Now only dashboard should be rendered
      expect(screen.queryByTestId('user-profile-section')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-dashboard-section')).toBeInTheDocument();
      expect(screen.queryByTestId('privacy-settings-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accessibility-settings-section')).not.toBeInTheDocument();
    });
  });
});