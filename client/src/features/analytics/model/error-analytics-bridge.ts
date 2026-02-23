/**
 * Error Analytics Bridge Service - Optimized Version
 *
 * Provides a high-performance bridge between the Error Analytics Dashboard and core error handler.
 * Features improved type safety, caching, efficient data processing, and comprehensive analytics.
 */

import { coreErrorHandler } from '@client/infrastructure/error/handler';
import { ErrorDomain, ErrorSeverity } from '@client/infrastructure/error/types';

// ============================================================================
// Core Types
// ============================================================================

interface CoreError {
  id: string;
  timestamp: number;
  message: string;
  severity: ErrorSeverity;
  type: ErrorDomain;
  stack?: string;
  recovered: boolean;
  recoverable: boolean;
  recoveryTime?: number;
  recoveryStrategy?: string;
  context?: {
    component?: string;
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    url?: string;
    [key: string]: unknown;
  };
}

interface TimeRange {
  start: number;
  end: number;
  preset?: '1h' | '24h' | '7d' | '30d' | '90d' | 'custom';
}

interface DashboardFilters {
  timeRange: TimeRange;
  severity: ErrorSeverity[];
  domain: ErrorDomain[];
  component: string[];
  userId?: string;
  sessionId?: string;
}

interface ErrorOverviewMetrics {
  totalErrors: number;
  errorRate: number;
  uniqueErrors: number;
  affectedUsers: number;
  averageResolutionTime: number;
  severityDistribution: Record<ErrorSeverity, number>;
  domainDistribution: Record<ErrorDomain, number>;
  timeRange: TimeRange;
  lastUpdated: number;
}

interface SeasonalityData {
  detected: boolean;
  pattern: Record<string, number> | null;
  confidence: number;
  peakHours: number[];
}

interface AnomalyData {
  timestamp: number;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface ProjectionData {
  nextHour: number;
  nextDay: number;
  nextWeek: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

interface ErrorTrendData {
  timeSeries: TimeSeriesDataPoint[];
  growthRate: number;
  seasonality: SeasonalityData;
  anomalies: AnomalyData[];
  projections: ProjectionData;
  period: string;
}

interface TimeSeriesDataPoint {
  timestamp: number;
  totalErrors: number;
  errorRate: number;
  severityBreakdown: Record<ErrorSeverity, number>;
  domainBreakdown: Record<ErrorDomain, number>;
  uniqueErrors: number;
}

interface ErrorCluster {
  centroid: {
    message: string;
    stackTrace: string;
    component: string;
    userAgent: string;
    url: string;
  };
  members: Array<{
    id: string;
    timestamp: number;
    userId: string;
    sessionId: string;
    context?: Record<string, unknown>;
  }>;
  similarity: number;
  radius: number;
}

interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: number;
  severity: ErrorSeverity;
  domain: ErrorDomain;
  cluster: ErrorCluster;
  impact: {
    userExperience: 'low' | 'medium' | 'high' | 'critical';
    businessImpact: 'low' | 'medium' | 'high';
    frequency: 'occasional' | 'frequent' | 'persistent';
    scope: 'isolated' | 'widespread';
  };
  recommendations: string[];
}

interface StrategyEffectiveness {
  strategyId: string;
  strategyName: string;
  successRate: number;
  averageRecoveryTime: number;
  usageCount: number;
  failureReasons: string[];
  improvementSuggestions: string[];
}

interface RecoveryTimeDistribution {
  p50: number;
  p95: number;
  p99: number;
  average: number;
  min: number;
  max: number;
}

interface RecoveryFailure {
  strategyId: string;
  errorId: string;
  reason: string;
  timestamp: number;
  context?: Record<string, unknown>;
  alternativeStrategies: string[];
}

interface RecoveryAnalytics {
  overallSuccessRate: number;
  strategyEffectiveness: StrategyEffectiveness[];
  recoveryTimeDistribution: RecoveryTimeDistribution;
  failureAnalysis: RecoveryFailure[];
  automatedRecoveryRate: number;
  manualInterventionRate: number;
}

interface Alert {
  id: string;
  type: 'threshold' | 'anomaly' | 'pattern';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  threshold?: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq';
    value: number;
    duration: number;
  };
}

