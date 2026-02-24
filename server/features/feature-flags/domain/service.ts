// ============================================================================
// FEATURE FLAGS SERVICE - Business Logic Layer
// ============================================================================

import { logger } from '@server/infrastructure/observability';
import { FeatureFlagRepository } from '../infrastructure/repository';
import type {
  FeatureFlagConfig,
  FlagEvaluationContext,
  FlagEvaluationResult,
  UserTargeting,
  ABTestConfig
} from './types';
import type { NewFeatureFlag } from '@server/infrastructure/schema/feature_flags';

export class FeatureFlagService {
  private repository: FeatureFlagRepository;
  private userHashes: Map<string, number> = new Map();
  private static readonly MAX_USER_HASH_CACHE = 10_000;

  constructor(repository?: FeatureFlagRepository) {
    this.repository = repository || new FeatureFlagRepository();
  }

  // ============================================================================
  // FLAG MANAGEMENT
  // ============================================================================

  async createFlag(config: Omit<FeatureFlagConfig, 'id'>): Promise<FeatureFlagConfig> {
    const data: NewFeatureFlag = {
      name: config.name,
      description: config.description,
      enabled: config.enabled,
      rollout_percentage: config.rolloutPercentage,
      user_targeting: config.userTargeting,
      ab_test_config: config.abTestConfig,
      dependencies: config.dependencies,
      metadata: config.metadata,
    };

    const flag = await this.repository.create(data);

    logger.info({
      component: 'FeatureFlagService',
      flagName: flag.name,
      enabled: flag.enabled
    }, 'Feature flag created');

    return this.mapToConfig(flag);
  }

  async getFlag(flagName: string): Promise<FeatureFlagConfig | null> {
    const flag = await this.repository.findByName(flagName);
    if (!flag) return null;
    return this.mapToConfig(flag);
  }

  async getAllFlags(): Promise<FeatureFlagConfig[]> {
    const flags = await this.repository.findAll();
    return flags.map(flag => this.mapToConfig(flag));
  }

  async updateFlag(
    flagName: string,
    updates: Partial<Omit<FeatureFlagConfig, 'id'>>
  ): Promise<FeatureFlagConfig | null> {
    const flag = await this.repository.findByName(flagName);
    if (!flag) return null;

    const data: Partial<NewFeatureFlag> = {};
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.enabled !== undefined) data.enabled = updates.enabled;
    if (updates.rolloutPercentage !== undefined) data.rollout_percentage = updates.rolloutPercentage;
    if (updates.userTargeting !== undefined) data.user_targeting = updates.userTargeting;
    if (updates.abTestConfig !== undefined) data.ab_test_config = updates.abTestConfig;
    if (updates.dependencies !== undefined) data.dependencies = updates.dependencies;
    if (updates.metadata !== undefined) data.metadata = updates.metadata;

    const updated = await this.repository.update(flag.id, data);
    if (!updated) return null;

    logger.info({
      component: 'FeatureFlagService',
      flagName: updated.name,
      updates
    }, 'Feature flag updated');

