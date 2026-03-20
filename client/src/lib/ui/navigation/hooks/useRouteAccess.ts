import { useAuth } from '@client/infrastructure/auth';
import { NavigationValidationError, NavigationAccessDeniedError } from '@client/infrastructure/error';
import { useUnifiedNavigation } from '@client/infrastructure/navigation/hooks/use-unified-navigation';
import { getRecoverySuggestions } from '../recovery';
import { validateNavigationPath, validateUserRole } from '../validation';
import type { UserRole, AccessDenialReason } from '@client/lib/types';

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
  const { userRole } = useUnifiedNavigation();

  try {
    // Validate the path parameter
    validateNavigationPath(path);

    // Use the userRole directly since it's already a UserRole enum
    return checkRouteAccess(path, userRole, user);
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
