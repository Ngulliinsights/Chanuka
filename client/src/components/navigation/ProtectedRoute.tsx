import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useNavigation } from '@/contexts/NavigationContext';
import { UserRole } from '@/types/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, Shield, UserX } from 'lucide-react';
// FIX: Use default import for 'logger.js'
import logger from '../utils/logger.js';
// OPTIMIZATION: Use path alias for consistency
import { navigationService } from '@/services/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Authentication requirements
  requiresAuth?: boolean;
  // Role-based access control
  allowedRoles?: UserRole[];
  adminOnly?: boolean;
  // Custom access condition
  condition?: (userRole: UserRole, user: any) => boolean;
  // Redirect options
  redirectTo?: string;
  // Fallback component
  fallback?: React.ReactNode;
  // Show access denied message instead of redirecting
  showAccessDenied?: boolean;
}

// REFACTOR: Create a specific type for denial reasons for better type safety
type AccessDenialReason = 'unauthenticated' | 'insufficient_role' | 'admin_required' | 'custom_condition';

interface AccessDeniedProps {
  // REFACTOR: Use the specific AccessDenialReason type
  reason: AccessDenialReason;
  allowedRoles?: UserRole[];
  currentRole?: UserRole;
  onSignIn?: () => void;
  onGoBack?: () => void;
}

/**
 * Access denied component with different messages based on the reason
 */
