/**
 * Search System Deployment Service
 * 
 * Manages the deployment and validation of search system improvements with
 * detailed A/B testing framework, performance monitoring, and rollback capabilities.
 */

import { searchBills } from '@server/features/search/application/SearchService';

const searchService = {
  async search(opts: { query: string; pagination: { page: number; limit: number } }) {
    const dto = await searchBills({ text: opts.query, pagination: opts.pagination });
    return { results: (dto.results ?? []).map((r: Record<string, unknown>) => ({ ...r, relevanceScore: (r as { relevanceScore?: number }).relevanceScore ?? 0 })), totalCount: dto.totalResults ?? 0 };
  }
};
import { logger } from '@server/infrastructure/observability/logger';


import { featureFlagsService } from '@/infrastructure/migration/feature-flags.service';

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
    // Fuse.js search engine deployment config
    this.deploymentConfigs.set('fuse-search', {
      component: 'fuse-search',
      rolloutStages: [1, 5, 10, 25, 50, 100],
      validationThresholds: {
        responseTimeP95: 100, // ms
        responseTimeP99: 200, // ms
        errorRate: 0.01, // 1%
        relevanceImprovement: 0.20 // 20%
      },
      rollbackTriggers: {
        errorRateThreshold: 0.02, // 2%
        responseTimeThreshold: 500, // ms
        relevanceDropThreshold: -0.05 // -5%
      }
    });

    // PostgreSQL full-text search deployment config
    this.deploymentConfigs.set('postgresql-fulltext', {
      component: 'postgresql-fulltext',
      rolloutStages: [1, 5, 10, 25, 50, 100],
      validationThresholds: {
        responseTimeP95: 80, // ms
        responseTimeP99: 150, // ms
        errorRate: 0.005, // 0.5%
        relevanceImprovement: 0.15 // 15%
      },
      rollbackTriggers: {
        errorRateThreshold: 0.015, // 1.5%
        responseTimeThreshold: 300, // ms
        relevanceDropThreshold: -0.10 // -10%
      }
    });

    // Simple matching optimization deployment config
    this.deploymentConfigs.set('simple-matching', {
      component: 'simple-matching',
      rolloutStages: [5, 15, 30, 60, 100],
      validationThresholds: {
        responseTimeP95: 50, // ms
        responseTimeP99: 100, // ms
        errorRate: 0.001, // 0.1%
        relevanceImprovement: 0.10 // 10%
      },
      rollbackTriggers: {
        errorRateThreshold: 0.005, // 0.5%
        responseTimeThreshold: 200, // ms
        relevanceDropThreshold: -0.05 // -5%
      }
    });
  }

  /**
   * Deploy search system improvements with A/B testing framework
   */
  async deploySearchImprovements(): Promise<void> {
    logger.info('🚀 Starting search system deployment with A/B testing framework');

    try {
      // Initialize feature flags for search components
      await this.initializeSearchFeatureFlags();

      // Establish performance baselines
      await this.establishPerformanceBaselines();

      // Start gradual rollout for each component
      const deploymentPromises = Array.from(this.deploymentConfigs.keys()).map(component =>
        this.deployComponent(component)
      );

      await Promise.all(deploymentPromises);

      logger.info('✅ Search system deployment initiated successfully');
    } catch (error) {
      logger.error('❌ Search system deployment failed:', error);
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

    logger.info(`🔄 Starting deployment for ${component}`, {
      stages: config.rolloutStages,
      thresholds: config.validationThresholds
    });

    for (const percentage of config.rolloutStages) {
      try {
        // Update feature flag rollout percentage
        await featureFlagsService.enableGradualRollout(`search-${component}`, percentage);

        logger.info(`📊 Deployed ${component} to ${percentage}% of traffic`);

        // Wait for metrics collection period
        await this.waitForMetricsCollection(component, percentage);

        // Validate deployment stage
        const validation = await this.validateDeploymentStage(component, percentage);

        // Store validation results
        this.storeValidationResult(component, validation);

        // Check if we should proceed or rollback
        if (validation.recommendation === 'rollback') {
          logger.warn(`🔄 Rolling back ${component} due to validation failure`);
          await this.rollbackComponent(component, validation);
          return;
        } else if (validation.recommendation === 'investigate') {
          logger.warn(`⚠️ ${component} requires investigation before proceeding`);
          // In production, this would pause deployment and alert the team
          await this.pauseDeployment(component, validation);
          return;
        }

        logger.info(`✅ ${component} validation passed for ${percentage}% rollout`);

        // Brief pause between stages for system stability
        if (percentage < 100) {
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second pause
        }
      } catch (error) {
        logger.error(`❌ Deployment failed for ${component} at ${percentage}%:`, error);
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

      logger.info(`📈 Baseline established for ${component}:`, {
        responseTimeP95: baseline.responseTime.p95,
        errorRate: baseline.errorRate,
        relevanceScore: baseline.relevanceScore
      });
    }
  }

  /**
   * Wait for sufficient metrics collection
   */
  private async waitForMetricsCollection(component: string, percentage: number): Promise<void> {
    // Collection time based on rollout percentage (more time for smaller percentages)
    const baseTime = 60000; // 1 minute base
    const scaleFactor = Math.max(1, 10 / percentage); // More time for smaller rollouts
    const collectionTime = Math.min(baseTime * scaleFactor, 300000); // Max 5 minutes

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

    // Validate response time P95
    if (currentMetrics.responseTime.p95 > config.validationThresholds.responseTimeP95) {
      issues.push({
        severity: 'high',
        category: 'performance',
        message: `P95 response time exceeds threshold`,
        metric: 'responseTimeP95',
        expected: config.validationThresholds.responseTimeP95,
        actual: currentMetrics.responseTime.p95
      });
    }

    // Validate response time P99
    if (currentMetrics.responseTime.p99 > config.validationThresholds.responseTimeP99) {
      issues.push({
        severity: 'medium',
        category: 'performance',
        message: `P99 response time exceeds threshold`,
        metric: 'responseTimeP99',
        expected: config.validationThresholds.responseTimeP99,
        actual: currentMetrics.responseTime.p99
      });
    }

    // Validate error rate
    if (currentMetrics.errorRate > config.validationThresholds.errorRate) {
      issues.push({
        severity: 'critical',
        category: 'reliability',
        message: `Error rate exceeds threshold`,
        metric: 'errorRate',
        expected: config.validationThresholds.errorRate,
        actual: currentMetrics.errorRate
      });
    }

    // Validate relevance improvement
    const relevanceImprovement = (currentMetrics.relevanceScore - baseline.relevanceScore) / baseline.relevanceScore;
    if (relevanceImprovement < config.validationThresholds.relevanceImprovement) {
      issues.push({
        severity: 'medium',
        category: 'relevance',
        message: `Relevance improvement below threshold`,
        metric: 'relevanceImprovement',
        expected: config.validationThresholds.relevanceImprovement,
        actual: relevanceImprovement
      });
    }

    // Check rollback triggers
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

    // Run performance tests
    for (const query of sampleQueries) {
      for (let i = 0; i < 10; i++) { // 10 iterations per query
        totalQueries++;
        const startTime = Date.now();

        try {
          const searchQuery = {
            query,
            pagination: { page: 1, limit: 20 }
          };

          const results = await searchService.search(searchQuery);
          const responseTime = Date.now() - startTime;
          measurements.push(responseTime);

          // Calculate relevance score based on results
          if (results.results.length > 0) {
            const avgRelevance = results.results.reduce((sum: number, r: { relevanceScore: number }) => sum + r.relevanceScore, 0) / results.results.length;
            relevanceScores.push(avgRelevance);
          }
        } catch (error) {
          errorCount++;
          logger.warn(`Search error for query "${query}":`, error);
        }
      }
    }

    // Calculate percentiles
    measurements.sort((a, b) => a - b);
    const p50 = this.calculatePercentile(measurements, 50);
    const p95 = this.calculatePercentile(measurements, 95);
    const p99 = this.calculatePercentile(measurements, 99);
    const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;

    const errorRate = errorCount / totalQueries;
    const throughput = totalQueries / (measurements.reduce((sum, val) => sum + val, 0) / 1000); // queries per second
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
        clickThroughRate: 0.15, // Simulated - would come from analytics
        searchAbandonmentRate: 0.08, // Simulated
        refinementRate: 0.25 // Simulated
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
    
    if (lower === upper) {
      return sortedArray[lower] ?? 0;
    }
    
    const weight = index - lower;
    return (sortedArray[lower] ?? 0) * (1 - weight) + (sortedArray[upper] ?? 0) * weight;
  }

  /**
   * Store validation result for historical tracking
   */
  private storeValidationResult(component: string, result: ValidationResult): void {
    const history = this.validationHistory.get(component) || [];
    history.push(result);
    
    // Keep only last 50 results
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.validationHistory.set(component, history);
  }

  /**
   * Rollback component to previous version
   */
  private async rollbackComponent(component: string, validation: ValidationResult): Promise<void> {
    logger.warn(`🔄 Initiating rollback for ${component}`, {
      reason: validation.issues.map(i => i.message),
      stage: validation.stage
    });

    try {
      // Disable feature flag to route traffic back to legacy implementation
      await featureFlagsService.rollbackFeature(`search-${component}`);

      // Wait for traffic to drain
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

      // Verify rollback success
      const postRollbackMetrics = await this.getCurrentMetrics(component);
      const baseline = this.performanceBaselines.get(component)!;

      const rollbackSuccess = 
        postRollbackMetrics.errorRate <= baseline.errorRate * 1.1 &&
        postRollbackMetrics.responseTime.p95 <= baseline.responseTime.p95 * 1.2;

      if (rollbackSuccess) {
        logger.info(`✅ Rollback successful for ${component}`);
      } else {
        logger.error(`❌ Rollback verification failed for ${component}`);
        // In production, this would trigger emergency alerts
      }
    } catch (error) {
      logger.error(`❌ Rollback failed for ${component}:`, error);
      throw error;
    }
  }

  /**
   * Pause deployment for investigation
   */
  private async pauseDeployment(component: string, validation: ValidationResult): Promise<void> {
    logger.warn(`⏸️ Pausing deployment for ${component} - investigation required`, {
      issues: validation.issues,
      stage: validation.stage
    });

    // In production, this would:
    // 1. Send alerts to the team
    // 2. Create incident tickets
    // 3. Pause automated rollout
    // 4. Maintain current rollout percentage until manual intervention
  }

  /**
   * Run data validation checkpoints between Phase 1 and Phase 2
   */
  async runDataValidationCheckpoints(): Promise<void> {
    logger.info('🔍 Running data validation checkpoints between Phase 1 and Phase 2');

    try {
      // Validate search index consistency
      await this.validateSearchIndexConsistency();

      // Validate cross-phase data integrity
      await this.validateCrossPhaseDataIntegrity();

      // Validate performance metrics alignment
      await this.validatePerformanceMetricsAlignment();

      logger.info('✅ Data validation checkpoints completed successfully');
    } catch (error) {
      logger.error('❌ Data validation checkpoints failed:', error);
      throw error;
    }
  }

  /**
   * Validate search index consistency
   */
  private async validateSearchIndexConsistency(): Promise<void> {
    logger.info('📊 Validating search index consistency');

    // Test queries to ensure all search engines return consistent results
    const testQueries = ['healthcare', 'budget', 'education'];
    
    for (const query of testQueries) {
      const searchQuery = { query, pagination: { page: 1, limit: 10 } };
      
      try {
        const results = await searchService.search(searchQuery);
        
        if (results.results.length === 0) {
          throw new Error(`No results returned for query: ${query}`);
        }
        
        // Validate result structure
        for (const result of results.results) {
          if (!result.id || !result.title || !result.type) {
            throw new Error(`Invalid result structure for query: ${query}`);
          }
        }
      } catch (error) {
        logger.error(`Search index validation failed for query "${query}":`, error);
        throw error;
      }
    }
  }

  /**
   * Validate cross-phase data integrity
   */
  private async validateCrossPhaseDataIntegrity(): Promise<void> {
    logger.info('🔗 Validating cross-phase data integrity');

    // Validate that Phase 1 utilities are working correctly with Phase 2 search
    // This ensures the concurrency utilities, query builder, and ML service
    // are compatible with the new search engines

    try {
      // Test concurrent search operations
      const concurrentSearches = Array(10).fill(0).map((_, i) => 
        searchService.search({ 
          query: `test query ${i}`, 
          pagination: { page: 1, limit: 5 } 
        })
      );

      const results = await Promise.all(concurrentSearches);
      
      // Validate all searches completed successfully
      if (results.some(r => r.results.length === 0 && r.totalCount === 0)) {
        logger.warn('Some concurrent searches returned empty results');
      }

      logger.info('✅ Cross-phase data integrity validation passed');
    } catch (error) {
      logger.error('❌ Cross-phase data integrity validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate performance metrics alignment
   */
  private async validatePerformanceMetricsAlignment(): Promise<void> {
    logger.info('📈 Validating performance metrics alignment');

    // Ensure Phase 1 and Phase 2 components are meeting performance targets together
    const systemMetrics = await this.measureSearchPerformance('system', 'current');
    
    const performanceTargets = {
      responseTimeP95: 100, // ms
      errorRate: 0.01, // 1%
      throughput: 100 // queries/second
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
  async getDeploymentStatus(): Promise<any> {
    const status: any = {};

    for (const component of this.deploymentConfigs.keys()) {
      const flag = featureFlagsService.getFlag(`search-${component}`);
      const history = this.validationHistory.get(component) || [];
      const latestValidation = history[history.length - 1];

      status[component] = {
        enabled: flag?.enabled || false,
        rolloutPercentage: flag?.rolloutPercentage || 0,
        lastValidation: latestValidation,
        validationHistory: history.slice(-5) // Last 5 validations
      };
    }

    return status;
  }

  /**
   * Generate deployment report
   */
  async generateDeploymentReport(): Promise<any> {
    const status = await this.getDeploymentStatus();
    const overallHealth = this.calculateOverallDeploymentHealth(status);

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
  private calculateOverallDeploymentHealth(status: Record<string, { lastValidation?: ValidationResult }>): 'healthy' | 'warning' | 'critical' {
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
  private generateRecommendations(status: unknown): string[] {
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
  private generateNextSteps(status: unknown): string[] {
    const nextSteps: string[] = [];
    
    const readyComponents = Object.entries(status as Record<string, any>)
      .filter(([_, s]: [string, any]) => s.rolloutPercentage < 100 && s.lastValidation?.passed)
      .map(([name, _]) => name);

    if (readyComponents.length > 0) {
      nextSteps.push(`Proceed with next rollout stage for: ${readyComponents.join(', ')}`);
    }

    nextSteps.push('Continue monitoring performance metrics');
    nextSteps.push('Run data validation checkpoints');

    return nextSteps;
  }
}

// Export singleton instance
export const searchDeploymentService = new SearchDeploymentService();


