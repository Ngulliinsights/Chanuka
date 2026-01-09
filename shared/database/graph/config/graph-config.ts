/**
 * Graph Database Configuration
 *
 * Centralized configuration for Neo4j database connections and graph operations.
 * Handles environment setup, connection pooling, and feature toggles.
 *
 * @module config/graph-config
 */

import { AuthToken, Config } from 'neo4j-driver';

// ============================================================================
// ENVIRONMENT CONSTANTS
// ============================================================================

export const NEO4J_CONFIG = {
  URI: process.env.NEO4J_URI || 'neo4j://localhost:7687',
  USER: process.env.NEO4J_USER || 'neo4j',
  PASSWORD: process.env.NEO4J_PASSWORD || 'password',
  MAX_CONNECTION_POOL_SIZE: parseInt(process.env.NEO4J_MAX_POOL || '100'),
  CONNECTION_TIMEOUT_MS: parseInt(process.env.NEO4J_TIMEOUT || '5000'),
  MAX_CONNECTION_LIFETIME_MS: parseInt(process.env.NEO4J_LIFETIME || '3600000'),
};

export const SYNC_CONFIG = {
  INTERVAL_MS: parseInt(process.env.SYNC_INTERVAL || '60000'),
  BATCH_SIZE: parseInt(process.env.SYNC_BATCH_SIZE || '1000'),
  TIMEOUT_MS: parseInt(process.env.SYNC_TIMEOUT || '30000'),
  ENABLE_AUTO_SYNC: process.env.ENABLE_AUTO_SYNC !== 'false',
  DEFAULT_LIMIT: 100,
};

export const QUERY_CONFIG = {
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 10000,
  DEFAULT_SKIP: 0,
};

export const CACHE_CONFIG = {
  DEFAULT_TTL: 3600, // 1 hour in seconds
  MAX_SIZE: 10000,
};

export const ENGAGEMENT_CONFIG = {
  // Configuration for engagement operations
};

