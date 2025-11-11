/**
 * Error System Initialization
 * 
 * Centralized initialization and configuration for the complete
 * error handling system including analytics, recovery, and monitoring.
 */

import { errorHandler } from './unified-error-handler';
import { errorAnalytics, setupSentry, setupDataDog, setupCustomAnalytics } from './error-analytics';
import { smartRecoveryEngine } from './advanced-error-recovery';
import { errorRateLimiter } from './error-rate-limiter';

// Configuration interfaces
export interface ErrorSystemConfig {
  // Core error handling
  maxErrors?: number;
  enableGlobalHandlers?: boolean;
  enableRecovery?: boolean;
  notificationDebounceMs?: number;
  logErrors?: boolean;

  // Analytics configuration
  analytics?: {
    enabled?: boolean;
    providers?: {
      sentry?: { dsn: string };
      datadog?: { clientToken: string; site?: string };
      custom?: { endpoint: string; apiKey?: string };
    };
    batchSize?: number;
    batchTimeout?: number;
  };

  // Recovery configuration
  recovery?: {
    circuitBreakerThreshold?: number;
    circuitBreakerTimeout?: number;
    maxHistorySize?: number;
  };

  // Rate limiting configuration
  rateLimiting?: {
    enabled?: boolean;
    general?: { windowMs: number; maxErrors: number };
    network?: { windowMs: number; maxErrors: number };
    critical?: { windowMs: number; maxErrors: number };
    user?: { windowMs: number; maxErrors: number };
  };
}

// Default configuration
const DEFAULT_CONFIG: Required<ErrorSystemConfig> = {
  // Core settings
  maxErrors: 100,
  enableGlobalHandlers: true,
  enableRecovery: true,
  notificationDebounceMs: 100,
  logErrors: true,

  // Analytics settings
  analytics: {
    enabled: false,
    providers: {},
    batchSize: 10,
    batchTimeout: 5000,
  },

  // Recovery settings
  recovery: {
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 30000,
    maxHistorySize: 1000,
  },

  // Rate limiting settings
  rateLimiting: {
    enabled: true,
    general: { windowMs: 60000, maxErrors: 50 },
    network: { windowMs: 30000, maxErrors: 10 },
    critical: { windowMs: 300000, maxErrors: 3 },
    user: { windowMs: 120000, maxErrors: 20 },
  },
};

/**
 * Initialize the complete error handling system
 */
export async function initializeErrorSystem(config: ErrorSystemConfig = {}): Promise<void> {
  const finalConfig = mergeConfig(DEFAULT_CONFIG, config);

  try {
    // 1. Configure core error handler
    errorHandler.configure({
      maxErrors: finalConfig.maxErrors,
      enableGlobalHandlers: finalConfig.enableGlobalHandlers,
      enableRecovery: finalConfig.enableRecovery,
      notificationDebounceMs: finalConfig.notificationDebounceMs,
      logErrors: finalConfig.logErrors,
    });

    // 2. Setup analytics if enabled
    if (finalConfig.analytics.enabled) {
      await setupAnalytics(finalConfig.analytics);
    }

    // 3. Configure smart recovery engine
    smartRecoveryEngine.configure({
      circuitBreakerThreshold: finalConfig.recovery.circuitBreakerThreshold,
      circuitBreakerTimeout: finalConfig.recovery.circuitBreakerTimeout,
      maxHistorySize: finalConfig.recovery.maxHistorySize,
    });

    // 4. Configure rate limiting if enabled
    if (finalConfig.rateLimiting.enabled) {
      // Rate limiters are configured by default in the manager
      // Additional configuration could be added here if needed
    }

    console.log('✅ Error handling system initialized successfully');
    
    // Log system capabilities
    logSystemCapabilities(finalConfig);

  } catch (error) {
    console.error('❌ Failed to initialize error handling system:', error);
    throw error;
  }
}

/**
 * Setup analytics providers based on configuration
 */
async function setupAnalytics(analyticsConfig: Required<ErrorSystemConfig>['analytics']): Promise<void> {
  const { providers } = analyticsConfig;

  // Configure analytics manager
  await errorAnalytics.configure({
    enabled: true,
    sentry: providers?.sentry ? {
      ...providers.sentry,
      environment: 'production'
    } : undefined,
    datadog: providers?.datadog ? {
      ...providers.datadog,
      applicationId: 'app-id' // This would need to be configured
    } : undefined,
    custom: providers?.custom,
  });

  // Setup providers
  if (providers?.sentry?.dsn) {
    await setupSentry({
      dsn: providers.sentry.dsn,
      environment: 'production' // Default environment
    });
    console.log('📊 Sentry analytics provider configured');
  }

  if (providers?.datadog?.clientToken) {
    await setupDataDog({
      applicationId: 'app-id', // This would need to be configured
      clientToken: providers.datadog.clientToken,
      site: providers.datadog.site,
    });
    console.log('📊 DataDog analytics provider configured');
  }

  if (providers?.custom?.endpoint) {
    await setupCustomAnalytics({
      endpoint: providers.custom.endpoint,
      apiKey: providers.custom.apiKey,
    });
    console.log('📊 Custom analytics provider configured');
  }
}

