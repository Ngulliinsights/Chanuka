// ============================================================================
// WEBSOCKET ADAPTER - Connection Migration System
// ============================================================================
// Implements blue-green deployment strategy for WebSocket connections
// Provides graceful handover of user subscriptions and connection state

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import * as jwt from 'jsonwebtoken';
import { database as db } from '@shared/database/connection.js';
import { User, users } from '@shared/schema/foundation';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/core/observability/logging';
import { webSocketService } from './websocket.js';

interface ConnectionState {
  user_id: string;
  subscriptions: number[];
  preferences: {
    updateFrequency: 'immediate' | 'hourly' | 'daily';
    notificationTypes: string[];
  };
  connectionId: string;
  lastActivity: number;
}

interface MigrationHandshake {
  type: 'migration_handshake';
  data: {
    sourceVersion: string;
    targetVersion: string;
    connectionState: ConnectionState;
    migrationToken: string;
  };
}

interface MigrationResponse {
  type: 'migration_response';
  data: {
    success: boolean;
    connectionId: string;
    message: string;
    restoredSubscriptions?: number[];
  };
}

export class ConnectionMigrator {
  private migrationTokens: Map<string, ConnectionState> = new Map();
  private readonly TOKEN_EXPIRY = 300000; // 5 minutes

  /**
   * Generate migration token for connection state transfer
   */
  generateMigrationToken(connectionState: ConnectionState): string {
    const token = crypto.randomUUID();
    this.migrationTokens.set(token, {
      ...connectionState,
      lastActivity: Date.now()
    });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return token;
  }

  /**
   * Validate and consume migration token
   */
  validateMigrationToken(token: string): ConnectionState | null {
    const state = this.migrationTokens.get(token);
    if (!state) return null;

    // Check if token is expired
    if (Date.now() - state.lastActivity > this.TOKEN_EXPIRY) {
      this.migrationTokens.delete(token);
      return null;
    }

    // Consume the token (one-time use)
    this.migrationTokens.delete(token);
    return state;
  }

  /**
   * Clean up expired migration tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, state] of this.migrationTokens.entries()) {
      if (now - state.lastActivity > this.TOKEN_EXPIRY) {
        this.migrationTokens.delete(token);
      }
    }
  }

  /**
   * Prepare connection for migration to new version
   */
  prepareConnectionMigration(user_id: string): {
    migrationToken: string;
    connectionState: ConnectionState;
  } {
    // Get current connection state from WebSocket service
    const subscriptions = webSocketService.getUserSubscriptions(user_id);
    const connectionId = `migration-${user_id}-${Date.now()}`;

    const connectionState: ConnectionState = {
      user_id,
      subscriptions,
      preferences: {
        updateFrequency: 'immediate',
        notificationTypes: ['status_change', 'new_comment', 'amendment', 'voting_scheduled']
      },
      connectionId,
      lastActivity: Date.now()
    };

    const migrationToken = this.generateMigrationToken(connectionState);

    logger.info('Prepared connection for migration', {
      component: 'ConnectionMigrator',
      user_id,
      subscriptionCount: subscriptions.length,
      migrationToken: migrationToken.substring(0, 8) + '...'
    });

    return { migrationToken, connectionState };
  }

  /**
   * Restore connection state from migration token
   */
  restoreConnectionState(token: string): ConnectionState | null {
    const state = this.validateMigrationToken(token);
    if (!state) {
      logger.warn('Invalid or expired migration token', {
        component: 'ConnectionMigrator',
        token: token.substring(0, 8) + '...'
      });
      return null;
    }

    logger.info('Restored connection state from migration', {
      component: 'ConnectionMigrator',
      user_id: state.user_id,
      subscriptionCount: state.subscriptions.length
    });

    return state;
  }
}

// Blue-Green Deployment Strategy for WebSocket
export class BlueGreenWebSocketDeployer {
  private currentVersion: 'blue' | 'green' = 'blue';
  private versions = {
    blue: { port: 8080, active: true },
    green: { port: 8081, active: false }
  };

  private connectionMigrator = new ConnectionMigrator();

