/**
 * A/B Testing Framework for Migration Control
 * 
 * This framework provides a comprehensive testing infrastructure for managing feature
 * migrations through controlled experiments. It implements statistical significance testing,
 * cohort-based analysis, and user behavior tracking to ensure data-driven deployment decisions.
 * 
 * Key capabilities include:
 * - Automated cohort assignment and tracking for control vs treatment groups
 * - Statistical significance testing with configurable confidence levels
 * - Real-time metric aggregation and performance monitoring
 * - User behavior analysis including conversion rates and engagement metrics
 * - Automated rollout recommendations based on experimental outcomes
 */

import { ABTestingMetrics,featureFlagsService } from './feature-flags.service';

/**
 * Represents the aggregated metrics collected from a specific cohort during an experiment.
 * These metrics form the basis for statistical comparison between control and treatment groups.
 */
export interface CohortMetrics {
  component: string;
  cohort: 'control' | 'treatment';
  sampleSize: number;
  metrics: {
    responseTime: {
      mean: number;
      median: number;
      p95: number;
      p99: number;
      standardDeviation?: number;
    };
    errorRate: number;
    successRate: number;
    memoryUsage?: {
      mean: number;
      peak: number;
      standardDeviation?: number;
    };
  };
  userBehavior: {
    conversionRate: number;
    taskCompletionRate: number;
    userSatisfactionScore: number;
  };
  collectionPeriod: {
    startTime: Date;
    lastUpdate: Date;
  };
}

/**
 * Contains the results of statistical significance testing between cohorts.
 * This guides decision-making about whether to proceed with, expand, or rollback a migration.
 */
export interface StatisticalSignificanceResult {
  component: string;
  metric: string;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
  effectSize: number;
  controlMean: number;
  treatmentMean: number;
  improvement: number;
  recommendation: 'continue' | 'rollback' | 'expand';
  reasoning: string;
}

/**
 * Comprehensive user behavior analysis that captures how users interact with features
 * beyond simple performance metrics, providing insight into user experience quality.
 */
export interface BehaviorAnalysis {
  conversionRate: number;
  userSatisfaction: number;
  taskCompletionRate: number;
  engagementMetrics: {
    sessionDuration: number;
    pageViews: number;
    bounceRate: number;
  };
  sampleSize: number;
  dataQuality: {
    completeness: number;
    reliability: number;
  };
}

/**
 * Configuration options for statistical testing, allowing customization of
 * significance thresholds and minimum sample size requirements.
 */
interface StatisticalConfig {
  significanceLevel: number;
  minimumSampleSize: number;
  minimumEffectSize: number;
}

/**
 * Internal structure for tracking raw metric samples, enabling accurate
 * statistical calculations including standard deviation and percentiles.
 */
interface MetricSamples {
  responseTimes: number[];
  errorRates: number[];
  memoryUsages: number[];
  successRates: number[];
}

export class ABTestingService {
  private cohortMetrics: Map<string, CohortMetrics[]> = new Map();
  private userBehaviorData: Map<string, any[]> = new Map();
  private metricSamples: Map<string, Map<'control' | 'treatment', MetricSamples>> = new Map();

  private readonly defaultConfig: StatisticalConfig = {
    significanceLevel: 0.05,
    minimumSampleSize: 100,
    minimumEffectSize: 0.2
  };

  // Component to feature flag mapping for cleaner abstraction
  private readonly componentFlagMap: Record<string, string> = {
    'concurrency-adapter': 'utilities-concurrency-adapter',
    'query-builder': 'utilities-query-builder-migration',
    'ml-service': 'utilities-ml-service-migration'
  };

  /**
   * Determines whether a specific user should receive the migrated version of a component
   * based on the current A/B testing configuration and their cohort assignment.
   * 
   * This is the primary entry point for feature flag evaluation during runtime.
   */
  async shouldUseMigration(component: string, user_id: string): Promise<boolean> {
    try {
      const flagName = this.getComponentFlagName(component);
      return await featureFlagsService.shouldUseMigration(flagName, user_id);
    } catch (error) {
      console.error(`Error determining migration status for ${component}:`, error);
      // Fail closed - return false to use stable version
      return false;
    }
  }

