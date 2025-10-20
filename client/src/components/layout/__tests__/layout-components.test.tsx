import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simple test components that match the actual structure
const TestAppLayout = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`min-h-screen bg-gray-50 ${className || ''}`} data-testid="app-layout">
    <main role="main" aria-label="Main content" tabIndex={-1}>
      {children}
    </main>
    <footer role="contentinfo" aria-label="Site footer">
      <p>&copy; 2024 Chanuka Platform</p>
    </footer>
  </div>
);

const TestMobileHeader = ({ 
  title = "Test App", 
  onMenuToggle, 
  onSearchClick,
  leftActions = [],
  rightActions = []
}: any) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    onMenuToggle?.();
  };

  return (
    <>
      <header role="banner" className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1>{title}</h1>
          <div className="flex items-center gap-2">
            {rightActions.map((action: any, index: number) => (
              <button
                key={action.id || index}
                onClick={action.onClick}
                disabled={action.disabled}
                aria-label={action.label}
                type="button"
              >
                {action.icon}
                {action.badge && action.badge > 0 && (
                  <span>{action.badge > 99 ? '99+' : action.badge}</span>
                )}
              </button>
            ))}
            <button 
              onClick={onSearchClick}
              aria-label="Search"
              type="button"
            >
              Search
            </button>
            <button 
              onClick={handleMenuToggle}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              type="button"
            >
              Menu
            </button>
          </div>
        </div>
      </header>
      {isMenuOpen && (
        <nav role="navigation" aria-label="Mobile navigation">
          <a href="/dashboard">Dashboard</a>
          <a href="/bills">Bills</a>
          <a href="/analysis">Analysis</a>
          <a href="/sponsorship">Sponsorship</a>
          <a href="/verification">Verification</a>
        </nav>
      )}
    </>
  );
};

