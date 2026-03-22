/**
 * Application Initialization (REFACTORED)
 * IMPROVEMENTS: Proper error handling, validation, logging
 */
import neo4j, { Driver } from 'neo4j-driver';

import { initializeSyncService, shutdownSyncService } from './sync-executor';
import { initializeGraphSchema } from './schema';
import { NEO4J_CONFIG, SYNC_CONFIG, validateConfig } from '../config/graph-config';
import { logger } from '@server/infrastructure/observability';

let appDriver: Driver | null = null;

export async function initializeGraphDatabase(): Promise<Driver> {
  logger.info({ component: 'server' }, 'Initializing graph database...');

  try {
    // Validate configuration
    validateConfig();

    // Create driver
    appDriver = neo4j.driver(
      NEO4J_CONFIG.URI,
      neo4j.auth.basic(NEO4J_CONFIG.USER, NEO4J_CONFIG.PASSWORD),
      {
        maxConnectionPoolSize: NEO4J_CONFIG.MAX_CONNECTION_POOL_SIZE,
        connectionTimeout: NEO4J_CONFIG.CONNECTION_TIMEOUT_MS,
        maxConnectionLifetime: NEO4J_CONFIG.MAX_CONNECTION_LIFETIME_MS,
      }
    );

    // Verify connectivity
    await appDriver.verifyConnectivity();
    logger.info({ component: 'server' }, 'Connected to Neo4j');

    // Initialize schema
    await initializeGraphSchema(appDriver);
    logger.info({ component: 'server' }, 'Schema initialized');

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

    logger.info({ component: 'server' }, 'Graph database initialized successfully');
    return appDriver;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to initialize graph database');
    throw error;
  }
}

export async function shutdownGraphDatabase(): Promise<void> {
  logger.info({ component: 'server' }, 'Shutting down graph database...');

  try {
    await shutdownSyncService();

    if (appDriver) {
      await appDriver.close();
      appDriver = null;
    }

    logger.info({ component: 'server' }, 'Graph database shut down successfully');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error during shutdown');
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
