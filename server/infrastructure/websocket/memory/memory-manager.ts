/**
 * Memory Manager for WebSocket Service
 * 
 * Main coordination service for memory management, integrating progressive degradation
 * and memory leak detection. Handles cleanup scheduling and memory pressure handling.
 */

import { BASE_CONFIG } from '../config/base-config';
import { RuntimeConfig } from '../config/runtime-config';
import type {
  IConnectionManager,
  ILeakDetectorHandler,
  IMemoryManager,
  IProgressiveDegradation,
  IStatisticsCollector,
  MemoryLeakData,
  MemoryPressureData} from '../types';

/**
 * Memory monitoring configuration
 */
interface MemoryMonitoringConfig {
  checkInterval: number;
  pressureThreshold: number;
  criticalThreshold: number;
  cleanupInterval: number;
  gcThreshold: number;
}

/**
 * Memory statistics tracking
 */
interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  pressure: number;
  lastCleanup: number;
  cleanupCount: number;
  leakCount: number;
  gcCount: number;
}

/**
 * Main memory coordination service that integrates progressive degradation
 * and memory leak detection with cleanup scheduling and pressure handling.
 */
export class MemoryManager implements IMemoryManager {
  private progressiveDegradation: IProgressiveDegradation;
  private leakDetectorHandler: ILeakDetectorHandler;
  private runtimeConfig: RuntimeConfig;
  private connectionManager: IConnectionManager | undefined;
  private statisticsCollector: IStatisticsCollector | undefined;

  // Monitoring state
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private isShuttingDown = false;

  // Memory statistics
  private memoryStats: MemoryStats = {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    rss: 0,
    pressure: 0,
    lastCleanup: 0,
    cleanupCount: 0,
    leakCount: 0,
    gcCount: 0,
  };

  // Configuration
  private config: MemoryMonitoringConfig = {
    checkInterval: 10000, // 10 seconds
    pressureThreshold: BASE_CONFIG.HIGH_MEMORY_THRESHOLD,
    criticalThreshold: BASE_CONFIG.CRITICAL_MEMORY_THRESHOLD,
    cleanupInterval: 180000, // 3 minutes
    gcThreshold: 90, // Force GC at 90% memory usage
  };

  // Event listeners
  private readonly pressureListeners: Array<(data: MemoryPressureData) => void> = [];
  private readonly leakListeners: Array<(data: MemoryLeakData) => void> = [];

  constructor(
    progressiveDegradation: IProgressiveDegradation,
    leakDetectorHandler: ILeakDetectorHandler,
    runtimeConfig: RuntimeConfig,
    connectionManager?: IConnectionManager,
    statisticsCollector?: IStatisticsCollector
  ) {
    this.progressiveDegradation = progressiveDegradation;
    this.leakDetectorHandler = leakDetectorHandler;
    this.runtimeConfig = runtimeConfig;
    this.connectionManager = connectionManager;
    this.statisticsCollector = statisticsCollector;

    // Listen for runtime config changes to update cleanup interval
    this.runtimeConfig.addChangeListener(this.handleConfigChange.bind(this));

    // Set up process event handlers for memory events
    this.setupProcessEventHandlers();
  }

  /**
   * Start memory monitoring and cleanup scheduling
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.isShuttingDown = false;

    // Start memory pressure monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryPressure();
    }, this.config.checkInterval);

    // Start periodic cleanup
    this.scheduleCleanup();

    // Log monitoring start
    this.logDebug('Memory monitoring started');
  }

  /**
   * Stop memory monitoring and cleanup scheduling
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    this.isShuttingDown = true;

    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Perform final cleanup
    this.performCleanup();

    this.logDebug('Memory monitoring stopped');
  }

  /**
   * Perform immediate memory cleanup operations
   */
  performCleanup(): void {
    const startTime = Date.now();
    
    try {
      // Update memory stats before cleanup
      this.updateMemoryStats();

      // Perform connection cleanup if available
      if (this.connectionManager) {
        this.connectionManager.cleanup();
      }

      // Force garbage collection if available and memory pressure is high
      if (this.memoryStats.pressure >= this.config.gcThreshold && global.gc) {
        global.gc();
        this.memoryStats.gcCount++;
      }

      // Update cleanup statistics
      this.memoryStats.lastCleanup = Date.now();
      this.memoryStats.cleanupCount++;

      const duration = Date.now() - startTime;
      this.logDebug(`Memory cleanup completed in ${duration}ms`);

    } catch (error) {
      this.logError('Error during memory cleanup:', error);
    }
  }

  /**
   * Handle memory pressure events
   */
  handleMemoryPressure(data: MemoryPressureData): void {
    // Update internal pressure tracking
    this.memoryStats.pressure = (data.pressure / data.threshold) * 100;

    // Delegate to progressive degradation
    this.progressiveDegradation.handleMemoryPressure(data);

    // Trigger immediate cleanup if pressure is critical
    if (this.memoryStats.pressure >= this.config.criticalThreshold) {
      this.performCleanup();
    }

    // Notify pressure listeners
    this.notifyPressureListeners(data);

    this.logDebug(`Memory pressure handled: ${this.memoryStats.pressure.toFixed(1)}%`);
  }

  /**
   * Handle memory leak detection events
   */
  handleMemoryLeak(data: MemoryLeakData): void {
    // Update leak statistics
    this.memoryStats.leakCount++;

    // Delegate to leak detector handler
    this.leakDetectorHandler.handleMemoryLeak(data);

    // Trigger cleanup for high-severity leaks
    if (data.severity === 'high' || data.severity === 'critical') {
      this.performCleanup();
    }

    // Notify leak listeners
    this.notifyLeakListeners(data);

    this.logDebug(`Memory leak handled: ${data.severity} severity`);
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    this.updateMemoryStats();
    return { ...this.memoryStats };
  }

