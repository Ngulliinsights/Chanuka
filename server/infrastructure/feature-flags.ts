/**
 * Feature Flag Service for Migration Control
 * 
 * Provides percentage-based rollouts and A/B testing framework
 * for the WebSocket to Socket.IO migration.
 */

import { logger } from '@server/infrastructure/observability/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userIds?: string[];
    userGroups?: string[];
    environment?: string;
  };
  fallbackEnabled: boolean;
  description?: string;
}

interface MigrationMetrics {
  totalRequests: number;
  newImplementationRequests: number;
  legacyImplementationRequests: number;
  errorRate: number;
  averageResponseTime: number;
  lastUpdated: Date;
}

// ============================================================================
// FEATURE FLAG SERVICE
// ============================================================================

export class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private metrics: Map<string, MigrationMetrics> = new Map();
  private userHashes: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags for migration
   */
  private initializeDefaultFlags(): void {
    // WebSocket to Socket.IO migration flag
    this.setFlag('websocket_socketio_migration', {
      name: 'websocket_socketio_migration',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true,
      description: 'Migrate from WebSocket to Socket.IO service'
    });

    // Individual component migration flags
    this.setFlag('socketio_connection_handling', {
      name: 'socketio_connection_handling',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true,
      description: 'Use Socket.IO for connection handling'
    });

    this.setFlag('socketio_broadcasting', {
      name: 'socketio_broadcasting',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true,
      description: 'Use Socket.IO for message broadcasting'
    });

    this.setFlag('redis_adapter_enabled', {
      name: 'redis_adapter_enabled',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true,
      description: 'Enable Redis adapter for horizontal scaling'
    });

    logger.info('Feature flags initialized', {
      component: 'FeatureFlagService',
      flagCount: this.flags.size
    });
  }

  /**
   * Set or update a feature flag
   */
  setFlag(name: string, flag: FeatureFlag): void {
    this.flags.set(name, { ...flag, name });
    
    // Initialize metrics if not exists
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        totalRequests: 0,
        newImplementationRequests: 0,
        legacyImplementationRequests: 0,
        errorRate: 0,
        averageResponseTime: 0,
        lastUpdated: new Date()
      });
    }

    logger.info(`Feature flag updated: ${name}`, {
      component: 'FeatureFlagService',
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage
    });
  }

  /**
   * Get a feature flag
   */
  getFlag(name: string): FeatureFlag | null {
    return this.flags.get(name) || null;
  }

  /**
   * Check if a feature is enabled for a specific user
   */
  isEnabled(flagName: string, user_id?: string, _context?: unknown): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) {
      logger.warn(`Feature flag not found: ${flagName}`, {
        component: 'FeatureFlagService'
      });
      return false;
    }

    // If flag is disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // Check conditions first
    if (flag.conditions) {
      // Check user ID whitelist
      if (flag.conditions.userIds && user_id) {
        if (flag.conditions.userIds.includes(user_id)) {
          this.recordMetric(flagName, 'new');
          return true;
        }
      }

      // Check environment
      if (flag.conditions.environment) {
        const currentEnv = process.env.NODE_ENV || 'development';
        if (flag.conditions.environment !== currentEnv) {
          this.recordMetric(flagName, 'legacy');
          return false;
        }
      }
    }

    // If no user ID provided, use random percentage
    if (!user_id) {
      const random = Math.random() * 100;
      const enabled = random < flag.rolloutPercentage;
      this.recordMetric(flagName, enabled ? 'new' : 'legacy');
      return enabled;
    }

    // Use consistent hash-based rollout for user
    const userHash = this.getUserHash(user_id);
    const enabled = userHash < flag.rolloutPercentage;
    this.recordMetric(flagName, enabled ? 'new' : 'legacy');
    return enabled;
  }

  /**
   * Get consistent hash for user (0-99)
   */
  private getUserHash(user_id: string): number {
    if (this.userHashes.has(user_id)) {
      return this.userHashes.get(user_id)!;
    }

    // Simple hash function for consistent user bucketing
    let hash = 0;
    for (let i = 0; i < user_id.length; i++) {
      const char = user_id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to 0-99 range
    const normalizedHash = Math.abs(hash) % 100;
    this.userHashes.set(user_id, normalizedHash);
    return normalizedHash;
  }

  /**
   * Record metric for A/B testing analysis
   */
  private recordMetric(flagName: string, implementation: 'new' | 'legacy'): void {
    const metrics = this.metrics.get(flagName);
    if (!metrics) return;

    metrics.totalRequests++;
    if (implementation === 'new') {
      metrics.newImplementationRequests++;
    } else {
      metrics.legacyImplementationRequests++;
    }
    metrics.lastUpdated = new Date();

    this.metrics.set(flagName, metrics);
  }

  /**
   * Record error for error rate tracking
   */
  recordError(flagName: string, implementation: 'new' | 'legacy'): void {
    const metrics = this.metrics.get(flagName);
    if (!metrics) return;

    // Simple error rate calculation (errors per 100 requests)
    const currentErrorRate = metrics.errorRate;
    const totalRequests = metrics.totalRequests;
    const newErrorRate = ((currentErrorRate * totalRequests) + 1) / (totalRequests + 1);
    
    metrics.errorRate = newErrorRate;
    metrics.lastUpdated = new Date();

    this.metrics.set(flagName, metrics);

    logger.warn(`Error recorded for feature flag: ${flagName}`, {
      component: 'FeatureFlagService',
      implementation,
      errorRate: newErrorRate.toFixed(4)
    });
  }

  /**
   * Record response time for performance tracking
   */
  recordResponseTime(flagName: string, responseTime: number): void {
    const metrics = this.metrics.get(flagName);
    if (!metrics) return;

    // Simple moving average
    const currentAvg = metrics.averageResponseTime;
    const totalRequests = metrics.totalRequests;
    const newAvg = ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
    
    metrics.averageResponseTime = newAvg;
    metrics.lastUpdated = new Date();

    this.metrics.set(flagName, metrics);
  }

  /**
   * Update rollout percentage for gradual rollout
   */
  updateRolloutPercentage(flagName: string, percentage: number): void {
    const flag = this.flags.get(flagName);
    if (!flag) {
      logger.error(`Cannot update rollout: Feature flag not found: ${flagName}`, {
        component: 'FeatureFlagService'
      });
      return;
    }

    if (percentage < 0 || percentage > 100) {
      logger.error(`Invalid rollout percentage: ${percentage}`, {
        component: 'FeatureFlagService',
        flagName
      });
      return;
    }

    flag.rolloutPercentage = percentage;
    this.flags.set(flagName, flag);

    logger.info(`Rollout percentage updated: ${flagName} -> ${percentage}%`, {
      component: 'FeatureFlagService'
    });
  }

  /**
   * Enable or disable a feature flag
   */
  toggleFlag(flagName: string, enabled: boolean): void {
    const flag = this.flags.get(flagName);
    if (!flag) {
      logger.error(`Cannot toggle: Feature flag not found: ${flagName}`, {
        component: 'FeatureFlagService'
      });
      return;
    }

    flag.enabled = enabled;
    this.flags.set(flagName, flag);

    logger.info(`Feature flag toggled: ${flagName} -> ${enabled}`, {
      component: 'FeatureFlagService'
    });
  }

  /**
   * Get metrics for a feature flag
   */
  getMetrics(flagName: string): MigrationMetrics | null {
    return this.metrics.get(flagName) || null;
  }

  /**
   * Get all metrics for analysis
   */
  getAllMetrics(): Map<string, MigrationMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get statistical analysis for A/B testing
   */
  getStatisticalAnalysis(flagName: string): {
    flagName: string;
    totalRequests: number;
    newImplementationPercentage: number;
    legacyImplementationPercentage: number;
    errorRate: number;
    averageResponseTime: number;
    statisticalSignificance: boolean;
    confidenceLevel: number;
  } | null {
    const metrics = this.metrics.get(flagName);
    if (!metrics) return null;

    const newPercentage = metrics.totalRequests > 0 
      ? (metrics.newImplementationRequests / metrics.totalRequests) * 100 
      : 0;
    
    const legacyPercentage = metrics.totalRequests > 0 
      ? (metrics.legacyImplementationRequests / metrics.totalRequests) * 100 
      : 0;

    // Simple statistical significance check (requires at least 100 requests per variant)
    const minSampleSize = 100;
    const hasSignificance = metrics.newImplementationRequests >= minSampleSize && 
                           metrics.legacyImplementationRequests >= minSampleSize;

    // Confidence level based on sample size
    let confidenceLevel = 0;
    if (metrics.totalRequests >= 1000) {
      confidenceLevel = 95;
    } else if (metrics.totalRequests >= 500) {
      confidenceLevel = 90;
    } else if (metrics.totalRequests >= 200) {
      confidenceLevel = 80;
    }

    return {
      flagName,
      totalRequests: metrics.totalRequests,
      newImplementationPercentage: newPercentage,
      legacyImplementationPercentage: legacyPercentage,
      errorRate: metrics.errorRate,
      averageResponseTime: metrics.averageResponseTime,
      statisticalSignificance: hasSignificance,
      confidenceLevel
    };
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Reset metrics for a feature flag
   */
  resetMetrics(flagName: string): void {
    this.metrics.set(flagName, {
      totalRequests: 0,
      newImplementationRequests: 0,
      legacyImplementationRequests: 0,
      errorRate: 0,
      averageResponseTime: 0,
      lastUpdated: new Date()
    });

    logger.info(`Metrics reset for feature flag: ${flagName}`, {
      component: 'FeatureFlagService'
    });
  }

  /**
   * Check if automatic rollback should be triggered
   */
  shouldTriggerRollback(flagName: string): boolean {
    const metrics = this.metrics.get(flagName);
    if (!metrics) return false;

    // Trigger rollback if error rate > 1% or response time > 500ms
    const errorThreshold = 0.01; // 1%
    const responseTimeThreshold = 500; // 500ms

    if (metrics.errorRate > errorThreshold) {
      logger.warn(`Rollback triggered due to high error rate: ${flagName}`, {
        component: 'FeatureFlagService',
        errorRate: metrics.errorRate,
        threshold: errorThreshold
      });
      return true;
    }

    if (metrics.averageResponseTime > responseTimeThreshold) {
      logger.warn(`Rollback triggered due to high response time: ${flagName}`, {
        component: 'FeatureFlagService',
        responseTime: metrics.averageResponseTime,
        threshold: responseTimeThreshold
      });
      return true;
    }

    return false;
  }

  /**
   * Trigger automatic rollback
   */
  triggerRollback(flagName: string): void {
    const flag = this.flags.get(flagName);
    if (!flag) return;

    // Disable the flag and reset rollout percentage
    flag.enabled = false;
    flag.rolloutPercentage = 0;
    this.flags.set(flagName, flag);

    logger.error(`AUTOMATIC ROLLBACK TRIGGERED: ${flagName}`, {
      component: 'FeatureFlagService',
      metrics: this.getMetrics(flagName)
    });
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();
