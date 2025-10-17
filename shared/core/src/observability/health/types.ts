import { z } from 'zod';

// ==================== Core Types ====================

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown';

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  duration: number;
  error?: Error;
}

export interface HealthCheck {
  name: string;
  description?: string;
  check: () => Promise<HealthCheckResult>;
  timeout?: number;
  interval?: number;
  enabled?: boolean;
  tags?: string[];
  dependencies?: string[];
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: Date;
  duration: number;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    unknown: number;
  };
  metadata?: Record<string, unknown>;
}

export interface HealthCheckOptions {
  name: string;
  description?: string;
  timeout?: number;
  interval?: number;
  enabled?: boolean;
  tags?: string[];
  dependencies?: string[];
}

export interface HealthOrchestratorOptions {
  defaultTimeout?: number;
  defaultInterval?: number;
  maxConcurrentChecks?: number;
  enableCaching?: boolean;
  cacheTtl?: number;
  enableMetrics?: boolean;
  enableTracing?: boolean;
  failFast?: boolean;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface HealthMetrics {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  uptime: number;
  lastCheckTime?: Date;
  checksByStatus: Record<HealthStatus, number>;
  checksByComponent: Record<string, number>;
}

// ==================== Specialized Health Checks ====================

export interface DatabaseHealthCheckOptions extends HealthCheckOptions {
  connectionString?: string;
  poolName?: string;
  queryTimeout?: number;
  maxConnections?: number;
  minConnections?: number;
}

export interface RedisHealthCheckOptions extends HealthCheckOptions {
  url?: string;
  password?: string;
  db?: number;
  keyPrefix?: string;
  testKey?: string;
}

export interface MemoryHealthCheckOptions extends HealthCheckOptions {
  maxHeapUsageMB?: number;
  maxExternalUsageMB?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface DiskHealthCheckOptions extends HealthCheckOptions {
  paths?: string[];
  minFreeSpaceMB?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface ExternalServiceHealthCheckOptions extends HealthCheckOptions {
  url: string;
  method?: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  timeout?: number;
  expectedStatusCodes?: number[];
  body?: string;
  followRedirects?: boolean;
}

export interface ProcessHealthCheckOptions extends HealthCheckOptions {
  pid?: number;
  processName?: string;
  checkMemory?: boolean;
  checkCpu?: boolean;
  maxMemoryMB?: number;
  maxCpuPercent?: number;
}

export interface CustomHealthCheckOptions extends HealthCheckOptions {
  checkFunction: () => Promise<HealthCheckResult>;
}

// ==================== Validation Schemas ====================

export const healthStatusSchema = z.enum(['healthy', 'unhealthy', 'degraded', 'unknown']);

export const healthCheckResultSchema = z.object({
  status: healthStatusSchema,
  message: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  duration: z.number(),
  error: z.instanceof(Error).optional(),
});

export const healthCheckSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  timeout: z.number().min(1).optional(),
  interval: z.number().min(1).optional(),
  enabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
});

export const healthReportSchema = z.object({
  status: healthStatusSchema,
  timestamp: z.date(),
  duration: z.number(),
  checks: z.record(healthCheckResultSchema),
  summary: z.object({
    total: z.number(),
    healthy: z.number(),
    unhealthy: z.number(),
    degraded: z.number(),
    unknown: z.number(),
  }),
  metadata: z.record(z.unknown()).optional(),
});

export const healthOrchestratorOptionsSchema = z.object({
  defaultTimeout: z.number().min(1).optional(),
  defaultInterval: z.number().min(1).optional(),
  maxConcurrentChecks: z.number().min(1).optional(),
  enableCaching: z.boolean().optional(),
  cacheTtl: z.number().min(1).optional(),
  enableMetrics: z.boolean().optional(),
  enableTracing: z.boolean().optional(),
  failFast: z.boolean().optional(),
  retryPolicy: z.object({
    maxAttempts: z.number().min(1),
    backoffMultiplier: z.number().min(1),
    initialDelay: z.number().min(0),
    maxDelay: z.number().min(1),
  }).optional(),
});

// ==================== Constants ====================

export const DEFAULT_CONFIG = {
  DEFAULT_TIMEOUT_MS: 5000,
  DEFAULT_INTERVAL_MS: 30000, // 30 seconds
  MAX_CONCURRENT_CHECKS: 10,
  CACHE_TTL_MS: 10000, // 10 seconds
  RETRY_POLICY: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 10000,
  },
  MEMORY_WARNING_THRESHOLD: 0.8, // 80%
  MEMORY_CRITICAL_THRESHOLD: 0.9, // 90%
  DISK_WARNING_THRESHOLD: 0.1, // 10% free
  DISK_CRITICAL_THRESHOLD: 0.05, // 5% free
} as const;

export const HEALTH_CHECK_TYPES = {
  DATABASE: 'database',
  REDIS: 'redis',
  MEMORY: 'memory',
  DISK: 'disk',
  EXTERNAL_SERVICE: 'external-service',
  PROCESS: 'process',
  CUSTOM: 'custom',
} as const;