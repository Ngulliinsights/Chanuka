// ============================================================================
// FEATURE FLAGS API - Client API Layer
// ============================================================================

import type {
  FeatureFlag,
  CreateFlagRequest,
  UpdateFlagRequest,
  FlagAnalytics,
} from '../types';

const API_BASE = '/api/feature-flags';

export const featureFlagsApi = {
  // Get all flags
  async getAllFlags(): Promise<FeatureFlag[]> {
    const response = await fetch(`${API_BASE}/flags`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch feature flags');
    }
    return response.json();
  },

  // Get single flag
  async getFlag(name: string): Promise<FeatureFlag> {
    const response = await fetch(`${API_BASE}/flags/${name}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch flag: ${name}`);
    }
    return response.json();
  },

  // Create flag
  async createFlag(data: CreateFlagRequest): Promise<FeatureFlag> {
    const response = await fetch(`${API_BASE}/flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create feature flag');
    }
    return response.json();
  },

  // Update flag
  async updateFlag(name: string, data: UpdateFlagRequest): Promise<FeatureFlag> {
    const response = await fetch(`${API_BASE}/flags/${name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update flag: ${name}`);
    }
    return response.json();
  },

  // Delete flag
  async deleteFlag(name: string): Promise<void> {
    const response = await fetch(`${API_BASE}/flags/${name}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete flag: ${name}`);
    }
  },

  // Toggle flag
  async toggleFlag(name: string, enabled: boolean): Promise<FeatureFlag> {
    const response = await fetch(`${API_BASE}/flags/${name}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) {
      throw new Error(`Failed to toggle flag: ${name}`);
    }
    return response.json();
  },

  // Update rollout percentage
  async updateRollout(name: string, percentage: number): Promise<FeatureFlag> {
    const response = await fetch(`${API_BASE}/flags/${name}/rollout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ percentage }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update rollout: ${name}`);
    }
    return response.json();
  },

  // Get analytics
  async getAnalytics(name: string): Promise<FlagAnalytics> {
    const response = await fetch(`${API_BASE}/flags/${name}/analytics`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${name}`);
    }
    return response.json();
  },
};
