/**
 * Error Analytics Service
 *
 * Enhanced service for tracking errors across multiple analytics platforms
 * with advanced monitoring, metrics collection, and trend analysis.
 * Migrated from utils/errors.ts with enhanced modular architecture.
 */

import { AppError, ErrorAnalyticsProvider, ErrorDomain, ErrorSeverity } from './types';

// ============================================================================
// Monitoring Types and Interfaces (Enhanced from error-monitor.ts)
// ============================================================================

export type MonitoringLevel = 'off' | 'basic' | 'detailed' | 'comprehensive';

export interface MonitoringConfig {
  level: MonitoringLevel;
  enableAggregation: boolean;
  enableTrendAnalysis: boolean;
  enableRateLimiting: boolean;
  maxErrorsPerMinute: number;
  retentionPeriodHours: number;
  backends: MonitoringBackend[];
  flushIntervalMs: number;
}

export interface ErrorMetrics {
  totalCount: number;
  countByDomain: Record<ErrorDomain, number>;
  countBySeverity: Record<ErrorSeverity, number>;
  countByCode: Record<string, number>;
  uniqueUsers: number;
  averageResolutionTime: number;
  lastUpdated: Date;
}

export interface MonitoringBackend {
  name: string;
  send: (data: ErrorAnalytics) => Promise<void> | void;
  isEnabled: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

export interface ErrorAggregation {
  timeWindow: {
    start: Date;
    end: Date;
  };
  metrics: ErrorMetrics;
  trends: ErrorTrend[];
  topErrors: ErrorFrequency[];
}

// ============================================================================
// Enhanced Error Analytics Types
// ============================================================================

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByDomain: Record<ErrorDomain, number>;
  errorsByCode: Record<string, number>;
  topErrors: ErrorFrequency[];
  errorTrends: ErrorTrend[];
  recoveryRate: number;
  averageResolutionTime: number;
  timeRange: { start: Date; end: Date };
}

export interface ErrorFrequency {
  code: string;
  domain: ErrorDomain;
  count: number;
  lastOccurred: Date;
  affectedUsers: number;
}

export interface ErrorTrend {
  date: string;
  count: number;
  domain: ErrorDomain;
  severity?: ErrorSeverity;
  growthRate?: number;
  isSpike?: boolean;
  baseline?: number;
}

// ============================================================================
// Advanced Analytics Types
// ============================================================================

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  threshold: number;
  timeWindow: number; // minutes
  severity: ErrorSeverity;
  enabled: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
  channels: AlertChannel[];
}

export interface AlertCondition {
  type: 'count' | 'rate' | 'percentage' | 'trend' | 'correlation';
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  domain?: ErrorDomain;
  severity?: ErrorSeverity;
}

export interface AlertChannel {
  type: 'console' | 'api' | 'email' | 'webhook';
  config: Record<string, unknown>;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: ErrorSeverity;
  triggeredAt: Date;
  resolvedAt?: Date;
  metrics: Record<string, number>;
  context: Record<string, unknown>;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  algorithm: 'zscore' | 'iqr' | 'isolation_forest';
  sensitivity: number; // 0-1
  minDataPoints: number;
  trainingWindow: number; // hours
  detectionWindow: number; // minutes
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  confidence: number;
  expectedValue: number;
  actualValue: number;
  timestamp: Date;
  context: Record<string, unknown>;
}

export interface ErrorCorrelation {
  id: string;
  primaryError: string;
  correlatedErrors: string[];
  correlationStrength: number;
  timeWindow: number;
  pattern: CorrelationPattern;
  frequency: number;
  lastSeen: Date;
}

export interface CorrelationPattern {
  type: 'sequential' | 'concurrent' | 'causal';
  sequence?: string[];
  timeGap?: number;
  commonContext?: Record<string, unknown>;
}

export interface PatternRecognitionResult {
  patternId: string;
  pattern: ErrorPattern;
  confidence: number;
  frequency: number;
  impact: number;
  recommendations: string[];
}

export interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  signature: PatternSignature;
  severity: ErrorSeverity;
  category: string;
  tags: string[];
}

export interface PatternSignature {
  domains: ErrorDomain[];
  codes: string[];
  messages: RegExp[];
  context: Record<string, RegExp>;
  sequence?: string[];
}

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

