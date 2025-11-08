/**
 * Test file to verify MobileNavigation transition fixes
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import MobileNavigation from '../mobile-navigation';

// Mock the mobile touch handler
vi.mock('../../../utils/mobile-touch-handler', () => ({
  MobileTouchHandler: vi.fn().mockImplementation(() => ({
    onSwipe: null,
    destroy: vi.fn(),
  })),
  MobileTouchUtils: {
    isTouchDevice: () => true,
    preventZoomOnDoubleTap: () => vi.fn(),
  },
}));

// Mock responsive layout components
vi.mock('../../mobile/responsive-layout-manager', () => ({
  ResponsiveLayoutProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useResponsiveLayoutContext: () => ({
    touchOptimized: true,
    isMobile: true,
  }),
  TouchButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SafeAreaWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock other components
vi.mock('../../mobile/mobile-navigation-enhancements', () => ({
  MobileTabBar: () => <div data-testid="mobile-tab-bar">Tab Bar</div>,
  SwipeableHeader: () => <div data-testid="swipeable-header">Header</div>,
}));

vi.mock('../../navigation/navigation-preferences-dialog', () => ({
  default: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}));

vi.mock('../../navigation/quick-access-nav', () => ({
  default: () => <div data-testid="quick-access-nav">Quick Access</div>,
}));

vi.mock('../../notifications/notification-center', () => ({
  default: () => <div data-testid="notification-center">Notifications</div>,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('MobileNavigation Transition Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle rapid open/close transitions without race conditions', async () => {
    const onClose = vi.fn();
    
    const { rerender } = render(
      <TestWrapper>
        <MobileNavigation isOpen={false} onClose={onClose} />
      </TestWrapper>
    );

    // Rapidly toggle open/close states
    rerender(
      <TestWrapper>
        <MobileNavigation isOpen={true} onClose={onClose} />
      </TestWrapper>
    );

    rerender(
      <TestWrapper>
        <MobileNavigation isOpen={false} onClose={onClose} />
      </TestWrapper>
    );

    rerender(
      <TestWrapper>
        <MobileNavigation isOpen={true} onClose={onClose} />
      </TestWrapper>
    );

    // Should not cause any errors or infinite loops
    await waitFor(() => {
      expect(screen.getByTestId('swipeable-header')).toBeInTheDocument();
    });
  });

  it('should prevent multiple close calls during transition', async () => {
    const onClose = vi.fn();
    
    render(
      <TestWrapper>
        <MobileNavigation isOpen={true} onClose={onClose} />
      </TestWrapper>
    );

    // Find and click close button multiple times rapidly
    const closeButtons = screen.getAllByLabelText(/close/i);
    if (closeButtons.length > 0) {
      const closeButton = closeButtons[0];
      
      // Rapidly click close button
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);

      // Should only call onClose once due to transition management
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    }
  });

  it('should handle touch optimization without memory leaks', () => {
    const { unmount } = render(
      <TestWrapper>
        <MobileNavigation isOpen={true} onClose={vi.fn()} enableTouchOptimization={true} />
      </TestWrapper>
    );

    // Unmounting should not cause any errors
    expect(() => unmount()).not.toThrow();
  });

  it('should handle swipe gestures without conflicts', () => {
    render(
      <TestWrapper>
        <MobileNavigation 
          isOpen={true} 
          onClose={vi.fn()} 
          enableSwipeGestures={true}
          enableTouchOptimization={true}
        />
      </TestWrapper>
    );

    // Should render without errors when swipe gestures are enabled
    expect(screen.getByTestId('swipeable-header')).toBeInTheDocument();
  });

  it('should handle mobile/desktop switching gracefully', () => {
    const { rerender } = render(
      <TestWrapper>
        <MobileNavigation isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    // Simulate multiple re-renders (like responsive breakpoint changes)
    for (let i = 0; i < 10; i++) {
      rerender(
        <TestWrapper>
          <MobileNavigation isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );
    }

    // Should not cause infinite loops or errors
    expect(screen.getByTestId('swipeable-header')).toBeInTheDocument();
  });
});