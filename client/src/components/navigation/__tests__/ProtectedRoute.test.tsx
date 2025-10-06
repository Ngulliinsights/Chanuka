import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ProtectedRoute, useRouteAccess, withRoleProtection } from '../ProtectedRoute';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { UserRole } from '@/types/navigation';

// Mock the hooks
const mockNavigateTo = jest.fn();
const mockUser = { id: '1', email: 'test@example.com', displayName: 'Test User', role: 'citizen' };

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
  })),
}));

jest.mock('@/contexts/NavigationContext', () => ({
  ...jest.requireActual('@/contexts/NavigationContext'),
  useNavigation: jest.fn(() => ({
    userRole: 'citizen' as UserRole,
    navigateTo: mockNavigateTo,
  })),
}));

const TestWrapper: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({ 
  children, 
  initialEntries = ['/'] 
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <NavigationProvider>
      {children}
    </NavigationProvider>
  </MemoryRouter>
);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Requirements', () => {
    it('should render children when user is authenticated and requiresAuth is true', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requiresAuth={true}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should redirect when user is not authenticated and requiresAuth is true', () => {
      // Mock unauthenticated user
      const { useAuth } = require('@/hooks/use-auth');
      useAuth.mockReturnValue({ user: null });

      render(
        <TestWrapper initialEntries={['/protected']}>
          <ProtectedRoute requiresAuth={true}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show access denied page when showAccessDenied is true and user is not authenticated', () => {
      // Mock unauthenticated user
      const { useAuth } = require('@/hooks/use-auth');
      useAuth.mockReturnValue({ user: null });

      render(
        <TestWrapper>
          <ProtectedRoute requiresAuth={true} showAccessDenied={true}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  describe('Role-based Access Control', () => {
    it('should render children when user role is in allowedRoles', () => {
      render(
        <TestWrapper>
          <ProtectedRoute allowedRoles={['citizen', 'expert']}>
            <div>Role Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Role Protected Content')).toBeInTheDocument();
    });

    it('should not render children when user role is not in allowedRoles', () => {
      render(
        <TestWrapper>
          <ProtectedRoute allowedRoles={['admin']} showAccessDenied={true}>
            <div>Admin Only Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    });

    it('should render children when user is admin and adminOnly is true', () => {
      // Mock admin user
      const { useNavigation } = require('@/contexts/NavigationContext');
      useNavigation.mockReturnValue({
        userRole: 'admin' as UserRole,
        navigateTo: mockNavigateTo,
      });

      render(
        <TestWrapper>
          <ProtectedRoute adminOnly={true}>
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should not render children when user is not admin and adminOnly is true', () => {
      render(
        <TestWrapper>
          <ProtectedRoute adminOnly={true} showAccessDenied={true}>
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(screen.getByText('Administrator Access Required')).toBeInTheDocument();
    });
  });

  describe('Custom Conditions', () => {
    it('should render children when custom condition returns true', () => {
      const customCondition = (userRole: UserRole, user: any) => user?.email === 'test@example.com';

      render(
        <TestWrapper>
          <ProtectedRoute condition={customCondition}>
            <div>Custom Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Custom Protected Content')).toBeInTheDocument();
    });

    it('should not render children when custom condition returns false', () => {
      const customCondition = (userRole: UserRole, user: any) => user?.email === 'admin@example.com';

      render(
        <TestWrapper>
          <ProtectedRoute condition={customCondition} showAccessDenied={true}>
            <div>Custom Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.queryByText('Custom Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });
  });

  describe('Fallback Component', () => {
    it('should render fallback component when access is denied', () => {
      const fallback = <div>Custom Fallback</div>;

      render(
        <TestWrapper>
          <ProtectedRoute adminOnly={true} fallback={fallback}>
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('Access Denied Component', () => {
    it('should show sign in button for unauthenticated users', () => {
      // Mock unauthenticated user
      const { useAuth } = require('@/hooks/use-auth');
      useAuth.mockReturnValue({ user: null });

      render(
        <TestWrapper>
          <ProtectedRoute requiresAuth={true} showAccessDenied={true}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      const signInButton = screen.getByText('Sign In');
      expect(signInButton).toBeInTheDocument();

      fireEvent.click(signInButton);
      expect(mockNavigateTo).toHaveBeenCalledWith('/auth?redirect=%2F');
    });

    it('should show go back button', () => {
      // Mock window.history.back
      const mockBack = jest.fn();
      Object.defineProperty(window, 'history', {
        value: { back: mockBack },
        writable: true,
      });

      render(
        <TestWrapper>
          <ProtectedRoute adminOnly={true} showAccessDenied={true}>
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      const goBackButton = screen.getByText('Go Back');
      expect(goBackButton).toBeInTheDocument();

      fireEvent.click(goBackButton);
      expect(mockBack).toHaveBeenCalled();
    });

    it('should show role information for insufficient permissions', () => {
      render(
        <TestWrapper>
          <ProtectedRoute allowedRoles={['admin', 'expert']} showAccessDenied={true}>
            <div>Expert Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Required roles:')).toBeInTheDocument();
      expect(screen.getByText('admin, expert')).toBeInTheDocument();
      expect(screen.getByText('Your role:')).toBeInTheDocument();
      expect(screen.getByText('citizen')).toBeInTheDocument();
    });
  });
});

describe('withRoleProtection HOC', () => {
  it('should wrap component with protection', () => {
    const TestComponent = () => <div>Test Component</div>;
    const ProtectedComponent = withRoleProtection(TestComponent, { adminOnly: true });

    // Mock admin user
    const { useNavigation } = require('@/contexts/NavigationContext');
    useNavigation.mockReturnValue({
      userRole: 'admin' as UserRole,
      navigateTo: mockNavigateTo,
    });

    render(
      <TestWrapper>
        <ProtectedComponent />
      </TestWrapper>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});

describe('useRouteAccess', () => {
  const TestComponent: React.FC = () => {
    const { checkRouteAccess, canAccessRoute, userRole, isAuthenticated } = useRouteAccess();
    
    const adminAccess = checkRouteAccess({ adminOnly: true });
    const authAccess = checkRouteAccess({ requiresAuth: true });
    const canAccessAdmin = canAccessRoute('/admin');
    
    return (
      <div>
        <div data-testid="user-role">{userRole}</div>
        <div data-testid="is-authenticated">{isAuthenticated.toString()}</div>
        <div data-testid="admin-access">{adminAccess.hasAccess.toString()}</div>
        <div data-testid="auth-access">{authAccess.hasAccess.toString()}</div>
        <div data-testid="can-access-admin">{canAccessAdmin.toString()}</div>
      </div>
    );
  };

  it('should return correct access information', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('user-role')).toHaveTextContent('citizen');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('admin-access')).toHaveTextContent('false');
    expect(screen.getByTestId('auth-access')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-admin')).toHaveTextContent('false');
  });

  it('should handle unauthenticated users', () => {
    // Mock unauthenticated user
    const { useAuth } = require('@/hooks/use-auth');
    useAuth.mockReturnValue({ user: null });

    const { useNavigation } = require('@/contexts/NavigationContext');
    useNavigation.mockReturnValue({
      userRole: 'public' as UserRole,
      navigateTo: mockNavigateTo,
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('user-role')).toHaveTextContent('public');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('auth-access')).toHaveTextContent('false');
  });

  it('should handle admin users', () => {
    const { useNavigation } = require('@/contexts/NavigationContext');
    useNavigation.mockReturnValue({
      userRole: 'admin' as UserRole,
      navigateTo: mockNavigateTo,
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('admin-access')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-admin')).toHaveTextContent('true');
  });
});