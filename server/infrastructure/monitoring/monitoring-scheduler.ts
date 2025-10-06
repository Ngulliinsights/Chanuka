import { financialDisclosureMonitoringService } from '../../features/analytics/financial-disclosure-monitoring.js';

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
      console.log('Monitoring scheduler already initialized');
      return;
    }

    try {
      console.log('Initializing monitoring scheduler...');

      // Start financial disclosure monitoring
      financialDisclosureMonitoringService.startAutomatedMonitoring();

      // Set up graceful shutdown handlers
      this.setupShutdownHandlers();

      this.isInitialized = true;
      console.log('Monitoring scheduler initialized successfully');
    } catch (error) {
      console.error('Error initializing monitoring scheduler:', error);
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
      console.log('Shutting down monitoring scheduler...');

      // Stop financial disclosure monitoring
      financialDisclosureMonitoringService.stopAutomatedMonitoring();

      this.isInitialized = false;
      console.log('Monitoring scheduler shut down successfully');
    } catch (error) {
      console.error('Error shutting down monitoring scheduler:', error);
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