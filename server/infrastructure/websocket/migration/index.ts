/**
 * Migration System Module Exports
 * 
 * Provides connection migration and blue-green deployment capabilities
 */

export { ConnectionMigrator } from './connection-migrator';
export { StateManager } from './state-manager';
export { TrafficController } from './traffic-controller';
export { HealthValidator } from './health-validator';

export type {
  ConnectionState,
  MigrationProgress,
  MigrationCheckpoint,
  HealthMetrics,
  BlueGreenState,
  MigrationConfig
} from './types';