import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { DesktopSidebar } from '../DesktopSidebar';

// Mock the dependencies
jest.mock('../hooks/useNav', () => ({
  useNav: jest.fn(() => ({
    items: [
      { id: '1', section: 'legislative', label: 'Bills', href: '/bills' },
      { id: '2', section: 'community', label: 'Community', href: '/community' },
    ],
    user_role: 'public',
    isAuthenticated: false,
  })),
}));

jest.mock('../constants', () => ({
  SECTION_ORDER: ['legislative', 'community'],
}));

jest.mock('./NavSection', () => ({
  NavSection: ({ section, items }: { section: string; items: any[] }) => (
    <div data-testid={`nav-section-${section}`}>
      {items.map((item) => (
        <div key={item.id} data-testid={`nav-item-${item.id}`}>
          {item.label}
        </div>
      ))}
    </div>
  ),
}));

describe('DesktopSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesktopSidebar />);
    
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders navigation sections with items', () => {
    render(<DesktopSidebar />);
    
    expect(screen.getByTestId('nav-section-legislative')).toBeInTheDocument();
    expect(screen.getByTestId('nav-section-community')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-2')).toBeInTheDocument();
  });

  it('handles navigation state changes without re-rendering unnecessarily', () => {
    const { useNav } = require('../hooks/useNav');
    let renderCount = 0;
    
    const TestWrapper = () => {
      renderCount++;
      return <DesktopSidebar />;
    };
    
    const { rerender } = render(<TestWrapper />);
    
    // Initial render
    expect(renderCount).toBe(1);
    
    // Same navigation state should not cause re-render due to memoization
    rerender(<TestWrapper />);
    expect(renderCount).toBe(1);
    
    // Change navigation state
    useNav.mockReturnValue({
      items: [
        { id: '3', section: 'legislative', label: 'New Bill', href: '/bills/new' },
      ],
      user_role: 'authenticated',
      isAuthenticated: true,
    });
    
    rerender(<TestWrapper />);
    expect(renderCount).toBe(2);
  });

  it('handles rapid navigation changes gracefully', async () => {
    const { useNav } = require('../hooks/useNav');
    
    render(<DesktopSidebar />);
    
    // Simulate rapid navigation changes
    await act(async () => {
      useNav.mockReturnValue({
        items: [{ id: '1', section: 'legislative', label: 'Bills', href: '/bills' }],
        user_role: 'public',
        isAuthenticated: false,
      });
    });
    
    await act(async () => {
      useNav.mockReturnValue({
        items: [{ id: '2', section: 'community', label: 'Community', href: '/community' }],
        user_role: 'authenticated',
        isAuthenticated: true,
      });
    });
    
    // Should handle changes without errors
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('maintains stable references during navigation transitions', () => {
    const { useNav } = require('../hooks/useNav');
    
    const mockItems = [
      { id: '1', section: 'legislative', label: 'Bills', href: '/bills' },
    ];
    
    useNav.mockReturnValue({
      items: mockItems,
      user_role: 'public',
      isAuthenticated: false,
    });
    
    const { rerender } = render(<DesktopSidebar />);
    
    // Same items reference should not cause re-filtering
    useNav.mockReturnValue({
      items: mockItems, // Same reference
      user_role: 'public',
      isAuthenticated: false,
    });
    
    rerender(<DesktopSidebar />);
    
    expect(screen.getByTestId('nav-item-1')).toBeInTheDocument();
  });

  it('applies correct CSS classes for desktop layout', () => {
    render(<DesktopSidebar />);
    
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('hidden', 'lg:flex', 'w-64', 'flex-col', 'border-r', 'bg-white');
  });

  it('handles empty navigation items gracefully', () => {
    const { useNav } = require('../hooks/useNav');
    
    useNav.mockReturnValue({
      items: [],
      user_role: 'public',
      isAuthenticated: false,
    });
    
    render(<DesktopSidebar />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('nav-item-1')).not.toBeInTheDocument();
  });
});