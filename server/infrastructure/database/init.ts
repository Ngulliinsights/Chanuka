import { logger } from '@server/infrastructure/observability';
import { databaseMonitor } from './monitoring';

// Monitoring handled via shared/core
import { monitorPoolHealth, type PoolHealthStatus } from './pool';

/**
 * Database initialization and safety setup
 * This module ensures all safety mechanisms are properly configured
 * to prevent race conditions, infinite loops, and cascading failures.
 */

// Track the initialization state to prevent duplicate initialization attempts
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initializes all database safety mechanisms with idempotent behavior.
 * Multiple calls to this function will safely return the same initialization promise,
 * preventing race conditions during concurrent initialization attempts.
 * 
 * Uses double-check locking pattern to minimize synchronization overhead:
 * 1. First check: Return immediately if already initialized
 * 2. Reuse existing promise if initialization is in progress
 * 3. Only create new promise if neither condition is met
 */
export async function initializeDatabaseSafety(): Promise<void> {
  // Fast path: Already initialized, no synchronization overhead
  if (isInitialized) {
    logger.debug('Database safety mechanisms already initialized, skipping');
    return;
  }

  // If initialization is in progress, wait for the existing promise
  // This prevents multiple concurrent initialization attempts
  if (initializationPromise) {
    logger.debug('Database safety initialization in progress, awaiting existing promise');
    return initializationPromise;
  }

  // Create a new initialization promise that subsequent concurrent calls will use
  initializationPromise = performInitialization();
  
  try {
    await initializationPromise;
    isInitialized = true;
  } catch (error) {
    // Reset promise but NOT isInitialized - prevents repeated init attempts
    // if an error occurs. Can be retried by calling again after resolving the issue.
    initializationPromise = null;
    logger.error({ error }, 'Database initialization failed, will retry on next call');
    throw error;
  }
}

/**
 * Internal function that performs the actual initialization work.
 * Separated from the public API to enable proper promise management.
 */
async function performInitialization(): Promise<void> {
  logger.info('Initializing database safety mechanisms...');

  try {
    // Note: Global error handlers are set up elsewhere in the application
    logger.info('✓ Proceeding with database initialization');

    // Perform initial health check with timeout to prevent hanging
    const healthCheckPromise = monitorPoolHealth();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Health check timed out after 10 seconds')), 10000)
    );
    
    const healthStatus = await Promise.race([healthCheckPromise, timeoutPromise]);
    
    // Extract healthy pools for logging, with more defensive handling
    const poolEntries = Object.entries(healthStatus);
    const healthyPools = poolEntries
      .filter(([_, status]) => status?.isHealthy === true)
      .map(([name]) => name);
    
    const unhealthyPools = poolEntries
      .filter(([_, status]) => status?.isHealthy !== true)
      .map(([name]) => name);
    
    logger.info({
      healthyPools,
      unhealthyPools,
      totalPools: poolEntries.length,
    }, '✓ Initial pool health check completed');

    // Warn if any pools are unhealthy at startup, as this may indicate configuration issues
    if (unhealthyPools.length > 0) {
      logger.warn({
        unhealthyPools,
        recommendation: 'Check database connectivity and configuration',
      }, 'Some database pools are unhealthy at startup');
    }

    // Start database monitoring service
    databaseMonitor.start();
    logger.info('✓ Database monitoring service started');

    // Log configuration summary with more structured information
    logger.info({
      features: [
        'Thread-safe metrics tracking',
        'Circuit breaker protection',
        'Retry logic with exponential backoff',
        'Connection pool health monitoring',
        'Global error handling',
        'Graceful shutdown handling'
      ],
      statistics: {
        healthyPools: healthyPools.length,
        unhealthyPools: unhealthyPools.length,
        totalPools: poolEntries.length,
      },
      timestamp: new Date().toISOString(),
    }, 'Database safety initialization completed successfully');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error({
      error: errorMessage,
      stack: errorStack,
      // Include more context to help with debugging
      phase: 'initialization',
      timestamp: new Date().toISOString(),
    }, 'Failed to initialize database safety mechanisms');
    
    // Attempt to clean up any partially initialized resources
    await cleanupPartialInitialization();
    
    throw error;
  }
}

