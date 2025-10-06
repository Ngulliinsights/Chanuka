import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RoleBasedNavigation, useRoleBasedNavigation, NavigationItem } from '../RoleBasedNavigation';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { UserRole } from '@/types/navigation';

// Mock the hooks
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', displayName: 'Test User', role: 'citizen' },
  }),
}));

jest.mock('@/contexts/NavigationContext', () => ({
  ...jest.requireActual('@/contexts/NavigationContext'),
  useNavigation: () => ({
    userRole: 'citizen' as UserRole,
    currentPath: '/dashboard',
    navigateTo: jest.fn(),
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <NavigationProvider>
      {children}
    </NavigationProvider>
  </BrowserRouter>
);

describe('RoleBasedNavigation', () => {
  const mockItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: <div>Home Icon</div>,
      section: 'legislative',
      priority: 1,
    },
    {
      id: 'admin',
      label: 'Admin Panel',
      href: '/admin',
      icon: <div>Admin Icon</div>,
      section: 'admin',
      adminOnly: true,
      priority: 1,
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: <div>Profile Icon</div>,
      section: 'user',
      requiresAuth: true,
      priority: 1,
    },
    {
      id: 'expert',
      label: 'Expert Panel',
      href: '/expert',
      icon: <div>Expert Icon</div>,
      section: 'community',
      allowedRoles: ['expert', 'admin'],
      priority: 1,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role Filtering', () => {
    it('should show items available to citizen role', () => {
      render(
        <TestWrapper>
          <RoleBasedNavigation items={mockItems} />
        </TestWrapper>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
      expect(screen.queryByText('Expert Panel')).not.toBeInTheDocument();
    });

    it('should filter items by section', () => {
      render(
        <TestWrapper>
          <RoleBasedNavigation items={mockItems} section="user" />
        </TestWrapper>
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });

    it('should show admin items for admin role', () => {
      // Mock admin role
      jest.doMock('@/contexts/NavigationContext', () => ({
        ...jest.requireActual('@/contexts/NavigationContext'),
        useNavigation: () => ({
          userRole: 'admin' as UserRole,
          currentPath: '/admin',
          navigateTo: jest.fn(),
        }),
      }));

      render(
        <TestWrapper>
          <RoleBasedNavigation items={mockItems} />
        </TestWrapper>
      );

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  describe('Layout Options', () => {
    it('should render vertical layout by default', () => {
      const { container } = render(
        <TestWrapper>
          <RoleBasedNavigation items={mockItems} />
        </TestWrapper>
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('space-y-1');
    });

    it('should render horizontal layout', () => {
      const { container } = render(
        <TestWrapper>
          <RoleBasedNavigation items={mockItems} layout="horizontal" />
        </TestWrapper>
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('flex', 'flex-wrap', 'gap-2');
    });

    it('should render grid layout', () => {
      const { container } = render(
        <TestWrapper>
          <RoleBasedNavigation items={mockItems} layout="grid" />
        </TestWrapper>
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('grid');
    });
  });

  describe('Badge Display', () => {
    it('should show badges when enabled', () => {
      const itemsWithBadges: NavigationItem[] = [
        {
          ...mockItems[0],
          badge: 5,
        },
      ];

      render(
        <TestWrapper>
          <RoleBasedNavigation items={itemsWithBadges} showBadges={true} />
        </TestWrapper>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should hide badges when disabled', () => {
      const itemsWithBadges: NavigationItem[] = [
        {
          ...mockItems[0],
          badge: 5,
        },
      ];

      render(
        <TestWrapper>
          <RoleBasedNavigation items={itemsWithBadges} showBadges={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });
  });

  describe('Description Display', () => {
    it('should show descriptions when enabled', () => {
      const itemsWithDescriptions: NavigationItem[] = [
        {
          ...mockItems[0],
          description: 'Home page description',
        },
      ];

      render(
        <TestWrapper>
          <RoleBasedNavigation items={itemsWithDescriptions} showDescriptions={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Home page description')).toBeInTheDocument();
    });

    it('should hide descriptions when disabled', () => {
      const itemsWithDescriptions: NavigationItem[] = [
        {
          ...mockItems[0],
          description: 'Home page description',
        },
      ];

      render(
        <TestWrapper>
          <RoleBasedNavigation items={itemsWithDescriptions} showDescriptions={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Home page description')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Handling', () => {
    it('should call onNavigate when provided', () => {
      const mockOnNavigate = jest.fn();

      render(
        <TestWrapper>
          <RoleBasedNavigation items={mockItems} onNavigate={mockOnNavigate} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Home'));
      expect(mockOnNavigate).toHaveBeenCalledWith(mockItems[0]);
    });

    it('should use default navigation when onNavigate not provided', () => {
      const mockNavigateTo = jest.fn();
      
      jest.doMock('@/contexts/NavigationContext', () => ({
        ...jest.requireActual('@/contexts/NavigationContext'),
        useNavigation: () => ({
          userRole: 'citizen' as UserRole,
          currentPath: '/dashboard',
          navigateTo: mockNavigateTo,
        }),
      }));

      render(
        <TestWrapper>
          <RoleBasedNavigation items={mockItems} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Home'));
      expect(mockNavigateTo).toHaveBeenCalledWith('/');
    });
  });

  describe('Empty State', () => {
    it('should render nothing when no items are visible', () => {
      const adminOnlyItems: NavigationItem[] = [
        {
          id: 'admin',
          label: 'Admin Panel',
          href: '/admin',
          icon: <div>Admin Icon</div>,
          section: 'admin',
          adminOnly: true,
          priority: 1,
        },
      ];

      const { container } = render(
        <TestWrapper>
          <RoleBasedNavigation items={adminOnlyItems} />
        </TestWrapper>
      );

      expect(container.firstChild).toBeNull();
    });
  });
});

describe('useRoleBasedNavigation', () => {
  const TestComponent: React.FC = () => {
    const { getNavigationItems, getItemsBySection, getAvailableSections } = useRoleBasedNavigation();
    
    const items = getNavigationItems();
    const userItems = getItemsBySection('user');
    const sections = getAvailableSections();

    return (
      <div>
        <div data-testid="total-items">{items.length}</div>
        <div data-testid="user-items">{userItems.length}</div>
        <div data-testid="sections">{sections.join(',')}</div>
      </div>
    );
  };

  it('should return filtered navigation items', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Should have items available to citizen role
    expect(screen.getByTestId('total-items')).toHaveTextContent(/\d+/);
    expect(screen.getByTestId('user-items')).toHaveTextContent(/\d+/);
    expect(screen.getByTestId('sections')).toHaveTextContent(/legislative|community|user|tools/);
  });
});

describe('Custom Conditions', () => {
  it('should respect custom condition function', () => {
    const itemsWithCondition: NavigationItem[] = [
      {
        id: 'conditional',
        label: 'Conditional Item',
        href: '/conditional',
        icon: <div>Conditional Icon</div>,
        section: 'user',
        condition: (userRole, user) => user?.email === 'admin@example.com',
        priority: 1,
      },
    ];

    render(
      <TestWrapper>
        <RoleBasedNavigation items={itemsWithCondition} />
      </TestWrapper>
    );

    // Should not show because condition is not met
    expect(screen.queryByText('Conditional Item')).not.toBeInTheDocument();
  });
});

describe('Priority Sorting', () => {
  it('should sort items by priority', () => {
    const unsortedItems: NavigationItem[] = [
      {
        id: 'third',
        label: 'Third Item',
        href: '/third',
        icon: <div>Third Icon</div>,
        section: 'legislative',
        priority: 3,
      },
      {
        id: 'first',
        label: 'First Item',
        href: '/first',
        icon: <div>First Icon</div>,
        section: 'legislative',
        priority: 1,
      },
      {
        id: 'second',
        label: 'Second Item',
        href: '/second',
        icon: <div>Second Icon</div>,
        section: 'legislative',
        priority: 2,
      },
    ];

    render(
      <TestWrapper>
        <RoleBasedNavigation items={unsortedItems} />
      </TestWrapper>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('First Item');
    expect(buttons[1]).toHaveTextContent('Second Item');
    expect(buttons[2]).toHaveTextContent('Third Item');
  });
});