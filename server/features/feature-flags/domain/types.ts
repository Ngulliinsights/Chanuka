// ============================================================================
// FEATURE FLAGS DOMAIN - Types and Interfaces
// ============================================================================

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

export interface UserTargeting {
  include?: string[];
  exclude?: string[];
  attributes?: Record<string, any>;
}

export interface ABTestConfig {
  variants: string[];
  distribution: number[];
  metrics: string[];
}

export interface FlagEvaluationContext {
  userId?: string;
  userAttributes?: Record<string, any>;
  environment?: string;
}

export interface FlagEvaluationResult {
  enabled: boolean;
  variant?: string;
  reason: string;
}

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