/**
 * Log system capabilities for debugging
 */
function logSystemCapabilities(config: Required<ErrorSystemConfig>): void {
  const capabilities = {
    coreErrorHandling: true,
    globalErrorCapture: config.enableGlobalHandlers,
    automaticRecovery: config.enableRecovery,
    analytics: config.analytics.enabled,
    rateLimiting: config.rateLimiting.enabled,
    smartRecovery: true,
    circuitBreakers: true,
    errorMonitoring: true,
  };

  console.log('🔧 Error System Capabilities:', capabilities);
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(
  defaultConfig: Required<ErrorSystemConfig>,
  userConfig: ErrorSystemConfig
): Required<ErrorSystemConfig> {
  const result = { ...defaultConfig };

  // Merge top-level properties
  Object.keys(userConfig).forEach(key => {
    const userValue = (userConfig as any)[key];
    if (userValue !== undefined) {
      if (typeof userValue === 'object' && userValue !== null && !Array.isArray(userValue)) {
        // Deep merge objects
        (result as any)[key] = { ...(result as any)[key], ...userValue };
      } else {
        // Direct assignment for primitives and arrays
        (result as any)[key] = userValue;
      }
    }
  });

  return result;
}

/**
 * Get current system status
 */
export function getErrorSystemStatus(): {
  initialized: boolean;
  coreHandler: boolean;
  analytics: boolean;
  recovery: boolean;
  rateLimiting: boolean;
  providers: string[];
} {
  return {
    initialized: true, // If this function runs, system is initialized
    coreHandler: !!errorHandler,
    analytics: errorAnalytics?.getStats()?.enabled || false,
    recovery: !!smartRecoveryEngine,
    rateLimiting: !!errorRateLimiter,
    providers: errorAnalytics?.getStats()?.providers?.map(p => p.displayName) || [],
  };
}

/**
 * Reset the entire error system (useful for testing)
 */
export function resetErrorSystem(): void {
  errorHandler.reset();
  smartRecoveryEngine.reset();
  errorRateLimiter.reset();
  console.log('🔄 Error system reset complete');
}

/**
 * Environment-specific configurations
 */
export const ERROR_SYSTEM_PRESETS = {
  development: {
    logErrors: true,
    enableGlobalHandlers: true,
    analytics: { enabled: false },
    rateLimiting: { enabled: false }, // Disable in dev for easier debugging
  } as ErrorSystemConfig,

  testing: {
    logErrors: false,
    enableGlobalHandlers: false,
    analytics: { enabled: false },
    rateLimiting: { enabled: false },
    notificationDebounceMs: 0, // Immediate for testing
  } as ErrorSystemConfig,

  staging: {
    logErrors: true,
    enableGlobalHandlers: true,
    analytics: {
      enabled: true,
      providers: {
        custom: {
          endpoint: '/api/errors/track',
        },
      },
    },
    rateLimiting: { enabled: true },
  } as ErrorSystemConfig,

  production: {
    logErrors: true,
    enableGlobalHandlers: true,
    analytics: {
      enabled: true,
      batchSize: 20,
      batchTimeout: 10000,
    },
    rateLimiting: { enabled: true },
    recovery: {
      circuitBreakerThreshold: 3, // More aggressive in production
      circuitBreakerTimeout: 60000, // Longer timeout
    },
  } as ErrorSystemConfig,
};

/**
 * Initialize with environment preset
 */
export async function initializeForEnvironment(
  environment: keyof typeof ERROR_SYSTEM_PRESETS,
  overrides: ErrorSystemConfig = {}
): Promise<void> {
  const preset = ERROR_SYSTEM_PRESETS[environment];
  const config = mergeConfig(DEFAULT_CONFIG, { ...preset, ...overrides });
  
  console.log(`🚀 Initializing error system for ${environment} environment`);
  await initializeErrorSystem(config);
}

// Export for convenience
export { errorHandler, errorAnalytics, smartRecoveryEngine, errorRateLimiter };