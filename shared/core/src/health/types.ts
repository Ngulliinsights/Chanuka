export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  name: string;
  check(): Promise<HealthResult>;
  timeout?: number;
  critical?: boolean;
  tags?: string[];
}

export interface HealthResult {
  status: HealthStatus;
  latencyMs: number;
  error?: string;
  details?: Record<string, any>;
  timestamp: string;
  warnings?: string[];
}

export interface OverallHealth {
  status: HealthStatus;
  uptime: number;
  environment: string;
  version: string;
  timestamp: string;
  checks: Record<string, HealthResult & { critical: boolean; tags: string[] }>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical_failures: number;
  };
}







