/**
 * Feature Flags Service for Repository Migration
 * 
 * Provides feature flag management with:
 * - Percentage-based rollouts with gradual increase
 * - User-based targeting and cohort assignment
 * - Real-time flag updates and rollback capabilities
 * - Integration with A/B testing framework
 */

import { logger } from '../../../shared/core/src/index.js';
import { 
  AsyncServiceResult, 
  withResultHandling 
} from '../errors/result-adapter.js';

// Types for feature flags
export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetingRules: TargetingRule[];
  variants: FlagVariant[];
  defaultVariant: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  status: 'active' | 'inactive' | 'archived';
  tags: string[];
  metadata: Record<string, any>;
}

export interface TargetingRule {
  id: string;
  name: string;
  conditions: TargetingCondition[];
  rolloutPercentage: number;
  variant: string;
  enabled: boolean;
  priority: number;
}

export interface TargetingCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: any;
}

export interface FlagVariant {
  name: string;
  value: any;
  description?: string;
  weight?: number;
}

export interface UserContext {
  userId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  userType?: string;
  subscriptionTier?: string;
  registrationDate?: Date;
  customAttributes?: Record<string, any>;
}

export interface FlagEvaluation {
  flagName: string;
  enabled: boolean;
  variant: string;
  value: any;
  reason: string;
  ruleId?: string;
  evaluatedAt: Date;
  userContext: UserContext;
}

export interface RolloutConfig {
  flagName: string;
  stages: RolloutStage[];
  currentStage: number;
  autoAdvance: boolean;
  advanceConditions?: AdvanceCondition[];
  rollbackConditions?: RollbackCondition[];
}

export interface RolloutStage {
  name: string;
  percentage: number;
  duration?: number; // in minutes
  targetingRules?: TargetingRule[];
  successCriteria?: SuccessCriteria[];
}

export interface AdvanceCondition {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  evaluationPeriod: number; // in minutes
}

export interface RollbackCondition {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  evaluationPeriod: number; // in minutes
  severity: 'warning' | 'critical';
}

export interface SuccessCriteria {
  metric: string;
  target: number;
  operator: 'greater_than' | 'less_than' | 'equals';
}

export interface FlagMetrics {
  flagName: string;
  evaluations: number;
  uniqueUsers: number;
  variantDistribution: { [variant: string]: number };
  conversionRate?: number;
  errorRate?: number;
  performanceImpact?: {
    responseTime: number;
    errorCount: number;
  };
  timestamp: Date;
}

/**
 * Feature Flags Service
 * 
 * Manages feature flags for gradual rollouts and A/B testing
 * with comprehensive targeting and rollback capabilities.
 */
export class FeatureFlagsService {
  private static instance: FeatureFlagsService;
  private flags: Map<string, FeatureFlag> = new Map();
  private rolloutConfigs: Map<string, RolloutConfig> = new Map();
  private evaluationHistory: FlagEvaluation[] = [];
  private metrics: Map<string, FlagMetrics> = new Map();
  private readonly MAX_EVALUATION_HISTORY = 50000;

  static getInstance(): FeatureFlagsService {
    if (!FeatureFlagsService.instance) {
      FeatureFlagsService.instance = new FeatureFlagsService();
    }
    return FeatureFlagsService.instance;
  }

  constructor() {
    this.initializeDefaultFlags();
  }