const AccessDenied: React.FC<AccessDeniedProps> = ({
  reason,
  allowedRoles,
  currentRole,
  onSignIn,
  onGoBack
}) => {
  const getIcon = () => {
    switch (reason) {
      case 'unauthenticated':
        return <UserX className="h-8 w-8 text-blue-500" />;
      case 'admin_required':
        return <Shield className="h-8 w-8 text-red-500" />;
      default:
        return <Lock className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getTitle = () => {
    switch (reason) {
      case 'unauthenticated':
        return 'Authentication Required';
      case 'admin_required':
        return 'Administrator Access Required';
      case 'insufficient_role':
        return 'Insufficient Permissions';
      case 'custom_condition':
        return 'Access Restricted';
      default:
        return 'Access Denied';
    }
  };

  const getMessage = () => {
    switch (reason) {
      case 'unauthenticated':
        return 'You need to sign in to access this page. Please log in with your account to continue.';
      case 'admin_required':
        return 'This page is restricted to administrators only. If you believe you should have access, please contact your system administrator.';
      case 'insufficient_role':
        return `This page requires ${allowedRoles?.join(' or ')} access. Your current role (${currentRole}) does not have sufficient permissions.`;
      case 'custom_condition':
        return 'You do not meet the requirements to access this page. Please check with your administrator if you believe this is an error.';
      default:
        return 'You do not have permission to access this page.';
    }
  };

  const getActions = () => {
    // FIX: Explicitly type 'actions' array to hold React nodes
    const actions: React.ReactNode[] = [];

    if (reason === 'unauthenticated' && onSignIn) {
      actions.push(
        <Button key="signin" onClick={onSignIn} className="mr-2">
          Sign In
        </Button>
      );
    }

    if (onGoBack) {
      actions.push(
        <Button key="back" variant="outline" onClick={onGoBack}>
          Go Back
        </Button>
      );
    }

    return actions;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100">
            {getIcon()}
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {getTitle()}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getMessage()}
          </p>
        </div>

        {reason === 'insufficient_role' && allowedRoles && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Required roles:</strong> {allowedRoles.join(', ')}
              <br />
              <strong>Your role:</strong> {currentRole || 'None'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center space-x-2">
          {getActions()}
        </div>
      </div>
    </div>
  );
};

/**
 * Protected route component that handles role-based access control
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiresAuth = false,
  allowedRoles,
  adminOnly = false,
  condition,
  redirectTo,
  fallback,
  showAccessDenied = false
}) => {
  const { user } = useAuth();
  // FIX: Alias userRole from context to resolve type conflict
  const { userRole: contextUserRole, navigateTo } = useNavigation();
  // FIX: Cast the aliased role to the UserRole type expected by this component's props
  const userRole = contextUserRole as UserRole;
  const location = useLocation();

  /**
   * Check if user has access to the route
   */
  // REFACTOR: Use the specific AccessDenialReason type for the return value
  const checkAccess = (): { hasAccess: boolean; reason?: AccessDenialReason } => {
    // Check authentication requirement
    if (requiresAuth && !user) {
      return { hasAccess: false, reason: 'unauthenticated' };
    }

    // Check admin-only requirement
    if (adminOnly && userRole !== 'admin') {
      return { hasAccess: false, reason: 'admin_required' };
    }

    // Check allowed roles
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return { hasAccess: false, reason: 'insufficient_role' };
    }

    // Check custom condition
    if (condition && !condition(userRole, user)) {
      return { hasAccess: false, reason: 'custom_condition' };
    }

    return { hasAccess: true };
  };

  const { hasAccess, reason } = checkAccess();

  // If user has access, render the protected content
  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle access denied cases
  const handleSignIn = () => {
    navigateTo(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
  };

  const handleGoBack = () => {
    navigationService.goBack();
  };

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show access denied page instead of redirecting
  if (showAccessDenied) {
    return (
      <AccessDenied
        // REFACTOR: Use 'reason!' - we know it's defined if hasAccess is false
        reason={reason!}
        allowedRoles={allowedRoles}
        currentRole={userRole}
        onSignIn={reason === 'unauthenticated' ? handleSignIn : undefined}
        onGoBack={handleGoBack}
      />
    );
  }

  // Redirect to specified route or default routes based on the reason
  const getRedirectPath = (): string => {
    if (redirectTo) {
      return redirectTo;
    }

    switch (reason) {
      case 'unauthenticated':
        return `/auth?redirect=${encodeURIComponent(location.pathname)}`;
      case 'admin_required':
      case 'insufficient_role':
      case 'custom_condition':
        return '/'; // Redirect to home for permission issues
      default:
        return '/';
    }
  };

  return <Navigate to={getRedirectPath()} replace />;
};

/**
 * Higher-order component for protecting routes
 */
export const withRoleProtection = (
  Component: React.ComponentType<any>,
  protectionConfig: Omit<ProtectedRouteProps, 'children'>
) => {
  return (props: any) => (
    <ProtectedRoute {...protectionConfig}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

/**
 * Hook for checking route access programmatically
 */
export const useRouteAccess = () => {
  const { user } = useAuth();
  // FIX: Alias userRole from context to resolve type conflict
  const { userRole: contextUserRole } = useNavigation();
  // FIX: Cast the aliased role to the UserRole type expected by this component's props
  const userRole = contextUserRole as UserRole;

  const checkRouteAccess = (config: {
    requiresAuth?: boolean;
    allowedRoles?: UserRole[];
    adminOnly?: boolean;
    condition?: (userRole: UserRole, user: any) => boolean;
    // REFACTOR: Use the specific AccessDenialReason type for the return value
  }): { hasAccess: boolean; reason?: AccessDenialReason } => {
    // Check authentication requirement
    if (config.requiresAuth && !user) {
      return { hasAccess: false, reason: 'unauthenticated' };
    }

    // Check admin-only requirement
    if (config.adminOnly && userRole !== 'admin') {
      return { hasAccess: false, reason: 'admin_required' };
    }

    // Check allowed roles
    if (config.allowedRoles && !config.allowedRoles.includes(userRole)) {
      return { hasAccess: false, reason: 'insufficient_role' };
    }

    // Check custom condition
    if (config.condition && !config.condition(userRole, user)) {
      return { hasAccess: false, reason: 'custom_condition' };
    }

    return { hasAccess: true };
  };

  const canAccessRoute = (path: string): boolean => {
    // Define route access rules (this could be moved to a configuration file)
    const routeRules: Record<string, any> = {
      '/admin': { adminOnly: true },
      '/admin/*': { adminOnly: true },
      '/database-manager': { adminOnly: true },
      '/dashboard': { requiresAuth: true },
      '/profile': { requiresAuth: true },
      '/user-profile': { allowedRoles: ['citizen', 'expert', 'admin', 'journalist', 'advocate'] },
      '/expert-verification': { allowedRoles: ['expert', 'admin'] },
      '/bill-tracking': { requiresAuth: true },
      '/notifications': { requiresAuth: true },
      '/comments': { requiresAuth: true }
    };

    // Find matching rule
    const rule = routeRules[path] || routeRules[`${path}/*`];
    if (!rule) {
      return true; // No restrictions
    }

    return checkRouteAccess(rule).hasAccess;
  };

  return {
    checkRouteAccess,
    canAccessRoute,
    userRole,
    isAuthenticated: !!user
  };
};

export default ProtectedRoute;