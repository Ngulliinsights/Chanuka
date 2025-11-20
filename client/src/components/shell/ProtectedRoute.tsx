import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@client/features/users/hooks/useAuth';
import { LoadingStateManager } from '../loading/LoadingStates';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Shield, Lock, UserX, AlertTriangle } from 'lucide-react';
import { logger } from '@client/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRoles?: string[];
  requireVerification?: boolean;
  fallbackPath?: string;
  showLoadingState?: boolean;
  customUnauthorizedComponent?: React.ComponentType<{
    reason: 'unauthenticated' | 'insufficient_role' | 'unverified';
    requiredRoles?: string[];
  }>;
}

interface UnauthorizedAccessProps {
  reason: 'unauthenticated' | 'insufficient_role' | 'unverified';
  requiredRoles?: string[];
  currentPath: string;
}

/**
 * Default unauthorized access component
 * Provides user-friendly messaging for different access denial reasons
 */
function DefaultUnauthorizedAccess({ reason, requiredRoles, currentPath }: UnauthorizedAccessProps) {
  const getIcon = () => {
    switch (reason) {
      case 'unauthenticated':
        return <UserX className="h-12 w-12 text-blue-500" />;
      case 'insufficient_role':
        return <Shield className="h-12 w-12 text-orange-500" />;
      case 'unverified':
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
      default:
        return <Lock className="h-12 w-12 text-gray-500" />;
    }
  };

  const getTitle = () => {
    switch (reason) {
      case 'unauthenticated':
        return 'Authentication Required';
      case 'insufficient_role':
        return 'Insufficient Permissions';
      case 'unverified':
        return 'Account Verification Required';
      default:
        return 'Access Denied';
    }
  };

  const getMessage = () => {
    switch (reason) {
      case 'unauthenticated':
        return 'You need to sign in to access this page. Please log in with your Chanuka account to continue.';
      case 'insufficient_role':
        return `This page requires ${requiredRoles?.join(' or ')} permissions. Your current account doesn't have the necessary access level.`;
      case 'unverified':
        return 'Your account needs to be verified before you can access this feature. Please check your email for verification instructions.';
      default:
        return 'You don\'t have permission to access this page.';
    }
  };

  const getActionButton = () => {
    switch (reason) {
      case 'unauthenticated':
        return (
          <Button asChild className="mt-4">
            <a href={`/auth?redirect=${encodeURIComponent(currentPath)}`}>
              Sign In
            </a>
          </Button>
        );
      case 'insufficient_role':
        return (
          <Button variant="outline" asChild className="mt-4">
            <a href="/contact">
              Request Access
            </a>
          </Button>
        );
      case 'unverified':
        return (
          <Button asChild className="mt-4">
            <a href="/auth/verify">
              Verify Account
            </a>
          </Button>
        );
      default:
        return (
          <Button variant="outline" asChild className="mt-4">
            <a href="/">
              Go Home
            </a>
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {getTitle()}
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            {getMessage()}
          </p>

          <div className="flex flex-col space-y-3">
            {getActionButton()}
            
            <Button variant="ghost" asChild>
              <a href="/">
                Return to Home
              </a>
            </Button>
          </div>
        </div>

        {/* Additional help information */}
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            If you believe this is an error, please contact our support team for assistance.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute component handles authentication and authorization for routes
 * 
 * Features:
 * - Authentication checking
 * - Role-based access control
 * - Account verification requirements
 * - Loading states during auth checks
 * - Customizable unauthorized access handling
 * - Automatic redirect preservation
 * - Comprehensive error handling
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  requireRoles = [],
  requireVerification = false,
  fallbackPath = '/auth',
  showLoadingState = true,
  customUnauthorizedComponent: CustomUnauthorizedComponent
}: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Wait for auth check to complete
  useEffect(() => {
    if (!loading) {
      setAuthCheckComplete(true);
    }
  }, [loading]);

  // Log access attempts for security monitoring
  useEffect(() => {
    if (authCheckComplete) {
      logger.info('Protected route access attempt', {
        component: 'ProtectedRoute',
        path: location.pathname,
        requireAuth,
        requireRoles,
        requireVerification,
        isAuthenticated,
        userRole: user?.role,
        userVerified: user?.verification_status === 'verified'
      });
    }
  }, [
    authCheckComplete,
    location.pathname,
    requireAuth,
    requireRoles,
    requireVerification,
    isAuthenticated,
    user?.role,
    user?.verification_status
  ]);

  // Show loading state while auth is being checked
  if (loading || !authCheckComplete) {
    return showLoadingState ? (
      <LoadingStateManager
        type="auth"
        state="loading"
        message="Checking authentication..."
        className="min-h-screen"
        showDetails={false}
      />
    ) : null;
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    logger.warn('Unauthenticated access attempt to protected route', {
      component: 'ProtectedRoute',
      path: location.pathname
    });

    if (CustomUnauthorizedComponent) {
      return <CustomUnauthorizedComponent reason="unauthenticated" />;
    }

    // Redirect to auth with return path
    const redirectPath = `${fallbackPath}?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectPath} replace />;
  }

  // Check role requirements
  if (requireRoles.length > 0 && user) {
    const userRole = user.role?.toLowerCase();
    const hasRequiredRole = requireRoles.some(role => 
      role.toLowerCase() === userRole || 
      (userRole === 'admin' && role.toLowerCase() !== 'super_admin') // Admin can access most roles except super_admin
    );

    if (!hasRequiredRole) {
      logger.warn('Insufficient role access attempt', {
        component: 'ProtectedRoute',
        path: location.pathname,
        userRole,
        requiredRoles: requireRoles
      });

      if (CustomUnauthorizedComponent) {
        return <CustomUnauthorizedComponent reason="insufficient_role" requiredRoles={requireRoles} />;
      }

      return (
        <DefaultUnauthorizedAccess
          reason="insufficient_role"
          requiredRoles={requireRoles}
          currentPath={location.pathname}
        />
      );
    }
  }

  // Check verification requirement
  if (requireVerification && user && user.verification_status !== 'verified') {
    logger.warn('Unverified account access attempt', {
      component: 'ProtectedRoute',
      path: location.pathname,
      verificationStatus: user.verification_status
    });

    if (CustomUnauthorizedComponent) {
      return <CustomUnauthorizedComponent reason="unverified" />;
    }

    return (
      <DefaultUnauthorizedAccess
        reason="unverified"
        currentPath={location.pathname}
      />
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}

/**
 * Higher-order component for creating protected routes with specific requirements
 */
export function createProtectedRoute(defaultProps: Partial<ProtectedRouteProps>) {
  return function ProtectedRouteWrapper(props: ProtectedRouteProps) {
    return <ProtectedRoute {...defaultProps} {...props} />;
  };
}

/**
 * Pre-configured protected route components for common use cases
 */
export const AdminRoute = createProtectedRoute({
  requireAuth: true,
  requireRoles: ['admin', 'super_admin'],
  requireVerification: true
});

export const ModeratorRoute = createProtectedRoute({
  requireAuth: true,
  requireRoles: ['moderator', 'admin', 'super_admin'],
  requireVerification: true
});

export const VerifiedUserRoute = createProtectedRoute({
  requireAuth: true,
  requireVerification: true
});

export const AuthenticatedRoute = createProtectedRoute({
  requireAuth: true,
  requireVerification: false
});

export default ProtectedRoute;