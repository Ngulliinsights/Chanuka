import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test-utils';
import App from '../../App';
import { logger } from '@/$2/browser-logger';
import { navigationService } from '@/components/navigation';

// Mock API calls
vi.mock('../../services/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  getBills: vi.fn(),
  getBill: vi.fn(),
  searchBills: vi.fn(),
  getSponsors: vi.fn(),
  getSponsor: vi.fn(),
  createComment: vi.fn(),
  getComments: vi.fn()
}));

// Mock WebSocket
vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    send: vi.fn()
  })
}));

describe('End-to-End User Workflows', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  const renderApp = () => {
    return renderWithProviders(<App />);
  };

  describe('User Registration and Authentication Flow', () => {
    it('should complete full user registration workflow', async () => {
      const { register } = await import('../../services/api');

      // Mock successful registration
      (register as Mock).mockResolvedValue({
        success: true,
        data: {
          user: {
            id: '1',
            email: 'newuser@example.com',
            name: 'New User',
            role: 'citizen'
          },
          token: 'auth-token',
          requiresVerification: true
        }
      });

      renderApp();

      // Navigate to registration
      const registerLink = screen.getByTestId('register-link');
      await user.click(registerLink);

      // Fill out registration form
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const firstNameInput = screen.getByTestId('first-name-input');
      const lastNameInput = screen.getByTestId('last-name-input');

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(firstNameInput, 'New');
      await user.type(lastNameInput, 'User');

      // Submit registration
      const submitButton = screen.getByTestId('register-submit-btn');
      await user.click(submitButton);

      // Verify registration success
      await waitFor(() => {
        expect(register).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
          role: 'citizen'
        });
      });

      // Should show verification message
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });

    it('should complete login workflow', async () => {
      const { login, getCurrentUser } = await import('../../services/api');

      // Mock successful login
      (login as Mock).mockResolvedValue({
        success: true,
        data: {
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'Test User',
            role: 'citizen'
          },
          token: 'auth-token'
        }
      });

      (getCurrentUser as Mock).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'citizen'
        }
      });

      renderApp();

      // Navigate to login
      const loginLink = screen.getByTestId('login-link');
      await user.click(loginLink);

      // Fill out login form
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      // Submit login
      const submitButton = screen.getByTestId('login-submit-btn');
      await user.click(submitButton);

      // Verify login success
      await waitFor(() => {
        expect(login).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123'
        });
      });

      // Should redirect to dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });

    it('should handle login errors gracefully', async () => {
      const { login } = await import('../../services/api');

      // Mock login failure
      (login as Mock).mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      renderApp();

      // Navigate to login
      const loginLink = screen.getByTestId('login-link');
      await user.click(loginLink);

      // Fill out login form with invalid credentials
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'wrongpassword');

      // Submit login
      const submitButton = screen.getByTestId('login-submit-btn');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Should remain on login page
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
    });
  });

  describe('Bill Browsing and Search Workflow', () => {
    beforeEach(async () => {
      const { getCurrentUser } = await import('../../services/api');

      // Mock authenticated user
      (getCurrentUser as any).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'citizen'
        }
      });
    });

    it('should browse bills and view details', async () => {
      const { getBills, getBill } = await import('../../services/api');

      // Mock bills list
      (getBills as Mock).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'bill-1',
            title: 'Digital Privacy Act',
            summary: 'Enhances digital privacy rights',
            status: 'introduced',
            category: 'technology'
          },
          {
            id: 'bill-2',
            title: 'Healthcare Modernization Act',
            summary: 'Modernizes healthcare systems',
            status: 'committee',
            category: 'healthcare'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      });

      // Mock bill details
      (getBill as Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'bill-1',
          title: 'Digital Privacy Act',
          summary: 'Enhances digital privacy rights',
          description: 'Comprehensive privacy legislation...',
          status: 'introduced',
          category: 'technology',
          sponsors: [
            { id: 'sponsor-1', name: 'Hon. John Doe', role: 'MP' }
          ]
        }
      });

      renderApp();

      // Navigate to bills page
      const billsLink = screen.getByTestId('nav-bills');
      await user.click(billsLink);

      // Wait for bills to load
      await waitFor(() => {
        expect(screen.getByText('Digital Privacy Act')).toBeInTheDocument();
        expect(screen.getByText('Healthcare Modernization Act')).toBeInTheDocument();
      });

      // Click on first bill to view details
      const billLink = screen.getByText('Digital Privacy Act');
      await user.click(billLink);

      // Verify bill details page
      await waitFor(() => {
        expect(getBill).toHaveBeenCalledWith('bill-1');
        expect(screen.getByText('Comprehensive privacy legislation...')).toBeInTheDocument();
        expect(screen.getByText('Hon. John Doe')).toBeInTheDocument();
      });
    });

    it('should search bills and filter results', async () => {
      const { searchBills } = await import('../../services/api');

      // Mock search results
      (searchBills as Mock).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'bill-1',
            title: 'Digital Privacy Act',
            summary: 'Enhances digital privacy rights',
            status: 'introduced',
            category: 'technology'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      });

      renderApp();

      // Navigate to bills page
      const billsLink = screen.getByTestId('nav-bills');
      await user.click(billsLink);

      // Use search functionality
      const searchInput = screen.getByTestId('bills-search-input');
      await user.type(searchInput, 'privacy');

      const searchButton = screen.getByTestId('search-submit-btn');
      await user.click(searchButton);

      // Verify search results
      await waitFor(() => {
        expect(searchBills).toHaveBeenCalledWith('privacy', expect.any(Object));
        expect(screen.getByText('Digital Privacy Act')).toBeInTheDocument();
      });

      // Apply status filter
      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'introduced');

      // Verify filtered results
      await waitFor(() => {
        expect(searchBills).toHaveBeenCalledWith('privacy', 
          expect.objectContaining({ status: 'introduced' })
        );
      });
    });

    it('should handle empty search results', async () => {
      const { searchBills } = await import('../../services/api');

      // Mock empty search results
      (searchBills as Mock).mockResolvedValue({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      });

      renderApp();

      // Navigate to bills page
      const billsLink = screen.getByTestId('nav-bills');
      await user.click(billsLink);

      // Search for non-existent term
      const searchInput = screen.getByTestId('bills-search-input');
      await user.type(searchInput, 'nonexistentterm');

      const searchButton = screen.getByTestId('search-submit-btn');
      await user.click(searchButton);

      // Should show no results message
      await waitFor(() => {
        expect(screen.getByText(/no bills found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Comment and Engagement Workflow', () => {
    beforeEach(async () => {
      const { getCurrentUser } = await import('../../services/api');

      // Mock authenticated user
      (getCurrentUser as any).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'citizen'
        }
      });
    });

    it('should create and view comments on bills', async () => {
      const { getBill, createComment, getComments } = await import('../../services/api');

      // Mock bill details
      (getBill as Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'bill-1',
          title: 'Digital Privacy Act',
          summary: 'Enhances digital privacy rights',
          description: 'Comprehensive privacy legislation...',
          status: 'introduced'
        }
      });

      // Mock existing comments
      (getComments as Mock).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'comment-1',
            content: 'This is an important bill for privacy rights.',
            author: 'Jane Doe',
            createdAt: '2024-01-15T10:00:00Z',
            votes: { upvotes: 5, downvotes: 1 }
          }
        ]
      });

      // Mock comment creation
      (createComment as Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'comment-2',
          content: 'I agree, this bill is very important.',
          author: 'Test User',
          createdAt: '2024-01-16T10:00:00Z',
          votes: { upvotes: 0, downvotes: 0 }
        }
      });

      renderApp();

      // Navigate to bill details
      const billsLink = screen.getByTestId('nav-bills');
      await user.click(billsLink);

      // Assume we're on bill details page
      await waitFor(() => {
        expect(screen.getByText('Digital Privacy Act')).toBeInTheDocument();
      });

      // View existing comments
      expect(screen.getByText('This is an important bill for privacy rights.')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();

      // Add new comment
      const commentInput = screen.getByTestId('comment-input');
      await user.type(commentInput, 'I agree, this bill is very important.');

      const submitButton = screen.getByTestId('comment-submit-btn');
      await user.click(submitButton);

      // Verify comment creation
      await waitFor(() => {
        expect(createComment).toHaveBeenCalledWith({
          billId: 'bill-1',
          content: 'I agree, this bill is very important.'
        });
      });

      // Should show new comment
      await waitFor(() => {
        expect(screen.getByText('I agree, this bill is very important.')).toBeInTheDocument();
      });
    });

    it('should handle comment validation errors', async () => {
      const { createComment } = await import('../../services/api');

      // Mock comment creation failure
      (createComment as Mock).mockResolvedValue({
        success: false,
        error: 'Comment is too short'
      });

      renderApp();

      // Assume we're on bill details page
      const commentInput = screen.getByTestId('comment-input');
      await user.type(commentInput, 'Too short');

      const submitButton = screen.getByTestId('comment-submit-btn');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/comment is too short/i)).toBeInTheDocument();
      });

      // Comment input should still contain the text
      expect(commentInput).toHaveValue('Too short');
    });
  });

  describe('User Profile and Settings Workflow', () => {
    beforeEach(async () => {
      const { getCurrentUser } = await import('../../services/api');

      // Mock authenticated user
      (getCurrentUser as any).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'citizen',
          preferences: {
            emailNotifications: true,
            categories: ['technology', 'healthcare']
          }
        }
      });
    });

    it('should view and update user profile', async () => {
      const { updateProfile } = await import('../../services/api');

      // Mock profile update
      (updateProfile as Mock).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          email: 'user@example.com',
          name: 'Updated User',
          role: 'citizen'
        }
      });

      renderApp();

      // Navigate to profile
      const profileLink = screen.getByTestId('nav-profile');
      await user.click(profileLink);

      // Should show current profile information
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();
      });

      // Update name
      const nameInput = screen.getByTestId('name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated User');

      // Save changes
      const saveButton = screen.getByTestId('profile-save-btn');
      await user.click(saveButton);

      // Verify profile update
      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith({
          name: 'Updated User'
        });
      });

      // Should show success message
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
    });

    it('should manage notification preferences', async () => {
      const { updatePreferences } = await import('../../services/api');

      // Mock preferences update
      (updatePreferences as Mock).mockResolvedValue({
        success: true,
        data: {
          emailNotifications: false,
          categories: ['technology']
        }
      });

      renderApp();

      // Navigate to settings
      const settingsLink = screen.getByTestId('nav-settings');
      await user.click(settingsLink);

      // Toggle email notifications
      const emailToggle = screen.getByTestId('email-notifications-toggle');
      await user.click(emailToggle);

      // Update category preferences
      const healthcareCheckbox = screen.getByTestId('healthcare-category-checkbox');
      await user.click(healthcareCheckbox);

      // Save preferences
      const saveButton = screen.getByTestId('preferences-save-btn');
      await user.click(saveButton);

      // Verify preferences update
      await waitFor(() => {
        expect(updatePreferences).toHaveBeenCalledWith({
          emailNotifications: false,
          categories: ['technology']
        });
      });

      // Should show success message
      expect(screen.getByText(/preferences updated/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design and Mobile Experience', () => {
    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      // Trigger resize event
      fireEvent(window, new Event('resize'));

      renderApp();

      // Mobile navigation should be present
      const mobileMenuButton = screen.getByTestId('mobile-menu-btn');
      expect(mobileMenuButton).toBeInTheDocument();

      // Click mobile menu
      await user.click(mobileMenuButton);

      // Mobile navigation menu should open
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toHaveClass('mobile-open');
      });
    });

    it('should handle touch interactions', async () => {
      renderApp();

      // Simulate touch events on interactive elements
      const billCard = screen.getByTestId('bill-item-1');
      
      // Touch start
      fireEvent.touchStart(billCard, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      // Touch end
      fireEvent.touchEnd(billCard, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });

      // Should navigate to bill details
      await waitFor(() => {
        expect(screen.getByText(/bill details/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Compliance', () => {
    it('should support keyboard navigation', async () => {
      renderApp();

      // Tab through navigation elements
      await user.tab();
      expect(screen.getByTestId('nav-home')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('nav-bills')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('nav-sponsors')).toHaveFocus();

      // Enter key should activate focused element
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/sponsors list/i)).toBeInTheDocument();
      });
    });

    it('should provide proper ARIA labels and roles', () => {
      renderApp();

      // Check for proper ARIA attributes
      const navigation = screen.getByTestId('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation');

      const searchInput = screen.getByTestId('bills-search-input');
      expect(searchInput).toHaveAttribute('aria-label', 'Search bills');

      const billsList = screen.getByTestId('bills-list');
      expect(billsList).toBeInTheDocument();
    });

    it('should support screen readers', () => {
      renderApp();

      // Check for screen reader announcements
      const liveRegion = screen.getByTestId('live-region');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      // Check for descriptive text
      const billCard = screen.getByTestId('bill-item-1');
      expect(billCard).toHaveAttribute('aria-describedby');
    });

    it('should maintain focus management', async () => {
      renderApp();

      // Open modal dialog
      const detailsButton = screen.getByTestId('view-bill-1');
      await user.click(detailsButton);

      // Focus should move to modal
      const modal = screen.getByTestId('bill-details-modal');
      expect(modal).toHaveFocus();

      // Close modal with Escape key
      await user.keyboard('{Escape}');

      // Focus should return to trigger button
      expect(detailsButton).toHaveFocus();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large datasets efficiently', async () => {
      const { getBills } = await import('../../services/api');

      // Mock large dataset
      const largeBillsList = Array.from({ length: 1000 }, (_, i) => ({
        id: `bill-${i}`,
        title: `Bill ${i}`,
        summary: `Summary for bill ${i}`,
        status: 'introduced'
      }));

      (getBills as Mock).mockResolvedValue({
        success: true,
        data: largeBillsList.slice(0, 20), // Paginated
        pagination: {
          page: 1,
          limit: 20,
          total: 1000,
          totalPages: 50
        }
      });

      const startTime = performance.now();
      
      renderApp();

      // Navigate to bills page
      const billsLink = screen.getByTestId('nav-bills');
      await user.click(billsLink);

      // Wait for bills to load
      await waitFor(() => {
        expect(screen.getByText('Bill 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time (2 seconds)
      expect(loadTime).toBeLessThan(2000);
    });

    it('should handle rapid user interactions', async () => {
      renderApp();

      // Rapid clicking should not cause issues
      const searchButton = screen.getByTestId('search-submit-btn');
      
      for (let i = 0; i < 10; i++) {
        await user.click(searchButton);
      }

      // Should remain stable
      expect(searchButton).toBeInTheDocument();
      expect(searchButton).not.toBeDisabled();
    });

    it('should manage memory efficiently', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      renderApp();

      // Navigate through multiple pages
      const pages = ['/bills', '/sponsors', '/profile', '/settings'];
      
      for (const page of pages) {
        navigationService.navigate(page);
        fireEvent(window, new Event('popstate'));
        await waitFor(() => {
          expect(navigationService.getLocation().pathname).toBe(page);
        });
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      const { getBills } = await import('../../services/api');

      // Mock network error
      (getBills as Mock).mockRejectedValue(new Error('Network error'));

      renderApp();

      // Navigate to bills page
      const billsLink = screen.getByTestId('nav-bills');
      await user.click(billsLink);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Should provide retry option
      const retryButton = screen.getByTestId('retry-btn');
      expect(retryButton).toBeInTheDocument();

      // Mock successful retry
      (getBills as Mock).mockResolvedValue({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });

      await user.click(retryButton);

      // Should recover and show content
      await waitFor(() => {
        expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
      });
    });

    it('should handle authentication errors', async () => {
      const { getCurrentUser } = await import('../../services/api');

      // Mock authentication error
      (getCurrentUser as Mock).mockRejectedValue(new Error('Unauthorized'));

      renderApp();

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText(/please log in/i)).toBeInTheDocument();
      });

      // Should clear any stored tokens
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should handle component errors with error boundary', () => {
      // Mock component that throws error
      const ThrowError = () => {
        throw new Error('Component error');
      };

      const AppWithError = () => <ThrowError />;

      renderWithProviders(<AppWithError />);

      // Should show error boundary
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });
  });
});