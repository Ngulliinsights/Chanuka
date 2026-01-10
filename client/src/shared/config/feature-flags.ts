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

  // Client Architecture Refinement Features
  UNIFIED_SEARCH_ENABLED: false,
  ADAPTIVE_DASHBOARD_ENABLED: false,
  COMMAND_PALETTE_ENABLED: false,
  STRATEGIC_HOME_ENABLED: false,
  PERSONA_DETECTION_ENABLED: false,
  ROUTE_CONSOLIDATION_ENABLED: false,

  // Development Features
  REDUX_DEVTOOLS_ENABLED: process.env.NODE_ENV !== 'production',
  DEBUG_LOGGING_ENABLED: process.env.NODE_ENV === 'development',
} as const;

/**
 * Rollout configuration for gradual feature deployment
 */
export const ROLLOUT_CONFIG = {
  UNIFIED_SEARCH_ENABLED: {
    internal: 100, // 100% for development team
    beta: 25, // 25% for beta users
    production: 0, // 0% for production users initially
  },
  ADAPTIVE_DASHBOARD_ENABLED: {
    internal: 100,
    beta: 0,
    production: 0,
  },
  COMMAND_PALETTE_ENABLED: {
    internal: 100,
    beta: 0,
    production: 0,
  },
  STRATEGIC_HOME_ENABLED: {
    internal: 100,
    beta: 0,
    production: 0,
  },
  PERSONA_DETECTION_ENABLED: {
    internal: 100,
    beta: 0,
    production: 0,
  },
  ROUTE_CONSOLIDATION_ENABLED: {
    internal: 100,
    beta: 0,
    production: 0,
  },
} as const;

/**
 * User groups for feature rollout
 */
export enum UserGroup {
  INTERNAL = 'internal',
  BETA = 'beta',
  PRODUCTION = 'production',
}

/**
 * Type-safe feature flag keys
 */
export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Type-safe rollout config keys
 */
export type RolloutConfigKey = keyof typeof ROLLOUT_CONFIG;

/**
 * Check if a feature flag is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => {
  return FEATURE_FLAGS[flag];
};

/**
 * Check if a feature is enabled for a specific user group with rollout percentage
 */
export const isFeatureEnabledForUser = (
  flag: RolloutConfigKey,
  userGroup: UserGroup = UserGroup.PRODUCTION,
  userId?: string
): boolean => {
  // First check if the base feature flag is enabled
  if (!FEATURE_FLAGS[flag]) {
    return false;
  }

  const rolloutPercentage = ROLLOUT_CONFIG[flag][userGroup];

  // If rollout is 100%, always enable
  if (rolloutPercentage >= 100) {
    return true;
  }

  // If rollout is 0%, always disable
  if (rolloutPercentage <= 0) {
    return false;
  }

  // Use deterministic rollout based on user ID or session
  const seed = userId || getSessionId();
  const hash = simpleHash(seed + flag);
  const userPercentile = hash % 100;

  return userPercentile < rolloutPercentage;
};

/**
 * Get current user group based on environment and user properties
 */
export const getCurrentUserGroup = (): UserGroup => {
  // In development, always use internal
  if (process.env.NODE_ENV === 'development') {
    return UserGroup.INTERNAL;
  }

  // Check if user is in beta group (could be based on user properties, URL params, etc.)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('beta') === 'true') {
    return UserGroup.BETA;
  }

  // Check localStorage for beta flag
  if (localStorage.getItem('chanuka_beta_user') === 'true') {
    return UserGroup.BETA;
  }

  // Default to production
  return UserGroup.PRODUCTION;
};

/**
 * Simple hash function for deterministic rollout
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get or create a session ID for consistent rollout
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('chanuka_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('chanuka_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Get all feature flags
 */
export const getAllFeatureFlags = () => {
  return { ...FEATURE_FLAGS };
};

/**
 * Get rollout status for all features for current user
 */
export const getFeatureRolloutStatus = (userGroup?: UserGroup, userId?: string) => {
  const currentUserGroup = userGroup || getCurrentUserGroup();
  const rolloutStatus: Record<string, boolean> = {};

  Object.keys(ROLLOUT_CONFIG).forEach(flag => {
    rolloutStatus[flag] = isFeatureEnabledForUser(
      flag as RolloutConfigKey,
      currentUserGroup,
      userId
    );
  });

  return rolloutStatus;
};