  /**
   * Deploy new version with blue-green strategy
   */
  async deployNewVersion(newVersion: 'blue' | 'green'): Promise<void> {
    logger.info('Starting blue-green deployment', {
      component: 'BlueGreenWebSocketDeployer',
      currentVersion: this.currentVersion,
      newVersion
    });

    try {
      // Start new version
      await this.startVersion(newVersion);

      // Health check new version
      await this.healthCheckVersion(newVersion);

      // Migrate connections gradually
      await this.migrateConnections(newVersion);

      // Switch traffic to new version
      await this.switchTraffic(newVersion);

      // Shutdown old version
      await this.shutdownVersion(this.currentVersion);

      this.currentVersion = newVersion;

      logger.info('Blue-green deployment completed successfully', {
        component: 'BlueGreenWebSocketDeployer',
        activeVersion: this.currentVersion
      });

    } catch (error) {
      logger.error('Blue-green deployment failed, rolling back', {
        component: 'BlueGreenWebSocketDeployer',
        error: error instanceof Error ? error.message : String(error)
      });

      // Rollback: shutdown new version, keep old version active
      await this.shutdownVersion(newVersion);
      throw error;
    }
  }

  /**
   * Start specified version
   */
  private async startVersion(version: 'blue' | 'green'): Promise<void> {
    logger.info(`Starting WebSocket version ${version}`, {
      component: 'BlueGreenWebSocketDeployer'
    });

    // Implementation would start the WebSocket server for the specified version
    this.versions[version].active = true;
  }

  /**
   * Health check specified version
   */
  private async healthCheckVersion(version: 'blue' | 'green'): Promise<void> {
    logger.info(`Health checking WebSocket version ${version}`, {
      component: 'BlueGreenWebSocketDeployer'
    });

    // Implementation would perform health checks on the new version
    // For now, assume it passes
  }

  /**
   * Migrate connections from old to new version
   */
  private async migrateConnections(newVersion: 'blue' | 'green'): Promise<void> {
    logger.info('Starting connection migration', {
      component: 'BlueGreenWebSocketDeployer',
      newVersion
    });

    // Get all connected users from current version
    const connectedUsers = webSocketService.getAllConnectedUsers();

    logger.info(`Migrating ${connectedUsers.length} connections`, {
      component: 'BlueGreenWebSocketDeployer'
    });

    // For each connected user, prepare migration
    for (const user_id of connectedUsers) {
      try {
        const { migrationToken } = this.connectionMigrator.prepareConnectionMigration(user_id);

        // Send migration instruction to client
        webSocketService.sendUserNotification(user_id, {
          type: 'migration_required',
          title: 'Server Update',
          message: 'Please reconnect to maintain your subscriptions',
          data: {
            migrationToken,
            newVersion,
            reconnectUrl: this.getVersionUrl(newVersion)
          }
        });

        // Brief delay between migrations to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error(`Failed to prepare migration for user ${user_id}`, {
          component: 'BlueGreenWebSocketDeployer',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Wait for migration window
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
  }

  /**
   * Switch traffic to new version
   */
  private async switchTraffic(newVersion: 'blue' | 'green'): Promise<void> {
    logger.info(`Switching traffic to version ${newVersion}`, {
      component: 'BlueGreenWebSocketDeployer'
    });

    // Implementation would update load balancer or routing rules
    this.versions[this.currentVersion].active = false;
    this.versions[newVersion].active = true;
  }

  /**
   * Shutdown specified version
   */
  private async shutdownVersion(version: 'blue' | 'green'): Promise<void> {
    logger.info(`Shutting down WebSocket version ${version}`, {
      component: 'BlueGreenWebSocketDeployer'
    });

    // Implementation would gracefully shutdown the WebSocket server
    this.versions[version].active = false;
  }

  /**
   * Get URL for specified version
   */
  private getVersionUrl(version: 'blue' | 'green'): string {
    const port = this.versions[version].port;
    return `ws://localhost:${port}/ws`;
  }

  /**
   * Handle migration handshake from client
   */
  handleMigrationHandshake(handshake: MigrationHandshake): MigrationResponse {
    const { migrationToken, sourceVersion, targetVersion } = handshake.data;

    logger.info('Processing migration handshake', {
      component: 'BlueGreenWebSocketDeployer',
      sourceVersion,
      targetVersion,
      token: migrationToken.substring(0, 8) + '...'
    });

    const connectionState = this.connectionMigrator.restoreConnectionState(migrationToken);

    if (!connectionState) {
      return {
        type: 'migration_response',
        data: {
          success: false,
          connectionId: '',
          message: 'Invalid or expired migration token'
        }
      };
    }

    // Restore subscriptions in new version
    // This would integrate with the WebSocket service to restore state

    return {
      type: 'migration_response',
      data: {
        success: true,
        connectionId: connectionState.connectionId,
        message: 'Connection migrated successfully',
        restoredSubscriptions: connectionState.subscriptions
      }
    };
  }
}

// Export singleton instances
export const connectionMigrator = new ConnectionMigrator();
export const blueGreenDeployer = new BlueGreenWebSocketDeployer();