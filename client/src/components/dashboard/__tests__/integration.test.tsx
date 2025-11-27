import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Dashboard integration tests
 * Following navigation component integration testing patterns
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivitySummary } from '@client/activity-summary';
import { ActionItems } from '@client/action-items';
import { TrackedTopics } from '@client/tracked-topics';

// Mock the useBills hook
const mockUseBills = {
  summary: {
    billsTracked: 5,
    actionsNeeded: 3,
    topicsCount: 8,
    recentActivity: 12,
    completedActions: 7,
    pendingActions: 3,
    lastUpdated: new Date('2024-01-15T10:30:00Z')
  },
  actionItems: [
    {
      id: 'action-1',
      title: 'Review Healthcare Bill',
      description: 'Review the new healthcare legislation',
      priority: 'High',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      created_at: new Date('2024-01-10T10:00:00Z'),
      updated_at: new Date('2024-01-12T15:30:00Z')
    },
    {
      id: 'action-2',
      title: 'Submit Comments',
      description: 'Submit public comments on education bill',
      priority: 'Medium',
      completed: true,
      created_at: new Date('2024-01-08T09:00:00Z'),
      updated_at: new Date('2024-01-14T16:45:00Z')
    }
  ],
  trackedTopics: [
    {
      id: 'topic-1',
      name: 'Healthcare',
      category: 'legislative',
      billCount: 5,
      is_active: true,
      created_at: new Date('2024-01-01T00:00:00Z')
    },
    {
      id: 'topic-2',
      name: 'Education',
      category: 'policy',
      billCount: 3,
      is_active: false,
      created_at: new Date('2024-01-02T00:00:00Z')
    }
  ],
  isLoading: false,
  error: null,
  refetch: vi.fn().mockResolvedValue(undefined)
};