  /**
   * Create a new feature flag
   */
  async createFlag(flagData: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): AsyncServiceResult<FeatureFlag> {
    return withResultHandling(async () => {
      const flag: FeatureFlag = {
        ...flagData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.validateFlag(flag);
      this.flags.set(flag.name, flag);

      logger.info('Feature flag created', {
        component: 'FeatureFlagsService',
        flagName: flag.name,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage
      });

      return flag;
    }, { service: 'FeatureFlagsService', operation: 'createFlag' });
  }

  /**
   * Update an existing feature flag
   */
  async updateFlag(flagName: string, updates: Partial<FeatureFlag>): AsyncServiceResult<FeatureFlag> {
    return withResultHandling(async () => {
      const existingFlag = this.flags.get(flagName);
      if (!existingFlag) {
        throw new Error(`Feature flag '${flagName}' not found`);
      }

      const updatedFlag: FeatureFlag = {
        ...existingFlag,
        ...updates,
        updatedAt: new Date()
      };

      this.validateFlag(updatedFlag);
      this.flags.set(flagName, updatedFlag);

      logger.info('Feature flag updated', {
        component: 'FeatureFlagsService',
        flagName,
        changes: Object.keys(updates)
      });

      return updatedFlag;
    }, { service: 'FeatureFlagsService', operation: 'updateFlag' });
  }

  /**
   * Evaluate a feature flag for a user
   */
  async evaluateFlag(flagName: string, userContext: UserContext): AsyncServiceResult<FlagEvaluation> {
    return withResultHandling(async () => {
      const flag = this.flags.get(flagName);
      if (!flag) {
        return this.createDefaultEvaluation(flagName, userContext, 'flag_not_found');
      }

      if (!flag.enabled || flag.status !== 'active') {
        return this.createDefaultEvaluation(flagName, userContext, 'flag_disabled');
      }

      // Check targeting rules first (highest priority)
      for (const rule of flag.targetingRules.sort((a, b) => b.priority - a.priority)) {
        if (rule.enabled && this.evaluateTargetingRule(rule, userContext)) {
          const shouldInclude = this.shouldIncludeUser(userContext.userId, rule.rolloutPercentage);
          if (shouldInclude) {
            const variant = flag.variants.find(v => v.name === rule.variant);
            const evaluation = {
              flagName,
              enabled: true,
              variant: rule.variant,
              value: variant?.value ?? true,
              reason: `targeting_rule:${rule.name}`,
              ruleId: rule.id,
              evaluatedAt: new Date(),
              userContext
            };
            
            this.recordEvaluation(evaluation);
            return evaluation;
          }
        }
      }

      // Check general rollout percentage
      const shouldInclude = this.shouldIncludeUser(userContext.userId, flag.rolloutPercentage);
      if (!shouldInclude) {
        return this.createDefaultEvaluation(flagName, userContext, 'not_in_rollout');
      }

      // Select variant based on weights
      const selectedVariant = this.selectVariant(flag.variants, userContext.userId);
      const evaluation = {
        flagName,
        enabled: true,
        variant: selectedVariant.name,
        value: selectedVariant.value,
        reason: 'rollout_percentage',
        evaluatedAt: new Date(),
        userContext
      };

      this.recordEvaluation(evaluation);
      return evaluation;
    }, { service: 'FeatureFlagsService', operation: 'evaluateFlag' });
  }

  /**
   * Enable gradual rollout for a feature flag
   */
  async enableGradualRollout(
    flagName: string, 
    targetPercentage: number,
    stages?: RolloutStage[]
  ): AsyncServiceResult<RolloutConfig> {
    return withResultHandling(async () => {
      const flag = this.flags.get(flagName);
      if (!flag) {
        throw new Error(`Feature flag '${flagName}' not found`);
      }

      const defaultStages: RolloutStage[] = stages || [
        { name: 'Initial', percentage: 1, duration: 30 },
        { name: 'Small', percentage: 5, duration: 60 },
        { name: 'Medium', percentage: 25, duration: 120 },
        { name: 'Large', percentage: 50, duration: 180 },
        { name: 'Full', percentage: targetPercentage, duration: 0 }
      ];

      const rolloutConfig: RolloutConfig = {
        flagName,
        stages: defaultStages,
        currentStage: 0,
        autoAdvance: true,
        advanceConditions: [
          {
            metric: 'error_rate',
            operator: 'less_than',
            threshold: 0.05, // 5% error rate
            evaluationPeriod: 15 // 15 minutes
          },
          {
            metric: 'response_time_p95',
            operator: 'less_than',
            threshold: 2000, // 2 seconds
            evaluationPeriod: 15
          }
        ],
        rollbackConditions: [
          {
            metric: 'error_rate',
            operator: 'greater_than',
            threshold: 0.1, // 10% error rate
            evaluationPeriod: 5,
            severity: 'critical'
          },
          {
            metric: 'response_time_p95',
            operator: 'greater_than',
            threshold: 5000, // 5 seconds
            evaluationPeriod: 5,
            severity: 'critical'
          }
        ]
      };

      this.rolloutConfigs.set(flagName, rolloutConfig);

      // Start with first stage
      await this.advanceToStage(flagName, 0);

      logger.info('Gradual rollout enabled', {
        component: 'FeatureFlagsService',
        flagName,
        targetPercentage,
        stages: defaultStages.length
      });

      return rolloutConfig;
    }, { service: 'FeatureFlagsService', operation: 'enableGradualRollout' });
  }

  /**
   * Advance to next rollout stage
   */
  async advanceRolloutStage(flagName: string): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      const rolloutConfig = this.rolloutConfigs.get(flagName);
      if (!rolloutConfig) {
        throw new Error(`No rollout config found for flag '${flagName}'`);
      }

      const nextStage = rolloutConfig.currentStage + 1;
      if (nextStage >= rolloutConfig.stages.length) {
        throw new Error(`Already at final stage for flag '${flagName}'`);
      }

      await this.advanceToStage(flagName, nextStage);
    }, { service: 'FeatureFlagsService', operation: 'advanceRolloutStage' });
  }

  /**
   * Rollback feature flag to previous stage or disable
   */
  async rollbackFlag(flagName: string, reason: string): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      const flag = this.flags.get(flagName);
      if (!flag) {
        throw new Error(`Feature flag '${flagName}' not found`);
      }

      const rolloutConfig = this.rolloutConfigs.get(flagName);
      
      if (rolloutConfig && rolloutConfig.currentStage > 0) {
        // Rollback to previous stage
        await this.advanceToStage(flagName, rolloutConfig.currentStage - 1);
        
        logger.warn('Feature flag rolled back to previous stage', {
          component: 'FeatureFlagsService',
          flagName,
          currentStage: rolloutConfig.currentStage,
          reason
        });
      } else {
        // Disable flag completely
        await this.updateFlag(flagName, { 
          enabled: false, 
          rolloutPercentage: 0 
        });
        
        logger.warn('Feature flag disabled due to rollback', {
          component: 'FeatureFlagsService',
          flagName,
          reason
        });
      }
    }, { service: 'FeatureFlagsService', operation: 'rollbackFlag' });
  }

  /**
   * Get feature flag metrics
   */
  async getFlagMetrics(flagName: string): AsyncServiceResult<FlagMetrics | null> {
    return withResultHandling(async () => {
      return this.metrics.get(flagName) || null;
    }, { service: 'FeatureFlagsService', operation: 'getFlagMetrics' });
  }

  /**
   * Get all active feature flags
   */
  async getActiveFlags(): AsyncServiceResult<FeatureFlag[]> {
    return withResultHandling(async () => {
      return Array.from(this.flags.values())
        .filter(flag => flag.status === 'active');
    }, { service: 'FeatureFlagsService', operation: 'getActiveFlags' });
  }

  /**
   * Get rollout status for a flag
   */
  async getRolloutStatus(flagName: string): AsyncServiceResult<RolloutConfig | null> {
    return withResultHandling(async () => {
      return this.rolloutConfigs.get(flagName) || null;
    }, { service: 'FeatureFlagsService', operation: 'getRolloutStatus' });
  }

  /**
   * Record performance metrics for a flag
   */
  async recordFlagMetrics(
    flagName: string, 
    metrics: {
      responseTime?: number;
      errorCount?: number;
      conversionRate?: number;
    }
  ): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      const existingMetrics = this.metrics.get(flagName);
      const evaluations = this.evaluationHistory.filter(e => e.flagName === flagName);
      
      const uniqueUsers = new Set(evaluations.map(e => e.userContext.userId)).size;
      const variantDistribution: { [variant: string]: number } = {};
      
      evaluations.forEach(evaluation => {
        variantDistribution[evaluation.variant] = (variantDistribution[evaluation.variant] || 0) + 1;
      });

      const updatedMetrics: FlagMetrics = {
        flagName,
        evaluations: evaluations.length,
        uniqueUsers,
        variantDistribution,
        conversionRate: metrics.conversionRate || existingMetrics?.conversionRate,
        errorRate: metrics.errorCount ? metrics.errorCount / evaluations.length : existingMetrics?.errorRate,
        performanceImpact: {
          responseTime: metrics.responseTime || existingMetrics?.performanceImpact?.responseTime || 0,
          errorCount: metrics.errorCount || existingMetrics?.performanceImpact?.errorCount || 0
        },
        timestamp: new Date()
      };

      this.metrics.set(flagName, updatedMetrics);

      // Check rollback conditions if rollout is active
      await this.checkRollbackConditions(flagName, updatedMetrics);
    }, { service: 'FeatureFlagsService', operation: 'recordFlagMetrics' });
  }

  // Private helper methods

  private initializeDefaultFlags(): void {
    // Initialize repository migration flags
    const repositoryMigrationFlags = [
      'repository-migration-users',
      'repository-migration-bills', 
      'repository-migration-comments',
      'repository-migration-notifications'
    ];

    repositoryMigrationFlags.forEach(flagName => {
      this.flags.set(flagName, {
        name: flagName,
        description: `Repository migration flag for ${flagName.split('-').pop()}`,
        enabled: false,
        rolloutPercentage: 0,
        targetingRules: [],
        variants: [
          { name: 'control', value: false, description: 'Legacy implementation' },
          { name: 'treatment', value: true, description: 'New direct Drizzle implementation' }
        ],
        defaultVariant: 'control',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        status: 'active',
        tags: ['repository-migration', 'phase-4'],
        metadata: {}
      });
    });
  }

  private validateFlag(flag: FeatureFlag): void {
    if (!flag.name || flag.name.trim().length === 0) {
      throw new Error('Flag name is required');
    }

    if (flag.rolloutPercentage < 0 || flag.rolloutPercentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    if (flag.variants.length === 0) {
      throw new Error('At least one variant is required');
    }

    const defaultVariantExists = flag.variants.some(v => v.name === flag.defaultVariant);
    if (!defaultVariantExists) {
      throw new Error('Default variant must exist in variants list');
    }
  }

  private evaluateTargetingRule(rule: TargetingRule, userContext: UserContext): boolean {
    return rule.conditions.every(condition => {
      const attributeValue = this.getAttributeValue(userContext, condition.attribute);
      return this.evaluateCondition(attributeValue, condition);
    });
  }

  private getAttributeValue(userContext: UserContext, attribute: string): any {
    switch (attribute) {
      case 'userId':
        return userContext.userId;
      case 'userType':
        return userContext.userType;
      case 'country':
        return userContext.country;
      case 'subscriptionTier':
        return userContext.subscriptionTier;
      case 'registrationDate':
        return userContext.registrationDate;
      default:
        return userContext.customAttributes?.[attribute];
    }
  }

  private evaluateCondition(attributeValue: any, condition: TargetingCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return attributeValue === condition.value;
      case 'not_equals':
        return attributeValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(attributeValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(attributeValue);
      case 'contains':
        return typeof attributeValue === 'string' && attributeValue.includes(condition.value);
      case 'starts_with':
        return typeof attributeValue === 'string' && attributeValue.startsWith(condition.value);
      case 'ends_with':
        return typeof attributeValue === 'string' && attributeValue.endsWith(condition.value);
      case 'greater_than':
        return Number(attributeValue) > Number(condition.value);
      case 'less_than':
        return Number(attributeValue) < Number(condition.value);
      default:
        return false;
    }
  }

  private shouldIncludeUser(userId: string, percentage: number): boolean {
    if (percentage === 0) return false;
    if (percentage === 100) return true;

    // Use consistent hashing to determine inclusion
    const hash = this.hashUserId(userId);
    const hashValue = parseInt(hash.substring(0, 8), 16) % 100;
    return hashValue < percentage;
  }

  private hashUserId(userId: string): string {
    // Simple hash function for consistent user assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private selectVariant(variants: FlagVariant[], userId: string): FlagVariant {
    if (variants.length === 1) {
      return variants[0];
    }

    // Calculate total weight
    const totalWeight = variants.reduce((sum, variant) => sum + (variant.weight || 1), 0);
    
    // Generate consistent random value for user
    const hash = this.hashUserId(userId);
    const randomValue = (parseInt(hash.substring(0, 8), 16) % 1000) / 1000; // 0-1
    
    // Select variant based on weights
    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += (variant.weight || 1) / totalWeight;
      if (randomValue <= cumulativeWeight) {
        return variant;
      }
    }

    // Fallback to first variant
    return variants[0];
  }

  private createDefaultEvaluation(
    flagName: string, 
    userContext: UserContext, 
    reason: string
  ): FlagEvaluation {
    const flag = this.flags.get(flagName);
    const defaultVariant = flag?.variants.find(v => v.name === flag.defaultVariant) || 
                          { name: 'default', value: false };

    const evaluation = {
      flagName,
      enabled: false,
      variant: defaultVariant.name,
      value: defaultVariant.value,
      reason,
      evaluatedAt: new Date(),
      userContext
    };

    this.recordEvaluation(evaluation);
    return evaluation;
  }

  private recordEvaluation(evaluation: FlagEvaluation): void {
    this.evaluationHistory.push(evaluation);
    
    // Trim history if it gets too large
    if (this.evaluationHistory.length > this.MAX_EVALUATION_HISTORY) {
      this.evaluationHistory = this.evaluationHistory.slice(-this.MAX_EVALUATION_HISTORY);
    }
  }

  private async advanceToStage(flagName: string, stageIndex: number): Promise<void> {
    const rolloutConfig = this.rolloutConfigs.get(flagName);
    if (!rolloutConfig) {
      throw new Error(`No rollout config found for flag '${flagName}'`);
    }

    if (stageIndex >= rolloutConfig.stages.length) {
      throw new Error(`Invalid stage index ${stageIndex} for flag '${flagName}'`);
    }

    const stage = rolloutConfig.stages[stageIndex];
    rolloutConfig.currentStage = stageIndex;

    // Update flag rollout percentage
    await this.updateFlag(flagName, { 
      rolloutPercentage: stage.percentage,
      enabled: true
    });

    logger.info('Advanced to rollout stage', {
      component: 'FeatureFlagsService',
      flagName,
      stage: stage.name,
      percentage: stage.percentage
    });

    // Schedule auto-advance if configured
    if (rolloutConfig.autoAdvance && stage.duration && stageIndex < rolloutConfig.stages.length - 1) {
      setTimeout(async () => {
        try {
          // Check advance conditions before auto-advancing
          const canAdvance = await this.checkAdvanceConditions(flagName);
          if (canAdvance) {
            await this.advanceRolloutStage(flagName);
          }
        } catch (error) {
          logger.error('Auto-advance failed', {
            component: 'FeatureFlagsService',
            flagName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }, stage.duration * 60 * 1000); // Convert minutes to milliseconds
    }
  }

  private async checkAdvanceConditions(flagName: string): Promise<boolean> {
    const rolloutConfig = this.rolloutConfigs.get(flagName);
    if (!rolloutConfig?.advanceConditions) {
      return true; // No conditions means auto-advance
    }

    const metrics = this.metrics.get(flagName);
    if (!metrics) {
      return false; // No metrics available
    }

    // Check all advance conditions
    for (const condition of rolloutConfig.advanceConditions) {
      const metricValue = this.getMetricValue(metrics, condition.metric);
      const conditionMet = this.evaluateMetricCondition(metricValue, condition);
      
      if (!conditionMet) {
        logger.warn('Advance condition not met', {
          component: 'FeatureFlagsService',
          flagName,
          metric: condition.metric,
          value: metricValue,
          threshold: condition.threshold,
          operator: condition.operator
        });
        return false;
      }
    }

    return true;
  }

  private async checkRollbackConditions(flagName: string, metrics: FlagMetrics): Promise<void> {
    const rolloutConfig = this.rolloutConfigs.get(flagName);
    if (!rolloutConfig?.rollbackConditions) {
      return;
    }

    for (const condition of rolloutConfig.rollbackConditions) {
      const metricValue = this.getMetricValue(metrics, condition.metric);
      const shouldRollback = this.evaluateMetricCondition(metricValue, condition);
      
      if (shouldRollback) {
        logger.error('Rollback condition triggered', {
          component: 'FeatureFlagsService',
          flagName,
          metric: condition.metric,
          value: metricValue,
          threshold: condition.threshold,
          severity: condition.severity
        });

        if (condition.severity === 'critical') {
          await this.rollbackFlag(flagName, `Critical condition: ${condition.metric} ${condition.operator} ${condition.threshold}`);
        }
      }
    }
  }

  private getMetricValue(metrics: FlagMetrics, metricName: string): number {
    switch (metricName) {
      case 'error_rate':
        return metrics.errorRate || 0;
      case 'response_time_p95':
        return metrics.performanceImpact?.responseTime || 0;
      case 'conversion_rate':
        return metrics.conversionRate || 0;
      case 'evaluations':
        return metrics.evaluations;
      case 'unique_users':
        return metrics.uniqueUsers;
      default:
        return 0;
    }
  }

  private evaluateMetricCondition(
    value: number, 
    condition: AdvanceCondition | RollbackCondition
  ): boolean {
    switch (condition.operator) {
      case 'greater_than':
        return value > condition.threshold;
      case 'less_than':
        return value < condition.threshold;
      case 'equals':
        return value === condition.threshold;
      default:
        return false;
    }
  }
}

// Export singleton instance
export const featureFlagsService = FeatureFlagsService.getInstance();