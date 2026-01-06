import { useAuth } from '@/core/auth';
import { NavigationValidationError, NavigationAccessDeniedError } from '@/core/error';
import { useUnifiedNavigation } from '@/core/navigation/hooks/use-unified-navigation';
import { getRecoverySuggestions } from '@/recovery';
import type { UserRole } from '@/shared/types';
import { validateNavigationPath, validateUserRole } from '@/validation';

import type { AccessDenialReason } from '../types';
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
    const navUserRole: UserRole = contextRole === 'user' ? 'citizen' : (contextRole as UserRole);

    return checkRouteAccess(path, navUserRole, user as any);
  } catch (error) {
    // Handle validation errors
    if (
      error instanceof NavigationValidationError ||
      error instanceof NavigationAccessDeniedError
    ) {
      // Get recovery suggestions
      const suggestions = getRecoverySuggestions(error);

      return {
        canAccess: false,
        denialReason: 'custom_condition',
        error,
        recoveryAttempted: false,
        recoverySuggestions: suggestions,
      };
    }

    // Handle other errors
    console.error('Error in useRouteAccess:', error);
    return {
      canAccess: false,
      denialReason: 'custom_condition',
      error: error instanceof NavigationAccessDeniedError ? error : undefined,
    };
  }
};
