/**
 * Error Analytics Dashboard
 *
 * Real-time error monitoring component with live error feed, real-time metrics updates,
 * and WebSocket integration for streaming error data. Implements the designed architecture
 * and integrates with the core error handler.
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  Users
} from 'lucide-react';

// Define types locally to avoid import issues
interface TimeRange {
  start: number;
  end: number;
  preset?: '1h' | '24h' | '7d' | '30d' | '90d' | 'custom';
}

interface DashboardFilters {
  timeRange: TimeRange;
  severity: string[];
  domain: string[];
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
  severityDistribution: Record<string, number>;
  domainDistribution: Record<string, number>;
  timeRange: TimeRange;
  lastUpdated: number;
}

interface ErrorTrendData {
  timeSeries: any[];
  growthRate: number;
  seasonality: any;
  anomalies: any[];
  projections: any;
  period: string;
}

interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: number;
  severity: string;
  domain: string;
  cluster: any;
  impact: any;
  recommendations: string[];
}

interface RecoveryAnalytics {
  overallSuccessRate: number;
  strategyEffectiveness: any[];
  recoveryTimeDistribution: any;
  failureAnalysis: any[];
  automatedRecoveryRate: number;
  manualInterventionRate: number;
}

interface ErrorAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  threshold?: any;
  pattern?: ErrorPattern;
}

interface ErrorEvent {
  id: string;
  timestamp: number;
  type: string;
  severity: string;
  message: string;
  userId: string;
  sessionId: string;
  component: string;
  recoverable: boolean;
  recovered: boolean;
}

interface SystemHealthStatus {
  overall: string;
  components: any[];
  uptime: number;
  lastIncident?: number;
}

interface RealTimeMetrics {
  currentErrorRate: number;
  activeAlerts: ErrorAlert[];
  liveStream: ErrorEvent[];
  systemHealth: SystemHealthStatus;
  performanceMetrics: any;
}

// Import core error handler
import { coreErrorHandler } from '../../core/error/handler';
import { ErrorDomain, ErrorSeverity } from '../../core/error/types';

// Import real-time store
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface ErrorAnalyticsDashboardProps {
  refreshInterval?: number;
  enableRealTime?: boolean;
  enableExport?: boolean;
  maxDisplayErrors?: number;
  className?: string;
}

const ErrorAnalyticsDashboard = memo(function ErrorAnalyticsDashboard({
  refreshInterval = 30000, // 30 seconds
  enableRealTime = true,
  enableExport = true,
  maxDisplayErrors = 100,
  className = ''
}: ErrorAnalyticsDashboardProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'patterns' | 'recovery' | 'realtime'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [filters, setFilters] = useState<DashboardFilters>({
    timeRange: { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now(), preset: '24h' },
    severity: [],
    domain: [],
    component: [],
  });

  // Data states
  const [overviewMetrics, setOverviewMetrics] = useState<ErrorOverviewMetrics | null>(null);
  const [trendData, setTrendData] = useState<ErrorTrendData | null>(null);
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [recoveryAnalytics, setRecoveryAnalytics] = useState<RecoveryAnalytics | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);

  // Real-time store integration
  const connection = useSelector((state: RootState) => state.realTime.connection);
  const notifications = useSelector((state: RootState) => state.realTime.notifications);

  // Error analytics bridge
  const errorAnalyticsBridge = useMemo(() => ({
    getOverviewMetrics: async (filters: DashboardFilters): Promise<ErrorOverviewMetrics> => {
      const coreStats = coreErrorHandler.getErrorStats();
      const recentErrors = coreErrorHandler.getRecentErrors(1000);

      // Calculate metrics based on time range
      const timeFilteredErrors = recentErrors.filter(error =>
        error.timestamp >= filters.timeRange.start && error.timestamp <= filters.timeRange.end
      );

      const severityFilteredErrors = filters.severity.length > 0
        ? timeFilteredErrors.filter(error => filters.severity.includes(error.severity))
        : timeFilteredErrors;

      const domainFilteredErrors = filters.domain.length > 0
        ? severityFilteredErrors.filter(error => filters.domain.includes(error.type))
        : severityFilteredErrors;

      return {
        totalErrors: domainFilteredErrors.length,
        errorRate: domainFilteredErrors.length / ((filters.timeRange.end - filters.timeRange.start) / (60 * 1000)), // per minute
        uniqueErrors: new Set(domainFilteredErrors.map(e => e.message)).size,
        affectedUsers: new Set(domainFilteredErrors.map(e => e.context?.userId).filter(Boolean)).size,
        averageResolutionTime: calculateAverageResolutionTime(domainFilteredErrors),
        severityDistribution: buildSeverityDistribution(domainFilteredErrors),
        domainDistribution: buildDomainDistribution(domainFilteredErrors),
        timeRange: filters.timeRange,
        lastUpdated: Date.now(),
      };
    },

    getTrendData: async (period: string, filters: DashboardFilters): Promise<ErrorTrendData> => {
      const recentErrors = coreErrorHandler.getRecentErrors(1000);
      const timeSeries = buildTimeSeries(recentErrors, period, filters);

      return {
        timeSeries,
        growthRate: calculateGrowthRate(timeSeries),
        seasonality: detectSeasonality(timeSeries),
        anomalies: detectAnomalies(timeSeries),
        projections: calculateProjections(timeSeries),
        period,
      };
    },

    getPatterns: async (filters: DashboardFilters): Promise<ErrorPattern[]> => {
      const recentErrors = coreErrorHandler.getRecentErrors(1000);
      return detectErrorPatterns(recentErrors, filters);
    },

    getRecoveryAnalytics: async (filters: DashboardFilters): Promise<RecoveryAnalytics> => {
      const recentErrors = coreErrorHandler.getRecentErrors(1000);
      const recoveredErrors = recentErrors.filter(e => e.recovered);

      return {
        overallSuccessRate: recoveredErrors.length / recentErrors.length,
        strategyEffectiveness: calculateStrategyEffectiveness(recoveredErrors),
        recoveryTimeDistribution: calculateRecoveryTimeDistribution(recoveredErrors),
        failureAnalysis: calculateRecoveryFailures(recentErrors.filter(e => !e.recovered)),
        automatedRecoveryRate: recoveredErrors.filter(e => e.recoveryStrategy).length / recoveredErrors.length,
        manualInterventionRate: 1 - (recoveredErrors.filter(e => e.recoveryStrategy).length / recoveredErrors.length),
      };
    },

    getRealTimeMetrics: async (): Promise<RealTimeMetrics> => {
      const recentErrors = coreErrorHandler.getRecentErrors(50);
      const activeAlerts = generateActiveAlerts(recentErrors);

      return {
        currentErrorRate: recentErrors.length / 5, // per minute over last 5 minutes
        activeAlerts,
        liveStream: recentErrors.slice(0, 20).map(transformToErrorEvent),
        systemHealth: getSystemHealthStatus(),
        performanceMetrics: getPerformanceMetrics(),
      };
    },
  }), []);

  // Helper functions
  const calculateAverageResolutionTime = (errors: any[]): number => {
    const resolvedErrors = errors.filter(e => e.recovered && e.recoveryStrategy);
    if (resolvedErrors.length === 0) return 0;

    const totalTime = resolvedErrors.reduce((sum, error) => {
      // Assume recovery time is stored or calculate from timestamps
      return sum + (error.recoveryTime || 300000); // Default 5 minutes
    }, 0);

    return totalTime / resolvedErrors.length;
  };

  const buildSeverityDistribution = (errors: any[]) => ({
    [ErrorSeverity.CRITICAL]: errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
    [ErrorSeverity.HIGH]: errors.filter(e => e.severity === ErrorSeverity.HIGH).length,
    [ErrorSeverity.MEDIUM]: errors.filter(e => e.severity === ErrorSeverity.MEDIUM).length,
    [ErrorSeverity.LOW]: errors.filter(e => e.severity === ErrorSeverity.LOW).length,
  });

  const buildDomainDistribution = (errors: any[]) => ({
    [ErrorDomain.NETWORK]: errors.filter(e => e.type === ErrorDomain.NETWORK).length,
    [ErrorDomain.AUTHENTICATION]: errors.filter(e => e.type === ErrorDomain.AUTHENTICATION).length,
    [ErrorDomain.VALIDATION]: errors.filter(e => e.type === ErrorDomain.VALIDATION).length,
    [ErrorDomain.SYSTEM]: errors.filter(e => e.type === ErrorDomain.SYSTEM).length,
    [ErrorDomain.UNKNOWN]: errors.filter(e => e.type === ErrorDomain.UNKNOWN).length,
  });

  const buildTimeSeries = (errors: any[], period: string, filters: DashboardFilters) => {
    // Group errors by time intervals based on period
    const intervalMs = getIntervalMs(period);
    const intervals: { [key: number]: any[] } = {};

    errors.forEach(error => {
      const interval = Math.floor(error.timestamp / intervalMs) * intervalMs;
      if (!intervals[interval]) intervals[interval] = [];
      intervals[interval].push(error);
    });

    return Object.entries(intervals).map(([timestamp, intervalErrors]) => ({
      timestamp: parseInt(timestamp),
      totalErrors: intervalErrors.length,
      errorRate: intervalErrors.length / (intervalMs / (60 * 1000)), // per minute
      severityBreakdown: buildSeverityDistribution(intervalErrors),
      domainBreakdown: buildDomainDistribution(intervalErrors),
      uniqueErrors: new Set(intervalErrors.map(e => e.message)).size,
    })).sort((a, b) => a.timestamp - b.timestamp);
  };

  const getIntervalMs = (period: string): number => {
    switch (period) {
      case '1h': return 5 * 60 * 1000; // 5 minutes
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 24 * 60 * 60 * 1000; // 1 day
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      default: return 60 * 60 * 1000;
    }
  };

  const calculateGrowthRate = (timeSeries: any[]): number => {
    if (timeSeries.length < 2) return 0;
    const recent = timeSeries.slice(-10);
    const earlier = timeSeries.slice(-20, -10);

    const recentAvg = recent.reduce((sum, point) => sum + point.totalErrors, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, point) => sum + point.totalErrors, 0) / earlier.length;

    return earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
  };

  const detectSeasonality = (timeSeries: any[]) => {
    // Simple seasonality detection - in real implementation would use statistical analysis
    return {
      detected: false,
      pattern: null,
      confidence: 0,
    };
  };

  const detectAnomalies = (timeSeries: any[]): any[] => {
    if (timeSeries.length < 10) return [];

    const values = timeSeries.map(p => p.totalErrors);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    return timeSeries
      .filter(point => Math.abs(point.totalErrors - mean) > 2 * stdDev)
      .map(point => ({
        timestamp: point.timestamp,
        value: point.totalErrors,
        expectedValue: mean,
        deviation: Math.abs(point.totalErrors - mean),
        severity: point.totalErrors > mean + 3 * stdDev ? 'critical' : 'high',
        description: `Anomalous error count: ${point.totalErrors} (expected: ${mean.toFixed(1)})`,
      }));
  };

  const calculateProjections = (timeSeries: any[]) => {
    if (timeSeries.length < 5) return { nextHour: 0, nextDay: 0, nextWeek: 0, confidence: 0 };

    const recent = timeSeries.slice(-5);
    const trend = recent.reduce((acc, point, i) => {
      if (i === 0) return acc;
      return acc + (point.totalErrors - recent[i-1].totalErrors);
    }, 0) / (recent.length - 1);

    const lastValue = recent[recent.length - 1].totalErrors;

    return {
      nextHour: Math.max(0, lastValue + trend),
      nextDay: Math.max(0, lastValue + trend * 24),
      nextWeek: Math.max(0, lastValue + trend * 168),
      confidence: 0.7,
    };
  };

  const detectErrorPatterns = (errors: any[], filters: DashboardFilters): ErrorPattern[] => {
    // Advanced pattern detection with clustering
    const patterns = performAdvancedPatternDetection(errors, filters);

    // Apply clustering algorithm
    const clusteredPatterns = applyClusteringAlgorithm(patterns);

    // Calculate impact scores and enrich patterns
    return clusteredPatterns
      .map(pattern => enrichPatternWithImpact(pattern, errors))
      .sort((a, b) => b.impact.businessImpact === 'critical' ? 1 :
                      a.impact.businessImpact === 'high' ? -1 :
                      b.frequency - a.frequency)
      .slice(0, 50); // Increased limit for better analysis
  };

  const performAdvancedPatternDetection = (errors: any[], filters: DashboardFilters) => {
    const patterns: any[] = [];

    // 1. Message-based clustering with similarity
    const messageClusters = clusterByMessageSimilarity(errors);

    // 2. Stack trace analysis
    const stackClusters = clusterByStackTrace(errors);

    // 3. Component-context clustering
    const componentClusters = clusterByComponentContext(errors);

    // 4. Temporal pattern analysis
    const temporalClusters = clusterByTemporalPatterns(errors);

    // Merge clusters using weighted similarity
    const mergedClusters = mergeClusters([messageClusters, stackClusters, componentClusters, temporalClusters]);

    return mergedClusters.map(cluster => ({
      id: generatePatternId(cluster),
      errors: cluster.errors,
      centroid: cluster.centroid,
      similarity: cluster.similarity,
      confidence: cluster.confidence,
    }));
  };

  const clusterByMessageSimilarity = (errors: any[]) => {
    const clusters: any[] = [];

    errors.forEach(error => {
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const cluster of clusters) {
        const similarity = calculateMessageSimilarity(error.message, cluster.centroid.message);
        if (similarity > 0.7 && similarity > bestSimilarity) {
          bestMatch = cluster;
          bestSimilarity = similarity;
        }
      }

      if (bestMatch && bestSimilarity > 0.8) {
        bestMatch.errors.push(error);
        bestMatch.centroid = updateCentroid(bestMatch);
      } else {
        clusters.push({
          errors: [error],
          centroid: {
            message: error.message,
            stackTrace: error.stack || '',
            component: error.context?.component || '',
            userAgent: error.context?.userAgent || '',
            url: error.context?.url || '',
          },
          similarity: 1.0,
          confidence: 0.9,
        });
      }
    });

    return clusters.filter(cluster => cluster.errors.length > 1);
  };

  const clusterByStackTrace = (errors: any[]) => {
    const clusters: any[] = [];

    errors.forEach(error => {
      if (!error.stack) return;

      let bestMatch = null;
      let bestSimilarity = 0;

      for (const cluster of clusters) {
        const similarity = calculateStackSimilarity(error.stack, cluster.centroid.stackTrace);
        if (similarity > 0.6 && similarity > bestSimilarity) {
          bestMatch = cluster;
          bestSimilarity = similarity;
        }
      }

      if (bestMatch && bestSimilarity > 0.7) {
        bestMatch.errors.push(error);
        bestMatch.centroid = updateCentroid(bestMatch);
      } else {
        clusters.push({
          errors: [error],
          centroid: {
            message: error.message,
            stackTrace: error.stack,
            component: error.context?.component || '',
            userAgent: error.context?.userAgent || '',
            url: error.context?.url || '',
          },
          similarity: 0.8,
          confidence: 0.8,
        });
      }
    });

    return clusters.filter(cluster => cluster.errors.length > 1);
  };

  const clusterByComponentContext = (errors: any[]) => {
    const componentMap: { [key: string]: any[] } = {};

    errors.forEach(error => {
      const component = error.context?.component || 'unknown';
      const contextKey = `${component}-${error.type}-${error.severity}`;

      if (!componentMap[contextKey]) {
        componentMap[contextKey] = [];
      }
      componentMap[contextKey].push(error);
    });

    return Object.entries(componentMap)
      .filter(([, errors]) => errors.length > 2)
      .map(([key, patternErrors]) => ({
        errors: patternErrors,
        centroid: {
          message: patternErrors[0].message,
          stackTrace: patternErrors[0].stack || '',
          component: patternErrors[0].context?.component || '',
          userAgent: patternErrors[0].context?.userAgent || '',
          url: patternErrors[0].context?.url || '',
        },
        similarity: 0.6,
        confidence: 0.7,
      }));
  };

  const clusterByTemporalPatterns = (errors: any[]) => {
    // Group errors by time windows and look for recurring patterns
    const timeWindows = groupErrorsByTimeWindows(errors, 60 * 60 * 1000); // 1 hour windows

    const temporalClusters: any[] = [];

    Object.values(timeWindows).forEach((windowErrors: any[]) => {
      if (windowErrors.length > 3) {
        const messageGroups = groupBy(windowErrors, 'message');
        Object.values(messageGroups).forEach((group) => {
          const errorGroup = group as any[];
          if (errorGroup.length > 2) {
            temporalClusters.push({
              errors: errorGroup,
              centroid: {
                message: errorGroup[0].message,
                stackTrace: errorGroup[0].stack || '',
                component: errorGroup[0].context?.component || '',
                userAgent: errorGroup[0].context?.userAgent || '',
                url: errorGroup[0].context?.url || '',
              },
              similarity: 0.5,
              confidence: 0.6,
            });
          }
        });
      }
    });

    return temporalClusters;
  };

  const calculateMessageSimilarity = (msg1: string, msg2: string): number => {
    // Simple Jaccard similarity for message comparison
    const words1 = new Set(msg1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(msg2.toLowerCase().split(/\W+/).filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  };

  const calculateStackSimilarity = (stack1: string, stack2: string): number => {
    if (!stack1 || !stack2) return 0;

    const lines1 = stack1.split('\n').map(line => line.trim()).filter(line => line.includes('at '));
    const lines2 = stack2.split('\n').map(line => line.trim()).filter(line => line.includes('at '));

    if (lines1.length === 0 || lines2.length === 0) return 0;

    // Compare top 3 stack frames
    const topFrames1 = lines1.slice(0, 3);
    const topFrames2 = lines2.slice(0, 3);

    let matches = 0;
    topFrames1.forEach(frame1 => {
      topFrames2.forEach(frame2 => {
        if (frame1.includes(frame2.split(' ')[1])) matches++;
      });
    });

    return matches / Math.max(topFrames1.length, topFrames2.length);
  };

  const groupErrorsByTimeWindows = (errors: any[], windowSize: number) => {
    const windows: { [key: number]: any[] } = {};

    errors.forEach(error => {
      const window = Math.floor(error.timestamp / windowSize) * windowSize;
      if (!windows[window]) windows[window] = [];
      windows[window].push(error);
    });

    return windows;
  };

  const groupBy = (array: any[], key: string) => {
    return array.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {});
  };

  const mergeClusters = (clusterSets: any[][]) => {
    // Simple merge strategy - combine overlapping clusters
    const allClusters = clusterSets.flat();
    const merged: any[] = [];

    allClusters.forEach(cluster => {
      let mergedWith = null;

      for (const existing of merged) {
        if (clustersOverlap(cluster, existing)) {
          mergedWith = existing;
          break;
        }
      }

      if (mergedWith) {
        mergedWith.errors = [...new Set([...mergedWith.errors, ...cluster.errors])];
        mergedWith.centroid = updateCentroid(mergedWith);
        mergedWith.similarity = Math.max(mergedWith.similarity, cluster.similarity);
        mergedWith.confidence = Math.max(mergedWith.confidence, cluster.confidence);
      } else {
        merged.push(cluster);
      }
    });

    return merged;
  };

  const clustersOverlap = (cluster1: any, cluster2: any): boolean => {
    const errorIds1 = new Set(cluster1.errors.map((e: any) => e.id));
    const errorIds2 = new Set(cluster2.errors.map((e: any) => e.id));

    const intersection = new Set([...errorIds1].filter(x => errorIds2.has(x)));
    const smallerCluster = Math.min(errorIds1.size, errorIds2.size);

    return intersection.size / smallerCluster > 0.3; // 30% overlap
  };

  const updateCentroid = (cluster: any) => {
    // Update centroid based on cluster members
    const errors = cluster.errors;
    return {
      message: errors[0].message, // Keep first message as representative
      stackTrace: errors[0].stack || '',
      component: mostFrequent(errors.map((e: any) => e.context?.component || 'unknown')),
      userAgent: mostFrequent(errors.map((e: any) => e.context?.userAgent || '')),
      url: mostFrequent(errors.map((e: any) => e.context?.url || '')),
    };
  };

  const mostFrequent = (arr: string[]): string => {
    const counts: { [key: string]: number } = {};
    arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
    return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0] || '';
  };

  const generatePatternId = (cluster: any): string => {
    const errors = cluster.errors;
    const firstError = errors[0];
    const component = firstError.context?.component || 'unknown';
    const hash = btoa(firstError.message + component).slice(0, 8);
    return `pattern-${hash}-${errors.length}`;
  };

  const applyClusteringAlgorithm = (patterns: any[]) => {
    // Apply DBSCAN-like clustering for final pattern refinement
    const eps = 0.3; // Similarity threshold
    const minPts = 2; // Minimum points for core cluster

    const visited = new Set<string>();
    const clustered: any[] = [];

    patterns.forEach(pattern => {
      if (visited.has(pattern.id)) return;

      visited.add(pattern.id);
      const neighbors = findNeighbors(pattern, patterns, eps);

      if (neighbors.length >= minPts) {
        const cluster = expandCluster(pattern, neighbors, patterns, visited, eps, minPts);
        clustered.push({
          ...pattern,
          errors: cluster.flatMap(p => p.errors),
          confidence: Math.max(...cluster.map(p => p.confidence)),
        });
      } else {
        // Noise point - still keep as individual pattern if it has enough errors
        if (pattern.errors.length >= 3) {
          clustered.push(pattern);
        }
      }
    });

    return clustered;
  };

  const findNeighbors = (pattern: any, allPatterns: any[], eps: number): any[] => {
    return allPatterns.filter(other => {
      if (pattern.id === other.id) return false;

      const similarity = calculatePatternSimilarity(pattern, other);
      return similarity >= eps;
    });
  };

  const expandCluster = (pattern: any, neighbors: any[], allPatterns: any[], visited: Set<string>, eps: number, minPts: number): any[] => {
    const cluster = [pattern];

    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];

      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        const neighborNeighbors = findNeighbors(neighbor, allPatterns, eps);

        if (neighborNeighbors.length >= minPts) {
          neighbors.push(...neighborNeighbors);
        }
      }

      if (!cluster.some(p => p.id === neighbor.id)) {
        cluster.push(neighbor);
      }
    }

    return cluster;
  };

  const calculatePatternSimilarity = (pattern1: any, pattern2: any): number => {
    let similarity = 0;
    let weights = 0;

    // Message similarity (weight: 0.4)
    const msgSim = calculateMessageSimilarity(pattern1.centroid.message, pattern2.centroid.message);
    similarity += msgSim * 0.4;
    weights += 0.4;

    // Stack similarity (weight: 0.3)
    const stackSim = calculateStackSimilarity(pattern1.centroid.stackTrace, pattern2.centroid.stackTrace);
    similarity += stackSim * 0.3;
    weights += 0.3;

    // Component similarity (weight: 0.2)
    const compSim = pattern1.centroid.component === pattern2.centroid.component ? 1 : 0;
    similarity += compSim * 0.2;
    weights += 0.2;

    // Error count similarity (weight: 0.1)
    const countRatio = Math.min(pattern1.errors.length, pattern2.errors.length) /
                      Math.max(pattern1.errors.length, pattern2.errors.length);
    similarity += countRatio * 0.1;
    weights += 0.1;

    return similarity / weights;
  };

  const enrichPatternWithImpact = (pattern: any, allErrors: any[]): ErrorPattern => {
    const errors = pattern.errors;
    const frequency = errors.length;
    const timeSpan = Math.max(...errors.map((e: any) => e.timestamp)) - Math.min(...errors.map((e: any) => e.timestamp));
    const avgFrequencyPerHour = timeSpan > 0 ? (frequency / (timeSpan / (60 * 60 * 1000))) : frequency;

    // Calculate impact scores
    const severityScore = calculateSeverityScore(errors);
    const userImpactScore = calculateUserImpactScore(errors, allErrors);
    const businessImpactScore = calculateBusinessImpactScore(errors, avgFrequencyPerHour);

    return {
      id: pattern.id,
      name: pattern.centroid.message,
      description: generatePatternDescription(pattern),
      frequency,
      firstSeen: Math.min(...errors.map((e: any) => e.timestamp)),
      lastSeen: Math.max(...errors.map((e: any) => e.timestamp)),
      affectedUsers: new Set(errors.map((e: any) => e.context?.userId).filter(Boolean)).size,
      severity: errors[0].severity,
      domain: errors[0].type,
      cluster: {
        centroid: pattern.centroid,
        members: errors.map((e: any) => ({
          id: e.id,
          timestamp: e.timestamp,
          userId: e.context?.userId || '',
          sessionId: e.context?.sessionId || '',
          context: e.context,
        })),
        similarity: pattern.similarity,
        radius: 1 - pattern.confidence, // Convert confidence to radius
      },
      impact: {
        userExperience: severityScore > 0.7 ? 'critical' : severityScore > 0.4 ? 'high' : 'medium',
        businessImpact: businessImpactScore > 0.7 ? 'critical' : businessImpactScore > 0.4 ? 'high' : 'medium',
        frequency: avgFrequencyPerHour > 10 ? 'persistent' : avgFrequencyPerHour > 2 ? 'frequent' : 'occasional',
        scope: userImpactScore > 0.5 ? 'widespread' : 'isolated',
      },
      recommendations: generateAdvancedRecommendations(pattern, errors, allErrors),
    };
  };

  const calculateSeverityScore = (errors: any[]): number => {
    const severityWeights = {
      [ErrorSeverity.CRITICAL]: 1.0,
      [ErrorSeverity.HIGH]: 0.7,
      [ErrorSeverity.MEDIUM]: 0.4,
      [ErrorSeverity.LOW]: 0.1,
    };

    const weightedSum = errors.reduce((sum, error: any) =>
      sum + (severityWeights[error.severity as keyof typeof severityWeights] || 0), 0);

    return weightedSum / errors.length;
  };

  const calculateUserImpactScore = (patternErrors: any[], allErrors: any[]): number => {
    const affectedUsers = new Set(patternErrors.map(e => e.context?.userId).filter(Boolean));
    const totalUsers = new Set(allErrors.map(e => e.context?.userId).filter(Boolean));

    return affectedUsers.size / totalUsers.size;
  };

  const calculateBusinessImpactScore = (errors: any[], avgFrequencyPerHour: number): number => {
    // Business impact considers frequency, severity, and user impact
    const severityScore = calculateSeverityScore(errors);
    const frequencyScore = Math.min(avgFrequencyPerHour / 20, 1); // Normalize to 0-1
    const userImpactScore = new Set(errors.map(e => e.context?.userId).filter(Boolean)).size / 10; // Assume 10 is high impact

    return (severityScore * 0.4 + frequencyScore * 0.4 + Math.min(userImpactScore, 1) * 0.2);
  };

  const generatePatternDescription = (pattern: any): string => {
    const errors = pattern.errors;
    const component = pattern.centroid.component;
    const frequency = errors.length;
    const timeSpan = Math.max(...errors.map((e: any) => e.timestamp)) - Math.min(...errors.map((e: any) => e.timestamp));
    const hours = timeSpan / (60 * 60 * 1000);

    return `Detected ${frequency} similar errors in ${component} component over ${hours.toFixed(1)} hours. Pattern confidence: ${(pattern.confidence * 100).toFixed(1)}%`;
  };

  const generateAdvancedRecommendations = (pattern: any, errors: any[], allErrors: any[]): string[] => {
    const recommendations: string[] = [];
    const severity = errors[0].severity;
    const domain = errors[0].type;
    const frequency = errors.length;
    const affectedUsers = new Set(errors.map(e => e.context?.userId).filter(Boolean)).size;

    // Severity-based recommendations
    if (severity === ErrorSeverity.CRITICAL) {
      recommendations.push('🚨 CRITICAL: Immediate investigation required');
      recommendations.push('Implement circuit breaker pattern to prevent cascade failures');
      recommendations.push('Set up automated alerting for on-call engineers');
    }

    // Domain-specific recommendations
    if (domain === ErrorDomain.NETWORK) {
      recommendations.push('Implement retry logic with exponential backoff');
      recommendations.push('Add network connectivity monitoring');
      recommendations.push('Consider implementing offline mode capabilities');
    }

    if (domain === ErrorDomain.AUTHENTICATION) {
      recommendations.push('Review authentication flow for race conditions');
      recommendations.push('Implement token refresh mechanisms');
      recommendations.push('Add authentication state monitoring');
    }

    // Frequency-based recommendations
    if (frequency > 50) {
      recommendations.push('High-frequency pattern detected - consider caching or optimization');
      recommendations.push('Implement rate limiting to prevent resource exhaustion');
    }

    // User impact recommendations
    if (affectedUsers > 10) {
      recommendations.push('Widespread user impact - prioritize for immediate fix');
      recommendations.push('Consider feature flag to disable problematic functionality');
      recommendations.push('Prepare user communication plan');
    }

    // Pattern-specific recommendations
    if (pattern.centroid.stackTrace) {
      recommendations.push('Analyze stack trace for root cause in code');
      recommendations.push('Check for null pointer exceptions or async errors');
    }

    // Recovery recommendations
    const recoveredCount = errors.filter(e => e.recovered).length;
    const recoveryRate = recoveredCount / errors.length;

    if (recoveryRate < 0.5) {
      recommendations.push('Low recovery rate - improve error recovery strategies');
      recommendations.push('Add fallback mechanisms for failed operations');
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  };

  const generateRecommendations = (error: any): string[] => {
    const recommendations = [];

    if (error.type === ErrorDomain.NETWORK) {
      recommendations.push('Implement retry logic with exponential backoff');
      recommendations.push('Add network status monitoring');
    }

    if (error.severity === ErrorSeverity.CRITICAL) {
      recommendations.push('Implement circuit breaker pattern');
      recommendations.push('Add comprehensive error boundaries');
    }

    recommendations.push('Add detailed logging for debugging');
    recommendations.push('Implement user-friendly error messages');

    return recommendations;
  };

  const calculateStrategyEffectiveness = (recoveredErrors: any[]) => {
    const strategies: { [key: string]: any[] } = {};

    recoveredErrors.forEach(error => {
      const strategy = error.recoveryStrategy || 'manual';
      if (!strategies[strategy]) strategies[strategy] = [];
      strategies[strategy].push(error);
    });

    return Object.entries(strategies).map(([strategyId, errors]) => ({
      strategyId,
      strategyName: strategyId,
      successRate: 1, // All these are successful by definition
      averageRecoveryTime: errors.reduce((sum, e) => sum + (e.recoveryTime || 300000), 0) / errors.length,
      usageCount: errors.length,
      failureReasons: [],
      improvementSuggestions: [],
    }));
  };

  const calculateRecoveryTimeDistribution = (recoveredErrors: any[]) => {
    const times = recoveredErrors.map(e => e.recoveryTime || 300000).sort((a, b) => a - b);

    return {
      p50: times[Math.floor(times.length * 0.5)] || 0,
      p95: times[Math.floor(times.length * 0.95)] || 0,
      p99: times[Math.floor(times.length * 0.99)] || 0,
      average: times.reduce((sum, t) => sum + t, 0) / times.length || 0,
      min: times[0] || 0,
      max: times[times.length - 1] || 0,
    };
  };

  const calculateRecoveryFailures = (failedErrors: any[]) => {
    return failedErrors.slice(0, 10).map(error => ({
      strategyId: error.recoveryStrategy || 'none',
      errorId: error.id,
      reason: 'Recovery strategy failed or not available',
      timestamp: error.timestamp,
      context: error.context,
      alternativeStrategies: ['manual_intervention', 'page_reload', 'cache_clear'],
    }));
  };

  const generateActiveAlerts = (recentErrors: any[]): ErrorAlert[] => {
    const alerts: ErrorAlert[] = [];

    // High error rate alert
    if (recentErrors.length > 10) {
      alerts.push({
        id: 'high-error-rate',
        type: 'threshold',
        severity: 'warning',
        title: 'High Error Rate Detected',
        description: `${recentErrors.length} errors in the last 5 minutes`,
        timestamp: Date.now(),
        acknowledged: false,
        resolved: false,
        threshold: { metric: 'error_rate', operator: 'gt', value: 10, duration: 5 },
      });
    }

    // Critical errors alert
    const criticalErrors = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL);
    if (criticalErrors.length > 0) {
      alerts.push({
        id: 'critical-errors',
        type: 'threshold',
        severity: 'critical',
        title: 'Critical Errors Detected',
        description: `${criticalErrors.length} critical errors require immediate attention`,
        timestamp: Date.now(),
        acknowledged: false,
        resolved: false,
      });
    }

    return alerts;
  };

  const transformToErrorEvent = (error: any): ErrorEvent => ({
    id: error.id,
    timestamp: error.timestamp,
    type: error.type,
    severity: error.severity,
    message: error.message,
    userId: error.context?.userId || '',
    sessionId: error.context?.sessionId || '',
    component: error.context?.component || '',
    recoverable: error.recoverable,
    recovered: error.recovered,
  });

  const getSystemHealthStatus = (): SystemHealthStatus => ({
    overall: connection.isConnected ? 'healthy' : 'degraded',
    components: [{
      name: 'Error Handler',
      status: 'healthy',
      responseTime: 10,
      errorRate: 0,
      lastCheck: Date.now(),
    }],
    uptime: Date.now() - (window.performance.timing.navigationStart || Date.now()),
    lastIncident: undefined,
  });

  const getPerformanceMetrics = () => ({
    averageResponseTime: 150,
    errorProcessingTime: 5,
    memoryUsage: (performance as any).memory?.usedJSHeapSize / (performance as any).memory?.totalJSHeapSize * 100 || 0,
    cpuUsage: 0, // Not easily available in browser
    throughput: realTimeMetrics?.currentErrorRate || 0,
  });

  // Data refresh function
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overview, trends, patternData, recovery, realtime] = await Promise.all([
        errorAnalyticsBridge.getOverviewMetrics(filters),
        errorAnalyticsBridge.getTrendData('24h', filters),
        errorAnalyticsBridge.getPatterns(filters),
        errorAnalyticsBridge.getRecoveryAnalytics(filters),
        errorAnalyticsBridge.getRealTimeMetrics(),
      ]);

      setOverviewMetrics(overview);
      setTrendData(trends);
      setPatterns(patternData);
      setRecoveryAnalytics(recovery);
      setRealTimeMetrics(realtime);
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, errorAnalyticsBridge]);

  // Initial data load and refresh interval
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!enableRealTime) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [enableRealTime, refreshInterval, refreshData]);

  // Export functionality
  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      filters,
      overviewMetrics,
      trendData,
      patterns,
      recoveryAnalytics,
      realTimeMetrics,
      systemHealth: getSystemHealthStatus(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-analytics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`error-analytics-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Error Analytics Dashboard
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(lastRefresh).toLocaleTimeString()}
                {connection.isConnected ? (
                  <Badge variant="outline" className="ml-2 text-green-600">
                    <Activity className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-2 text-red-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {/* Time Range Selector */}
              <select
                className="px-3 py-1 border rounded-md text-sm"
                title="Select time range"
                value={filters.timeRange.preset || 'custom'}
                onChange={(e) => {
                  const preset = e.target.value as '1h' | '24h' | '7d' | '30d' | '90d' | 'custom';
                  const now = Date.now();
                  let start = now;

                  switch (preset) {
                    case '1h': start = now - 60 * 60 * 1000; break;
                    case '24h': start = now - 24 * 60 * 60 * 1000; break;
                    case '7d': start = now - 7 * 24 * 60 * 60 * 1000; break;
                    case '30d': start = now - 30 * 24 * 60 * 60 * 1000; break;
                    case '90d': start = now - 90 * 24 * 60 * 60 * 1000; break;
                  }

                  setFilters(prev => ({
                    ...prev,
                    timeRange: { start, end: now, preset }
                  }));
                }}
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>

              {/* Filter Panel */}
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {enableExport && (
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'trends', label: 'Trends', icon: TrendingUp },
                  { id: 'patterns', label: 'Patterns', icon: AlertTriangle },
                  { id: 'recovery', label: 'Recovery', icon: Activity },
                  { id: 'realtime', label: 'Real-time', icon: Activity }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                      activeTab === id
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-10">
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
          {/* Overview Metrics Cards */}
          {overviewMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Errors</p>
                      <p className="text-3xl font-bold">{overviewMetrics.totalErrors.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {overviewMetrics.timeRange.preset ? `Last ${overviewMetrics.timeRange.preset}` : 'Custom range'}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                      <p className="text-3xl font-bold">{overviewMetrics.errorRate.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per minute</p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Affected Users</p>
                      <p className="text-3xl font-bold">{overviewMetrics.affectedUsers.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">unique users</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                      <p className="text-3xl font-bold">{Math.round(overviewMetrics.averageResolutionTime / 1000)}</p>
                      <p className="text-xs text-muted-foreground mt-1">seconds</p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Severity Distribution Chart */}
            {overviewMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Error Distribution by Severity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(overviewMetrics.severityDistribution).map(([severity, count]) => (
                      <div key={severity} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              severity === 'CRITICAL' ? 'destructive' :
                              severity === 'HIGH' ? 'secondary' :
                              severity === 'MEDIUM' ? 'outline' : 'outline'
                            }>
                              {severity}
                            </Badge>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {overviewMetrics.totalErrors > 0 ? ((count / overviewMetrics.totalErrors) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <Progress
                          value={overviewMetrics.totalErrors > 0 ? (count / overviewMetrics.totalErrors) * 100 : 0}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Domain Distribution Chart */}
            {overviewMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Error Distribution by Domain
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(overviewMetrics.domainDistribution).map(([domain, count]) => (
                      <div key={domain} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {domain}
                            </Badge>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {overviewMetrics.totalErrors > 0 ? ((count / overviewMetrics.totalErrors) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <Progress
                          value={overviewMetrics.totalErrors > 0 ? (count / overviewMetrics.totalErrors) * 100 : 0}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
          {/* Trend Overview Cards */}
          {trendData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Growth Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold text-center ${
                    trendData.growthRate > 0 ? 'text-red-600' :
                    trendData.growthRate < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {trendData.growthRate > 0 ? '+' : ''}{trendData.growthRate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Change over selected period
                  </p>
                  <div className="mt-4">
                    <Progress
                      value={Math.min(Math.abs(trendData.growthRate), 100)}
                      className={`h-2 ${trendData.growthRate > 0 ? 'bg-red-100' : 'bg-green-100'}`}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Current Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">
                      {trendData.timeSeries.length > 0
                        ? trendData.timeSeries[trendData.timeSeries.length - 1].totalErrors
                        : 0
                      }
                    </div>
                    <p className="text-sm text-muted-foreground">Latest data point</p>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Period: {trendData.period}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Next Hour</span>
                      <Badge variant="outline">{trendData.projections.nextHour.toFixed(1)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Next Day</span>
                      <Badge variant="outline">{trendData.projections.nextDay.toFixed(1)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Next Week</span>
                      <Badge variant="outline">{trendData.projections.nextWeek.toFixed(1)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Trend Chart Placeholder */}
          {trendData && (
            <Card>
              <CardHeader>
                <CardTitle>Error Trend Over Time</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {trendData.timeSeries.length} data points • {trendData.period} intervals
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Trend Chart Visualization</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Chart component would be integrated here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seasonality Analysis */}
          {trendData && (
            <Card>
              <CardHeader>
                <CardTitle>Seasonality Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Detection Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Pattern Detected</span>
                        <Badge variant={trendData.seasonality.detected ? 'default' : 'secondary'}>
                          {trendData.seasonality.detected ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      {trendData.seasonality.detected && (
                        <div className="flex justify-between">
                          <span className="text-sm">Pattern Type</span>
                          <Badge variant="outline">{trendData.seasonality.pattern}</Badge>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm">Confidence</span>
                        <span className="text-sm font-medium">
                          {(trendData.seasonality.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {trendData.seasonality.peakHours && trendData.seasonality.peakHours.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Peak Hours</h4>
                      <div className="flex flex-wrap gap-1">
                        {trendData.seasonality.peakHours.map((hour: number) => (
                          <Badge key={hour} variant="outline">
                            {hour}:00
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anomalies */}
          {trendData?.anomalies && trendData.anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Detected Anomalies
                  <Badge variant="destructive">{trendData.anomalies.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendData.anomalies.map((anomaly: any, index: number) => (
                    <Alert key={index} className={
                      anomaly.severity === 'critical' ? 'border-red-200 bg-red-50' :
                      anomaly.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                      'border-yellow-200 bg-yellow-50'
                    }>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">{anomaly.description}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {new Date(anomaly.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant={
                              anomaly.severity === 'critical' ? 'destructive' :
                              anomaly.severity === 'high' ? 'secondary' : 'outline'
                            }>
                              {anomaly.severity}
                            </Badge>
                            <div className="text-right text-sm">
                              <div>Expected: {anomaly.expectedValue.toFixed(1)}</div>
                              <div>Actual: {anomaly.value.toFixed(1)}</div>
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
            </TabsContent>

            {/* Patterns Tab */}
            <TabsContent value="patterns" className="space-y-6">
          {/* Pattern Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Patterns</p>
                    <p className="text-2xl font-bold">{patterns.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Critical Patterns</p>
                    <p className="text-2xl font-bold">
                      {patterns.filter(p => p.severity === ErrorSeverity.CRITICAL).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">High Frequency</p>
                    <p className="text-2xl font-bold">
                      {patterns.filter(p => p.frequency > 10).length}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Affected Users</p>
                    <p className="text-2xl font-bold">
                      {patterns.reduce((sum, p) => sum + p.affectedUsers, 0)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patterns Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Patterns
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Detected patterns sorted by frequency
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {patterns.map((pattern) => (
                    <Card key={pattern.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg mb-1">{pattern.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-lg px-3 py-1">
                              {pattern.frequency}x
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">SEVERITY</p>
                            <Badge variant={
                              pattern.severity === ErrorSeverity.CRITICAL ? 'destructive' :
                              pattern.severity === ErrorSeverity.HIGH ? 'secondary' : 'outline'
                            }>
                              {pattern.severity}
                            </Badge>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">DOMAIN</p>
                            <Badge variant="outline">{pattern.domain}</Badge>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">AFFECTED USERS</p>
                            <p className="font-medium">{pattern.affectedUsers}</p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">IMPACT</p>
                            <Badge variant={
                              pattern.impact.businessImpact === 'critical' ? 'destructive' :
                              pattern.impact.businessImpact === 'high' ? 'secondary' : 'outline'
                            }>
                              {pattern.impact.businessImpact}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <div>
                            <span>First seen: {new Date(pattern.firstSeen).toLocaleDateString()}</span>
                            <span className="ml-4">Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Frequency:</span>
                            <span className={
                              pattern.impact.frequency === 'persistent' ? 'text-red-600 font-medium' :
                              pattern.impact.frequency === 'frequent' ? 'text-orange-600 font-medium' :
                              'text-gray-600'
                            }>
                              {pattern.impact.frequency}
                            </span>
                          </div>
                        </div>

                        {/* Recommendations */}
                        {pattern.recommendations && pattern.recommendations.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Recommendations:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {pattern.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {patterns.length === 0 && (
                    <div className="text-center py-12">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Error Patterns Detected</h3>
                      <p className="text-gray-500">
                        Error patterns will appear here as they are identified by the analytics system.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
            </TabsContent>

            {/* Recovery Tab */}
            <TabsContent value="recovery" className="space-y-6">
          {/* Recovery Overview Cards */}
          {recoveryAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <p className="text-3xl font-bold text-green-600">
                        {(recoveryAnalytics.overallSuccessRate * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Overall recovery rate</p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Automated</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {(recoveryAnalytics.automatedRecoveryRate * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">No manual intervention</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Manual</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {(recoveryAnalytics.manualInterventionRate * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Required human action</p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Recovery Time</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {Math.round(recoveryAnalytics.recoveryTimeDistribution.average / 1000)}s
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Mean time to recover</p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recovery Time Distribution Chart */}
          {recoveryAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recovery Time Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Time taken to recover from errors (in seconds)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {Math.round(recoveryAnalytics.recoveryTimeDistribution.p50 / 1000)}
                    </div>
                    <div className="text-sm text-muted-foreground">P50 (Median)</div>
                    <div className="text-xs text-gray-500 mt-1">50% of recoveries</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {Math.round(recoveryAnalytics.recoveryTimeDistribution.p95 / 1000)}
                    </div>
                    <div className="text-sm text-muted-foreground">P95</div>
                    <div className="text-xs text-gray-500 mt-1">95% of recoveries</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {Math.round(recoveryAnalytics.recoveryTimeDistribution.p99 / 1000)}
                    </div>
                    <div className="text-sm text-muted-foreground">P99</div>
                    <div className="text-xs text-gray-500 mt-1">99% of recoveries</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {Math.round(recoveryAnalytics.recoveryTimeDistribution.average / 1000)}
                    </div>
                    <div className="text-sm text-muted-foreground">Average</div>
                    <div className="text-xs text-gray-500 mt-1">Mean recovery time</div>
                  </div>
                </div>

                {/* Recovery Time Chart Placeholder */}
                <div className="mt-6 h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Recovery Time Distribution Chart</p>
                    <p className="text-xs text-gray-400">Histogram visualization would be here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strategy Effectiveness */}
          {recoveryAnalytics && recoveryAnalytics.strategyEffectiveness.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recovery Strategy Effectiveness
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Performance of different recovery strategies
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recoveryAnalytics.strategyEffectiveness.map((strategy, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{strategy.strategyName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Used {strategy.usageCount} times
                          </p>
                        </div>
                        <Badge variant={
                          strategy.successRate > 0.8 ? 'default' :
                          strategy.successRate > 0.6 ? 'secondary' : 'destructive'
                        }>
                          {(strategy.successRate * 100).toFixed(1)}% success
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">SUCCESS RATE</p>
                          <div className="flex items-center gap-2">
                            <Progress value={strategy.successRate * 100} className="flex-1" />
                            <span className="text-sm font-medium">
                              {(strategy.successRate * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground">AVG RECOVERY TIME</p>
                          <p className="text-sm font-medium">
                            {Math.round(strategy.averageRecoveryTime / 1000)}s
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground">USAGE COUNT</p>
                          <p className="text-sm font-medium">{strategy.usageCount}</p>
                        </div>
                      </div>

                      {/* Improvement Suggestions */}
                      {strategy.improvementSuggestions && strategy.improvementSuggestions.length > 0 && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-medium mb-2">Improvement Suggestions:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {strategy.improvementSuggestions.map((suggestion: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recovery Failures */}
          {recoveryAnalytics && recoveryAnalytics.failureAnalysis.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recovery Failures
                  <Badge variant="destructive">{recoveryAnalytics.failureAnalysis.length}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Errors that failed to recover automatically
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {recoveryAnalytics.failureAnalysis.map((failure, index) => (
                      <Alert key={index} className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">Error ID: {failure.errorId}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {failure.reason}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                {new Date(failure.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <div className="ml-4">
                              <Badge variant="outline">{failure.strategyId}</Badge>
                            </div>
                          </div>

                          {failure.alternativeStrategies && failure.alternativeStrategies.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-orange-200">
                              <p className="text-sm font-medium">Alternative Strategies:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {failure.alternativeStrategies.map((strategy: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {strategy}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
            </TabsContent>

            {/* Real-time Tab */}
            <TabsContent value="realtime" className="space-y-6">
          {/* Real-time Status Indicator */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    connection.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium">
                      {connection.isConnected ? 'Live Data Streaming' : 'Offline Mode'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {connection.isConnected
                        ? `Connected • ${connection.message_count || 0} messages received`
                        : 'Real-time updates unavailable'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={connection.isConnected ? 'default' : 'secondary'}>
                    {connection.connection_quality || 'unknown'}
                  </Badge>
                  {connection.last_heartbeat && (
                    <span className="text-xs text-muted-foreground">
                      Last heartbeat: {new Date(connection.last_heartbeat).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {realTimeMetrics && (
            <>
              {/* Active Alerts */}
              {realTimeMetrics.activeAlerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Active Alerts
                      <Badge variant="destructive">{realTimeMetrics.activeAlerts.length}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Real-time alerts requiring attention
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {realTimeMetrics.activeAlerts.map((alert) => (
                        <Alert key={alert.id} className={
                          alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                          alert.severity === 'error' ? 'border-red-200 bg-red-50' :
                          alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          'border-blue-200 bg-blue-50'
                        }>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">{alert.title}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {alert.description}
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                  {alert.acknowledged && (
                                    <Badge variant="outline" className="text-green-600">
                                      Acknowledged
                                    </Badge>
                                  )}
                                  {alert.resolved && (
                                    <Badge variant="outline" className="text-blue-600">
                                      Resolved
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4">
                                <Badge variant={
                                  alert.severity === 'critical' ? 'destructive' :
                                  alert.severity === 'error' ? 'destructive' :
                                  alert.severity === 'warning' ? 'secondary' : 'outline'
                                }>
                                  {alert.severity.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Live Error Stream */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live Error Stream
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Real-time error events • Last {realTimeMetrics.liveStream.length} errors
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {realTimeMetrics.liveStream.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Badge variant={
                              event.severity === ErrorSeverity.CRITICAL ? 'destructive' :
                              event.severity === ErrorSeverity.HIGH ? 'secondary' :
                              event.severity === ErrorSeverity.MEDIUM ? 'outline' : 'outline'
                            }>
                              {event.severity}
                            </Badge>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{event.message}</div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span>{event.component || 'Unknown component'}</span>
                                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                <span>{event.type}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.recoverable && (
                              <Badge variant="outline" className="text-green-600">
                                Recoverable
                              </Badge>
                            )}
                            {event.recovered && (
                              <Badge variant="outline" className="text-blue-600">
                                Recovered
                              </Badge>
                            )}
                            <div className="text-right text-xs text-muted-foreground">
                              <div>User: {event.userId || 'Anonymous'}</div>
                              <div>Session: {event.sessionId ? event.sessionId.slice(0, 8) : 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {realTimeMetrics.liveStream.length === 0 && (
                        <div className="text-center py-12">
                          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Errors</h3>
                          <p className="text-gray-500">
                            The system is running smoothly with no recent error events.
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* System Health & Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Health */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      System Health
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Overall system status and uptime
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${
                            realTimeMetrics.systemHealth.overall === 'healthy' ? 'bg-green-500' :
                            realTimeMetrics.systemHealth.overall === 'degraded' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <span className="font-medium capitalize text-lg">
                            {realTimeMetrics.systemHealth.overall}
                          </span>
                        </div>
                        <Badge variant={
                          realTimeMetrics.systemHealth.overall === 'healthy' ? 'default' :
                          realTimeMetrics.systemHealth.overall === 'degraded' ? 'secondary' : 'destructive'
                        }>
                          {realTimeMetrics.systemHealth.overall.toUpperCase()}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-blue-600">
                            {Math.round(realTimeMetrics.systemHealth.uptime / 3600)}
                          </div>
                          <div className="text-sm text-muted-foreground">Hours Uptime</div>
                        </div>

                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-green-600">
                            {realTimeMetrics.systemHealth.components.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Healthy Components</div>
                        </div>
                      </div>

                      {/* Component Status */}
                      <div>
                        <h4 className="font-medium mb-3">Component Status</h4>
                        <div className="space-y-2">
                          {realTimeMetrics.systemHealth.components.map((component, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{component.name}</span>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  component.status === 'healthy' ? 'bg-green-500' :
                                  component.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                <span className="text-xs text-muted-foreground">
                                  {component.responseTime}ms
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Performance Metrics
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Real-time performance indicators
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Response Time</p>
                            <p className="text-xs text-muted-foreground">Average API response</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">
                              {realTimeMetrics.performanceMetrics.averageResponseTime}ms
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Memory Usage</p>
                            <p className="text-xs text-muted-foreground">Current heap usage</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              {realTimeMetrics.performanceMetrics.memoryUsage.toFixed(1)}%
                            </p>
                            <Progress
                              value={realTimeMetrics.performanceMetrics.memoryUsage}
                              className="w-16 h-1 mt-1"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Throughput</p>
                            <p className="text-xs text-muted-foreground">Errors processed/sec</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-purple-600">
                              {realTimeMetrics.performanceMetrics.throughput.toFixed(2)}/s
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Error Rate</p>
                            <p className="text-xs text-muted-foreground">Current error frequency</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-orange-600">
                              {realTimeMetrics.currentErrorRate.toFixed(2)}/min
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* WebSocket Connection Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Connection Details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    WebSocket connection status and statistics
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {connection.message_count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Messages Received</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {connection.reconnectAttempts || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Reconnect Attempts</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {connection.isConnected ? 'Active' : 'Inactive'}
                      </div>
                      <div className="text-sm text-muted-foreground">Connection Status</div>
                    </div>
                  </div>

                  {connection.error && (
                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium">Connection Error</div>
                        <div className="text-sm mt-1">{connection.error}</div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </>
          )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dashboard Footer */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connection.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>Data Source: Core Error Handler</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>Last Updated: {new Date(lastRefresh).toLocaleString()}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Real-time: {enableRealTime ? 'Enabled' : 'Disabled'}</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Performance: {isLoading ? 'Loading...' : 'Ready'}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  v1.0.0
                </Badge>
                <span>Analytics Engine</span>
              </div>
            </div>
          </div>

          {/* Data Source Information */}
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-medium mb-1">Data Sources</p>
              <ul className="space-y-1">
                <li>• Core Error Handler</li>
                <li>• Recovery Analytics</li>
                <li>• System Health Monitor</li>
                <li>• WebSocket Stream</li>
              </ul>
            </div>

            <div>
              <p className="font-medium mb-1">Processing</p>
              <ul className="space-y-1">
                <li>• Pattern Detection</li>
                <li>• Trend Analysis</li>
                <li>• Anomaly Detection</li>
                <li>• Recovery Metrics</li>
              </ul>
            </div>

            <div>
              <p className="font-medium mb-1">Integration</p>
              <ul className="space-y-1">
                <li>• Real-time Updates</li>
                <li>• Alert System</li>
                <li>• Export Capabilities</li>
                <li>• Performance Monitoring</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ErrorAnalyticsDashboard.displayName = 'ErrorAnalyticsDashboard';

export { ErrorAnalyticsDashboard };