  /**
   * Records performance and behavior metrics for a user interaction with a component.
   * This data is aggregated for statistical analysis and cohort comparison.
   * 
   * The method automatically determines the user's cohort and updates running statistics
   * for that cohort, enabling real-time monitoring of experiment progress.
   */
  async trackCohortMetrics(component: string, user_id: string, metrics: any): Promise<void> {
    try {
      const cohort = featureFlagsService.getUserCohort(user_id, component);

      const abMetrics: ABTestingMetrics = {
        component,
        user_id,
        cohort,
        metrics: {
          responseTime: metrics.responseTime || 0,
          errorRate: metrics.errorRate || 0,
          memoryUsage: metrics.memoryUsage,
          successRate: metrics.successRate !== undefined ? metrics.successRate : 1
        },
        timestamp: new Date()
      };

      // Record metrics in the feature flag service for persistence
      await featureFlagsService.recordMetrics(abMetrics);

      // Update local aggregates for fast statistical analysis
      await this.updateCohortAggregates(component, cohort, abMetrics);

      // Store raw samples for accurate statistical calculations
      this.storeMetricSamples(component, cohort, abMetrics.metrics);
    } catch (error) {
      console.error(`Error tracking cohort metrics for ${component}:`, error);
      // Continue execution - metrics tracking failures shouldn't break the application
    }
  }

  /**
   * Performs comprehensive statistical significance testing between control and treatment groups.
   * This analysis determines whether observed differences in metrics are statistically meaningful
   * or could be due to random chance.
   * 
   * The method tests multiple metrics including response time, error rate, and memory usage,
   * providing a holistic view of the migration's impact on system performance.
   */
  async calculateStatisticalSignificance(
    component: string,
    config: Partial<StatisticalConfig> = {}
  ): Promise<StatisticalSignificanceResult[]> {
    const effectiveConfig = { ...this.defaultConfig, ...config };

    try {
      const controlMetrics = await this.getCohortMetrics(component, 'control');
      const treatmentMetrics = await this.getCohortMetrics(component, 'treatment');

      if (!controlMetrics || !treatmentMetrics) {
        console.warn(`Insufficient cohort data for ${component}`);
        return [];
      }

      // Validate minimum sample size requirements for reliable statistics
      if (controlMetrics.sampleSize < effectiveConfig.minimumSampleSize ||
        treatmentMetrics.sampleSize < effectiveConfig.minimumSampleSize) {
        console.warn(`Sample sizes below minimum threshold for ${component}`);
        return [];
      }

      const results: StatisticalSignificanceResult[] = [];

      // Test response time - critical performance metric
      results.push(
        this.analyzeMetric(
          component,
          'responseTime',
          controlMetrics.metrics.responseTime.mean,
          treatmentMetrics.metrics.responseTime.mean,
          controlMetrics.sampleSize,
          treatmentMetrics.sampleSize,
          effectiveConfig,
          'lower-is-better'
        )
      );

      // Test error rate - reliability metric
      results.push(
        this.analyzeMetric(
          component,
          'errorRate',
          controlMetrics.metrics.errorRate,
          treatmentMetrics.metrics.errorRate,
          controlMetrics.sampleSize,
          treatmentMetrics.sampleSize,
          effectiveConfig,
          'lower-is-better'
        )
      );

      // Test success rate - user experience metric
      results.push(
        this.analyzeMetric(
          component,
          'successRate',
          controlMetrics.metrics.successRate,
          treatmentMetrics.metrics.successRate,
          controlMetrics.sampleSize,
          treatmentMetrics.sampleSize,
          effectiveConfig,
          'higher-is-better'
        )
      );

      // Test memory usage if available
      if (controlMetrics.metrics.memoryUsage && treatmentMetrics.metrics.memoryUsage) {
        results.push(
          this.analyzeMetric(
            component,
            'memoryUsage',
            controlMetrics.metrics.memoryUsage.mean,
            treatmentMetrics.metrics.memoryUsage.mean,
            controlMetrics.sampleSize,
            treatmentMetrics.sampleSize,
            effectiveConfig,
            'lower-is-better'
          )
        );
      }

      return results;
    } catch (error) {
      console.error(`Error calculating statistical significance for ${component}:`, error);
      return [];
    }
  }

