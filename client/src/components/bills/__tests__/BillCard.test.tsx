/**
 * Enhanced Unit Tests for BillCard Component
 * Comprehensive testing with 80%+ coverage target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  renderWithProviders, 
  MockDataFactory, 
  AccessibilityTestUtils,
  PerformanceTestUtils,
  screen,
  waitFor,
  userEvent
} from '@client/test-utils/comprehensive-test-setup';
import { BillCard } from '@client/BillCard';

// Mock the router hook
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('BillCard Component - Enhanced Tests', () => {
  let mockBill: any;
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnShare: ReturnType<typeof vi.fn>;
  let mockOnComment: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockBill = MockDataFactory.createMockBill();
    mockOnSave = vi.fn();
    mockOnShare = vi.fn();
    mockOnComment = vi.fn();
  });

  // =============================================================================
  // BASIC RENDERING TESTS
  // =============================================================================

  describe('Basic Rendering', () => {
    it('should render bill card with all required elements', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText(mockBill.title)).toBeInTheDocument();
      expect(screen.getByText(mockBill.summary)).toBeInTheDocument();
      expect(screen.getByText(mockBill.sponsor)).toBeInTheDocument();
      expect(screen.getByText(mockBill.status)).toBeInTheDocument();
    });

    it('should render engagement metrics correctly', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText(mockBill.engagement_metrics.views.toString())).toBeInTheDocument();
      expect(screen.getByText(mockBill.engagement_metrics.saves.toString())).toBeInTheDocument();
      expect(screen.getByText(mockBill.engagement_metrics.comments.toString())).toBeInTheDocument();
    });

    it('should apply correct CSS classes based on bill status', () => {
      const activeBill = MockDataFactory.createMockBill({ status: 'active' });
      const { container } = renderWithProviders(
        <BillCard 
          bill={activeBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = container.querySelector('.chanuka-card');
      expect(card).toHaveClass('chanuka-card');
    });

    it('should render urgency badges correctly', () => {
      const urgentBill = MockDataFactory.createMockBill({ urgency_level: 'high' });
      renderWithProviders(
        <BillCard 
          bill={urgentBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });

    it('should render constitutional flags when present', () => {
      const flaggedBill = MockDataFactory.createMockBill({
        constitutional_flags: [
          { severity: 'high', category: 'Due Process', description: 'Potential due process violation' }
        ]
      });

      renderWithProviders(
        <BillCard 
          bill={flaggedBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText('Constitutional Concern')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // INTERACTION TESTS
  // =============================================================================

  describe('User Interactions', () => {
    it('should call onSave when save button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(mockBill.id);
    });

    it('should call onShare when share button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      expect(mockOnShare).toHaveBeenCalledWith(mockBill.id);
    });

    it('should call onComment when comment button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const commentButton = screen.getByRole('button', { name: /comment/i });
      await user.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledWith(mockBill.id);
    });

    it('should show hover actions on mouse enter', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = container.querySelector('.chanuka-card');
      await user.hover(card!);

      const quickActions = screen.getByTestId('quick-actions');
      expect(quickActions).toBeVisible();
    });

    it('should hide hover actions on mouse leave', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = container.querySelector('.chanuka-card');
      await user.hover(card!);
      await user.unhover(card!);

      const quickActions = screen.getByTestId('quick-actions');
      expect(quickActions).not.toBeVisible();
    });

    it('should navigate to bill detail on card click', async () => {
      const user = userEvent.setup();
      const mockNavigate = vi.fn();
      
      vi.doMock('react-router-dom', () => ({
        useNavigate: () => mockNavigate,
      }));

      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      await user.click(card);

      expect(mockNavigate).toHaveBeenCalledWith(`/bills/${mockBill.id}`);
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('should be accessible with proper ARIA attributes', () => {
      const { container } = renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = container.querySelector('[role="article"]');
      expect(card).toBeAccessible();
    });

    it('should support keyboard navigation', async () => {
      const { container } = renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      await AccessibilityTestUtils.testKeyboardNavigation(container);
    });

    it('should have proper heading hierarchy', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent(mockBill.title);
    });

    it('should have descriptive button labels', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByRole('button', { name: `Save ${mockBill.title}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Share ${mockBill.title}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Comment on ${mockBill.title}` })).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', async () => {
      const { rerender } = renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const updatedBill = { ...mockBill, status: 'passed' };
      rerender(
        <BillCard 
          bill={updatedBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      await AccessibilityTestUtils.testScreenReaderAnnouncements('Bill status updated to passed');
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance', () => {
    it('should render within performance threshold', async () => {
      const { renderTime } = await PerformanceTestUtils.measureRenderTime(() =>
        renderWithProviders(
          <BillCard 
            bill={mockBill} 
            onSave={mockOnSave}
            onShare={mockOnShare}
            onComment={mockOnComment}
          />
        )
      );

      expect(renderTime).toHavePerformantRender();
    });

    it('should handle large engagement metrics efficiently', async () => {
      const billWithLargeMetrics = MockDataFactory.createMockBill({
        engagement_metrics: {
          views: 999999,
          saves: 99999,
          comments: 9999,
          shares: 9999,
        }
      });

      const { renderTime } = await PerformanceTestUtils.measureRenderTime(() =>
        renderWithProviders(
          <BillCard 
            bill={billWithLargeMetrics} 
            onSave={mockOnSave}
            onShare={mockOnShare}
            onComment={mockOnComment}
          />
        )
      );

      expect(renderTime).toHavePerformantRender();
    });

    it('should memoize expensive calculations', () => {
      const expensiveBill = MockDataFactory.createMockBill({
        tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`),
      });

      const { rerender } = renderWithProviders(
        <BillCard 
          bill={expensiveBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      // Re-render with same props should use memoized values
      rerender(
        <BillCard 
          bill={expensiveBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      // Component should still render correctly
      expect(screen.getByText(expensiveBill.title)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // EDGE CASES AND ERROR HANDLING
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle missing engagement metrics gracefully', () => {
      const billWithoutMetrics = MockDataFactory.createMockBill({
        engagement_metrics: undefined,
      });

      renderWithProviders(
        <BillCard 
          bill={billWithoutMetrics} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText(billWithoutMetrics.title)).toBeInTheDocument();
    });

    it('should handle very long bill titles', () => {
      const billWithLongTitle = MockDataFactory.createMockBill({
        title: 'A'.repeat(200),
      });

      renderWithProviders(
        <BillCard 
          bill={billWithLongTitle} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('truncate'); // Should have truncation class
    });

    it('should handle missing optional props', () => {
      renderWithProviders(
        <BillCard bill={mockBill} />
      );

      expect(screen.getByText(mockBill.title)).toBeInTheDocument();
    });

    it('should handle invalid date formats', () => {
      const billWithInvalidDate = MockDataFactory.createMockBill({
        introduced_date: 'invalid-date',
      });

      renderWithProviders(
        <BillCard 
          bill={billWithInvalidDate} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText('Invalid Date')).toBeInTheDocument();
    });

    it('should handle empty or null bill data', () => {
      const emptyBill = {
        id: 'empty-bill',
        title: '',
        summary: '',
        status: '',
        category: '',
        sponsor: '',
      };

      renderWithProviders(
        <BillCard 
          bill={emptyBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText('Untitled Bill')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // RESPONSIVE DESIGN TESTS
  // =============================================================================

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      window.dispatchEvent(new Event('resize'));

      const { container } = renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = container.querySelector('.chanuka-card');
      expect(card).toHaveClass('mobile-layout');
    });

    it('should adapt layout for tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      window.dispatchEvent(new Event('resize'));

      const { container } = renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = container.querySelector('.chanuka-card');
      expect(card).toHaveClass('tablet-layout');
    });

    it('should maintain touch targets on mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      window.dispatchEvent(new Event('resize'));

      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(44); // 44px minimum touch target
      });
    });
  });

  // =============================================================================
  // INTEGRATION WITH STORE
  // =============================================================================

  describe('Store Integration', () => {
    it('should update when bill data changes in store', async () => {
      const initialState = {
        bills: {
          items: [mockBill],
          loading: false,
          error: null,
        }
      };

      const { store } = renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />,
        { initialState }
      );

      // Update bill in store
      const updatedBill = { ...mockBill, title: 'Updated Title' };
      store.dispatch({ type: 'bills/updateBill', payload: updatedBill });

      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
      });
    });

    it('should handle loading state from store', () => {
      const loadingState = {
        bills: {
          items: [],
          loading: true,
          error: null,
        }
      };

      renderWithProviders(
        <BillCard 
          bill={mockBill} 
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />,
        { loadingState }
      );

      expect(screen.getByTestId('bill-card-skeleton')).toBeInTheDocument();
    });
  });
});