/**
 * Feature Flags
 *
 * Centralized feature toggles that can be enabled/disabled
 * without code changes, used across client and server.
 */

/**
 * Feature Flag Enumeration
 * Using const assertion for type safety
 */
export const FEATURE_FLAGS = {
  // Authentication and Authorization
  ENABLE_OAUTH_GITHUB: true,
  ENABLE_OAUTH_GOOGLE: true,
  ENABLE_OAUTH_MICROSOFT: false,
  ENABLE_TWO_FACTOR_AUTH: true,
  ENABLE_BIOMETRIC_AUTH: false,
  REQUIRE_EMAIL_VERIFICATION: true,

  // Legislative Features
  ENABLE_BILL_AMENDMENTS: true,
  ENABLE_BILL_VERSIONING: true,
  ENABLE_BILL_COMPARISON: true,
  ENABLE_BILL_TIMELINE: true,
  ENABLE_BILL_IMPACT_ANALYSIS: false,
  ENABLE_BILL_SPONSORSHIP_TRACKING: true,

  // Community Features
  ENABLE_COMMENTS: true,
  ENABLE_COMMENT_MODERATION: true,
  ENABLE_COMMENT_THREADING: true,
  ENABLE_COMMENT_VOTING: true,
  ENABLE_COMMENT_FLAGGING: true,
  ENABLE_COMMUNITY_FORUMS: false,
  ENABLE_LIVE_DISCUSSION: true,

  // Analytics and Reporting
  ENABLE_ANALYTICS: true,
  ENABLE_USER_BEHAVIOR_TRACKING: true,
  ENABLE_ENGAGEMENT_METRICS: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_TRACKING: true,
  ENABLE_USAGE_REPORTS: true,

  // Search and Discovery
  ENABLE_ADVANCED_SEARCH: true,
  ENABLE_FACETED_SEARCH: true,
  ENABLE_FULL_TEXT_SEARCH: true,
  ENABLE_SEARCH_SUGGESTIONS: true,
  ENABLE_SEARCH_ANALYTICS: false,

  // Content Management
  ENABLE_CONTENT_RECOMMENDATIONS: false,
  ENABLE_PERSONALIZATION: true,
  ENABLE_USER_PREFERENCES: true,
  ENABLE_DARK_MODE: true,
  ENABLE_ACCESSIBILITY_FEATURES: true,

  // Performance
  ENABLE_CACHING: true,
  ENABLE_COMPRESSION: true,
  ENABLE_CDN: false,
  ENABLE_LAZY_LOADING: true,
  ENABLE_PAGINATION: true,

  // API Features
  ENABLE_GRAPHQL_API: false,
  ENABLE_REST_API: true,
  ENABLE_WEBSOCKET_API: true,
  ENABLE_API_RATE_LIMITING: true,
  ENABLE_API_VERSIONING: true,
  ENABLE_API_DOCUMENTATION: true,

  // Mobile Features
  ENABLE_MOBILE_APP: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_MOBILE_SYNC: true,

  // Admin Features
  ENABLE_ADMIN_DASHBOARD: true,
  ENABLE_USER_MANAGEMENT: true,
  ENABLE_CONTENT_MODERATION: true,
  ENABLE_AUDIT_LOGGING: true,
  ENABLE_SYSTEM_HEALTH_MONITORING: true,

  // Experimental Features
  ENABLE_AI_SUGGESTIONS: false,
  ENABLE_IMPACT_PREDICTION: false,
  ENABLE_SENTIMENT_ANALYSIS: false,
  ENABLE_AUTO_CATEGORIZATION: false,

  // Maintenance and Testing
  ENABLE_MAINTENANCE_MODE: false,
  ENABLE_DEBUG_MODE: false,
  ENABLE_TEST_DATA: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureFlagValue = (typeof FEATURE_FLAGS)[FeatureFlagKey];

/**
 * Feature Flag Categories
 * Organized by feature area for easier management
 */
export const FEATURE_FLAG_CATEGORIES = {
  AUTHENTICATION: [
    'ENABLE_OAUTH_GITHUB',
    'ENABLE_OAUTH_GOOGLE',
    'ENABLE_OAUTH_MICROSOFT',
    'ENABLE_TWO_FACTOR_AUTH',
    'ENABLE_BIOMETRIC_AUTH',
    'REQUIRE_EMAIL_VERIFICATION',
  ] as const,

  LEGISLATIVE: [
    'ENABLE_BILL_AMENDMENTS',
    'ENABLE_BILL_VERSIONING',
    'ENABLE_BILL_COMPARISON',
    'ENABLE_BILL_TIMELINE',
    'ENABLE_BILL_IMPACT_ANALYSIS',
    'ENABLE_BILL_SPONSORSHIP_TRACKING',
  ] as const,

  COMMUNITY: [
    'ENABLE_COMMENTS',
    'ENABLE_COMMENT_MODERATION',
    'ENABLE_COMMENT_THREADING',
    'ENABLE_COMMENT_VOTING',
    'ENABLE_COMMENT_FLAGGING',
    'ENABLE_COMMUNITY_FORUMS',
    'ENABLE_LIVE_DISCUSSION',
  ] as const,

  ANALYTICS: [
    'ENABLE_ANALYTICS',
    'ENABLE_USER_BEHAVIOR_TRACKING',
    'ENABLE_ENGAGEMENT_METRICS',
    'ENABLE_PERFORMANCE_MONITORING',
    'ENABLE_ERROR_TRACKING',
    'ENABLE_USAGE_REPORTS',
  ] as const,

  SEARCH: [
    'ENABLE_ADVANCED_SEARCH',
    'ENABLE_FACETED_SEARCH',
    'ENABLE_FULL_TEXT_SEARCH',
    'ENABLE_SEARCH_SUGGESTIONS',
    'ENABLE_SEARCH_ANALYTICS',
  ] as const,

  ADMIN: [
    'ENABLE_ADMIN_DASHBOARD',
    'ENABLE_USER_MANAGEMENT',
    'ENABLE_CONTENT_MODERATION',
    'ENABLE_AUDIT_LOGGING',
    'ENABLE_SYSTEM_HEALTH_MONITORING',
  ] as const,

  EXPERIMENTAL: [
    'ENABLE_AI_SUGGESTIONS',
    'ENABLE_IMPACT_PREDICTION',
    'ENABLE_SENTIMENT_ANALYSIS',
    'ENABLE_AUTO_CATEGORIZATION',
  ] as const,
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * Get all enabled features in a category
 */
export function getEnabledFeaturesInCategory(
  category: keyof typeof FEATURE_FLAG_CATEGORIES
): FeatureFlagKey[] {
  const flagKeys = FEATURE_FLAG_CATEGORIES[category];
  return flagKeys.filter((flag) => isFeatureEnabled(flag as FeatureFlagKey));
}

/**
 * Check if any feature in a category is enabled
 */
export function isCategoryEnabled(category: keyof typeof FEATURE_FLAG_CATEGORIES): boolean {
  return getEnabledFeaturesInCategory(category).length > 0;
}
