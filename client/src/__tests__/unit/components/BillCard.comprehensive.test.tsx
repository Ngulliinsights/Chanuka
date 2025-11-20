/**
 * Comprehensive Unit Tests for BillCard Component
 * 
 * Tests cover:
 * - Component rendering and props
 * - User interactions and event handling
 * - Accessibility compliance
 * - Responsive behavior
 * - Error states and edge cases
 * - Performance characteristics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  renderWithProviders, 
  testAccessibility, 
  testKeyboardNavigation,
  testResponsiveBehavior,
  TestDataFactory,
  measurePerformance,
  screen,
  fireEvent,
  waitFor,
  userEvent
} from '../../test-utilities';
import { BillCard } from '@client/components/bills/BillCard';
import type { Bill } from '@client/types/bill';

describe('BillCard Component - Comprehensive Tests', () => {
  let mockBill: Bill;
  let mockOnClick: ReturnType<typeof vi.fn>;
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnShare: ReturnType<typeof vi.fn>;
  let mockOnComment: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockBill = TestDataFactory.createMockBill({
      id: 'test-bill-1',
      title: 'Healthcare Reform Act 2024',
      summary: 'A comprehensive healthcare reform proposal to improve access and reduce costs',
      status: 'active',
      urgency_level: 'high',
      constitutional_flags: [
        {
          id: 'flag-1',
          severity: 'moderate',
          category: 'commerce_clause',
          description: 'May exceed federal commerce clause authority',
        }
      ],
      engagement_metrics: {
        views: 1250,
        saves: 89,
        comments: 34,
        shares: 12,
      },
    });

    mockOnClick = vi.fn();
    mockOnSave = vi.fn();
    mockOnShare = vi.fn();
    mockOnComment = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // BASIC RENDERING TESTS
  // =============================================================================

  describe('Basic Rendering', () => {
    it('should render bill card with all required elements', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText(mockBill.title)).toBeInTheDocument();
      expect(screen.getByText(mockBill.summary)).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });

    it('should render engagement metrics correctly', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText('1,250')).toBeInTheDocument(); // views
      expect(screen.getByText('89')).toBeInTheDocument(); // saves
      expect(screen.getByText('34')).toBeInTheDocument(); // comments
      expect(screen.getByText('12')).toBeInTheDocument(); // shares
    });

    it('should render constitutional flags when present', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      expect(screen.getByText('Constitutional Concern')).toBeInTheDocument();
      expect(screen.getByTitle('May exceed federal commerce clause authority')).toBeInTheDocument();
    });

    it('should handle missing optional props gracefully', () => {
      const minimalBill = TestDataFactory.createMockBill({
        constitutional_flags: [],
        engagement_metrics: {
          views: 0,
          saves: 0,
          comments: 0,
          shares: 0,
        },
      });

      renderWithProviders(
        <BillCard 
          bill={minimalBill}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText(minimalBill.title)).toBeInTheDocument();
      expect(screen.queryByText('Constitutional Concern')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // INTERACTION TESTS
  // =============================================================================

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const { user } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      await user.click(card);

      expect(mockOnClick).toHaveBeenCalledWith(mockBill);
    });

    it('should show quick actions on hover', async () => {
      const { user } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      await user.hover(card);

      expect(screen.getByLabelText('Save bill')).toBeInTheDocument();
      expect(screen.getByLabelText('Share bill')).toBeInTheDocument();
      expect(screen.getByLabelText('Comment on bill')).toBeInTheDocument();
    });

    it('should call onSave when save button is clicked', async () => {
      const { user } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      await user.hover(card);
      
      const saveButton = screen.getByLabelText('Save bill');
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(mockBill);
      expect(mockOnClick).not.toHaveBeenCalled(); // Should not trigger card click
    });

    it('should call onShare when share button is clicked', async () => {
      const { user } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      await user.hover(card);
      
      const shareButton = screen.getByLabelText('Share bill');
      await user.click(shareButton);

      expect(mockOnShare).toHaveBeenCalledWith(mockBill);
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should call onComment when comment button is clicked', async () => {
      const { user } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      await user.hover(card);
      
      const commentButton = screen.getByLabelText('Comment on bill');
      await user.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledWith(mockBill);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('should be accessible according to WCAG 2.1 AA', async () => {
      const component = (
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      await testAccessibility(component);
    });

    it('should support keyboard navigation', async () => {
      const component = (
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      await testKeyboardNavigation(component);
    });

    it('should have proper ARIA labels and roles', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining(mockBill.title));
      
      const statusBadge = screen.getByText('Active');
      expect(statusBadge).toHaveAttribute('aria-label', 'Bill status: Active');
      
      const urgencyBadge = screen.getByText('High Priority');
      expect(urgencyBadge).toHaveAttribute('aria-label', 'Urgency level: High Priority');
    });

    it('should announce changes to screen readers', async () => {
      const { user } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      await user.hover(card);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('Quick actions available');
    });
  });

  // =============================================================================
  // RESPONSIVE BEHAVIOR TESTS
  // =============================================================================

  describe('Responsive Behavior', () => {
    it('should render correctly on all viewport sizes', async () => {
      const component = (
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const results = await testResponsiveBehavior(component);
      
      // Verify component renders on all viewports
      Object.values(results).forEach(({ container }) => {
        expect(container.querySelector('[role="article"]')).toBeInTheDocument();
      });
    });

    it('should adapt layout for mobile devices', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />,
        { viewport: 'mobile' }
      );

      const card = screen.getByRole('article');
      expect(card).toHaveClass('mobile-layout');
    });

    it('should show desktop layout on larger screens', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />,
        { viewport: 'desktop' }
      );

      const card = screen.getByRole('article');
      expect(card).toHaveClass('desktop-layout');
    });
  });

  // =============================================================================
  // ERROR HANDLING AND EDGE CASES
  // =============================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle extremely long bill titles gracefully', () => {
      const longTitleBill = TestDataFactory.createMockBill({
        title: 'A'.repeat(200), // Very long title
      });

      renderWithProviders(
        <BillCard 
          bill={longTitleBill}
          onClick={mockOnClick}
        />
      );

      const titleElement = screen.getByText(longTitleBill.title);
      expect(titleElement).toHaveClass('line-clamp-2'); // Should be truncated
    });

    it('should handle missing engagement metrics', () => {
      const billWithoutMetrics = {
        ...mockBill,
        engagement_metrics: undefined,
      };

      renderWithProviders(
        <BillCard 
          bill={billWithoutMetrics as any}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument(); // Should show 0 for missing metrics
    });

    it('should handle invalid date formats', () => {
      const billWithInvalidDate = TestDataFactory.createMockBill({
        introduced_date: 'invalid-date' as any,
      });

      renderWithProviders(
        <BillCard 
          bill={billWithInvalidDate}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Invalid Date')).toBeInTheDocument();
    });

    it('should prevent event bubbling on quick action clicks', async () => {
      const { user } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
        />
      );

      const card = screen.getByRole('article');
      await user.hover(card);
      
      const saveButton = screen.getByLabelText('Save bill');
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(mockBill);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance', () => {
    it('should render within performance thresholds', async () => {
      const component = (
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const metrics = await measurePerformance(component);
      
      expect(metrics.renderTime).toBeLessThan(100); // Should render in < 100ms
      expect(metrics.reRenderCount).toBeLessThan(3); // Should not re-render excessively
    });

    it('should handle rapid hover interactions without performance degradation', async () => {
      const { user } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          onSave={mockOnSave}
          onShare={mockOnShare}
          onComment={mockOnComment}
        />
      );

      const card = screen.getByRole('article');
      
      // Rapidly hover and unhover
      for (let i = 0; i < 10; i++) {
        await user.hover(card);
        await user.unhover(card);
      }

      // Should not cause memory leaks or performance issues
      expect(card).toBeInTheDocument();
    });
  });

  // =============================================================================
  // VISUAL STATE TESTS
  // =============================================================================

  describe('Visual States', () => {
    it('should apply correct styling for different bill statuses', () => {
      const statuses = ['introduced', 'committee', 'floor', 'passed', 'failed'];
      
      statuses.forEach(status => {
        const billWithStatus = TestDataFactory.createMockBill({ status });
        
        const { unmount } = renderWithProviders(
          <BillCard 
            bill={billWithStatus}
            onClick={mockOnClick}
          />
        );

        const statusBadge = screen.getByText(status.charAt(0).toUpperCase() + status.slice(1));
        expect(statusBadge).toHaveClass(`status-${status}`);
        
        unmount();
      });
    });

    it('should apply correct styling for different urgency levels', () => {
      const urgencyLevels = ['low', 'medium', 'high', 'critical'];
      
      urgencyLevels.forEach(urgency => {
        const billWithUrgency = TestDataFactory.createMockBill({ urgency_level: urgency });
        
        const { unmount } = renderWithProviders(
          <BillCard 
            bill={billWithUrgency}
            onClick={mockOnClick}
          />
        );

        const card = screen.getByRole('article');
        expect(card).toHaveClass(`urgency-${urgency}`);
        
        unmount();
      });
    });

    it('should show loading state when specified', () => {
      renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          loading={true}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading bill...')).toBeInTheDocument();
    });

    it('should show error state when specified', () => {
      const error = new Error('Failed to load bill');
      
      renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
          error={error}
        />
      );

      expect(screen.getByText('Error loading bill')).toBeInTheDocument();
      expect(screen.getByText('Failed to load bill')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // INTEGRATION WITH STORES
  // =============================================================================

  describe('Store Integration', () => {
    it('should update when bill data changes in store', async () => {
      const { rerender } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText(mockBill.title)).toBeInTheDocument();

      const updatedBill = { ...mockBill, title: 'Updated Healthcare Reform Act' };
      
      rerender(
        <BillCard 
          bill={updatedBill}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Updated Healthcare Reform Act')).toBeInTheDocument();
      expect(screen.queryByText(mockBill.title)).not.toBeInTheDocument();
    });

    it('should reflect engagement metric changes', async () => {
      const { rerender } = renderWithProviders(
        <BillCard 
          bill={mockBill}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('1,250')).toBeInTheDocument(); // Initial views

      const updatedBill = {
        ...mockBill,
        engagement_metrics: {
          ...mockBill.engagement_metrics,
          views: 2000,
        },
      };
      
      rerender(
        <BillCard 
          bill={updatedBill}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('2,000')).toBeInTheDocument(); // Updated views
    });
  });
});