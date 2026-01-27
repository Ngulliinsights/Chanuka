import * as LucideIcons from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@client/core/auth';
import { Alert, AlertDescription, Button } from '@client/lib/design-system';
import { LoadingStateManager } from '@client/lib/ui/loading/LoadingStates';
import { logger } from '@client/lib/utils/logger';

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
function DefaultUnauthorizedAccess({
  reason,
  requiredRoles,
  currentPath,
}: UnauthorizedAccessProps) {
  const getIcon = () => {
    switch (reason) {
      case 'unauthenticated':
        return <LucideIcons.CheckCircle className="h-12 w-12 text-blue-500" />;
      case 'insufficient_role':
        return <LucideIcons.Shield className="h-12 w-12 text-orange-500" />;
      case 'unverified':
        return <LucideIcons.AlertTriangle className="h-12 w-12 text-yellow-500" />;
      default:
        return <LucideIcons.Lock className="h-12 w-12 text-gray-500" />;
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
        return "You don't have permission to access this page.";
    }
  };

  const getActionButton = () => {
    switch (reason) {
      case 'unauthenticated':
        return (
          <a
            href={`/auth?redirect=${encodeURIComponent(currentPath)}`}
            className="mt-4 inline-block"
          >
            <Button>Sign In</Button>
          </a>
        );
      case 'insufficient_role':
        return (
          <a href="/contact" className="mt-4 inline-block">
            <Button variant="outline">Request Access</Button>
          </a>
        );
      case 'unverified':
        return (
          <a href="/auth/verify" className="mt-4 inline-block">
            <Button>Verify Account</Button>
          </a>
        );
      default:
        return (
          <a href="/" className="mt-4 inline-block">
            <Button variant="outline">Go Home</Button>
          </a>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">{getIcon()}</div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{getTitle()}</h1>

          <p className="text-gray-600 mb-6 leading-relaxed">{getMessage()}</p>

          <div className="flex flex-col space-y-3">
            {getActionButton()}

            <a href="/">
              <Button variant="ghost">Return to Home</Button>
            </a>
          </div>
        </div>

        {/* Additional help information */}
        <Alert className="mt-4">
          <LucideIcons.AlertTriangle className="h-4 w-4" />
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
  customUnauthorizedComponent: CustomUnauthorizedComponent,
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
        userVerified: user?.verification_status === 'verified',
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
    user?.verification_status,
  ]);

  // Show loading state while auth is being checked
  if (loading || !authCheckComplete) {
    return showLoadingState ? (
      <LoadingStateManager
        type="page"
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
      path: location.pathname,
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
    const hasRequiredRole = requireRoles.some(
      role =>
        role.toLowerCase() === userRole ||
        (userRole === 'admin' && role.toLowerCase() !== 'super_admin') // Admin can access most roles except super_admin
    );

    if (!hasRequiredRole) {
      logger.warn('Insufficient role access attempt', {
        component: 'ProtectedRoute',
        path: location.pathname,
        userRole,
        requiredRoles: requireRoles,
      });

      if (CustomUnauthorizedComponent) {
        return (
          <CustomUnauthorizedComponent reason="insufficient_role" requiredRoles={requireRoles} />
        );
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
      verificationStatus: user.verification_status,
    });

    if (CustomUnauthorizedComponent) {
      return <CustomUnauthorizedComponent reason="unverified" />;
    }

    return <DefaultUnauthorizedAccess reason="unverified" currentPath={location.pathname} />;
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
  requireVerification: true,
});

export const ModeratorRoute = createProtectedRoute({
  requireAuth: true,
  requireRoles: ['moderator', 'admin', 'super_admin'],
  requireVerification: true,
});

export const VerifiedUserRoute = createProtectedRoute({
  requireAuth: true,
  requireVerification: true,
});

export const AuthenticatedRoute = createProtectedRoute({
  requireAuth: true,
  requireVerification: false,
});

export default ProtectedRoute;