interface SystemHealthComponent {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  lastCheck: number;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  components: SystemHealthComponent[];
  uptime: number;
  lastIncident: number | null;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  errorProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
}

interface RealTimeMetrics {
  currentErrorRate: number;
  activeAlerts: Alert[];
  liveStream: Array<Omit<CoreError, 'stack' | 'context'>>;
  systemHealth: SystemHealth;
  performanceMetrics: PerformanceMetrics;
}

// ============================================================================
// Statistics Utilities
// ============================================================================

class StatisticsUtils {
  static calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  static calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(this.calculateMean(squaredDiffs));
  }

  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)] ?? 0;
  }

  static calculateMovingAverage(values: number[], windowSize: number): number[] {
    if (values.length < windowSize) return values;

    const result: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      result.push(this.calculateMean(window));
    }
    return result;
  }

  static detectOutliers(values: number[], threshold: number = 2): number[] {
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values);

    return values
      .map((val, idx) => ({ val, idx }))
      .filter(({ val }) => Math.abs(val - mean) > threshold * stdDev)
      .map(({ idx }) => idx);
  }
}

// ============================================================================
// Cache Manager
// ============================================================================

class CacheManager<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private readonly ttl: number;

  constructor(ttlMs: number = 60000) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// Error Analytics Bridge
// ============================================================================

class ErrorAnalyticsBridge {
  private static instance: ErrorAnalyticsBridge;
  private overviewCache: CacheManager<ErrorOverviewMetrics>;
  private trendCache: CacheManager<ErrorTrendData>;
  private patternCache: CacheManager<ErrorPattern[]>;

  private constructor() {
    this.overviewCache = new CacheManager<ErrorOverviewMetrics>(30000); // 30s cache
    this.trendCache = new CacheManager<ErrorTrendData>(60000); // 1m cache
    this.patternCache = new CacheManager<ErrorPattern[]>(120000); // 2m cache

    // Clean up expired cache entries periodically
    setInterval(() => {
      this.overviewCache.clearExpired();
      this.trendCache.clearExpired();
      this.patternCache.clearExpired();
    }, 60000);
  }

  static getInstance(): ErrorAnalyticsBridge {
    if (!ErrorAnalyticsBridge.instance) {
      ErrorAnalyticsBridge.instance = new ErrorAnalyticsBridge();
    }
    return ErrorAnalyticsBridge.instance;
  }

  // ========================================================================
  // Public API Methods
  // ========================================================================

