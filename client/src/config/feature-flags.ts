/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for client-side features.
 * These flags control the rollout of new features and migrations.
 */

export const FEATURE_FLAGS = {
  // Navigation Features
  NAVIGATION_PERSISTENCE_ENABLED: true,
  BREADCRUMB_AUTO_GENERATION: true,

  // Development Features
  REDUX_DEVTOOLS_ENABLED: process.env.NODE_ENV !== 'production',
  DEBUG_LOGGING_ENABLED: process.env.NODE_ENV === 'development',
} as const;

/**
 * Type-safe feature flag keys
 */
export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature flag is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => {
  return FEATURE_FLAGS[flag];
};

/**
 * Get all feature flags
 */
export const getAllFeatureFlags = () => {
  return { ...FEATURE_FLAGS };
};
