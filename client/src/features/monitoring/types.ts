/**
 * Integration Monitoring Types
 * 
 * Type definitions for the monitoring dashboard
 */

// ============================================================================
// FEATURE TYPES
// ============================================================================

export interface IntegrationFeature {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastHealthCheck?: Date;
  recentMetrics?: FeatureMetric;
  activeAlerts: number;
}

export interface FeatureMetric {
  id: string;
  featureId: string;
  timestamp: Date;
  activeUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: string;
  p95ResponseTime: string;
  p99ResponseTime: string;
  errorRate: string;
  errorCount: number;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export interface IntegrationAlert {
  id: string;
  featureId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  title: string;
  message: string;
  threshold?: Record<string, any>;
  actualValue?: any;
  triggered: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface MonitoringDashboardData {
  features: IntegrationFeature[];
  systemHealth: SystemHealth;
}

export interface SystemHealth {
  totalFeatures: number;
  healthyFeatures: number;
  degradedFeatures: number;
  downFeatures: number;
  totalAlerts: number;
  criticalAlerts: number;
}

// ============================================================================
// LOG TYPES
// ============================================================================

export interface IntegrationLog {
  id: string;
  featureId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  details?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

// ============================================================================
// CHART DATA TYPES
// ============================================================================

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface UsageChartData {
  activeUsers: ChartDataPoint[];
  totalRequests: ChartDataPoint[];
  successRate: ChartDataPoint[];
}

export interface PerformanceChartData {
  avgResponseTime: ChartDataPoint[];
  p95ResponseTime: ChartDataPoint[];
  p99ResponseTime: ChartDataPoint[];
}

export interface ErrorChartData {
  errorRate: ChartDataPoint[];
  errorCount: ChartDataPoint[];
}
