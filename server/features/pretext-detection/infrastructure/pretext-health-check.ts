/**
 * Pretext Detection Health Check
 * 
 * Provides health check functionality for the pretext detection feature
 */

import { logger } from '@server/infrastructure/observability';
import { PretextCache } from './pretext-cache';
import { PretextRepository } from './pretext-repository';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  details: {
    cache: boolean;
    database: boolean;
    errors?: string[];
  };
}

export class PretextHealthCheck {
  private cache: PretextCache;
  private repository: PretextRepository;

  constructor() {
    this.cache = new PretextCache();
    this.repository = new PretextRepository();
  }

  /**
   * Perform health check
   */
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let cacheHealthy = false;
    let databaseHealthy = false;

    try {
      // Check cache
      try {
        const stats = this.cache.getStats();
        cacheHealthy = stats !== null;
      } catch (error) {
        errors.push(`Cache check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Check database connectivity
      try {
        // Try to query alerts (lightweight operation)
        await this.repository.getAlerts({ limit: 1 });
        databaseHealthy = true;
      } catch (error) {
        errors.push(`Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const responseTime = Date.now() - startTime;

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'down';
      if (cacheHealthy && databaseHealthy) {
        status = 'healthy';
      } else if (databaseHealthy) {
        status = 'degraded'; // Can function without cache
      } else {
        status = 'down'; // Cannot function without database
      }

      const result: HealthCheckResult = {
        status,
        responseTime,
        details: {
          cache: cacheHealthy,
          database: databaseHealthy,
          ...(errors.length > 0 && { errors })
        }
      };

      logger.debug({
        component: 'PretextHealthCheck',
        result
      }, 'Health check completed');

      return result;
    } catch (error) {
      logger.error({
        component: 'PretextHealthCheck',
        error
      }, 'Health check failed');

      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        details: {
          cache: false,
          database: false,
          errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      };
    }
  }
}
