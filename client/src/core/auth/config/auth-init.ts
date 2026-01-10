/**
 * Authentication Initialization
 *
 * Centralized initialization for the entire authentication system
 */

import { logger } from '@client/shared/utils/logger';

import type { UnifiedApiClient } from '../../api/types';
import { createError } from '../../error';
import { ErrorDomain, ErrorSeverity } from '../../error/constants';
import { AuthApiService, setAuthApiService } from '../services/auth-api-service';
import { sessionManager } from '../services/session-manager';
import { tokenManager } from '../services/token-manager';

import { createAuthConfig, validateAuthConfig, type AuthSettings } from './auth-config';
/**
 * Authentication initialization options
 */
export interface AuthInitOptions {
  // API Client (required)
  apiClient: UnifiedApiClient;

  // Configuration overrides
  settings?: Partial<AuthSettings>;
  environment?: string;

  // Feature flags
  enableAutoInit?: boolean;
  enableTokenValidation?: boolean;
  enableSessionRestore?: boolean;

  // Callbacks
  onInitialized?: (success: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Authentication system state
 */
interface AuthSystemState {
  isInitialized: boolean;
  settings: AuthSettings | null;
  apiService: AuthApiService | null;
  initializationPromise: Promise<void> | null;
}

// Global auth system state
const authSystemState: AuthSystemState = {
  isInitialized: false,
  settings: null,
  apiService: null,
  initializationPromise: null,
};

/**
 * Initialize the authentication system
 */
export async function initializeAuth(options: AuthInitOptions): Promise<void> {
  // Prevent multiple simultaneous initializations
  if (authSystemState.initializationPromise) {
    return authSystemState.initializationPromise;
  }

  authSystemState.initializationPromise = performInitialization(options);

  try {
    await authSystemState.initializationPromise;
  } finally {
    authSystemState.initializationPromise = null;
  }
}

/**
 * Perform the actual initialization
 */
async function performInitialization(options: AuthInitOptions): Promise<void> {
  try {
    logger.info('Initializing authentication system', {
      component: 'AuthInit',
      environment: options.environment,
      enableAutoInit: options.enableAutoInit,
    });

    // Step 1: Create and validate configuration
    const settings = createAuthConfig(options.environment, options.settings);
    const validation = validateAuthConfig(settings);

    if (!validation.isValid) {
      throw createError(
        ErrorDomain.SYSTEM,
        ErrorSeverity.HIGH,
        `Invalid auth configuration: ${validation.errors.join(', ')}`,
        { details: { errors: validation.errors } }
      );
    }

    authSystemState.settings = settings;

    // Step 2: Initialize API service
    const apiService = new AuthApiService(options.apiClient, settings.api.baseUrl);
    setAuthApiService(apiService);
    authSystemState.apiService = apiService;

    // Step 3: Initialize storage managers
    await initializeStorageManagers(settings);

    // Step 4: Restore session if enabled
    if (options.enableSessionRestore !== false) {
      await restoreSession(options);
    }

    // Step 5: Validate tokens if enabled
    if (options.enableTokenValidation !== false) {
      await validateStoredTokens(options);
    }

    // Step 6: Mark as initialized
    authSystemState.isInitialized = true;

    logger.info('Authentication system initialized successfully', {
      component: 'AuthInit',
      features: Object.keys(settings.features).filter(
        key => settings.features[key as keyof typeof settings.features]
      ),
    });

    // Notify success
    if (options.onInitialized) {
      options.onInitialized(true);
    }
  } catch (error) {
    logger.error('Authentication system initialization failed', {
      component: 'AuthInit',
      error,
    });

    // Notify error
    if (options.onError) {
      options.onError(error instanceof Error ? error : new Error('Initialization failed'));
    }

    if (options.onInitialized) {
      options.onInitialized(false);
    }

    throw error;
  }
}

/**
 * Initialize storage managers with configuration
 */
async function initializeStorageManagers(settings: AuthSettings): Promise<void> {
  try {
    // Token manager is already initialized as singleton
    // Session manager is already initialized as singleton

    logger.debug('Storage managers initialized', {
      component: 'AuthInit',
      tokenNamespace: settings.tokens.storageNamespace,
      sessionNamespace: settings.session.storageNamespace,
    });
  } catch (error) {
    logger.error('Failed to initialize storage managers', {
      component: 'AuthInit',
      error,
    });
    throw error;
  }
}

/**
 * Restore session from storage
 */
async function restoreSession(_options: AuthInitOptions): Promise<void> {
  try {
    const currentSession = sessionManager.getCurrentSession();

    if (currentSession) {
      logger.info('Session restored from storage', {
        component: 'AuthInit',
        userId: currentSession.userId,
        sessionId: currentSession.sessionId,
        expiresAt: currentSession.expiresAt,
      });
    } else {
      logger.debug('No valid session found in storage', {
        component: 'AuthInit',
      });
    }
  } catch (error) {
    logger.warn('Failed to restore session', {
      component: 'AuthInit',
      error,
    });
    // Don't throw - session restoration failure shouldn't block initialization
  }
}

/**
 * Validate stored tokens
 */
async function validateStoredTokens(_options: AuthInitOptions): Promise<void> {
  try {
    const hasTokens = await tokenManager.isTokenValid();

    if (hasTokens && authSystemState.apiService) {
      const isValid = await authSystemState.apiService.validateStoredTokens();

      if (isValid) {
        logger.info('Stored tokens validated successfully', {
          component: 'AuthInit',
        });
      } else {
        logger.warn('Stored tokens are invalid, clearing', {
          component: 'AuthInit',
        });
        await tokenManager.clearTokens();
      }
    } else {
      logger.debug('No tokens to validate', {
        component: 'AuthInit',
      });
    }
  } catch (error) {
    logger.warn('Token validation failed', {
      component: 'AuthInit',
      error,
    });
    // Clear potentially corrupted tokens
    await tokenManager.clearTokens();
  }
}

/**
 * Configure authentication system (for runtime configuration changes)
 */
export async function configureAuth(newSettings: Partial<AuthSettings>): Promise<void> {
  if (!authSystemState.isInitialized) {
    throw createError(
      ErrorDomain.SYSTEM,
      ErrorSeverity.MEDIUM,
      'Authentication system not initialized'
    );
  }

  if (!authSystemState.settings) {
    throw createError(ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, 'No current settings to update');
  }

  try {
    // Merge new settings with existing ones
    const updatedSettings = {
      ...authSystemState.settings,
      ...newSettings,
      // Deep merge nested objects
      api: {
        ...authSystemState.settings.api,
        ...newSettings.api,
      },
      tokens: {
        ...authSystemState.settings.tokens,
        ...newSettings.tokens,
      },
      session: {
        ...authSystemState.settings.session,
        ...newSettings.session,
      },
      security: {
        ...authSystemState.settings.security,
        ...newSettings.security,
      },
      validation: {
        ...authSystemState.settings.validation,
        ...newSettings.validation,
      },
      features: {
        ...authSystemState.settings.features,
        ...newSettings.features,
      },
    };

    // Validate updated settings
    const validation = validateAuthConfig(updatedSettings);
    if (!validation.isValid) {
      throw createError(
        ErrorDomain.SYSTEM,
        ErrorSeverity.MEDIUM,
        `Invalid configuration update: ${validation.errors.join(', ')}`,
        { details: { errors: validation.errors } }
      );
    }

    // Update settings
    authSystemState.settings = updatedSettings;

    logger.info('Authentication configuration updated', {
      component: 'AuthInit',
      updatedFields: Object.keys(newSettings),
    });
  } catch (error) {
    logger.error('Failed to update authentication configuration', {
      component: 'AuthInit',
      error,
    });
    throw error;
  }
}

/**
 * Get current authentication settings
 */
export function getAuthSettings(): AuthSettings | null {
  return authSystemState.settings;
}

/**
 * Get authentication system status
 */
export function getAuthSystemStatus(): {
  isInitialized: boolean;
  hasSettings: boolean;
  hasApiService: boolean;
  isInitializing: boolean;
} {
  return {
    isInitialized: authSystemState.isInitialized,
    hasSettings: authSystemState.settings !== null,
    hasApiService: authSystemState.apiService !== null,
    isInitializing: authSystemState.initializationPromise !== null,
  };
}

/**
 * Cleanup authentication system (for testing or shutdown)
 */
export async function cleanupAuth(): Promise<void> {
  try {
    logger.info('Cleaning up authentication system', {
      component: 'AuthInit',
    });

    // Stop session monitoring
    await sessionManager.cleanup();

    // Clear state
    authSystemState.isInitialized = false;
    authSystemState.settings = null;
    authSystemState.apiService = null;
    authSystemState.initializationPromise = null;

    logger.info('Authentication system cleanup completed', {
      component: 'AuthInit',
    });
  } catch (error) {
    logger.error('Authentication system cleanup failed', {
      component: 'AuthInit',
      error,
    });
    throw error;
  }
}

/**
 * Ensure authentication system is initialized
 */
export function ensureAuthInitialized(): void {
  if (!authSystemState.isInitialized) {
    throw createError(
      ErrorDomain.SYSTEM,
      ErrorSeverity.HIGH,
      'Authentication system not initialized. Call initializeAuth() first.'
    );
  }
}

export default {
  initializeAuth,
  configureAuth,
  getAuthSettings,
  getAuthSystemStatus,
  cleanupAuth,
  ensureAuthInitialized,
};
