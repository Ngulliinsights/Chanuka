/**
 * Bills Workflow Integration Tests
 * Tests complete user workflows for bill discovery, viewing, and interaction
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, MockDataFactory, IntegrationTestUtils } from '../../test-utils/comprehensive-test-setup';
import { BrowserRouter } from 'react-router-dom';
import { App } from '../../App';

describe('Bills Workflow Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Set up authenticated user
    global.integrationTestUtils.mockAuthenticatedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.integrationTestUtils.resetNetworkConditions();
  });

  describe('Bill Discovery Workflow', () => {
    it('should complete full bill discovery workflow', async () => {
      await IntegrationTestUtils.simulateUserWorkflow([
        // Step 1: Navigate to bills dashboard
        async () => {
          renderWithProviders(
            <BrowserRouter>
              <App />
            </BrowserRouter>,
            { route: '/bills' }
          );
          
          await waitFor(() => {
            expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
          });
        },

        // Step 2: View initial bills list
        async () => {
          await waitFor(() => {
            expect(screen.getAllByTestId(/bill-card-/)).toHaveLength(10);
          });
        },

        // Step 3: Apply category filter
        async () => {
          const categoryFilter = screen.getByLabelText(/category/i);
          await user.selectOptions(categoryFilter, 'healthcare');
          
          await waitFor(() => {
            expect(screen.getByDisplayValue('healthcare')).toBeInTheDocument();
          });
        },

        // Step 4: Search for specific bill
        async () => {
          const searchInput = screen.getByPlaceholderText(/search bills/i);
          await user.type(searchInput, 'healthcare reform');
          
          await waitFor(() => {
            expect(screen.getByDisplayValue('healthcare reform')).toBeInTheDocument();
          });
        },

        // Step 5: View search results
        async () => {
          await waitFor(() => {
            const results = screen.getAllByTestId(/bill-card-/);
            expect(results.length).toBeGreaterThan(0);
          });
        },
      ]);
    });

    it('should handle pagination in bill discovery', async () => {
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills' }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });

      // Navigate to next page
      const nextPageButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextPageButton);

      // Verify page change
      await waitFor(() => {
        expect(window.location.search).toContain('page=2');
      });

      // Verify new bills loaded
      await waitFor(() => {
        expect(screen.getAllByTestId(/bill-card-/)).toHaveLength(10);
      });
    });

    it('should maintain filter state across navigation', async () => {
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills?category=healthcare&status=active' }
      );

      // Verify filters are applied from URL
      await waitFor(() => {
        expect(screen.getByDisplayValue('healthcare')).toBeInTheDocument();
        expect(screen.getByDisplayValue('active')).toBeInTheDocument();
      });

      // Navigate to bill detail and back
      const firstBill = screen.getAllByTestId(/bill-card-/)[0];
      const viewDetailsLink = within(firstBill).getByText(/view details/i);
      await user.click(viewDetailsLink);

      // Wait for bill detail page
      await waitFor(() => {
        expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
      });

      // Navigate back
      const backButton = screen.getByRole('button', { name: /back to bills/i });
      await user.click(backButton);

      // Verify filters are still applied
      await waitFor(() => {
        expect(screen.getByDisplayValue('healthcare')).toBeInTheDocument();
        expect(screen.getByDisplayValue('active')).toBeInTheDocument();
      });
    });
  });

  describe('Bill Detail Workflow', () => {
    it('should complete full bill detail viewing workflow', async () => {
      await IntegrationTestUtils.simulateUserWorkflow([
        // Step 1: Navigate to bill detail
        async () => {
          renderWithProviders(
            <BrowserRouter>
              <App />
            </BrowserRouter>,
            { route: '/bills/test-bill-1' }
          );
          
          await waitFor(() => {
            expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
          });
        },

        // Step 2: View bill overview
        async () => {
          expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');
          expect(screen.getByTestId('bill-overview-content')).toBeInTheDocument();
        },

        // Step 3: Switch to full text tab
        async () => {
          const fullTextTab = screen.getByRole('tab', { name: /full text/i });
          await user.click(fullTextTab);
          
          await waitFor(() => {
            expect(fullTextTab).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByTestId('bill-full-text-content')).toBeInTheDocument();
          });
        },

        // Step 4: View constitutional analysis
        async () => {
          const analysisTab = screen.getByRole('tab', { name: /analysis/i });
          await user.click(analysisTab);
          
          await waitFor(() => {
            expect(analysisTab).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByTestId('constitutional-analysis-panel')).toBeInTheDocument();
          });
        },

        // Step 5: Check community discussion
        async () => {
          const communityTab = screen.getByRole('tab', { name: /community/i });
          await user.click(communityTab);
          
          await waitFor(() => {
            expect(communityTab).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByTestId('discussion-thread')).toBeInTheDocument();
          });
        },
      ]);
    });

    it('should handle bill actions workflow', async () => {
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills/test-bill-1' }
      );

      await waitFor(() => {
        expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
      });

      // Save bill
      const saveButton = screen.getByRole('button', { name: /save bill/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/bill saved/i)).toBeInTheDocument();
      });

      // Share bill
      const shareButton = screen.getByRole('button', { name: /share bill/i });
      await user.click(shareButton);

      await waitFor(() => {
        expect(screen.getByTestId('share-modal')).toBeInTheDocument();
      });

      // Close share modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Community Interaction Workflow', () => {
    it('should complete comment posting workflow', async () => {
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills/test-bill-1' }
      );

      // Navigate to community tab
      await waitFor(() => {
        expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
      });

      const communityTab = screen.getByRole('tab', { name: /community/i });
      await user.click(communityTab);

      await waitFor(() => {
        expect(screen.getByTestId('discussion-thread')).toBeInTheDocument();
      });

      // Post a comment
      const commentInput = screen.getByPlaceholderText(/share your thoughts/i);
      await user.type(commentInput, 'This is a test comment about the bill.');

      const postButton = screen.getByRole('button', { name: /post comment/i });
      await user.click(postButton);

      // Verify comment appears
      await waitFor(() => {
        expect(screen.getByText('This is a test comment about the bill.')).toBeInTheDocument();
      });

      // Vote on comment
      const upvoteButton = screen.getByRole('button', { name: /upvote/i });
      await user.click(upvoteButton);

      await waitFor(() => {
        expect(screen.getByText(/1 upvote/i)).toBeInTheDocument();
      });
    });

    it('should handle expert verification workflow', async () => {
      // Mock expert user
      global.integrationTestUtils.mockAuthenticatedUser({
        role: 'expert',
        verification_status: 'verified',
        expertise: 'constitutional law',
      });

      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills/test-bill-1' }
      );

      // Navigate to analysis tab
      await waitFor(() => {
        expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
      });

      const analysisTab = screen.getByRole('tab', { name: /analysis/i });
      await user.click(analysisTab);

      // Add expert analysis
      const expertAnalysisButton = screen.getByRole('button', { name: /add expert analysis/i });
      await user.click(expertAnalysisButton);

      const analysisInput = screen.getByPlaceholderText(/provide your expert analysis/i);
      await user.type(analysisInput, 'This bill raises constitutional concerns regarding...');

      const submitButton = screen.getByRole('button', { name: /submit analysis/i });
      await user.click(submitButton);

      // Verify expert badge appears
      await waitFor(() => {
        expect(screen.getByTestId('expert-badge')).toBeInTheDocument();
        expect(screen.getByText('This bill raises constitutional concerns regarding...')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Features Workflow', () => {
    it('should handle real-time bill updates', async () => {
      const mockWebSocket = IntegrationTestUtils.createMockWebSocket();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills/test-bill-1' }
      );

      await waitFor(() => {
        expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
      });

      // Simulate real-time bill status update
      mockWebSocket.simulateMessage({
        type: 'BILL_STATUS_UPDATE',
        data: {
          billId: 'test-bill-1',
          status: 'passed',
          timestamp: new Date().toISOString(),
        },
      });

      // Verify status update appears
      await waitFor(() => {
        expect(screen.getByText(/status: passed/i)).toBeInTheDocument();
      });

      // Verify notification appears
      await waitFor(() => {
        expect(screen.getByText(/bill status updated/i)).toBeInTheDocument();
      });
    });

    it('should handle real-time comment updates', async () => {
      const mockWebSocket = IntegrationTestUtils.createMockWebSocket();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills/test-bill-1' }
      );

      // Navigate to community tab
      const communityTab = screen.getByRole('tab', { name: /community/i });
      await user.click(communityTab);

      await waitFor(() => {
        expect(screen.getByTestId('discussion-thread')).toBeInTheDocument();
      });

      // Simulate new comment from another user
      mockWebSocket.simulateMessage({
        type: 'NEW_COMMENT',
        data: {
          billId: 'test-bill-1',
          comment: {
            id: 'new-comment-1',
            content: 'This is a new comment from another user',
            author: {
              id: 'other-user',
              name: 'Other User',
            },
            created_at: new Date().toISOString(),
          },
        },
      });

      // Verify new comment appears
      await waitFor(() => {
        expect(screen.getByText('This is a new comment from another user')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      global.integrationTestUtils.mockApiError('/api/bills/test-bill-1', 500, 'Internal Server Error');

      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills/test-bill-1' }
      );

      // Verify error message appears
      await waitFor(() => {
        expect(screen.getByText(/failed to load bill/i)).toBeInTheDocument();
      });

      // Verify retry button works
      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      // Reset API to working state
      global.integrationTestUtils.resetNetworkConditions();
      
      await user.click(retryButton);

      // Verify bill loads after retry
      await waitFor(() => {
        expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
      });
    });

    it('should handle network connectivity issues', async () => {
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>,
        { route: '/bills' }
      );

      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });

      // Simulate network failure
      global.integrationTestUtils.simulateOfflineMode();

      // Try to perform an action that requires network
      const searchInput = screen.getByPlaceholderText(/search bills/i);
      await user.type(searchInput, 'test search');

      // Verify offline indicator appears
      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });

      // Restore network
      global.integrationTestUtils.resetNetworkConditions();

      // Verify online indicator appears
      await waitFor(() => {
        expect(screen.getByText(/online/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance during complex workflows', async () => {
      const startTime = performance.now();

      await IntegrationTestUtils.simulateUserWorkflow([
        async () => {
          renderWithProviders(
            <BrowserRouter>
              <App />
            </BrowserRouter>,
            { route: '/bills' }
          );
        },
        async () => {
          await waitFor(() => {
            expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
          });
        },
        async () => {
          const searchInput = screen.getByPlaceholderText(/search bills/i);
          await user.type(searchInput, 'healthcare');
        },
        async () => {
          const firstBill = screen.getAllByTestId(/bill-card-/)[0];
          const viewDetailsLink = within(firstBill).getByText(/view details/i);
          await user.click(viewDetailsLink);
        },
        async () => {
          await waitFor(() => {
            expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
          });
        },
      ]);

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(5000); // Complete workflow should take less than 5 seconds
    });
  });
});