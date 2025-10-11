export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  message?: string;
  details?: Record<string, any>;
}

export interface HealthChecker {
  check(): Promise<HealthStatus>;
  checkComponent(name: string): Promise<HealthStatus>;
  registerCheck(name: string, check: () => Promise<HealthStatus>): void;
}







