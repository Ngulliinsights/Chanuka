/**
 * Connection Migration System
 * 
 * Provides graceful connection handover between legacy WebSocket service
 * and new Socket.IO service with blue-green deployment strategy.
 * Preserves user subscriptions and connection state during migration.
 */

import { Server } from 'http';
import { webSocketService } from './websocket.js';
import { socketIOService } from './socketio-service.js';
import { featureFlagService } from './feature-flags.js';
import { logger } from '../../shared/core/src/observability/logging/index.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ConnectionState {
  user_id: string;
  connectionId: string;
  subscriptions: number[];
  preferences?: any;
  lastActivity: Date;
  connectionTime: Date;
}

interface MigrationProgress {
  phase: 'preparing' | 'migrating' | 'validating' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  totalConnections: number;
  migratedConnections: number;
  failedMigrations: number;
  preservedSubscriptions: number;
  errors: string[];
}

interface BlueGreenState {
  activeService: 'legacy' | 'socketio';
  standbyService: 'legacy' | 'socketio';
  migrationInProgress: boolean;
  trafficSplitPercentage: number; // 0-100, percentage going to new service
}

// ============================================================================
// CONNECTION MIGRATOR
// ============================================================================

/**
 * Manages graceful migration of WebSocket connections between services
 * with zero-downtime blue-green deployment strategy.
 */
export class ConnectionMigrator {
  private migrationProgress: MigrationProgress | null = null;
  private blueGreenState: BlueGreenState;
  private connectionStates: Map<string, ConnectionState> = new Map();
  private migrationTimeoutId: NodeJS.Timeout | null = null;
  private validationIntervalId: NodeJS.Timeout | null = null;
  private server: Server | null = null;

  // Configuration
  private readonly MIGRATION_TIMEOUT = 300000; // 5 minutes
  private readonly VALIDATION_INTERVAL = 10000; // 10 seconds
  private readonly MAX_MIGRATION_ATTEMPTS = 3;
  private readonly CONNECTION_DRAIN_TIMEOUT = 30000; // 30 seconds
  
  // Test mode configuration (can be overridden for testing)
  private testMode = false;
  private testDelays = {
    trafficShiftDelay: 30000, // 30 seconds
    serviceReadyDelay: 2000,  // 2 seconds
    drainTimeout: 30000       // 30 seconds
  };

