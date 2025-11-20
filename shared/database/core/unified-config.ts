/**
 * Unified Database Configuration System
 * 
 * This module provides a centralized configuration system that unifies
 * database settings across shared infrastructure, server services, and
 * operational scripts.
 */

import { PoolConfig } from 'pg';

// ============================================================================
// Core Configuration Types
// ============================================================================

export interface ConnectionConfig extends PoolConfig {
  // Basic connection settings
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;

  // Pool configuration
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  acquireTimeoutMillis?: number;

  // Advanced settings
  ssl?: boolean | object;
  statementTimeout?: number;
  queryTimeout?: number;

  // Read replica support
  readReplicaUrls?: string[];
  readWriteRatio?: number;

  // Multi-database architecture
  operationalDbUrl?: string;
  analyticsDbUrl?: string;
  securityDbUrl?: string;
}

export interface FeatureConfig {
  readReplicas: boolean;
  circuitBreaker: boolean;
  healthMonitoring: boolean;
  performanceTracking: boolean;
  backupRecovery: boolean;
  migrationValidation: boolean;
  securityAuditing: boolean;
}

export interface MigrationConfig {
  migrationsPath: string;
  tableName: string;
  schemaName?: string;
  validateChecksums: boolean;
  allowOutOfOrder: boolean;
  createSchemaIfNotExists: boolean;
  maxRetries: number;
  retryDelay: number;
  backupBeforeMigration: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  checkInterval: number;
  alertThresholds: {
    connectionUtilization: number;
    queryLatency: number;
    errorRate: number;
    diskUsage: number;
  };
  retentionPeriod: number;
  enableMetrics: boolean;
  enableAlerting: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  encryptionKey?: string;
  remoteStorage?: {
    type: 'aws-s3' | 'gcp-storage' | 'azure-blob';
    bucket: string;
    region: string;
    credentials: any;
  };
}

export interface SecurityConfig {
  auditLogging: boolean;
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  accessLogging: boolean;
  sensitiveDataMasking: boolean;
  complianceMode: 'gdpr' | 'ccpa' | 'kenya-dpa' | 'none';
}

export interface EnvironmentConfig {
  connection: ConnectionConfig;
  features: Partial<FeatureConfig>;
  monitoring: Partial<MonitoringConfig>;
  backup: Partial<BackupConfig>;
  security: Partial<SecurityConfig>;
}

export interface DatabaseConfig {
  // Environment-specific configurations
  environments: {
    development: EnvironmentConfig;
    test: EnvironmentConfig;
    staging: EnvironmentConfig;
    production: EnvironmentConfig;
  };

  // Global feature flags
  features: FeatureConfig;

  // Operational configurations
  operations: {
    migration: MigrationConfig;
    monitoring: MonitoringConfig;
    backup: BackupConfig;
    security: SecurityConfig;
  };

  // Script-specific settings
  scripts: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    confirmationRequired: boolean;
    dryRunDefault: boolean;
    timeoutMs: number;
  };
}

// ============================================================================
// Configuration Manager
// ============================================================================

export class DatabaseConfigManager {
  private static instance: DatabaseConfigManager;
  private config: DatabaseConfig | null = null;
  private currentEnvironment: string = 'development';

  public constructor() { }

  static getInstance(): DatabaseConfigManager {
    if (!DatabaseConfigManager.instance) {
      DatabaseConfigManager.instance = new DatabaseConfigManager();
    }
    return DatabaseConfigManager.instance;
  }

  /**
   * Initialize the configuration manager with a complete config
   */
  initialize(config: DatabaseConfig, environment?: string): void {
    this.config = config;
    if (environment) {
      this.currentEnvironment = environment;
    }
  }

  /**
   * Load configuration from environment variables and defaults
   */
  loadFromEnvironment(): void {
    const environment = process.env.NODE_ENV || 'development';
    this.currentEnvironment = environment;

    this.config = this.createDefaultConfig();
    this.applyEnvironmentOverrides();
  }