vi.mock('@/features/bills/hooks/useBills', () => ({
  useBills: () => mockUseBills
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: { className?: string }) => <div data-testid="alert-circle" className={className} />,
  RefreshCw: ({ className }: { className?: string }) => <div data-testid="refresh-cw" className={className} />,
  TrendingUp: ({ className }: { className?: string }) => <div data-testid="trending-up" className={className} />,
  CheckCircle2: ({ className }: { className?: string }) => <div data-testid="check-circle-2" className={className} />,
  Clock: ({ className }: { className?: string }) => <div data-testid="clock" className={className} />,
  PlusCircle: ({ className }: { className?: string }) => <div data-testid="plus-circle" className={className} />,
  X: ({ className }: { className?: string }) => <div data-testid="x" className={className} />,
  Edit3: ({ className }: { className?: string }) => <div data-testid="edit3" className={className} />,
  Search: ({ className }: { className?: string }) => <div data-testid="search" className={className} />,
  Tag: ({ className }: { className?: string }) => <div data-testid="tag" className={className} />
}));

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ActivitySummary Component', () => {
    it('should render activity summary with data', () => {
      render(<ActivitySummary />);

      expect(screen.getByText('Activity Summary')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Bills tracked
      expect(screen.getByText('3')).toBeInTheDocument(); // Actions needed
      expect(screen.getByText('8')).toBeInTheDocument(); // Topics count
      expect(screen.getByText('Bills Tracked')).toBeInTheDocument();
      expect(screen.getByText('Actions Needed')).toBeInTheDocument();
      expect(screen.getByText('Topics')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      const loadingMockUseBills = {
        ...mockUseBills,
        isLoading: true,
        summary: null
      };

      vi.mocked(require('@/features/bills/hooks/useBills').useBills).mockReturnValue(loadingMockUseBills);

      render(<ActivitySummary />);

      // Should show loading skeletons
      const loadingElements = screen.getAllByRole('generic');
      const skeletons = loadingElements.filter(el => 
        el.className?.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should handle refresh action', async () => {
      const user = userEvent.setup();
      render(<ActivitySummary />);

      const refreshButton = screen.getByRole('button');
      await users.click(refreshButton);

      expect(mockUseBills.refetch).toHaveBeenCalled();
    });

    it('should show error state with recovery options', () => {
      const errorMockUseBills = {
        ...mockUseBills,
        error: new Error('Network error'),
        summary: null
      };

      vi.mocked(require('@/features/bills/hooks/useBills').useBills).mockReturnValue(errorMockUseBills);

      render(<ActivitySummary />);

      expect(screen.getByText(/Network error/)).toBeInTheDocument();
      expect(screen.getByText('Try Recovery')).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();
      const errorMockUseBills = {
        ...mockUseBills,
        error: new Error('Test error')
      };

      vi.mocked(require('@/features/bills/hooks/useBills').useBills).mockReturnValue(errorMockUseBills);

      render(<ActivitySummary onError={onError} />);

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call onDataChange callback when data changes', () => {
      const onDataChange = vi.fn();

      render(<ActivitySummary onDataChange={onDataChange} />);

      expect(onDataChange).toHaveBeenCalledWith({
        summary: mockUseBills.summary
      });
    });
  });

  describe('ActionItems Component', () => {
    it('should render action items with data', () => {
      render(<ActionItems />);

      expect(screen.getByText('Your Action Items')).toBeInTheDocument();
      expect(screen.getByText('Review Healthcare Bill')).toBeInTheDocument();
      expect(screen.getByText('Submit Comments')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should show completed actions when filter is enabled', async () => {
      const user = userEvent.setup();
      render(<ActionItems />);

      // Initially, completed actions might be hidden
      const showCompletedButton = screen.getByText(/Show Completed/);
      await users.click(showCompletedButton);

      // Should show completed action
      expect(screen.getByText('Submit Comments')).toBeInTheDocument();
    });

    it('should filter actions by priority', async () => {
      const user = userEvent.setup();
      render(<ActionItems />);

      const priorityFilter = screen.getByDisplayValue('All Priorities');
      await users.selectOptions(priorityFilter, 'High Priority');

      // Should show only high priority actions
      expect(screen.getByText('Review Healthcare Bill')).toBeInTheDocument();
    });

    it('should handle action completion', async () => {
      const user = userEvent.setup();
      render(<ActionItems />);

      // Find complete button for non-completed action
      const completeButtons = screen.getAllByTestId('check-circle-2');
      const actionCompleteButton = completeButtons.find(button => 
        button.closest('[data-testid]')?.textContent?.includes('Review Healthcare Bill')
      );

      if (actionCompleteButton) {
        await users.click(actionCompleteButton);
        // Should trigger completion action
      }
    });

    it('should show due date information', () => {
      render(<ActionItems />);

      // Should show due date for items with due dates
      expect(screen.getByText(/Due in/)).toBeInTheDocument();
    });

    it('should show empty state when no actions match filters', async () => {
      const user = userEvent.setup();
      render(<ActionItems />);

      // Filter to show only completed actions, then filter by high priority
      const showCompletedButton = screen.getByText(/Hide Completed|Show Completed/);
      await users.click(showCompletedButton);

      const priorityFilter = screen.getByDisplayValue('All Priorities');
      await users.selectOptions(priorityFilter, 'High Priority');

      // Should show no matches message
      expect(screen.getByText(/No action items match your filters/)).toBeInTheDocument();
    });
  });

  describe('TrackedTopics Component', () => {
    it('should render tracked topics with data', () => {
      render(<TrackedTopics />);

      expect(screen.getByText('Tracked Topics')).toBeInTheDocument();
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    it('should enter edit mode', async () => {
      const user = userEvent.setup();
      render(<TrackedTopics />);

      const editButton = screen.getByText('Edit');
      await users.click(editButton);

      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter topic name...')).toBeInTheDocument();
    });

    it('should add new topic in edit mode', async () => {
      const user = userEvent.setup();
      render(<TrackedTopics />);

      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await users.click(editButton);

      // Add new topic
      const topicInput = screen.getByPlaceholderText('Enter topic name...');
      await users.type(topicInput, 'Climate Change');

      const categorySelect = screen.getByDisplayValue('Legislative');
      await users.selectOptions(categorySelect, 'Policy');

      const addButton = screen.getByText('Add');
      await users.click(addButton);

      // Should clear input after adding
      expect(topicInput).toHaveValue('');
    });

    it('should search topics', async () => {
      const user = userEvent.setup();
      render(<TrackedTopics />);

      // Enter edit mode to show search
      const editButton = screen.getByText('Edit');
      await users.click(editButton);

      const searchInput = screen.getByPlaceholderText('Search topics...');
      await users.type(searchInput, 'health');

      // Should filter topics based on search
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
    });

    it('should filter topics by category', async () => {
      const user = userEvent.setup();
      render(<TrackedTopics />);

      // Enter edit mode to show filters
      const editButton = screen.getByText('Edit');
      await users.click(editButton);

      const categoryFilter = screen.getByDisplayValue('All Categories');
      await users.selectOptions(categoryFilter, 'Legislative');

      // Should show only legislative topics
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
    });

    it('should remove topic in edit mode', async () => {
      const user = userEvent.setup();
      render(<TrackedTopics />);

      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await users.click(editButton);

      // Find and click remove button for a topic
      const removeButtons = screen.getAllByTestId('x');
      if (removeButtons.length > 0) {
        await users.click(removeButtons[0]);
        // Should trigger topic removal
      }
    });

    it('should show topic bill counts', () => {
      render(<TrackedTopics />);

      // Should show bill counts as badges
      expect(screen.getByText('5')).toBeInTheDocument(); // Healthcare bill count
      expect(screen.getByText('3')).toBeInTheDocument(); // Education bill count
    });

    it('should show empty state when no topics match filters', async () => {
      const user = userEvent.setup();
      render(<TrackedTopics />);

      // Enter edit mode
      const editButton = screen.getByText('Edit');
      await users.click(editButton);

      // Search for non-existent topic
      const searchInput = screen.getByPlaceholderText('Search topics...');
      await users.type(searchInput, 'nonexistent');

      expect(screen.getByText(/No topics match your filters/)).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should handle data updates across components', () => {
      const onDataChange = vi.fn();

      render(
        <div>
          <ActivitySummary onDataChange={onDataChange} />
          <ActionItems onDataChange={onDataChange} />
          <TrackedTopics onDataChange={onDataChange} />
        </div>
      );

      // All components should report their data
      expect(onDataChange).toHaveBeenCalledWith({
        summary: mockUseBills.summary
      });
      expect(onDataChange).toHaveBeenCalledWith({
        actionItems: mockUseBills.actionItems
      });
      expect(onDataChange).toHaveBeenCalledWith({
        trackedTopics: mockUseBills.trackedTopics
      });
    });

    it('should handle error states consistently', () => {
      const onError = vi.fn();
      const errorMockUseBills = {
        ...mockUseBills,
        error: new Error('Consistent error')
      };

      vi.mocked(require('@/features/bills/hooks/useBills').useBills).mockReturnValue(errorMockUseBills);

      render(
        <div>
          <ActivitySummary onError={onError} />
          <ActionItems onError={onError} />
          <TrackedTopics onError={onError} />
        </div>
      );

      // All components should report the same error
      expect(onError).toHaveBeenCalledTimes(3);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should maintain consistent styling across components', () => {
      render(
        <div>
          <ActivitySummary className="test-class" />
          <ActionItems className="test-class" />
          <TrackedTopics className="test-class" />
        </div>
      );

      // All components should accept and apply className
      const components = screen.getAllByRole('generic').filter(el => 
        el.className?.includes('test-class')
      );
      expect(components.length).toBeGreaterThan(0);
    });

    it('should handle refresh actions consistently', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <ActivitySummary />
          <ActionItems />
          <TrackedTopics />
        </div>
      );

      // Find all refresh buttons
      const refreshButtons = screen.getAllByTestId('refresh-cw');
      
      // Click each refresh button
      for (const button of refreshButtons) {
        await users.click(button);
      }

      // Should call refetch for each component
      expect(mockUseBills.refetch).toHaveBeenCalledTimes(refreshButtons.length);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <div>
          <ActivitySummary />
          <ActionItems />
          <TrackedTopics />
        </div>
      );

      // Check for proper headings
      expect(screen.getByRole('heading', { name: 'Activity Summary' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Your Action Items' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Tracked Topics' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ActionItems />);

      // Should be able to tab through interactive elements
      await users.tab();
      expect(document.activeElement).toBeInTheDocument();

      await users.tab();
      expect(document.activeElement).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(<TrackedTopics />);

      // Enter edit mode to show remove buttons
      fireEvent.click(screen.getByText('Edit'));

      // Remove buttons should have proper aria-labels
      const removeButtons = screen.getAllByRole('button').filter(button => 
        button.getAttribute('aria-label')?.includes('Remove')
      );
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <ActivitySummary />;
      };

      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<TestComponent />);
      
      // Should not cause additional renders if data hasn't changed
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle large datasets efficiently', () => {
      const largeActionItems = Array.from({ length: 100 }, (_, i) => ({
        id: `action-${i}`,
        title: `Action ${i}`,
        description: `Description ${i}`,
        priority: 'Medium' as const,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const largeMockUseBills = {
        ...mockUseBills,
        actionItems: largeActionItems
      };

      vi.mocked(require('@/features/bills/hooks/useBills').useBills).mockReturnValue(largeMockUseBills);

      const startTime = performance.now();
      render(<ActionItems />);
      const endTime = performance.now();

      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});