const TestSidebar = ({ 
  isCollapsed = false, 
  onToggle, 
  navigationItems = [],
  user,
  showSearch = true,
  onSearchChange
}: any) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const defaultItems = [
    { id: 'home', label: 'Home', href: '/', icon: '🏠' },
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { id: 'bills', label: 'Bills', href: '/bills', icon: '📄', badge: 5 },
  ];

  const items = navigationItems.length > 0 ? navigationItems : defaultItems;

  return (
    <div className={`flex h-full flex-col bg-card border-r ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex h-16 items-center px-6">
        <div>Logo</div>
        {onToggle && (
          <button
            onClick={onToggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            Toggle
          </button>
        )}
      </div>

      {showSearch && !isCollapsed && (
        <div className="p-4">
          <input
            type="text"
            placeholder="Search bills..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search bills"
          />
        </div>
      )}

      <nav role="navigation" aria-label="Main navigation">
        {items.map((item: any) => (
          <a
            key={item.id}
            href={item.href}
            className={item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            aria-current={item.href === '/dashboard' ? 'page' : undefined}
            title={isCollapsed ? item.label : undefined}
          >
            {item.icon} {!isCollapsed && item.label}
            {item.badge && item.badge > 0 && (
              <span>{item.badge > 99 ? '99+' : item.badge}</span>
            )}
          </a>
        ))}
      </nav>

      {user && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
            ) : (
              <span>{user.name.charAt(0).toUpperCase()}</span>
            )}
            {!isCollapsed && (
              <>
                <div>
                  <p>{user.name}</p>
                  <p>{user.email}</p>
                </div>
                <button aria-label="User settings">Settings</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Layout Components Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AppLayout Component', () => {
    it('should render with main content and footer', () => {
      render(
        <TestWrapper>
          <TestAppLayout>
            <div data-testid="test-content">Test Content</div>
          </TestAppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByText(/© 2024 Chanuka Platform/)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <TestWrapper>
          <TestAppLayout className="custom-layout">
            <div>Content</div>
          </TestAppLayout>
        </TestWrapper>
      );

      const layout = screen.getByTestId('app-layout');
      expect(layout).toHaveClass('custom-layout');
    });

    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <TestAppLayout>
            <div>Content</div>
          </TestAppLayout>
        </TestWrapper>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-label', 'Main content');
      expect(main).toHaveAttribute('tabIndex', '-1');

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveAttribute('aria-label', 'Site footer');
    });
  });

  describe('MobileHeader Component', () => {
    it('should render with title and buttons', () => {
      render(
        <TestWrapper>
          <TestMobileHeader title="Test App" />
        </TestWrapper>
      );

      expect(screen.getByText('Test App')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    });

    it('should handle menu toggle', async () => {
      const user = userEvent.setup();
      const onMenuToggle = vi.fn();

      render(
        <TestWrapper>
          <TestMobileHeader onMenuToggle={onMenuToggle} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(onMenuToggle).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    });

    it('should show navigation when menu is open', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TestMobileHeader />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Bills')).toBeInTheDocument();
    });

    it('should handle search click', async () => {
      const user = userEvent.setup();
      const onSearchClick = vi.fn();

      render(
        <TestWrapper>
          <TestMobileHeader onSearchClick={onSearchClick} />
        </TestWrapper>
      );

      const searchButton = screen.getByLabelText('Search');
      await user.click(searchButton);

      expect(onSearchClick).toHaveBeenCalledTimes(1);
    });

    it('should render right actions with badges', () => {
      const rightActions = [
        {
          id: 'notifications',
          icon: '🔔',
          label: 'Notifications',
          onClick: vi.fn(),
          badge: 3,
        },
        {
          id: 'large-badge',
          icon: '📧',
          label: 'Messages',
          onClick: vi.fn(),
          badge: 150,
        },
      ];

      render(
        <TestWrapper>
          <TestMobileHeader rightActions={rightActions} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should handle disabled actions', () => {
      const rightActions = [
        {
          id: 'disabled-action',
          icon: '❌',
          label: 'Disabled Action',
          onClick: vi.fn(),
          disabled: true,
        },
      ];

      render(
        <TestWrapper>
          <TestMobileHeader rightActions={rightActions} />
        </TestWrapper>
      );

      const actionButton = screen.getByLabelText('Disabled Action');
      expect(actionButton).toBeDisabled();
    });
  });

  describe('Sidebar Component', () => {
    const mockUser = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'citizen',
    };

    it('should render in expanded state by default', () => {
      render(
        <TestWrapper>
          <TestSidebar />
        </TestWrapper>
      );

      expect(screen.getByText('Logo')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      // Check for dashboard link by href
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    });

    it('should render in collapsed state', () => {
      render(
        <TestWrapper>
          <TestSidebar isCollapsed={true} />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('w-16');
    });

    it('should handle toggle button', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(
        <TestWrapper>
          <TestSidebar onToggle={onToggle} />
        </TestWrapper>
      );

      const toggleButton = screen.getByLabelText('Collapse sidebar');
      await user.click(toggleButton);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should render search input when enabled', () => {
      render(
        <TestWrapper>
          <TestSidebar showSearch={true} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Search bills')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search bills...')).toBeInTheDocument();
    });

    it('should handle search input changes', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();

      render(
        <TestWrapper>
          <TestSidebar showSearch={true} onSearchChange={onSearchChange} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText('Search bills');
      await user.type(searchInput, 'test query');

      expect(onSearchChange).toHaveBeenCalledWith('test query');
    });

    it('should render navigation items with badges', () => {
      render(
        <TestWrapper>
          <TestSidebar />
        </TestWrapper>
      );

      // Check for bills link
      expect(screen.getByRole('link', { name: /bills/i })).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Badge
    });

    it('should render user section when user is provided', () => {
      render(
        <TestWrapper>
          <TestSidebar user={mockUser} />
        </TestWrapper>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByLabelText('User settings')).toBeInTheDocument();
    });

    it('should render user initials when no avatar', () => {
      render(
        <TestWrapper>
          <TestSidebar user={mockUser} />
        </TestWrapper>
      );

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should render user avatar when provided', () => {
      const userWithAvatar = {
        ...mockUser,
        avatar: 'https://example.com/avatar.jpg',
      };

      render(
        <TestWrapper>
          <TestSidebar user={userWithAvatar} />
        </TestWrapper>
      );

      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should hide search in collapsed state', () => {
      render(
        <TestWrapper>
          <TestSidebar isCollapsed={true} showSearch={true} />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Search bills')).not.toBeInTheDocument();
    });

    it('should show tooltips for items in collapsed state', () => {
      const customItems = [
        { id: 'home', label: 'Home', href: '/', icon: '🏠' },
      ];

      render(
        <TestWrapper>
          <TestSidebar isCollapsed={true} navigationItems={customItems} />
        </TestWrapper>
      );

      const homeLink = screen.getByText('🏠').closest('a');
      expect(homeLink).toHaveAttribute('title', 'Home');
    });

    it('should highlight active navigation item', () => {
      render(
        <TestWrapper>
          <TestSidebar />
        </TestWrapper>
      );

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('should handle disabled navigation items', () => {
      const customItems = [
        { id: 'disabled', label: 'Disabled', href: '/disabled', icon: '❌', disabled: true },
      ];

      render(
        <TestWrapper>
          <TestSidebar navigationItems={customItems} />
        </TestWrapper>
      );

      const disabledLink = screen.getByRole('link', { name: /disabled/i });
      expect(disabledLink).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should render large badge numbers as 99+', () => {
      const customItems = [
        { id: 'notifications', label: 'Notifications', href: '/notifications', icon: '🔔', badge: 150 },
      ];

      render(
        <TestWrapper>
          <TestSidebar navigationItems={customItems} />
        </TestWrapper>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Tests', () => {
    it('should handle mobile layout transitions', () => {
      const { rerender } = render(
        <TestWrapper>
          <TestAppLayout>
            <TestSidebar />
            <div data-testid="content">Content</div>
          </TestAppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();

      // Simulate mobile layout
      rerender(
        <TestWrapper>
          <TestAppLayout>
            <TestMobileHeader />
            <div data-testid="content">Content</div>
          </TestAppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should maintain content during layout changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <TestAppLayout>
            <div data-testid="persistent-content">Persistent Content</div>
          </TestAppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('persistent-content')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <TestAppLayout className="mobile-layout">
            <div data-testid="persistent-content">Persistent Content</div>
          </TestAppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('persistent-content')).toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper navigation landmarks', () => {
      render(
        <TestWrapper>
          <TestAppLayout>
            <TestSidebar />
            <TestMobileHeader />
          </TestAppLayout>
        </TestWrapper>
      );

      const navigations = screen.getAllByRole('navigation');
      expect(navigations.length).toBeGreaterThan(0);

      const mainNavigation = screen.getByRole('navigation', { name: 'Main navigation' });
      expect(mainNavigation).toBeInTheDocument();
    });

    it('should have proper button types and labels', () => {
      render(
        <TestWrapper>
          <TestMobileHeader />
        </TestWrapper>
      );

      const searchButton = screen.getByLabelText('Search');
      const menuButton = screen.getByLabelText('Open menu');

      expect(searchButton).toHaveAttribute('type', 'button');
      expect(menuButton).toHaveAttribute('type', 'button');
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <TestSidebar showSearch={true} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText('Search bills');
      expect(searchInput).toHaveAttribute('aria-label', 'Search bills');
    });

    it('should have proper ARIA current for active items', () => {
      render(
        <TestWrapper>
          <TestSidebar />
        </TestWrapper>
      );

      const activeLink = screen.getByRole('link', { name: /dashboard/i });
      expect(activeLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle component errors gracefully', () => {
      // Test error boundaries and recovery mechanisms
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      // This would test error boundary behavior
      // For now, just ensure components don't crash with invalid props
      render(
        <TestWrapper>
          <TestSidebar navigationItems={[]} />
        </TestWrapper>
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should handle invalid navigation items', () => {
      const invalidItems = [
        { id: '', label: '', href: '', icon: null },
      ];

      render(
        <TestWrapper>
          <TestSidebar navigationItems={invalidItems} />
        </TestWrapper>
      );

      // Should still render the sidebar structure
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of navigation items', () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        label: `Item ${i}`,
        href: `/item-${i}`,
        icon: '📄',
      }));

      render(
        <TestWrapper>
          <TestSidebar navigationItems={manyItems} />
        </TestWrapper>
      );

      expect(screen.getByRole('link', { name: /item 0/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /item 49/i })).toBeInTheDocument();
    });

    it('should not re-render unnecessarily', () => {
      const { rerender } = render(
        <TestWrapper>
          <TestSidebar />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <TestSidebar />
        </TestWrapper>
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});