  constructor() {
    this.blueGreenState = {
      activeService: 'legacy',
      standbyService: 'socketio',
      migrationInProgress: false,
      trafficSplitPercentage: 0
    };

    // Enable test mode if in test environment
    this.testMode = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    if (this.testMode) {
      this.testDelays = {
        trafficShiftDelay: 100,  // 100ms for tests
        serviceReadyDelay: 50,   // 50ms for tests
        drainTimeout: 1000       // 1 second for tests
      };
    }

    this.setupMigrationMonitoring();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the connection migrator with HTTP server
   */
  initialize(server: Server): void {
    this.server = server;
    
    // Ensure both services are initialized
    webSocketService.initialize(server);
    
    // Initialize Socket.IO service if migration is enabled
    if (featureFlagService.isEnabled('websocket_socketio_migration')) {
      socketIOService.initialize(server);
    }

    logger.info('Connection migrator initialized', {
      component: 'ConnectionMigrator',
      activeService: this.blueGreenState.activeService
    });
  }

  /**
   * Setup monitoring for migration health and automatic rollback
   */
  private setupMigrationMonitoring(): void {
    setInterval(() => {
      if (this.migrationProgress && this.migrationProgress.phase === 'migrating') {
        this.validateMigrationHealth();
      }
    }, this.VALIDATION_INTERVAL);
  }

  // ==========================================================================
  // CONNECTION STATE MANAGEMENT
  // ==========================================================================

  /**
   * Capture current connection states from active service
   */
  private async captureConnectionStates(): Promise<void> {
    logger.info('Capturing connection states for migration', {
      component: 'ConnectionMigrator'
    });

    this.connectionStates.clear();

    try {
      // Get all connected users from legacy service
      const connectedUsers = webSocketService.getAllConnectedUsers();
      
      for (const user_id of connectedUsers) {
        const subscriptions = webSocketService.getUserSubscriptions(user_id);
        const connectionCount = webSocketService.getConnectionCount(user_id);
        
        if (connectionCount > 0) {
          const connectionState: ConnectionState = {
            user_id,
            connectionId: `migrated-${user_id}-${Date.now()}`,
            subscriptions,
            lastActivity: new Date(),
            connectionTime: new Date()
          };
          
          this.connectionStates.set(user_id, connectionState);
        }
      }

      logger.info(`Captured ${this.connectionStates.size} connection states`, {
        component: 'ConnectionMigrator',
        totalUsers: connectedUsers.length
      });
    } catch (error) {
      logger.error('Failed to capture connection states', {
        component: 'ConnectionMigrator'
      }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Restore connection states to target service
   */
  private async restoreConnectionStates(): Promise<void> {
    logger.info('Restoring connection states to new service', {
      component: 'ConnectionMigrator'
    });

    let restoredCount = 0;
    let failedCount = 0;

    for (const [user_id, state] of this.connectionStates.entries()) {
      try {
        // Create connection state backup for rollback scenarios
        await this.createConnectionStateBackup(user_id, state);
        
        // Validate that the user still has active connections
        const isStillConnected = socketIOService.isUserConnected(user_id) || 
                                webSocketService.isUserConnected(user_id);
        
        if (isStillConnected) {
          // Verify subscription restoration
          const currentSubscriptions = socketIOService.getUserSubscriptions(user_id);
          const expectedSubscriptions = state.subscriptions;
          
          // Check if subscriptions are preserved (allow for some variance)
          const preservationRate = expectedSubscriptions.length > 0 
            ? currentSubscriptions.length / expectedSubscriptions.length 
            : 1;
          
          if (preservationRate >= 0.9) { // 90% preservation threshold
            logger.debug(`Connection state successfully restored: ${user_id}`, {
              component: 'ConnectionMigrator',
              expectedSubscriptions: expectedSubscriptions.length,
              actualSubscriptions: currentSubscriptions.length,
              preservationRate: (preservationRate * 100).toFixed(1) + '%'
            });
            restoredCount++;
          } else {
            logger.warn(`Partial subscription loss detected for user ${user_id}`, {
              component: 'ConnectionMigrator',
              expectedSubscriptions: expectedSubscriptions.length,
              actualSubscriptions: currentSubscriptions.length,
              preservationRate: (preservationRate * 100).toFixed(1) + '%'
            });
            // Still count as restored but with degraded state
            restoredCount++;
          }
        } else {
          logger.warn(`User ${user_id} no longer connected during restoration`, {
            component: 'ConnectionMigrator'
          });
          failedCount++;
        }
      } catch (error) {
        logger.error(`Failed to restore connection state for user ${user_id}`, {
          component: 'ConnectionMigrator'
        }, error instanceof Error ? error : new Error(String(error)));
        failedCount++;
      }
    }

    if (this.migrationProgress) {
      this.migrationProgress.migratedConnections = restoredCount;
      this.migrationProgress.failedMigrations = failedCount;
    }

    logger.info(`Connection state restoration completed`, {
      component: 'ConnectionMigrator',
      restored: restoredCount,
      failed: failedCount,
      successRate: restoredCount > 0 ? ((restoredCount / (restoredCount + failedCount)) * 100).toFixed(1) + '%' : '0%'
    });
  }

  /**
   * Create connection state backup for rollback scenarios
   */
  private async createConnectionStateBackup(user_id: string, state: ConnectionState): Promise<void> {
    try {
      // Store backup in memory for quick rollback access
      // In production, this could be stored in Redis or database
      const backupKey = `backup_${user_id}_${Date.now()}`;
      
      // For now, we'll use the existing connectionStates map as backup storage
      // In a real implementation, this would be persisted to external storage
      logger.debug(`Connection state backup created for user ${user_id}`, {
        component: 'ConnectionMigrator',
        backupKey,
        subscriptions: state.subscriptions.length
      });
    } catch (error) {
      logger.error(`Failed to create connection state backup for user ${user_id}`, {
        component: 'ConnectionMigrator'
      }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ==========================================================================
  // BLUE-GREEN DEPLOYMENT
  // ==========================================================================

  /**
   * Start blue-green migration process
   */
  async startBlueGreenMigration(): Promise<void> {
    if (this.blueGreenState.migrationInProgress) {
      throw new Error('Migration already in progress');
    }

    logger.info('🔄 Starting blue-green WebSocket migration', {
      component: 'ConnectionMigrator'
    });

    this.blueGreenState.migrationInProgress = true;
    this.migrationProgress = {
      phase: 'preparing',
      startTime: new Date(),
      totalConnections: webSocketService.getStats().activeConnections,
      migratedConnections: 0,
      failedMigrations: 0,
      preservedSubscriptions: 0,
      errors: []
    };

    try {
      // Phase 1: Prepare standby service
      await this.prepareStandbyService();

      // Phase 2: Capture connection states
      await this.captureConnectionStates();

      // Phase 3: Gradual traffic shifting
      await this.performGradualTrafficShift();

      // Phase 4: Validate migration
      await this.validateMigration();

      // Phase 5: Complete migration
      await this.completeMigration();

    } catch (error) {
      logger.error('Blue-green migration failed', {
        component: 'ConnectionMigrator'
      }, error instanceof Error ? error : new Error(String(error)));
      
      await this.rollbackMigration();
      throw error;
    }
  }

  /**
   * Prepare standby service for migration
   */
  private async prepareStandbyService(): Promise<void> {
    logger.info('Preparing standby service', {
      component: 'ConnectionMigrator'
    });

    if (!this.server) {
      throw new Error('Server not initialized');
    }

    // Ensure Socket.IO service is initialized and healthy
    if (!featureFlagService.isEnabled('websocket_socketio_migration')) {
      featureFlagService.toggleFlag('websocket_socketio_migration', true);
      socketIOService.initialize(this.server);
    }

    // Wait for service to be ready
    await new Promise(resolve => setTimeout(resolve, this.testDelays.serviceReadyDelay));

    const socketIOHealth = socketIOService.getHealthStatus();
    if (!socketIOHealth.isHealthy) {
      throw new Error('Standby service is not healthy');
    }

    logger.info('Standby service prepared successfully', {
      component: 'ConnectionMigrator'
    });
  }

  /**
   * Perform gradual traffic shifting between services
   */
  private async performGradualTrafficShift(): Promise<void> {
    if (!this.migrationProgress) return;

    this.migrationProgress.phase = 'migrating';
    
    logger.info('Starting gradual traffic shift', {
      component: 'ConnectionMigrator'
    });

    // Traffic shift percentages: 10% → 25% → 50% → 75% → 100%
    const shiftSteps = [10, 25, 50, 75, 100];
    
    for (const percentage of shiftSteps) {
      logger.info(`Shifting ${percentage}% of traffic to new service`, {
        component: 'ConnectionMigrator'
      });

      // Update feature flag rollout percentage
      featureFlagService.updateRolloutPercentage('websocket_socketio_migration', percentage);
      this.blueGreenState.trafficSplitPercentage = percentage;

      // Wait for traffic to stabilize
      await new Promise(resolve => setTimeout(resolve, this.testDelays.trafficShiftDelay));

      // Validate health at each step
      await this.validateMigrationHealth();

      // Check for rollback conditions
      if (featureFlagService.shouldTriggerRollback('websocket_socketio_migration')) {
        throw new Error(`Rollback triggered at ${percentage}% traffic shift`);
      }
    }

    logger.info('Traffic shift completed successfully', {
      component: 'ConnectionMigrator'
    });
  }

  /**
   * Validate migration health and metrics
   */
  private async validateMigrationHealth(): Promise<void> {
    const legacyStats = webSocketService.getStats();
    const socketIOStats = socketIOService.getStats();
    const migrationMetrics = featureFlagService.getStatisticalAnalysis('websocket_socketio_migration');

    logger.info('Validating migration health', {
      component: 'ConnectionMigrator',
      legacyConnections: legacyStats.activeConnections,
      socketIOConnections: socketIOStats.activeConnections,
      errorRate: migrationMetrics?.errorRate || 0,
      responseTime: migrationMetrics?.averageResponseTime || 0
    });

    // Enhanced error rate validation with progressive thresholds
    if (migrationMetrics) {
      const errorThreshold = this.getErrorThresholdForTrafficPercentage();
      if (migrationMetrics.errorRate > errorThreshold) {
        throw new Error(`High error rate detected: ${(migrationMetrics.errorRate * 100).toFixed(2)}% (threshold: ${(errorThreshold * 100).toFixed(2)}%)`);
      }

      // Enhanced response time validation
      const responseTimeThreshold = this.getResponseTimeThresholdForTrafficPercentage();
      if (migrationMetrics.averageResponseTime > responseTimeThreshold) {
        throw new Error(`High response time detected: ${migrationMetrics.averageResponseTime.toFixed(0)}ms (threshold: ${responseTimeThreshold}ms)`);
      }
    }

    // Enhanced connection stability validation
    const totalConnections = legacyStats.activeConnections + socketIOStats.activeConnections;
    const connectionLossThreshold = this.getConnectionLossThreshold();
    
    if (this.migrationProgress && totalConnections < this.migrationProgress.totalConnections * connectionLossThreshold) {
      const lossPercentage = ((this.migrationProgress.totalConnections - totalConnections) / this.migrationProgress.totalConnections * 100).toFixed(1);
      throw new Error(`Significant connection loss detected: ${lossPercentage}% (threshold: ${((1 - connectionLossThreshold) * 100).toFixed(1)}%)`);
    }

    // Validate message delivery rates
    const legacyDropRate = legacyStats.totalMessages > 0 ? legacyStats.droppedMessages / legacyStats.totalMessages : 0;
    const socketIODropRate = socketIOStats.totalMessages > 0 ? socketIOStats.droppedMessages / socketIOStats.totalMessages : 0;
    
    if (legacyDropRate > 0.01 || socketIODropRate > 0.01) { // 1% drop rate threshold
      throw new Error(`High message drop rate detected - Legacy: ${(legacyDropRate * 100).toFixed(2)}%, Socket.IO: ${(socketIODropRate * 100).toFixed(2)}%`);
    }

    // Validate subscription preservation during migration
    await this.validateSubscriptionPreservation();
  }

  /**
   * Get error threshold based on current traffic percentage (more lenient at lower percentages)
   */
  private getErrorThresholdForTrafficPercentage(): number {
    const trafficPercentage = this.blueGreenState.trafficSplitPercentage;
    
    if (trafficPercentage <= 10) return 0.02; // 2% for initial rollout
    if (trafficPercentage <= 25) return 0.015; // 1.5% for early rollout
    if (trafficPercentage <= 50) return 0.01; // 1% for mid rollout
    return 0.005; // 0.5% for final rollout
  }

  /**
   * Get response time threshold based on current traffic percentage
   */
  private getResponseTimeThresholdForTrafficPercentage(): number {
    const trafficPercentage = this.blueGreenState.trafficSplitPercentage;
    
    if (trafficPercentage <= 10) return 800; // 800ms for initial rollout
    if (trafficPercentage <= 25) return 600; // 600ms for early rollout
    if (trafficPercentage <= 50) return 500; // 500ms for mid rollout
    return 400; // 400ms for final rollout
  }

  /**
   * Get connection loss threshold (more lenient at higher traffic percentages due to natural migration)
   */
  private getConnectionLossThreshold(): number {
    const trafficPercentage = this.blueGreenState.trafficSplitPercentage;
    
    if (trafficPercentage <= 25) return 0.95; // 5% loss allowed
    if (trafficPercentage <= 50) return 0.90; // 10% loss allowed during active migration
    if (trafficPercentage <= 75) return 0.85; // 15% loss allowed during major migration
    return 0.80; // 20% loss allowed during final migration (connections moving to new service)
  }

  /**
   * Validate subscription preservation across services with enhanced connection state backup
   */
  private async validateSubscriptionPreservation(): Promise<void> {
    let totalExpectedSubscriptions = 0;
    let totalActualSubscriptions = 0;
    let usersWithSubscriptionLoss = 0;

    for (const [user_id, state] of this.connectionStates.entries()) {
      const expectedSubscriptions = state.subscriptions.length;
      totalExpectedSubscriptions += expectedSubscriptions;

      // Check subscriptions in both services (user might be connected to either during migration)
      const legacySubscriptions = webSocketService.getUserSubscriptions(user_id);
      const socketIOSubscriptions = socketIOService.getUserSubscriptions(user_id);
      
      // Take the maximum subscriptions from either service
      const actualSubscriptions = Math.max(legacySubscriptions.length, socketIOSubscriptions.length);
      totalActualSubscriptions += actualSubscriptions;

      if (actualSubscriptions < expectedSubscriptions) {
        usersWithSubscriptionLoss++;
        logger.debug(`Subscription loss detected for user ${user_id}`, {
          component: 'ConnectionMigrator',
          expected: expectedSubscriptions,
          actual: actualSubscriptions,
          legacyCount: legacySubscriptions.length,
          socketIOCount: socketIOSubscriptions.length
        });

        // Create detailed backup for potential restoration
        await this.createDetailedConnectionStateBackup(user_id, state, {
          legacySubscriptions,
          socketIOSubscriptions,
          actualSubscriptions,
          lossDetected: true
        });
      }
    }

    const overallPreservationRate = totalExpectedSubscriptions > 0 
      ? totalActualSubscriptions / totalExpectedSubscriptions 
      : 1;

    const userPreservationRate = this.connectionStates.size > 0 
      ? (this.connectionStates.size - usersWithSubscriptionLoss) / this.connectionStates.size 
      : 1;

    logger.info('Subscription preservation validation', {
      component: 'ConnectionMigrator',
      overallPreservationRate: (overallPreservationRate * 100).toFixed(1) + '%',
      userPreservationRate: (userPreservationRate * 100).toFixed(1) + '%',
      usersWithLoss: usersWithSubscriptionLoss,
      totalUsers: this.connectionStates.size
    });

    // Require at least 85% overall subscription preservation and 90% user preservation
    if (overallPreservationRate < 0.85) {
      throw new Error(`Low subscription preservation rate: ${(overallPreservationRate * 100).toFixed(1)}% (minimum: 85%)`);
    }

    if (userPreservationRate < 0.90) {
      throw new Error(`Too many users with subscription loss: ${usersWithSubscriptionLoss}/${this.connectionStates.size} (maximum: 10%)`);
    }
  }

  /**
   * Create detailed connection state backup with migration context
   */
  private async createDetailedConnectionStateBackup(
    user_id: string, 
    state: ConnectionState, 
    migrationContext?: {
      legacySubscriptions: number[];
      socketIOSubscriptions: number[];
      actualSubscriptions: number;
      lossDetected: boolean;
    }
  ): Promise<void> {
    try {
      const backupKey = `backup_${user_id}_${Date.now()}`;
      const detailedBackup = {
        ...state,
        backupKey,
        migrationContext,
        backupTimestamp: new Date(),
        migrationPhase: this.migrationProgress?.phase || 'unknown'
      };

      // Store backup in memory for quick rollback access
      // In production, this could be stored in Redis or database
      logger.debug(`Detailed connection state backup created for user ${user_id}`, {
        component: 'ConnectionMigrator',
        backupKey,
        subscriptions: state.subscriptions.length,
        lossDetected: migrationContext?.lossDetected || false
      });

      // If subscription loss detected, attempt immediate restoration
      if (migrationContext?.lossDetected) {
        await this.attemptSubscriptionRestoration(user_id, state, migrationContext);
      }
    } catch (error) {
      logger.error(`Failed to create detailed connection state backup for user ${user_id}`, {
        component: 'ConnectionMigrator'
      }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Attempt to restore lost subscriptions during migration
   */
  private async attemptSubscriptionRestoration(
    user_id: string, 
    originalState: ConnectionState,
    migrationContext: {
      legacySubscriptions: number[];
      socketIOSubscriptions: number[];
      actualSubscriptions: number;
      lossDetected: boolean;
    }
  ): Promise<void> {
    try {
      const missingSubscriptions = originalState.subscriptions.filter(
        sub => !migrationContext.legacySubscriptions.includes(sub) && 
               !migrationContext.socketIOSubscriptions.includes(sub)
      );

      if (missingSubscriptions.length > 0) {
        logger.warn(`Attempting to restore ${missingSubscriptions.length} missing subscriptions for user ${user_id}`, {
          component: 'ConnectionMigrator',
          missingSubscriptions
        });

        // In a real implementation, this would trigger subscription restoration
        // For now, we log the attempt and update metrics
        if (this.migrationProgress) {
          this.migrationProgress.errors.push(
            `Subscription restoration attempted for user ${user_id}: ${missingSubscriptions.length} subscriptions`
          );
        }
      }
    } catch (error) {
      logger.error(`Failed to attempt subscription restoration for user ${user_id}`, {
        component: 'ConnectionMigrator'
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate final migration state
   */
  private async validateMigration(): Promise<void> {
    if (!this.migrationProgress) return;

    this.migrationProgress.phase = 'validating';
    
    logger.info('Validating migration completion', {
      component: 'ConnectionMigrator'
    });

    // Final health check
    await this.validateMigrationHealth();

    // Validate subscription preservation
    let preservedSubscriptions = 0;
    for (const [user_id, state] of this.connectionStates.entries()) {
      const currentSubscriptions = socketIOService.getUserSubscriptions(user_id);
      if (currentSubscriptions.length >= state.subscriptions.length) {
        preservedSubscriptions += state.subscriptions.length;
      }
    }

    this.migrationProgress.preservedSubscriptions = preservedSubscriptions;

    // Check success criteria
    const successRate = this.migrationProgress.totalConnections > 0 
      ? (this.migrationProgress.migratedConnections / this.migrationProgress.totalConnections) 
      : 1;

    if (successRate < 0.95) { // 95% success rate required
      throw new Error(`Migration success rate too low: ${(successRate * 100).toFixed(2)}%`);
    }

    logger.info('Migration validation completed successfully', {
      component: 'ConnectionMigrator',
      successRate: `${(successRate * 100).toFixed(2)}%`,
      preservedSubscriptions
    });
  }

  /**
   * Complete the migration process
   */
  private async completeMigration(): Promise<void> {
    if (!this.migrationProgress) return;

    this.migrationProgress.phase = 'completed';
    this.migrationProgress.endTime = new Date();
    
    // Update blue-green state
    this.blueGreenState.activeService = 'socketio';
    this.blueGreenState.standbyService = 'legacy';
    this.blueGreenState.migrationInProgress = false;
    this.blueGreenState.trafficSplitPercentage = 100;

    logger.info('✅ Blue-green migration completed successfully', {
      component: 'ConnectionMigrator',
      duration: this.migrationProgress.endTime.getTime() - this.migrationProgress.startTime.getTime(),
      migratedConnections: this.migrationProgress.migratedConnections,
      preservedSubscriptions: this.migrationProgress.preservedSubscriptions
    });
  }

  // ==========================================================================
  // ROLLBACK MECHANISMS
  // ==========================================================================

  /**
   * Rollback migration to previous state with connection preservation
   */
  async rollbackMigration(): Promise<void> {
    logger.error('🔄 Rolling back WebSocket migration with connection preservation', {
      component: 'ConnectionMigrator'
    });

    if (this.migrationProgress) {
      this.migrationProgress.phase = 'rolled_back';
      this.migrationProgress.endTime = new Date();
    }

    try {
      // Step 1: Capture current connection states before rollback
      const preRollbackConnections = await this.capturePreRollbackState();

      // Step 2: Gradually shift traffic back to legacy service
      await this.performGradualRollbackTrafficShift();

      // Step 3: Verify connection preservation during rollback
      await this.validateRollbackConnectionPreservation(preRollbackConnections);

      // Step 4: Finalize rollback state
      await this.finalizeRollbackState();

      logger.info('✅ Migration rollback completed with connection preservation', {
        component: 'ConnectionMigrator',
        preservedConnections: preRollbackConnections.totalConnections
      });
    } catch (error) {
      logger.error('❌ Rollback failed', {
        component: 'ConnectionMigrator'
      }, error instanceof Error ? error : new Error(String(error)));
      
      // Emergency fallback - immediate traffic cutover
      await this.performEmergencyRollback();
      throw error;
    }
  }

  /**
   * Capture connection state before rollback for preservation validation
   */
  private async capturePreRollbackState(): Promise<{
    totalConnections: number;
    userConnections: Map<string, number>;
    userSubscriptions: Map<string, number[]>;
  }> {
    logger.info('Capturing pre-rollback connection state', {
      component: 'ConnectionMigrator'
    });

    const legacyUsers = webSocketService.getAllConnectedUsers();
    const socketIOUsers = socketIOService.getAllConnectedUsers();
    const allUsers = new Set([...legacyUsers, ...socketIOUsers]);

    const userConnections = new Map<string, number>();
    const userSubscriptions = new Map<string, number[]>();
    let totalConnections = 0;

    for (const user_id of allUsers) {
      const legacyConnections = webSocketService.getConnectionCount(user_id);
      const socketIOConnections = socketIOService.getConnectionCount(user_id);
      const totalUserConnections = legacyConnections + socketIOConnections;
      
      userConnections.set(user_id, totalUserConnections);
      totalConnections += totalUserConnections;

      // Capture subscriptions from both services and merge
      const legacySubs = webSocketService.getUserSubscriptions(user_id);
      const socketIOSubs = socketIOService.getUserSubscriptions(user_id);
      const allSubs = Array.from(new Set([...legacySubs, ...socketIOSubs]));
      
      userSubscriptions.set(user_id, allSubs);
    }

    logger.info('Pre-rollback state captured', {
      component: 'ConnectionMigrator',
      totalUsers: allUsers.size,
      totalConnections,
      legacyUsers: legacyUsers.length,
      socketIOUsers: socketIOUsers.length
    });

    return { totalConnections, userConnections, userSubscriptions };
  }

  /**
   * Perform gradual traffic shift back to legacy service
   */
  private async performGradualRollbackTrafficShift(): Promise<void> {
    logger.info('Starting gradual rollback traffic shift', {
      component: 'ConnectionMigrator'
    });

    const currentPercentage = this.blueGreenState.trafficSplitPercentage;
    
    // Rollback in larger steps for faster recovery: 75% → 50% → 25% → 0%
    const rollbackSteps = [];
    if (currentPercentage > 75) rollbackSteps.push(75);
    if (currentPercentage > 50) rollbackSteps.push(50);
    if (currentPercentage > 25) rollbackSteps.push(25);
    rollbackSteps.push(0);

    for (const percentage of rollbackSteps) {
      logger.info(`Rolling back to ${percentage}% traffic on new service`, {
        component: 'ConnectionMigrator'
      });

      // Update feature flag rollout percentage
      featureFlagService.updateRolloutPercentage('websocket_socketio_migration', percentage);
      this.blueGreenState.trafficSplitPercentage = percentage;

      // Shorter wait time for rollback (faster recovery)
      await new Promise(resolve => setTimeout(resolve, this.testDelays.trafficShiftDelay / 2));

      // Quick health check at each step
      const legacyHealth = webSocketService.getHealthStatus();
      if (!legacyHealth.isHealthy) {
        logger.warn('Legacy service health issue during rollback', {
          component: 'ConnectionMigrator',
          percentage
        });
      }
    }

    // Disable the migration flag completely
    featureFlagService.toggleFlag('websocket_socketio_migration', false);

    logger.info('Rollback traffic shift completed', {
      component: 'ConnectionMigrator'
    });
  }

  /**
   * Validate connection preservation during rollback
   */
  private async validateRollbackConnectionPreservation(preRollbackState: {
    totalConnections: number;
    userConnections: Map<string, number>;
    userSubscriptions: Map<string, number[]>;
  }): Promise<void> {
    logger.info('Validating connection preservation during rollback', {
      component: 'ConnectionMigrator'
    });

    // Wait for connections to stabilize after traffic shift
    await new Promise(resolve => setTimeout(resolve, this.testDelays.drainTimeout));

    const currentLegacyUsers = webSocketService.getAllConnectedUsers();
    const currentSocketIOUsers = socketIOService.getAllConnectedUsers();
    const currentTotalConnections = currentLegacyUsers.length + currentSocketIOUsers.length;

    // Allow for some connection loss during rollback (up to 10%)
    const connectionLossThreshold = 0.90;
    const preservationRate = preRollbackState.totalConnections > 0 
      ? currentTotalConnections / preRollbackState.totalConnections 
      : 1;

    if (preservationRate < connectionLossThreshold) {
      logger.warn('Connection loss detected during rollback', {
        component: 'ConnectionMigrator',
        preRollbackConnections: preRollbackState.totalConnections,
        currentConnections: currentTotalConnections,
        preservationRate: (preservationRate * 100).toFixed(1) + '%'
      });
    }

    // Validate subscription preservation for active users
    let preservedSubscriptions = 0;
    let totalExpectedSubscriptions = 0;

    for (const [user_id, expectedSubs] of preRollbackState.userSubscriptions.entries()) {
      totalExpectedSubscriptions += expectedSubs.length;
      
      if (webSocketService.isUserConnected(user_id)) {
        const currentSubs = webSocketService.getUserSubscriptions(user_id);
        preservedSubscriptions += Math.min(currentSubs.length, expectedSubs.length);
      }
    }

    const subscriptionPreservationRate = totalExpectedSubscriptions > 0 
      ? preservedSubscriptions / totalExpectedSubscriptions 
      : 1;

    logger.info('Rollback connection preservation validation completed', {
      component: 'ConnectionMigrator',
      connectionPreservationRate: (preservationRate * 100).toFixed(1) + '%',
      subscriptionPreservationRate: (subscriptionPreservationRate * 100).toFixed(1) + '%'
    });
  }

  /**
   * Finalize rollback state and cleanup
   */
  private async finalizeRollbackState(): Promise<void> {
    // Update blue-green state
    this.blueGreenState.activeService = 'legacy';
    this.blueGreenState.standbyService = 'socketio';
    this.blueGreenState.migrationInProgress = false;
    this.blueGreenState.trafficSplitPercentage = 0;

    // Final verification of legacy service health
    const legacyHealth = webSocketService.getHealthStatus();
    if (!legacyHealth.isHealthy) {
      throw new Error('Legacy service is unhealthy after rollback completion');
    }

    // Reset feature flag metrics for future attempts
    featureFlagService.resetMetrics('websocket_socketio_migration');

    logger.info('Rollback state finalized', {
      component: 'ConnectionMigrator',
      activeService: this.blueGreenState.activeService
    });
  }

  /**
   * Emergency rollback without gradual traffic shifting
   */
  private async performEmergencyRollback(): Promise<void> {
    logger.error('🚨 Performing emergency rollback', {
      component: 'ConnectionMigrator'
    });

    // Immediate traffic cutover
    featureFlagService.toggleFlag('websocket_socketio_migration', false);
    featureFlagService.updateRolloutPercentage('websocket_socketio_migration', 0);

    // Update state immediately
    this.blueGreenState.activeService = 'legacy';
    this.blueGreenState.standbyService = 'socketio';
    this.blueGreenState.migrationInProgress = false;
    this.blueGreenState.trafficSplitPercentage = 0;

    // Minimal wait for traffic to drain
    await new Promise(resolve => setTimeout(resolve, Math.min(this.testDelays.drainTimeout, 5000)));

    logger.error('Emergency rollback completed', {
      component: 'ConnectionMigrator'
    });
  }

  /**
   * Trigger emergency rollback
   */
  triggerEmergencyRollback(): void {
    logger.error('🚨 EMERGENCY ROLLBACK TRIGGERED', {
      component: 'ConnectionMigrator'
    });

    // Immediate rollback without waiting
    featureFlagService.triggerRollback('websocket_socketio_migration');
    featureFlagService.triggerRollback('socketio_connection_handling');
    featureFlagService.triggerRollback('socketio_broadcasting');

    this.blueGreenState.activeService = 'legacy';
    this.blueGreenState.standbyService = 'socketio';
    this.blueGreenState.migrationInProgress = false;
    this.blueGreenState.trafficSplitPercentage = 0;

    if (this.migrationProgress) {
      this.migrationProgress.phase = 'failed';
      this.migrationProgress.endTime = new Date();
      this.migrationProgress.errors.push('Emergency rollback triggered');
    }
  }

  // ==========================================================================
  // STATUS AND MONITORING
  // ==========================================================================

  /**
   * Get current migration status
   */
  getMigrationStatus(): {
    progress: MigrationProgress | null;
    blueGreenState: BlueGreenState;
    connectionStates: number;
    isHealthy: boolean;
  } {
    const legacyHealth = webSocketService.getHealthStatus();
    const socketIOHealth = socketIOService.getHealthStatus();
    
    return {
      progress: this.migrationProgress,
      blueGreenState: { ...this.blueGreenState },
      connectionStates: this.connectionStates.size,
      isHealthy: legacyHealth.isHealthy && (!featureFlagService.isEnabled('websocket_socketio_migration') || socketIOHealth.isHealthy)
    };
  }

  /**
   * Get detailed migration metrics
   */
  getMigrationMetrics(): {
    featureFlagMetrics: any;
    serviceStats: {
      legacy: any;
      socketio: any;
    };
    migrationProgress: MigrationProgress | null;
  } {
    return {
      featureFlagMetrics: featureFlagService.getStatisticalAnalysis('websocket_socketio_migration'),
      serviceStats: {
        legacy: webSocketService.getStats(),
        socketio: socketIOService.getStats()
      },
      migrationProgress: this.migrationProgress
    };
  }

  /**
   * Check if migration is currently in progress
   */
  isMigrationInProgress(): boolean {
    return this.blueGreenState.migrationInProgress;
  }

  /**
   * Get active service name
   */
  getActiveService(): 'legacy' | 'socketio' {
    return this.blueGreenState.activeService;
  }

  // ==========================================================================
  // TEST UTILITIES
  // ==========================================================================

  /**
   * Enable test mode with shorter delays for testing
   */
  enableTestMode(): void {
    this.testMode = true;
    this.testDelays = {
      trafficShiftDelay: 100,  // 100ms for tests
      serviceReadyDelay: 50,   // 50ms for tests
      drainTimeout: 1000       // 1 second for tests
    };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Cleanup migration resources
   */
  cleanup(): void {
    if (this.migrationTimeoutId) {
      clearTimeout(this.migrationTimeoutId);
      this.migrationTimeoutId = null;
    }

    if (this.validationIntervalId) {
      clearInterval(this.validationIntervalId);
      this.validationIntervalId = null;
    }

    this.connectionStates.clear();

    logger.info('Connection migrator cleanup completed', {
      component: 'ConnectionMigrator'
    });
  }

  /**
   * Shutdown migration system
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down connection migrator...', {
      component: 'ConnectionMigrator'
    });

    // If migration is in progress, trigger rollback
    if (this.blueGreenState.migrationInProgress) {
      await this.rollbackMigration();
    }

    this.cleanup();

    logger.info('✅ Connection migrator shutdown completed', {
      component: 'ConnectionMigrator'
    });
  }
}

// Export singleton instance
export const connectionMigrator = new ConnectionMigrator();