class RateLimiter {
  private buckets = new Map<string, { count: number; resetTime: Date }>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  check(key: string): RateLimitResult {
    const now = new Date();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetTime) {
      // Reset bucket
      const resetTime = new Date(now.getTime() + this.windowMs);
      this.buckets.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }

    if (bucket.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: bucket.resetTime,
      };
    }

    bucket.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - bucket.count,
      resetTime: bucket.resetTime,
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}

// ============================================================================
// Enhanced Error Analytics Service
// ============================================================================

export class ErrorAnalyticsService {
  private static instance: ErrorAnalyticsService;
  private providers = new Map<string, ErrorAnalyticsProvider>();
  private monitoringConfig: Required<MonitoringConfig>;
  private metrics: ErrorMetrics;
  private errorHistory: AppError[] = [];
  private rateLimiter: RateLimiter;
  private flushTimer?: NodeJS.Timeout;
  private isEnabled = false;
  private isInitialized = false;

  // Advanced Analytics Features
  private alertRules: AlertRule[] = [];
  private activeAlerts: Alert[] = [];
  private anomalyConfig: AnomalyDetectionConfig;
  private correlations: ErrorCorrelation[] = [];
  private patterns: ErrorPattern[] = [];
  private baselineData: Map<string, number[]> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();

  private constructor() {
    this.monitoringConfig = {
      level: 'basic',
      enableAggregation: true,
      enableTrendAnalysis: true,
      enableRateLimiting: true,
      maxErrorsPerMinute: 60,
      retentionPeriodHours: 24,
      backends: [],
      flushIntervalMs: 30000,
    };

    this.metrics = this.createEmptyMetrics();
    this.rateLimiter = new RateLimiter(this.monitoringConfig.maxErrorsPerMinute, 60000);

    // Initialize advanced analytics
    this.anomalyConfig = {
      enabled: false,
      algorithm: 'zscore',
      sensitivity: 0.8,
      minDataPoints: 50,
      trainingWindow: 24,
      detectionWindow: 60,
    };

    // Initialize default patterns
    this.initializeDefaultPatterns();
  }

  static getInstance(): ErrorAnalyticsService {
    if (!ErrorAnalyticsService.instance) {
      ErrorAnalyticsService.instance = new ErrorAnalyticsService();
    }
    return ErrorAnalyticsService.instance;
  }

  configure(config: {
    enabled: boolean;
    sentry?: Record<string, unknown>;
    datadog?: Record<string, unknown>;
    custom?: Record<string, unknown>;
    monitoring?: Partial<MonitoringConfig>;
  }): void {
    this.isEnabled = config.enabled;

    // Configure monitoring
    if (config.monitoring) {
      this.monitoringConfig = { ...this.monitoringConfig, ...config.monitoring };
      this.rateLimiter = new RateLimiter(this.monitoringConfig.maxErrorsPerMinute, 60000);
    }

    // Add providers if configured
    if (config.sentry) {
      this.addProvider('sentry', {
        name: 'Sentry',
        track: async error => {
          // Sentry tracking would go here
          console.log('Tracking error with Sentry:', error);
        },
        isEnabled: () => true,
      });
    }

    if (config.datadog) {
      this.addProvider('datadog', {
        name: 'DataDog',
        track: async error => {
          // DataDog tracking would go here
          console.log('Tracking error with DataDog:', error);
        },
        isEnabled: () => true,
      });
    }

    if (config.custom) {
      this.addProvider('custom', {
        name: 'Custom Analytics',
        track: async error => {
          // Custom analytics tracking would go here
          console.log('Tracking error with Custom Analytics:', error);
        },
        isEnabled: () => true,
      });
    }

    // Initialize monitoring if enabled
    if (this.isEnabled && this.monitoringConfig.level !== 'off') {
      this.initializeMonitoring();
    }
  }

