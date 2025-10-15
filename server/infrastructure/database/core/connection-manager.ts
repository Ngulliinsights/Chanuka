import { EventEmitter } from 'events';
import { PoolClient } from 'pg';
import { pool, EnhancedPool, PoolMetrics, checkPoolHealth, PoolHealthStatus } from '../../../../shared/database/pool';
import { logger } from '../../../utils/logger';
import { ConnectionManagerMetrics } from './connection-manager-metrics';

/**
 * Circuit breaker states for connection management.
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Connection health status interface.
 */
export interface ConnectionHealthStatus {
  isHealthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  circuitBreakerState: CircuitBreakerState;
  circuitBreakerFailures: number;
  lastError?: string;
  lastHealthCheck: Date;
}

/**
 * Pool statistics interface.
 */
export interface PoolStatistics {
  queries: number;
  connections: number;
  idleConnections: number;
  totalConnections: number;
  waitingClients: number;
  avgQueryTime?: number;
  maxQueryTime?: number;
  minQueryTime?: number;
}

/**
 * Connection manager configuration interface.
 */
export interface ConnectionManagerConfig {
  healthCheckIntervalMs: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerResetTimeoutMs: number;
  circuitBreakerTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * Connection lifecycle events.
 */
export interface ConnectionEvents {
  'connection-acquired': (client: PoolClient) => void;
  'connection-released': (client: PoolClient) => void;
  'connection-error': (error: Error, client?: PoolClient) => void;
  'circuit-breaker-state-change': (oldState: CircuitBreakerState, newState: CircuitBreakerState) => void;
  'health-status-update': (status: ConnectionHealthStatus) => void;
  'pool-error': (error: Error) => void;
  'shutdown-started': (timeoutMs: number) => void;
  'shutdown-completed': (durationMs: number, forcedClosures: number) => void;
  'shutdown-forced': (remainingConnections: number) => void;
}

/**
 * Connection manager interface.
 */
export interface ConnectionManager {
  acquireConnection(): Promise<PoolClient>;
  releaseConnection(client: PoolClient): Promise<void>;
  getHealthStatus(): Promise<ConnectionHealthStatus>;
  getPoolStatistics(): Promise<PoolStatistics>;
  getCircuitBreakerState(): CircuitBreakerState;
  isHealthy(): Promise<boolean>;
  shutdown(timeoutMs?: number): Promise<void>;
  close(): Promise<void>;
  on<K extends keyof ConnectionEvents>(event: K, listener: ConnectionEvents[K]): this;
  off<K extends keyof ConnectionEvents>(event: K, listener: ConnectionEvents[K]): this;
  emit<K extends keyof ConnectionEvents>(event: K, ...args: Parameters<ConnectionEvents[K]>): boolean;
}

/**
 * Circuit breaker implementation for connection management.
 */
class ConnectionCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitBreakerState = 'CLOSED';
  private readonly eventEmitter: EventEmitter;

