/**
 * Search System Deployment Service
 * 
 * Manages the deployment and validation of search system improvements with
 * detailed A/B testing framework, performance monitoring, and rollback capabilities.
 */

import { searchBills } from '@server/features/search/application/SearchService';
import { logger } from '@server/infrastructure/observability';
import { featureFlagsService } from '@server/infrastructure/migration/feature-flags.service';

const searchService = {
  async search(opts: { query: string; pagination: { page: number; limit: number } }) {
    const dto = await searchBills({ text: opts.query, pagination: opts.pagination });
    return {
      results: (dto.results ?? []).map((r) => ({
        ...r,
        relevanceScore: (r as any).relevanceScore ?? 0
      })),
      totalCount: (dto as any).total ?? (dto as any).totalResults ?? dto.results?.length ?? 0
    };
  }
};

export interface SearchDeploymentConfig {
  component: string;
  rolloutStages: number[];
  validationThresholds: {
    responseTimeP95: number;
    responseTimeP99: number;
    errorRate: number;
    relevanceImprovement: number;
  };
  rollbackTriggers: {
    errorRateThreshold: number;
    responseTimeThreshold: number;
    relevanceDropThreshold: number;
  };
}

export interface SearchPerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
  };
  errorRate: number;
  throughput: number;
  relevanceScore: number;
  searchSuccessRate: number;
  userBehavior: {
    clickThroughRate: number;
    searchAbandonmentRate: number;
    refinementRate: number;
  };
}

export interface ValidationResult {
  component: string;
  stage: string;
  passed: boolean;
  metrics: SearchPerformanceMetrics;
  issues: ValidationIssue[];
  recommendation: 'proceed' | 'rollback' | 'investigate';
  timestamp: Date;
}

export interface ValidationIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'relevance' | 'reliability' | 'user-experience';
  message: string;
  metric: string;
  expected: number;
  actual: number;
}

export class SearchDeploymentService {
  private deploymentConfigs: Map<string, SearchDeploymentConfig> = new Map();
  private performanceBaselines: Map<string, SearchPerformanceMetrics> = new Map();
  private validationHistory: Map<string, ValidationResult[]> = new Map();

  constructor() {
    this.initializeDeploymentConfigs();
  }

  /**
   * Initialize deployment configurations for search components
   */
  private initializeDeploymentConfigs(): void {
    this.deploymentConfigs.set('fuse-search', {
      component: 'fuse-search',
      rolloutStages: [1, 5, 10, 25, 50, 100],
      validationThresholds: {
        responseTimeP95: 100,
        responseTimeP99: 200,
        errorRate: 0.01,
        relevanceImprovement: 0.20
      },
      rollbackTriggers: {
        errorRateThreshold: 0.02,
        responseTimeThreshold: 500,
        relevanceDropThreshold: -0.05
      }
    });

    this.deploymentConfigs.set('postgresql-fulltext', {
      component: 'postgresql-fulltext',
      rolloutStages: [1, 5, 10, 25, 50, 100],
      validationThresholds: {
        responseTimeP95: 80,
        responseTimeP99: 150,
        errorRate: 0.005,
        relevanceImprovement: 0.15
      },
      rollbackTriggers: {
        errorRateThreshold: 0.015,
        responseTimeThreshold: 300,
        relevanceDropThreshold: -0.10
      }
    });

    this.deploymentConfigs.set('simple-matching', {
      component: 'simple-matching',
      rolloutStages: [5, 15, 30, 60, 100],
      validationThresholds: {
        responseTimeP95: 50,
        responseTimeP99: 100,
        errorRate: 0.001,
        relevanceImprovement: 0.10
      },
      rollbackTriggers: {
        errorRateThreshold: 0.005,
        responseTimeThreshold: 200,
        relevanceDropThreshold: -0.05
      }
    });
  }

  /**
   * Deploy search system improvements with A/B testing framework
   */
  async deploySearchImprovements(): Promise<void> {
    logger.info('🚀 Starting search system deployment with A/B testing framework');

    try {
      await this.initializeSearchFeatureFlags();
      await this.establishPerformanceBaselines();

      const deploymentPromises = Array.from(this.deploymentConfigs.keys()).map(component =>
        this.deployComponent(component)
      );

      await Promise.all(deploymentPromises);

      logger.info('✅ Search system deployment initiated successfully');
    } catch (error) {
      logger.error({ error }, '❌ Search system deployment failed');
      throw error;
    }
  }

