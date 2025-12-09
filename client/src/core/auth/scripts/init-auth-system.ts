/**
 * Auth System Initialization Script
 * 
 * Provides a simple way to initialize the consolidated auth system
 * in your application.
 */

import { initializeAuth, type AuthInitOptions } from '../config/auth-init';
import { createAuthConfig } from '../config/auth-config';
import { logger } from '../../../utils/logger';

/**
 * Default initialization options for different environments
 */
const DEFAULT_INIT_OPTIONS = {
  development: {
    enableAutoInit: true,
    enableTokenValidation: true,
    enableSessionRestore: true,
    settings: {
      security: {
        enableMonitoring: false,
        maxFailedAttempts: 10,
      },
      validation: {
        password: {
          minLength: 6,
          strongMinLength: 8,
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
        timeout: 5000,
      },
      security: {
        enableMonitoring: false,
        enableAutoRefresh: false,
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
        maxFailedAttempts: 3,
        lockoutDuration: 30,
      },
      validation: {
        password: {
          minLength: 10,
          strongMinLength: 14,
        },
      },
    },
  },
} as const;

/**
 * Initialize auth system with environment-specific defaults
 */
export async function initAuthSystem(
  apiClient: any,
  environment: string = process.env.NODE_ENV || 'development',
  customOptions: Partial<AuthInitOptions> = {}
): Promise<void> {
  try {
    logger.info('Initializing consolidated auth system', {
      component: 'AuthInit',
      environment
    });

    // Get environment-specific defaults
    const envDefaults = DEFAULT_INIT_OPTIONS[environment as keyof typeof DEFAULT_INIT_OPTIONS] || DEFAULT_INIT_OPTIONS.development;

    // Merge options
    const initOptions: AuthInitOptions = {
      apiClient,
      environment,
      ...envDefaults,
      ...customOptions,
      settings: {
        ...envDefaults.settings,
        ...customOptions.settings,
      },
    };

    // Initialize the auth system
    await initializeAuth(initOptions);

    logger.info('Auth system initialized successfully', {
      component: 'AuthInit',
      environment,
      features: Object.keys(initOptions.settings || {})
    });

  } catch (error) {
    logger.error('Failed to initialize auth system', {
      component: 'AuthInit',
      environment,
      error
    });
    throw error;
  }
}

/**
 * Quick setup for React applications
 */
export async function setupAuthForReact(apiClient: any): Promise<void> {
  const environment = process.env.NODE_ENV || 'development';
  
  await initAuthSystem(apiClient, environment, {
    onInitialized: (success) => {
      if (success) {
        logger.info('Auth system ready for React app', {
          component: 'AuthInit'
        });
      } else {
        logger.error('Auth system initialization failed', {
          component: 'AuthInit'
        });
      }
    },
    onError: (error) => {
      logger.error('Auth initialization error', {
        component: 'AuthInit',
        error: error.message
      });
    }
  });
}

/**
 * Setup for testing environments
 */
export async function setupAuthForTesting(mockApiClient: any): Promise<void> {
  await initAuthSystem(mockApiClient, 'test', {
    enableAutoInit: false,
    enableTokenValidation: false,
    enableSessionRestore: false,
  });
}

/**
 * Validate auth system is properly initialized
 */
export function validateAuthSetup(): {
  isInitialized: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Try to import the auth module
    const authModule = require('../index');
    
    // Check required exports
    const requiredExports = [
      'useAuth',
      'AuthProvider',
      'authReducer',
      'authMiddleware',
      'AuthApiService',
      'tokenManager',
      'sessionManager'
    ];

    for (const exportName of requiredExports) {
      if (!authModule[exportName]) {
        errors.push(`Missing required export: ${exportName}`);
      }
    }

    // Check if system is initialized
    const { getAuthSystemStatus } = require('../config/auth-init');
    const status = getAuthSystemStatus();
    
    if (!status.isInitialized) {
      warnings.push('Auth system not yet initialized. Call initAuthSystem() in your app startup.');
    }

    if (!status.hasApiService) {
      errors.push('Auth API service not configured');
    }

  } catch (error) {
    errors.push(`Failed to validate auth setup: ${error}`);
  }

  return {
    isInitialized: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Example usage for different app types
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
`
};

export default {
  initAuthSystem,
  setupAuthForReact,
  setupAuthForTesting,
  validateAuthSetup,
  USAGE_EXAMPLES,
  DEFAULT_INIT_OPTIONS
};