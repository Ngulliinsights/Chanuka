/**
 * A/B Testing Service for Repository Migration
 * 
 * Provides comprehensive A/B testing capabilities with:
 * - User hash-based routing and cohort tracking
 * - Statistical significance testing
 * - User behavior analysis and conversion tracking
 * - Real-time metrics collection and analysis
 */

import { logger  } from '../../../shared/core/src/index.js';
import { 
  AsyncServiceResult, 
  withResultHandling 
} from '../errors/result-adapter.js';

// Types for A/B testing
export interface ABTestConfig {
  testId: string;
  name: string;
  description: string;
  hypothesis: string;
  start_date: Date;
  end_date?: Date;
  trafficAllocation: {
    control: number; // Percentage (0-100)
    treatment: number; // Percentage (0-100)
  };
  primaryMetric: string;
  secondaryMetrics: string[];
  minimumSampleSize: number;
  significanceLevel: number; // Default 0.05
  statisticalPower: number; // Default 0.8
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
}

export interface UserCohort {
  user_id: string;
  cohortType: 'control' | 'treatment';
  assignmentTimestamp: Date;
  userHash: string;
  session_id?: string;
  metadata: Record<string, any>;
}

export interface MetricEvent {
  eventId: string;
  user_id: string;
  cohortType: 'control' | 'treatment';
  testId: string;
  metricName: string;
  value: number;
  timestamp: Date;
  session_id?: string;
  metadata: Record<string, any>;
}

export interface CohortPerformanceMetrics {
  cohortType: 'control' | 'treatment';
  userCount: number;
  metrics: {
    [metricName: string]: {
      count: number;
      sum: number;
      mean: number;
      median: number;
      standardDeviation: number;
      min: number;
      max: number;
      percentiles: {
        p25: number;
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
      };
    };
  };
  conversionMetrics: {
    conversionRate: number;
    conversionCount: number;
    totalUsers: number;
  };
  behaviorMetrics: {
    averageSessionDuration: number;
    bounceRate: number;
    pageViewsPerSession: number;
    taskCompletionRate: number;
    errorRate: number;
  };
  satisfactionMetrics: {
    averageRating: number;
    npsScore: number;
    feedbackCount: number;
  };
}

export interface StatisticalTestResult {
  testType: 'ttest' | 'mannwhitney' | 'chisquare' | 'fishers_exact';
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
  cohensD?: number;
  isSignificant: boolean;
  powerAnalysis: {
    observedPower: number;
    requiredSampleSize: number;
    actualSampleSize: number;
  };
  recommendation: 'continue' | 'stop_winner' | 'stop_no_effect' | 'extend_test';
}

export interface ABTestResults {
  testId: string;
  testName: string;
  status: 'running' | 'completed';
  duration: number; // in days
  totalUsers: number;
  cohortMetrics: {
    control: CohortPerformanceMetrics;
    treatment: CohortPerformanceMetrics;
  };
  statisticalResults: {
    primaryMetric: StatisticalTestResult;
    secondaryMetrics: { [metric: string]: StatisticalTestResult };
  };
  businessImpact: {
    relativeImprovement: number;
    absoluteImprovement: number;
    confidenceInterval: [number, number];
    projectedImpact: string;
  };
  recommendation: {
    decision: 'deploy' | 'rollback' | 'extend_test' | 'inconclusive';
    confidence: number;
    reasoning: string[];
    nextSteps: string[];
  };
}

export interface UserBehaviorEvent {
  eventId: string;
  user_id: string;
  session_id: string;
  eventType: 'page_view' | 'click' | 'form_submit' | 'error' | 'conversion' | 'task_completion';
  eventData: Record<string, any>;
  timestamp: Date;
  cohortType?: 'control' | 'treatment';
  testId?: string;
}

/**
 * A/B Testing Service
 * 
 * Manages comprehensive A/B testing for repository migration with
 * statistical rigor and user behavior tracking.
 */