export function validateConfig(): void {
  if (!NEO4J_CONFIG.URI) {
    throw new Error('NEO4J_URI environment variable is required');
  }
  if (!NEO4J_CONFIG.USER) {
    throw new Error('NEO4J_USER environment variable is required');
  }
  if (!NEO4J_CONFIG.PASSWORD) {
    throw new Error('NEO4J_PASSWORD environment variable is required');
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface Neo4jConnectionConfig {
  uri: string;
  auth: AuthToken;
  config?: Config;
}

export interface GraphFeatureFlags {
  enableCaching: boolean;
  enableValidation: boolean;
  enableMetrics: boolean;
  enableRetry: boolean;
  enableBatching: boolean;
}

export interface GraphEnvironment {
  environment: 'development' | 'staging' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'none';
  features: GraphFeatureFlags;
  connectionPool: {
    min: number;
    max: number;
    maxLifetimeSeconds?: number;
    maxIdleTimeSeconds?: number;
  };
  queryDefaults: {
    timeout?: number;
    maxRetries: number;
    retryDelayMs: number;
  };
}

// ============================================================================
// CONFIGURATION DEFAULTS
// ============================================================================

const DEVELOPMENT_CONFIG: GraphEnvironment = {
  environment: 'development',
  logLevel: 'debug',
  features: {
    enableCaching: false,
    enableValidation: true,
    enableMetrics: false,
    enableRetry: true,
    enableBatching: true,
  },
  connectionPool: {
    min: 5,
    max: 15,
  },
  queryDefaults: {
    timeout: 30000,
    maxRetries: 3,
    retryDelayMs: 100,
  },
};

const STAGING_CONFIG: GraphEnvironment = {
  environment: 'staging',
  logLevel: 'info',
  features: {
    enableCaching: true,
    enableValidation: true,
    enableMetrics: true,
    enableRetry: true,
    enableBatching: true,
  },
  connectionPool: {
    min: 10,
    max: 50,
    maxLifetimeSeconds: 3600,
    maxIdleTimeSeconds: 300,
  },
  queryDefaults: {
    timeout: 60000,
    maxRetries: 5,
    retryDelayMs: 200,
  },
};

const PRODUCTION_CONFIG: GraphEnvironment = {
  environment: 'production',
  logLevel: 'warn',
  features: {
    enableCaching: true,
    enableValidation: true,
    enableMetrics: true,
    enableRetry: true,
    enableBatching: true,
  },
  connectionPool: {
    min: 20,
    max: 100,
    maxLifetimeSeconds: 7200,
    maxIdleTimeSeconds: 600,
  },
  queryDefaults: {
    timeout: 120000,
    maxRetries: 5,
    retryDelayMs: 500,
  },
};

const TEST_CONFIG: GraphEnvironment = {
  environment: 'test',
  logLevel: 'error',
  features: {
    enableCaching: false,
    enableValidation: true,
    enableMetrics: false,
    enableRetry: false,
    enableBatching: false,
  },
  connectionPool: {
    min: 1,
    max: 5,
  },
  queryDefaults: {
    timeout: 10000,
    maxRetries: 1,
    retryDelayMs: 50,
  },
};

// ============================================================================
// CONFIGURATION MANAGER
// ============================================================================

/**
 * Manages graph database configuration and feature flags.
 *
 * Provides centralized access to all graph-related settings,
 * ensuring consistency across the application.
 */
export class GraphConfigManager {
  private environment: GraphEnvironment;
  private connectionConfig: Neo4jConnectionConfig | null = null;

  /**
   * Create a new GraphConfigManager.
   *
   * @param env - Environment name (defaults to process.env.NODE_ENV)
   */
  constructor(env?: string) {
    const nodeEnv = env || process.env.NODE_ENV || 'development';
    this.environment = this.loadConfig(nodeEnv);
  }

  /**
   * Load configuration based on environment.
   *
   * @param env - Environment name
   * @returns Configuration object
   */
  private loadConfig(env: string): GraphEnvironment {
    switch (env) {
      case 'staging':
        return JSON.parse(JSON.stringify(STAGING_CONFIG));
      case 'production':
        return JSON.parse(JSON.stringify(PRODUCTION_CONFIG));
      case 'test':
        return JSON.parse(JSON.stringify(TEST_CONFIG));
      case 'development':
      default:
        return JSON.parse(JSON.stringify(DEVELOPMENT_CONFIG));
    }
  }

  /**
   * Get the current environment configuration.
   *
   * @returns Environment configuration object
   */
  getEnvironment(): GraphEnvironment {
    return this.environment;
  }

  /**
   * Get the current environment name.
   *
   * @returns Environment name
   */
  getEnvironmentName(): string {
    return this.environment.environment;
  }

  /**
   * Get the current log level.
   *
   * @returns Log level
   */
  getLogLevel(): string {
    return this.environment.logLevel;
  }

  /**
   * Get feature flags.
   *
   * @returns Feature flags object
   */
  getFeatures(): GraphFeatureFlags {
    return this.environment.features;
  }

  /**
   * Check if a specific feature is enabled.
   *
   * @param feature - Feature name
   * @returns True if enabled
   */
  isFeatureEnabled(feature: keyof GraphFeatureFlags): boolean {
    return this.environment.features[feature];
  }

  /**
   * Get connection pool configuration.
   *
   * @returns Connection pool settings
   */
  getConnectionPool(): GraphEnvironment['connectionPool'] {
    return this.environment.connectionPool;
  }

  /**
   * Get query defaults.
   *
   * @returns Query default settings
   */
  getQueryDefaults(): GraphEnvironment['queryDefaults'] {
    return this.environment.queryDefaults;
  }

  /**
   * Set Neo4j connection configuration.
   *
   * @param config - Connection configuration
   */
  setConnectionConfig(config: Neo4jConnectionConfig): void {
    this.connectionConfig = config;
  }

  /**
   * Get Neo4j connection configuration.
   *
   * @returns Connection configuration or null
   */
  getConnectionConfig(): Neo4jConnectionConfig | null {
    return this.connectionConfig;
  }

  /**
   * Override a feature flag.
   *
   * @param feature - Feature name
   * @param enabled - Enable or disable
   */
  setFeatureEnabled(feature: keyof GraphFeatureFlags, enabled: boolean): void {
    this.environment.features[feature] = enabled;
  }

  /**
   * Override the log level.
   *
   * @param level - New log level
   */
  setLogLevel(level: GraphEnvironment['logLevel']): void {
    this.environment.logLevel = level;
  }

  /**
   * Get the full configuration as a plain object.
   *
   * @returns Configuration object
   */
  getFullConfig(): GraphEnvironment {
    return JSON.parse(JSON.stringify(this.environment));
  }

  /**
   * Check if running in production.
   *
   * @returns True if production environment
   */
  isProduction(): boolean {
    return this.environment.environment === 'production';
  }

  /**
   * Check if running in development.
   *
   * @returns True if development environment
   */
  isDevelopment(): boolean {
    return this.environment.environment === 'development';
  }

  /**
   * Check if running in test.
   *
   * @returns True if test environment
   */
  isTest(): boolean {
    return this.environment.environment === 'test';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global configuration manager instance.
 * Used as the default configuration manager for the graph module.
 */
let globalConfigManager: GraphConfigManager | null = null;

/**
 * Get or create the global configuration manager.
 *
 * @returns Global GraphConfigManager instance
 */
export function getGraphConfig(): GraphConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new GraphConfigManager();
  }
  return globalConfigManager;
}

/**
 * Initialize the global configuration manager with a specific environment.
 *
 * @param env - Environment name
 * @returns Configured GraphConfigManager instance
 */
export function initializeGraphConfig(env?: string): GraphConfigManager {
  globalConfigManager = new GraphConfigManager(env);
  return globalConfigManager;
}

/**
 * Reset the global configuration manager.
 * Useful for testing.
 */
export function resetGraphConfig(): void {
  globalConfigManager = null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a Neo4j driver configuration object.
 *
 * @param baseConfig - Base configuration
 * @returns Complete driver configuration
 */
export function createDriverConfig(baseConfig: Partial<Config> = {}): Config {
  const config = getGraphConfig();
  const pool = config.getConnectionPool();

  return {
    maxConnectionPoolSize: pool.max,
    minConnectionPoolSize: pool.min,
    maxConnectionLifetimeSeconds: pool.maxLifetimeSeconds,
    maxConnectionIdleTimeSeconds: pool.maxIdleTimeSeconds,
    connectionAcquisitionTimeoutMs: 60000,
    ...baseConfig,
  };
}

/**
 * Validate a connection URI format.
 *
 * @param uri - Connection URI
 * @returns True if valid
 */
export function validateConnectionUri(uri: string): boolean {
  try {
    // Check for neo4j://, neo4j+s://, or neo4j+ssc:// schemes
    const urlRegex = /^neo4j(\+[a-z]+)?:\/\/.*$/i;
    return urlRegex.test(uri);
  } catch {
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  GraphConfigManager,
  getGraphConfig,
  initializeGraphConfig,
  resetGraphConfig,
  createDriverConfig,
  validateConnectionUri,
};
