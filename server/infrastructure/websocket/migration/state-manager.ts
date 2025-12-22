/**
 * State Manager for Migration System
 * 
 * Manages connection state capture, restoration, and backup
 */
// Temporary fallback logger until shared/core import is resolved
const logger = {
  info: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, context || '');
  },
  warn: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, context?: unknown, error?: Error) => {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, context || '', error || '');
  },
  debug: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, context || '');
  }
};

import { ConnectionState } from './types';


export class StateManager {
  private connectionStates: Map<string, ConnectionState> = new Map();
  private stateBackups: Map<string, ConnectionState[]> = new Map();

  /**
   * Capture current connection states with detailed metadata
   */
  async captureStates(getConnectedUsers: () => string[], getUserSubscriptions: (userId: string) => number[], getConnectionCount: (userId: string) => number): Promise<Map<string, ConnectionState>> {
    logger.info('Capturing connection states for migration', {
      component: 'StateManager'
    });

    this.connectionStates.clear();

    try {
      const connectedUsers = getConnectedUsers();

      for (const user_id of connectedUsers) {
        const subscriptions = getUserSubscriptions(user_id);
        const connectionCount = getConnectionCount(user_id);

        if (connectionCount > 0) {
          const state: ConnectionState = {
            user_id,
            connectionId: `migrated-${user_id}-${Date.now()}`,
            subscriptions,
            lastActivity: new Date(),
            connectionTime: new Date(),
            metadata: {
              originalConnectionCount: connectionCount,
              captureTimestamp: Date.now()
            }
          };

          this.connectionStates.set(user_id, state);
          
          // Create initial backup
          await this.createBackup(user_id, state);
        }
      }

      logger.info(`Captured ${this.connectionStates.size} connection states`, {
        component: 'StateManager',
        totalUsers: connectedUsers.length
      });

      return new Map(this.connectionStates);
    } catch (error) {
      logger.error('Failed to capture connection states', {
        component: 'StateManager'
      }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create versioned backup of connection state
   */
  private async createBackup(user_id: string, state: ConnectionState): Promise<void> {
    const backups = this.stateBackups.get(user_id) || [];
    backups.push({ ...state, metadata: { ...state.metadata, backupTime: Date.now() } });
    
    // Keep only last 5 backups per user to manage memory
    if (backups.length > 5) {
      backups.shift();
    }
    
    this.stateBackups.set(user_id, backups);
  }

  /**
   * Validate subscription preservation across services
   */
  async validateSubscriptionPreservation(
    getUserSubscriptions: (userId: string) => number[]
  ): Promise<{
    overallRate: number;
    userRate: number;
    usersWithLoss: number;
    totalUsers: number;
    totalSubscriptions: number;
  }> {
    let totalExpected = 0;
    let totalActual = 0;
    let usersWithLoss = 0;

    for (const entry of Array.from(this.connectionStates.entries())) {
      const [user_id, state] = entry;
      const expected = state.subscriptions.length;
      totalExpected += expected;

      const actual = getUserSubscriptions(user_id).length;
      totalActual += actual;

      if (actual < expected) {
        usersWithLoss++;
        logger.debug(`Subscription loss for user ${user_id}`, {
          component: 'StateManager',
          expected,
          actual
        });

        // Attempt restoration for critical loss
        if (actual < expected * 0.5) {
          await this.attemptSubscriptionRestoration(user_id, state);
        }
      }
    }

    const overallRate = totalExpected > 0 ? totalActual / totalExpected : 1;
    const userRate = this.connectionStates.size > 0 
      ? (this.connectionStates.size - usersWithLoss) / this.connectionStates.size 
      : 1;

    logger.info('Subscription preservation validation', {
      component: 'StateManager',
      overallRate: (overallRate * 100).toFixed(1) + '%',
      userRate: (userRate * 100).toFixed(1) + '%',
      usersWithLoss,
      totalUsers: this.connectionStates.size
    });

    return { 
      overallRate, 
      userRate, 
      usersWithLoss, 
      totalUsers: this.connectionStates.size,
      totalSubscriptions: totalActual
    };
  }

  /**
   * Attempt to restore lost subscriptions
   */
  private async attemptSubscriptionRestoration(
    user_id: string,
    state: ConnectionState
  ): Promise<void> {
    try {
      logger.warn(`Attempting subscription restoration for user ${user_id}`, {
        component: 'StateManager',
        expectedSubscriptions: state.subscriptions.length
      });
      
      // In production, trigger actual subscription restoration through service APIs
    } catch (error) {
      logger.error(`Subscription restoration failed for user ${user_id}`, {
        component: 'StateManager'
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get captured states
   */
  getStates(): Map<string, ConnectionState> {
    return new Map(this.connectionStates);
  }

  /**
   * Clear all state data
   */
  clear(): void {
    this.connectionStates.clear();
    this.stateBackups.clear();
  }
}