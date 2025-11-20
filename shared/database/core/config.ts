/**
 * Unified Database Configuration
 * 
 * Consolidates configuration management from both existing systems
 * with environment-aware defaults and validation.
 */

import { ConnectionManagerConfig } from './connection-manager.js';

/**
 * Environment-specific database configuration.
 */
export interface DatabaseEnvironmentConfig {
  development: ConnectionManagerConfig;
  test: ConnectionManagerConfig;
  staging: ConnectionManagerConfig;
  production: ConnectionManagerConfig;
}

/**
 * Create database configuration based on environment.
 */
export function createDatabaseConfig(environment?: string): ConnectionManagerConfig {
  const env = environment || process.env.NODE_ENV || 'development';
  
  const baseConfig: ConnectionManagerConfig = {
    // Connection settings
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'chanuka_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    
    // SSL configuration
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false,
    
    // Pool configuration
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    
    // Timeouts
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000'),
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
    
    // Health monitoring
    healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
    maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
    
    // Read/write ratio
    readWriteRatio: parseFloat(process.env.DB_READ_WRITE_RATIO || '0.7'),
    
    // Read replicas
    readReplicaUrls: process.env.DB_READ_REPLICA_URLS 
      ? process.env.DB_READ_REPLICA_URLS.split(',').map(url => url.trim())
      : [],
    
    // Multi-database architecture
    ...(process.env.DB_OPERATIONAL_URL && { operationalDbUrl: process.env.DB_OPERATIONAL_URL }),
    ...(process.env.DB_ANALYTICS_URL && { analyticsDbUrl: process.env.DB_ANALYTICS_URL }),
    ...(process.env.DB_SECURITY_URL && { securityDbUrl: process.env.DB_SECURITY_URL }),
  };

  // Environment-specific overrides
  const environmentConfigs: DatabaseEnvironmentConfig = {
    development: {
      ...baseConfig,
      // Development optimizations
      min: 1,
      max: 5,
      healthCheckInterval: 60000, // Less frequent health checks
      ssl: false, // Typically no SSL in development
    },
    
    test: {
      ...baseConfig,
      // Test environment settings
      database: process.env.DB_TEST_NAME || 'chanuka_test',
      min: 1,
      max: 3,
      healthCheckInterval: 0, // Disable health checks in tests
      idleTimeoutMillis: 1000, // Quick cleanup
      connectionTimeoutMillis: 2000,
      acquireTimeoutMillis: 3000,
      ssl: false,
    },
    
    staging: {
      ...baseConfig,
      // Staging environment (production-like but smaller scale)
      min: 2,
      max: 10,
      ssl: process.env.DB_SSL === 'false' ? false : {
        rejectUnauthorized: true
      },
    },
    
    production: {
      ...baseConfig,
      // Production optimizations
      min: 5,
      max: 50,
      healthCheckInterval: 15000, // More frequent health checks
      ssl: {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY,
      },
      // Production typically has read replicas
      readReplicaUrls: process.env.DB_READ_REPLICA_URLS 
        ? process.env.DB_READ_REPLICA_URLS.split(',').map(url => url.trim())
        : [],
    }
  };

  const config = environmentConfigs[env as keyof DatabaseEnvironmentConfig] || environmentConfigs.development;
  
  // Validate configuration
  validateDatabaseConfig(config);
  
  return config;
}

/**
 * Default database configuration for quick setup.
 */
export const defaultDatabaseConfig: ConnectionManagerConfig = createDatabaseConfig();

/**
 * Validate database configuration for common issues.
 */