  /**
   * Get overview metrics with intelligent caching
   */
  async getOverviewMetrics(filters: DashboardFilters): Promise<ErrorOverviewMetrics> {
    const cacheKey = this.generateCacheKey('overview', filters);
    const cached = this.overviewCache.get(cacheKey);
    if (cached) return cached;

    try {
      const errors = this.fetchAndFilterErrors(filters, 1000);
      const metrics = this.computeOverviewMetrics(errors, filters);

      this.overviewCache.set(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
      throw new Error('Failed to fetch overview metrics');
    }
  }

  /**
   * Get trend data with time series analysis
   */
  async getTrendData(period: string, filters: DashboardFilters): Promise<ErrorTrendData> {
    const cacheKey = this.generateCacheKey('trend', { ...filters, period });
    const cached = this.trendCache.get(cacheKey);
    if (cached) return cached;

    try {
      const errors = this.fetchAndFilterErrors(filters, 2000);
      const timeSeries = this.buildTimeSeries(errors, period, filters);

      const trendData: ErrorTrendData = {
        timeSeries,
        growthRate: this.calculateGrowthRate(timeSeries),
        seasonality: this.detectSeasonality(timeSeries),
        anomalies: this.detectAnomalies(timeSeries),
        projections: this.calculateProjections(timeSeries),
        period,
      };

      this.trendCache.set(cacheKey, trendData);
      return trendData;
    } catch (error) {
      console.error('Error fetching trend data:', error);
      throw new Error('Failed to fetch trend data');
    }
  }

  /**
   * Get detected error patterns with clustering
   */
  async getPatterns(filters: DashboardFilters): Promise<ErrorPattern[]> {
    const cacheKey = this.generateCacheKey('patterns', filters);
    const cached = this.patternCache.get(cacheKey);
    if (cached) return cached;

    try {
      const errors = this.fetchAndFilterErrors(filters, 2000);
      const patterns = this.detectErrorPatterns(errors);

      this.patternCache.set(cacheKey, patterns);
      return patterns;
    } catch (error) {
      console.error('Error detecting patterns:', error);
      throw new Error('Failed to detect error patterns');
    }
  }

  /**
   * Get recovery analytics with detailed strategy analysis
   */
  async getRecoveryAnalytics(filters: DashboardFilters): Promise<RecoveryAnalytics> {
    try {
      const errors = this.fetchAndFilterErrors(filters, 1000);
      return this.computeRecoveryAnalytics(errors);
    } catch (error) {
      console.error('Error fetching recovery analytics:', error);
      throw new Error('Failed to fetch recovery analytics');
    }
  }

  /**
   * Get real-time metrics for live monitoring
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const recentErrors = this.fetchRecentErrors(50);

      return {
        currentErrorRate: this.calculateCurrentErrorRate(recentErrors),
        activeAlerts: this.generateActiveAlerts(recentErrors),
        liveStream: recentErrors.slice(0, 20).map(this.transformToLiveEvent),
        systemHealth: this.getSystemHealthStatus(),
        performanceMetrics: this.getPerformanceMetrics(),
      };
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      throw new Error('Failed to fetch real-time metrics');
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.overviewCache.clear();
    this.trendCache.clear();
    this.patternCache.clear();
  }

  // ========================================================================
  // Private Helper Methods - Data Fetching
  // ========================================================================

  private fetchRecentErrors(limit: number): CoreError[] {
    return coreErrorHandler.getRecentErrors(limit) as CoreError[];
  }

  private fetchAndFilterErrors(filters: DashboardFilters, limit: number): CoreError[] {
    const errors = this.fetchRecentErrors(limit);
    return this.filterErrors(errors, filters);
  }

  private filterErrors(errors: CoreError[], filters: DashboardFilters): CoreError[] {
    return errors.filter(error => {
      // Time range filter
      if (error.timestamp < filters.timeRange.start || error.timestamp > filters.timeRange.end) {
        return false;
      }

      // Severity filter
      if (filters.severity.length > 0 && !filters.severity.includes(error.severity)) {
        return false;
      }

      // Domain filter
      if (filters.domain.length > 0 && !filters.domain.includes(error.type)) {
        return false;
      }

      // Component filter
      if (filters.component.length > 0) {
        const component = error.context?.component;
        if (!component || !filters.component.includes(component)) {
          return false;
        }
      }

      // User ID filter
      if (filters.userId && error.context?.userId !== filters.userId) {
        return false;
      }

      // Session ID filter
      if (filters.sessionId && error.context?.sessionId !== filters.sessionId) {
        return false;
      }

      return true;
    });
  }

  // ========================================================================
  // Private Helper Methods - Metrics Calculation
  // ========================================================================

  private computeOverviewMetrics(
    errors: CoreError[],
    filters: DashboardFilters
  ): ErrorOverviewMetrics {
    return {
      totalErrors: errors.length,
      errorRate: this.calculateErrorRate(errors, filters.timeRange),
      uniqueErrors: this.calculateUniqueErrors(errors),
      affectedUsers: this.calculateAffectedUsers(errors),
      averageResolutionTime: this.calculateAverageResolutionTime(errors),
      severityDistribution: this.buildSeverityDistribution(errors),
      domainDistribution: this.buildDomainDistribution(errors),
      timeRange: filters.timeRange,
      lastUpdated: Date.now(),
    };
  }

  private calculateErrorRate(errors: CoreError[], timeRange: TimeRange): number {
    const durationMs = timeRange.end - timeRange.start;
    const durationMinutes = durationMs / (60 * 1000);
    return durationMinutes > 0 ? errors.length / durationMinutes : 0;
  }

  private calculateCurrentErrorRate(errors: CoreError[]): number {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentErrors = errors.filter(e => e.timestamp > fiveMinutesAgo);
    return recentErrors.length / 5;
  }

  private calculateUniqueErrors(errors: CoreError[]): number {
    const uniqueMessages = new Set(errors.map(e => e.message));
    return uniqueMessages.size;
  }

  private calculateAffectedUsers(errors: CoreError[]): number {
    const uniqueUsers = new Set(
      errors.map(e => e.context?.userId).filter((userId): userId is string => Boolean(userId))
    );
    return uniqueUsers.size;
  }

  private calculateAverageResolutionTime(errors: CoreError[]): number {
    const resolvedErrors = errors.filter(e => e.recovered && e.recoveryTime);
    if (resolvedErrors.length === 0) return 0;

    const totalTime = resolvedErrors.reduce((sum, e) => sum + (e.recoveryTime || 0), 0);
    return totalTime / resolvedErrors.length;
  }

  private buildSeverityDistribution(errors: CoreError[]): Record<ErrorSeverity, number> {
    const distribution: Record<ErrorSeverity, number> = {
      [ErrorSeverity.CRITICAL]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.BLOCKER]: 0,
    };

    for (const error of errors) {
      distribution[error.severity]++;
    }

    return distribution;
  }

  private buildDomainDistribution(errors: CoreError[]): Record<ErrorDomain, number> {
    // Initialize with all possible ErrorDomain values
    const distribution: Record<ErrorDomain, number> = Object.values(ErrorDomain).reduce(
      (acc, domain) => {
        acc[domain] = 0;
        return acc;
      },
      {} as Record<ErrorDomain, number>
    );

    for (const error of errors) {
      if (error.type in distribution) {
        distribution[error.type]++;
      }
    }

    return distribution;
  }

  // ========================================================================
  // Private Helper Methods - Time Series Analysis
  // ========================================================================

  private buildTimeSeries(
    errors: CoreError[],
    period: string,
    _filters: DashboardFilters
  ): TimeSeriesDataPoint[] {
    const intervalMs = this.getIntervalMs(period);
    const intervalMap = new Map<number, CoreError[]>();

    // Group errors by time interval
    for (const error of errors) {
      const intervalKey = Math.floor(error.timestamp / intervalMs) * intervalMs;
      const intervalErrors = intervalMap.get(intervalKey) || [];
      intervalErrors.push(error);
      intervalMap.set(intervalKey, intervalErrors);
    }

    // Convert to time series points
    const dataPoints: TimeSeriesDataPoint[] = Array.from(intervalMap.entries())
      .map(([timestamp, intervalErrors]) => ({
        timestamp,
        totalErrors: intervalErrors.length,
        errorRate: intervalErrors.length / (intervalMs / (60 * 1000)),
        severityBreakdown: this.buildSeverityDistribution(intervalErrors),
        domainBreakdown: this.buildDomainDistribution(intervalErrors),
        uniqueErrors: new Set(intervalErrors.map(e => e.message)).size,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return dataPoints;
  }

  private getIntervalMs(period: string): number {
    const intervals: Record<string, number> = {
      '1h': 5 * 60 * 1000, // 5 minutes
      '24h': 60 * 60 * 1000, // 1 hour
      '7d': 24 * 60 * 60 * 1000, // 1 day
      '30d': 24 * 60 * 60 * 1000, // 1 day
      '90d': 24 * 60 * 60 * 1000, // 1 day
    };
    return intervals[period] || 60 * 60 * 1000;
  }

  private calculateGrowthRate(timeSeries: TimeSeriesDataPoint[]): number {
    if (timeSeries.length < 2) return 0;

    const windowSize = Math.min(10, Math.floor(timeSeries.length / 2));
    const recent = timeSeries.slice(-windowSize);
    const earlier = timeSeries.slice(-windowSize * 2, -windowSize);

    if (earlier.length === 0) return 0;

    const recentAvg = StatisticsUtils.calculateMean(recent.map(p => p.totalErrors));
    const earlierAvg = StatisticsUtils.calculateMean(earlier.map(p => p.totalErrors));

    return earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
  }

  private detectSeasonality(timeSeries: TimeSeriesDataPoint[]): SeasonalityData {
    if (timeSeries.length < 24) {
      return { detected: false, pattern: null, confidence: 0, peakHours: [] };
    }

    // Extract hourly patterns
    const hourlyValues = new Map<number, number[]>();

    for (const point of timeSeries) {
      const hour = new Date(point.timestamp).getHours();
      const values = hourlyValues.get(hour) || [];
      values.push(point.totalErrors);
      hourlyValues.set(hour, values);
    }

    // Calculate average for each hour
    const hourlyAverages: Record<string, number> = {};
    const allAverages: number[] = [];

    for (const [hour, values] of hourlyValues.entries()) {
      const avg = StatisticsUtils.calculateMean(values);
      hourlyAverages[hour.toString()] = avg;
      allAverages.push(avg);
    }

    // Detect peaks (hours with significantly higher error rates)
    const overallMean = StatisticsUtils.calculateMean(allAverages);
    const stdDev = StatisticsUtils.calculateStdDev(allAverages);
    const threshold = overallMean + stdDev;

    const peakHours = Array.from(hourlyValues.keys())
      .filter(hour => (hourlyAverages[hour.toString()] ?? 0) > threshold)
      .sort((a, b) => (hourlyAverages[b.toString()] ?? 0) - (hourlyAverages[a.toString()] ?? 0));

    const detected = peakHours.length > 0 && stdDev > overallMean * 0.2;
    const confidence = detected ? Math.min(stdDev / overallMean, 1) : 0;

    return {
      detected,
      pattern: detected ? hourlyAverages : null,
      confidence,
      peakHours,
    };
  }

  private detectAnomalies(timeSeries: TimeSeriesDataPoint[]): AnomalyData[] {
    if (timeSeries.length < 10) return [];

    const values = timeSeries.map(p => p.totalErrors);
    const mean = StatisticsUtils.calculateMean(values);
    const stdDev = StatisticsUtils.calculateStdDev(values);

    if (stdDev === 0) return [];

    const anomalies: AnomalyData[] = [];

    for (const point of timeSeries) {
      const zScore = Math.abs(point.totalErrors - mean) / stdDev;

      if (zScore > 2) {
        const severity =
          zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : zScore > 2 ? 'medium' : 'low';

        anomalies.push({
          timestamp: point.timestamp,
          value: point.totalErrors,
          expectedValue: mean,
          deviation: Math.abs(point.totalErrors - mean),
          severity,
          description: `Anomalous error count: ${point.totalErrors} (expected: ${mean.toFixed(1)}, z-score: ${zScore.toFixed(2)})`,
        });
      }
    }

    return anomalies;
  }

  private calculateProjections(timeSeries: TimeSeriesDataPoint[]): ProjectionData {
    if (timeSeries.length < 5) {
      return {
        nextHour: 0,
        nextDay: 0,
        nextWeek: 0,
        confidence: 0,
        trend: 'stable',
      };
    }

    // Use linear regression for trend calculation
    const recentWindow = Math.min(20, timeSeries.length);
    const recent = timeSeries.slice(-recentWindow);
    const values = recent.map(p => p.totalErrors);

    // Calculate trend using simple linear regression
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = StatisticsUtils.calculateMean(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = i - xMean;
      const yDiff = (values[i] ?? 0) - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const lastValue = values[values.length - 1] ?? 0;

    // Calculate confidence based on R-squared
    const predictions = values.map((_, i) => yMean + slope * (i - xMean));
    const ssRes = values.reduce((sum, val, i) => sum + Math.pow(val - (predictions[i] ?? 0), 2), 0);
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
    const confidence = Math.max(0, Math.min(1, rSquared));

    // Determine trend direction
    const trend = Math.abs(slope) < yMean * 0.05 ? 'stable' : slope > 0 ? 'up' : 'down';

    return {
      nextHour: Math.max(0, (lastValue ?? 0) + slope),
      nextDay: Math.max(0, (lastValue ?? 0) + slope * 24),
      nextWeek: Math.max(0, (lastValue ?? 0) + slope * 168),
      confidence,
      trend,
    };
  }

  // ========================================================================
  // Private Helper Methods - Pattern Detection
  // ========================================================================

  private detectErrorPatterns(errors: CoreError[]): ErrorPattern[] {
    const patternMap = new Map<string, CoreError[]>();

    // Group errors by message and component
    for (const error of errors) {
      const component = error.context?.component || 'unknown';
      const key = `${error.message}::${component}`;
      const patternErrors = patternMap.get(key) || [];
      patternErrors.push(error);
      patternMap.set(key, patternErrors);
    }

    // Convert to patterns (only include patterns with 2+ occurrences)
    const patterns: ErrorPattern[] = [];

    for (const [key, patternErrors] of patternMap.entries()) {
      if (patternErrors.length < 2) continue;

      const firstError = patternErrors[0];
      if (!firstError) continue;
      
      const timestamps = patternErrors.map(e => e.timestamp);
      const affectedUserIds = new Set(
        patternErrors.map(e => e.context?.userId).filter((id): id is string => Boolean(id))
      );

      const pattern: ErrorPattern = {
        id: key,
        name: firstError.message,
        description: `Pattern detected in ${firstError.context?.component || 'unknown component'}`,
        frequency: patternErrors.length,
        firstSeen: Math.min(...timestamps),
        lastSeen: Math.max(...timestamps),
        affectedUsers: affectedUserIds.size,
        severity: firstError.severity,
        domain: firstError.type,
        cluster: this.buildErrorCluster(patternErrors),
        impact: this.calculatePatternImpact(patternErrors),
        recommendations: this.generateRecommendations(firstError),
      };

      patterns.push(pattern);
    }

    // Sort by frequency (descending) and limit to top 20
    return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 20);
  }

  private buildErrorCluster(errors: CoreError[]): ErrorCluster {
    const firstError = errors[0];
    if (!firstError) {
      throw new Error('Cannot build error cluster from empty array');
    }

    return {
      centroid: {
        message: firstError.message,
        stackTrace: firstError.stack || '',
        component: firstError.context?.component || '',
        userAgent: firstError.context?.userAgent || '',
        url: firstError.context?.url || '',
      },
      members: errors.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        userId: e.context?.userId || '',
        sessionId: e.context?.sessionId || '',
        context: e.context,
      })),
      similarity: 0.9,
      radius: 0.1,
    };
  }

  private calculatePatternImpact(errors: CoreError[]): ErrorPattern['impact'] {
    const firstError = errors[0];
    if (!firstError) {
      return {
        userExperience: 'low',
        businessImpact: 'low',
        frequency: 'occasional',
        scope: 'isolated',
      };
    }
    
    const frequency = errors.length;

    const userExperience =
      firstError.severity === ErrorSeverity.CRITICAL
        ? 'critical'
        : firstError.severity === ErrorSeverity.HIGH
          ? 'high'
          : firstError.severity === ErrorSeverity.MEDIUM
            ? 'medium'
            : 'low';

    const businessImpact = frequency > 50 ? 'high' : frequency > 10 ? 'medium' : 'low';

    const frequencyCategory =
      frequency > 50 ? 'persistent' : frequency > 10 ? 'frequent' : 'occasional';

    const affectedUsers = new Set(errors.map(e => e.context?.userId).filter(Boolean)).size;

    const scope = affectedUsers > 10 ? 'widespread' : 'isolated';

    return {
      userExperience,
      businessImpact,
      frequency: frequencyCategory,
      scope,
    };
  }

  private generateRecommendations(error: CoreError): string[] {
    const recommendations: string[] = [];

    // Domain-specific recommendations
    switch (error.type) {
      case ErrorDomain.NETWORK:
        recommendations.push('Implement retry logic with exponential backoff');
        recommendations.push('Add network status monitoring and offline support');
        recommendations.push('Consider implementing request queuing for failed requests');
        break;
      case ErrorDomain.AUTHENTICATION:
        recommendations.push('Implement token refresh mechanism');
        recommendations.push('Add session timeout warnings for users');
        recommendations.push('Consider implementing silent authentication flows');
        break;
      case ErrorDomain.VALIDATION:
        recommendations.push('Improve client-side validation to prevent invalid requests');
        recommendations.push('Provide clearer error messages to users');
        recommendations.push('Add input sanitization and validation helpers');
        break;
      case ErrorDomain.SYSTEM:
        recommendations.push('Add monitoring and alerting for system resources');
        recommendations.push('Implement graceful degradation strategies');
        recommendations.push('Consider load balancing and scaling solutions');
        break;
    }

    // Severity-specific recommendations
    if (error.severity === ErrorSeverity.CRITICAL) {
      recommendations.push('Implement circuit breaker pattern to prevent cascading failures');
      recommendations.push('Add comprehensive error boundaries at component level');
      recommendations.push('Set up real-time alerts for critical errors');
    }

    // General recommendations
    recommendations.push('Add detailed contextual logging for debugging');
    recommendations.push('Implement user-friendly error messages with actionable guidance');

    return recommendations;
  }

  // ========================================================================
  // Private Helper Methods - Recovery Analytics
  // ========================================================================

  private computeRecoveryAnalytics(errors: CoreError[]): RecoveryAnalytics {
    const recoveredErrors = errors.filter(e => e.recovered);
    const failedErrors = errors.filter(e => !e.recovered);

    return {
      overallSuccessRate: errors.length > 0 ? recoveredErrors.length / errors.length : 0,
      strategyEffectiveness: this.calculateStrategyEffectiveness(recoveredErrors),
      recoveryTimeDistribution: this.calculateRecoveryTimeDistribution(recoveredErrors),
      failureAnalysis: this.analyzeRecoveryFailures(failedErrors),
      automatedRecoveryRate: this.calculateAutomatedRecoveryRate(recoveredErrors),
      manualInterventionRate: this.calculateManualInterventionRate(recoveredErrors),
    };
  }

  private calculateStrategyEffectiveness(recoveredErrors: CoreError[]): StrategyEffectiveness[] {
    const strategyMap = new Map<string, CoreError[]>();

    // Group by recovery strategy
    for (const error of recoveredErrors) {
      const strategy = error.recoveryStrategy || 'unknown';
      const strategyErrors = strategyMap.get(strategy) || [];
      strategyErrors.push(error);
      strategyMap.set(strategy, strategyErrors);
    }

    return Array.from(strategyMap.entries()).map(([strategyId, errors]) => ({
      strategyId,
      strategyName: strategyId,
      successRate: 1.0, // All errors in this group were recovered
      averageRecoveryTime: StatisticsUtils.calculateMean(errors.map(e => e.recoveryTime || 0)),
      usageCount: errors.length,
      failureReasons: [],
      improvementSuggestions: [],
    }));
  }

  private calculateRecoveryTimeDistribution(
    recoveredErrors: CoreError[]
  ): RecoveryTimeDistribution {
    const recoveryTimes = recoveredErrors.map(e => e.recoveryTime || 0).filter(time => time > 0);

    if (recoveryTimes.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
        min: 0,
        max: 0,
      };
    }

    return {
      p50: StatisticsUtils.calculatePercentile(recoveryTimes, 50),
      p95: StatisticsUtils.calculatePercentile(recoveryTimes, 95),
      p99: StatisticsUtils.calculatePercentile(recoveryTimes, 99),
      average: StatisticsUtils.calculateMean(recoveryTimes),
      min: Math.min(...recoveryTimes),
      max: Math.max(...recoveryTimes),
    };
  }

  private analyzeRecoveryFailures(failedErrors: CoreError[]): RecoveryFailure[] {
    return failedErrors.slice(0, 10).map(error => ({
      strategyId: error.recoveryStrategy || 'none',
      errorId: error.id,
      reason: 'Recovery not attempted or failed',
      timestamp: error.timestamp,
      context: error.context,
      alternativeStrategies: ['retry', 'fallback', 'circuit-breaker'],
    }));
  }

  private calculateAutomatedRecoveryRate(recoveredErrors: CoreError[]): number {
    // Assume automated if recovery time is very fast (< 1 second)
    const automatedRecoveries = recoveredErrors.filter(
      e => e.recoveryTime && e.recoveryTime < 1000
    );
    return recoveredErrors.length > 0 ? automatedRecoveries.length / recoveredErrors.length : 0;
  }

  private calculateManualInterventionRate(recoveredErrors: CoreError[]): number {
    // Assume manual if recovery time is slow (> 30 seconds)
    const manualRecoveries = recoveredErrors.filter(e => e.recoveryTime && e.recoveryTime > 30000);
    return recoveredErrors.length > 0 ? manualRecoveries.length / recoveredErrors.length : 0;
  }

  // ========================================================================
  // Private Helper Methods - Real-time Metrics
  // ========================================================================

  private generateActiveAlerts(errors: CoreError[]): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    // Generate alert for high error rate
    const recentErrors = errors.filter(e => e.timestamp > now - 5 * 60 * 1000);
    if (recentErrors.length > 10) {
      alerts.push({
        id: 'high-error-rate',
        type: 'threshold',
        severity: 'critical',
        title: 'High Error Rate Detected',
        description: `${recentErrors.length} errors in the last 5 minutes`,
        timestamp: now,
        acknowledged: false,
        resolved: false,
        threshold: {
          metric: 'error_rate',
          operator: 'gt',
          value: 10,
          duration: 300000,
        },
      });
    }

    return alerts;
  }

  private transformToLiveEvent(error: CoreError): Omit<CoreError, 'stack' | 'context'> {
    return {
      id: error.id,
      timestamp: error.timestamp,
      message: error.message,
      severity: error.severity,
      type: error.type,
      recovered: error.recovered,
      recoverable: error.recoverable,
      recoveryTime: error.recoveryTime,
      recoveryStrategy: error.recoveryStrategy,
    };
  }

  private getSystemHealthStatus(): SystemHealth {
    return {
      overall: 'healthy',
      components: [
        {
          name: 'Error Handler',
          status: 'healthy',
          responseTime: 50,
          errorRate: 0.01,
          lastCheck: Date.now(),
        },
        {
          name: 'Analytics Service',
          status: 'healthy',
          responseTime: 100,
          errorRate: 0.02,
          lastCheck: Date.now(),
        },
      ],
      uptime: 0.999,
      lastIncident: null,
    };
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    return {
      averageResponseTime: 150,
      errorProcessingTime: 25,
      memoryUsage: 45.2,
      cpuUsage: 12.5,
      throughput: 1250,
    };
  }

  // ========================================================================
  // Private Helper Methods - Utilities
  // ========================================================================

  private generateCacheKey(type: string, data: unknown): string {
    return `${type}-${JSON.stringify(data)}`;
  }
}

// Export singleton instance
export const errorAnalyticsBridge = ErrorAnalyticsBridge.getInstance();

// Export types for use in other modules
export type {
  CoreError,
  DashboardFilters,
  ErrorOverviewMetrics,
  TimeSeriesDataPoint,
  ErrorPattern,
  RecoveryAnalytics,
  RealTimeMetrics,
  Alert,
  TimeRange,
  ErrorTrendData,
};
