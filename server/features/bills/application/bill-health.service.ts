/**
 * Bill Health Service
 * 
 * Provides health check and monitoring capabilities for the bills feature.
 * Shows data source status, cache health, and service availability.
 */

import { logger } from '@server/infrastructure/observability';
import { billDataSourceFactory } from '../infrastructure/data-sources/bill-data-source-factory';
import { cacheService } from '@server/infrastructure/cache';
import { safeAsync, type AsyncServiceResult } from '@server/infrastructure/error-handling';

export interface BillHealthStatus {
  service: 'bills';
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  dataSource: {
    current: string;
    preferred: string;
    available: boolean;
    lastCheck: string | null;
    error?: string;
  };
  cache: {
    available: boolean;
    error?: string;
  };
  features: {
    read: boolean;
    write: boolean;
    search: boolean;
    stats: boolean;
  };
  metadata: {
    version: string;
    environment: string;
  };
}

export class BillHealthService {
  private static instance: BillHealthService;

  public static getInstance(): BillHealthService {
    if (!BillHealthService.instance) {
      BillHealthService.instance = new BillHealthService();
    }
    return BillHealthService.instance;
  }

  /**
   * Comprehensive health check for the bills feature
   */
  async getHealthStatus(): Promise<AsyncServiceResult<BillHealthStatus>> {
    return safeAsync(async () => {
      const timestamp = new Date().toISOString();
      
      // Check data source health
      const dataSourceStatus = await billDataSourceFactory.getStatus();
      const dataSource = await billDataSourceFactory.getDataSource();
      const dataSourceAvailable = await dataSource.isAvailable();

      // Check cache health
      const cacheHealth = await this.checkCacheHealth();

      // Determine overall status
      const overallStatus = this.determineOverallStatus(
        dataSourceAvailable,
        cacheHealth.available
      );

      const healthStatus: BillHealthStatus = {
        service: 'bills',
        status: overallStatus,
        timestamp,
        dataSource: {
          current: dataSourceStatus.current,
          preferred: dataSourceStatus.preferred,
          available: dataSourceAvailable,
          lastCheck: dataSourceStatus.lastHealthCheck?.toISOString() || null,
          error: dataSourceStatus.status.error,
        },
        cache: cacheHealth,
        features: {
          read: dataSourceAvailable,
          write: dataSourceStatus.current === 'database', // Only database supports writes
          search: dataSourceAvailable,
          stats: dataSourceAvailable,
        },
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
      };

      logger.debug({ healthStatus }, 'Bill service health check completed');
      return healthStatus;

    }, { service: 'BillHealthService', operation: 'getHealthStatus' });
  }

  /**
   * Force a health check refresh
   */
  async refreshHealthCheck(): Promise<AsyncServiceResult<void>> {
    return safeAsync(async () => {
      await billDataSourceFactory.forceHealthCheck();
      logger.info({}, 'Bill service health check refreshed');
    }, { service: 'BillHealthService', operation: 'refreshHealthCheck' });
  }

  /**
   * Get detailed data source information
   */
  async getDataSourceInfo(): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const status = await billDataSourceFactory.getStatus();
      const dataSource = await billDataSourceFactory.getDataSource();
      
      return {
        factory: status,
        dataSource: dataSource.getStatus(),
      };
    }, { service: 'BillHealthService', operation: 'getDataSourceInfo' });
  }

  private async checkCacheHealth(): Promise<{ available: boolean; error?: string }> {
    try {
      // Simple cache health check
      const testKey = 'health-check-' + Date.now();
      const testValue = 'test';
      
      await cacheService.set(testKey, testValue, 10); // 10 second TTL
      const retrieved = await cacheService.get(testKey);
      
      if (retrieved === testValue) {
        // Clean up test key
        await cacheService.delete(testKey);
        return { available: true };
      } else {
        return { 
          available: false, 
          error: 'Cache test failed - value mismatch' 
        };
      }
    } catch (error) {
      return { 
        available: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  private determineOverallStatus(
    dataSourceAvailable: boolean,
    cacheAvailable: boolean
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (dataSourceAvailable && cacheAvailable) {
      return 'healthy';
    } else if (dataSourceAvailable) {
      return 'degraded'; // Data source works but cache doesn't
    } else {
      return 'unhealthy'; // Data source is down
    }
  }
}

// Export singleton instance
export const billHealthService = BillHealthService.getInstance();