  /**
   * Analyzes user behavior patterns to understand how the migration affects user experience
   * beyond raw performance metrics. This includes conversion rates, task completion,
   * and overall user satisfaction.
   */
  async getUserBehaviorAnalysis(component: string): Promise<BehaviorAnalysis> {
    try {
      const behaviorData = this.userBehaviorData.get(component) || [];

      if (behaviorData.length === 0) {
        return this.getEmptyBehaviorAnalysis();
      }

      const totalUsers = behaviorData.length;
      const conversions = behaviorData.filter(d => d.converted).length;
      const completedTasks = behaviorData.filter(d => d.taskCompleted).length;
      const bouncedUsers = behaviorData.filter(d => d.bounced).length;

      // Calculate satisfaction scores only from users who provided them
      const satisfactionScores = behaviorData
        .map(d => d.satisfactionScore)
        .filter(s => s !== undefined && s !== null);

      const avgSatisfaction = satisfactionScores.length > 0
        ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
        : 0;

      // Calculate data quality metrics to assess reliability
      const dataCompleteness = behaviorData.filter(d =>
        d.sessionDuration !== undefined && d.pageViews !== undefined
      ).length / totalUsers;

      return {
        conversionRate: conversions / totalUsers,
        userSatisfaction: avgSatisfaction,
        taskCompletionRate: completedTasks / totalUsers,
        engagementMetrics: {
          sessionDuration: this.calculateAverage(behaviorData, 'sessionDuration'),
          pageViews: this.calculateAverage(behaviorData, 'pageViews'),
          bounceRate: bouncedUsers / totalUsers
        },
        sampleSize: totalUsers,
        dataQuality: {
          completeness: dataCompleteness,
          reliability: satisfactionScores.length / totalUsers
        }
      };
    } catch (error) {
      console.error(`Error analyzing user behavior for ${component}:`, error);
      return this.getEmptyBehaviorAnalysis();
    }
  }

  /**
   * Records user behavior data for later analysis. This captures qualitative aspects
   * of user experience that complement quantitative performance metrics.
   */
  async recordUserBehavior(component: string, user_id: string, behaviorData: any): Promise<void> {
    try {
      const existing = this.userBehaviorData.get(component) || [];
      existing.push({
        user_id,
        timestamp: new Date(),
        ...behaviorData
      });
      this.userBehaviorData.set(component, existing);
    } catch (error) {
      console.error(`Error recording user behavior for ${component}:`, error);
    }
  }

  /**
   * Retrieves the aggregated metrics for a specific cohort. This is used internally
   * for statistical comparisons and reporting.
   */
  private async getCohortMetrics(
    component: string,
    cohort: 'control' | 'treatment'
  ): Promise<CohortMetrics | null> {
    const metrics = this.cohortMetrics.get(component) || [];
    return metrics.find(m => m.cohort === cohort) || null;
  }

  /**
   * Updates the running aggregates for a cohort with new metric data. This uses
   * incremental averaging to maintain efficiency while still providing accurate statistics.
   */
  private async updateCohortAggregates(
    component: string,
    cohort: 'control' | 'treatment',
    metrics: ABTestingMetrics
  ): Promise<void> {
    const existing = this.cohortMetrics.get(component) || [];
    let cohortMetrics = existing.find(m => m.cohort === cohort);

    const now = new Date();

    if (!cohortMetrics) {
      cohortMetrics = {
        component,
        cohort,
        sampleSize: 0,
        metrics: {
          responseTime: { mean: 0, median: 0, p95: 0, p99: 0, standardDeviation: 0 },
          errorRate: 0,
          successRate: 0,
          memoryUsage: { mean: 0, peak: 0, standardDeviation: 0 }
        },
        userBehavior: {
          conversionRate: 0,
          taskCompletionRate: 0,
          userSatisfactionScore: 0
        },
        collectionPeriod: {
          startTime: now,
          lastUpdate: now
        }
      };
      existing.push(cohortMetrics);
    }

    // Increment sample size before calculating new averages
    const n = ++cohortMetrics.sampleSize;

    // Update running averages using incremental mean formula: new_mean = old_mean + (new_value - old_mean) / n
    cohortMetrics.metrics.responseTime.mean =
      cohortMetrics.metrics.responseTime.mean +
      (metrics.metrics.responseTime - cohortMetrics.metrics.responseTime.mean) / n;

    cohortMetrics.metrics.errorRate =
      cohortMetrics.metrics.errorRate +
      (metrics.metrics.errorRate - cohortMetrics.metrics.errorRate) / n;

    cohortMetrics.metrics.successRate =
      cohortMetrics.metrics.successRate +
      (metrics.metrics.successRate - cohortMetrics.metrics.successRate) / n;

    // Update memory usage if provided
    if (metrics.metrics.memoryUsage && cohortMetrics.metrics.memoryUsage) {
      cohortMetrics.metrics.memoryUsage.mean =
        cohortMetrics.metrics.memoryUsage.mean +
        (metrics.metrics.memoryUsage - cohortMetrics.metrics.memoryUsage.mean) / n;

      cohortMetrics.metrics.memoryUsage.peak =
        Math.max(cohortMetrics.metrics.memoryUsage.peak, metrics.metrics.memoryUsage);
    }

    cohortMetrics.collectionPeriod.lastUpdate = now;
    this.cohortMetrics.set(component, existing);
  }

