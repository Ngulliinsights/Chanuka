/**
 * System API Service
 * Core API communication layer for system functionality
 * 
 * Provides comprehensive system monitoring including:
 * - Health checks across all system components
 * - Real-time statistics and metrics
 * - Activity monitoring and event tracking
 * - Database schema introspection
 * - Environment configuration details
 * 
 * @module api/system
 */

import { globalApiClient } from './client';
import { logger } from '@client/utils/logger';
import { globalErrorHandler } from './errors';

// ============================================================================
// System Types
// ============================================================================

/**
 * Service health status indicators
 */
export type ServiceStatus = 'up' | 'down' | 'degraded';

/**
 * Overall system health status
 */
export type SystemStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Comprehensive system health information
 * Includes overall status, uptime metrics, and individual service health
 */
export interface SystemHealth {
  /** Overall system status aggregated from all services */
  status: SystemStatus;
  /** System uptime in seconds */
  uptime: number;
  /** ISO timestamp of health check */
  timestamp: string;
  /** Application version identifier */
  version: string;
  /** Runtime environment (development, staging, production) */
  environment: string;
  /** Individual service health statuses */
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    websocket: ServiceStatus;
    external_apis: ServiceStatus;
  };
}

/**
 * System-wide statistics across all application domains
 */
export interface SystemStats {
  /** User-related metrics */
  users: {
    total: number;
    active_today: number;
    active_this_week: number;
    new_this_month: number;
  };
  /** Legislative bill tracking metrics */
  bills: {
    total: number;
    active: number;
    passed: number;
    failed: number;
  };
  /** Discussion and engagement metrics */
  discussions: {
    total: number;
    active: number;
    comments_today: number;
  };
  /** System performance indicators */
  performance: {
    /** Average API response time in milliseconds */
    avg_response_time: number;
    /** Current request throughput */
    requests_per_minute: number;
    /** Error rate as a percentage (0-100) */
    error_rate: number;
  };
  /** Storage utilization metrics */
  storage: {
    used_gb: number;
    total_gb: number;
    utilization_percent: number;
  };
}

/**
 * Event types tracked in system activity logs
 */
export type SystemEventType = 
  | 'user_login' 
  | 'bill_created' 
  | 'comment_added' 
  | 'vote_cast' 
  | 'system_alert';

/**
 * Individual system event record
 */
export interface SystemEvent {
  /** Unique event identifier */
  id: string;
  /** Categorized event type */
  type: SystemEventType;
  /** Human-readable event description */
  description: string;
  /** ISO timestamp of event occurrence */
  timestamp: string;
  /** Associated user ID if applicable */
  user_id?: string;
  /** Additional event-specific data */
  metadata?: Record<string, unknown>;
}

/**
 * Active user session information
 */
export interface ActiveUser {
  /** User identifier */
  user_id: string;
  /** ISO timestamp of last recorded activity */
  last_activity: string;
  /** Current page or route if available */
  current_page?: string;
}

/**
 * Real-time system activity and monitoring data
 */
export interface SystemActivity {
  /** Recent system events ordered by timestamp */
  recent_events: SystemEvent[];
  /** Currently active user sessions */
  active_users: ActiveUser[];
  /** Current system resource utilization */
  system_load: {
    /** CPU usage percentage (0-100) */
    cpu_percent: number;
    /** Memory usage percentage (0-100) */
    memory_percent: number;
    /** Disk usage percentage (0-100) */
    disk_percent: number;
  };
}

/**
 * Database column definition
 */
export interface ColumnDefinition {
  /** Column name */
  name: string;
  /** SQL data type */
  type: string;
  /** Whether column accepts NULL values */
  nullable: boolean;
  /** Whether column is part of primary key */
  primary_key: boolean;
}

/**
 * Database table metadata
 */
export interface TableDefinition {
  /** Table name */
  name: string;
  /** Column definitions for this table */
  columns: ColumnDefinition[];
  /** Current number of rows in table */
  row_count: number;
}

/**
 * Database migration record
 */
export interface MigrationRecord {
  /** Migration identifier */
  id: string;
  /** Descriptive migration name */
  name: string;
  /** ISO timestamp of migration application */
  applied_at: string;
}

/**
 * Complete database schema information
 */
export interface SystemSchema {
  /** Schema version identifier */
  version: string;
  /** All database tables with their structures */
  tables: TableDefinition[];
  /** Applied migration history */
  migrations: MigrationRecord[];
}

/**
 * Application environment type
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * System environment configuration and runtime information
 */
export interface SystemEnvironment {
  /** Node.js runtime version */
  node_version: string;
  /** Current runtime environment */
  environment: Environment;
  /** Database connection string (sensitive info redacted) */
  database_url: string;
  /** Redis connection string if configured */
  redis_url?: string;
  /** WebSocket server URL */
  websocket_url: string;
  /** Base URL for API endpoints */
  api_base_url: string;
  /** Feature flag status map */
  features: Record<string, boolean>;
  /** Additional configuration values */
  config: Record<string, unknown>;
}

