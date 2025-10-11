import { financialDisclosureMonitoringService } from '../../features/analytics/financial-disclosure/monitoring.js';
import { logger } from '../utils/logger';

/**
 * Monitoring scheduler service to manage automated background tasks
 */
export class MonitoringScheduler {
  private isInitialized = false;

  /**
   * Initialize all monitoring services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Monitoring scheduler already initialized', { component: 'SimpleTool' });
      return;
    }

    try {
      logger.info('Initializing monitoring scheduler...', { component: 'SimpleTool' });

      // Start financial disclosure monitoring
      financialDisclosureMonitoringService.startAutomatedMonitoring();

      // Set up graceful shutdown handlers
      this.setupShutdownHandlers();

      this.isInitialized = true;
      logger.info('Monitoring scheduler initialized successfully', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('Error initializing monitoring scheduler:', { component: 'SimpleTool' }, error);
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
      logger.info('Shutting down monitoring scheduler...', { component: 'SimpleTool' });

      // Stop financial disclosure monitoring
      financialDisclosureMonitoringService.stopAutomatedMonitoring();

      this.isInitialized = false;
      logger.info('Monitoring scheduler shut down successfully', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('Error shutting down monitoring scheduler:', { component: 'SimpleTool' }, error);
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






