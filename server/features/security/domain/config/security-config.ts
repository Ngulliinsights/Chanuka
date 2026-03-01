/**
 * Security Configuration
 * Centralized configuration for security services
 */
export interface SecurityConfig {
  /** Maximum number of performance metrics to keep in memory */
  maxMetricsHistory: number;
  
  /** Default batch size for bulk operations */
  defaultBatchSize: number;
  
  /** Default query timeout in milliseconds */
  defaultQueryTimeout: number;
  
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  
  /** Enable detailed query logging */
  enableQueryLogging: boolean;
}

export const defaultSecurityConfig: SecurityConfig = {
  maxMetricsHistory: 1000,
  defaultBatchSize: 100,
  defaultQueryTimeout: 30000, // 30 seconds
  enablePerformanceMonitoring: true,
  enableQueryLogging: true
};
