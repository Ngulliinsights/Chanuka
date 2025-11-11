/**
 * Integration Tests for Bill Discovery Workflow
 * 
 * Tests complete user workflows:
 * - Bill discovery and filtering
 * - Search functionality
 * - Bill detail navigation
 * - Community engagement
 * - Real-time updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  renderWithProviders,
  mockFetch,
  mockWebSocket,
  TestDataFactory,
  screen,
  fireEvent,
  waitFor,
  userEvent,
  within
} from '../test-utilities';
import { App } from '../../App';
import { BrowserRouter } from 'react-router-dom';

describe('Bill Discovery Workflow - Integration Tests', () => {
  let mockBills: any[];
  let mockUser: any;
  let mockWebSocketInstance: any;

  beforeEach(() => {
    // Create mock data
    mockBills = Array.from({ length: 20 }, (_, i) => 
      TestDataFactory.createMockBill({
        id: `bill-${i + 1}`,
        title: `Test Bill ${i + 1}`,
        category: i % 2 === 0 ? 'healthcare' : 'education',
        status: i % 3 === 0 ? 'passed' : 'active',
        urgency_level: i % 4 === 0 ? 'high' : 'medium',
      })
    );

    mockUser = TestDataFactory.createMockUser({
      id: 'test-user-1',
      role: 'citizen',
    });

    // Mock API responses
    mockFetch({
      '/api/bills': { data: { bills: mockBills, total: mockBills.length } },
      '/api/bills/search': { data: { bills: mockBills.slice(0, 5), total: 5 } },
      '/api/user/profile': { data: mockUser },
      '/api/bills/*/comments': { data: { comments: [], total: 0 } },
      '*': { data: {} },
    });

    // Mock WebSocket
    mockWebSocketInstance = mockWebSocket();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // COMPLETE BILL DISCOVERY WORKFLOW
  // =============================================================================

  describe('Complete Bill Discovery Workflow', () => {
    it('should allow user to discover, filter, and view bills', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // 1. Navigate to bills dashboard
      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // 2. Verify bills are loaded and displayed
      await waitFor(() => {
        expect(screen.getByText('Test Bill 1')).toBeInTheDocument();
        expect(screen.getByText('Test Bill 2')).toBeInTheDocument();
      });

      // 3. Apply category filter
      const filterPanel = screen.getByRole('region', { name: /filter/i });
      const healthcareFilter = within(filterPanel).getByLabelText('Healthcare');
      await user.click(healthcareFilter);

      // 4. Verify filtered results
      await waitFor(() => {
        const billCards = screen.getAllByRole('article');
        expect(billCards.length).toBeGreaterThan(0);
        // All visible bills should be healthcare category
        billCards.forEach(card => {
          expect(within(card).getByText(/healthcare/i)).toBeInTheDocument();
        });
      });

      // 5. Search for specific bill
      const searchInput = screen.getByPlaceholderText(/search bills/i);
      await user.type(searchInput, 'Test Bill 1');
      await user.keyboard('{Enter}');

      // 6. Verify search results
      await waitFor(() => {
        expect(screen.getByText('Test Bill 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Bill 2')).not.toBeInTheDocument();
      });

      // 7. Click on bill to view details
      const billCard = screen.getByRole('article', { name: /Test Bill 1/i });
      await user.click(billCard);

      // 8. Verify navigation to bill detail page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Test Bill 1/i })).toBeInTheDocument();
        expect(screen.getByText(/bill details/i)).toBeInTheDocument();
      });
    });

    it('should handle real-time bill updates during discovery', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Bill 1')).toBeInTheDocument();
      });

      // Simulate real-time bill update via WebSocket
      const updatedBill = {
        ...mockBills[0],
        title: 'Updated Test Bill 1',
        status: 'passed',
      };

      // Trigger WebSocket message
      const messageHandler = mockWebSocketInstance.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (messageHandler) {
        messageHandler({
          data: JSON.stringify({
            type: 'BILL_UPDATED',
            payload: updatedBill,
          }),
        });
      }

      // Verify real-time update is reflected
      await waitFor(() => {
        expect(screen.getByText('Updated Test Bill 1')).toBeInTheDocument();
        expect(screen.getByText('Passed')).toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // ADVANCED FILTERING WORKFLOW
  // =============================================================================

  describe('Advanced Filtering Workflow', () => {
    it('should support multi-dimensional filtering', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      const filterPanel = screen.getByRole('region', { name: /filter/i });

      // Apply multiple filters
      await user.click(within(filterPanel).getByLabelText('Healthcare'));
      await user.click(within(filterPanel).getByLabelText('High Priority'));
      await user.click(within(filterPanel).getByLabelText('Active'));

      // Verify filter chips are displayed
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Verify filtered results
      await waitFor(() => {
        const billCards = screen.getAllByRole('article');
        billCards.forEach(card => {
          expect(within(card).getByText(/healthcare/i)).toBeInTheDocument();
          expect(within(card).getByText(/high/i)).toBeInTheDocument();
          expect(within(card).getByText(/active/i)).toBeInTheDocument();
        });
      });

      // Clear individual filter
      const healthcareChip = screen.getByText('Healthcare').closest('button');
      await user.click(healthcareChip!);

      // Verify filter is removed
      expect(screen.queryByText('Healthcare')).not.toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should persist filters in URL for shareable views', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      const filterPanel = screen.getByRole('region', { name: /filter/i });
      
      // Apply filters
      await user.click(within(filterPanel).getByLabelText('Healthcare'));
      await user.click(within(filterPanel).getByLabelText('High Priority'));

      // Verify URL contains filter parameters
      await waitFor(() => {
        expect(window.location.search).toContain('category=healthcare');
        expect(window.location.search).toContain('urgency=high');
      });
    });
  });

  // =============================================================================
  // SEARCH FUNCTIONALITY WORKFLOW
  // =============================================================================

  describe('Search Functionality Workflow', () => {
    it('should provide intelligent search with autocomplete', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const searchInput = screen.getByPlaceholderText(/search bills/i);
      
      // Start typing to trigger autocomplete
      await user.type(searchInput, 'Test');

      // Verify autocomplete suggestions appear
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        expect(screen.getByText('Test Bill 1')).toBeInTheDocument();
        expect(screen.getByText('Test Bill 2')).toBeInTheDocument();
      });

      // Select suggestion
      await user.click(screen.getByText('Test Bill 1'));

      // Verify search is performed
      await waitFor(() => {
        expect(searchInput).toHaveValue('Test Bill 1');
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });
    });

    it('should support advanced search with field-specific queries', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Open advanced search
      const advancedSearchButton = screen.getByText('Advanced Search');
      await user.click(advancedSearchButton);

      // Fill in advanced search fields
      const titleField = screen.getByLabelText('Title');
      const sponsorField = screen.getByLabelText('Sponsor');
      
      await user.type(titleField, 'Healthcare');
      await user.type(sponsorField, 'Senator Smith');

      // Perform search
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Verify advanced search results
      await waitFor(() => {
        expect(screen.getByText('Advanced Search Results')).toBeInTheDocument();
      });
    });

    it('should save and manage search queries', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const searchInput = screen.getByPlaceholderText(/search bills/i);
      
      // Perform search
      await user.type(searchInput, 'Healthcare Reform');
      await user.keyboard('{Enter}');

      // Save search
      const saveSearchButton = screen.getByText('Save Search');
      await user.click(saveSearchButton);

      // Provide search name
      const searchNameInput = screen.getByPlaceholderText('Search name');
      await user.type(searchNameInput, 'My Healthcare Search');
      
      const confirmSaveButton = screen.getByRole('button', { name: /save/i });
      await user.click(confirmSaveButton);

      // Verify search is saved
      await waitFor(() => {
        expect(screen.getByText('Search saved successfully')).toBeInTheDocument();
      });

      // Access saved searches
      const savedSearchesButton = screen.getByText('Saved Searches');
      await user.click(savedSearchesButton);

      // Verify saved search appears
      expect(screen.getByText('My Healthcare Search')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // COMMUNITY ENGAGEMENT WORKFLOW
  // =============================================================================

  describe('Community Engagement Workflow', () => {
    it('should allow user to engage with bill community features', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Navigate to bill detail
      await waitFor(() => {
        expect(screen.getByText('Test Bill 1')).toBeInTheDocument();
      });

      const billCard = screen.getByRole('article', { name: /Test Bill 1/i });
      await user.click(billCard);

      // Navigate to Community tab
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /community/i })).toBeInTheDocument();
      });

      const communityTab = screen.getByRole('tab', { name: /community/i });
      await user.click(communityTab);

      // Add a comment
      const commentTextarea = screen.getByPlaceholderText(/share your thoughts/i);
      await user.type(commentTextarea, 'This is a great bill that will help many people.');

      const submitButton = screen.getByRole('button', { name: /post comment/i });
      await user.click(submitButton);

      // Verify comment is added
      await waitFor(() => {
        expect(screen.getByText('This is a great bill that will help many people.')).toBeInTheDocument();
      });

      // Vote on the comment
      const upvoteButton = screen.getByLabelText(/upvote comment/i);
      await user.click(upvoteButton);

      // Verify vote is registered
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Vote count
      });
    });

    it('should display expert analysis and verification', async () => {
      const user = userEvent.setup();
      
      // Mock expert analysis
      const expertAnalysis = {
        id: 'analysis-1',
        expert: TestDataFactory.createMockExpert(),
        content: 'This bill has significant constitutional implications...',
        verification_status: 'verified',
      };

      mockFetch({
        '/api/bills/*/analysis': { data: { analysis: [expertAnalysis] } },
        '*': { data: {} },
      });

      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Navigate to bill detail
      const billCard = screen.getByRole('article', { name: /Test Bill 1/i });
      await user.click(billCard);

      // Navigate to Analysis tab
      const analysisTab = screen.getByRole('tab', { name: /analysis/i });
      await user.click(analysisTab);

      // Verify expert analysis is displayed
      await waitFor(() => {
        expect(screen.getByText('This bill has significant constitutional implications...')).toBeInTheDocument();
        expect(screen.getByText('Verified Expert')).toBeInTheDocument();
      });

      // Verify expert badge and credentials
      const expertBadge = screen.getByRole('button', { name: /expert profile/i });
      await user.click(expertBadge);

      expect(screen.getByText('PhD in Political Science')).toBeInTheDocument();
      expect(screen.getByText('Former Legislative Aide')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // ERROR HANDLING AND RECOVERY
  // =============================================================================

  describe('Error Handling and Recovery', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      mockFetch({
        '/api/bills': { error: new Error('Server Error'), status: 500 },
        '*': { data: {} },
      });

      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Verify error state is displayed
      await waitFor(() => {
        expect(screen.getByText('Failed to load bills')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Test retry functionality
      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      // Mock successful retry
      mockFetch({
        '/api/bills': { data: { bills: mockBills, total: mockBills.length } },
        '*': { data: {} },
      });

      await userEvent.setup().click(retryButton);

      // Verify recovery
      await waitFor(() => {
        expect(screen.getByText('Test Bill 1')).toBeInTheDocument();
        expect(screen.queryByText('Failed to load bills')).not.toBeInTheDocument();
      });
    });

    it('should handle WebSocket disconnection and reconnection', async () => {
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Simulate WebSocket disconnection
      const closeHandler = mockWebSocketInstance.addEventListener.mock.calls
        .find(call => call[0] === 'close')?.[1];
      
      if (closeHandler) {
        closeHandler({ code: 1006, reason: 'Connection lost' });
      }

      // Verify offline indicator
      await waitFor(() => {
        expect(screen.getByText('Connection lost')).toBeInTheDocument();
      });

      // Simulate reconnection
      const openHandler = mockWebSocketInstance.addEventListener.mock.calls
        .find(call => call[0] === 'open')?.[1];
      
      if (openHandler) {
        openHandler({});
      }

      // Verify reconnection indicator
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.queryByText('Connection lost')).not.toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // PERFORMANCE AND OPTIMIZATION
  // =============================================================================

  describe('Performance and Optimization', () => {
    it('should implement virtual scrolling for large bill lists', async () => {
      // Mock large dataset
      const largeBillSet = Array.from({ length: 1000 }, (_, i) => 
        TestDataFactory.createMockBill({ id: `bill-${i + 1}` })
      );

      mockFetch({
        '/api/bills': { data: { bills: largeBillSet, total: largeBillSet.length } },
        '*': { data: {} },
      });

      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Verify only visible items are rendered (virtual scrolling)
      const billCards = screen.getAllByRole('article');
      expect(billCards.length).toBeLessThan(50); // Should not render all 1000 items
      expect(billCards.length).toBeGreaterThan(0);
    });

    it('should implement lazy loading for bill details', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const billCard = screen.getByRole('article', { name: /Test Bill 1/i });
      await user.click(billCard);

      // Verify loading state for tabs
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      });

      // Click on Analysis tab (should lazy load)
      const analysisTab = screen.getByRole('tab', { name: /analysis/i });
      await user.click(analysisTab);

      // Verify loading indicator
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Verify content loads
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.getByText(/analysis content/i)).toBeInTheDocument();
      });
    });
  });
});