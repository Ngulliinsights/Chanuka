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
  URI: process.env.NEO4J_URI ?? 'neo4j://localhost:7687',
  USER: process.env.NEO4J_USER ?? 'neo4j',
  PASSWORD: (() => {
    if (process.env.NEO4J_PASSWORD) return process.env.NEO4J_PASSWORD;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEO4J_PASSWORD must be set in production');
    }
    return 'neo4j'; // Development only
  })(),
  MAX_CONNECTION_POOL_SIZE: parseInt(process.env.NEO4J_MAX_POOL ?? '100'),
  CONNECTION_TIMEOUT_MS: parseInt(process.env.NEO4J_TIMEOUT ?? '5000'),
  MAX_CONNECTION_LIFETIME_MS: parseInt(process.env.NEO4J_LIFETIME ?? '3600000'),
};

export const SYNC_CONFIG = {
  INTERVAL_MS: parseInt(process.env.SYNC_INTERVAL ?? '60000'),
  BATCH_SIZE: parseInt(process.env.SYNC_BATCH_SIZE ?? '1000'),
  TIMEOUT_MS: parseInt(process.env.SYNC_TIMEOUT ?? '30000'),
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
  VOTE_POINTS: 10,
  COMMENT_POINTS: 5,
  BOOKMARK_POINTS: 3,
  FOLLOW_POINTS: 7,
};

export const PERFORMANCE_CONFIG = {
  QUERY_TIMEOUT_MS: 30000,
  BATCH_SIZE: 500,
  MAX_CONCURRENT_OPERATIONS: 10,
};

export const MONITORING_CONFIG = {
  HEALTH_CHECK_INTERVAL_MS: 60000,
  METRICS_FLUSH_INTERVAL_MS: 30000,
  SLOW_QUERY_THRESHOLD_MS: 1000,
};

export const SECURITY_CONFIG = {
  ENABLE_QUERY_VALIDATION: true,
  MAX_QUERY_LENGTH: 10000,
  BLOCKED_OPERATIONS: ['DROP', 'DELETE DATABASE'],
};

export const FEATURE_FLAGS = {
  ENABLE_GRAPH_SYNC: true,
  ENABLE_GRAPH_ANALYTICS: true,
  ENABLE_GRAPH_RECOMMENDATIONS: true,
  ENABLE_GRAPH_CACHING: false,
};

export const CONSISTENCY_CONFIG = {
  STALE_DATA_THRESHOLD_MS: 24 * 60 * 60 * 1000,
  CONSISTENCY_CHECK_INTERVAL_MS: 300000,
  MAX_RETRY_COUNT: 3,
};

export const RECOMMENDATION_CONFIG = {
  MAX_RECOMMENDATIONS: 20,
  MIN_RELEVANCE_SCORE: 0.3,
  REFRESH_INTERVAL_MS: 3600000,
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

export function getConfigSummary(): Record<string, unknown> {
  return {
    neo4j: {
      uri: NEO4J_CONFIG.URI,
      maxPoolSize: NEO4J_CONFIG.MAX_CONNECTION_POOL_SIZE,
    },
    sync: {
      intervalMs: SYNC_CONFIG.INTERVAL_MS,
      batchSize: SYNC_CONFIG.BATCH_SIZE,
      autoSync: SYNC_CONFIG.ENABLE_AUTO_SYNC,
    },
    features: FEATURE_FLAGS,
  };
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

export class GraphConfigManager {
  private environment: GraphEnvironment;
  private connectionConfig: Neo4jConnectionConfig | null = null;

  constructor(env?: string) {
    const nodeEnv = env ?? process.env.NODE_ENV ?? 'development';
    this.environment = this.loadConfig(nodeEnv);
  }

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

  getEnvironment(): GraphEnvironment {
    return this.environment;
  }

  getEnvironmentName(): string {
    return this.environment.environment;
  }

  getLogLevel(): string {
    return this.environment.logLevel;
  }

  getFeatures(): GraphFeatureFlags {
    return this.environment.features;
  }

  isFeatureEnabled(feature: keyof GraphFeatureFlags): boolean {
    return this.environment.features[feature];
  }

  getConnectionPool(): GraphEnvironment['connectionPool'] {
    return this.environment.connectionPool;
  }

  getQueryDefaults(): GraphEnvironment['queryDefaults'] {
    return this.environment.queryDefaults;
  }

  setConnectionConfig(config: Neo4jConnectionConfig): void {
    this.connectionConfig = config;
  }

  getConnectionConfig(): Neo4jConnectionConfig | null {
    return this.connectionConfig;
  }

  setFeatureEnabled(feature: keyof GraphFeatureFlags, enabled: boolean): void {
    this.environment.features[feature] = enabled;
  }

  setLogLevel(level: GraphEnvironment['logLevel']): void {
    this.environment.logLevel = level;
  }

  getFullConfig(): GraphEnvironment {
    return JSON.parse(JSON.stringify(this.environment));
  }

  isProduction(): boolean {
    return this.environment.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.environment.environment === 'development';
  }

  isTest(): boolean {
    return this.environment.environment === 'test';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalConfigManager: GraphConfigManager | null = null;

export function getGraphConfig(): GraphConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new GraphConfigManager();
  }
  return globalConfigManager;
}

export function initializeGraphConfig(env?: string): GraphConfigManager {
  globalConfigManager = new GraphConfigManager(env);
  return globalConfigManager;
}

export function resetGraphConfig(): void {
  globalConfigManager = null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createDriverConfig(baseConfig: Partial<Config> = {}): Config {
  const config = getGraphConfig();
  const pool = config.getConnectionPool();

  return {
    maxConnectionPoolSize: pool.max,
    maxConnectionLifetime: pool.maxLifetimeSeconds,
    connectionAcquisitionTimeout: 60000,
    ...baseConfig,
  };
}

export function validateConnectionUri(uri: string): boolean {
  try {
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
