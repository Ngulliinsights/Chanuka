/**
 * Server Services Initialization Module
 * 
 * This module handles the proper initialization of all server services
 * to prevent circular dependencies and ensure correct startup order.
 * 
 * Initialization Order:
 * 1. Database connection
 * 2. Validation services
 * 3. Authentication services
 * 4. Other core services
 */

// Import initialization modules
import { initializeValidationServices, type ValidationServicesContainer } from '@server/core/validation/validation-services-init.ts';
import { logger } from '@shared/core';
import { getDbInstance } from '@shared/infrastructure/database/index.js';
import type { Pool as PoolType } from 'pg';

/**
 * Server Services Container
 * Holds all initialized server service instances
 */
export interface ServerServicesContainer {
  database: any; // Adjust type based on your database implementation
  validation: ValidationServicesContainer;
  // Add other services as needed
  // auth: AuthServicesContainer;
  // monitoring: MonitoringServicesContainer;
}

/**
 * Global server services container
 */
let serverServicesContainer: ServerServicesContainer | null = null;

/**
 * Initialize all server services in the correct order
 */
export async function initializeServerServices(options?: {
  dbPool?: PoolType;
  skipDatabase?: boolean;
}): Promise<ServerServicesContainer> {
  if (serverServicesContainer) {
    logger.debug('Server services already initialized, returning existing container');
    return serverServicesContainer;
  }

  logger.info('Initializing server services...');
  const startTime = Date.now();

  try {
    // Step 1: Initialize database connection
    let database;
    if (!options?.skipDatabase) {
      logger.debug('Initializing database connection...');
      database = options?.dbPool || await getDbInstance();
    } else {
      logger.debug('Skipping database initialization');
      database = null;
    }

    // Step 2: Initialize validation services
    logger.debug('Initializing validation services...');
    const validation = await initializeValidationServices(options?.dbPool);

    // Step 3: Initialize other services as needed
    // const auth = await initializeAuthServices(database);
    // const monitoring = await initializeMonitoringServices();

    // Create the container
    serverServicesContainer = {
      database,
      validation,
      // auth,
      // monitoring
    };

    const initTime = Date.now() - startTime;
    logger.info(`All server services initialized successfully in ${initTime}ms`);

    // Record initialization metric
    validation.metricsCollector.recordMetric({
      service: 'ServerServicesInit',
      operation: 'initialize_all_services',
      duration: initTime,
      success: true,
      metadata: {
        initializationTime: new Date().toISOString(),
        skipDatabase: options?.skipDatabase || false
      }
    });

    return serverServicesContainer;

  } catch (error) {
    logger.error('Failed to initialize server services:', error);
    
    // Reset container on failure
    serverServicesContainer = null;
    
    throw new Error(`Server services initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the initialized server services container
 */
export function getServerServices(): ServerServicesContainer {
  if (!serverServicesContainer) {
    throw new Error('Server services not initialized. Call initializeServerServices() first.');
  }
  return serverServicesContainer;
}

/**
 * Get a specific server service by name
 */
export function getServerService<T extends keyof ServerServicesContainer>(
  serviceName: T
): ServerServicesContainer[T] {
  const container = getServerServices();
  return container[serviceName];
}

/**
 * Check if server services are initialized
 */
export function areServerServicesInitialized(): boolean {
  return serverServicesContainer !== null;
}

/**
 * Reset server services (mainly for testing)
 */
export function resetServerServices(): void {
  logger.debug('Resetting server services container');
  serverServicesContainer = null;
}

/**
 * Gracefully shutdown all server services
 */
export async function shutdownServerServices(): Promise<void> {
  if (!serverServicesContainer) {
    logger.debug('Server services not initialized, nothing to shutdown');
    return;
  }

  logger.info('Shutting down server services...');

  try {
    // Shutdown services in reverse order
    
    // Shutdown validation services
    const { shutdownValidationServices } = await import('@server/core/validation/validation-services-init.ts');
    await shutdownValidationServices();

    // Shutdown database connections if needed
    // if (serverServicesContainer.database?.end) {
    //   await serverServicesContainer.database.end();
    // }

    // Reset container
    serverServicesContainer = null;
    
    logger.info('Server services shutdown completed');
  } catch (error) {
    logger.error('Error during server services shutdown:', error);
    throw error;
  }
}

// Export convenience accessors for common services
export const serverValidationServices = {
  get container() {
    return getServerService('validation');
  },
  get metricsCollector() {
    return getServerService('validation').metricsCollector;
  },
  get inputValidation() {
    return getServerService('validation').inputValidation;
  },
  get schemaValidation() {
    return getServerService('validation').schemaValidation;
  },
  get dataIntegrityValidation() {
    return getServerService('validation').dataIntegrityValidation;
  },
  get dataCompleteness() {
    return getServerService('validation').dataCompleteness;
  }
};
