/**
 * Feature Flags Service Interface
 * 
 * Defines the contract for feature flag services used within shared/core
 * This avoids circular dependencies with server infrastructure
 */

export interface FeatureFlagsService {
  /**
   * Check if a migration feature should be used for a specific user
   */
  shouldUseMigration(flagName: string, user_id?: string): Promise<boolean>;
  
  /**
   * Update a feature flag configuration
   */
  updateFlag(flagName: string, updates: unknown): void;
  
  /**
   * Enable gradual rollout for a feature
   */
  enableGradualRollout(flagName: string, percentage: number): Promise<void>;
  
  /**
   * Rollback a feature to its previous state
   */
  rollbackFeature(flagName: string): Promise<void>;
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage: number;
  userWhitelist?: string[];
  userBlacklist?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Feature flag result with context
 */
export interface FeatureFlagResult {
  enabled: boolean;
  variant?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
}

/**
 * Mock implementation for testing and development
 */
export class MockFeatureFlagsService implements FeatureFlagsService {
  private flags: Map<string, FeatureFlagConfig> = new Map();

  async shouldUseMigration(flagName: string, user_id?: string): Promise<boolean> {
    const flag = this.flags.get(flagName);
    if (!flag?.enabled) {
      return false;
    }

    // Check whitelist/blacklist
    if (user_id) {
      if (flag.userBlacklist?.includes(user_id)) {
        return false;
      }
      if (flag.userWhitelist?.includes(user_id)) {
        return true;
      }
    }

    // Use rollout percentage
    if (user_id) {
      // Simple hash-based distribution
      const hash = this.hashUserId(user_id);
      return hash < flag.rolloutPercentage;
    }

    // Default behavior without user ID
    return flag.rolloutPercentage >= 100;
  }

  updateFlag(flagName: string, updates: Partial<FeatureFlagConfig>): void {
    const existing = this.flags.get(flagName) || {
      enabled: false,
      rolloutPercentage: 0
    };
    
    this.flags.set(flagName, { ...existing, ...updates });
  }

  async enableGradualRollout(flagName: string, percentage: number): Promise<void> {
    this.updateFlag(flagName, {
      enabled: true,
      rolloutPercentage: Math.max(0, Math.min(100, percentage))
    });
  }

  async rollbackFeature(flagName: string): Promise<void> {
    this.updateFlag(flagName, {
      enabled: false,
      rolloutPercentage: 0
    });
  }

  /**
   * Simple hash function for consistent user distribution
   */
  private hashUserId(user_id: string): number {
    let hash = 0;
    for (let i = 0; i < user_id.length; i++) {
      const char = user_id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Get all flags (for testing)
   */
  getAllFlags(): Map<string, FeatureFlagConfig> {
    return new Map(this.flags);
  }

  /**
   * Clear all flags (for testing)
   */
  clearFlags(): void {
    this.flags.clear();
  }
}


