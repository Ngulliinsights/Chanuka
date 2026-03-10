/**
 * Bill Data Source Factory
 * 
 * Factory that creates and manages bill data sources.
 * Handles automatic fallback from database to mock data when needed.
 */

import { logger } from '@server/infrastructure/observability';
import { BillDataSource, DataSourceType } from './bill-data-source.interface';
import { DatabaseBillDataSource } from './database-bill-data-source';
import { MockBillDataSource } from './mock-bill-data-source';

export class BillDataSourceFactory {
  private static instance: BillDataSourceFactory;
  private currentDataSource: BillDataSource | null = null;
  private dataSourceType: DataSourceType = 'auto';
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval = 30000; // 30 seconds

  public static getInstance(): BillDataSourceFactory {
    if (!BillDataSourceFactory.instance) {
      BillDataSourceFactory.instance = new BillDataSourceFactory();
    }
    return BillDataSourceFactory.instance;
  }

  /**
   * Get the current data source, creating it if necessary
   */
  async getDataSource(): Promise<BillDataSource> {
    if (!this.currentDataSource || this.shouldCheckHealth()) {
      await this.initializeDataSource();
    }
    return this.currentDataSource!;
  }

  /**
   * Set the preferred data source type
   */
  setDataSourceType(type: DataSourceType): void {
    if (this.dataSourceType !== type) {
      this.dataSourceType = type;
      this.currentDataSource = null; // Force re-initialization
      logger.info({ dataSourceType: type }, 'Data source type changed');
    }
  }

  /**
   * Get current data source status
   */
  async getStatus(): Promise<{
    current: DataSourceType;
    preferred: DataSourceType;
    status: any;
    lastHealthCheck: Date | null;
  }> {
    const dataSource = await this.getDataSource();
    const status = dataSource.getStatus();
    
    return {
      current: status.type,
      preferred: this.dataSourceType,
      status,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Force a health check and potential data source switch
   */
  async forceHealthCheck(): Promise<void> {
    this.lastHealthCheck = null;
    await this.initializeDataSource();
  }

  private async initializeDataSource(): Promise<void> {
    this.lastHealthCheck = new Date();

    switch (this.dataSourceType) {
      case 'database':
        this.currentDataSource = await this.createDatabaseDataSource();
        break;
        
      case 'mock':
        this.currentDataSource = await this.createMockDataSource();
        break;
        
      case 'auto':
      default:
        this.currentDataSource = await this.createAutoDataSource();
        break;
    }
  }

  private async createDatabaseDataSource(): Promise<BillDataSource> {
    const dataSource = new DatabaseBillDataSource();
    
    try {
      const isAvailable = await dataSource.isAvailable();
      if (isAvailable) {
        logger.info({ dataSource: 'database' }, 'Database data source initialized successfully');
        return dataSource;
      } else {
        throw new Error('Database health check failed');
      }
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        dataSource: 'database' 
      }, 'Failed to initialize database data source');
      throw error;
    }
  }

  private async createMockDataSource(): Promise<BillDataSource> {
    const dataSource = new MockBillDataSource();
    logger.info({ dataSource: 'mock' }, 'Mock data source initialized');
    return dataSource;
  }

  private async createAutoDataSource(): Promise<BillDataSource> {
    // Try database first
    try {
      const databaseSource = new DatabaseBillDataSource();
      const isAvailable = await databaseSource.isAvailable();
      
      if (isAvailable) {
        logger.info({ 
          dataSource: 'database',
          mode: 'auto' 
        }, 'Auto-selected database data source');
        return databaseSource;
      }
    } catch (error) {
      logger.warn({ 
        error: error instanceof Error ? error.message : String(error),
        mode: 'auto' 
      }, 'Database unavailable, falling back to mock data');
    }

    // Fallback to mock
    const mockSource = new MockBillDataSource();
    logger.info({ 
      dataSource: 'mock',
      mode: 'auto',
      reason: 'database_unavailable' 
    }, 'Auto-selected mock data source as fallback');
    
    return mockSource;
  }

  private shouldCheckHealth(): boolean {
    if (!this.lastHealthCheck) return true;
    
    const timeSinceLastCheck = Date.now() - this.lastHealthCheck.getTime();
    return timeSinceLastCheck > this.healthCheckInterval;
  }
}

// Export singleton instance
export const billDataSourceFactory = BillDataSourceFactory.getInstance();

// Export convenience function
export async function getBillDataSource(): Promise<BillDataSource> {
  return await billDataSourceFactory.getDataSource();
}