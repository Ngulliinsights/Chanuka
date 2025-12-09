/**
 * Service Recovery Utilities
 * Provides service recovery and health check functionality
 */

import { logger } from './logger';

export interface ServiceStatus {
  isAvailable: boolean;
  lastChecked: number;
  responseTime?: number;
  error?: string;
}

export interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

class ServiceRecovery {
  private services = new Map<string, ServiceStatus>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Check if a service is available
   */
  async checkServiceHealth(
    serviceName: string,
    healthCheckUrl?: string,
    options: RecoveryOptions = {}
  ): Promise<ServiceStatus> {
    const { timeout = 5000 } = options;
    const startTime = performance.now();

    try {
      if (healthCheckUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(healthCheckUrl, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        const responseTime = performance.now() - startTime;
        const isAvailable = response.ok;

        const status: ServiceStatus = {
          isAvailable,
          lastChecked: Date.now(),
          responseTime,
          error: isAvailable ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        };

        this.services.set(serviceName, status);
        
        logger.info('Service health check completed', {
          component: 'ServiceRecovery',
          serviceName,
          isAvailable,
          responseTime,
        });

        return status;
      } else {
        // Fallback: assume service is available if no health check URL
        const status: ServiceStatus = {
          isAvailable: true,
          lastChecked: Date.now(),
        };

        this.services.set(serviceName, status);
        return status;
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const status: ServiceStatus = {
        isAvailable: false,
        lastChecked: Date.now(),
        responseTime,
        error: errorMessage,
      };

      this.services.set(serviceName, status);
      
      logger.error('Service health check failed', {
        component: 'ServiceRecovery',
        serviceName,
        error: errorMessage,
      });

      return status;
    }
  }

  /**
   * Get the current status of a service
   */
  getServiceStatus(serviceName: string): ServiceStatus | null {
    return this.services.get(serviceName) || null;
  }

  /**
   * Start monitoring a service with periodic health checks
   */
  startMonitoring(
    serviceName: string,
    healthCheckUrl: string,
    intervalMs = 30000,
    options: RecoveryOptions = {}
  ): void {
    // Clear existing interval if any
    this.stopMonitoring(serviceName);

    // Initial check
    this.checkServiceHealth(serviceName, healthCheckUrl, options);

    // Set up periodic checks
    const interval = setInterval(() => {
      this.checkServiceHealth(serviceName, healthCheckUrl, options);
    }, intervalMs);

    this.checkIntervals.set(serviceName, interval);

    logger.info('Started service monitoring', {
      component: 'ServiceRecovery',
      serviceName,
      intervalMs,
    });
  }

  /**
   * Stop monitoring a service
   */
  stopMonitoring(serviceName: string): void {
    const interval = this.checkIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(serviceName);
      
      logger.info('Stopped service monitoring', {
        component: 'ServiceRecovery',
        serviceName,
      });
    }
  }

  /**
   * Attempt to recover a service by retrying requests
   */
  async attemptRecovery(
    serviceName: string,
    recoveryAction: () => Promise<boolean>,
    options: RecoveryOptions = {}
  ): Promise<boolean> {
    const { maxRetries = 3, retryDelay = 1000 } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Attempting service recovery', {
          component: 'ServiceRecovery',
          serviceName,
          attempt,
          maxRetries,
        });

        const success = await recoveryAction();
        
        if (success) {
          logger.info('Service recovery successful', {
            component: 'ServiceRecovery',
            serviceName,
            attempt,
          });
          
          // Update service status
          this.services.set(serviceName, {
            isAvailable: true,
            lastChecked: Date.now(),
          });
          
          return true;
        }
      } catch (error) {
        logger.warn('Service recovery attempt failed', {
          component: 'ServiceRecovery',
          serviceName,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Wait before next attempt (except for the last one)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    logger.error('Service recovery failed after all attempts', {
      component: 'ServiceRecovery',
      serviceName,
      maxRetries,
    });

    return false;
  }

  /**
   * Get all monitored services and their statuses
   */
  getAllServiceStatuses(): Record<string, ServiceStatus> {
    const statuses: Record<string, ServiceStatus> = {};
    
    for (const [serviceName, status] of this.services.entries()) {
      statuses[serviceName] = status;
    }
    
    return statuses;
  }

  /**
   * Clear all service data and stop all monitoring
   */
  cleanup(): void {
    // Stop all monitoring intervals
    for (const [serviceName] of this.checkIntervals) {
      this.stopMonitoring(serviceName);
    }

    // Clear service data
    this.services.clear();

    logger.info('Service recovery cleanup completed', {
      component: 'ServiceRecovery',
    });
  }
}

// Export singleton instance
export const serviceRecovery = new ServiceRecovery();

// Convenience functions
export async function checkService(
  serviceName: string,
  healthCheckUrl?: string,
  options?: RecoveryOptions
): Promise<ServiceStatus> {
  return serviceRecovery.checkServiceHealth(serviceName, healthCheckUrl, options);
}

export function getServiceStatus(serviceName: string): ServiceStatus | null {
  return serviceRecovery.getServiceStatus(serviceName);
}

export function startServiceMonitoring(
  serviceName: string,
  healthCheckUrl: string,
  intervalMs?: number,
  options?: RecoveryOptions
): void {
  serviceRecovery.startMonitoring(serviceName, healthCheckUrl, intervalMs, options);
}

export function stopServiceMonitoring(serviceName: string): void {
  serviceRecovery.stopMonitoring(serviceName);
}

export async function recoverService(
  serviceName: string,
  recoveryAction: () => Promise<boolean>,
  options?: RecoveryOptions
): Promise<boolean> {
  return serviceRecovery.attemptRecovery(serviceName, recoveryAction, options);
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    serviceRecovery.cleanup();
  });
}