  constructor(
    private readonly failureThreshold: number,
    private readonly resetTimeoutMs: number,
    private readonly timeoutMs: number,
    eventEmitter: EventEmitter
  ) {
    this.eventEmitter = eventEmitter;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const oldState = this.state;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.eventEmitter.emit('circuit-breaker-state-change', oldState, this.state);
      } else {
        throw new Error(`Circuit breaker is OPEN - operation not allowed. Retry in ${this.resetTimeoutMs - timeSinceLastFailure}ms`);
      }
    }

    try {
      // Race the operation against a timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), this.timeoutMs);
      });

      const result = await Promise.race([operation(), timeoutPromise]);

      // Successful execution in HALF_OPEN state resets the circuit
      if (this.state === 'HALF_OPEN') {
        this.reset();
        this.eventEmitter.emit('circuit-breaker-state-change', oldState, this.state);
      }

      return result;
    } catch (error) {
      this.recordFailure();
      this.eventEmitter.emit('circuit-breaker-state-change', oldState, this.state);
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Connection manager implementation that wraps the shared database pool.
 */
export class DatabaseConnectionManager extends EventEmitter implements ConnectionManager {
  private circuitBreaker: ConnectionCircuitBreaker;
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthStatus?: ConnectionHealthStatus;
  private isShuttingDown = false;
  private activeConnections = new Set<PoolClient>();
  private metrics: ConnectionManagerMetrics;

  constructor(
    private readonly pool: EnhancedPool,
    private readonly config: ConnectionManagerConfig
  ) {
    super();

    this.circuitBreaker = new ConnectionCircuitBreaker(
      config.circuitBreakerFailureThreshold,
      config.circuitBreakerResetTimeoutMs,
      config.circuitBreakerTimeoutMs,
      this
    );

    this.metrics = new ConnectionManagerMetrics();
    this.setupPoolEventListeners();
    this.startHealthMonitoring();
  }

  /**
   * Acquire a connection from the pool with circuit breaker protection.
   */
  async acquireConnection(): Promise<PoolClient> {
    if (this.isShuttingDown) {
      throw new Error('Connection manager is shutting down');
    }

    const startTime = Date.now();

    try {
      const client = await this.circuitBreaker.execute(async () => {
        return await this.pool.connect();
      });

      // Track active connection
      this.activeConnections.add(client);

      const acquisitionTime = Date.now() - startTime;
      this.metrics.recordConnectionAcquired(acquisitionTime);
      this.emit('connection-acquired', client);
      return client;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.metrics.recordConnectionFailed(err);
      this.emit('connection-error', err);
      throw err;
    }
  }

  /**
   * Release a connection back to the pool.
   */
  async releaseConnection(client: PoolClient): Promise<void> {
    try {
      client.release();
      // Remove from active connections tracking
      this.activeConnections.delete(client);
      this.metrics.recordConnectionReleased();
      this.emit('connection-released', client);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.metrics.recordConnectionFailed(err);
      this.emit('connection-error', err, client);
      throw err;
    }
  }

  /**
   * Get current health status of the connection pool.
   */
  async getHealthStatus(): Promise<ConnectionHealthStatus> {
    const poolHealth = await checkPoolHealth(this.pool, 'managed');

    const status: ConnectionHealthStatus = {
      ...poolHealth,
      circuitBreakerState: this.circuitBreaker.getState(),
      circuitBreakerFailures: this.circuitBreaker.getFailureCount(),
      lastHealthCheck: new Date(),
    };

    // Record health status metrics
    this.metrics.recordHealthStatus(
      status.isHealthy,
      status.totalConnections,
      status.idleConnections,
      status.waitingClients
    );

    // Record circuit breaker metrics
    this.metrics.recordCircuitBreakerFailure(status.circuitBreakerFailures);

    this.lastHealthStatus = status;
    return status;
  }

  /**
   * Get pool statistics.
   */
  async getPoolStatistics(): Promise<PoolStatistics> {
    const stats = await this.pool.getMetrics();

    // Record pool statistics metrics
    this.metrics.recordPoolStatistics(stats);

    return stats;
  }

  /**
   * Get current circuit breaker state.
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  /**
   * Check if the connection manager is healthy.
   */
  async isHealthy(): Promise<boolean> {
    const status = await this.getHealthStatus();
    return status.isHealthy;
  }

  /**
   * Gracefully shutdown the connection manager with configurable timeout.
   * Waits for active connections to complete before closing.
   */
  async shutdown(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    this.isShuttingDown = true;

    logger.info('Starting connection manager graceful shutdown', {
      activeConnections: this.activeConnections.size,
      timeoutMs
    });

    this.metrics.recordShutdownStarted(timeoutMs);
    this.emit('shutdown-started', timeoutMs);

    // Stop accepting new connections
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Wait for active connections to complete with timeout
    const shutdownPromise = this.waitForActiveConnections();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs);
    });

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      logger.info('Connection manager shutdown completed gracefully', {
        durationMs: duration,
        activeConnections: this.activeConnections.size
      });

      this.metrics.recordShutdownCompleted(duration, 0);
      this.emit('shutdown-completed', duration, 0);

    } catch (error) {
      // Timeout occurred, force close remaining connections
      const remainingConnections = this.activeConnections.size;
      const duration = Date.now() - startTime;

      logger.warn('Connection manager shutdown timeout, forcing closure', {
        remainingConnections,
        durationMs: duration,
        timeoutMs
      });

      // Force close remaining connections
      for (const client of this.activeConnections) {
        try {
          client.release(true); // Force release
        } catch (err) {
          logger.error('Error forcing connection release during shutdown', { error: err });
        }
      }

      this.activeConnections.clear();

      this.metrics.recordShutdownCompleted(duration, remainingConnections);
      this.emit('shutdown-forced', remainingConnections);
      this.emit('shutdown-completed', duration, remainingConnections);
    }

    // Remove all listeners
    this.removeAllListeners();
  }

  /**
   * Wait for all active connections to be released.
   */
  private async waitForActiveConnections(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.activeConnections.size === 0) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (this.activeConnections.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100); // Check every 100ms

      // Also listen for connection-released events
      const onRelease = () => {
        if (this.activeConnections.size === 0) {
          this.off('connection-released', onRelease);
          clearInterval(checkInterval);
          resolve();
        }
      };

      this.on('connection-released', onRelease);
    });
  }

  /**
   * Close the connection manager and stop monitoring.
   * @deprecated Use shutdown() for graceful shutdown instead.
   */
  async close(): Promise<void> {
    await this.shutdown(0); // Immediate shutdown
  }

  /**
   * Setup event listeners for the underlying pool.
   */
  private setupPoolEventListeners(): void {
    this.pool.on('error', (error) => {
      this.emit('pool-error', error);
    });

    this.pool.on('connect', (client) => {
      logger.debug('Pool client connected');
    });

    this.pool.on('remove', (client) => {
      logger.debug('Pool client removed');
    });

    // Listen for circuit breaker state changes
    this.on('circuit-breaker-state-change', (oldState: CircuitBreakerState, newState: CircuitBreakerState) => {
      this.metrics.recordCircuitBreakerStateChange(oldState, newState);
    });
  }

  /**
   * Start periodic health monitoring.
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.getHealthStatus();
        this.emit('health-status-update', status);

        // Log warnings for unhealthy states
        if (!status.isHealthy) {
          logger.warn('Connection pool health check failed', {
            circuitBreakerState: status.circuitBreakerState,
            totalConnections: status.totalConnections,
            waitingClients: status.waitingClients,
            lastError: status.lastError,
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Health check error', { error: err.message });
      }
    }, this.config.healthCheckIntervalMs);
  }
}

/**
 * Load connection manager configuration from environment variables.
 */
export function loadConnectionManagerConfig(): ConnectionManagerConfig {
  return {
    healthCheckIntervalMs: parseInt(process.env.CONNECTION_HEALTH_CHECK_INTERVAL_MS || '30000', 10),
    circuitBreakerFailureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
    circuitBreakerResetTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS || '30000', 10),
    circuitBreakerTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '5000', 10),
    maxRetries: parseInt(process.env.CONNECTION_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.CONNECTION_RETRY_DELAY_MS || '1000', 10),
  };
}

/**
 * Create a new connection manager instance.
 */
export function createConnectionManager(config?: Partial<ConnectionManagerConfig>): ConnectionManager {
  const fullConfig = { ...loadConnectionManagerConfig(), ...config };
  return new DatabaseConnectionManager(pool, fullConfig);
}

// Export default instance
export const connectionManager = createConnectionManager();