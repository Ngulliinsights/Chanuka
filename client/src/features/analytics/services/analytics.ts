/**
 * Analytics Business Logic Service
 * Provides high-level analytics operations with business logic,
 * data transformation, and caching capabilities
 */

import { analyticsApiService } from '@client/core/api';
import type {
  BillAnalytics,
  AnalyticsFilters,
  AnalyticsSummary,
  DashboardData,
  EngagementReport,
  ConflictReport,
  AnalyticsResponse,
  UserActivity,
  AnalyticsAlert,
} from '@client/shared/types/analytics';

// ============================================================================
// Enhanced Type Definitions
// ============================================================================

interface Conflict {
  type: 'financial' | 'political' | 'ideological';
  severity: 'low' | 'medium' | 'high';
  conflict_level?: 'low' | 'medium' | 'high';
  description: string;
  entities: string[];
  evidence: string[];
  confidence?: number;
}

interface DailyEngagement {
  date: string;
  views: number;
  comments?: number;
  shares?: number;
}

interface EngagementMetrics {
  views: number;
  comments: number;
  shares: number;
  bookmarks: number;
  votes?: number;
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  momentum: number;
}

interface TopicData {
  topic: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

interface StakeholderData {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  affectedCount: number;
}

interface RealtimeMetrics {
  activeUsers: number;
  currentEngagement: number;
  recentAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

// Extended types for additional properties
type ExtendedAnalyticsSummary = AnalyticsSummary & {
  engagementGrowthRate: number;
  riskScore: number;
};

type ExtendedDashboardData = DashboardData & {
  summary: ExtendedAnalyticsSummary;
};

type ExtendedEngagementReport = EngagementReport & {
  trendAnalysis: TrendAnalysis;
  engagementScore: number;
  breakdown: EngagementMetrics;
  metrics: EngagementMetrics;
};

type ExtendedConflictReport = ConflictReport & {
  recommendations: string[];
  priorityScore: number;
};

type ExtendedBillAnalytics = BillAnalytics & {
  conflicts: Conflict[];
  riskLevel: 'low' | 'medium' | 'high';
};

type ExtendedUserActivity = UserActivity & {
  engagementScore: number;
  activityLevel: 'low' | 'medium' | 'high';
};

type ExtendedAnalyticsAlert = AnalyticsAlert & {
  priority: number;
  impact: 'low' | 'medium' | 'high';
};

type ExtendedTopic = TopicData & {
  sentiment?: number;
  velocity: number;
};

type ExtendedStakeholder = StakeholderData & {
  impactScore: number;
};

type ExtendedRealtimeMetrics = RealtimeMetrics & {
  healthScore: number;
};

/**
 * Cache entry structure with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Business logic service for analytics operations.
 * Handles data transformation, caching, and complex analytics workflows.
 */
export class AnalyticsService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize = 100;

