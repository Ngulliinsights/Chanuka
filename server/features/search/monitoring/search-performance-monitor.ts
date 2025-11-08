/**
 * Search Performance Monitor
 * 
 * Real-time monitoring of search performance with P99 tracking,
 * relevance measurement, and automated alerting for search system validation.
 */

import { logger  } from '../../../../shared/core/src/index.js';
import { searchService } from '../application/search-service.js';

export interface SearchMetrics {
  timestamp: Date;
  component: string;
  query: string;
  responseTime: number;
  resultCount: number;
  relevanceScore: number;
  errorOccurred: boolean;
  errorMessage?: string;
  userAgent?: string;
  user_id?: string;
}

export interface AggregatedMetrics {
  component: string;
  timeWindow: string;
  totalQueries: number;
  successfulQueries: number;
  errorRate: number;
  responseTime: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
  };
  relevance: {
    mean: number;
    median: number;
    improvement: number; // vs baseline
  };
  throughput: number; // queries per second
  userBehavior: {
    zeroResultQueries: number;
    refinementRate: number;
    averageResultsClicked: number;
  };
}

export interface PerformanceAlert {
  id: string;
  component: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface RelevanceTestCase {
  query: string;
  expectedResults: string[];
  weight: number;
  category: string;
}

export class SearchPerformanceMonitor {
  private metrics: Map<string, SearchMetrics[]> = new Map();
  private aggregatedMetrics: Map<string, AggregatedMetrics> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private baselines: Map<string, AggregatedMetrics> = new Map();
  private relevanceTestCases: RelevanceTestCase[] = [];

  private readonly METRICS_RETENTION_HOURS = 24;
  private readonly AGGREGATION_WINDOW_MINUTES = 5;
  private readonly P99_THRESHOLD_MS = 100;
  private readonly ERROR_RATE_THRESHOLD = 0.01; // 1%
  private readonly RELEVANCE_IMPROVEMENT_TARGET = 0.20; // 20%

