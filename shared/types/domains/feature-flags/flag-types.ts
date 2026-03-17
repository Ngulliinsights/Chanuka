/**
 * Feature Flags Domain Types
 * 
 * Types for feature flag management, A/B testing, and rollout configuration.
 * Migrated from server/features/feature-flags/domain/types.ts
 * 
 * @module shared/types/domains/feature-flags/flag-types
 */

// ============================================================================
// Feature Flag Configuration
// ============================================================================

/**
 * Feature flag configuration
 * Defines a feature flag with enabled state, rollout percentage, and targeting
 */
export interface FeatureFlagConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  userTargeting?: UserTargeting;
  abTestConfig?: ABTestConfig;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

/**
 * User targeting rules
 * Specifies which users should be included/excluded from a feature
 */
export interface UserTargeting {
  include?: string[];
  exclude?: string[];
  attributes?: Record<string, any>;
}

/**
 * A/B test configuration
 * Defines variants and distribution for A/B testing
 */
export interface ABTestConfig {
  variants: string[];
  distribution: number[];
  metrics: string[];
}

// ============================================================================
// Flag Evaluation
// ============================================================================

/**
 * Flag evaluation context
 * Context provided when evaluating whether a flag is enabled
 */
export interface FlagEvaluationContext {
  userId?: string;
  userAttributes?: Record<string, any>;
  environment?: string;
}

/**
 * Flag evaluation result
 * Result of evaluating a feature flag
 */
export interface FlagEvaluationResult {
  enabled: boolean;
  variant?: string;
  reason: string;
}

// ============================================================================
// Metrics and Analytics
// ============================================================================

/**
 * Feature flag metrics
 * Performance and usage metrics for a feature flag
 */
export interface FlagMetrics {
  flagId: string;
  totalRequests: number;
  enabledRequests: number;
  disabledRequests: number;
  errorCount: number;
  avgResponseTime?: number;
  windowStart: Date;
  windowEnd: Date;
}