  // ============================================================================
  // Cache Management
  // ============================================================================

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp >= cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCached<T>(key: string, data: T, ttl = this.defaultCacheTTL): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private generateCacheKey(prefix: string, filters?: AnalyticsFilters): string {
    if (!filters) return prefix;

    // Create a stable cache key from filters
    const parts: string[] = [];

    if (filters.dateRange) {
      parts.push(`date:${filters.dateRange.start}-${filters.dateRange.end}`);
    }
    if (filters.billStatus) {
      parts.push(`status:${filters.billStatus.sort().join(',')}`);
    }
    if (filters.categories) {
      parts.push(`cat:${filters.categories.sort().join(',')}`);
    }
    if (filters.location) {
      parts.push(`loc:${filters.location}`);
    }
    if (filters.tags) {
      parts.push(`tags:${filters.tags.sort().join(',')}`);
    }

    return parts.length > 0 ? `${prefix}-${parts.join('|')}` : prefix;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public clearCacheByPrefix(prefix: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(prefix));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // ============================================================================
  // Public API Methods - Dashboard & Summary
  // ============================================================================

  async getDashboard(filters?: AnalyticsFilters): Promise<ExtendedDashboardData> {
    const cacheKey = this.generateCacheKey('dashboard', filters);
    const cached = this.getCached<ExtendedDashboardData>(cacheKey);
    if (cached) return cached;

    const rawData = await analyticsApiService.getDashboard(filters);
    const enhancedData = this.enhanceDashboardData(rawData);

    this.setCached(cacheKey, enhancedData);
    return enhancedData;
  }

  async getSummary(filters?: AnalyticsFilters): Promise<ExtendedAnalyticsSummary> {
    const cacheKey = this.generateCacheKey('summary', filters);
    const cached = this.getCached<ExtendedAnalyticsSummary>(cacheKey);
    if (cached) return cached;

    const rawData = await analyticsApiService.getSummary(filters);
    const enhancedData: ExtendedAnalyticsSummary = {
      ...rawData,
      engagementGrowthRate: this.calculateEngagementGrowth(rawData),
      riskScore: this.calculateRiskScore(rawData),
    };

    this.setCached(cacheKey, enhancedData);
    return enhancedData;
  }

  // ============================================================================
  // Public API Methods - Bill Analytics
  // ============================================================================

  async getBillAnalytics(
    billId: string,
    filters?: AnalyticsFilters
  ): Promise<ExtendedBillAnalytics> {
    const cacheKey = this.generateCacheKey(`bill-${billId}`, filters);
    const cached = this.getCached<ExtendedBillAnalytics>(cacheKey);
    if (cached) return cached;

    const [analytics, conflictReport] = await Promise.all([
      analyticsApiService.getBillAnalytics(billId, filters),
      analyticsApiService.getConflictReport(billId),
    ]);

    const conflicts = this.normalizeConflicts(conflictReport.conflicts);
    const enhancedData: ExtendedBillAnalytics = {
      ...analytics,
      conflicts,
      riskLevel: this.calculateBillRiskLevel(conflicts),
    };

    this.setCached(cacheKey, enhancedData);
    return enhancedData;
  }

  async getEngagementReport(
    billId: string,
    filters?: AnalyticsFilters
  ): Promise<ExtendedEngagementReport> {
    const cacheKey = this.generateCacheKey(`engagement-${billId}`, filters);
    const cached = this.getCached<ExtendedEngagementReport>(cacheKey);
    if (cached) return cached;

    const rawData = await analyticsApiService.getEngagementReport(billId, filters);
    const breakdown = this.extractEngagementMetrics(rawData);
    const dailyData = this.extractDailyData(rawData);

    const enhancedData: ExtendedEngagementReport = {
      ...rawData,
      breakdown,
      metrics: breakdown,
      trendAnalysis: this.analyzeEngagementTrends(dailyData),
      engagementScore: this.calculateEngagementScore(breakdown),
    };

    this.setCached(cacheKey, enhancedData);
    return enhancedData;
  }

  async getConflictReport(billId: string): Promise<ExtendedConflictReport> {
    const cacheKey = `conflicts-${billId}`;
    const cached = this.getCached<ExtendedConflictReport>(cacheKey);
    if (cached) return cached;

    const rawData = await analyticsApiService.getConflictReport(billId);
    const conflicts = this.normalizeConflicts(rawData.conflicts);

    const enhancedData: ExtendedConflictReport = {
      ...rawData,
      recommendations: this.generateConflictRecommendations(conflicts),
      priorityScore: this.calculateConflictPriority(conflicts),
    };

    this.setCached(cacheKey, enhancedData);
    return enhancedData;
  }

  // ============================================================================
  // Public API Methods - User & Activity
  // ============================================================================

  async getUserActivity(
    userId?: string,
    filters?: AnalyticsFilters
  ): Promise<AnalyticsResponse<ExtendedUserActivity[]>> {
    const rawData = await analyticsApiService.getUserActivity(userId, filters);

    const enhancedActivities = rawData.data.map(activity => ({
      ...activity,
      engagementScore: this.calculateUserEngagementScore(activity),
      activityLevel: this.determineActivityLevel(this.getActivityEngagement(activity)),
    }));

    return {
      ...rawData,
      data: enhancedActivities,
    };
  }

  async getTopBills(limit = 10, filters?: AnalyticsFilters): Promise<BillAnalytics[]> {
    const cacheKey = this.generateCacheKey(`top-bills-${limit}`, filters);
    const cached = this.getCached<BillAnalytics[]>(cacheKey);
    if (cached) return cached;

    const rawData = await analyticsApiService.getTopBills(limit, filters);
    const rankedBills = this.rankBillsByImportance(rawData);

    this.setCached(cacheKey, rankedBills);
    return rankedBills;
  }

  // ============================================================================
  // Public API Methods - Alerts & Trends
  // ============================================================================

  async getAlerts(acknowledged = false): Promise<ExtendedAnalyticsAlert[]> {
    const rawData = await analyticsApiService.getAlerts(acknowledged);

    const enhancedAlerts = rawData.map(alert => ({
      ...alert,
      priority: this.calculateAlertPriority(alert),
      impact: this.assessAlertImpact(alert),
    }));

    return enhancedAlerts.sort((a, b) => b.priority - a.priority);
  }

  async getTrendingTopics(limit = 20): Promise<ExtendedTopic[]> {
    const rawData = await analyticsApiService.getTrendingTopics(limit);
    const topics = this.normalizeTopics(rawData);

    return topics.map(topic => ({
      ...topic,
      sentiment: this.calculateTopicSentiment(topic),
      velocity: this.calculateTrendVelocity(topic),
    }));
  }

  async getStakeholderAnalysis(billId?: string): Promise<ExtendedStakeholder[]> {
    const rawData = await analyticsApiService.getStakeholderAnalysis(billId);
    const stakeholders = this.normalizeStakeholders(rawData);

    return stakeholders.map(stakeholder => ({
      ...stakeholder,
      impactScore: this.calculateStakeholderImpact(stakeholder),
    }));
  }

  // ============================================================================
  // Public API Methods - Export & Real-time
  // ============================================================================

  async exportAnalytics(
    filters?: AnalyticsFilters,
    format: 'csv' | 'json' = 'json'
  ): Promise<unknown> {
    const rawData = await analyticsApiService.exportAnalytics(filters, format);
    return this.formatExportData(rawData, format);
  }

  async getRealtimeMetrics(): Promise<ExtendedRealtimeMetrics> {
    const rawData = await analyticsApiService.getRealtimeMetrics();
    const metrics = this.normalizeRealtimeMetrics(rawData);

    return {
      ...metrics,
      healthScore: this.calculateSystemHealthScore(metrics),
    };
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await analyticsApiService.acknowledgeAlert(alertId);
  }

  // ============================================================================
  // Type Normalization Helpers
  // ============================================================================

  private normalizeConflicts(data: unknown): Conflict[] {
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
      type: (item?.type as Conflict['type']) || 'financial',
      severity: (item?.severity || item?.conflict_level || 'low') as Conflict['severity'],
      conflict_level: (item?.conflict_level || item?.severity || 'low') as Conflict['severity'],
      description: String(item?.description || ''),
      entities: Array.isArray(item?.entities) ? item.entities : [],
      evidence: Array.isArray(item?.evidence) ? item.evidence : [],
      confidence: Number(item?.confidence) || 1,
    }));
  }

  private normalizeTopics(data: unknown): TopicData[] {
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
      topic: String(item?.topic || ''),
      count: Number(item?.count) || 0,
      trend: (item?.trend as TopicData['trend']) || 'stable',
    }));
  }

  private normalizeStakeholders(data: unknown): StakeholderData[] {
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
      name: String(item?.name || ''),
      impact: (item?.impact as StakeholderData['impact']) || 'neutral',
      confidence: Number(item?.confidence) || 1,
      affectedCount: Number(item?.affectedCount) || 1,
    }));
  }

  private normalizeRealtimeMetrics(data: unknown): RealtimeMetrics {
    const metrics = data as Partial<RealtimeMetrics>;
    return {
      activeUsers: Number(metrics?.activeUsers) || 0,
      currentEngagement: Number(metrics?.currentEngagement) || 0,
      recentAlerts: Number(metrics?.recentAlerts) || 0,
      systemHealth: (metrics?.systemHealth as RealtimeMetrics['systemHealth']) || 'healthy',
    };
  }

  private extractEngagementMetrics(data: unknown): EngagementMetrics {
    const record = data as Record<string, unknown>;
    const breakdown = record?.engagement_breakdown as Record<string, unknown> | undefined;

    return {
      views: Number(breakdown?.views) || 0,
      comments: Number(breakdown?.comments) || 0,
      shares: Number(breakdown?.shares) || 0,
      bookmarks: Number(breakdown?.bookmarks) || 0,
      votes: Number(breakdown?.votes) || 0,
    };
  }

  private extractDailyData(data: unknown): DailyEngagement[] {
    const record = data as Record<string, unknown>;
    const timeline = record?.engagement_timeline;

    if (!Array.isArray(timeline)) return [];

    return timeline.map(item => ({
      date: String(item?.date || ''),
      views: Number(item?.engagement) || 0,
      comments: 0,
      shares: 0,
    }));
  }

  private getActivityEngagement(activity: UserActivity): number {
    // Calculate engagement based on action type weight
    const actionWeights: Record<UserActivity['action'], number> = {
      view: 1,
      comment: 5,
      vote: 4,
      share: 3,
      bookmark: 2,
      search: 1,
    };

    const baseWeight = actionWeights[activity.action] || 1;
    const durationBonus = activity.duration ? Math.min(activity.duration / 60, 10) : 0;

    return baseWeight + durationBonus;
  }

  // ============================================================================
  // Business Logic - Dashboard Enhancement
  // ============================================================================

  private enhanceDashboardData(data: DashboardData): ExtendedDashboardData {
    return {
      ...data,
      summary: {
        ...data.summary,
        engagementGrowthRate: this.calculateEngagementGrowth(data.summary),
        riskScore: this.calculateRiskScore(data.summary),
      },
    };
  }

  // ============================================================================
  // Business Logic - Growth & Risk Calculations
  // ============================================================================

  private calculateEngagementGrowth(summary: AnalyticsSummary): number {
    const baselineThreshold = 300;
    return summary.average_time_spent > baselineThreshold ? 0.15 : -0.05;
  }

  private calculateRiskScore(summary: AnalyticsSummary): number {
    const lowEngagementThreshold = 300;
    return summary.average_time_spent < lowEngagementThreshold ? 0.3 : 0;
  }

  private calculateBillRiskLevel(conflicts: Conflict[]): 'low' | 'medium' | 'high' {
    const highSeverity = conflicts.filter(c => c.severity === 'high').length;
    const mediumSeverity = conflicts.filter(c => c.severity === 'medium').length;

    if (highSeverity > 2) return 'high';
    if (highSeverity > 0 || mediumSeverity > 3) return 'medium';
    return 'low';
  }

  // ============================================================================
  // Business Logic - Engagement Analysis
  // ============================================================================

  private analyzeEngagementTrends(dailyData: DailyEngagement[]): TrendAnalysis {
    if (dailyData.length < 2) {
      return { direction: 'stable', changePercent: 0, momentum: 0 };
    }

    const recentPeriod = dailyData.slice(-7);
    const previousPeriod = dailyData.slice(-14, -7);

    const recentAvg = this.calculateAverage(recentPeriod.map(d => d.views));
    const previousAvg = this.calculateAverage(previousPeriod.map(d => d.views));

    if (previousAvg === 0) {
      return { direction: 'stable', changePercent: 0, momentum: 0 };
    }

    const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
    const changeThreshold = 5;
    const direction =
      changePercent > changeThreshold ? 'up' : changePercent < -changeThreshold ? 'down' : 'stable';

    return {
      direction,
      changePercent,
      momentum: this.calculateMomentum(dailyData.slice(-14)),
    };
  }

  private calculateEngagementScore(metrics: EngagementMetrics): number {
    const weights = { views: 0.3, comments: 0.4, shares: 0.2, bookmarks: 0.1 };
    const weightedSum =
      metrics.views * weights.views +
      metrics.comments * weights.comments +
      metrics.shares * weights.shares +
      metrics.bookmarks * weights.bookmarks;

    return Math.min(weightedSum / 10, 10);
  }

  private calculateUserEngagementScore(activity: UserActivity): number {
    const actionWeights: Record<UserActivity['action'], number> = {
      view: 1,
      comment: 3,
      share: 2,
      bookmark: 2,
      vote: 4,
      search: 1,
    };

    const weight = actionWeights[activity.action];
    const durationBonus = activity.duration ? Math.min(activity.duration / 300, 2) : 0;

    return Math.min(weight + durationBonus, 10);
  }

  private determineActivityLevel(totalEngagement: number): 'low' | 'medium' | 'high' {
    if (totalEngagement > 50) return 'high';
    if (totalEngagement > 20) return 'medium';
    return 'low';
  }

  // ============================================================================
  // Business Logic - Conflict Analysis
  // ============================================================================

  private generateConflictRecommendations(conflicts: Conflict[]): string[] {
    if (conflicts.length === 0) {
      return ['No conflicts detected. Continue monitoring for emerging issues.'];
    }

    const recommendations: string[] = [];
    const highSeverity = conflicts.filter(c => c.severity === 'high').length;
    const mediumSeverity = conflicts.filter(c => c.severity === 'medium').length;

    if (highSeverity > 0) {
      recommendations.push(
        'Immediate review required for high-priority conflicts. Consider escalation to senior stakeholders.'
      );
    }

    if (conflicts.length > 5) {
      recommendations.push(
        'Multiple conflicts detected. Consider stakeholder consultation to address systemic concerns.'
      );
    }

    if (mediumSeverity > 3) {
      recommendations.push(
        'Pattern of medium-severity conflicts suggests need for policy clarification or amendment review.'
      );
    }

    return recommendations;
  }

  private calculateConflictPriority(conflicts: Conflict[]): number {
    if (conflicts.length === 0) return 0;

    const severityScores: Record<string, number> = { low: 1, medium: 2, high: 3 };
    const totalScore = conflicts.reduce((sum, conflict) => {
      const severityScore = severityScores[conflict.severity] || 1;
      const confidence = conflict.confidence || 1;
      return sum + severityScore * confidence;
    }, 0);

    return totalScore / conflicts.length;
  }

  // ============================================================================
  // Business Logic - Ranking & Prioritization
  // ============================================================================

  private rankBillsByImportance(bills: BillAnalytics[]): BillAnalytics[] {
    return [...bills].sort((a, b) => {
      const scoreA = this.calculateBillImportanceScore(a);
      const scoreB = this.calculateBillImportanceScore(b);
      return scoreB - scoreA;
    });
  }

  private calculateBillImportanceScore(bill: BillAnalytics): number {
    // Use actual BillAnalytics properties for scoring
    const viewScore = bill.views * 0.4;
    const commentScore = bill.comments_count * 0.3;
    const engagementScore = bill.engagement_score * 0.2;
    const trendingBonus = bill.trending_score * 0.1;

    return viewScore + commentScore + engagementScore + trendingBonus;
  }

  private calculateAlertPriority(alert: AnalyticsAlert): number {
    const severityScores: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };
    const typeMultipliers: Record<string, number> = {
      engagement: 1.2,
      performance: 1.0,
      security: 1.5,
      error: 1.3,
    };

    const severityScore = severityScores[alert.severity] || 1;
    const typeMultiplier = typeMultipliers[alert.type] || 1.0;

    return severityScore * typeMultiplier;
  }

  private assessAlertImpact(alert: AnalyticsAlert): 'low' | 'medium' | 'high' {
    if (alert.severity === 'critical' || alert.severity === 'high') return 'high';
    if (alert.severity === 'medium') return 'medium';
    return 'low';
  }

  // ============================================================================
  // Business Logic - Stakeholder & Topic Analysis
  // ============================================================================

  private calculateStakeholderImpact(stakeholder: StakeholderData): number {
    const impactValues: Record<string, number> = { positive: 1, negative: -1, neutral: 0 };
    const sentimentScore = impactValues[stakeholder.impact] || 0;
    return sentimentScore * stakeholder.confidence * stakeholder.affectedCount;
  }

  private calculateTopicSentiment(topic: TopicData): number {
    const baseScore = Math.min(topic.count / 100, 1);
    const trendBonus = topic.trend === 'up' ? 0.2 : topic.trend === 'down' ? -0.2 : 0;
    return Math.max(-1, Math.min(1, baseScore + trendBonus - 0.5));
  }

  private calculateTrendVelocity(topic: TopicData): number {
    const trendMultiplier = { up: 1.5, stable: 1.0, down: 0.5 }[topic.trend];
    return topic.count * trendMultiplier;
  }

  // ============================================================================
  // Business Logic - Export & System Health
  // ============================================================================

  private formatExportData(data: unknown, format: string): unknown {
    if (format === 'csv') return this.convertToCSV(data);
    return data;
  }

  private convertToCSV(data: unknown): string {
    if (!Array.isArray(data) || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const escapeCSVValue = (value: unknown): string => {
      const stringValue = String(value ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headerRow = headers.map(escapeCSVValue).join(',');
    const dataRows = data.map(row => headers.map(h => escapeCSVValue(row[h])).join(','));

    return [headerRow, ...dataRows].join('\n');
  }

  private calculateSystemHealthScore(metrics: RealtimeMetrics): number {
    const userScore = Math.min(metrics.activeUsers / 100, 1);
    const engagementScore = Math.min(metrics.currentEngagement / 100, 1);
    const alertPenalty = metrics.recentAlerts * 0.1;
    const healthMultipliers = { healthy: 1.0, warning: 0.7, error: 0.3 };

    const healthMultiplier = healthMultipliers[metrics.systemHealth];
    const baseScore = (userScore + engagementScore) / 2;
    const adjustedScore = (baseScore - alertPenalty) * healthMultiplier;

    return Math.max(Math.min(adjustedScore, 1), 0);
  }

  // ============================================================================
  // Utility Helper Methods
  // ============================================================================

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((acc, val) => acc + val, 0) / values.length;
  }

  private calculateMomentum(dataPoints: DailyEngagement[]): number {
    if (dataPoints.length < 3) return 0;

    const changes: number[] = [];
    for (let i = 1; i < dataPoints.length; i++) {
      changes.push(dataPoints[i].views - dataPoints[i - 1].views);
    }

    if (changes.length < 2) return 0;

    const recentChanges = changes.slice(-3);
    const momentum = recentChanges.reduce((sum, change, idx) => {
      const weight = (idx + 1) / recentChanges.length;
      return sum + change * weight;
    }, 0);

    return momentum / recentChanges.length;
  }
}

/**
 * Global singleton instance of the analytics business logic service.
 */
export const analyticsService = new AnalyticsService();