  addProvider(name: string, provider: ErrorAnalyticsProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Tracks an error across all enabled analytics providers and monitoring
   */
  async track(error: AppError): Promise<void> {
    if (!this.isEnabled) return;

    // Record in monitoring system
    this.recordError(error);

    // Track with analytics providers
    const trackPromises = Array.from(this.providers.values())
      .filter(provider => provider.isEnabled())
      .map(provider =>
        provider.track(error).catch(err => {
          console.error(`Analytics provider ${provider.name} failed`, {
            component: 'ErrorAnalytics',
            error: err,
            errorId: error.id,
          });
        })
      );

    await Promise.allSettled(trackPromises);
  }

  // ============================================================================
  // Monitoring Methods (Enhanced from error-monitor.ts)
  // ============================================================================

  /**
   * Record an error in the monitoring system
   */
  private recordError(error: AppError): boolean {
    if (this.monitoringConfig.level === 'off') {
      return false;
    }

    // Check rate limiting
    if (this.monitoringConfig.enableRateLimiting) {
      const rateLimit = this.rateLimiter.check(
        error.context?.userId || error.context?.sessionId || 'anonymous'
      );
      if (!rateLimit.allowed) {
        console.warn('Error rate limit exceeded, skipping error recording');
        return false;
      }
    }

    // Add to history
    this.errorHistory.push(error);

    // Update metrics
    this.updateMetrics(error);

    // Check for alerts
    this.checkAlerts();

    // Clean up old errors
    this.cleanupOldErrors();

    return true;
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get error analytics for a time range
   */
  getAnalytics(timeRange?: { start: Date; end: Date }): ErrorAnalytics {
    const range = timeRange || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date(),
    };

    const filteredErrors = this.errorHistory.filter(
      error => error.timestamp >= range.start.getTime() && error.timestamp <= range.end.getTime()
    );

    const errorsByDomain = this.aggregateByDomain(filteredErrors);
    const errorsByCode = this.aggregateByCode(filteredErrors);
    const topErrors = this.getTopErrors(filteredErrors);
    const errorTrends = this.monitoringConfig.enableTrendAnalysis
      ? this.calculateTrends(filteredErrors, range)
      : [];

    return {
      totalErrors: filteredErrors.length,
      errorsByDomain,
      errorsByCode,
      topErrors,
      errorTrends,
      recoveryRate: this.calculateRecoveryRate(filteredErrors),
      averageResolutionTime: this.calculateAverageResolutionTime(filteredErrors),
      timeRange: range,
    };
  }

  /**
   * Export monitoring data for dashboards
   */
  exportData(): ErrorAggregation {
    const now = new Date();
    const start = new Date(
      now.getTime() - this.monitoringConfig.retentionPeriodHours * 60 * 60 * 1000
    );

    return {
      timeWindow: { start, end: now },
      metrics: this.getMetrics(),
      trends: this.getAnalytics({ start, end: now }).errorTrends,
      topErrors: this.getAnalytics({ start, end: now }).topErrors,
    };
  }

  /**
   * Flush data to monitoring backends
   */
  async flush(): Promise<void> {
    if (this.monitoringConfig.backends.length === 0) {
      return;
    }

    const analytics = this.getAnalytics();

    const enabledBackends = this.monitoringConfig.backends.filter(backend => backend.isEnabled);

    await Promise.allSettled(
      enabledBackends.map(backend => {
        try {
          return backend.send(analytics);
        } catch (error) {
          console.error(`Failed to send data to backend ${backend.name}:`, error);
          return Promise.resolve();
        }
      })
    );
  }

  // ============================================================================
  // Advanced Analytics Methods
  // ============================================================================

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.alertRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.activeAlerts.filter(alert => !alert.resolvedAt);
  }

  /**
   * Configure anomaly detection
   */
  configureAnomalyDetection(config: Partial<AnomalyDetectionConfig>): void {
    this.anomalyConfig = { ...this.anomalyConfig, ...config };
  }

  /**
   * Detect anomalies in error patterns
   */
  detectAnomalies(timeRange?: { start: Date; end: Date }): AnomalyResult[] {
    if (!this.anomalyConfig.enabled) return [];

    const range = timeRange || {
      start: new Date(Date.now() - this.anomalyConfig.trainingWindow * 60 * 60 * 1000),
      end: new Date(),
    };

    const anomalies: AnomalyResult[] = [];
    const domains = Object.values(ErrorDomain);

    for (const domain of domains) {
      const domainErrors = this.errorHistory.filter(
        error =>
          error.type === domain &&
          error.timestamp >= range.start.getTime() &&
          error.timestamp <= range.end.getTime()
      );

      if (domainErrors.length < this.anomalyConfig.minDataPoints) continue;

      const result = this.detectAnomalyInSeries(
        domainErrors.map(e => e.timestamp),
        domain
      );
      if (result) {
        anomalies.push(result);
      }
    }

    return anomalies;
  }

