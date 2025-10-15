import { createMonitoringService } from '../../features/analytics/financial-disclosure/monitoring.js';
import { databaseService } from '../../infrastructure/database/database-service.js';
import { readDatabase } from '../../db.js';
import { cacheService } from '../../infrastructure/cache/cache-service.js';
import { logger } from '@shared/utils/logger';

/**
 * Monitoring scheduler service to manage automated background tasks
 */
export class MonitoringScheduler {
  private isInitialized = false;
  private financialDisclosureMonitoringService: any = null;

  /**
   * Initialize all monitoring services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Monitoring scheduler already initialized', { component: 'Chanuka' });
      return;
    }

    try {
      logger.info('Initializing monitoring scheduler...', { component: 'Chanuka' });

      // Initialize financial disclosure monitoring service
      this.financialDisclosureMonitoringService = createMonitoringService({
        readDb: readDatabase(),
        writeDb: readDatabase(),
        cache: cacheService,
        logger
      });

      // Start financial disclosure monitoring
      this.financialDisclosureMonitoringService.startAutomatedMonitoring();

      // Set up graceful shutdown handlers
      this.setupShutdownHandlers();

      this.isInitialized = true;
      logger.info('Monitoring scheduler initialized successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Error initializing monitoring scheduler:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Shutdown all monitoring services gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.info('Shutting down monitoring scheduler...', { component: 'Chanuka' });

      // Stop financial disclosure monitoring
      if (this.financialDisclosureMonitoringService) {
        await this.financialDisclosureMonitoringService.stopAutomatedMonitoring();
      }

      this.isInitialized = false;
      logger.info('Monitoring scheduler shut down successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Error shutting down monitoring scheduler:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isInitialized: boolean;
    services: Array<{
      name: string;
      status: 'active' | 'inactive';
    }>;
  } {
    return {
      isInitialized: this.isInitialized,
      services: [
        {
          name: 'financial_disclosure_monitoring',
          status: this.isInitialized ? 'active' : 'inactive'
        }
      ]
    };
  }

  /**
   * Setup graceful shutdown handlers
   * Note: Process handlers are managed by main index.ts to avoid conflicts
   */
  private setupShutdownHandlers(): void {
    // Shutdown handlers are managed centrally by index.ts
    // This service will be shut down via the main graceful shutdown process
  }
}

// Export singleton instance
export const monitoringScheduler = new MonitoringScheduler();






