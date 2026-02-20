/**
 * Health Adapter V2 (REFACTORED)
 * IMPROVEMENTS: Comprehensive health checks, proper error handling
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from './utils/session-manager';
import { logger } from '@server/infrastructure/observability';

export interface HealthStatus {
  healthy: boolean;
  timestamp: Date;
  checks: {
    database: HealthCheck;
    connectivity: HealthCheck;
    performance: HealthCheck;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

export class HealthAdapterV2 {
  constructor(private driver: Driver) {}

  async checkHealth(): Promise<HealthStatus> {
    const start = Date.now();
    
    const [database, connectivity, performance] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkConnectivity(),
      this.checkPerformance(),
    ]);

    const databaseCheck = database.status === 'fulfilled' ? database.value : this.unhealthyCheck('Database check failed');
    const connectivityCheck = connectivity.status === 'fulfilled' ? connectivity.value : this.unhealthyCheck('Connectivity check failed');
    const performanceCheck = performance.status === 'fulfilled' ? performance.value : this.unhealthyCheck('Performance check failed');

    const allHealthy = 
      databaseCheck.status === 'healthy' &&
      connectivityCheck.status === 'healthy' &&
      performanceCheck.status === 'healthy';

    return {
      healthy: allHealthy,
      timestamp: new Date(),
      checks: {
        database: databaseCheck,
        connectivity: connectivityCheck,
        performance: performanceCheck,
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      const result = await executeCypherSafely(
        this.driver,
        'RETURN 1 as health',
        {},
        { mode: 'READ' }
      );
      
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Database responding normally',
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        message: 'Database query failed',
        details: { error: error.message },
      };
    }
  }

  private async checkConnectivity(): Promise<HealthCheck> {
    try {
      await this.driver.verifyConnectivity();
      
      return {
        status: 'healthy',
        message: 'Connection pool healthy',
      };
    } catch (error) {
      logger.error('Connectivity check failed', { error: error.message });
      return {
        status: 'unhealthy',
        message: 'Connection pool unhealthy',
        details: { error: error.message },
      };
    }
  }

  private async checkPerformance(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      await executeCypherSafely(
        this.driver,
        'MATCH (n) RETURN count(n) as count LIMIT 1',
        {},
        { mode: 'READ' }
      );
      
      const responseTime = Date.now() - start;
      
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          responseTime,
          message: 'Slow query response',
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Performance within acceptable range',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Performance check failed',
        details: { error: error.message },
      };
    }
  }

  private unhealthyCheck(message: string): HealthCheck {
    return {
      status: 'unhealthy',
      message,
    };
  }
}

export function createHealthAdapter(driver: Driver): HealthAdapterV2 {
  return new HealthAdapterV2(driver);
}

export default HealthAdapterV2;
