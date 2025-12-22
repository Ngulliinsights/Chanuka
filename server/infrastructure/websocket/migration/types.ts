/**
 * Migration System Type Definitions
 */

export interface ConnectionState {
  user_id: string;
  connectionId: string;
  subscriptions: number[];
  preferences?: Record<string, unknown>;
  lastActivity: Date;
  connectionTime: Date;
  metadata?: Record<string, unknown>;
}

export interface MigrationProgress {
  phase: 'preparing' | 'migrating' | 'validating' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  totalConnections: number;
  migratedConnections: number;
  failedMigrations: number;
  preservedSubscriptions: number;
  errors: string[];
  checkpoints: MigrationCheckpoint[];
}

export interface MigrationCheckpoint {
  timestamp: Date;
  phase: string;
  trafficPercentage: number;
  healthMetrics: HealthMetrics;
}

export interface HealthMetrics {
  errorRate: number;
  responseTime: number;
  connectionCount: number;
  subscriptionCount: number;
  messageDropRate: number;
}

export interface BlueGreenState {
  activeService: 'legacy' | 'socketio';
  standbyService: 'legacy' | 'socketio';
  migrationInProgress: boolean;
  trafficSplitPercentage: number;
}

export interface MigrationConfig {
  trafficShiftDelay: number;
  serviceReadyDelay: number;
  drainTimeout: number;
  validationInterval: number;
  migrationTimeout: number;
  maxRetryAttempts: number;
}