/**
 * Telemetry Types
 * Type definitions for telemetry service
 */

/**
 * System metrics collected by telemetry
 */
export interface SystemMetrics {
  cpu?: {
    usage: number;
    cores: number;
  };
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  network?: {
    latency: number;
    bandwidth: number;
    requests: number;
  };
  performance?: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
}

/**
 * Metrics data with metadata
 */
export interface MetricsData {
  timestamp: Date;
  source: string;
  metrics: SystemMetrics;
  tags?: Record<string, string>;
}

/**
 * Export configuration for telemetry data
 */
export interface ExportConfig {
  format: 'json' | 'csv' | 'parquet';
  dateRange: { start: Date; end: Date };
  filters?: Record<string, unknown>;
  compression?: boolean;
}

/**
 * Result types for telemetry operations
 */
export interface MetricsResult {
  collected: boolean;
  metrics: SystemMetrics;
  timestamp: number;
  source: string;
}

export interface SendResult {
  sent: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AggregateResult {
  aggregated: boolean;
  count: number;
  timestamp: number;
  summary?: Record<string, unknown>;
}

export interface ExportResult {
  exported: boolean;
  format: string;
  size: number;
  url?: string;
  timestamp: number;
}