export class ABTestingService {
  private static instance: ABTestingService;
  private activeTests: Map<string, ABTestConfig> = new Map();
  private userCohorts: Map<string, UserCohort> = new Map();
  private metricEvents: MetricEvent[] = [];
  private behaviorEvents: UserBehaviorEvent[] = [];
  private readonly MAX_EVENTS_HISTORY = 100000;

  static getInstance(): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService();
    }
    return ABTestingService.instance;
  }

  /**
   * Create and start a new A/B test
   */
  async createTest(config: Omit<ABTestConfig, 'status'>): AsyncServiceResult<ABTestConfig> {
    return withResultHandling(async () => {
      const testConfig: ABTestConfig = {
        ...config,
        status: 'draft'
      };

      // Validate test configuration
      this.validateTestConfig(testConfig);

      this.activeTests.set(testConfig.testId, testConfig);

      logger.info('A/B test created', {
        component: 'ABTestingService',
        testId: testConfig.testId,
        testName: testConfig.name
      });

      return testConfig;
    }, { service: 'ABTestingService', operation: 'createTest' });
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      const test = this.activeTests.get(testId);
      if (!test) {
        throw new Error(`Test ${testId} not found`);
      }

      if (test.status !== 'draft') {
        throw new Error(`Test ${testId} is not in draft status`);
      }

      test.status = 'running';
      test.start_date = new Date();

      logger.info('A/B test started', {
        component: 'ABTestingService',
        testId,
        testName: test.name
      });
    }, { service: 'ABTestingService', operation: 'startTest' });
  }

  /**
   * Assign user to cohort using consistent hashing
   */
  async assignUserToCohort(
    testId: string, 
    user_id: string, 
    session_id?: string,
    metadata: Record<string, any> = {}
  ): AsyncServiceResult<UserCohort> {
    return withResultHandling(async () => {
      const test = this.activeTests.get(testId);
      if (!test || test.status !== 'running') {
        throw new Error(`Test ${testId} is not running`);
      }

      // Check if user is already assigned
      const existingCohort = this.userCohorts.get(`${testId}_${user_id}`);
      if (existingCohort) {
        return existingCohort;
      }

      // Generate consistent hash for user
      const userHash = this.generateUserHash(user_id, testId);
      const hashValue = parseInt(userHash.substring(0, 8), 16) % 100;

      // Assign to cohort based on traffic allocation
      const cohortType: 'control' | 'treatment' = hashValue < test.trafficAllocation.control 
        ? 'control' 
        : 'treatment';

      const cohort: UserCohort = {
        user_id,
        cohortType,
        assignmentTimestamp: new Date(),
        userHash,
        session_id,
        metadata
      };

      this.userCohorts.set(`${testId}_${user_id}`, cohort);

      logger.debug('User assigned to cohort', {
        component: 'ABTestingService',
        testId,
        user_id,
        cohortType,
        userHash
      });

      return cohort;
    }, { service: 'ABTestingService', operation: 'assignUserToCohort' });
  }

  /**
   * Track metric event for A/B test
   */
  async trackMetricEvent(
    testId: string,
    user_id: string,
    metricName: string,
    value: number,
    metadata: Record<string, any> = {}
  ): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      const cohort = this.userCohorts.get(`${testId}_${user_id}`);
      if (!cohort) {
        // User not in test, skip tracking
        return;
      }

      const event: MetricEvent = {
        eventId: this.generateEventId(),
        user_id,
        cohortType: cohort.cohortType,
        testId,
        metricName,
        value,
        timestamp: new Date(),
        session_id: cohort.session_id,
        metadata
      };

      this.metricEvents.push(event);
      this.trimEventsHistory();

      logger.debug('Metric event tracked', {
        component: 'ABTestingService',
        testId,
        user_id,
        metricName,
        value,
        cohortType: cohort.cohortType
      });
    }, { service: 'ABTestingService', operation: 'trackMetricEvent' });
  }

  /**
   * Track user behavior event
   */
  async trackBehaviorEvent(
    user_id: string,
    session_id: string,
    eventType: UserBehaviorEvent['eventType'],
    eventData: Record<string, any> = {},
    testId?: string
  ): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      let cohortType: 'control' | 'treatment' | undefined;
      
      if (testId) {
        const cohort = this.userCohorts.get(`${testId}_${user_id}`);
        cohortType = cohort?.cohortType;
      }

      const event: UserBehaviorEvent = {
        eventId: this.generateEventId(),
        user_id,
        session_id,
        eventType,
        eventData,
        timestamp: new Date(),
        cohortType,
        testId
      };

      this.behaviorEvents.push(event);
      this.trimBehaviorEventsHistory();

      logger.debug('Behavior event tracked', {
        component: 'ABTestingService',
        user_id,
        session_id,
        eventType,
        cohortType,
        testId
      });
    }, { service: 'ABTestingService', operation: 'trackBehaviorEvent' });
  }

  /**
   * Get A/B test results with statistical analysis
   */
  async getTestResults(testId: string): AsyncServiceResult<ABTestResults> {
    return withResultHandling(async () => {
      const test = this.activeTests.get(testId);
      if (!test) {
        throw new Error(`Test ${testId} not found`);
      }

      // Calculate cohort metrics
      const controlMetrics = await this.calculateCohortMetrics(testId, 'control');
      const treatmentMetrics = await this.calculateCohortMetrics(testId, 'treatment');

      // Perform statistical analysis
      const primaryMetricResult = await this.performStatisticalTest(
        testId,
        test.primaryMetric,
        controlMetrics,
        treatmentMetrics
      );

      const secondaryMetricResults: { [metric: string]: StatisticalTestResult } = {};
      for (const metric of test.secondaryMetrics) {
        secondaryMetricResults[metric] = await this.performStatisticalTest(
          testId,
          metric,
          controlMetrics,
          treatmentMetrics
        );
      }

      // Calculate business impact
      const businessImpact = this.calculateBusinessImpact(
        controlMetrics,
        treatmentMetrics,
        test.primaryMetric
      );

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        primaryMetricResult,
        secondaryMetricResults,
        businessImpact,
        test
      );

      const duration = test.start_date ? 
        (Date.now() - test.start_date.getTime()) / (1000 * 60 * 60 * 24) : 0;

      const results: ABTestResults = {
        testId,
        testName: test.name,
        status: test.status === 'completed' ? 'completed' : 'running',
        duration,
        totalUsers: controlMetrics.userCount + treatmentMetrics.userCount,
        cohortMetrics: {
          control: controlMetrics,
          treatment: treatmentMetrics
        },
        statisticalResults: {
          primaryMetric: primaryMetricResult,
          secondaryMetrics: secondaryMetricResults
        },
        businessImpact,
        recommendation
      };

      return results;
    }, { service: 'ABTestingService', operation: 'getTestResults' });
  }

  /**
   * Track cohort metrics for deployment validation
   */
  async trackCohortMetrics(
    testId: string,
    user_id: string,
    metrics: {
      responseTime?: number;
      errorRate?: number;
      conversionRate?: number;
      satisfactionScore?: number;
      taskCompletionRate?: number;
    }
  ): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      // Track each metric as separate events
      for (const [metricName, value] of Object.entries(metrics)) {
        if (value !== undefined) {
          await this.trackMetricEvent(testId, user_id, metricName, value);
        }
      }
    }, { service: 'ABTestingService', operation: 'trackCohortMetrics' });
  }

  /**
   * Calculate statistical significance for A/B test
   */
  async calculateStatisticalSignificance(testId: string): AsyncServiceResult<StatisticalTestResult> {
    return withResultHandling(async () => {
      const test = this.activeTests.get(testId);
      if (!test) {
        throw new Error(`Test ${testId} not found`);
      }

      const controlMetrics = await this.calculateCohortMetrics(testId, 'control');
      const treatmentMetrics = await this.calculateCohortMetrics(testId, 'treatment');

      return await this.performStatisticalTest(
        testId,
        test.primaryMetric,
        controlMetrics,
        treatmentMetrics
      );
    }, { service: 'ABTestingService', operation: 'calculateStatisticalSignificance' });
  }

  /**
   * Get user behavior analysis
   */
  async getUserBehaviorAnalysis(testId: string): AsyncServiceResult<{
    conversionRate: number;
    userSatisfaction: number;
    taskCompletionRate: number;
    behaviorPatterns: any[];
  }> {
    return withResultHandling(async () => {
      const testEvents = this.behaviorEvents.filter(event => event.testId === testId);
      
      // Calculate conversion rate
      const conversionEvents = testEvents.filter(event => event.eventType === 'conversion');
      const uniqueUsers = new Set(testEvents.map(event => event.user_id)).size;
      const conversionRate = uniqueUsers > 0 ? conversionEvents.length / uniqueUsers : 0;

      // Calculate task completion rate
      const taskCompletionEvents = testEvents.filter(event => event.eventType === 'task_completion');
      const taskCompletionRate = uniqueUsers > 0 ? taskCompletionEvents.length / uniqueUsers : 0;

      // Calculate user satisfaction (from metric events)
      const satisfactionEvents = this.metricEvents.filter(
        event => event.testId === testId && event.metricName === 'satisfactionScore'
      );
      const userSatisfaction = satisfactionEvents.length > 0 
        ? satisfactionEvents.reduce((sum, event) => sum + event.value, 0) / satisfactionEvents.length
        : 0;

      // Analyze behavior patterns
      const behaviorPatterns = this.analyzeBehaviorPatterns(testEvents);

      return {
        conversionRate,
        userSatisfaction,
        taskCompletionRate,
        behaviorPatterns
      };
    }, { service: 'ABTestingService', operation: 'getUserBehaviorAnalysis' });
  }

  /**
   * Stop A/B test
   */
  async stopTest(testId: string, reason: string): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      const test = this.activeTests.get(testId);
      if (!test) {
        throw new Error(`Test ${testId} not found`);
      }

      test.status = 'completed';
      test.end_date = new Date();

      logger.info('A/B test stopped', {
        component: 'ABTestingService',
        testId,
        testName: test.name,
        reason
      });
    }, { service: 'ABTestingService', operation: 'stopTest' });
  }

  // Private helper methods

  private validateTestConfig(config: ABTestConfig): void {
    if (config.trafficAllocation.control + config.trafficAllocation.treatment > 100) {
      throw new Error('Traffic allocation cannot exceed 100%');
    }

    if (config.significanceLevel <= 0 || config.significanceLevel >= 1) {
      throw new Error('Significance level must be between 0 and 1');
    }

    if (config.statisticalPower <= 0 || config.statisticalPower >= 1) {
      throw new Error('Statistical power must be between 0 and 1');
    }

    if (config.minimumSampleSize <= 0) {
      throw new Error('Minimum sample size must be positive');
    }
  }

  private generateUserHash(user_id: string, testId: string): string {
    // Simple hash function for consistent user assignment
    const input = `${ user_id }_${testId}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trimEventsHistory(): void {
    if (this.metricEvents.length > this.MAX_EVENTS_HISTORY) {
      this.metricEvents = this.metricEvents.slice(-this.MAX_EVENTS_HISTORY);
    }
  }

  private trimBehaviorEventsHistory(): void {
    if (this.behaviorEvents.length > this.MAX_EVENTS_HISTORY) {
      this.behaviorEvents = this.behaviorEvents.slice(-this.MAX_EVENTS_HISTORY);
    }
  }

  private async calculateCohortMetrics(
    testId: string, 
    cohortType: 'control' | 'treatment'
  ): Promise<CohortPerformanceMetrics> {
    const cohortUsers = Array.from(this.userCohorts.values())
      .filter(cohort => cohort.cohortType === cohortType);
    
    const cohortEvents = this.metricEvents.filter(
      event => event.testId === testId && event.cohortType === cohortType
    );

    const behaviorEvents = this.behaviorEvents.filter(
      event => event.testId === testId && event.cohortType === cohortType
    );

    // Calculate metrics for each metric type
    const metrics: { [metricName: string]: any } = {};
    const metricNames = [...new Set(cohortEvents.map(event => event.metricName))];

    for (const metricName of metricNames) {
      const metricValues = cohortEvents
        .filter(event => event.metricName === metricName)
        .map(event => event.value)
        .sort((a, b) => a - b);

      if (metricValues.length > 0) {
        metrics[metricName] = {
          count: metricValues.length,
          sum: metricValues.reduce((sum, val) => sum + val, 0),
          mean: metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length,
          median: this.calculatePercentile(metricValues, 50),
          standardDeviation: this.calculateStandardDeviation(metricValues),
          min: metricValues[0],
          max: metricValues[metricValues.length - 1],
          percentiles: {
            p25: this.calculatePercentile(metricValues, 25),
            p50: this.calculatePercentile(metricValues, 50),
            p75: this.calculatePercentile(metricValues, 75),
            p90: this.calculatePercentile(metricValues, 90),
            p95: this.calculatePercentile(metricValues, 95),
            p99: this.calculatePercentile(metricValues, 99)
          }
        };
      }
    }

    // Calculate conversion metrics
    const conversionEvents = behaviorEvents.filter(event => event.eventType === 'conversion');
    const uniqueUsers = new Set(behaviorEvents.map(event => event.user_id));
    
    const conversionMetrics = {
      conversionRate: uniqueUsers.size > 0 ? conversionEvents.length / uniqueUsers.size : 0,
      conversionCount: conversionEvents.length,
      totalUsers: uniqueUsers.size
    };

    // Calculate behavior metrics
    const sessionDurations = behaviorEvents
      .reduce((sessions, event) => {
        if (!sessions[event.session_id]) {
          sessions[event.session_id] = { start: event.timestamp, end: event.timestamp };
        } else {
          if (event.timestamp < sessions[event.session_id].start) {
            sessions[event.session_id].start = event.timestamp;
          }
          if (event.timestamp > sessions[event.session_id].end) {
            sessions[event.session_id].end = event.timestamp;
          }
        }
        return sessions;
      }, {} as { [session_id: string]: { start: Date; end: Date } });

    const avgSessionDuration = Object.values(sessionDurations).length > 0
      ? Object.values(sessionDurations)
          .map(session => session.end.getTime() - session.start.getTime())
          .reduce((sum, duration) => sum + duration, 0) / Object.values(sessionDurations).length
      : 0;

    const taskCompletionEvents = behaviorEvents.filter(event => event.eventType === 'task_completion');
    const errorEvents = behaviorEvents.filter(event => event.eventType === 'error');

    const behaviorMetrics = {
      averageSessionDuration: avgSessionDuration / 1000, // Convert to seconds
      bounceRate: 0, // Would need more sophisticated calculation
      pageViewsPerSession: 0, // Would need page view events
      taskCompletionRate: uniqueUsers.size > 0 ? taskCompletionEvents.length / uniqueUsers.size : 0,
      errorRate: behaviorEvents.length > 0 ? errorEvents.length / behaviorEvents.length : 0
    };

    // Calculate satisfaction metrics
    const satisfactionEvents = cohortEvents.filter(event => event.metricName === 'satisfactionScore');
    const satisfactionMetrics = {
      averageRating: satisfactionEvents.length > 0 
        ? satisfactionEvents.reduce((sum, event) => sum + event.value, 0) / satisfactionEvents.length
        : 0,
      npsScore: 0, // Would need NPS-specific calculation
      feedbackCount: satisfactionEvents.length
    };

    return {
      cohortType,
      userCount: cohortUsers.length,
      metrics,
      conversionMetrics,
      behaviorMetrics,
      satisfactionMetrics
    };
  }

  private async performStatisticalTest(
    testId: string,
    metricName: string,
    controlMetrics: CohortPerformanceMetrics,
    treatmentMetrics: CohortPerformanceMetrics
  ): Promise<StatisticalTestResult> {
    const controlData = controlMetrics.metrics[metricName];
    const treatmentData = treatmentMetrics.metrics[metricName];

    if (!controlData || !treatmentData) {
      return {
        testType: 'ttest',
        pValue: 1,
        confidenceInterval: [0, 0],
        effectSize: 0,
        isSignificant: false,
        powerAnalysis: {
          observedPower: 0,
          requiredSampleSize: 1000,
          actualSampleSize: 0
        },
        recommendation: 'extend_test'
      };
    }

    // Simplified statistical test (in real implementation, use proper statistical library)
    const controlMean = controlData.mean;
    const treatmentMean = treatmentData.mean;
    const pooledStd = Math.sqrt(
      (Math.pow(controlData.standardDeviation, 2) + Math.pow(treatmentData.standardDeviation, 2)) / 2
    );

    const effectSize = pooledStd > 0 ? (treatmentMean - controlMean) / pooledStd : 0;
    const cohensD = Math.abs(effectSize);

    // Simplified p-value calculation (use proper statistical test in production)
    const tStatistic = Math.abs(effectSize) * Math.sqrt(controlData.count * treatmentData.count / (controlData.count + treatmentData.count));
    const pValue = Math.max(0.001, 2 * (1 - this.normalCDF(Math.abs(tStatistic))));

    const isSignificant = pValue < 0.05 && Math.abs(effectSize) > 0.2;

    const actualSampleSize = controlData.count + treatmentData.count;
    const requiredSampleSize = this.calculateRequiredSampleSize(effectSize, 0.05, 0.8);

    let recommendation: StatisticalTestResult['recommendation'] = 'continue';
    if (isSignificant && effectSize > 0) {
      recommendation = 'stop_winner';
    } else if (actualSampleSize > requiredSampleSize * 2) {
      recommendation = 'stop_no_effect';
    } else if (actualSampleSize < requiredSampleSize) {
      recommendation = 'extend_test';
    }

    return {
      testType: 'ttest',
      pValue,
      confidenceInterval: [
        (treatmentMean - controlMean) - 1.96 * pooledStd,
        (treatmentMean - controlMean) + 1.96 * pooledStd
      ],
      effectSize,
      cohensD,
      isSignificant,
      powerAnalysis: {
        observedPower: this.calculateObservedPower(effectSize, actualSampleSize),
        requiredSampleSize,
        actualSampleSize
      },
      recommendation
    };
  }

  private calculateBusinessImpact(
    controlMetrics: CohortPerformanceMetrics,
    treatmentMetrics: CohortPerformanceMetrics,
    primaryMetric: string
  ): ABTestResults['businessImpact'] {
    const controlValue = controlMetrics.metrics[primaryMetric]?.mean || 0;
    const treatmentValue = treatmentMetrics.metrics[primaryMetric]?.mean || 0;

    const absoluteImprovement = treatmentValue - controlValue;
    const relativeImprovement = controlValue > 0 ? (absoluteImprovement / controlValue) * 100 : 0;

    return {
      relativeImprovement,
      absoluteImprovement,
      confidenceInterval: [
        relativeImprovement - 5, // Simplified CI
        relativeImprovement + 5
      ],
      projectedImpact: `${relativeImprovement > 0 ? 'Positive' : 'Negative'} impact of ${Math.abs(relativeImprovement).toFixed(2)}%`
    };
  }

  private generateRecommendation(
    primaryResult: StatisticalTestResult,
    secondaryResults: { [metric: string]: StatisticalTestResult },
    businessImpact: ABTestResults['businessImpact'],
    test: ABTestConfig
  ): ABTestResults['recommendation'] {
    const reasoning: string[] = [];
    let decision: ABTestResults['recommendation']['decision'] = 'inconclusive';
    let confidence = 0;

    // Analyze primary metric
    if (primaryResult.isSignificant) {
      if (businessImpact.relativeImprovement > 0) {
        decision = 'deploy';
        confidence += 0.6;
        reasoning.push(`Primary metric shows significant positive improvement (${businessImpact.relativeImprovement.toFixed(2)}%)`);
      } else {
        decision = 'rollback';
        confidence += 0.6;
        reasoning.push(`Primary metric shows significant negative impact (${businessImpact.relativeImprovement.toFixed(2)}%)`);
      }
    } else {
      reasoning.push('Primary metric shows no significant difference');
    }

    // Analyze secondary metrics
    const significantSecondaryMetrics = Object.entries(secondaryResults)
      .filter(([_, result]) => result.isSignificant);

    if (significantSecondaryMetrics.length > 0) {
      const positiveSecondaryMetrics = significantSecondaryMetrics
        .filter(([_, result]) => result.effectSize > 0);
      
      if (positiveSecondaryMetrics.length > significantSecondaryMetrics.length / 2) {
        confidence += 0.2;
        reasoning.push(`${positiveSecondaryMetrics.length} secondary metrics show positive improvements`);
      } else {
        confidence -= 0.1;
        reasoning.push(`${significantSecondaryMetrics.length - positiveSecondaryMetrics.length} secondary metrics show negative impacts`);
      }
    }

    // Check sample size adequacy
    if (primaryResult.powerAnalysis.actualSampleSize < primaryResult.powerAnalysis.requiredSampleSize) {
      if (decision === 'inconclusive') {
        decision = 'extend_test';
      }
      confidence -= 0.2;
      reasoning.push('Sample size is below required threshold for reliable results');
    } else {
      confidence += 0.2;
      reasoning.push('Sample size is adequate for reliable statistical inference');
    }

    // Ensure confidence is within bounds
    confidence = Math.max(0, Math.min(1, confidence));

    const nextSteps: string[] = [];
    switch (decision) {
      case 'deploy':
        nextSteps.push('Deploy treatment to 100% of users');
        nextSteps.push('Monitor key metrics for any regressions');
        nextSteps.push('Document learnings for future tests');
        break;
      case 'rollback':
        nextSteps.push('Rollback to control implementation');
        nextSteps.push('Investigate causes of negative impact');
        nextSteps.push('Consider alternative approaches');
        break;
      case 'extend_test':
        nextSteps.push('Continue test to reach required sample size');
        nextSteps.push('Monitor for early stopping conditions');
        nextSteps.push('Re-evaluate results weekly');
        break;
      case 'inconclusive':
        nextSteps.push('Review test design and metrics');
        nextSteps.push('Consider increasing effect size or sample size');
        nextSteps.push('Evaluate business context for decision');
        break;
    }

    return {
      decision,
      confidence,
      reasoning,
      nextSteps
    };
  }

  private analyzeBehaviorPatterns(events: UserBehaviorEvent[]): any[] {
    // Simplified behavior pattern analysis
    const patterns = [];

    // Analyze common event sequences
    const eventSequences = new Map<string, number>();
    const userSessions = new Map<string, UserBehaviorEvent[]>();

    // Group events by session
    events.forEach(event => {
      if (!userSessions.has(event.session_id)) {
        userSessions.set(event.session_id, []);
      }
      userSessions.get(event.session_id)!.push(event);
    });

    // Analyze sequences within sessions
    userSessions.forEach(sessionEvents => {
      sessionEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      for (let i = 0; i < sessionEvents.length - 1; i++) {
        const sequence = `${sessionEvents[i].eventType} -> ${sessionEvents[i + 1].eventType}`;
        eventSequences.set(sequence, (eventSequences.get(sequence) || 0) + 1);
      }
    });

    // Convert to patterns array
    eventSequences.forEach((count, sequence) => {
      if (count > 1) { // Only include patterns that occur more than once
        patterns.push({
          pattern: sequence,
          frequency: count,
          type: 'sequence'
        });
      }
    });

    return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 10);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return values[lower];
    }
    
    return values[lower] + (values[upper] - values[lower]) * (index - lower);
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private normalCDF(x: number): number {
    // Simplified normal CDF approximation
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Simplified error function approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private calculateRequiredSampleSize(effectSize: number, alpha: number, power: number): number {
    // Simplified sample size calculation
    const zAlpha = 1.96; // For alpha = 0.05
    const zBeta = 0.84;  // For power = 0.8
    
    return Math.ceil(2 * Math.pow((zAlpha + zBeta) / effectSize, 2));
  }

  private calculateObservedPower(effectSize: number, sampleSize: number): number {
    // Simplified power calculation
    const ncp = Math.abs(effectSize) * Math.sqrt(sampleSize / 2);
    return Math.min(0.99, Math.max(0.05, 1 - this.normalCDF(1.96 - ncp)));
  }
}

// Export singleton instance
export const abTestingService = ABTestingService.getInstance();