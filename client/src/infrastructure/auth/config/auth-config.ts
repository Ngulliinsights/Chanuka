/**
 * Authentication Configuration
 *
 * Centralized configuration for all authentication-related settings
 */

import type { AuthConfig } from '../http/authentication-interceptors';
import type { AuthMiddlewareConfig } from '../store/auth-middleware';

/**
 * Comprehensive authentication settings
 */
export interface AuthSettings {
  // API Configuration
  api: {
    baseUrl: string;
    authEndpoint: string;
    timeout: number;
  };

  // Token Management
  tokens: {
    refreshThreshold: number; // minutes before expiry to refresh
    maxRefreshAttempts: number;
    storageNamespace: string;
  };

  // Session Management
  session: {
    maxDuration: number; // minutes
    warningThreshold: number; // minutes before expiry to warn
    monitoringInterval: number; // milliseconds
    storageNamespace: string;
  };

  // Security Settings
  security: {
    enableMonitoring: boolean;
    enableAutoRefresh: boolean;
    enableSessionValidation: boolean;
    maxFailedAttempts: number;
    lockoutDuration: number; // minutes
  };

  // Validation Rules
  validation: {
    password: {
      minLength: number;
      strongMinLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    email: {
      maxLength: number;
      allowedDomains?: string[];
    };
    name: {
      minLength: number;
      maxLength: number;
    };
  };

  // Feature Flags
  features: {
    twoFactorAuth: boolean;
    oauthProviders: string[];
    passwordReset: boolean;
    emailVerification: boolean;
    sessionManagement: boolean;
    privacyControls: boolean;
  };
}

/**
 * Default authentication settings
 */
export const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  api: {
    baseUrl: '/api',
    authEndpoint: '/api/auth',
    timeout: 30000, // 30 seconds
  },

  tokens: {
    refreshThreshold: 5, // 5 minutes
    maxRefreshAttempts: 3,
    storageNamespace: 'auth',
  },

  session: {
    maxDuration: 480, // 8 hours
    warningThreshold: 5, // 5 minutes
    monitoringInterval: 60000, // 1 minute
    storageNamespace: 'session',
  },

  security: {
    enableMonitoring: true,
    enableAutoRefresh: true,
    enableSessionValidation: true,
    maxFailedAttempts: 5,
    lockoutDuration: 15, // 15 minutes
  },

