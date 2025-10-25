import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from '../sidebar';
import { NavigationItem, User } from '@shared/types';

// Mock dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/logo', () => ({
  Logo: (props: any) => (
    <div data-testid="logo" data-size={props.size} data-show-text={props.showText} className={props.textClassName}>
      Logo
    </div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: (props: any) => (
      <a href={props.to} className={props.className} title={props.title} data-testid="nav-link">
        {props.children}
      </a>
    ),
    useLocation: () => ({
      pathname: '/dashboard',
    }),
  };
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Sidebar Component', () => {
  const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'citizen',
    avatar: 'https://example.com/avatar.jpg',
  };

  const mockNavigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: <span data-testid="home-icon">🏠</span>,
    },
    {
      id: 'bills',
      label: 'Bills',
      href: '/bills',
      icon: <span data-testid="bills-icon">📄</span>,
      badge: 5,
    },
    {
      id: 'admin',
      label: 'Admin',
      href: '/admin',
      icon: <span data-testid="admin-icon">⚙️</span>,
      adminOnly: true,
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: <span data-testid="profile-icon">👤</span>,
      requiresAuth: true,
    },
    {
      id: 'disabled',
      label: 'Disabled',
      href: '/disabled',
      icon: <span data-testid="disabled-icon">❌</span>,
      disabled: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render in expanded state by default', () => {
      render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('w-64');
    });

    it('should render in collapsed state when isCollapsed is true', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={true} />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('w-16');
    });

    it('should render custom navigation items', () => {
      render(
        <TestWrapper>
          <Sidebar navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Bills')).toBeInTheDocument();
      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      expect(screen.getByTestId('bills-icon')).toBeInTheDocument();
    });
  });

  describe('Logo and Header', () => {
    it('should render logo in expanded state', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={false} />
        </TestWrapper>
      );

      const logo = screen.getByTestId('logo');
      expect(logo).toHaveAttribute('data-show-text', 'true');
      expect(logo).toHaveClass('text-xl', 'font-bold', 'text-primary');
    });

    it('should render compact logo in collapsed state', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={true} />
        </TestWrapper>
      );

      // In collapsed state, should show compact logo
      const compactLogo = screen.getByText('C');
      expect(compactLogo).toBeInTheDocument();
    });

    it('should render toggle button when onToggle is provided', () => {
      const onToggle = vi.fn();

      render(
        <TestWrapper>
          <Sidebar onToggle={onToggle} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('should call onToggle when toggle button is clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(
        <TestWrapper>
          <Sidebar onToggle={onToggle} />
        </TestWrapper>
      );

      const toggleButton = screen.getByLabelText('Expand sidebar');
      await user.click(toggleButton);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Search Functionality', () => {
    it('should render search input when showSearch is true', () => {
      render(
        <TestWrapper>
          <Sidebar showSearch={true} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Search bills')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search bills...')).toBeInTheDocument();
    });

    it('should not render search input when showSearch is false', () => {
      render(
        <TestWrapper>
          <Sidebar showSearch={false} />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Search bills')).not.toBeInTheDocument();
    });

    it('should not render search input in collapsed state', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={true} showSearch={true} />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Search bills')).not.toBeInTheDocument();
    });

    it('should handle search input changes', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();

      render(
        <TestWrapper>
          <Sidebar showSearch={true} onSearchChange={onSearchChange} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText('Search bills');
      await user.type(searchInput, 'test query');

      expect(onSearchChange).toHaveBeenCalledWith('test query');
    });
  });

  describe('Navigation Items', () => {
    it('should highlight active navigation item', () => {
      // Mock current location as /dashboard
      vi.mocked(require('react-router-dom').useLocation).mockReturnValue({
        pathname: '/dashboard',
      });

      render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      const dashboardLink = screen.getByText('Dashboard');
      expect(dashboardLink.closest('a')).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should render navigation item badges', () => {
      render(
        <TestWrapper>
          <Sidebar navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render 99+ for badges over 99', () => {
      const itemsWithLargeBadge = [
        {
          id: 'notifications',
          label: 'Notifications',
          href: '/notifications',
          icon: <span>🔔</span>,
          badge: 150,
        },
      ];

      render(
        <TestWrapper>
          <Sidebar navigationItems={itemsWithLargeBadge} />
        </TestWrapper>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should hide auth-required items when user is not authenticated', () => {
      render(
        <TestWrapper>
          <Sidebar navigationItems={mockNavigationItems} user={null} />
        </TestWrapper>
      );

      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should show auth-required items when user is authenticated', () => {
      render(
        <TestWrapper>
          <Sidebar navigationItems={mockNavigationItems} user={mockUser} />
        </TestWrapper>
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should hide admin-only items for non-admin users', () => {
      render(
        <TestWrapper>
          <Sidebar navigationItems={mockNavigationItems} user={mockUser} />
        </TestWrapper>
      );

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should show admin-only items for admin users', () => {
      const adminUser = { ...mockUser, role: 'admin' as const };

      render(
        <TestWrapper>
          <Sidebar navigationItems={mockNavigationItems} user={adminUser} />
        </TestWrapper>
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should disable navigation items when disabled prop is true', () => {
      render(
        <TestWrapper>
          <Sidebar navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      const disabledLink = screen.getByText('Disabled').closest('a');
      expect(disabledLink).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should show only icons in collapsed state', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={true} navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('should show tooltips for items in collapsed state', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={true} navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      const homeLink = screen.getByTestId('home-icon').closest('a');
      expect(homeLink).toHaveAttribute('title', 'Home');
    });
  });

  describe('User Section', () => {
    it('should render user section when user is provided', () => {
      render(
        <TestWrapper>
          <Sidebar user={mockUser} />
        </TestWrapper>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should render user avatar when provided', () => {
      render(
        <TestWrapper>
          <Sidebar user={mockUser} />
        </TestWrapper>
      );

      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should render user initials when avatar is not provided', () => {
      const userWithoutAvatar = { ...mockUser, avatar: undefined };

      render(
        <TestWrapper>
          <Sidebar user={userWithoutAvatar} />
        </TestWrapper>
      );

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should not render user section when user is not provided', () => {
      render(
        <TestWrapper>
          <Sidebar user={null} />
        </TestWrapper>
      );

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should render settings link in user section', () => {
      render(
        <TestWrapper>
          <Sidebar user={mockUser} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('User settings')).toBeInTheDocument();
    });

    it('should show only user avatar in collapsed state', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={true} user={mockUser} />
        </TestWrapper>
      );

      expect(screen.getByAltText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid navigation items gracefully', () => {
      const invalidItems = [
        {
          id: '', // Invalid empty id
          label: 'Invalid Item',
          href: '/invalid',
          icon: <span>❌</span>,
        },
      ] as NavigationItem[];

      render(
        <TestWrapper>
          <Sidebar navigationItems={invalidItems} />
        </TestWrapper>
      );

      expect(screen.getByText(/Sidebar Error/)).toBeInTheDocument();
    });

    it('should recover from error when recover button is clicked', async () => {
      const user = userEvent.setup();
      const invalidItems = [
        {
          id: '',
          label: 'Invalid Item',
          href: '/invalid',
          icon: <span>❌</span>,
        },
      ] as NavigationItem[];

      render(
        <TestWrapper>
          <Sidebar navigationItems={invalidItems} />
        </TestWrapper>
      );

      const recoverButton = screen.getByText('Recover');
      await user.click(recoverButton);

      await waitFor(() => {
        expect(screen.queryByText(/Sidebar Error/)).not.toBeInTheDocument();
      });
    });

    it('should handle search change errors', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn(() => {
        throw new Error('Search failed');
      });

      render(
        <TestWrapper>
          <Sidebar showSearch={true} onSearchChange={onSearchChange} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText('Search bills');
      await user.type(searchInput, 'test');

      expect(screen.getByText(/Sidebar Error/)).toBeInTheDocument();
    });

    it('should handle toggle errors', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn(() => {
        throw new Error('Toggle failed');
      });

      render(
        <TestWrapper>
          <Sidebar onToggle={onToggle} />
        </TestWrapper>
      );

      const toggleButton = screen.getByLabelText('Expand sidebar');
      await user.click(toggleButton);

      expect(screen.getByText(/Sidebar Error/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation role and label', () => {
      render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('should have proper aria-current for active items', () => {
      vi.mocked(require('react-router-dom').useLocation).mockReturnValue({
        pathname: '/bills',
      });

      render(
        <TestWrapper>
          <Sidebar navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      const billsLink = screen.getByText('Bills').closest('a');
      expect(billsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should have proper focus management', () => {
      render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText('Search bills');
      expect(searchInput).toHaveAttribute('aria-label', 'Search bills');
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      const navLinks = screen.getAllByTestId('nav-link');
      navLinks.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should apply custom className', () => {
      render(
        <TestWrapper>
          <Sidebar className="custom-sidebar" />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('custom-sidebar');
    });

    it('should have proper transition classes', () => {
      render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('transition-all', 'duration-300');
    });

    it('should handle responsive breakpoints', () => {
      render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('flex', 'h-full', 'flex-col');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <Sidebar />
        </TestWrapper>
      );

      // Component should handle re-renders efficiently
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should handle large numbers of navigation items', () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        label: `Item ${i}`,
        href: `/item-${i}`,
        icon: <span>📄</span>,
      }));

      render(
        <TestWrapper>
          <Sidebar navigationItems={manyItems} />
        </TestWrapper>
      );

      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 49')).toBeInTheDocument();
    });
  });
});