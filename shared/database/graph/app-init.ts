/**
 * Application Initialization (REFACTORED)
 * IMPROVEMENTS: Proper error handling, validation, logging
 */
import { Driver, driver as neo4jDriver } from 'neo4j-driver';

import { initializeSyncService, shutdownSyncService } from './core/sync-executor';
import { initializeGraphSchema } from './core/schema';
import { NEO4J_CONFIG, SYNC_CONFIG, validateConfig } from './config/graph-config';
import { logger } from '@/core/observability';

let appDriver: Driver | null = null;

export async function initializeGraphDatabase(): Promise<Driver> {
  logger.info('Initializing graph database...');

  try {
    // Validate configuration
    validateConfig();

    // Create driver
    appDriver = neo4jDriver.driver(
      NEO4J_CONFIG.URI,
      neo4jDriver.auth.basic(NEO4J_CONFIG.USER, NEO4J_CONFIG.PASSWORD),
      {
        maxConnectionPoolSize: NEO4J_CONFIG.MAX_CONNECTION_POOL_SIZE,
        connectionTimeout: NEO4J_CONFIG.CONNECTION_TIMEOUT_MS,
        maxConnectionLifetime: NEO4J_CONFIG.MAX_CONNECTION_LIFETIME_MS,
      }
    );

    // Verify connectivity
    await appDriver.verifyConnectivity();
    logger.info('Connected to Neo4j');

    // Initialize schema
    await initializeGraphSchema(appDriver);
    logger.info('Schema initialized');

    // Initialize sync service
    await initializeSyncService({
      neo4jUri: NEO4J_CONFIG.URI,
      neo4jUser: NEO4J_CONFIG.USER,
      neo4jPassword: NEO4J_CONFIG.PASSWORD,
      syncIntervalMs: SYNC_CONFIG.INTERVAL_MS,
      batchSizeLimit: SYNC_CONFIG.BATCH_SIZE,
      syncTimeoutMs: SYNC_CONFIG.TIMEOUT_MS,
      enableAutoSync: SYNC_CONFIG.ENABLE_AUTO_SYNC,
    });

    logger.info('Graph database initialized successfully');
    return appDriver;
  } catch (error) {
    logger.error('Failed to initialize graph database', { error: error.message });
    throw error;
  }
}

export async function shutdownGraphDatabase(): Promise<void> {
  logger.info('Shutting down graph database...');

  try {
    await shutdownSyncService();

    if (appDriver) {
      await appDriver.close();
      appDriver = null;
    }

    logger.info('Graph database shut down successfully');
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
  }
}

export function getDriver(): Driver {
  if (!appDriver) {
    throw new Error('Graph database not initialized. Call initializeGraphDatabase() first.');
  }
  return appDriver;
}

export default {
  initializeGraphDatabase,
  shutdownGraphDatabase,
  getDriver,
};
