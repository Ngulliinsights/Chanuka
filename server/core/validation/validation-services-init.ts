/**
 * Validation Services Initialization Module
 * 
 * This module handles the proper initialization of all validation services
 * to prevent circular dependencies and ensure correct initialization order.
 * 
 * Initialization Order:
 * 1. Metrics Collector (singleton, no dependencies)
 * 2. Input Validation Service (depends on metrics)
 * 3. Schema Validation Service (depends on database and metrics)
 * 4. Data Integrity Validation Service (depends on database pool and metrics)
 * 5. Data Completeness Service (depends on database and metrics)
 */

import type { Pool as PoolType } from 'pg';
import { getDbInstance } from '../../infrastructure/database/index.js';
import { logger } from '@shared/core/src/index.js';

// Import service classes
import { ValidationMetricsCollector } from './validation-metrics.js';
import { InputValidationService } from './input-validation-service.js';
import { SchemaValidationService } from './schema-validation-service.js';
import { DataIntegrityValidationService } from './data-validation-service.js';
import { DataCompletenessService } from './data-completeness.js';

/**
 * Validation Services Container
 * Holds all initialized validation service instances
 */
export interface ValidationServicesContainer {
  metricsCollector: ValidationMetricsCollector;
  inputValidation: InputValidationService;
  schemaValidation: SchemaValidationService;
  dataIntegrityValidation: DataIntegrityValidationService;
  dataCompleteness: DataCompletenessService;
}

/**
 * Global validation services container
 * Initialized once and reused throughout the application
 */
let validationServicesContainer: ValidationServicesContainer | null = null;

/**
 * Initialize all validation services in the correct order
 * This function ensures that dependencies are resolved properly
 */
export async function initializeValidationServices(dbPool?: PoolType): Promise<ValidationServicesContainer> {
  if (validationServicesContainer) {
    logger.debug('Validation services already initialized, returning existing container');
    return validationServicesContainer;
  }

  logger.info('Initializing validation services...');

  try {
    // Step 1: Initialize metrics collector (no dependencies)
    logger.debug('Initializing validation metrics collector...');
    const metricsCollector = ValidationMetricsCollector.getInstance();

    // Step 2: Initialize input validation service
    logger.debug('Initializing input validation service...');
    const inputValidation = InputValidationService.getInstance();

    // Step 3: Get database connection for services that need it
    let dbInstance;
    let pool: PoolType;
    
    if (dbPool) {
      pool = dbPool;
      logger.debug('Using provided database pool');
    } else {
      logger.debug('Getting database instance...');
      dbInstance = await getDbInstance();
      // Note: We'll need to get the pool from the database instance
      // This might need adjustment based on your database setup
      pool = dbInstance as any; // Type assertion - adjust based on actual implementation
    }

    // Step 4: Initialize schema validation service
    logger.debug('Initializing schema validation service...');
    const schemaValidation = new SchemaValidationService();

    // Step 5: Initialize data integrity validation service
    logger.debug('Initializing data integrity validation service...');
    const dataIntegrityValidation = new DataIntegrityValidationService(pool);

    // Step 6: Initialize data completeness service
    logger.debug('Initializing data completeness service...');
    const dataCompleteness = new DataCompletenessService();

    // Create the container
    validationServicesContainer = {
      metricsCollector,
      inputValidation,
      schemaValidation,
      dataIntegrityValidation,
      dataCompleteness
    };

    logger.info('All validation services initialized successfully');
    
    // Record initialization metric
    metricsCollector.recordMetric({
      service: 'ValidationServicesInit',
      operation: 'initialize_all_services',
      duration: 0, // We could measure this if needed
      success: true,
      metadata: {
        servicesCount: 5,
        initializationTime: new Date().toISOString()
      }
    });

    return validationServicesContainer;

  } catch (error) {
    logger.error('Failed to initialize validation services:', error);
    
    // Reset container on failure
    validationServicesContainer = null;
    
    throw new Error(`Validation services initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the initialized validation services container
 * Throws an error if services haven't been initialized yet
 */
export function getValidationServices(): ValidationServicesContainer {
  if (!validationServicesContainer) {
    throw new Error('Validation services not initialized. Call initializeValidationServices() first.');
  }
  return validationServicesContainer;
}

/**
 * Get a specific validation service by name
 * Provides type-safe access to individual services
 */
export function getValidationService<T extends keyof ValidationServicesContainer>(
  serviceName: T
): ValidationServicesContainer[T] {
  const container = getValidationServices();
  return container[serviceName];
}

/**
 * Check if validation services are initialized
 */
export function areValidationServicesInitialized(): boolean {
  return validationServicesContainer !== null;
}

/**
 * Reset validation services (mainly for testing)
 * This will force re-initialization on next access
 */
export function resetValidationServices(): void {
  logger.debug('Resetting validation services container');
  validationServicesContainer = null;
}

/**
 * Gracefully shutdown validation services
 * Cleanup resources and connections
 */
export async function shutdownValidationServices(): Promise<void> {
  if (!validationServicesContainer) {
    logger.debug('Validation services not initialized, nothing to shutdown');
    return;
  }

  logger.info('Shutting down validation services...');

  try {
    // Cleanup any resources if needed
    // For now, just reset the container
    validationServicesContainer = null;
    
    logger.info('Validation services shutdown completed');
  } catch (error) {
    logger.error('Error during validation services shutdown:', error);
    throw error;
  }
}

// Export individual service instances for backward compatibility
// These will throw if services aren't initialized
export const validationMetricsCollector = {
  get instance() {
    return getValidationService('metricsCollector');
  }
};

export const inputValidationService = {
  get instance() {
    return getValidationService('inputValidation');
  }
};

export const schemaValidationService = {
  get instance() {
    return getValidationService('schemaValidation');
  }
};

export const dataIntegrityValidationService = {
  get instance() {
    return getValidationService('dataIntegrityValidation');
  }
};

export const dataCompletenessService = {
  get instance() {
    return getValidationService('dataCompleteness');
  }
};