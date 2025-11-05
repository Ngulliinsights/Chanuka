/**
 * Feature Flags Service for Migration Control
 * 
 * Provides feature flag functionality for controlling migration rollouts
 * with percentage-based routing and A/B testing capabilities.
 */

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userIds?: string[];
    userGroups?: string[];
    environment?: string;
  };
  fallbackEnabled: boolean;
}

export interface ABTestingMetrics {
  component: string;
  user_id: string;
  cohort: 'control' | 'treatment';
  metrics: {
    responseTime: number;
    errorRate: number;
    memoryUsage?: number;
    successRate: number;
  };
  timestamp: Date;
}

export class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userCohorts: Map<string, string> = new Map();

  constructor() {
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags(): void {
    // Initialize flags for Phase 1 utilities migration
    this.flags.set('utilities-concurrency-adapter', {
      name: 'utilities-concurrency-adapter',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true
    });

    this.flags.set('utilities-query-builder-migration', {
      name: 'utilities-query-builder-migration',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true
    });

    this.flags.set('utilities-ml-service-migration', {
      name: 'utilities-ml-service-migration',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true
    });
  }

  /**
   * Check if a feature should be enabled for a given user
   */
  async shouldUseMigration(flagName: string, user_id?: string): Promise<boolean> {
    const flag = this.flags.get(flagName);
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check environment conditions
    if (flag.conditions?.environment && flag.conditions.environment !== process.env.NODE_ENV) {
      return false;
    }

    // Check specific user IDs
    if (flag.conditions?.userIds && user_id && flag.conditions.userIds.includes(user_id)) {
      return true;
    }

    // Use percentage-based rollout with user hash for consistency
    if (user_id) {
      const userHash = this.hashUser(user_id);
      return userHash % 100 < flag.rolloutPercentage;
    }

    // For system-level operations without user context, use random percentage
    return Math.random() * 100 < flag.rolloutPercentage;
  }

  /**
   * Update feature flag configuration
   */
  updateFlag(flagName: string, updates: Partial<FeatureFlag>): void {
    const existingFlag = this.flags.get(flagName);
    if (existingFlag) {
      this.flags.set(flagName, { ...existingFlag, ...updates });
    } else {
      this.flags.set(flagName, {
        name: flagName,
        enabled: false,
        rolloutPercentage: 0,
        fallbackEnabled: true,
        ...updates
      });
    }
  }

  /**
   * Get current flag configuration
   */
  getFlag(flagName: string): FeatureFlag | undefined {
    return this.flags.get(flagName);
  }

  /**
   * Hash user ID for consistent cohort assignment
   */
  private hashUser(user_id: string): number {
    let hash = 0;
    for (let i = 0; i < user_id.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get user cohort for A/B testing
   */
  getUserCohort(user_id: string, component: string): 'control' | 'treatment' {
    const cohortKey = `${component}-${ user_id }`;
    if (this.userCohorts.has(cohortKey)) {
      return this.userCohorts.get(cohortKey) as 'control' | 'treatment';
    }

    const cohort = this.hashUser(user_id) % 2 === 0 ? 'control' : 'treatment';
    this.userCohorts.set(cohortKey, cohort);
    return cohort;
  }

  /**
   * Record A/B testing metrics
   */
  async recordMetrics(metrics: ABTestingMetrics): Promise<void> {
    // In a real implementation, this would store metrics in a database
    // For now, we'll log them for monitoring
    console.log(`[A/B Testing] ${metrics.component} - ${metrics.cohort}:`, {
      user_id: metrics.user_id,
      responseTime: metrics.metrics.responseTime,
      errorRate: metrics.metrics.errorRate,
      successRate: metrics.metrics.successRate,
      timestamp: metrics.timestamp
    });
  }

  /**
   * Enable gradual rollout for a feature
   */
  async enableGradualRollout(flagName: string, targetPercentage: number): Promise<void> {
    const flag = this.getFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }

    // Enable the flag and set the rollout percentage
    this.updateFlag(flagName, {
      enabled: true,
      rolloutPercentage: Math.min(100, Math.max(0, targetPercentage))
    });
  }

  /**
   * Disable feature and rollback to legacy implementation
   */
  async rollbackFeature(flagName: string): Promise<void> {
    const flag = this.getFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }

    this.updateFlag(flagName, {
      enabled: false,
      rolloutPercentage: 0
    });
  }
}

// Global instance
export const featureFlagsService = new FeatureFlagsService();