/**
 * Attempts to clean up resources if initialization fails partway through.
 * This prevents leaving the system in a partially initialized state.
 */
async function cleanupPartialInitialization(): Promise<void> {
  try {
    logger.info('Attempting to clean up after failed initialization');
    
    // Stop monitoring if it was started
    if (databaseMonitor.isMonitoringActive()) {
      databaseMonitor.stop();
      logger.info('✓ Monitoring service stopped during cleanup');
    }
  } catch (cleanupError) {
    // Log but don't throw, as we're already handling an error
    logger.warn({
      error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
    }, 'Error during initialization cleanup');
  }
}

/**
 * Gracefully shuts down all database safety mechanisms with idempotent behavior.
 * Safe to call multiple times without side effects.
 */
export async function shutdownDatabaseSafety(): Promise<void> {
  // If not initialized, there's nothing to shut down
  if (!isInitialized && !initializationPromise) {
    logger.debug('Database safety not initialized, skipping shutdown');
    return;
  }

  logger.info('Shutting down database safety mechanisms...');

  try {
    // Stop monitoring service with defensive check
    if (databaseMonitor.isMonitoringActive()) {
      databaseMonitor.stop();
      logger.info('✓ Database monitoring service stopped');
    } else {
      logger.debug('Monitoring service was not active, skipping stop');
    }

    // Perform final health check with timeout protection
    try {
      const finalHealthCheckPromise = monitorPoolHealth();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Final health check timed out')), 5000)
      );
      
      const finalHealthStatus = await Promise.race([finalHealthCheckPromise, timeoutPromise]);
      logger.info({ finalHealthStatus }, '✓ Final health check completed');
    } catch (healthCheckError) {
      // Don't fail the entire shutdown if the final health check fails
      logger.warn({
        error: healthCheckError instanceof Error ? healthCheckError.message : String(healthCheckError),
      }, 'Final health check failed during shutdown');
    }

    // Reset initialization state to allow re-initialization if needed
    isInitialized = false;
    initializationPromise = null;

    logger.info('Database safety shutdown completed successfully');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, 'Error during database safety shutdown');
    
    // Reset state even on error to prevent stuck state
    isInitialized = false;
    initializationPromise = null;
    
    // Don't throw during shutdown to allow other cleanup to continue
  }
}

/**
 * Gets current status of all safety mechanisms with comprehensive health information.
 * This provides a complete snapshot for monitoring and debugging purposes.
 */
export async function getDatabaseSafetyStatus(): Promise<{
  initialized: boolean;
  monitoring: boolean;
  poolHealth: Record<string, PoolHealthStatus>;
  timestamp: Date;
  summary: {
    totalPools: number;
    healthyPools: number;
    unhealthyPools: number;
  };
}> {
  // Attempt to get pool health with timeout protection
  let poolHealth: Record<string, PoolHealthStatus> = {};
  let error: Error | null = null;
  
  try {
    const healthCheckPromise = monitorPoolHealth();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Health check timed out')), 5000)
    );
    
    poolHealth = await Promise.race([healthCheckPromise, timeoutPromise]);
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      error: error.message,
    }, 'Failed to retrieve pool health status');
  }
  
  // Calculate summary statistics for easier consumption
  const poolEntries = Object.entries(poolHealth);
  const healthyCount = poolEntries.filter(([_, status]) => status?.isHealthy === true).length;
  const unhealthyCount = poolEntries.length - healthyCount;
  
  return {
    initialized: isInitialized,
    monitoring: databaseMonitor.isMonitoringActive(),
    poolHealth,
    timestamp: new Date(),
    summary: {
      totalPools: poolEntries.length,
      healthyPools: healthyCount,
      unhealthyPools: unhealthyCount,
    },
  };
}

/**
 * Force resets the initialization state. Use with caution.
 * This can be helpful in testing or recovery scenarios where you need
 * to reinitialize the system from a clean state.
 */
export function resetDatabaseSafetyState(): void {
  logger.warn('Forcefully resetting database safety state');
  isInitialized = false;
  initializationPromise = null;
}















