export function validateDatabaseConfig(config: ConnectionManagerConfig): void {
  const errors: string[] = [];

  // Required fields
  if (!config.host) errors.push('Database host is required');
  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push('Database port must be between 1 and 65535');
  }
  if (!config.database) errors.push('Database name is required');
  if (!config.user) errors.push('Database user is required');

  // Pool configuration
  if (config.min && config.max && config.min > config.max) {
    errors.push('Pool minimum size cannot be greater than maximum size');
  }
  if (config.max && config.max < 1) {
    errors.push('Pool maximum size must be at least 1');
  }

  // Timeout validation
  if (config.connectionTimeoutMillis && config.connectionTimeoutMillis < 1000) {
    errors.push('Connection timeout should be at least 1000ms');
  }
  if (config.queryTimeout && config.queryTimeout < 1000) {
    errors.push('Query timeout should be at least 1000ms');
  }

  // Read/write ratio
  if (config.readWriteRatio && (config.readWriteRatio < 0 || config.readWriteRatio > 1)) {
    errors.push('Read/write ratio must be between 0 and 1');
  }

  // Health check interval
  if (config.healthCheckInterval && config.healthCheckInterval < 0) {
    errors.push('Health check interval cannot be negative (use 0 to disable)');
  }

  if (errors.length > 0) {
    throw new Error(`Database configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Create configuration for specific database types in multi-tenant setup.
 */
export function createSpecializedDatabaseConfig(
  baseConfig: ConnectionManagerConfig,
  type: 'operational' | 'analytics' | 'security'
): ConnectionManagerConfig {
  const specializedConfigs = {
    operational: {
      // Optimized for transactional workloads
      max: Math.ceil((baseConfig.max || 20) * 0.6), // 60% of connections
      statementTimeout: 10000, // Shorter timeout for OLTP
      queryTimeout: 10000,
      application_name: 'chanuka-operational'
    },
    
    analytics: {
      // Optimized for analytical workloads
      max: Math.ceil((baseConfig.max || 20) * 0.3), // 30% of connections
      statementTimeout: 300000, // Longer timeout for complex queries
      queryTimeout: 300000,
      application_name: 'chanuka-analytics'
    },
    
    security: {
      // Optimized for audit and security logs
      max: Math.ceil((baseConfig.max || 20) * 0.1), // 10% of connections
      statementTimeout: 30000,
      queryTimeout: 30000,
      application_name: 'chanuka-security'
    }
  };

  return {
    ...baseConfig,
    ...specializedConfigs[type]
  };
}

/**
 * Get database URL from configuration.
 */
export function getDatabaseUrl(config: ConnectionManagerConfig): string {
  const { host, port, database, user, password, ssl } = config;
  
  let url = `postgresql://${user}`;
  if (password) {
    url += `:${password}`;
  }
  url += `@${host}:${port}/${database}`;
  
  if (ssl) {
    url += '?ssl=true';
    if (typeof ssl === 'object' && !ssl.rejectUnauthorized) {
      url += '&sslmode=require';
    }
  }
  
  return url;
}

/**
 * Parse database URL into configuration object.
 */
export function parseDatabaseUrl(url: string): Partial<ConnectionManagerConfig> {
  try {
    const parsed = new URL(url);
    
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : 5432,
      database: parsed.pathname.slice(1), // Remove leading slash
      user: parsed.username,
      password: parsed.password || undefined,
      ssl: parsed.searchParams.has('ssl') || parsed.searchParams.has('sslmode')
    };
  } catch (error) {
    throw new Error(`Invalid database URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Environment variable documentation for database configuration.
 */
export const DATABASE_ENV_VARS = {
  // Connection
  DB_HOST: 'Database host (default: localhost)',
  DB_PORT: 'Database port (default: 5432)',
  DB_NAME: 'Database name (default: chanuka_dev)',
  DB_USER: 'Database user (default: postgres)',
  DB_PASSWORD: 'Database password (default: postgres)',
  DB_SSL: 'Enable SSL (true/false, default: false)',
  DB_SSL_REJECT_UNAUTHORIZED: 'Reject unauthorized SSL certificates (default: true)',
  DB_SSL_CA: 'SSL Certificate Authority',
  DB_SSL_CERT: 'SSL Certificate',
  DB_SSL_KEY: 'SSL Private Key',
  
  // Pool configuration
  DB_POOL_MIN: 'Minimum pool size (default: 2)',
  DB_POOL_MAX: 'Maximum pool size (default: 20)',
  
  // Timeouts
  DB_IDLE_TIMEOUT: 'Idle connection timeout in ms (default: 30000)',
  DB_CONNECTION_TIMEOUT: 'Connection timeout in ms (default: 5000)',
  DB_ACQUIRE_TIMEOUT: 'Connection acquire timeout in ms (default: 10000)',
  DB_STATEMENT_TIMEOUT: 'Statement timeout in ms (default: 30000)',
  DB_QUERY_TIMEOUT: 'Query timeout in ms (default: 30000)',
  
  // Health monitoring
  DB_HEALTH_CHECK_INTERVAL: 'Health check interval in ms (default: 30000, 0 to disable)',
  DB_MAX_RETRIES: 'Maximum retry attempts (default: 3)',
  DB_RETRY_DELAY: 'Retry delay in ms (default: 1000)',
  
  // Performance
  DB_READ_WRITE_RATIO: 'Read/write ratio for replica routing (default: 0.7)',
  
  // Multi-database
  DB_READ_REPLICA_URLS: 'Comma-separated read replica URLs',
  DB_OPERATIONAL_URL: 'Operational database URL',
  DB_ANALYTICS_URL: 'Analytics database URL',
  DB_SECURITY_URL: 'Security database URL',
  
  // Test environment
  DB_TEST_NAME: 'Test database name (default: chanuka_test)',
} as const;