  /**
   * Stores raw metric samples for more accurate statistical calculations including
   * standard deviation and percentiles, which require access to the full distribution.
   */
  private storeMetricSamples(
    component: string,
    cohort: 'control' | 'treatment',
    metrics: any
  ): void {
    if (!this.metricSamples.has(component)) {
      this.metricSamples.set(component, new Map());
    }

    const componentSamples = this.metricSamples.get(component)!;
    if (!componentSamples.has(cohort)) {
      componentSamples.set(cohort, {
        responseTimes: [],
        errorRates: [],
        memoryUsages: [],
        successRates: []
      });
    }

    const samples = componentSamples.get(cohort)!;
    samples.responseTimes.push(metrics.responseTime);
    samples.errorRates.push(metrics.errorRate);
    samples.successRates.push(metrics.successRate);

    if (metrics.memoryUsage !== undefined) {
      samples.memoryUsages.push(metrics.memoryUsage);
    }
  }

  /**
   * Analyzes a single metric for statistical significance, providing detailed information
   * about the comparison including effect size and actionable recommendations.
   */
  private analyzeMetric(
    component: string,
    metric: string,
    controlMean: number,
    treatmentMean: number,
    controlSize: number,
    treatmentSize: number,
    config: StatisticalConfig,
    direction: 'lower-is-better' | 'higher-is-better'
  ): StatisticalSignificanceResult {
    const testResult = this.performTTest(controlMean, treatmentMean, controlSize, treatmentSize);
    const isSignificant = testResult.pValue < config.significanceLevel;

    // Calculate percentage improvement (positive means treatment is better)
    const improvement = direction === 'lower-is-better'
      ? ((controlMean - treatmentMean) / controlMean) * 100
      : ((treatmentMean - controlMean) / controlMean) * 100;

    const recommendation = this.determineRecommendation(
      testResult,
      improvement,
      config,
      direction
    );

    const reasoning = this.generateReasoning(
      metric,
      isSignificant,
      improvement,
      testResult.effectSize,
      recommendation
    );

    return {
      component,
      metric,
      pValue: testResult.pValue,
      isSignificant,
      confidenceLevel: 1 - config.significanceLevel,
      effectSize: testResult.effectSize,
      controlMean,
      treatmentMean,
      improvement,
      recommendation,
      reasoning
    };
  }

  /**
   * Performs Welch's t-test for comparing two sample means. This test is appropriate
   * when the two samples may have unequal variances, which is common in A/B testing.
   */
  private performTTest(
    mean1: number,
    mean2: number,
    n1: number,
    n2: number
  ): { pValue: number; effectSize: number } {
    // Estimate standard deviations assuming coefficient of variation of 0.15
    // In production, use actual calculated standard deviations from stored samples
    const std1 = mean1 * 0.15;
    const std2 = mean2 * 0.15;

    // Calculate Welch's t-statistic
    const variance1 = std1 * std1;
    const variance2 = std2 * std2;
    const standardError = Math.sqrt(variance1 / n1 + variance2 / n2);

    if (standardError === 0) {
      return { pValue: 1, effectSize: 0 };
    }

    const tStatistic = Math.abs(mean1 - mean2) / standardError;

    // Calculate Welch-Satterthwaite degrees of freedom
    const degreesOfFreedom = Math.pow(variance1 / n1 + variance2 / n2, 2) /
      (Math.pow(variance1 / n1, 2) / (n1 - 1) + Math.pow(variance2 / n2, 2) / (n2 - 1));

    // Approximate p-value using t-distribution CDF
    const pValue = 2 * (1 - this.tDistributionCDF(tStatistic, degreesOfFreedom));

    // Calculate Cohen's d for effect size
    const pooledStd = Math.sqrt((std1 * std1 + std2 * std2) / 2);
    const effectSize = pooledStd > 0 ? Math.abs(mean1 - mean2) / pooledStd : 0;

    return { pValue: Math.max(0, Math.min(1, pValue)), effectSize };
  }

