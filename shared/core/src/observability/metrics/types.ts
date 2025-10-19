import { z } from 'zod';

// ==================== Core Types ====================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricValue {
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  help: string;
  type: MetricType;
  values: MetricValue[];
  labels?: Record<string, string>;
}

export interface Counter extends Metric {
  type: 'counter';
  increment(value?: number, labels?: Record<string, string>): void;
  get(): number;
}

export interface Gauge extends Metric {
  type: 'gauge';
  set(value: number, labels?: Record<string, string>): void;
  increment(value?: number, labels?: Record<string, string>): void;
  decrement(value?: number, labels?: Record<string, string>): void;
  get(): number;
}

export interface Histogram extends Metric {
  type: 'histogram';
  buckets: number[];
  observe(value: number, labels?: Record<string, string>): void;
  getBuckets(): Record<string, number>;
  getSum(): number;
  getCount(): number;
}

export interface Summary extends Metric {
  type: 'summary';
  quantiles: number[];
  observe(value: number, labels?: Record<string, string>): void;
  getQuantiles(): Record<string, number>;
  getSum(): number;
  getCount(): number;
}

export type AnyMetric = Counter | Gauge | Histogram | Summary;

// ==================== Registry Types ====================

export interface MetricsRegistry {
  register(metric: AnyMetric): void;
  unregister(name: string): boolean;
  get(name: string): AnyMetric | undefined;
  list(): AnyMetric[];
  clear(): void;
  collect(): Metric[];
}

// ==================== Exporter Types ====================

export interface MetricsExporter {
  name: string;
  export(metrics: Metric[]): Promise<void> | void;
  contentType: string;
}

// ==================== Prometheus Types ====================

export interface PrometheusConfig {
  gatewayUrl?: string;
  jobName?: string;
  instance?: string;
  interval?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface PrometheusLabels {
  job?: string;
  instance?: string;
  [key: string]: string | undefined;
}

// ==================== OpenTelemetry Types ====================

export interface OpenTelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  resourceAttributes?: Record<string, string>;
}

// ==================== Configuration Types ====================

export interface MetricsConfig {
  enabled?: boolean;
  registry?: {
    prefix?: string;
    defaultLabels?: Record<string, string>;
  };
  exporters?: {
    prometheus?: PrometheusConfig;
    opentelemetry?: OpenTelemetryConfig;
    console?: boolean;
    json?: boolean;
  };
  collection?: {
    interval?: number;
    timeout?: number;
  };
}

// ==================== Business Metrics Types ====================

export interface BusinessMetrics {
  userRegistrations: Counter;
  activeUsers: Gauge;
  apiRequests: Counter;
  apiErrors: Counter;
  responseTime: Histogram;
  databaseConnections: Gauge;
  cacheHits: Counter;
  cacheMisses: Counter;
  businessTransactions: Counter;
}

// ==================== System Metrics Types ====================

export interface SystemMetrics {
  memoryUsage: Gauge;
  cpuUsage: Gauge;
  diskUsage: Gauge;
  networkTraffic: Counter;
  activeConnections: Gauge;
  threadCount: Gauge;
  uptime: Counter;
}

// ==================== Validation Schemas ====================

export const metricTypeSchema = z.enum(['counter', 'gauge', 'histogram', 'summary']);

export const metricValueSchema = z.object({
  value: z.number(),
  timestamp: z.date(),
  labels: z.record(z.string()).optional(),
});

export const metricSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_:][a-zA-Z0-9_:]*$/),
  help: z.string(),
  type: metricTypeSchema,
  values: z.array(metricValueSchema),
  labels: z.record(z.string()).optional(),
});

export const prometheusConfigSchema = z.object({
  gatewayUrl: z.string().url().optional(),
  jobName: z.string().optional(),
  instance: z.string().optional(),
  interval: z.number().min(1000).optional(),
  timeout: z.number().min(1000).optional(),
  headers: z.record(z.string()).optional(),
});

export const openTelemetryConfigSchema = z.object({
  serviceName: z.string(),
  serviceVersion: z.string().optional(),
  endpoint: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  resourceAttributes: z.record(z.string()).optional(),
});

export const metricsConfigSchema = z.object({
  enabled: z.boolean().optional(),
  registry: z.object({
    prefix: z.string().optional(),
    defaultLabels: z.record(z.string()).optional(),
  }).optional(),
  exporters: z.object({
    prometheus: prometheusConfigSchema.optional(),
    opentelemetry: openTelemetryConfigSchema.optional(),
    console: z.boolean().optional(),
    json: z.boolean().optional(),
  }).optional(),
  collection: z.object({
    interval: z.number().min(1000).optional(),
    timeout: z.number().min(1000).optional(),
  }).optional(),
});

// ==================== Constants ====================

export const DEFAULT_CONFIG = {
  ENABLED: true,
  COLLECTION_INTERVAL_MS: 15000, // 15 seconds
  COLLECTION_TIMEOUT_MS: 5000, // 5 seconds
  PROMETHEUS_PUSH_INTERVAL_MS: 15000, // 15 seconds
  PROMETHEUS_JOB_NAME: 'app',
  HISTOGRAM_BUCKETS: [0.1, 0.5, 1, 2.5, 5, 10],
  SUMMARY_QUANTILES: [0.5, 0.9, 0.95, 0.99],
} as const;

export const METRIC_NAME_REGEX = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;

export const RESERVED_LABELS = [
  '__name__',
  '__help__',
  '__type__',
  'job',
  'instance',
  'le',
  'quantile',
] as const;




































