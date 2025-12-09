import { NavigationError, NavigationValidationError, NavigationAccessDeniedError, NavigationConfigurationError } from './errors';

/**
 * Recovery strategies for navigation errors
 */

export interface RecoveryStrategy {
  name: string;
  description: string;
  automatic: boolean;
  action: () => Promise<void>;
}

export interface NavigationRecoveryContext {
  error: NavigationError;
  path?: string;
  user_role?: string;
  user?: any;
  retryCount?: number;
}

/**
 * Default recovery strategies for navigation errors
 */
export const NAVIGATION_RECOVERY_STRATEGIES: Record<string, RecoveryStrategy[]> = {
  [NavigationValidationError.name]: [
    {
      name: 'fallback_to_home',
      description: 'Navigate to home page when path validation fails',
      automatic: true,
      action: async () => {
        // This would typically use a navigation hook or router
        console.log('Recovery: Navigating to home page');
        // window.location.href = '/'; // or use router.push('/')
      }
    },
    {
      name: 'clear_invalid_cache',
      description: 'Clear any cached navigation data that might be invalid',
      automatic: false,
      action: async () => {
        console.log('Recovery: Clearing navigation cache');
        // Clear local storage, session storage, etc.
        localStorage.removeItem('navigation-cache');
        sessionStorage.removeItem('navigation-state');
      }
    }
  ],

  [NavigationAccessDeniedError.name]: [
    {
      name: 'redirect_to_login',
      description: 'Redirect to login page when access is denied due to authentication',
      automatic: true,
      action: async () => {
        console.log('Recovery: Redirecting to login');
        // window.location.href = '/login';
      }
    },
    {
      name: 'show_upgrade_prompt',
      description: 'Show role upgrade prompt when access is denied due to insufficient permissions',
      automatic: false,
      action: async () => {
        console.log('Recovery: Showing upgrade prompt');
        // Show modal or toast with upgrade options
      }
    },
    {
      name: 'navigate_to_allowed_page',
      description: 'Navigate to a page the user has access to',
      automatic: true,
      action: async () => {
        console.log('Recovery: Navigating to allowed page');
        // window.location.href = '/dashboard'; // or user's default page
      }
    }
  ],

  [NavigationConfigurationError.name]: [
    {
      name: 'reload_configuration',
      description: 'Attempt to reload navigation configuration',
      automatic: true,
      action: async () => {
        console.log('Recovery: Reloading navigation configuration');
        // Force reload of navigation config
        window.location.reload();
      }
    },
    {
      name: 'fallback_to_basic_navigation',
      description: 'Use basic navigation fallback when configuration fails',
      automatic: true,
      action: async () => {
        console.log('Recovery: Using basic navigation fallback');
        // Switch to minimal navigation mode
      }
    }
  ]
};

/**
 * Get recovery strategies for a specific error type
 */
export function getRecoveryStrategies(error: NavigationError): RecoveryStrategy[] {
  const strategies = NAVIGATION_RECOVERY_STRATEGIES[error.constructor.name] || [];
  return strategies;
}

/**
 * Execute automatic recovery strategies for an error
 */
export async function executeAutomaticRecovery(
  error: NavigationError,
  context?: NavigationRecoveryContext
): Promise<boolean> {
  const strategies = getRecoveryStrategies(error);
  const automaticStrategies = strategies.filter(s => s.automatic);

  if (automaticStrategies.length === 0) {
    return false;
  }

  for (const strategy of automaticStrategies) {
    try {
      console.log(`Executing recovery strategy: ${strategy.name}`);
      await strategy.action();
      console.log(`Recovery strategy ${strategy.name} completed successfully`);
      return true;
    } catch (recoveryError) {
      console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      // Continue to next strategy
    }
  }

  return false;
}

/**
 * Get user-friendly recovery suggestions
 */
export function getRecoverySuggestions(error: NavigationError): string[] {
  const strategies = getRecoveryStrategies(error);
  const manualStrategies = strategies.filter(s => !s.automatic);

  return manualStrategies.map(s => s.description);
}

/**
 * Create a recovery context for navigation errors
 */
export function createRecoveryContext(
  error: NavigationError,
  path?: string,
  user_role?: string,
  user?: any,
  retryCount = 0
): NavigationRecoveryContext {
  return {
    error,
    path,
    user_role,
    user,
    retryCount
  };
}

/**
 * Enhanced error handler with recovery
 */
export async function handleNavigationErrorWithRecovery(
  error: NavigationError,
  context?: NavigationRecoveryContext
): Promise<{ recovered: boolean; suggestions: string[] }> {
  // First attempt automatic recovery
  const recovered = await executeAutomaticRecovery(error, context);

  if (recovered) {
    return { recovered: true, suggestions: [] };
  }

  // If automatic recovery failed, provide manual suggestions
  const suggestions = getRecoverySuggestions(error);

  return { recovered: false, suggestions };
}

