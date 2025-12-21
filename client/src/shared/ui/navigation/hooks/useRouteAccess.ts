import type { AccessDenialReason, UserRole } from '@client/types';

import { useUnifiedNavigation } from '@client/core/navigation/hooks/use-unified-navigation';
import { useAuth } from '@client/core/auth';
import { NavigationValidationError, NavigationAccessDeniedError } from '@client/core/error';
import { getRecoverySuggestions, createRecoveryContext } from '@client/recovery';
import { validateNavigationPath, validateUserRole } from '@client/validation';

import { checkRouteAccess } from '../utils/route-access';


export interface UseRouteAccessResult {
  canAccess: boolean;
  denialReason: AccessDenialReason | null;
  requiredRole?: UserRole[];
  error?: NavigationValidationError | NavigationAccessDeniedError;
  recoveryAttempted?: boolean;
  recoverySuggestions?: string[];
}

/**
 * Hook for checking route access permissions
 */
export const useRouteAccess = (path: string): UseRouteAccessResult => {
  const { user } = useAuth();
  const { user_role } = useUnifiedNavigation();

  try {
    // Validate the path parameter
    validateNavigationPath(path);

    // Validate and convert the context UserRole to our navigation UserRole
    const contextRole = user_role as string;
    validateUserRole(contextRole);
    const navUserRole: UserRole = contextRole === 'user' ? 'citizen' : contextRole as UserRole;

    return checkRouteAccess(path, navUserRole, user);
  } catch (error) {
    // Handle validation errors
    if (error instanceof NavigationValidationError || error instanceof NavigationAccessDeniedError) {
      // Get recovery suggestions
      const suggestions = getRecoverySuggestions(error);

      return {
        canAccess: false,
        denialReason: 'custom_condition',
        error,
        recoveryAttempted: false,
        recoverySuggestions: suggestions
      };
    }

    // Handle other errors
    console.error('Error in useRouteAccess:', error);
    return {
      canAccess: false,
      denialReason: 'custom_condition',
      error: error instanceof NavigationAccessDeniedError ? error : undefined
    };
  }
};