  /**
   * Analyze error correlations
   */
  analyzeCorrelations(timeWindow: number = 3600000): ErrorCorrelation[] {
    const now = Date.now();
    const windowStart = now - timeWindow;

    const recentErrors = this.errorHistory.filter(error => error.timestamp >= windowStart);
    const correlations: ErrorCorrelation[] = [];

    // Simple correlation analysis - group errors by context
    const contextGroups = new Map<string, AppError[]>();

    recentErrors.forEach(error => {
      const contextKey = this.getContextKey(error);
      if (!contextGroups.has(contextKey)) {
        contextGroups.set(contextKey, []);
      }
      contextGroups.get(contextKey)!.push(error);
    });

    contextGroups.forEach((errors, contextKey) => {
      if (errors.length > 1) {
        const correlation: ErrorCorrelation = {
          id: `correlation_${contextKey}_${now}`,
          primaryError: errors[0].id,
          correlatedErrors: errors.slice(1).map(e => e.id),
          correlationStrength: errors.length / recentErrors.length,
          timeWindow,
          pattern: {
            type: 'concurrent',
            commonContext: { contextKey },
          },
          frequency: errors.length,
          lastSeen: new Date(now),
        };
        correlations.push(correlation);
      }
    });

    this.correlations = correlations;
    return correlations;
  }

  /**
   * Recognize error patterns
   */
  recognizePatterns(): PatternRecognitionResult[] {
    const results: PatternRecognitionResult[] = [];

    for (const pattern of this.patterns) {
      const matches = this.findPatternMatches(pattern);
      if (matches.length > 0) {
        const confidence = matches.length / this.errorHistory.length;
        const frequency = matches.length;
        const impact = this.calculatePatternImpact(pattern, matches);

        results.push({
          patternId: pattern.id,
          pattern,
          confidence,
          frequency,
          impact,
          recommendations: this.generateRecommendations(pattern, matches),
        });
      }
    }

    return results;
  }

