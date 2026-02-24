// ============================================================================
// FEATURE FLAGS - Type Definitions
// ============================================================================

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userTargeting?: UserTargeting;
  abTestConfig?: ABTestConfig;
  dependencies: string[];
  metadata: {
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
  };
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

export interface FlagAnalytics {
  flagName: string;
  enabled: boolean;
  rolloutPercentage: number;
  totalEvaluations: number;
  enabledCount: number;
  disabledCount: number;
  enabledPercentage: number;
  metrics: any;
}

export interface CreateFlagRequest {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userTargeting?: UserTargeting;
  abTestConfig?: ABTestConfig;
  dependencies?: string[];
}

export interface UpdateFlagRequest {
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  userTargeting?: UserTargeting;
  abTestConfig?: ABTestConfig;
  dependencies?: string[];
}
