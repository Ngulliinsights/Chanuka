/**
 * Configuration Type Definitions
 * 
 * Type definitions for configuration management system
 */

import type { AppConfig } from './schema';

// Re-export the main config type
export type { AppConfig };

// Configuration loading options
export interface ConfigLoadOptions {
  envFilePath?: string;
  enableHotReload?: boolean;
  validateDependencies?: boolean;
  failFast?: boolean;
}

// Configuration change event data
export interface ConfigChangeEvent {
  previous: AppConfig;
  current: AppConfig;
  changes: ConfigChange[];
  timestamp: Date;
}

// Individual configuration change
export interface ConfigChange {
  path: string;
  previousValue: any;
  currentValue: any;
  type: 'added' | 'modified' | 'removed';
}

// Feature flag evaluation context
export interface FeatureFlagContext { user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  customAttributes?: Record<string, unknown>;
 }

// Feature flag result
export interface FeatureFlagResult {
  enabled: boolean;
  reason: 'enabled' | 'disabled' | 'rollout' | 'user_targeting' | 'not_found';
  rolloutPercentage?: number;
  metadata?: Record<string, unknown>;
}

// Configuration validation result
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

// Configuration validation error
export interface ConfigValidationError {
  path: string;
  message: string;
  code: string;
  received?: any;
  expected?: any;
}

// Configuration validation warning
export interface ConfigValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// Runtime dependency validation result
export interface DependencyValidationResult {
  dependency: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  details?: Record<string, unknown>;
  latency?: number;
}

// Configuration manager events
export interface ConfigManagerEvents {
  'config:loaded': (config: AppConfig) => void;
  'config:changed': (event: ConfigChangeEvent) => void;
  'config:error': (error: Error) => void;
  'config:validated': (result: ConfigValidationResult) => void;
  'dependency:validated': (result: DependencyValidationResult) => void;
  'feature:evaluated': (flag: string, result: FeatureFlagResult, context?: FeatureFlagContext) => void;
}

// Environment file priority
export type EnvFilePriority = '.env' | '.env.local' | '.env.development' | '.env.staging' | '.env.production' | '.env.test';

// Configuration source metadata
export interface ConfigSource {
  type: 'env_file' | 'environment_variable' | 'default' | 'override';
  source: string;
  priority: number;
  timestamp: Date;
}

// Configuration value with metadata
export interface ConfigValue<T = any> {
  value: T;
  source: ConfigSource;
  validated: boolean;
  lastModified: Date;
}

// Configuration manager state
export interface ConfigManagerState {
  loaded: boolean;
  valid: boolean;
  lastLoaded: Date | null;
  lastValidated: Date | null;
  watchingFiles: string[];
  dependencyStatus: Record<string, DependencyValidationResult>;
}

// Hot reload configuration
export interface HotReloadConfig {
  enabled: boolean;
  debounceMs: number;
  watchPaths: string[];
  excludePatterns: string[];
}

// Configuration migration options
export interface ConfigMigrationOptions {
  fromVersion: string;
  toVersion: string;
  backupConfig: boolean;
  dryRun: boolean;
  transformations: ConfigTransformation[];
}

// Configuration transformation
export interface ConfigTransformation {
  path: string;
  operation: 'rename' | 'move' | 'transform' | 'remove';
  target?: string;
  transformer?: (value: unknown) => any;
  condition?: (config: AppConfig) => boolean;
}















