  constructor() {
    this.initializeRelevanceTestCases();
    this.startMetricsAggregation();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize relevance test cases for objective measurement
   */
  private initializeRelevanceTestCases(): void {
    this.relevanceTestCases = [
      {
        query: 'healthcare reform',
        expectedResults: ['healthcare', 'medical', 'insurance', 'reform'],
        weight: 1.0,
        category: 'policy'
      },
      {
        query: 'budget allocation',
        expectedResults: ['budget', 'funding', 'allocation', 'spending'],
        weight: 1.0,
        category: 'finance'
      },
      {
        query: 'education funding',
        expectedResults: ['education', 'school', 'funding', 'student'],
        weight: 1.0,
        category: 'education'
      },
      {
        query: 'environmental protection',
        expectedResults: ['environment', 'protection', 'conservation', 'climate'],
        weight: 1.0,
        category: 'environment'
      },
      {
        query: 'tax policy',
        expectedResults: ['tax', 'taxation', 'policy', 'revenue'],
        weight: 1.0,
        category: 'taxation'
      },
      {
        query: 'infrastructure development',
        expectedResults: ['infrastructure', 'development', 'construction', 'roads'],
        weight: 0.8,
        category: 'infrastructure'
      },
      {
        query: 'social services',
        expectedResults: ['social', 'services', 'welfare', 'assistance'],
        weight: 0.8,
        category: 'social'
      },
      {
        query: 'economic development',
        expectedResults: ['economic', 'development', 'growth', 'business'],
        weight: 0.8,
        category: 'economy'
      }
    ];
  }

  /**
   * Record search performance metrics
   */
  async recordSearchMetrics(
    component: string,
    query: string,
    responseTime: number,
    resultCount: number,
    relevanceScore: number,
    errorOccurred: boolean = false,
    errorMessage?: string,
    user_id?: string
  ): Promise<void> {
    const metrics: SearchMetrics = {
      timestamp: new Date(),
      component,
      query,
      responseTime,
      resultCount,
      relevanceScore,
      errorOccurred,
      errorMessage,
      user_id
    };

    // Store metrics
    const componentMetrics = this.metrics.get(component) || [];
    componentMetrics.push(metrics);
    
    // Cleanup old metrics
    const cutoffTime = new Date(Date.now() - this.METRICS_RETENTION_HOURS * 60 * 60 * 1000);
    const filteredMetrics = componentMetrics.filter(m => m.timestamp > cutoffTime);
    
    this.metrics.set(component, filteredMetrics);

    // Check for immediate alerts
    await this.checkPerformanceAlerts(component, metrics);
  }

  /**
   * Start metrics aggregation process
   */
  private startMetricsAggregation(): void {
    setInterval(() => {
      this.aggregateMetrics();
    }, this.AGGREGATION_WINDOW_MINUTES * 60 * 1000);

    // Initial aggregation
    this.aggregateMetrics();
  }

  /**
   * Aggregate metrics for all components
   */
  private aggregateMetrics(): void {
    for (const [component, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;

      const windowStart = new Date(Date.now() - this.AGGREGATION_WINDOW_MINUTES * 60 * 1000);
      const windowMetrics = metrics.filter(m => m.timestamp > windowStart);

      if (windowMetrics.length === 0) continue;

      const aggregated = this.calculateAggregatedMetrics(component, windowMetrics);
      this.aggregatedMetrics.set(component, aggregated);

      logger.info(`📊 Aggregated metrics for ${component}:`, {
        totalQueries: aggregated.totalQueries,
        errorRate: aggregated.errorRate,
        p95ResponseTime: aggregated.responseTime.p95,
        p99ResponseTime: aggregated.responseTime.p99,
        meanRelevance: aggregated.relevance.mean
      });
    }
  }

  /**
   * Calculate aggregated metrics from raw metrics
   */
  private calculateAggregatedMetrics(component: string, metrics: SearchMetrics[]): AggregatedMetrics {
    const totalQueries = metrics.length;
    const successfulQueries = metrics.filter(m => !m.errorOccurred).length;
    const errorRate = (totalQueries - successfulQueries) / totalQueries;

    // Response time calculations
    const responseTimes = metrics
      .filter(m => !m.errorOccurred)
      .map(m => m.responseTime)
      .sort((a, b) => a - b);

    const responseTimeStats = {
      min: responseTimes.length > 0 ? responseTimes[0] : 0,
      max: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
      mean: responseTimes.length > 0 ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length : 0,
      median: this.calculatePercentile(responseTimes, 50),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99)
    };

    // Relevance calculations
    const relevanceScores = metrics
      .filter(m => !m.errorOccurred && m.relevanceScore > 0)
      .map(m => m.relevanceScore)
      .sort((a, b) => a - b);

    const meanRelevance = relevanceScores.length > 0 
      ? relevanceScores.reduce((sum, rs) => sum + rs, 0) / relevanceScores.length 
      : 0;

    const medianRelevance = this.calculatePercentile(relevanceScores, 50);

    // Calculate relevance improvement vs baseline
    const baseline = this.baselines.get(component);
    const relevanceImprovement = baseline 
      ? (meanRelevance - baseline.relevance.mean) / baseline.relevance.mean 
      : 0;

    // Throughput calculation (queries per second)
    const timeSpanSeconds = this.AGGREGATION_WINDOW_MINUTES * 60;
    const throughput = totalQueries / timeSpanSeconds;

    // User behavior metrics
    const zeroResultQueries = metrics.filter(m => m.resultCount === 0).length;
    const refinementRate = 0.25; // Simulated - would come from user analytics
    const averageResultsClicked = 1.8; // Simulated - would come from user analytics

    return {
      component,
      timeWindow: `${this.AGGREGATION_WINDOW_MINUTES}min`,
      totalQueries,
      successfulQueries,
      errorRate,
      responseTime: responseTimeStats,
      relevance: {
        mean: meanRelevance,
        median: medianRelevance,
        improvement: relevanceImprovement
      },
      throughput,
      userBehavior: {
        zeroResultQueries,
        refinementRate,
        averageResultsClicked
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
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Check for performance alerts
   */
  private async checkPerformanceAlerts(component: string, metrics: SearchMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // Check response time alert
    if (metrics.responseTime > this.P99_THRESHOLD_MS) {
      alerts.push({
        id: `${component}-response-time-${Date.now()}`,
        component,
        metric: 'responseTime',
        severity: metrics.responseTime > this.P99_THRESHOLD_MS * 2 ? 'critical' : 'high',
        threshold: this.P99_THRESHOLD_MS,
        currentValue: metrics.responseTime,
        message: `Response time ${metrics.responseTime}ms exceeds threshold ${this.P99_THRESHOLD_MS}ms`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check error alert
    if (metrics.errorOccurred) {
      alerts.push({
        id: `${component}-error-${Date.now()}`,
        component,
        metric: 'errorRate',
        severity: 'high',
        threshold: 0,
        currentValue: 1,
        message: `Search error occurred: ${metrics.errorMessage || 'Unknown error'}`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Store alerts
    for (const alert of alerts) {
      this.activeAlerts.set(alert.id, alert);
      logger.warn(`🚨 Performance alert: ${alert.message}`, {
        component: alert.component,
        severity: alert.severity,
        metric: alert.metric
      });
    }
  }

  /**
   * Start continuous performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      await this.runPerformanceChecks();
    }, 60000); // Check every minute
  }

  /**
   * Run comprehensive performance checks
   */
  private async runPerformanceChecks(): Promise<void> {
    for (const [component, aggregated] of this.aggregatedMetrics.entries()) {
      // Check P99 response time
      if (aggregated.responseTime.p99 > this.P99_THRESHOLD_MS) {
        await this.createAlert(
          component,
          'p99ResponseTime',
          'high',
          this.P99_THRESHOLD_MS,
          aggregated.responseTime.p99,
          `P99 response time ${aggregated.responseTime.p99}ms exceeds threshold`
        );
      }

      // Check error rate
      if (aggregated.errorRate > this.ERROR_RATE_THRESHOLD) {
        await this.createAlert(
          component,
          'errorRate',
          'critical',
          this.ERROR_RATE_THRESHOLD,
          aggregated.errorRate,
          `Error rate ${(aggregated.errorRate * 100).toFixed(2)}% exceeds threshold`
        );
      }

      // Check relevance improvement
      if (aggregated.relevance.improvement < this.RELEVANCE_IMPROVEMENT_TARGET) {
        await this.createAlert(
          component,
          'relevanceImprovement',
          'medium',
          this.RELEVANCE_IMPROVEMENT_TARGET,
          aggregated.relevance.improvement,
          `Relevance improvement ${(aggregated.relevance.improvement * 100).toFixed(2)}% below target`
        );
      }
    }
  }

  /**
   * Create performance alert
   */
  private async createAlert(
    component: string,
    metric: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    threshold: number,
    currentValue: number,
    message: string
  ): Promise<void> {
    const alertId = `${component}-${metric}-${Date.now()}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      component,
      metric,
      severity,
      threshold,
      currentValue,
      message,
      timestamp: new Date(),
      resolved: false
    };

    this.activeAlerts.set(alertId, alert);
    
    logger.warn(`🚨 Performance alert created:`, alert);
  }

  /**
   * Measure search relevance using test cases
   */
  async measureSearchRelevance(component: string): Promise<number> {
    let totalScore = 0;
    let totalWeight = 0;

    logger.info(`📊 Measuring search relevance for ${component}`);

    for (const testCase of this.relevanceTestCases) {
      try {
        const searchQuery = {
          query: testCase.query,
          pagination: { page: 1, limit: 10 }
        };

        const startTime = Date.now();
        const results = await searchService.search(searchQuery);
        const responseTime = Date.now() - startTime;

        // Calculate relevance score for this test case
        const relevanceScore = this.calculateRelevanceScore(results.results, testCase.expectedResults);
        
        totalScore += relevanceScore * testCase.weight;
        totalWeight += testCase.weight;

        // Record metrics
        await this.recordSearchMetrics(
          component,
          testCase.query,
          responseTime,
          results.results.length,
          relevanceScore,
          false,
          undefined,
          'relevance-test'
        );

        logger.debug(`Relevance test "${testCase.query}": ${relevanceScore.toFixed(3)}`);
      } catch (error) {
        logger.error(`Relevance test failed for "${testCase.query}":`, error);
        
        // Record error metrics
        await this.recordSearchMetrics(
          component,
          testCase.query,
          0,
          0,
          0,
          true,
          (error as Error).message,
          'relevance-test'
        );
      }
    }

    const overallRelevanceScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    logger.info(`📈 Overall relevance score for ${component}: ${overallRelevanceScore.toFixed(3)}`);
    
    return overallRelevanceScore;
  }

  /**
   * Calculate relevance score based on expected results
   */
  private calculateRelevanceScore(results: any[], expectedTerms: string[]): number {
    if (results.length === 0) return 0;

    let score = 0;
    const maxScore = expectedTerms.length;

    for (const result of results.slice(0, 5)) { // Check top 5 results
      const title = result.title.toLowerCase();
      const summary = (result.summary || '').toLowerCase();
      const content = `${title} ${summary}`;

      let termMatches = 0;
      for (const term of expectedTerms) {
        if (content.includes(term.toLowerCase())) {
          termMatches++;
        }
      }

      // Weight by position (first result gets full weight, subsequent results get less)
      const positionWeight = 1 / (results.indexOf(result) + 1);
      score += (termMatches / maxScore) * positionWeight;
    }

    return Math.min(1, score); // Cap at 1.0
  }

  /**
   * Set performance baseline for comparison
   */
  setBaseline(component: string, baseline: AggregatedMetrics): void {
    this.baselines.set(component, baseline);
    logger.info(`📊 Baseline set for ${component}:`, {
      responseTimeP95: baseline.responseTime.p95,
      errorRate: baseline.errorRate,
      relevanceMean: baseline.relevance.mean
    });
  }

  /**
   * Get current aggregated metrics
   */
  getCurrentMetrics(component: string): AggregatedMetrics | null {
    return this.aggregatedMetrics.get(component) || null;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      logger.info(`✅ Alert resolved: ${alert.message}`);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    const summary: any = {};

    for (const [component, metrics] of this.aggregatedMetrics.entries()) {
      const baseline = this.baselines.get(component);
      
      summary[component] = {
        current: metrics,
        baseline: baseline,
        improvements: baseline ? {
          responseTime: ((baseline.responseTime.p95 - metrics.responseTime.p95) / baseline.responseTime.p95) * 100,
          errorRate: ((baseline.errorRate - metrics.errorRate) / baseline.errorRate) * 100,
          relevance: metrics.relevance.improvement * 100
        } : null,
        alerts: this.getActiveAlerts().filter(a => a.component === component).length
      };
    }

    return summary;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): any {
    const summary = this.getPerformanceSummary();
    const activeAlerts = this.getActiveAlerts();

    return {
      timestamp: new Date(),
      summary,
      alerts: activeAlerts,
      recommendations: this.generateRecommendations(summary, activeAlerts),
      overallHealth: this.calculateOverallHealth(summary, activeAlerts)
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(summary: any, alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];

    // Check for critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push('Immediate attention required for critical performance issues');
    }

    // Check for components meeting targets
    for (const [component, data] of Object.entries(summary) as [string, any][]) {
      if (data.improvements) {
        if (data.improvements.relevance >= 20) {
          recommendations.push(`${component} has achieved 20%+ relevance improvement target`);
        }
        if (data.current.responseTime.p99 <= 100) {
          recommendations.push(`${component} is meeting P99 response time target`);
        }
      }
    }

    return recommendations;
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealth(summary: any, alerts: PerformanceAlert[]): 'healthy' | 'warning' | 'critical' {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;

    if (criticalAlerts > 0) return 'critical';
    if (highAlerts > 1) return 'warning';
    return 'healthy';
  }
}

// Export singleton instance
export const searchPerformanceMonitor = new SearchPerformanceMonitor();