  validation: {
    password: {
      minLength: 8,
      strongMinLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    email: {
      maxLength: 254,
      allowedDomains: undefined, // No domain restrictions by default
    },
    name: {
      minLength: 2,
      maxLength: 50,
    },
  },

  features: {
    twoFactorAuth: true,
    oauthProviders: ['google', 'github'],
    passwordReset: true,
    emailVerification: true,
    sessionManagement: true,
    privacyControls: true,
  },
};

/**
 * Environment-specific configuration overrides
 */
const ENVIRONMENT_OVERRIDES: Record<string, Partial<AuthSettings>> = {
  development: {
    security: {
      enableMonitoring: false,
      enableAutoRefresh: true,
      enableSessionValidation: true,
      maxFailedAttempts: 10, // More lenient in dev
      lockoutDuration: 300000, // 5 minutes
    },
    validation: {
      password: {
        minLength: 6, // Easier testing in dev
        strongMinLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
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

  test: {
    api: {
      baseUrl: '/api',
      authEndpoint: '/api/auth',
      timeout: 5000, // Faster timeouts in tests
    },
    security: {
      enableMonitoring: false,
      enableAutoRefresh: false,
      enableSessionValidation: false,
      maxFailedAttempts: 10,
      lockoutDuration: 5, // 5 minutes
    },
    session: {
      maxDuration: 60, // 1 hour for tests
      warningThreshold: 5,
      monitoringInterval: 10000, // 10 seconds
      storageNamespace: 'session',
    },
  },

  production: {
    security: {
      enableMonitoring: true,
      enableAutoRefresh: true,
      enableSessionValidation: true,
      maxFailedAttempts: 3, // Stricter in production
      lockoutDuration: 30, // 30 minutes
    },
    validation: {
      password: {
        minLength: 10, // Stronger passwords in production
        strongMinLength: 14,
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
};

/**
 * Creates authentication configuration with environment overrides
 */
export function createAuthConfig(
  environment: string = process.env.NODE_ENV || 'development',
  customSettings: Partial<AuthSettings> = {}
): AuthSettings {
  const envOverrides = ENVIRONMENT_OVERRIDES[environment] || {};

  return {
    ...DEFAULT_AUTH_SETTINGS,
    ...envOverrides,
    ...customSettings,
    // Deep merge nested objects
    api: {
      ...DEFAULT_AUTH_SETTINGS.api,
      ...envOverrides.api,
      ...customSettings.api,
    },
    tokens: {
      ...DEFAULT_AUTH_SETTINGS.tokens,
      ...envOverrides.tokens,
      ...customSettings.tokens,
    },
    session: {
      ...DEFAULT_AUTH_SETTINGS.session,
      ...envOverrides.session,
      ...customSettings.session,
    },
    security: {
      ...DEFAULT_AUTH_SETTINGS.security,
      ...envOverrides.security,
      ...customSettings.security,
    },
    validation: {
      ...DEFAULT_AUTH_SETTINGS.validation,
      ...envOverrides.validation,
      ...customSettings.validation,
      password: {
        ...DEFAULT_AUTH_SETTINGS.validation.password,
        ...envOverrides.validation?.password,
        ...customSettings.validation?.password,
      },
      email: {
        ...DEFAULT_AUTH_SETTINGS.validation.email,
        ...envOverrides.validation?.email,
        ...customSettings.validation?.email,
      },
      name: {
        ...DEFAULT_AUTH_SETTINGS.validation.name,
        ...envOverrides.validation?.name,
        ...customSettings.validation?.name,
      },
    },
    features: {
      ...DEFAULT_AUTH_SETTINGS.features,
      ...envOverrides.features,
      ...customSettings.features,
    },
  };
}

/**
 * Converts AuthSettings to AuthConfig for HTTP interceptors
 */
export function toAuthConfig(settings: AuthSettings): AuthConfig {
  return {
    enableMonitoring: settings.security.enableMonitoring,
    enableAutoRefresh: settings.security.enableAutoRefresh,
    enableSessionValidation: settings.security.enableSessionValidation,
    maxFailedAttempts: settings.security.maxFailedAttempts,
    lockoutDuration: settings.security.lockoutDuration,
    tokenRefreshEndpoint: `${settings.api.authEndpoint}/refresh`,
    tokenRefreshThreshold: settings.tokens.refreshThreshold,
    maxRefreshAttempts: settings.tokens.maxRefreshAttempts,
  };
}

/**
 * Converts AuthSettings to AuthMiddlewareConfig
 */
export function toAuthMiddlewareConfig(settings: AuthSettings): AuthMiddlewareConfig {
  return {
    enableAutoRefresh: settings.security.enableAutoRefresh,
    enableSecurityMonitoring: settings.security.enableMonitoring,
    refreshThreshold: settings.tokens.refreshThreshold,
  };
}

/**
 * Validates authentication configuration
 */
export function validateAuthConfig(settings: AuthSettings): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate API settings
  if (!settings.api.baseUrl) {
    errors.push('API base URL is required');
  }
  if (!settings.api.authEndpoint) {
    errors.push('Auth endpoint is required');
  }
  if (settings.api.timeout <= 0) {
    errors.push('API timeout must be positive');
  }

  // Validate token settings
  if (settings.tokens.refreshThreshold <= 0) {
    errors.push('Token refresh threshold must be positive');
  }
  if (settings.tokens.maxRefreshAttempts <= 0) {
    errors.push('Max refresh attempts must be positive');
  }

  // Validate session settings
  if (settings.session.maxDuration <= 0) {
    errors.push('Session max duration must be positive');
  }
  if (settings.session.warningThreshold <= 0) {
    errors.push('Session warning threshold must be positive');
  }
  if (settings.session.monitoringInterval <= 0) {
    errors.push('Session monitoring interval must be positive');
  }

  // Validate password requirements
  if (settings.validation.password.minLength < 4) {
    errors.push('Password minimum length must be at least 4');
  }
  if (settings.validation.password.strongMinLength < settings.validation.password.minLength) {
    errors.push('Strong password length must be >= minimum length');
  }

  // Validate email settings
  if (settings.validation.email.maxLength <= 0) {
    errors.push('Email max length must be positive');
  }

  // Validate name settings
  if (settings.validation.name.minLength <= 0) {
    errors.push('Name minimum length must be positive');
  }
  if (settings.validation.name.maxLength <= settings.validation.name.minLength) {
    errors.push('Name max length must be > minimum length');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default {
  DEFAULT_AUTH_SETTINGS,
  createAuthConfig,
  toAuthConfig,
  toAuthMiddlewareConfig,
  validateAuthConfig,
};