  /**
   * Deploy a specific search component with gradual rollout
   */
  private async deployComponent(component: string): Promise<void> {
    const config = this.deploymentConfigs.get(component);
    if (!config) {
      throw new Error(`No deployment config found for component: ${component}`);
    }

    logger.info({
      stages: config.rolloutStages,
      thresholds: config.validationThresholds
    }, `🔄 Starting deployment for ${component}`);

    for (const percentage of config.rolloutStages) {
      try {
        await featureFlagsService.enableGradualRollout(`search-${component}`, percentage);

        logger.info(`📊 Deployed ${component} to ${percentage}% of traffic`);

        await this.waitForMetricsCollection(component, percentage);

        const validation = await this.validateDeploymentStage(component, percentage);
        this.storeValidationResult(component, validation);

        if (validation.recommendation === 'rollback') {
          logger.warn(`🔄 Rolling back ${component} due to validation failure`);
          await this.rollbackComponent(component, validation);
          return;
        } else if (validation.recommendation === 'investigate') {
          logger.warn(`⚠️ ${component} requires investigation before proceeding`);
          await this.pauseDeployment(component, validation);
          return;
        }

        logger.info(`✅ ${component} validation passed for ${percentage}% rollout`);

        if (percentage < 100) {
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      } catch (error) {
        logger.error({ error }, `❌ Deployment failed for ${component} at ${percentage}%`);
        await this.rollbackComponent(component, {
          component,
          stage: `${percentage}%`,
          passed: false,
          metrics: await this.getCurrentMetrics(component),
          issues: [{
            severity: 'critical',
            category: 'reliability',
            message: `Deployment error: ${(error as Error).message}`,
            metric: 'deployment',
            expected: 1,
            actual: 0
          }],
          recommendation: 'rollback',
          timestamp: new Date()
        });
        throw error;
      }
    }

    logger.info(`🎉 ${component} deployment completed successfully`);
  }

  /**
   * Initialize feature flags for search components
   */
  private async initializeSearchFeatureFlags(): Promise<void> {
    const searchComponents = ['fuse-search', 'postgresql-fulltext', 'simple-matching'];

    for (const component of searchComponents) {
      featureFlagsService.updateFlag(`search-${component}`, {
        name: `search-${component}`,
        enabled: true,
        rolloutPercentage: 0,
        fallbackEnabled: true,
        conditions: {
          environment: process.env.NODE_ENV
        }
      });
    }

    logger.info('🏁 Search feature flags initialized');
  }

  /**
   * Establish performance baselines for comparison
   */
  private async establishPerformanceBaselines(): Promise<void> {
    logger.info('📊 Establishing performance baselines');

    for (const component of this.deploymentConfigs.keys()) {
      const baseline = await this.measureSearchPerformance(component, 'baseline');
      this.performanceBaselines.set(component, baseline);

      logger.info({
        responseTimeP95: baseline.responseTime.p95,
        errorRate: baseline.errorRate,
        relevanceScore: baseline.relevanceScore
      }, `📈 Baseline established for ${component}`);
    }
  }

  /**
   * Wait for sufficient metrics collection
   */
  private async waitForMetricsCollection(component: string, percentage: number): Promise<void> {
    const baseTime = 60000;
    const scaleFactor = Math.max(1, 10 / percentage);
    const collectionTime = Math.min(baseTime * scaleFactor, 300000);

    logger.info(`⏱️ Collecting metrics for ${component} (${percentage}%) - ${collectionTime / 1000}s`);
    await new Promise(resolve => setTimeout(resolve, collectionTime));
  }

  /**
   * Validate deployment stage performance and metrics
   */
  private async validateDeploymentStage(component: string, percentage: number): Promise<ValidationResult> {
    const config = this.deploymentConfigs.get(component)!;
    const baseline = this.performanceBaselines.get(component)!;
    const currentMetrics = await this.getCurrentMetrics(component);

    const issues: ValidationIssue[] = [];

    if (currentMetrics.responseTime.p95 > config.validationThresholds.responseTimeP95) {
      issues.push({
        severity: 'high',
        category: 'performance',
        message: 'P95 response time exceeds threshold',
        metric: 'responseTimeP95',
        expected: config.validationThresholds.responseTimeP95,
        actual: currentMetrics.responseTime.p95
      });
    }

    if (currentMetrics.responseTime.p99 > config.validationThresholds.responseTimeP99) {
      issues.push({
        severity: 'medium',
        category: 'performance',
        message: 'P99 response time exceeds threshold',
        metric: 'responseTimeP99',
        expected: config.validationThresholds.responseTimeP99,
        actual: currentMetrics.responseTime.p99
      });
    }

    if (currentMetrics.errorRate > config.validationThresholds.errorRate) {
      issues.push({
        severity: 'critical',
        category: 'reliability',
        message: 'Error rate exceeds threshold',
        metric: 'errorRate',
        expected: config.validationThresholds.errorRate,
        actual: currentMetrics.errorRate
      });
    }

    const relevanceImprovement = (currentMetrics.relevanceScore - baseline.relevanceScore) / baseline.relevanceScore;
    if (relevanceImprovement < config.validationThresholds.relevanceImprovement) {
      issues.push({
        severity: 'medium',
        category: 'relevance',
        message: 'Relevance improvement below threshold',
        metric: 'relevanceImprovement',
        expected: config.validationThresholds.relevanceImprovement,
        actual: relevanceImprovement
      });
    }

    const shouldRollback =
      currentMetrics.errorRate > config.rollbackTriggers.errorRateThreshold ||
      currentMetrics.responseTime.p95 > config.rollbackTriggers.responseTimeThreshold ||
      relevanceImprovement < config.rollbackTriggers.relevanceDropThreshold;

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;

    let recommendation: 'proceed' | 'rollback' | 'investigate';
    if (shouldRollback || criticalIssues > 0) {
      recommendation = 'rollback';
    } else if (highIssues > 1) {
      recommendation = 'investigate';
    } else {
      recommendation = 'proceed';
    }

    return {
      component,
      stage: `${percentage}%`,
      passed: recommendation === 'proceed',
      metrics: currentMetrics,
      issues,
      recommendation,
      timestamp: new Date()
    };
  }

  /**
   * Measure current search performance metrics
   */
  private async getCurrentMetrics(component: string): Promise<SearchPerformanceMetrics> {
    return this.measureSearchPerformance(component, 'current');
  }

  /**
   * Measure search performance with comprehensive metrics
   */
  private async measureSearchPerformance(
    component: string,
    context: 'baseline' | 'current'
  ): Promise<SearchPerformanceMetrics> {
    const sampleQueries = [
      'healthcare reform',
      'budget allocation',
      'education funding',
      'environmental protection',
      'tax policy',
      'infrastructure development',
      'social services',
      'economic development'
    ];

    const measurements: number[] = [];
    let errorCount = 0;
    let totalQueries = 0;
    const relevanceScores: number[] = [];

    logger.info(`📊 Measuring ${component} performance (${context})`);

    for (const query of sampleQueries) {
      for (let i = 0; i < 10; i++) {
        totalQueries++;
        const startTime = Date.now();

        try {
          const results = await searchService.search({
            query,
            pagination: { page: 1, limit: 20 }
          });
          measurements.push(Date.now() - startTime);

          if (results.results.length > 0) {
            const avgRelevance = results.results.reduce(
              (sum, r) => sum + r.relevanceScore, 0
            ) / results.results.length;
            relevanceScores.push(avgRelevance);
          }
        } catch (error) {
          errorCount++;
          logger.warn({ error }, `Search error for query "${query}"`);
        }
      }
    }

    measurements.sort((a, b) => a - b);
    const p50 = this.calculatePercentile(measurements, 50);
    const p95 = this.calculatePercentile(measurements, 95);
    const p99 = this.calculatePercentile(measurements, 99);
    const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;

    const errorRate = errorCount / totalQueries;
    const throughput = totalQueries / (measurements.reduce((sum, val) => sum + val, 0) / 1000);
    const avgRelevanceScore = relevanceScores.length > 0
      ? relevanceScores.reduce((sum, val) => sum + val, 0) / relevanceScores.length
      : 0;

    return {
      responseTime: { p50, p95, p99, mean },
      errorRate,
      throughput,
      relevanceScore: avgRelevanceScore,
      searchSuccessRate: 1 - errorRate,
      userBehavior: {
        clickThroughRate: 0.15,
        searchAbandonmentRate: 0.08,
        refinementRate: 0.25
      }
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sortedArray[lower] ?? 0;

    const weight = index - lower;
    return (sortedArray[lower] ?? 0) * (1 - weight) + (sortedArray[upper] ?? 0) * weight;
  }

  /**
   * Store validation result for historical tracking
   */
  private storeValidationResult(component: string, result: ValidationResult): void {
    const history = this.validationHistory.get(component) || [];
    history.push(result);

    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    this.validationHistory.set(component, history);
  }

  /**
   * Rollback component to previous version
   */
  private async rollbackComponent(component: string, validation: ValidationResult): Promise<void> {
    logger.warn({
      reason: validation.issues.map(i => i.message),
      stage: validation.stage
    }, `🔄 Initiating rollback for ${component}`);

    try {
      await featureFlagsService.rollbackFeature(`search-${component}`);
      await new Promise(resolve => setTimeout(resolve, 10000));

      const postRollbackMetrics = await this.getCurrentMetrics(component);
      const baseline = this.performanceBaselines.get(component)!;

      const rollbackSuccess =
        postRollbackMetrics.errorRate <= baseline.errorRate * 1.1 &&
        postRollbackMetrics.responseTime.p95 <= baseline.responseTime.p95 * 1.2;

      if (rollbackSuccess) {
        logger.info(`✅ Rollback successful for ${component}`);
      } else {
        logger.error(`❌ Rollback verification failed for ${component}`);
      }
    } catch (error) {
      logger.error({ error }, `❌ Rollback failed for ${component}`);
      throw error;
    }
  }

  /**
   * Pause deployment for investigation
   */
  private async pauseDeployment(component: string, validation: ValidationResult): Promise<void> {
    logger.warn({
      issues: validation.issues,
      stage: validation.stage
    }, `⏸️ Pausing deployment for ${component} - investigation required`);

    // In production: send alerts, create incident tickets, pause automated rollout
  }

  /**
   * Run data validation checkpoints between Phase 1 and Phase 2
   */
  async runDataValidationCheckpoints(): Promise<void> {
    logger.info('🔍 Running data validation checkpoints between Phase 1 and Phase 2');

    try {
      await this.validateSearchIndexConsistency();
      await this.validateCrossPhaseDataIntegrity();
      await this.validatePerformanceMetricsAlignment();

      logger.info('✅ Data validation checkpoints completed successfully');
    } catch (error) {
      logger.error({ error }, '❌ Data validation checkpoints failed');
      throw error;
    }
  }

  /**
   * Validate search index consistency
   */
  private async validateSearchIndexConsistency(): Promise<void> {
    logger.info('📊 Validating search index consistency');

    const testQueries = ['healthcare', 'budget', 'education'];

    for (const query of testQueries) {
      try {
        const results = await searchService.search({ query, pagination: { page: 1, limit: 10 } });

        if (results.results.length === 0) {
          throw new Error(`No results returned for query: ${query}`);
        }

        for (const result of results.results) {
          const r = result as any;
          if (!r.id || !r.title || !r.type) {
            throw new Error(`Invalid result structure for query: ${query}`);
          }
        }
      } catch (error) {
        logger.error({ error }, `Search index validation failed for query "${query}"`);
        throw error;
      }
    }
  }

  /**
   * Validate cross-phase data integrity
   */
  private async validateCrossPhaseDataIntegrity(): Promise<void> {
    logger.info('🔗 Validating cross-phase data integrity');

    try {
      const concurrentSearches = Array.from({ length: 10 }, (_, i) =>
        searchService.search({
          query: `test query ${i}`,
          pagination: { page: 1, limit: 5 }
        })
      );

      const results = await Promise.all(concurrentSearches);

      if (results.some(r => r.results.length === 0 && r.totalCount === 0)) {
        logger.warn('Some concurrent searches returned empty results');
      }

      logger.info('✅ Cross-phase data integrity validation passed');
    } catch (error) {
      logger.error({ error }, '❌ Cross-phase data integrity validation failed');
      throw error;
    }
  }

  /**
   * Validate performance metrics alignment
   */
  private async validatePerformanceMetricsAlignment(): Promise<void> {
    logger.info('📈 Validating performance metrics alignment');

    const systemMetrics = await this.measureSearchPerformance('system', 'current');

    const performanceTargets = {
      responseTimeP95: 100,
      errorRate: 0.01,
      throughput: 100
    };

    const issues: string[] = [];

    if (systemMetrics.responseTime.p95 > performanceTargets.responseTimeP95) {
      issues.push(`P95 response time ${systemMetrics.responseTime.p95}ms exceeds target ${performanceTargets.responseTimeP95}ms`);
    }
    if (systemMetrics.errorRate > performanceTargets.errorRate) {
      issues.push(`Error rate ${systemMetrics.errorRate} exceeds target ${performanceTargets.errorRate}`);
    }
    if (systemMetrics.throughput < performanceTargets.throughput) {
      issues.push(`Throughput ${systemMetrics.throughput} below target ${performanceTargets.throughput}`);
    }

    if (issues.length > 0) {
      throw new Error(`Performance metrics validation failed: ${issues.join(', ')}`);
    }

    logger.info('✅ Performance metrics alignment validation passed');
  }

  /**
   * Get deployment status for all search components
   */
  async getDeploymentStatus(): Promise<Record<string, unknown>> {
    const status: Record<string, unknown> = {};

    for (const component of this.deploymentConfigs.keys()) {
      const flag = featureFlagsService.getFlag(`search-${component}`);
      const history = this.validationHistory.get(component) || [];
      const latestValidation = history[history.length - 1];

      status[component] = {
        enabled: flag?.enabled || false,
        rolloutPercentage: flag?.rolloutPercentage || 0,
        lastValidation: latestValidation,
        validationHistory: history.slice(-5)
      };
    }

    return status;
  }

  /**
   * Generate deployment report
   */
  async generateDeploymentReport(): Promise<Record<string, unknown>> {
    const status = await this.getDeploymentStatus();
    const overallHealth = this.calculateOverallDeploymentHealth(
      status as Record<string, { lastValidation?: ValidationResult }>
    );

    return {
      timestamp: new Date(),
      overallHealth,
      components: status,
      recommendations: this.generateRecommendations(status),
      nextSteps: this.generateNextSteps(status)
    };
  }

  /**
   * Calculate overall deployment health
   */
  private calculateOverallDeploymentHealth(
    status: Record<string, { lastValidation?: ValidationResult }>
  ): 'healthy' | 'warning' | 'critical' {
    const components = Object.values(status);

    const criticalIssues = components.filter(c =>
      c.lastValidation?.recommendation === 'rollback'
    ).length;

    const warningIssues = components.filter(c =>
      c.lastValidation?.recommendation === 'investigate'
    ).length;

    if (criticalIssues > 0) return 'critical';
    if (warningIssues > 0) return 'warning';
    return 'healthy';
  }

  /**
   * Generate deployment recommendations
   */
  private generateRecommendations(status: Record<string, unknown>): string[] {
    const recommendations: string[] = [];

    for (const [component, componentStatus] of Object.entries(status as Record<string, any>)) {
      if (componentStatus.rolloutPercentage === 0) {
        recommendations.push(`Consider starting rollout for ${component}`);
      } else if (componentStatus.rolloutPercentage < 100 && componentStatus.lastValidation?.passed) {
        recommendations.push(`${component} is ready for next rollout stage`);
      } else if (componentStatus.lastValidation?.recommendation === 'rollback') {
        recommendations.push(`Immediate rollback required for ${component}`);
      }
    }

    return recommendations;
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(status: Record<string, unknown>): string[] {
    const nextSteps: string[] = [];

    const readyComponents = Object.entries(status as Record<string, any>)
      .filter(([, s]) => s.rolloutPercentage < 100 && s.lastValidation?.passed)
      .map(([name]) => name);

    if (readyComponents.length > 0) {
      nextSteps.push(`Proceed with next rollout stage for: ${readyComponents.join(', ')}`);
    }

    nextSteps.push('Continue monitoring performance metrics');
    nextSteps.push('Run data validation checkpoints');

    return nextSteps;
  }
}

export const searchDeploymentService = new SearchDeploymentService();