  /**
   * Approximates the cumulative distribution function of the t-distribution.
   * This is a simplified implementation; production code should use a proper statistical library.
   */
  private tDistributionCDF(t: number, df: number): number {
    // Approximate using normal distribution for large degrees of freedom
    if (df > 30) {
      return this.normalCDF(t);
    }

    // Simplified approximation for smaller df
    const x = df / (df + t * t);
    return 1 - 0.5 * Math.pow(x, df / 2);
  }

  /**
   * Standard normal cumulative distribution function approximation.
   */
  private normalCDF(z: number): number {
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z);

    const t = 1 / (1 + 0.2316419 * z);
    const poly = ((((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.319381530) * t;

    return 0.5 + sign * (0.5 - Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) * poly);
  }

  /**
   * Determines the recommendation based on statistical test results and improvement metrics.
   * This provides actionable guidance for deployment decisions.
   */
  private determineRecommendation(
    testResult: { pValue: number; effectSize: number },
    improvement: number,
    config: StatisticalConfig,
    direction: 'lower-is-better' | 'higher-is-better'
  ): 'continue' | 'rollback' | 'expand' {
    // Not statistically significant - continue monitoring
    if (testResult.pValue >= config.significanceLevel) {
      return 'continue';
    }

    // Significant degradation - recommend rollback
    if (improvement < 0 && Math.abs(improvement) > 5) {
      return 'rollback';
    }

    // Significant improvement with large effect size - expand rollout
    if (improvement > 0 && testResult.effectSize >= config.minimumEffectSize) {
      return 'expand';
    }

    // Significant but small improvement - continue monitoring
    return 'continue';
  }

  /**
   * Generates human-readable reasoning for statistical test results to aid
   * in interpretation and decision-making.
   */
  private generateReasoning(
    metric: string,
    isSignificant: boolean,
    improvement: number,
    effectSize: number,
    recommendation: string
  ): string {
    if (!isSignificant) {
      return `No statistically significant difference detected in ${metric}. Continue monitoring to gather more data.`;
    }

    const direction = improvement > 0 ? 'improvement' : 'degradation';
    const magnitude = Math.abs(improvement).toFixed(2);

    if (recommendation === 'expand') {
      return `Significant ${direction} of ${magnitude}% in ${metric} with strong effect size (${effectSize.toFixed(2)}). Ready for expanded rollout.`;
    } else if (recommendation === 'rollback') {
      return `Significant degradation of ${magnitude}% in ${metric}. Recommend rollback to prevent user impact.`;
    } else {
      return `Statistically significant ${direction} of ${magnitude}% detected, but effect size (${effectSize.toFixed(2)}) suggests continued monitoring before expansion.`;
    }
  }

  /**
   * Helper method to calculate average of a specific field from an array of objects.
   */
  private calculateAverage(data: any[], field: string): number {
    const values = data.map(d => d[field]).filter(v => v !== undefined && v !== null);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  /**
   * Returns an empty behavior analysis structure for cases where no data is available.
   */
  private getEmptyBehaviorAnalysis(): BehaviorAnalysis {
    return {
      conversionRate: 0,
      userSatisfaction: 0,
      taskCompletionRate: 0,
      engagementMetrics: {
        sessionDuration: 0,
        pageViews: 0,
        bounceRate: 0
      },
      sampleSize: 0,
      dataQuality: {
        completeness: 0,
        reliability: 0
      }
    };
  }

  /**
   * Resolves a component name to its corresponding feature flag name using the mapping.
   */
  private getComponentFlagName(component: string): string {
    return this.componentFlagMap[component] || component;
  }
}

// Export a singleton instance for application-wide use
export const abTestingService = new ABTestingService();
