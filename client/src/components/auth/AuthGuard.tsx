/**
 * Authentication Route Guard
 * Protects routes based on authentication status and user permissions
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { rbacManager, usePermission, useMinimumRole } from '../../utils/rbac';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Shield, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { logger } from '../../utils/logger';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: string;
  requirePermission?: {
    resource: string;
    action: string;
    conditions?: Record<string, any>;
  };
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

interface AccessDeniedProps {
  reason: string;
  requiredRole?: string;
  requiredPermission?: string;
  onRetry?: () => void;
}

function AccessDenied({ reason, requiredRole, requiredPermission, onRetry }: AccessDeniedProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this page
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Reason:</strong> {reason}
            {requiredRole && (
              <div className="mt-2">
                <strong>Required Role:</strong> {requiredRole}
              </div>
            )}
            {requiredPermission && (
              <div className="mt-2">
                <strong>Required Permission:</strong> {requiredPermission}
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Check Permissions Again
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Return to Home
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({
  children,
  requireAuth = true,
  requireRole,
  requirePermission,
  fallbackPath = '/auth/login',
  showAccessDenied = true
}: AuthGuardProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const [permissionCheck, setPermissionCheck] = useState<{
    loading: boolean;
    hasAccess: boolean;
    reason?: string;
  }>({ loading: true, hasAccess: false });

  // Use permission hook if permission is required
  const { hasPermission: hasRequiredPermission, loading: permissionLoading } = usePermission(
    requirePermission?.resource || '',
    requirePermission?.action || '',
    requirePermission?.conditions
  );

  // Use role hook if role is required
  const hasRequiredRole = useMinimumRole(requireRole || '');

  useEffect(() => {
    checkAccess();
  }, [user, isAuthenticated, hasRequiredPermission, hasRequiredRole, permissionLoading]);

  const checkAccess = async () => {
    try {
      setPermissionCheck({ loading: true, hasAccess: false });

      // If authentication is not required, allow access
      if (!requireAuth) {
        setPermissionCheck({ loading: false, hasAccess: true });
        return;
      }

      // Check authentication
      if (!isAuthenticated || !user) {
        setPermissionCheck({ 
          loading: false, 
          hasAccess: false, 
          reason: 'Authentication required' 
        });
        return;
      }

      // Check role requirement
      if (requireRole && !hasRequiredRole) {
        setPermissionCheck({ 
          loading: false, 
          hasAccess: false, 
          reason: `Minimum role required: ${requireRole}` 
        });
        return;
      }

      // Check permission requirement
      if (requirePermission) {
        if (permissionLoading) {
          return; // Still loading permission check
        }

        if (!hasRequiredPermission) {
          setPermissionCheck({ 
            loading: false, 
            hasAccess: false, 
            reason: `Permission required: ${requirePermission.action} on ${requirePermission.resource}` 
          });
          return;
        }
      }

      // All checks passed
      setPermissionCheck({ loading: false, hasAccess: true });

      logger.debug('Access granted', {
        component: 'AuthGuard',
        path: location.pathname,
        userId: user.id,
        role: user.role,
        requireRole,
        requirePermission
      });

    } catch (error) {
      logger.error('Access check failed:', { component: 'AuthGuard' }, error);
      setPermissionCheck({ 
        loading: false, 
        hasAccess: false, 
        reason: 'Access check failed' 
      });
    }
  };

  const handleRetry = () => {
    checkAccess();
  };

  // Show loading spinner while checking authentication or permissions
  if (authLoading || permissionCheck.loading || (requirePermission && permissionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-600">
            Checking access permissions...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    logger.info('Redirecting to login - authentication required', {
      component: 'AuthGuard',
      path: location.pathname,
      fallbackPath
    });

    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Show access denied if user doesn't have required permissions
  if (!permissionCheck.hasAccess) {
    if (showAccessDenied) {
      return (
        <AccessDenied
          reason={permissionCheck.reason || 'Access denied'}
          requiredRole={requireRole}
          requiredPermission={requirePermission ? 
            `${requirePermission.action} on ${requirePermission.resource}` : 
            undefined
          }
          onRetry={handleRetry}
        />
      );
    } else {
      // Redirect to fallback path
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Access granted - render children
  return <>{children}</>;
}

// Convenience components for common use cases
export function RequireAuth({ children, fallbackPath }: { 
  children: React.ReactNode; 
  fallbackPath?: string; 
}) {
  return (
    <AuthGuard requireAuth={true} fallbackPath={fallbackPath}>
      {children}
    </AuthGuard>
  );
}

export function RequireRole({ 
  children, 
  role, 
  fallbackPath 
}: { 
  children: React.ReactNode; 
  role: string; 
  fallbackPath?: string; 
}) {
  return (
    <AuthGuard requireAuth={true} requireRole={role} fallbackPath={fallbackPath}>
      {children}
    </AuthGuard>
  );
}

export function RequirePermission({ 
  children, 
  resource, 
  action, 
  conditions, 
  fallbackPath 
}: { 
  children: React.ReactNode; 
  resource: string; 
  action: string; 
  conditions?: Record<string, any>; 
  fallbackPath?: string; 
}) {
  return (
    <AuthGuard 
      requireAuth={true} 
      requirePermission={{ resource, action, conditions }} 
      fallbackPath={fallbackPath}
    >
      {children}
    </AuthGuard>
  );
}

// Admin guard
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="admin">
      {children}
    </RequireRole>
  );
}

// Moderator guard
export function RequireModerator({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="moderator">
      {children}
    </RequireRole>
  );
}

// Expert guard
export function RequireExpert({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="expert">
      {children}
    </RequireRole>
  );
}