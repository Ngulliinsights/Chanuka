/**
 * Integration Configuration
 * 
 * Centralized configuration for seamless shared module integration,
 * including feature flags, fallback strategies, and environment settings.
 */

export interface IntegrationConfig {
  // Core settings
  enableSharedModules: boolean;
  enableFallbacks: boolean;
  enableProgressiveEnhancement: boolean;
  
  // Performance settings
  initializationTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  
  // Feature flags
  features: {
    advancedValidation: boolean;
    civicScoring: boolean;
    anonymityManagement: boolean;
    internationalization: boolean;
    enhancedFormatting: boolean;
  };
  
  // Fallback strategies
  fallbackStrategies: {
    validation: 'basic' | 'none';
    formatting: 'intl' | 'basic' | 'none';
    strings: 'basic' | 'none';
    arrays: 'native' | 'basic' | 'none';
    civic: 'mock' | 'none';
    anonymity: 'basic' | 'none';
  };
  
  // Environment-specific overrides
  environmentOverrides: {
    development: Partial<IntegrationConfig>;
    production: Partial<IntegrationConfig>;
    test: Partial<IntegrationConfig>;
  };
}

/**
 * Default integration configuration
 */
export const defaultIntegrationConfig: IntegrationConfig = {
  // Core settings
  enableSharedModules: true,
  enableFallbacks: true,
  enableProgressiveEnhancement: true,
  
  // Performance settings
  initializationTimeout: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second base delay
  
  // Feature flags
  features: {
    advancedValidation: true,
    civicScoring: true,
    anonymityManagement: true,
    internationalization: false, // Disabled by default
    enhancedFormatting: true,
  },
  
  // Fallback strategies
  fallbackStrategies: {
    validation: 'basic',
    formatting: 'intl',
    strings: 'basic',
    arrays: 'native',
    civic: 'mock',
    anonymity: 'basic',
  },
  
  // Environment-specific overrides
  environmentOverrides: {
    development: {
      initializationTimeout: 10000, // Longer timeout in dev
      retryAttempts: 5,
      features: {
        advancedValidation: true,
        civicScoring: true,
        anonymityManagement: true,
        internationalization: true, // Enable in dev for testing
        enhancedFormatting: true,
      },
    },
    production: {
      initializationTimeout: 3000, // Shorter timeout in prod
      retryAttempts: 2,
      features: {
        advancedValidation: true,
        civicScoring: true,
        anonymityManagement: true,
        internationalization: false, // Disabled in prod until ready
        enhancedFormatting: true,
      },
    },
    test: {
      enableSharedModules: false, // Use fallbacks in tests
      initializationTimeout: 1000,
      retryAttempts: 1,
      features: {
        advancedValidation: false,
        civicScoring: false,
        anonymityManagement: false,
        internationalization: false,
        enhancedFormatting: false,
      },
    },
  },
};

/**
 * Get integration configuration for current environment
 */
export function getIntegrationConfig(): IntegrationConfig {
  const env = import.meta.env.MODE || 'development';
  const baseConfig = { ...defaultIntegrationConfig };
  
  // Apply environment-specific overrides
  const envOverrides = baseConfig.environmentOverrides[env as keyof typeof baseConfig.environmentOverrides];
  if (envOverrides) {
    Object.assign(baseConfig, envOverrides);
    
    // Merge nested objects
    if (envOverrides.features) {
      baseConfig.features = { ...baseConfig.features, ...envOverrides.features };
    }
    if (envOverrides.fallbackStrategies) {
      baseConfig.fallbackStrategies = { ...baseConfig.fallbackStrategies, ...envOverrides.fallbackStrategies };
    }
  }
  
  // Apply environment variable overrides
  if (import.meta.env.VITE_DISABLE_SHARED_MODULES === 'true') {
    baseConfig.enableSharedModules = false;
  }
  
  if (import.meta.env.VITE_INTEGRATION_TIMEOUT) {
    baseConfig.initializationTimeout = parseInt(import.meta.env.VITE_INTEGRATION_TIMEOUT, 10);
  }
  
  return baseConfig;
}

/**
 * Feature flag utilities
 */
export class FeatureFlags {
  private config: IntegrationConfig;
  
  constructor(config?: IntegrationConfig) {
    this.config = config || getIntegrationConfig();
  }
  
  isEnabled(feature: keyof IntegrationConfig['features']): boolean {
    return this.config.features[feature];
  }
  
  getFallbackStrategy<T extends keyof IntegrationConfig['fallbackStrategies']>(
    utility: T
  ): IntegrationConfig['fallbackStrategies'][T] {
    return this.config.fallbackStrategies[utility];
  }
  
  shouldUseSharedModules(): boolean {
    return this.config.enableSharedModules;
  }
  
  shouldUseFallbacks(): boolean {
    return this.config.enableFallbacks;
  }
  
  shouldUseProgressiveEnhancement(): boolean {
    return this.config.enableProgressiveEnhancement;
  }
  
  getRetryConfig() {
    return {
      attempts: this.config.retryAttempts,
      delay: this.config.retryDelay,
      timeout: this.config.initializationTimeout,
    };
  }
}

/**
 * Integration diagnostics
 */
export interface IntegrationDiagnostics {
  configurationValid: boolean;
  sharedModulesDetected: boolean;
  fallbacksAvailable: boolean;
  performanceImpact: 'low' | 'medium' | 'high';
  recommendations: string[];
  warnings: string[];
  errors: string[];
}

export function runIntegrationDiagnostics(config?: IntegrationConfig): IntegrationDiagnostics {
  const cfg = config || getIntegrationConfig();
  const diagnostics: IntegrationDiagnostics = {
    configurationValid: true,
    sharedModulesDetected: false,
    fallbacksAvailable: cfg.enableFallbacks,
    performanceImpact: 'low',
    recommendations: [],
    warnings: [],
    errors: [],
  };
  
  // Check configuration validity
  if (cfg.initializationTimeout < 1000) {
    diagnostics.warnings.push('Initialization timeout is very low, may cause failures');
  }
  
  if (cfg.retryAttempts > 5) {
    diagnostics.warnings.push('High retry attempts may impact performance');
  }
  
  // Check feature flag consistency
  if (cfg.enableSharedModules && !cfg.enableFallbacks) {
    diagnostics.warnings.push('Shared modules enabled without fallbacks - risky configuration');
  }
  
  if (!cfg.enableSharedModules && cfg.enableProgressiveEnhancement) {
    diagnostics.recommendations.push('Consider enabling shared modules for better progressive enhancement');
  }
  
  // Performance impact assessment
  const enabledFeatures = Object.values(cfg.features).filter(Boolean).length;
  if (enabledFeatures > 3) {
    diagnostics.performanceImpact = 'medium';
  }
  if (enabledFeatures > 4) {
    diagnostics.performanceImpact = 'high';
    diagnostics.recommendations.push('Consider disabling some features to improve performance');
  }
  
  // Environment-specific checks
  const env = import.meta.env.MODE || 'development';
  if (env === 'production' && cfg.features.internationalization) {
    diagnostics.warnings.push('Internationalization enabled in production - ensure it\'s ready');
  }
  
  return diagnostics;
}

/**
 * Export singleton instances
 */
export const integrationConfig = getIntegrationConfig();
export const featureFlags = new FeatureFlags(integrationConfig);
export const integrationDiagnostics = runIntegrationDiagnostics(integrationConfig);

export default integrationConfig;