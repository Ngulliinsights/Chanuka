/**
 * Database Configuration
 * 
 * Centralized configuration for all database services
 */

import { DatabaseIntegrationConfig } from './database-integration.js';

export function createDatabaseConfig(): DatabaseIntegrationConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    connectionPool: {
      // Connection string from environment
      connectionString: process.env.DATABASE_URL,
      
      // Pool sizing - adjust based on environment
      min: isDevelopment ? 2 : 5,
      max: isDevelopment ? 10 : 20,
      
      // Timeouts
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      acquireTimeoutMillis: 10000,
      
      // Health monitoring
      healthCheckInterval: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      
      // Performance
      statementTimeout: 30000,
      queryTimeout: 30000,
      
      // Read replica support (if configured)
      readReplicaUrls: process.env.READ_REPLICA_URLS?.split(',') || [],
      readWriteRatio: 0.7, // 70% reads, 30% writes
      
      // SSL configuration
      ssl: isProduction ? { rejectUnauthorized: false } : false
    },

    backup: {
      backupPath: process.env.BACKUP_PATH || './backups',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionEnabled: true,
      encryptionEnabled: isProduction,
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
      
      // Remote storage configuration (optional)
      remoteStorage: process.env.BACKUP_REMOTE_STORAGE ? {
        type: process.env.BACKUP_STORAGE_TYPE as 'aws-s3' | 'gcp-storage' | 'azure-blob',
        bucket: process.env.BACKUP_STORAGE_BUCKET!,
        region: process.env.BACKUP_STORAGE_REGION!,
        credentials: {
          accessKeyId: process.env.BACKUP_STORAGE_ACCESS_KEY,
          secretAccessKey: process.env.BACKUP_STORAGE_SECRET_KEY
        }
      } : undefined
    },

    monitoring: {
      enabled: process.env.DB_MONITORING_ENABLED !== 'false',
      intervalMs: parseInt(process.env.DB_MONITORING_INTERVAL || '30000')
    },

    validation: {
      enabled: process.env.DB_VALIDATION_ENABLED !== 'false',
      scheduleHours: process.env.DB_VALIDATION_HOURS?.split(',').map(h => parseInt(h)) || [2, 14] // 2 AM and 2 PM
    },

    indexOptimization: {
      enabled: process.env.DB_INDEX_OPTIMIZATION_ENABLED !== 'false',
      scheduleHours: process.env.DB_INDEX_OPTIMIZATION_HOURS?.split(',').map(h => parseInt(h)) || [3] // 3 AM
    }
  };
}

export const defaultDatabaseConfig = createDatabaseConfig();
