#!/usr/bin/env tsx

/**
 * Connection Migration Validation Script
 * 
 * Validates the Socket.IO WebSocket migration deployment
 * and tests zero downtime migration.
 */

import { WebSocketMigrationDeployer, SocketIOWebSocketService } from '../../deploy-websocket-migration';
import { logger } from '@shared/core/observability/logging';
import { createServer } from 'http';
import { io as SocketIOClient } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate Socket.IO service initialization
 */
async function validateSocketIOInitialization(): Promise<boolean> {
  logger.info('🔍 Validating Socket.IO service initialization...');

  try {
    const server = createServer();
    const port = 3000 + Math.floor(Math.random() * 1000);
    
    await new Promise<void>((resolve) => {
      server.listen(port, resolve);
    });

    // Initialize Socket.IO service
    const socketIOService = new SocketIOWebSocketService();
    await socketIOService.initialize(server, {
      environment: 'development',
      deploymentStrategy: 'immediate',
      enableMonitoring: true,
      rollbackOnError: true
    });

    // Check initial metrics
    const metrics = socketIOService.getMetrics();
    
    if (metrics.totalConnections !== 0) {
      throw new Error(`Expected 0 initial connections, got ${metrics.totalConnections}`);
    }

    if (metrics.activeConnections !== 0) {
      throw new Error(`Expected 0 active connections, got ${metrics.activeConnections}`);
    }

    // Cleanup
    await socketIOService.shutdown();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    logger.info('✅ Socket.IO service initialization validation passed');
    return true;
  } catch (error) {
    logger.error('❌ Socket.IO service initialization validation failed', {}, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Validate Socket.IO authentication
 */
async function validateSocketIOAuthentication(): Promise<boolean> {
  logger.info('🔍 Validating Socket.IO authentication...');

  try {
    const server = createServer();
    const port = 3000 + Math.floor(Math.random() * 1000);
    
    await new Promise<void>((resolve) => {
      server.listen(port, resolve);
    });

    const socketIOService = new SocketIOWebSocketService();
    await socketIOService.initialize(server, {
      environment: 'development',
      deploymentStrategy: 'immediate',
      enableMonitoring: true,
      rollbackOnError: true
    });

    // Test valid token
    const validUserId = 'test-user-valid';
    const validToken = jwt.sign(
      { user_id: validUserId },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    const validClient = SocketIOClient(`http://localhost:${port}`, {
      path: '/socket.io',
      auth: { token: validToken },
      transports: ['websocket']
    });

    const validAuthTest = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);

      validClient.on('connect', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      validClient.on('connect_error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    validClient.disconnect();

    // Test invalid token
    const invalidClient = SocketIOClient(`http://localhost:${port}`, {
      path: '/socket.io',
      auth: { token: 'invalid-token' },
      transports: ['websocket']
    });

    const invalidAuthTest = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(true), 3000); // Should timeout (good)

      invalidClient.on('connect', () => {
        clearTimeout(timeout);
        resolve(false); // Should not connect
      });

      invalidClient.on('connect_error', () => {
        clearTimeout(timeout);
        resolve(true); // Should reject (good)
      });
    });

    invalidClient.disconnect();

    // Cleanup
    await socketIOService.shutdown();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    if (validAuthTest && invalidAuthTest) {
      logger.info('✅ Socket.IO authentication validation passed');
      return true;
    } else {
      throw new Error(`Authentication test failed: valid=${validAuthTest}, invalid=${invalidAuthTest}`);
    }

  } catch (error) {
    logger.error('❌ Socket.IO authentication validation failed', {}, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Validate Socket.IO subscription management
 */
async function validateSubscriptionManagement(): Promise<boolean> {
  logger.info('🔍 Validating Socket.IO subscription management...');

  try {
    const server = createServer();
    const port = 3000 + Math.floor(Math.random() * 1000);
    
    await new Promise<void>((resolve) => {
      server.listen(port, resolve);
    });

    const socketIOService = new SocketIOWebSocketService();
    await socketIOService.initialize(server, {
      environment: 'development',
      deploymentStrategy: 'immediate',
      enableMonitoring: true,
      rollbackOnError: true
    });

    const testUserId = 'test-user-subscriptions';
    const testSubscriptions = [1, 2, 3, 4, 5];
    const token = jwt.sign(
      { user_id: testUserId },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    const client = SocketIOClient(`http://localhost:${port}`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket']
    });

    const subscriptionTest = await new Promise<boolean>((resolve) => {
      let subscriptionsCompleted = 0;
      const timeout = setTimeout(() => resolve(false), 10000);

      client.on('connect', () => {
        // Subscribe to test bills
        testSubscriptions.forEach(bill_id => {
          client.emit('subscribe', { bill_id });
        });
      });

      client.on('subscribed', (data) => {
        subscriptionsCompleted++;
        if (subscriptionsCompleted === testSubscriptions.length) {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      client.on('connect_error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    client.disconnect();

    // Cleanup
    await socketIOService.shutdown();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    if (subscriptionTest) {
      logger.info('✅ Socket.IO subscription management validation passed');
      return true;
    } else {
      throw new Error('Subscription test failed');
    }

  } catch (error) {
    logger.error('❌ Socket.IO subscription management validation failed', {}, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Validate migration deployment process
 */
async function validateMigrationDeployment(): Promise<boolean> {
  logger.info('🔍 Validating migration deployment process...');

  try {
    const server = createServer();
    const port = 3000 + Math.floor(Math.random() * 1000);
    
    await new Promise<void>((resolve) => {
      server.listen(port, resolve);
    });

    const deployer = new WebSocketMigrationDeployer({
      environment: 'development',
      deploymentStrategy: 'immediate',
      enableMonitoring: true,
      rollbackOnError: true
    });

    // Test deployment process
    await deployer.deploy(server);

    // Check migration state
    const migrationState = deployer.getMigrationState();
    
    if (migrationState.phase !== 'completed') {
      throw new Error(`Expected migration phase to be 'completed', got '${migrationState.phase}'`);
    }

    if (migrationState.errors.length > 0) {
      throw new Error(`Migration had errors: ${migrationState.errors.join(', ')}`);
    }

    // Test Socket.IO service
    const socketIOService = deployer.getSocketIOService();
    const metrics = socketIOService.getMetrics();
    
    if (metrics.errors > 0) {
      throw new Error(`Socket.IO service has errors: ${metrics.errors}`);
    }

    // Cleanup
    await socketIOService.shutdown();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    logger.info('✅ Migration deployment validation passed');
    return true;
  } catch (error) {
    logger.error('❌ Migration deployment validation failed', {}, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Validate zero downtime migration
 */
async function validateZeroDowntimeMigration(): Promise<boolean> {
  logger.info('🔍 Validating zero downtime migration...');

  try {
    const server = createServer();
    const port = 3000 + Math.floor(Math.random() * 1000);
    
    await new Promise<void>((resolve) => {
      server.listen(port, resolve);
    });

    // Measure migration time
    const migrationStartTime = Date.now();
    
    const deployer = new WebSocketMigrationDeployer({
      environment: 'development',
      deploymentStrategy: 'immediate',
      enableMonitoring: true,
      rollbackOnError: true
    });

    await deployer.deploy(server);
    
    const migrationEndTime = Date.now();
    const migrationDuration = migrationEndTime - migrationStartTime;

    // Check migration state
    const migrationState = deployer.getMigrationState();
    
    if (migrationState.phase !== 'completed') {
      throw new Error(`Migration did not complete successfully: ${migrationState.phase}`);
    }

    // For development immediate switch, we expect very fast migration
    if (migrationDuration > 5000) { // 5 seconds
      throw new Error(`Migration took too long: ${migrationDuration}ms`);
    }

    // Test that service is immediately available
    const socketIOService = deployer.getSocketIOService();
    const testUserId = 'test-user-downtime';
    const token = jwt.sign(
      { user_id: testUserId },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    const client = SocketIOClient(`http://localhost:${port}`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket']
    });

    const connectionTest = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);

      client.on('connect', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      client.on('connect_error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    client.disconnect();

    // Cleanup
    await socketIOService.shutdown();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    if (connectionTest) {
      logger.info('✅ Zero downtime migration validation passed', {
        migrationDuration: `${migrationDuration}ms`
      });
      return true;
    } else {
      throw new Error('Service not immediately available after migration');
    }

  } catch (error) {
    logger.error('❌ Zero downtime migration validation failed', {}, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple assertion helper for validation tests
 */
function expect(actual: any): {
  toBe: (expected: any) => void;
  toBeNull: () => void;
  toBeGreaterThan: (expected: number) => void;
} {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    }
  };
}

// ============================================================================
// MAIN VALIDATION
// ============================================================================

async function main(): Promise<void> {
  logger.info('🚀 Starting Socket.IO WebSocket migration validation...');

  const validations = [
    { name: 'Socket.IO Initialization', fn: validateSocketIOInitialization },
    { name: 'Socket.IO Authentication', fn: validateSocketIOAuthentication },
    { name: 'Subscription Management', fn: validateSubscriptionManagement },
    { name: 'Migration Deployment', fn: validateMigrationDeployment },
    { name: 'Zero Downtime Migration', fn: validateZeroDowntimeMigration }
  ];

  let passed = 0;
  let failed = 0;

  for (const validation of validations) {
    try {
      const result = await validation.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      logger.error(`Validation '${validation.name}' threw an error`, {}, error instanceof Error ? error : new Error(String(error)));
      failed++;
    }
  }

  logger.info('📊 Socket.IO WebSocket migration validation completed', {
    total: validations.length,
    passed,
    failed,
    successRate: `${((passed / validations.length) * 100).toFixed(1)}%`
  });

  if (failed > 0) {
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Validation script failed', {}, error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  });
}

export {
  validateSocketIOInitialization,
  validateSocketIOAuthentication,
  validateSubscriptionManagement,
  validateMigrationDeployment,
  validateZeroDowntimeMigration
};
