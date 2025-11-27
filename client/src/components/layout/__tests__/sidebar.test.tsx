import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '@client/sidebar';

// Mock dependencies
jest.mock('../../../lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('../ui/logo', () => ({
  Logo: ({ size, showText, textClassName }: any) => (
    <div data-testid="logo" data-size={size} data-show-text={showText} className={textClassName}>
      Logo
    </div>
  ),
}));

jest.mock('lucide-react', () => ({
  Building: () => <span data-testid="building-icon">Building</span>,
  BarChart3: () => <span data-testid="barchart-icon">BarChart3</span>,
  FileText: () => <span data-testid="filetext-icon">FileText</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  HelpCircle: () => <span data-testid="help-icon">HelpCircle</span>,
  MessageSquare: () => <span data-testid="message-icon">MessageSquare</span>,
  Shield: () => <span data-testid="shield-icon">Shield</span>,
  TrendingUp: () => <span data-testid="trending-icon">TrendingUp</span>,
  User: () => <span data-testid="user-icon">User</span>,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Sidebar', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'avatar.jpg',
    role: 'user',
  };

  const customNavigationItems = [
    { id: 'home', label: 'Home', href: '/', icon: <span>HomeIcon</span> },
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <span>DashboardIcon</span> },
  ];

  it('renders with default navigation items', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
  });

  it('renders with custom navigation items', () => {
    renderWithRouter(<Sidebar navigationItems={customNavigationItems} />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Bills')).not.toBeInTheDocument();
  });

  it('renders in collapsed state', () => {
    renderWithRouter(<Sidebar isCollapsed={true} />);

    const sidebar = screen.getByTestId('logo').closest('div');
    expect(sidebar).toHaveClass('w-16');
  });

  it('renders in expanded state', () => {
    renderWithRouter(<Sidebar isCollapsed={false} />);

    const sidebar = screen.getByTestId('logo').closest('div');
    expect(sidebar).toHaveClass('w-64');
  });

  it('shows toggle button when onToggle is provided', () => {
    const mockOnToggle = jest.fn();
    renderWithRouter(<Sidebar onToggle={mockOnToggle} />);

    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', () => {
    const mockOnToggle = jest.fn();
    renderWithRouter(<Sidebar onToggle={mockOnToggle} />);

    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(toggleButton);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('shows search input when showSearch is true and not collapsed', () => {
    renderWithRouter(<Sidebar showSearch={true} isCollapsed={false} />);

    expect(screen.getByPlaceholderText('Search bills...')).toBeInTheDocument();
  });

  it('hides search input when collapsed', () => {
    renderWithRouter(<Sidebar showSearch={true} isCollapsed={true} />);

    expect(screen.queryByPlaceholderText('Search bills...')).not.toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', () => {
    const mockOnSearchChange = jest.fn();
    renderWithRouter(<Sidebar onSearchChange={mockOnSearchChange} />);

    const searchInput = screen.getByPlaceholderText('Search bills...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(mockOnSearchChange).toHaveBeenCalledWith('test query');
  });

  it('renders user section when user is provided', () => {
    renderWithRouter(<Sidebar user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('does not render user section when no user', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('shows user avatar when provided', () => {
    renderWithRouter(<Sidebar user={mockUser} />);

    const avatar = screen.getByAltText('John Doe');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'avatar.jpg');
  });

  it('shows user initials when no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined };
    renderWithRouter(<Sidebar user={userWithoutAvatar} />);

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('applies active class to current route', () => {
    // Mock useLocation to return '/dashboard'
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useLocation: () => ({ pathname: '/dashboard' }),
    }));

    renderWithRouter(<Sidebar />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-primary');
  });

  it('filters navigation items based on auth requirements', () => {
    const authRequiredItems = [
      { id: 'home', label: 'Home', href: '/', icon: <span>Home</span> },
      { id: 'admin', label: 'Admin', href: '/admin', icon: <span>Admin</span>, requiresAuth: true },
    ];

    renderWithRouter(<Sidebar navigationItems={authRequiredItems} />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('filters admin-only items for non-admin users', () => {
    const adminItems = [
      { id: 'home', label: 'Home', href: '/', icon: <span>Home</span> },
      { id: 'admin', label: 'Admin', href: '/admin', icon: <span>Admin</span>, adminOnly: true },
    ];

    renderWithRouter(<Sidebar navigationItems={adminItems} user={mockUser} />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('shows admin items for admin users', () => {
    const adminUser = { ...mockUser, role: 'admin' };
    const adminItems = [
      { id: 'home', label: 'Home', href: '/', icon: <span>Home</span> },
      { id: 'admin', label: 'Admin', href: '/admin', icon: <span>Admin</span>, adminOnly: true },
    ];

    renderWithRouter(<Sidebar navigationItems={adminItems} user={adminUser} />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows badge for navigation items with badge count', () => {
    const itemsWithBadge = [
      { id: 'home', label: 'Home', href: '/', icon: <span>Home</span>, badge: 5 },
    ];

    renderWithRouter(<Sidebar navigationItems={itemsWithBadge} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 99+ for badge count over 99', () => {
    const itemsWithBadge = [
      { id: 'home', label: 'Home', href: '/', icon: <span>Home</span>, badge: 150 },
    ];

    renderWithRouter(<Sidebar navigationItems={itemsWithBadge} />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('applies disabled styling for disabled items', () => {
    const disabledItems = [
      { id: 'home', label: 'Home', href: '/', icon: <span>Home</span>, disabled: true },
    ];

    renderWithRouter(<Sidebar navigationItems={disabledItems} />);

    const link = screen.getByText('Home').closest('a');
    expect(link).toHaveClass('opacity-50');
    expect(link).toHaveClass('cursor-not-allowed');
  });

  it('handles navigation item validation errors', () => {
    const invalidItems = [
      { id: '', label: 'Invalid', href: '/', icon: <span>Icon</span> }, // Invalid id
    ];

    renderWithRouter(<Sidebar navigationItems={invalidItems} />);

    expect(screen.getByText('Sidebar Error:')).toBeInTheDocument();
  });

  it('recovers from error state', () => {
    const invalidItems = [
      { id: '', label: 'Invalid', href: '/', icon: <span>Icon</span> },
    ];

    renderWithRouter(<Sidebar navigationItems={invalidItems} />);

    const recoverButton = screen.getByRole('button', { name: /recover/i });
    fireEvent.click(recoverButton);

    expect(screen.queryByText('Sidebar Error:')).not.toBeInTheDocument();
  });

  it('handles search change errors', () => {
    const mockOnSearchChange = jest.fn(() => {
      throw new Error('Search error');
    });

    renderWithRouter(<Sidebar onSearchChange={mockOnSearchChange} />);

    const searchInput = screen.getByPlaceholderText('Search bills...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(screen.getByText('Sidebar Error:')).toBeInTheDocument();
  });

  it('handles toggle errors', () => {
    const mockOnToggle = jest.fn(() => {
      throw new Error('Toggle error');
    });

    renderWithRouter(<Sidebar onToggle={mockOnToggle} />);

    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText('Sidebar Error:')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithRouter(<Sidebar className="custom-sidebar" />);

    const sidebar = screen.getByTestId('logo').closest('div');
    expect(sidebar).toHaveClass('custom-sidebar');
  });

  it('has proper ARIA attributes', () => {
    renderWithRouter(<Sidebar />);

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeInTheDocument();

    const searchInput = screen.getByLabelText('Search bills');
    expect(searchInput).toBeInTheDocument();
  });

  it('shows title attribute for collapsed items', () => {
    renderWithRouter(<Sidebar isCollapsed={true} />);

    const homeLink = screen.getByTitle('Home');
    expect(homeLink).toBeInTheDocument();
  });

  it('renders user settings link', () => {
    renderWithRouter(<Sidebar user={mockUser} />);

    const settingsLink = screen.getByLabelText('User settings');
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/profile');
  });

  it('handles runtime render errors', () => {
    // Mock a component that throws
    jest.mock('../ui/logo', () => ({
      Logo: () => {
        throw new Error('Logo render error');
      },
    }));

    expect(() => {
      renderWithRouter(<Sidebar />);
    }).toThrow();
  });
});
