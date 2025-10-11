import { pool } from "../../../shared/database/connection.js";
import { demoDataService } from "../demo-data.js";
import { logger } from '../utils/logger';

// Simple database connection status tracking (replaces server/db.js dependency)
let isDatabaseConnected = false;

function setDatabaseConnectionStatus(connected: boolean) {
  isDatabaseConnected = connected;
  console.log(`🔄 Database connection status updated: ${connected ? 'connected' : 'disconnected'}`);
}

export function getDatabaseConnectionStatus() {
  return isDatabaseConnected;
}

/**
 * Database Fallback Service
 * Handles database connection failures gracefully and provides fallback mechanisms
 */
export class DatabaseFallbackService {
  private static instance: DatabaseFallbackService;
  private isConnected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private retryCount: number = 0;
  private maxRetries: number = 5;
  private retryInterval: number = 30000; // 30 seconds
  private healthCheckInterval: number = 60000; // 1 minute
  private healthCheckTimer?: NodeJS.Timeout;

  private constructor() {
    this.startHealthCheckMonitoring();
  }

  public static getInstance(): DatabaseFallbackService {
    if (!DatabaseFallbackService.instance) {
      DatabaseFallbackService.instance = new DatabaseFallbackService();
    }
    return DatabaseFallbackService.instance;
  }

  /**
   * Initialize database connection with fallback handling
   */
  public async initialize(): Promise<boolean> {
    logger.info('🔄 Initializing database with fallback support...', { component: 'SimpleTool' });
    
    try {
      const connected = await this.testConnection();
      
      if (connected) {
        this.isConnected = true;
        this.retryCount = 0;
        setDatabaseConnectionStatus(true);
        logger.info('✅ Database connection established successfully', { component: 'SimpleTool' });
        
        // Disable demo mode if database is available
        if (demoDataService.isDemoMode()) {
          demoDataService.setDemoMode(false);
          logger.info('🔄 Disabled demo mode - database is available', { component: 'SimpleTool' });
        }
        
        return true;
      } else {
        return await this.handleConnectionFailure();
      }
    } catch (error) {
      logger.error('❌ Database initialization error:', { component: 'SimpleTool' }, error);
      return await this.handleConnectionFailure();
    }
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!process.env.DATABASE_URL) {
        logger.info('⚠️  No DATABASE_URL configured', { component: 'SimpleTool' });
        return false;
      }

      // Test basic connectivity with timeout
      const client = await Promise.race([
        pool.connect(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);

      // Test basic query
      await client.query('SELECT NOW()');
      
      // Test table existence
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('bills', 'users', 'bill_comments', 'sponsors')
      `);

      client.release();

      if (tableCheck.rows.length < 3) {
        logger.info('⚠️  Required tables missing - falling back to demo mode', { component: 'SimpleTool' });
        return false;
      }

      this.lastHealthCheck = new Date();
      return true;

    } catch (error) {
      logger.error('Database connection test failed:', { component: 'SimpleTool' }, {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code
      });
      return false;
    }
  }

  /**
   * Handle database connection failure
   */
  private async handleConnectionFailure(): Promise<boolean> {
    this.isConnected = false;
    this.retryCount++;
    setDatabaseConnectionStatus(false);

    console.log(`❌ Database connection failed (attempt ${this.retryCount}/${this.maxRetries})`);

    // Enable demo mode immediately
    if (!demoDataService.isDemoMode()) {
      demoDataService.setDemoMode(true);
      logger.info('🔄 Enabled demo mode due to database connection failure', { component: 'SimpleTool' });
    }

    // Schedule retry if we haven't exceeded max attempts
    if (this.retryCount < this.maxRetries) {
      console.log(`🔄 Scheduling retry in ${this.retryInterval / 1000} seconds...`);
      setTimeout(() => {
        this.attemptReconnection();
      }, this.retryInterval);
    } else {
      logger.info('⚠️  Max retry attempts reached. Running permanently in demo mode.', { component: 'SimpleTool' });
      logger.info('💡 Restart the server to retry database connection.', { component: 'SimpleTool' });
    }

    return false;
  }

  /**
   * Attempt to reconnect to database
   */
  private async attemptReconnection(): Promise<void> {
    console.log(`🔄 Attempting database reconnection (${this.retryCount}/${this.maxRetries})...`);
    
    try {
      const connected = await this.testConnection();
      
      if (connected) {
        this.isConnected = true;
        this.retryCount = 0;
        setDatabaseConnectionStatus(true);
        logger.info('✅ Database reconnection successful!', { component: 'SimpleTool' });
        
        // Disable demo mode
        if (demoDataService.isDemoMode()) {
          demoDataService.setDemoMode(false);
          logger.info('🔄 Disabled demo mode - database is back online', { component: 'SimpleTool' });
        }
      } else {
        await this.handleConnectionFailure();
      }
    } catch (error) {
      logger.error('Reconnection attempt failed:', { component: 'SimpleTool' }, error);
      await this.handleConnectionFailure();
    }
  }

  /**
   * Start continuous health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (this.isConnected) {
        const healthy = await this.testConnection();
        
        if (!healthy) {
          logger.info('⚠️  Database health check failed - switching to demo mode', { component: 'SimpleTool' });
          await this.handleConnectionFailure();
        }
      } else if (this.retryCount < this.maxRetries) {
        // Try to reconnect if we're not at max retries
        await this.attemptReconnection();
      }
    }, this.healthCheckInterval);
  }

  /**
   * Get current database status
   */
  public getStatus() {
    return {
      connected: this.isConnected,
      demoMode: demoDataService.isDemoMode(),
      lastHealthCheck: this.lastHealthCheck,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      nextRetryIn: this.retryCount < this.maxRetries ? this.retryInterval : null
    };
  }

  /**
   * Get comprehensive health information
   */
  public async getHealthInfo() {
    const status = this.getStatus();
    const demoHealthStatus = demoDataService.getHealthStatus();
    
    return {
      database: {
        ...status,
        uptime: Date.now() - this.lastHealthCheck.getTime(),
        canRetry: this.retryCount < this.maxRetries
      },
      fallback: {
        ...demoHealthStatus,
        active: demoDataService.isDemoMode(),
        reason: !this.isConnected ? 'database_unavailable' : 'manual_override'
      },
      system: {
        mode: this.isConnected ? 'database' : 'demo',
        stable: this.isConnected || demoDataService.isDemoMode(),
        message: this.getStatusMessage()
      }
    };
  }

  /**
   * Get human-readable status message
   */
  private getStatusMessage(): string {
    if (this.isConnected) {
      return "System operating normally with database connection";
    } else if (demoDataService.isDemoMode()) {
      if (this.retryCount < this.maxRetries) {
        return `Operating in demo mode, retrying database connection (${this.retryCount}/${this.maxRetries})`;
      } else {
        return "Operating in demo mode, database connection failed permanently";
      }
    } else {
      return "System initializing...";
    }
  }

  /**
   * Force retry database connection (admin function)
   */
  public async forceRetry(): Promise<boolean> {
    logger.info('🔄 Force retrying database connection...', { component: 'SimpleTool' });
    this.retryCount = 0; // Reset retry count
    return await this.initialize();
  }

  /**
   * Manually enable/disable demo mode
   */
  public setDemoMode(enabled: boolean): void {
    demoDataService.setDemoMode(enabled);
    console.log(`🔄 Demo mode ${enabled ? 'enabled' : 'disabled'} manually`);
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }
}

// Export singleton instance
export const databaseFallbackService = DatabaseFallbackService.getInstance();






