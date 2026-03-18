// ============================================================================
// FEATURE FLAGS API - Client API Layer
// ============================================================================

import type {
  FeatureFlag,
  CreateFlagRequest,
  UpdateFlagRequest,
  FlagAnalytics,
} from '../types';
import { apiFetchClient } from '@client/infrastructure/api/response-handler';

const API_BASE = '/api/feature-flags';

export const featureFlagsApi = {
  // Get all flags
  async getAllFlags(): Promise<FeatureFlag[]> {
    return apiFetchClient.get<FeatureFlag[]>(`${API_BASE}/flags`);
  },

  // Get single flag
  async getFlag(name: string): Promise<FeatureFlag> {
    return apiFetchClient.get<FeatureFlag>(`${API_BASE}/flags/${name}`);
  },

  // Create flag
  async createFlag(data: CreateFlagRequest): Promise<FeatureFlag> {
    return apiFetchClient.post<FeatureFlag>(`${API_BASE}/flags`, data);
  },

  // Update flag
  async updateFlag(name: string, data: UpdateFlagRequest): Promise<FeatureFlag> {
    return apiFetchClient.put<FeatureFlag>(`${API_BASE}/flags/${name}`, data);
  },

  // Delete flag
  async deleteFlag(name: string): Promise<void> {
    await apiFetchClient.delete(`${API_BASE}/flags/${name}`);
  },

  // Toggle flag
  async toggleFlag(name: string, enabled: boolean): Promise<FeatureFlag> {
    return apiFetchClient.post<FeatureFlag>(`${API_BASE}/flags/${name}/toggle`, { enabled });
  },

  // Update rollout percentage
  async updateRollout(name: string, percentage: number): Promise<FeatureFlag> {
    return apiFetchClient.post<FeatureFlag>(`${API_BASE}/flags/${name}/rollout`, { percentage });
  },

  // Get analytics
  async getAnalytics(name: string): Promise<FlagAnalytics> {
    return apiFetchClient.get<FlagAnalytics>(`${API_BASE}/flags/${name}/analytics`);
  },
};
