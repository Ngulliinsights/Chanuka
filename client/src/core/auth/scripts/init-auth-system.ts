/**
 * Auth System Initialization Script
 *
 * Provides a simple way to initialize the consolidated auth system
 * in your application with environment-specific configurations.
 *
 * @module init-auth-system
 */

import { logger } from '@client/utils/logger';

import type { UnifiedApiClient } from '../../api/types';
import { initializeAuth, getAuthSystemStatus, type AuthInitOptions } from '../config/auth-init';

// ==========================================================================
// Types
// ==========================================================================

type Environment = 'development' | 'test' | 'production';

interface AuthSystemValidation {
  isInitialized: boolean;
  errors: string[];
  warnings: string[];
}

interface InitCallbacks {
  onInitialized?: (success: boolean) => void;
  onError?: (error: Error) => void;
}

// ==========================================================================
// Default Configuration by Environment
// ==========================================================================

/**
 * Default initialization options for different environments
 */
const DEFAULT_INIT_OPTIONS: Record<Environment, Partial<AuthInitOptions>> = {
  development: {
    enableAutoInit: true,
    enableTokenValidation: true,
    enableSessionRestore: true,
    settings: {
      security: {
        enableMonitoring: false,
        enableAutoRefresh: true,
        enableSessionValidation: true,
        maxFailedAttempts: 10,
        lockoutDuration: 900000, // 15 minutes
      },
      validation: {
        password: {
          minLength: 6,
          strongMinLength: 8,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
        },
        email: {
          maxLength: 254,
        },
        name: {
          minLength: 2,
          maxLength: 50,
        },
      },
    },
  },
  test: {
    enableAutoInit: false,
    enableTokenValidation: false,
    enableSessionRestore: false,
    settings: {
      api: {
        baseUrl: '/api',
        authEndpoint: '/auth',
        timeout: 5000,
      },
      security: {
        enableMonitoring: false,
        enableAutoRefresh: false,
        enableSessionValidation: false,
        maxFailedAttempts: 3,
        lockoutDuration: 600000, // 10 minutes
      },
    },
  },
  production: {
    enableAutoInit: true,
    enableTokenValidation: true,
    enableSessionRestore: true,
    settings: {
      security: {
        enableMonitoring: true,
        enableAutoRefresh: true,
        enableSessionValidation: true,
        maxFailedAttempts: 3,
        lockoutDuration: 1800000, // 30 minutes
      },
      validation: {
        password: {
          minLength: 10,
          strongMinLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
        email: {
          maxLength: 254,
        },
        name: {
          minLength: 2,
          maxLength: 50,
        },
      },
    },
  },
};

// ==========================================================================
// Core Initialization Functions
// ==========================================================================

/**
 * Initialize auth system with environment-specific defaults
 *
 * @param apiClient - The unified API client instance
 * @param environment - Current environment (development, test, production)
 * @param customOptions - Optional custom configuration overrides
 */
export async function initAuthSystem(
  apiClient: UnifiedApiClient,
  environment: Environment = (process.env.NODE_ENV as Environment) || 'development',
  customOptions: Partial<AuthInitOptions> = {}
): Promise<void> {
  try {
    logger.info('Initializing consolidated auth system', {
      component: 'AuthInit',
      environment,
    });

    // Get environment-specific defaults
    const envDefaults = DEFAULT_INIT_OPTIONS[environment] || DEFAULT_INIT_OPTIONS.development;

    // Deep merge settings
    const mergedSettings = {
      ...envDefaults.settings,
      ...customOptions.settings,
      security: {
        enableMonitoring: customOptions.settings?.security?.enableMonitoring ?? envDefaults.settings?.security?.enableMonitoring ?? false,
        enableAutoRefresh: customOptions.settings?.security?.enableAutoRefresh ?? envDefaults.settings?.security?.enableAutoRefresh ?? true,
        enableSessionValidation: customOptions.settings?.security?.enableSessionValidation ?? envDefaults.settings?.security?.enableSessionValidation ?? true,
        maxFailedAttempts: customOptions.settings?.security?.maxFailedAttempts ?? envDefaults.settings?.security?.maxFailedAttempts ?? 3,
        lockoutDuration: customOptions.settings?.security?.lockoutDuration ?? envDefaults.settings?.security?.lockoutDuration ?? 900000,
      },
      validation: {
        password: customOptions.settings?.validation?.password ?? envDefaults.settings?.validation?.password ?? { minLength: 6, strongMinLength: 8, requireUppercase: false, requireLowercase: true, requireNumbers: true, requireSpecialChars: false },
        email: customOptions.settings?.validation?.email ?? envDefaults.settings?.validation?.email ?? { maxLength: 254 },
        name: customOptions.settings?.validation?.name ?? envDefaults.settings?.validation?.name ?? { minLength: 2, maxLength: 50 },
      },
    };

    // Merge options
    const initOptions: AuthInitOptions = {
      apiClient,
      environment,
      ...envDefaults,
      ...customOptions,
      settings: mergedSettings,
    };

    // Initialize the auth system
    await initializeAuth(initOptions);

    // Get and log system status
    const status = getAuthSystemStatus();
    logger.info('Auth system initialized successfully', {
      component: 'AuthInit',
      environment,
      status,
      features: Object.keys(mergedSettings),
    });

    // Call success callback if provided
    if (customOptions.onInitialized) {
      customOptions.onInitialized(true);
    }
  } catch (error) {
    logger.error('Failed to initialize auth system', {
      component: 'AuthInit',
      environment,
      error,
    });

    // Call error callback if provided
    if (customOptions.onError && error instanceof Error) {
      customOptions.onError(error);
    }

    throw error;
  }
}

/**
 * Quick setup for React applications with sensible defaults
 *
 * @param apiClient - The unified API client instance
 * @param callbacks - Optional initialization callbacks
 */
export async function setupAuthForReact(
  apiClient: UnifiedApiClient,
  callbacks?: InitCallbacks
): Promise<void> {
  const environment = (process.env.NODE_ENV as Environment) || 'development';

  await initAuthSystem(apiClient, environment, {
    onInitialized: (success) => {
      if (success) {
        logger.info('Auth system ready for React app', {
          component: 'AuthInit',
        });
      } else {
        logger.error('Auth system initialization failed', {
          component: 'AuthInit',
        });
      }
      callbacks?.onInitialized?.(success);
    },
    onError: (error) => {
      logger.error('Auth initialization error', {
        component: 'AuthInit',
        error: error.message,
      });
      callbacks?.onError?.(error);
    },
  });
}

/**
 * Setup for testing environments with minimal configuration
 *
 * @param mockApiClient - Mock API client for testing
 */
export async function setupAuthForTesting(mockApiClient: UnifiedApiClient): Promise<void> {
  await initAuthSystem(mockApiClient, 'test', {
    enableAutoInit: false,
    enableTokenValidation: false,
    enableSessionRestore: false,
  });
}

// ==========================================================================
// Validation Functions
// ==========================================================================

/**
 * Validate auth system is properly initialized and configured
 *
 * @returns Validation result with initialization status and any errors/warnings
 */
export async function validateAuthSetup(): Promise<AuthSystemValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Dynamically import auth module to check exports
    const authModule = await import('../index');

    // Check required exports
    const requiredExports = [
      'useAuth',
      'AuthProvider',
      'authReducer',
      'authMiddleware',
      'AuthApiService',
      'tokenManager',
      'sessionManager',
    ];

    for (const exportName of requiredExports) {
      if (!(exportName in authModule)) {
        errors.push(`Missing required export: ${exportName}`);
      }
    }

    // Check if system is initialized
    const status = getAuthSystemStatus();

    if (!status.isInitialized) {
      warnings.push('Auth system not yet initialized. Call initAuthSystem() in your app startup.');
    }

    if (!status.hasApiService) {
      errors.push('Auth API service not configured');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    errors.push(`Failed to validate auth setup: ${errorMessage}`);
  }

  return {
    isInitialized: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if auth system is ready for use
 *
 * @returns Boolean indicating if system is fully initialized
 */
export function isAuthSystemReady(): boolean {
  const status = getAuthSystemStatus();
  return status.isInitialized && status.hasApiService;
}

// ==========================================================================
// Usage Examples
// ==========================================================================

/**
 * Example usage patterns for different application types
 */
export const USAGE_EXAMPLES = {
  react: `
// In your main App.tsx or index.tsx
import { initAuthSystem } from '@/core/auth/scripts/init-auth-system';
import { globalApiClient } from '@/core/api';

// Initialize auth system
await initAuthSystem(globalApiClient);

// Wrap your app with AuthProvider
import { AuthProvider } from '@/core/auth';

function App() {
  return (
    <AuthProvider>
      <YourAppContent />
    </AuthProvider>
  );
}
`,

  redux: `
// In your store configuration
import { authReducer, authMiddleware } from '@/core/auth';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // ... other reducers
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authMiddleware),
});
`,

  testing: `
// In your test setup
import { setupAuthForTesting } from '@/core/auth/scripts/init-auth-system';
import { mockApiClient } from '@/test-utils';

beforeAll(async () => {
  await setupAuthForTesting(mockApiClient);
});
`,

  nextjs: `
// In your _app.tsx
import { initAuthSystem } from '@/core/auth/scripts/init-auth-system';
import { apiClient } from '@/core/api';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    initAuthSystem(apiClient).catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
`,
} as const;

// ==========================================================================
// Default Export
// ==========================================================================

export default {
  initAuthSystem,
  setupAuthForReact,
  setupAuthForTesting,
  validateAuthSetup,
  isAuthSystemReady,
  USAGE_EXAMPLES,
  DEFAULT_INIT_OPTIONS,
};
