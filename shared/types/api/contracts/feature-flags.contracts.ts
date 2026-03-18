/**
 * Feature Flags API Contracts
 * Type-safe specifications for feature flag management endpoints
 */

import { ApiResponse } from './core.contracts';

// ============================================================================
// REQUEST CONTRACTS
// ============================================================================

export interface CreateFlagRequest {
  name: string;
  description?: string;
  enabled: boolean;
  type: 'BOOLEAN' | 'PERCENTAGE' | 'TARGETING';
  rollout?: number;
  targetingRules?: Array<{
    name: string;
    condition: string;
    percentage: number;
  }>;
  owner?: string;
}

export interface UpdateFlagRequest {
  description?: string;
  enabled?: boolean;
  type?: 'BOOLEAN' | 'PERCENTAGE' | 'TARGETING';
  rollout?: number;
  owner?: string;
}

export interface ToggleFlagRequest {
  enabled: boolean;
}

export interface UpdateRolloutRequest {
  percentage: number;
}

// ============================================================================
// RESPONSE CONTRACTS
// ============================================================================

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: 'BOOLEAN' | 'PERCENTAGE' | 'TARGETING';
  rollout: number;
  owner?: string;
  createdAt: string;
  updatedAt: string;
  targetingRules: Array<{
    id: string;
    name: string;
    condition: string;
    percentage: number;
  }>;
}

export interface FlagAnalytics {
  flagId: string;
  flagName: string;
  enabledCount: number;
  disabledCount: number;
  errorRate: number;
  avgLatency: number;
  lastUpdated: string;
}

// ============================================================================
// ENDPOINT RESPONSE TYPES
// ============================================================================

export type ListFlagsResponse = ApiResponse<FeatureFlag[]>;
export type GetFlagResponse = ApiResponse<FeatureFlag>;
export type CreateFlagResponse = ApiResponse<FeatureFlag>;
export type UpdateFlagResponse = ApiResponse<FeatureFlag>;
export type ToggleFlagResponse = ApiResponse<FeatureFlag>;
export type UpdateRolloutResponse = ApiResponse<FeatureFlag>;
export type GetFlagAnalyticsResponse = ApiResponse<FlagAnalytics>;
export type DeleteFlagResponse = ApiResponse<{ success: true }>;
