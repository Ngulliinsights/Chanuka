/**
 * Database Health Check
 * 
 * Comprehensive database health monitoring with connection pool monitoring
 * Based on patterns from optimized_health_system.md
 */

import { HealthCheck, HealthResult, HealthStatus } from '../types';

export interface DatabaseHealthConfig {
  testQuery?: string;
  maxLatencyMs?: number;
  minPoolConnections?: number;
  maxPoolUtilization?: number;
  checkPoolStatus?: boolean;
}

export interface DatabaseService {
  query(sql: string, params?: any[]): Promise<any>;
  getPoolStatus?(): {
    total: number;
    available: number;
    waiting: number;
    active: number;
  };
}

export class DatabaseHealthCheck implements HealthCheck {
  name = 'database';
  critical = true; // Database is typically critical
  tags = ['infrastructure', 'storage'];
  timeout?: number;

  constructor(
    private db: DatabaseService,
    private config: DatabaseHealthConfig = {}
  ) {
    this.config = {
      testQuery: 'SELECT 1 as health_check',
      maxLatencyMs: 1000,
      minPoolConnections: 1,
      maxPoolUtilization: 0.9, // 90%
      checkPoolStatus: true,
      ...config
    };
    
    this.timeout = this.config.maxLatencyMs! * 2; // Allow 2x latency for timeout
  }

  async check(): Promise<HealthResult> {
    const start = Date.now();
    const details: Record<string, any> = {};
    const warnings: string[] = [];

    try {
      // Test basic connectivity with a simple query
      const queryStart = Date.now();
      const result = await this.db.query(this.config.testQuery!);
      const queryLatency = Date.now() - queryStart;
      
      details.query = {
        sql: this.config.testQuery,
        latencyMs: queryLatency,
        result: result ? 'success' : 'no_result'
      };
      
      // Check connection pool status if available
      if (this.config.checkPoolStatus && typeof this.db.getPoolStatus === 'function') {
        const poolInfo = await this.checkPoolHealth();
        details.pool = poolInfo.details;
        warnings.push(...poolInfo.warnings);
      }
      
      const totalLatency = Date.now() - start;
      
      // Determine status based on latency and warnings
      let status: HealthStatus = 'healthy';
      
      if (queryLatency > this.config.maxLatencyMs!) {
        status = 'degraded';
        warnings.push(`High query latency: ${queryLatency}ms > ${this.config.maxLatencyMs}ms`);
      }
      
      if (warnings.length > 0 && status === 'healthy') {
        status = 'degraded';
      }
      
      return {
        status,
        latencyMs: totalLatency,
        details,
        warnings: warnings.length > 0 ? warnings : undefined,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error.message,
        details,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkPoolHealth(): Promise<{
    details: Record<string, any>;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    try {
      const poolStatus = this.db.getPoolStatus!();
      
      const utilization = poolStatus.total > 0 ? poolStatus.active / poolStatus.total : 0;
      const availabilityRatio = poolStatus.total > 0 ? poolStatus.available / poolStatus.total : 1;
      
      const details = {
        ...poolStatus,
        utilization: Math.round(utilization * 10000) / 100, // Percentage with 2 decimals
        availabilityRatio: Math.round(availabilityRatio * 10000) / 100
      };
      
      // Check for low available connections
      if (poolStatus.available < this.config.minPoolConnections!) {
        warnings.push(`Low available connections: ${poolStatus.available} < ${this.config.minPoolConnections}`);
      }
      
      // Check for high utilization
      if (utilization > this.config.maxPoolUtilization!) {
        warnings.push(`High pool utilization: ${(utilization * 100).toFixed(1)}% > ${(this.config.maxPoolUtilization! * 100).toFixed(1)}%`);
      }
      
      // Check for waiting connections
      if (poolStatus.waiting > 0) {
        warnings.push(`${poolStatus.waiting} connections waiting for pool`);
      }
      
      // Check for pool exhaustion
      if (poolStatus.available === 0 && poolStatus.waiting > 0) {
        warnings.push('Connection pool exhausted - all connections in use');
      }
      
      return { details, warnings };
    } catch (error) {
      warnings.push(`Pool status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { 
        details: { error: 'pool_check_failed' }, 
        warnings 
      };
    }
  }
}

/**
 * Create a database health check with automatic configuration detection
 */
export function createDatabaseHealthCheck(
  db: DatabaseService, 
  options: Partial<DatabaseHealthConfig> = {}
): DatabaseHealthCheck {
  // Auto-detect database type and adjust configuration
  const config: DatabaseHealthConfig = {
    testQuery: 'SELECT 1 as health_check',
    maxLatencyMs: 1000,
    minPoolConnections: 2,
    maxPoolUtilization: 0.85,
    checkPoolStatus: typeof db.getPoolStatus === 'function',
    ...options
  };
  
  return new DatabaseHealthCheck(db, config);
}