  /**
   * Get the current environment configuration
   */
  getCurrentEnvironmentConfig(): EnvironmentConfig {
    if (!this.config) {
      throw new Error('DatabaseConfigManager not initialized');
    }

    const envConfig = this.config.environments[this.currentEnvironment as keyof typeof this.config.environments];
    if (!envConfig) {
      throw new Error(`No configuration found for environment: ${this.currentEnvironment}`);
    }

    return envConfig;
  }

  /**
   * Get connection configuration for current environment
   */
  getConnectionConfig(): ConnectionConfig {
    return this.getCurrentEnvironmentConfig().connection;
  }

  /**
   * Get migration configuration
   */
  getMigrationConfig(): MigrationConfig {
    if (!this.config) {
      throw new Error('DatabaseConfigManager not initialized');
    }
    return this.config.operations.migration;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig(): MonitoringConfig {
    if (!this.config) {
      throw new Error('DatabaseConfigManager not initialized');
    }

    const globalConfig = this.config.operations.monitoring;
    const envConfig = this.getCurrentEnvironmentConfig().monitoring || {};

    return { ...globalConfig, ...envConfig };
  }

  /**
   * Get backup configuration
   */
  getBackupConfig(): BackupConfig {
    if (!this.config) {
      throw new Error('DatabaseConfigManager not initialized');
    }

    const globalConfig = this.config.operations.backup;
    const envConfig = this.getCurrentEnvironmentConfig().backup || {};

    return { ...globalConfig, ...envConfig };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    if (!this.config) {
      throw new Error('DatabaseConfigManager not initialized');
    }

    const globalConfig = this.config.operations.security;
    const envConfig = this.getCurrentEnvironmentConfig().security || {};

    return { ...globalConfig, ...envConfig };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureConfig): boolean {
    if (!this.config) {
      throw new Error('DatabaseConfigManager not initialized');
    }

    const globalFeatures = this.config.features;
    const envFeatures = this.getCurrentEnvironmentConfig().features || {};

    return envFeatures[feature] ?? globalFeatures[feature];
  }

  /**
   * Get script configuration
   */
  getScriptConfig() {
    if (!this.config) {
      throw new Error('DatabaseConfigManager not initialized');
    }
    return this.config.scripts;
  }

  /**
   * Get current environment name
   */
  getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): DatabaseConfig {
    const defaultConnection: ConnectionConfig = {
      host: 'localhost',
      port: 5432,
      database: 'chanuka_dev',
      user: 'postgres',
      password: 'password',
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      acquireTimeoutMillis: 60000,
      ssl: false,
      statementTimeout: 30000,
      queryTimeout: 30000,
    };

    const defaultFeatures: FeatureConfig = {
      readReplicas: false,
      circuitBreaker: true,
      healthMonitoring: true,
      performanceTracking: true,
      backupRecovery: false,
      migrationValidation: true,
      securityAuditing: false,
    };

    const defaultMigration: MigrationConfig = {
      migrationsPath: 'drizzle',
      tableName: 'drizzle_migrations',
      validateChecksums: true,
      allowOutOfOrder: false,
      createSchemaIfNotExists: true,
      maxRetries: 3,
      retryDelay: 1000,
      backupBeforeMigration: false,
    };

    const defaultMonitoring: MonitoringConfig = {
      enabled: true,
      checkInterval: 30000,
      alertThresholds: {
        connectionUtilization: 0.8,
        queryLatency: 1000,
        errorRate: 0.05,
        diskUsage: 0.85,
      },
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableMetrics: true,
      enableAlerting: true,
    };

    const defaultBackup: BackupConfig = {
      enabled: false,
      schedule: '0 2 * * *', // Daily at 2 AM
      retentionDays: 30,
      compressionEnabled: true,
      encryptionEnabled: false,
    };

    const defaultSecurity: SecurityConfig = {
      auditLogging: false,
      encryptionAtRest: false,
      encryptionInTransit: true,
      accessLogging: true,
      sensitiveDataMasking: false,
      complianceMode: 'none',
    };

    return {
      environments: {
        development: {
          connection: { ...defaultConnection },
          features: { ...defaultFeatures },
          monitoring: { enabled: false },
          backup: { enabled: false },
          security: { ...defaultSecurity, auditLogging: false },
        },
        test: {
          connection: {
            ...defaultConnection,
            database: 'chanuka_test',
            max: 5,
          },
          features: {
            ...defaultFeatures,
            healthMonitoring: false,
            performanceTracking: false,
          },
          monitoring: { enabled: false },
          backup: { enabled: false },
          security: { ...defaultSecurity },
        },
        staging: {
          connection: {
            ...defaultConnection,
            database: 'chanuka_staging',
            ssl: true,
          },
          features: { ...defaultFeatures, readReplicas: true },
          monitoring: { enabled: true },
          backup: { enabled: true },
          security: {
            ...defaultSecurity,
            auditLogging: true,
            encryptionAtRest: true,
          },
        },
        production: {
          connection: {
            ...defaultConnection,
            database: 'chanuka_production',
            ssl: true,
            max: 20,
          },
          features: {
            ...defaultFeatures,
            readReplicas: true,
            backupRecovery: true,
            securityAuditing: true,
          },
          monitoring: { enabled: true },
          backup: { enabled: true },
          security: {
            ...defaultSecurity,
            auditLogging: true,
            encryptionAtRest: true,
            encryptionInTransit: true,
            sensitiveDataMasking: true,
            complianceMode: 'kenya-dpa',
          },
        },
      },
      features: defaultFeatures,
      operations: {
        migration: defaultMigration,
        monitoring: defaultMonitoring,
        backup: defaultBackup,
        security: defaultSecurity,
      },
      scripts: {
        logLevel: 'info',
        confirmationRequired: true,
        dryRunDefault: false,
        timeoutMs: 300000, // 5 minutes
      },
    };
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(): void {
    if (!this.config) return;

    const env = process.env;
    const currentEnvConfig = this.getCurrentEnvironmentConfig();

    // Override connection settings from environment
    if (env.DATABASE_URL) {
      const url = new URL(env.DATABASE_URL);
      currentEnvConfig.connection.host = url.hostname;
      currentEnvConfig.connection.port = parseInt(url.port) || 5432;
      currentEnvConfig.connection.database = url.pathname.slice(1);
      currentEnvConfig.connection.user = url.username;
      currentEnvConfig.connection.password = url.password;
    }

    // Override individual connection settings
    if (env.DB_HOST) currentEnvConfig.connection.host = env.DB_HOST;
    if (env.DB_PORT) currentEnvConfig.connection.port = parseInt(env.DB_PORT);
    if (env.DB_NAME) currentEnvConfig.connection.database = env.DB_NAME;
    if (env.DB_USER) currentEnvConfig.connection.user = env.DB_USER;
    if (env.DB_PASSWORD) currentEnvConfig.connection.password = env.DB_PASSWORD;

    // Override pool settings
    if (env.DB_POOL_MIN) currentEnvConfig.connection.min = parseInt(env.DB_POOL_MIN);
    if (env.DB_POOL_MAX) currentEnvConfig.connection.max = parseInt(env.DB_POOL_MAX);

    // Override feature flags
    if (env.DB_READ_REPLICAS === 'true') {
      currentEnvConfig.features = currentEnvConfig.features || {};
      currentEnvConfig.features.readReplicas = true;
    }

    // Override monitoring settings
    if (env.DB_MONITORING === 'false') {
      currentEnvConfig.monitoring = currentEnvConfig.monitoring || {};
      currentEnvConfig.monitoring.enabled = false;
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Initialize database configuration from environment
 */
export function initializeDatabaseConfig(environment?: string): void {
  const configManager = DatabaseConfigManager.getInstance();
  configManager.loadFromEnvironment();
  if (environment) {
    configManager.initialize(configManager['config']!, environment);
  }
}

/**
 * Get the database configuration manager instance
 */
export function getDatabaseConfig(): DatabaseConfigManager {
  return DatabaseConfigManager.getInstance();
}

/**
 * Create a database configuration for testing
 */
export function createTestDatabaseConfig(): DatabaseConfig {
  const configManager = new DatabaseConfigManager();
  return configManager['createDefaultConfig']();
}