  /**
   * Check alert rules and trigger alerts if needed
   */
  private checkAlerts(): void {
    const now = new Date();

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastTriggered = this.alertCooldowns.get(rule.id);
      if (
        lastTriggered &&
        now.getTime() - lastTriggered.getTime() < rule.cooldownPeriod * 60 * 1000
      ) {
        continue;
      }

      const isTriggered = this.evaluateAlertCondition(rule);
      if (isTriggered) {
        this.triggerAlert(rule);
        this.alertCooldowns.set(rule.id, now);
      }
    }
  }

  // ============================================================================
  // Private Advanced Analytics Methods
  // ============================================================================

  private detectAnomalyInSeries(timestamps: number[], domain: ErrorDomain): AnomalyResult | null {
    if (timestamps.length < this.anomalyConfig.minDataPoints) return null;

    // Simple Z-score based anomaly detection
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    if (intervals.length === 0) return null;

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    const recentIntervals = intervals.slice(-10); // Check last 10 intervals
    const recentMean = recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length;
    const zScore = Math.abs((recentMean - mean) / stdDev);

    const isAnomaly = zScore > (1 - this.anomalyConfig.sensitivity) * 3; // 3 sigma threshold adjusted by sensitivity

    if (isAnomaly) {
      return {
        isAnomaly: true,
        score: zScore,
        confidence: Math.min(zScore / 3, 1),
        expectedValue: mean,
        actualValue: recentMean,
        timestamp: new Date(),
        context: { domain, intervals: recentIntervals.length },
      };
    }

    return null;
  }

  private getContextKey(error: AppError): string {
    const components = [
      error.context?.component,
      error.context?.operation,
      error.context?.route,
      error.type,
    ].filter(Boolean);

    return components.join('|');
  }

  private findPatternMatches(pattern: ErrorPattern): AppError[] {
    return this.errorHistory.filter(error => {
      // Check domain match
      if (pattern.signature.domains.length > 0 && !pattern.signature.domains.includes(error.type)) {
        return false;
      }

      // Check code match
      if (pattern.signature.codes.length > 0 && !pattern.signature.codes.includes(error.code)) {
        return false;
      }

      // Check message match
      if (pattern.signature.messages.length > 0) {
        const messageMatch = pattern.signature.messages.some(regex => regex.test(error.message));
        if (!messageMatch) return false;
      }

      // Check context match
      for (const [key, regex] of Object.entries(pattern.signature.context)) {
        const contextValue = error.context?.[key];
        if (!contextValue || !regex.test(String(contextValue))) {
          return false;
        }
      }

      return true;
    });
  }

  private calculatePatternImpact(pattern: ErrorPattern, matches: AppError[]): number {
    const severityWeights = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 5,
      [ErrorSeverity.BLOCKER]: 6,
    };

    const totalImpact = matches.reduce(
      (sum, error) => sum + (severityWeights[error.severity] || 1),
      0
    );
    return totalImpact / matches.length;
  }

  private generateRecommendations(pattern: ErrorPattern, matches: AppError[]): string[] {
    const recommendations: string[] = [];

    if (pattern.category === 'network') {
      recommendations.push('Consider implementing retry logic with exponential backoff');
      recommendations.push('Check network connectivity and API endpoints');
    }

    if (pattern.category === 'authentication') {
      recommendations.push('Verify authentication token validity');
      recommendations.push('Check user session management');
    }

    if (matches.length > 10) {
      recommendations.push('High frequency pattern detected - consider immediate investigation');
    }

    return recommendations;
  }

  private evaluateAlertCondition(rule: AlertRule): boolean {
    const timeWindow = rule.timeWindow * 60 * 1000; // Convert to milliseconds
    const windowStart = Date.now() - timeWindow;

    const relevantErrors = this.errorHistory.filter(error => {
      if (error.timestamp < windowStart) return false;
      if (rule.condition.domain && error.type !== rule.condition.domain) return false;
      if (rule.condition.severity && error.severity !== rule.condition.severity) return false;
      return true;
    });

    switch (rule.condition.type) {
      case 'count':
        return relevantErrors.length > rule.threshold;
      case 'rate': {
        const rate = relevantErrors.length / (rule.timeWindow / 60); // errors per minute
        return rate > rule.threshold;
      }
      case 'percentage': {
        const totalErrors = this.errorHistory.filter(e => e.timestamp >= windowStart).length;
        const percentage = totalErrors > 0 ? (relevantErrors.length / totalErrors) * 100 : 0;
        return percentage > rule.threshold;
      }
      default:
        return false;
    }
  }

  private triggerAlert(rule: AlertRule): void {
    const alert: Alert = {
      id: `alert_${rule.id}_${Date.now()}`,
      ruleId: rule.id,
      message: rule.description,
      severity: rule.severity,
      triggeredAt: new Date(),
      metrics: this.getCurrentMetrics(),
      context: {
        rule: rule.name,
        threshold: rule.threshold,
        timeWindow: rule.timeWindow,
      },
    };

    this.activeAlerts.push(alert);

    // Send to alert channels
    this.sendAlertToChannels(alert, rule.channels);

    console.warn('Alert triggered:', alert);
  }

  private getCurrentMetrics(): Record<string, number> {
    const now = Date.now();
    const lastHour = this.errorHistory.filter(e => now - e.timestamp < 3600000).length;
    const last24Hours = this.errorHistory.filter(e => now - e.timestamp < 86400000).length;

    return {
      totalErrors: this.errorHistory.length,
      errorsLastHour: lastHour,
      errorsLast24Hours: last24Hours,
      errorRatePerHour: lastHour,
      errorRatePerDay: last24Hours / 24,
    };
  }

  private sendAlertToChannels(alert: Alert, channels: AlertChannel[]): void {
    for (const channel of channels) {
      try {
        switch (channel.type) {
          case 'console':
            console.error('ALERT:', alert.message, alert);
            break;
          case 'api':
            // Would send to API endpoint
            console.log('Sending alert to API:', channel.config, alert);
            break;
          case 'email':
            // Would send email
            console.log('Sending alert email:', channel.config, alert);
            break;
          case 'webhook':
            // Would send webhook
            console.log('Sending alert webhook:', channel.config, alert);
            break;
        }
      } catch (error) {
        console.error(`Failed to send alert to ${channel.type}:`, error);
      }
    }
  }

  private initializeDefaultPatterns(): void {
    // Default error patterns for common issues
    this.patterns = [
      {
        id: 'network-timeout',
        name: 'Network Timeout Pattern',
        description: 'Repeated network timeout errors',
        signature: {
          domains: [ErrorDomain.NETWORK],
          codes: [],
          messages: [/timeout/i, /timed out/i],
          context: {},
        },
        severity: ErrorSeverity.MEDIUM,
        category: 'network',
        tags: ['timeout', 'network', 'connectivity'],
      },
      {
        id: 'auth-failure',
        name: 'Authentication Failure Pattern',
        description: 'Repeated authentication failures',
        signature: {
          domains: [ErrorDomain.AUTHENTICATION],
          codes: [],
          messages: [/unauthorized/i, /forbidden/i, /invalid token/i],
          context: {},
        },
        severity: ErrorSeverity.HIGH,
        category: 'authentication',
        tags: ['auth', 'security', 'token'],
      },
      {
        id: 'validation-error',
        name: 'Validation Error Pattern',
        description: 'Repeated validation failures',
        signature: {
          domains: [ErrorDomain.VALIDATION],
          codes: [],
          messages: [/validation/i, /invalid/i, /required/i],
          context: {},
        },
        severity: ErrorSeverity.LOW,
        category: 'validation',
        tags: ['validation', 'input', 'user-error'],
      },
    ];
  }

  // ============================================================================
  // Private Monitoring Methods
  // ============================================================================

  private initializeMonitoring(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    // Set up periodic flushing
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Failed to flush monitoring data:', error);
      });
    }, this.monitoringConfig.flushIntervalMs);

    // Load persisted data if available
    this.loadPersistedData();
  }

  private createEmptyMetrics(): ErrorMetrics {
    return {
      totalCount: 0,
      countByDomain: {} as Record<ErrorDomain, number>,
      countBySeverity: {} as Record<ErrorSeverity, number>,
      countByCode: {} as Record<string, number>,
      uniqueUsers: 0,
      averageResolutionTime: 0,
      lastUpdated: new Date(),
    };
  }

  private updateMetrics(error: AppError): void {
    this.metrics.totalCount++;

    // Update domain counts
    this.metrics.countByDomain[error.type] = (this.metrics.countByDomain[error.type] || 0) + 1;

    // Update severity counts
    this.metrics.countBySeverity[error.severity] =
      (this.metrics.countBySeverity[error.severity] || 0) + 1;

    // Update code counts
    this.metrics.countByCode[error.id] = (this.metrics.countByCode[error.id] || 0) + 1;

    // Track unique users (simplified)
    if (error.context?.userId) {
      const uniqueUsers = new Set(this.errorHistory.map(e => e.context?.userId).filter(Boolean));
      this.metrics.uniqueUsers = uniqueUsers.size;
    }

    this.metrics.lastUpdated = new Date();
  }

  private aggregateByDomain(errors: AppError[]): Record<ErrorDomain, number> {
    const result: Record<ErrorDomain, number> = {} as Record<ErrorDomain, number>;
    errors.forEach(error => {
      result[error.type] = (result[error.type] || 0) + 1;
    });
    return result;
  }

  private aggregateByCode(errors: AppError[]): Record<string, number> {
    const result: Record<string, number> = {};
    errors.forEach(error => {
      result[error.id] = (result[error.id] || 0) + 1;
    });
    return result;
  }

  private getTopErrors(errors: AppError[]): ErrorFrequency[] {
    const codeMap = new Map<
      string,
      { count: number; lastOccurred: number; domain: ErrorDomain; users: Set<string> }
    >();

    errors.forEach(error => {
      const key = error.id;
      const existing = codeMap.get(key);

      if (existing) {
        existing.count++;
        if (error.timestamp > existing.lastOccurred) {
          existing.lastOccurred = error.timestamp;
        }
        if (error.context?.userId) {
          existing.users.add(error.context.userId);
        }
      } else {
        codeMap.set(key, {
          count: 1,
          lastOccurred: error.timestamp,
          domain: error.type,
          users: new Set(error.context?.userId ? [error.context.userId] : []),
        });
      }
    });

    return Array.from(codeMap.entries())
      .map(([code, data]) => ({
        code,
        domain: data.domain,
        count: data.count,
        lastOccurred: new Date(data.lastOccurred),
        affectedUsers: data.users.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }

  private calculateTrends(errors: AppError[], timeRange: { start: Date; end: Date }): ErrorTrend[] {
    const hourMs = 60 * 60 * 1000;
    const totalHours = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / hourMs);

    const trends: ErrorTrend[] = [];
    const counts: number[] = [];

    for (let i = 0; i < totalHours; i++) {
      const hourStart = new Date(timeRange.start.getTime() + i * hourMs);
      const hourEnd = new Date(hourStart.getTime() + hourMs);

      const hourErrors = errors.filter(
        error => error.timestamp >= hourStart.getTime() && error.timestamp < hourEnd.getTime()
      );

      const domainCounts = this.aggregateByDomain(hourErrors);
      const primaryDomain =
        (Object.entries(domainCounts).sort(([, a], [, b]) => b - a)[0]?.[0] as ErrorDomain) ||
        ErrorDomain.UNKNOWN;

      counts.push(hourErrors.length);

      trends.push({
        date: hourStart.toISOString(),
        count: hourErrors.length,
        domain: primaryDomain,
      });
    }

    // Calculate growth rates and spike detection
    for (let i = 1; i < trends.length; i++) {
      const current = trends[i].count;
      const previous = trends[i - 1].count;

      if (previous > 0) {
        trends[i].growthRate = ((current - previous) / previous) * 100;
      }

      // Calculate baseline (simple moving average of previous points)
      const baselineWindow = Math.min(i, 5); // Use up to 5 previous points
      const baselineValues = counts.slice(Math.max(0, i - baselineWindow), i);
      const baseline = baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length;

      trends[i].baseline = baseline;

      // Spike detection: current value significantly above baseline
      if (baseline > 0) {
        const deviation = (current - baseline) / baseline;
        trends[i].isSpike = deviation > 2.0; // 200% above baseline
      }
    }

    return trends;
  }

  private calculateRecoveryRate(errors: AppError[]): number {
    if (errors.length === 0) return 0;

    const recoverableErrors = errors.filter(error => error.recoverable);
    if (recoverableErrors.length === 0) return 0;

    const recoveredErrors = recoverableErrors.filter(error => error.recovered);
    return recoveredErrors.length / recoverableErrors.length;
  }

  private calculateAverageResolutionTime(_errors: AppError[]): number {
    // In a real implementation, this would track resolution timestamps
    return 3600000; // 1 hour in milliseconds
  }

  private cleanupOldErrors(): void {
    const cutoff = Date.now() - this.monitoringConfig.retentionPeriodHours * 60 * 60 * 1000;
    this.errorHistory = this.errorHistory.filter(error => error.timestamp >= cutoff);
  }

  private loadPersistedData(): void {
    try {
      const persisted = localStorage.getItem('error-analytics-data');
      if (persisted) {
        // In a real implementation, restore metrics and history
        console.log('Loaded persisted analytics data');
      }
    } catch (error) {
      console.warn('Failed to load persisted analytics data:', error);
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  getStats() {
    return {
      enabled: this.isEnabled,
      monitoringLevel: this.monitoringConfig.level,
      providers: Array.from(this.providers.entries()).map(([key, provider]) => ({
        name: key,
        enabled: provider.isEnabled(),
      })),
      metrics: this.getMetrics(),
      analytics: this.getAnalytics(),
      alerts: {
        rules: this.alertRules.length,
        active: this.getActiveAlerts().length,
        totalTriggered: this.activeAlerts.length,
      },
      anomalyDetection: {
        enabled: this.anomalyConfig.enabled,
        algorithm: this.anomalyConfig.algorithm,
        anomalies: this.detectAnomalies(),
      },
      correlations: this.correlations.length,
      patterns: this.recognizePatterns().length,
    };
  }

  /**
   * Reset all analytics and monitoring data
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.errorHistory = [];
    this.rateLimiter.reset('all');
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.reset();
    this.isInitialized = false;
  }
}

// ============================================================================
// Monitoring Backends
// ============================================================================

export class ConsoleMonitoringBackend implements MonitoringBackend {
  name = 'console';
  isEnabled = true;

  send(data: ErrorAnalytics): void {
    console.group('Error Analytics Report');
    console.log('Total Errors:', data.totalErrors);
    console.log('Errors by Domain:', data.errorsByDomain);
    console.log('Errors by Code:', data.errorsByCode);
    console.log('Top Errors:', data.topErrors);
    console.log('Recovery Rate:', `${(data.recoveryRate * 100).toFixed(1)}%`);
    console.groupEnd();
  }
}

export class AnalyticsMonitoringBackend implements MonitoringBackend {
  name = 'analytics';
  isEnabled = true;

  send(data: ErrorAnalytics): void {
    // In a real implementation, this would send to an analytics service
    console.log('Sending error analytics to analytics service:', data);
  }
}
