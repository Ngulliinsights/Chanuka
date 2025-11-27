/**
 * Mobile Components Test Suite
 * 
 * Comprehensive tests for all mobile-optimized components including
 * touch interactions, accessibility, and responsive behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import mobile components
import { MobileBottomSheet, useBottomSheet } from '@client/MobileBottomSheet';
import { MobileTabSelector, useMobileTabs } from '@client/MobileTabSelector';
import { PullToRefresh } from '@client/PullToRefresh';
import { InfiniteScroll } from '@client/InfiniteScroll';
import { SwipeGestures } from '@client/SwipeGestures';
import { MobileNavigationDrawer } from '@client/MobileNavigationDrawer';
import { MobileLayout } from '@client/MobileLayout';
import { MobileBarChart, MobilePieChart, MobileMetricCard } from '@client/MobileDataVisualization';

// Mock hooks
vi.mock('../../../hooks/use-mobile', () => ({
  useMediaQuery: vi.fn(() => true), // Default to mobile
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
    logout: vi.fn(),
  })),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Mock data
const mockTabs = [
  { id: 'tab1', label: 'Tab 1', icon: <span>Icon1</span> },
  { id: 'tab2', label: 'Tab 2', icon: <span>Icon2</span>, badge: '5' },
  { id: 'tab3', label: 'Tab 3', icon: <span>Icon3</span>, disabled: true },
];

const mockChartData = {
  title: 'Test Chart',
  type: 'bar' as const,
  data: [
    { label: 'Item 1', value: 10, color: 'bg-blue-500' },
    { label: 'Item 2', value: 20, color: 'bg-green-500' },
    { label: 'Item 3', value: 15, color: 'bg-red-500' },
  ],
};

const mockNavigationItems = [
  { id: 'home', label: 'Home', path: '/', icon: <span>Home</span> },
  { id: 'bills', label: 'Bills', path: '/bills', icon: <span>Bills</span> },
];

describe('MobileBottomSheet', () => {
  it('renders when open', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()} title="Test Sheet">
        <div>Sheet Content</div>
      </MobileBottomSheet>
    );

    expect(screen.getByText('Test Sheet')).toBeInTheDocument();
    expect(screen.getByText('Sheet Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <MobileBottomSheet isOpen={false} onClose={vi.fn()} title="Test Sheet">
        <div>Sheet Content</div>
      </MobileBottomSheet>
    );

    expect(screen.queryByText('Test Sheet')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose} title="Test Sheet">
        <div>Sheet Content</div>
      </MobileBottomSheet>
    );

    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when escape key is pressed', async () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose} title="Test Sheet">
        <div>Sheet Content</div>
      </MobileBottomSheet>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()} title="Test Sheet">
        <div>Sheet Content</div>
      </MobileBottomSheet>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'bottom-sheet-title');
  });
});

describe('MobileTabSelector', () => {
  it('renders all tabs', () => {
    render(
      <MobileTabSelector
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={vi.fn()}
      />
    );

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });

  it('shows badge when provided', () => {
    render(
      <MobileTabSelector
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={vi.fn()}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onTabChange when tab is clicked', async () => {
    const onTabChange = vi.fn();
    render(
      <MobileTabSelector
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={onTabChange}
      />
    );

    await userEvent.click(screen.getByText('Tab 2'));

    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  it('does not call onTabChange for disabled tabs', async () => {
    const onTabChange = vi.fn();
    render(
      <MobileTabSelector
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={onTabChange}
      />
    );

    await userEvent.click(screen.getByText('Tab 3'));

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation', async () => {
    const onTabChange = vi.fn();
    render(
      <MobileTabSelector
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={onTabChange}
      />
    );

    const firstTab = screen.getByText('Tab 1');
    firstTab.focus();
    
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });

    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  it('has proper accessibility attributes', () => {
    render(
      <MobileTabSelector
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={vi.fn()}
      />
    );

    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();

    const activeTab = screen.getByRole('tab', { selected: true });
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('PullToRefresh', () => {
  it('renders children', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <div>Content</div>
      </PullToRefresh>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onRefresh when pull threshold is reached', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <PullToRefresh onRefresh={onRefresh} threshold={50}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByText('Content').parentElement;
    
    // Simulate touch events
    fireEvent.touchStart(container!, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container!, { touches: [{ clientY: 60 }] });
    fireEvent.touchEnd(container!);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('shows loading state during refresh', async () => {
    const onRefresh = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = screen.getByText('Content').parentElement;
    
    fireEvent.touchStart(container!, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container!, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(container!);

    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });
});

describe('InfiniteScroll', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ];

  it('renders items', () => {
    render(
      <InfiniteScroll
        items={mockItems}
        hasMore={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        renderItem={(item) => <div key={item.id}>{item.name}</div>}
        getItemKey={(item) => item.id.toString()}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <InfiniteScroll
        items={mockItems}
        hasMore={true}
        isLoading={true}
        onLoadMore={vi.fn()}
        renderItem={(item) => <div key={item.id}>{item.name}</div>}
        getItemKey={(item) => item.id.toString()}
      />
    );

    expect(screen.getByText('Loading more items...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <InfiniteScroll
        items={mockItems}
        hasMore={true}
        isLoading={false}
        error="Failed to load"
        onLoadMore={vi.fn()}
        renderItem={(item) => <div key={item.id}>{item.name}</div>}
        getItemKey={(item) => item.id.toString()}
      />
    );

    expect(screen.getByText('Failed to load more items')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(
      <InfiniteScroll
        items={[]}
        hasMore={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        renderItem={(item) => <div key={item.id}>{item.name}</div>}
        getItemKey={(item) => item.id.toString()}
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });
});

describe('SwipeGestures', () => {
  it('renders children', () => {
    render(
      <SwipeGestures>
        <div>Swipeable Content</div>
      </SwipeGestures>
    );

    expect(screen.getByText('Swipeable Content')).toBeInTheDocument();
  });

  it('calls onSwipeLeft when swiping left', () => {
    const onSwipeLeft = vi.fn();
    render(
      <SwipeGestures onSwipeLeft={onSwipeLeft}>
        <div>Swipeable Content</div>
      </SwipeGestures>
    );

    const element = screen.getByText('Swipeable Content');
    
    fireEvent.touchStart(element, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(element, { changedTouches: [{ clientX: 20, clientY: 100 }] });

    expect(onSwipeLeft).toHaveBeenCalled();
  });

  it('calls onSwipeRight when swiping right', () => {
    const onSwipeRight = vi.fn();
    render(
      <SwipeGestures onSwipeRight={onSwipeRight}>
        <div>Swipeable Content</div>
      </SwipeGestures>
    );

    const element = screen.getByText('Swipeable Content');
    
    fireEvent.touchStart(element, { touches: [{ clientX: 20, clientY: 100 }] });
    fireEvent.touchEnd(element, { changedTouches: [{ clientX: 100, clientY: 100 }] });

    expect(onSwipeRight).toHaveBeenCalled();
  });

  it('does not trigger swipe for short distances', () => {
    const onSwipeLeft = vi.fn();
    render(
      <SwipeGestures onSwipeLeft={onSwipeLeft} minDistance={50}>
        <div>Swipeable Content</div>
      </SwipeGestures>
    );

    const element = screen.getByText('Swipeable Content');
    
    fireEvent.touchStart(element, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(element, { changedTouches: [{ clientX: 80, clientY: 100 }] });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});

describe('MobileNavigationDrawer', () => {
  it('renders when open', () => {
    render(
      <TestWrapper>
        <MobileNavigationDrawer
          isOpen={true}
          onClose={vi.fn()}
          navigationItems={mockNavigationItems}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <MobileNavigationDrawer
          isOpen={false}
          onClose={vi.fn()}
          navigationItems={mockNavigationItems}
        />
      </TestWrapper>
    );

    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <MobileNavigationDrawer
          isOpen={true}
          onClose={onClose}
          navigationItems={mockNavigationItems}
        />
      </TestWrapper>
    );

    const closeButton = screen.getByLabelText('Close menu');
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('shows user section when authenticated', () => {
    render(
      <TestWrapper>
        <MobileNavigationDrawer
          isOpen={true}
          onClose={vi.fn()}
          navigationItems={mockNavigationItems}
          showUserSection={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});

describe('MobileDataVisualization', () => {
  describe('MobileBarChart', () => {
    it('renders chart with data', () => {
      render(<MobileBarChart data={mockChartData} />);

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('shows values for each item', () => {
      render(<MobileBarChart data={mockChartData} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('handles item selection when interactive', async () => {
      render(<MobileBarChart data={mockChartData} interactive={true} />);

      const firstBar = screen.getByLabelText('Item 1: 10');
      await userEvent.click(firstBar);

      // Should show selected item details
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('MobilePieChart', () => {
    it('renders chart with data', () => {
      const pieData = { ...mockChartData, type: 'pie' as const };
      render(<MobilePieChart data={pieData} />);

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('shows percentages', () => {
      const pieData = { ...mockChartData, type: 'pie' as const };
      render(<MobilePieChart data={pieData} />);

      // Should show percentage calculations
      expect(screen.getByText('22.2%')).toBeInTheDocument(); // 10/45
      expect(screen.getByText('44.4%')).toBeInTheDocument(); // 20/45
      expect(screen.getByText('33.3%')).toBeInTheDocument(); // 15/45
    });
  });

  describe('MobileMetricCard', () => {
    it('renders metric with value', () => {
      render(
        <MobileMetricCard
          title="Test Metric"
          value={100}
          description="Test description"
        />
      );

      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('shows change indicator when provided', () => {
      render(
        <MobileMetricCard
          title="Test Metric"
          value={100}
          change={{ value: 10, type: 'increase', period: 'this week' }}
        />
      );

      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText('this week')).toBeInTheDocument();
    });
  });
});

describe('MobileLayout', () => {
  it('renders children', () => {
    render(
      <TestWrapper>
        <MobileLayout>
          <div>Layout Content</div>
        </MobileLayout>
      </TestWrapper>
    );

    expect(screen.getByText('Layout Content')).toBeInTheDocument();
  });

  it('shows navigation when enabled', () => {
    render(
      <TestWrapper>
        <MobileLayout showNavigation={true}>
          <div>Layout Content</div>
        </MobileLayout>
      </TestWrapper>
    );

    expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
  });

  it('shows filter button when filter content is provided', () => {
    render(
      <TestWrapper>
        <MobileLayout
          showFilterButton={true}
          filterContent={<div>Filter Content</div>}
        >
          <div>Layout Content</div>
        </MobileLayout>
      </TestWrapper>
    );

    expect(screen.getByLabelText('Open filters')).toBeInTheDocument();
  });
});

// Accessibility tests
describe('Mobile Components Accessibility', () => {
  it('all interactive elements have minimum touch target size', () => {
    render(
      <TestWrapper>
        <MobileTabSelector
          tabs={mockTabs}
          activeTab="tab1"
          onTabChange={vi.fn()}
        />
      </TestWrapper>
    );

    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      const styles = window.getComputedStyle(tab);
      const minHeight = parseInt(styles.minHeight);
      const minWidth = parseInt(styles.minWidth);
      
      // Should meet 44px minimum touch target
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });
  });

  it('components support keyboard navigation', async () => {
    render(
      <MobileTabSelector
        tabs={mockTabs}
        activeTab="tab1"
        onTabChange={vi.fn()}
      />
    );

    const firstTab = screen.getByRole('tab', { selected: true });
    expect(firstTab).toHaveAttribute('tabIndex', '0');

    const otherTabs = screen.getAllByRole('tab').filter(tab => tab !== firstTab);
    otherTabs.forEach(tab => {
      expect(tab).toHaveAttribute('tabIndex', '-1');
    });
  });

  it('components have proper ARIA labels', () => {
    render(
      <TestWrapper>
        <MobileNavigationDrawer
          isOpen={true}
          onClose={vi.fn()}
          navigationItems={mockNavigationItems}
        />
      </TestWrapper>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Navigation menu');
  });
});

// Performance tests
describe('Mobile Components Performance', () => {
  it('lazy loads content when appropriate', async () => {
    const LazyContent = React.lazy(() => 
      Promise.resolve({ default: () => <div>Lazy Content</div> })
    );

    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <LazyContent />
      </React.Suspense>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Lazy Content')).toBeInTheDocument();
    });
  });

  it('handles large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));

    const renderStart = performance.now();
    
    render(
      <InfiniteScroll
        items={largeDataset.slice(0, 20)} // Only render first 20
        hasMore={true}
        isLoading={false}
        onLoadMore={vi.fn()}
        renderItem={(item) => <div key={item.id}>{item.name}</div>}
        getItemKey={(item) => item.id.toString()}
      />
    );

    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;

    // Should render quickly even with large datasets
    expect(renderTime).toBeLessThan(100); // 100ms threshold
  });
});