  /**
   * Get memory monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    isShuttingDown: boolean;
    config: MemoryMonitoringConfig;
    stats: MemoryStats;
  } {
    return {
      isMonitoring: this.isMonitoring,
      isShuttingDown: this.isShuttingDown,
      config: { ...this.config },
      stats: this.getMemoryStats(),
    };
  }

  /**
   * Add a memory pressure event listener
   */
  addPressureListener(listener: (data: MemoryPressureData) => void): void {
    this.pressureListeners.push(listener);
  }

  /**
   * Remove a memory pressure event listener
   */
  removePressureListener(listener: (data: MemoryPressureData) => void): void {
    const index = this.pressureListeners.indexOf(listener);
    if (index > -1) {
      this.pressureListeners.splice(index, 1);
    }
  }

  /**
   * Add a memory leak event listener
   */
  addLeakListener(listener: (data: MemoryLeakData) => void): void {
    this.leakListeners.push(listener);
  }

  /**
   * Remove a memory leak event listener
   */
  removeLeakListener(listener: (data: MemoryLeakData) => void): void {
    const index = this.leakListeners.indexOf(listener);
    if (index > -1) {
      this.leakListeners.splice(index, 1);
    }
  }

  /**
   * Update memory monitoring configuration
   */
  updateConfig(updates: Partial<MemoryMonitoringConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart monitoring with new configuration if currently monitoring
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Check current memory pressure and trigger events if needed
   */
  private checkMemoryPressure(): void {
    if (this.isShuttingDown) {
      return;
    }

    try {
      this.updateMemoryStats();

      const pressureData: MemoryPressureData = {
        pressure: this.memoryStats.heapUsed,
        threshold: this.memoryStats.heapTotal,
      };

      // Calculate pressure percentage
      const pressurePercentage = (pressureData.pressure / pressureData.threshold) * 100;
      this.memoryStats.pressure = pressurePercentage;

      // Trigger pressure handling if above threshold
      if (pressurePercentage >= this.config.pressureThreshold) {
        this.handleMemoryPressure(pressureData);
      }

      // Update statistics collector if available
      if (this.statisticsCollector) {
        // This would be implemented based on the statistics collector interface
        // this.statisticsCollector.updateMemoryStats(this.memoryStats);
      }

    } catch (error) {
      this.logError('Error checking memory pressure:', error);
    }
  }

  /**
   * Update internal memory statistics
   */
  private updateMemoryStats(): void {
    const memUsage = process.memoryUsage();
    
    this.memoryStats.heapUsed = memUsage.heapUsed;
    this.memoryStats.heapTotal = memUsage.heapTotal;
    this.memoryStats.external = memUsage.external;
    this.memoryStats.rss = memUsage.rss;
  }

  /**
   * Schedule periodic cleanup operations
   */
  private scheduleCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const cleanupInterval = this.runtimeConfig.get('MEMORY_CLEANUP_INTERVAL');
    
    this.cleanupInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.performCleanup();
      }
    }, cleanupInterval);
  }

  /**
   * Handle runtime configuration changes
   */
  private handleConfigChange(): void {
    // Reschedule cleanup with new interval
    if (this.isMonitoring) {
      this.scheduleCleanup();
    }
  }

  /**
   * Set up process event handlers for memory-related events
   */
  private setupProcessEventHandlers(): void {
    // Handle process warnings (including memory warnings)
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning' || 
          warning.message.includes('memory')) {
        this.logDebug(`Process warning: ${warning.message}`);
        
        // Trigger cleanup on memory-related warnings
        this.performCleanup();
      }
    });

    // Handle uncaught exceptions that might indicate memory issues
    process.on('uncaughtException', (error) => {
      if (error.message.includes('out of memory') || 
          error.message.includes('heap')) {
        this.logError('Memory-related uncaught exception:', error);
        
        // Trigger emergency cleanup
        this.performCleanup();
      }
    });
  }

  /**
   * Notify all pressure listeners
   */
  private notifyPressureListeners(data: MemoryPressureData): void {
    this.pressureListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        this.logError('Error in pressure listener:', error);
      }
    });
  }

  /**
   * Notify all leak listeners
   */
  private notifyLeakListeners(data: MemoryLeakData): void {
    this.leakListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        this.logError('Error in leak listener:', error);
      }
    });
  }

  /**
   * Cleanup resources (used during graceful shutdown)
   */
  cleanup(): void {
    this.stopMonitoring();
  }

  /**
   * Log debug messages (in production, use proper logging)
   */
  private logDebug(message: string): void {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[MemoryManager] ${message}`);
    }
  }

  /**
   * Log error messages (in production, use proper logging)
   */
  private logError(message: string, error?: unknown): void {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(`[MemoryManager] ${message}`, error);
    }
  }
}

/**
 * Factory function to create a MemoryManager instance
 */
export function createMemoryManager(
  progressiveDegradation: IProgressiveDegradation,
  leakDetectorHandler: ILeakDetectorHandler,
  runtimeConfig: RuntimeConfig,
  connectionManager?: IConnectionManager,
  statisticsCollector?: IStatisticsCollector
): MemoryManager {
  return new MemoryManager(
    progressiveDegradation,
    leakDetectorHandler,
    runtimeConfig,
    connectionManager,
    statisticsCollector
  );
}