// ============================================================================
// System API Service Class
// ============================================================================

/**
 * Centralized service for all system-related API operations.
 * 
 * This service provides a unified interface for:
 * - Monitoring system health and component status
 * - Retrieving aggregated statistics and metrics
 * - Tracking real-time system activity
 * - Inspecting database schema information
 * - Accessing environment configuration
 * 
 * All methods include comprehensive error handling, structured logging,
 * and type-safe response contracts.
 * 
 * @example
 * ```typescript
 * // Check system health
 * const health = await systemApiService.getHealth();
 * if (health.status === 'unhealthy') {
 *   console.error('System is experiencing issues');
 * }
 * 
 * // Get current statistics
 * const stats = await systemApiService.getStats();
 * console.log(`Active users: ${stats.users.active_today}`);
 * ```
 */
export class SystemApiService {
  private readonly baseUrl: string;
  private readonly systemEndpoint: string;

  /**
   * Creates a new SystemApiService instance
   * 
   * @param baseUrl - Base API URL, defaults to '/api'
   */
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.systemEndpoint = `${baseUrl}/system`;
    
    logger.debug('SystemApiService initialized', {
      component: 'SystemApiService',
      baseUrl,
      systemEndpoint: this.systemEndpoint
    });
  }

  // ==========================================================================
  // Health Monitoring Methods
  // ==========================================================================

  /**
   * Retrieves comprehensive system health status.
   * 
   * Performs health checks across all system components including:
   * - Database connectivity and performance
   * - Cache layer responsiveness
   * - WebSocket server status
   * - External API availability
   * 
   * The overall status is determined by aggregating individual service
   * statuses using the worst-case-wins principle.
   *
   * @returns Promise resolving to detailed health information
   * @throws Error if health check fails or service is unreachable
   * 
   * @example
   * ```typescript
   * try {
   *   const health = await systemApiService.getHealth();
   *   console.log(`System is ${health.status}`);
   *   console.log(`Uptime: ${health.uptime}s`);
   * } catch (error) {
   *   console.error('Unable to check system health:', error.message);
   * }
   * ```
   */
  async getHealth(): Promise<SystemHealth> {
    const operation = 'getHealth';
    
    try {
      logger.debug('Fetching system health', {
        component: 'SystemApiService',
        operation
      });

      const response = await globalApiClient.get<SystemHealth>(
        `${this.systemEndpoint}/health`
      );

      logger.info('System health retrieved successfully', {
        component: 'SystemApiService',
        operation,
        status: response.data.status
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system health', {
        component: 'SystemApiService',
        operation,
        error
      });
      throw await this.handleSystemError(error, 'Failed to retrieve system health');
    }
  }

  // ==========================================================================
  // Statistics Methods
  // ==========================================================================

  /**
   * Retrieves comprehensive system-wide statistics.
   * 
   * Aggregates metrics across all application domains including:
   * - User engagement and growth metrics
   * - Legislative bill tracking counts
   * - Discussion participation rates
   * - API performance indicators
   * - Storage utilization data
   * 
   * Statistics are calculated in real-time or from recent cache
   * depending on the metric type.
   *
   * @returns Promise resolving to detailed system statistics
   * @throws Error if statistics cannot be retrieved
   * 
   * @example
   * ```typescript
   * const stats = await systemApiService.getStats();
   * console.log(`Total users: ${stats.users.total}`);
   * console.log(`Error rate: ${stats.performance.error_rate}%`);
   * ```
   */
  async getStats(): Promise<SystemStats> {
    const operation = 'getStats';
    
    try {
      logger.debug('Fetching system statistics', {
        component: 'SystemApiService',
        operation
      });

      const response = await globalApiClient.get<SystemStats>(
        `${this.systemEndpoint}/stats`
      );

      logger.info('System statistics retrieved successfully', {
        component: 'SystemApiService',
        operation,
        totalUsers: response.data.users.total,
        totalBills: response.data.bills.total
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system statistics', {
        component: 'SystemApiService',
        operation,
        error
      });
      throw await this.handleSystemError(error, 'Failed to retrieve system statistics');
    }
  }

  // ==========================================================================
  // Activity Monitoring Methods
  // ==========================================================================

  /**
   * Retrieves recent system activity and current sessions.
   * 
   * Provides real-time insights into:
   * - Recent system events (logins, bill creations, votes, etc.)
   * - Currently active user sessions
   * - System resource utilization (CPU, memory, disk)
   * 
   * Activity data is useful for monitoring system usage patterns,
   * detecting anomalies, and capacity planning.
   *
   * @returns Promise resolving to comprehensive activity information
   * @throws Error if activity data cannot be retrieved
   * 
   * @example
   * ```typescript
   * const activity = await systemApiService.getActivity();
   * console.log(`Active users: ${activity.active_users.length}`);
   * console.log(`CPU usage: ${activity.system_load.cpu_percent}%`);
   * ```
   */
  async getActivity(): Promise<SystemActivity> {
    const operation = 'getActivity';
    
    try {
      logger.debug('Fetching system activity', {
        component: 'SystemApiService',
        operation
      });

      const response = await globalApiClient.get<SystemActivity>(
        `${this.systemEndpoint}/activity`
      );

      logger.info('System activity retrieved successfully', {
        component: 'SystemApiService',
        operation,
        eventCount: response.data.recent_events.length,
        activeUserCount: response.data.active_users.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system activity', {
        component: 'SystemApiService',
        operation,
        error
      });
      throw await this.handleSystemError(error, 'Failed to retrieve system activity');
    }
  }

  // ==========================================================================
  // Schema Information Methods
  // ==========================================================================

  /**
   * Retrieves complete database schema information.
   * 
   * Provides introspection into:
   * - All database tables and their structures
   * - Column definitions with types and constraints
   * - Current row counts per table
   * - Migration history and version
   * 
   * Schema information is useful for debugging, documentation,
   * and understanding data relationships.
   *
   * @returns Promise resolving to complete database schema metadata
   * @throws Error if schema information cannot be retrieved
   * 
   * @example
   * ```typescript
   * const schema = await systemApiService.getSchema();
   * console.log(`Database version: ${schema.version}`);
   * console.log(`Total tables: ${schema.tables.length}`);
   * ```
   */
  async getSchema(): Promise<SystemSchema> {
    const operation = 'getSchema';
    
    try {
      logger.debug('Fetching system schema', {
        component: 'SystemApiService',
        operation
      });

      const response = await globalApiClient.get<SystemSchema>(
        `${this.systemEndpoint}/schema`
      );

      logger.info('System schema retrieved successfully', {
        component: 'SystemApiService',
        operation,
        version: response.data.version,
        tableCount: response.data.tables.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system schema', {
        component: 'SystemApiService',
        operation,
        error
      });
      throw await this.handleSystemError(error, 'Failed to retrieve database schema');
    }
  }

  // ==========================================================================
  // Environment Information Methods
  // ==========================================================================

  /**
   * Retrieves system environment configuration.
   * 
   * Provides access to:
   * - Runtime environment details (Node version, environment type)
   * - Service connection URLs (database, Redis, WebSocket, API)
   * - Feature flag statuses
   * - Application configuration values
   * 
   * Note: Sensitive information like passwords and tokens are
   * automatically redacted from the response.
   *
   * @returns Promise resolving to detailed environment information
   * @throws Error if environment data cannot be retrieved
   * 
   * @example
   * ```typescript
   * const env = await systemApiService.getEnvironment();
   * console.log(`Environment: ${env.environment}`);
   * console.log(`Node version: ${env.node_version}`);
   * if (env.features.newBillTracking) {
   *   console.log('New bill tracking feature is enabled');
   * }
   * ```
   */
  async getEnvironment(): Promise<SystemEnvironment> {
    const operation = 'getEnvironment';
    
    try {
      logger.debug('Fetching system environment', {
        component: 'SystemApiService',
        operation
      });

      const response = await globalApiClient.get<SystemEnvironment>(
        `${this.systemEndpoint}/environment`
      );

      logger.info('System environment retrieved successfully', {
        component: 'SystemApiService',
        operation,
        environment: response.data.environment
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch system environment', {
        component: 'SystemApiService',
        operation,
        error
      });
      throw await this.handleSystemError(error, 'Failed to retrieve environment information');
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Centralized error handling for system operations.
   * 
   * This method:
   * 1. Extracts meaningful error messages from various error structures
   * 2. Creates a standardized Error object
   * 3. Reports the error to the global error handler
   * 4. Returns the processed error for throwing
   * 
   * @param error - Raw error object from API call
   * @param defaultMessage - Fallback message if error details unavailable
   * @returns Processed Error object with user-friendly message
   */
  private async handleSystemError(error: any, defaultMessage: string): Promise<Error> {
    // Extract error message from various possible structures
    // Priority: response.data.message > response.data.error > error.message > default
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      defaultMessage;

    const systemError = new Error(errorMessage);

    // Report to unified error handler for tracking and logging
    await globalErrorHandler.handleError(systemError, {
      component: 'SystemApiService',
      operation: 'system_operation',
      status: error?.response?.status,
      endpoint: error?.config?.url
    });

    return systemError;
  }
}

// ============================================================================
// Global Instance Export
// ============================================================================

/**
 * Pre-configured global instance of the system API service.
 * 
 * Use this singleton instance throughout the application for consistency
 * and to avoid creating multiple service instances.
 * 
 * @example
 * ```typescript
 * import { systemApiService } from './api/system';
 * 
 * const health = await systemApiService.getHealth();
 * ```
 */
export const systemApiService = new SystemApiService();