    return this.mapToConfig(updated);
  }

  async deleteFlag(flagName: string): Promise<boolean> {
    const flag = await this.repository.findByName(flagName);
    if (!flag) return false;

    const deleted = await this.repository.delete(flag.id);

    if (deleted) {
      logger.info({
        component: 'FeatureFlagService',
        flagName
      }, 'Feature flag deleted');
    }

    return deleted;
  }

  async toggleFlag(flagName: string, enabled: boolean): Promise<FeatureFlagConfig | null> {
    return await this.updateFlag(flagName, { enabled });
  }

  async updateRolloutPercentage(
    flagName: string,
    percentage: number
  ): Promise<FeatureFlagConfig | null> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
    return await this.updateFlag(flagName, { rolloutPercentage: percentage });
  }

  // ============================================================================
  // FLAG EVALUATION
  // ============================================================================

  async isEnabled(
    flagName: string,
    context?: FlagEvaluationContext
  ): Promise<FlagEvaluationResult> {
    const flag = await this.repository.findByName(flagName);

    if (!flag) {
      logger.warn({
        component: 'FeatureFlagService',
        flagName
      }, 'Feature flag not found');

      return {
        enabled: false,
        reason: 'Flag not found'
      };
    }

    // If flag is disabled, return false
    if (!flag.enabled) {
      await this.recordEvaluation(flag.id, context?.userId, false);
      return {
        enabled: false,
        reason: 'Flag is disabled'
      };
    }

    // Check user targeting
    if (flag.user_targeting) {
      const targetingResult = this.evaluateUserTargeting(
        flag.user_targeting,
        context
      );
      if (targetingResult !== null) {
        await this.recordEvaluation(flag.id, context?.userId, targetingResult);
        return {
          enabled: targetingResult,
          reason: targetingResult ? 'User in include list' : 'User in exclude list'
        };
      }
    }

    // Check A/B test variant
    if (flag.ab_test_config && context?.userId) {
      const variant = this.getABTestVariant(
        context.userId,
        flag.ab_test_config
      );
      const enabled = variant !== 'control';
      await this.recordEvaluation(flag.id, context.userId, enabled, variant);
      return {
        enabled,
        variant,
        reason: `A/B test variant: ${variant}`
      };
    }

    // Check rollout percentage
    const enabled = this.evaluateRollout(
      flag.rollout_percentage,
      context?.userId
    );
    await this.recordEvaluation(flag.id, context?.userId, enabled);

    return {
      enabled,
      reason: enabled
        ? `User in rollout (${flag.rollout_percentage}%)`
        : `User not in rollout (${flag.rollout_percentage}%)`
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private evaluateUserTargeting(
    targeting: UserTargeting,
    context?: FlagEvaluationContext
  ): boolean | null {
    if (!context?.userId) return null;

    // Check exclude list first
    if (targeting.exclude?.includes(context.userId)) {
      return false;
    }

    // Check include list
    if (targeting.include?.includes(context.userId)) {
      return true;
    }

    // Check attributes
    if (targeting.attributes && context.userAttributes) {
      for (const [key, value] of Object.entries(targeting.attributes)) {
        if (context.userAttributes[key] !== value) {
          return false;
        }
      }
      return true;
    }

    return null;
  }

  private evaluateRollout(percentage: number, userId?: string): boolean {
    if (percentage === 0) return false;
    if (percentage === 100) return true;

    if (!userId) {
      // Random rollout for anonymous users
      return Math.random() * 100 < percentage;
    }

    // Consistent hash-based rollout for identified users
    const userHash = this.getUserHash(userId);
    return userHash < percentage;
  }

  private getUserHash(userId: string): number {
    if (this.userHashes.has(userId)) {
      return this.userHashes.get(userId)!;
    }

    // Simple hash function for consistent user bucketing
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to 0-99 range
    const normalizedHash = Math.abs(hash) % 100;

    // Evict oldest entries when cache exceeds limit
    if (this.userHashes.size >= FeatureFlagService.MAX_USER_HASH_CACHE) {
      const firstKey = this.userHashes.keys().next().value;
      if (firstKey !== undefined) this.userHashes.delete(firstKey);
    }

    this.userHashes.set(userId, normalizedHash);
    return normalizedHash;
  }

  private getABTestVariant(userId: string, config: ABTestConfig): string {
    const userHash = this.getUserHash(userId);
    let cumulative = 0;

    for (let i = 0; i < config.variants.length; i++) {
      const distribution = config.distribution[i];
      if (distribution !== undefined) {
        cumulative += distribution;
      }
      if (userHash < cumulative) {
        const variant = config.variants[i];
        return variant ?? 'control';
      }
    }

    const lastVariant = config.variants[config.variants.length - 1];
    return lastVariant ?? 'control';
  }

  private async recordEvaluation(
    flagId: string,
    userId: string | undefined,
    enabled: boolean,
    variant?: string
  ): Promise<void> {
    try {
      await this.repository.recordEvaluation({
        flag_id: flagId,
        user_id: userId ?? null,
        enabled,
        variant,
        evaluated_at: new Date()
      });
    } catch (error) {
      logger.error({
        component: 'FeatureFlagService',
        error
      }, 'Failed to record evaluation');
    }
  }

  private mapToConfig(flag: any): FeatureFlagConfig {
    return {
      id: flag.id,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      rolloutPercentage: flag.rollout_percentage,
      userTargeting: flag.user_targeting,
      abTestConfig: flag.ab_test_config,
      dependencies: flag.dependencies,
      metadata: flag.metadata
    };
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getAnalytics(flagName: string, startDate?: Date, endDate?: Date) {
    const flag = await this.repository.findByName(flagName);
    if (!flag) return null;

    const metrics = await this.repository.getMetrics(flag.id, startDate, endDate);
    const evaluations = await this.repository.getEvaluations(flag.id, { limit: 1000 });

    const totalEvaluations = evaluations.length;
    const enabledCount = evaluations.filter(e => e.enabled).length;
    const disabledCount = totalEvaluations - enabledCount;

    return {
      flagName: flag.name,
      enabled: flag.enabled,
      rolloutPercentage: flag.rollout_percentage,
      totalEvaluations,
      enabledCount,
      disabledCount,
      enabledPercentage: totalEvaluations > 0 ? (enabledCount / totalEvaluations) * 100 : 0,
      metrics
    };
  }
}
