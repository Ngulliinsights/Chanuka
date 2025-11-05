// ============================================================================
// WEBSOCKET CONFIGURATION - Integration Configuration
// ============================================================================
// Configuration for integrating BatchingService and MemoryAwareSocketService
// with the existing WebSocket infrastructure

import { BatchingService, BatchingConfig } from './batching-service.js';
import { MemoryAwareSocketService, MemoryThresholds } from './memory-aware-socket-service.js';
import { logger } from '../../shared/core/src/observability/logging/index.js';

export interface WebSocketServiceConfig {
  batching: Partial<BatchingConfig>;
  memory: Partial<MemoryThresholds>;
  performance: {
    maxConnections: number;
    connectionTimeout: number;
    heartbeatInterval: number;
    messageQueueLimit: number;
  };
  monitoring: {
    metricsInterval: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enablePerformanceTracking: boolean;
  };
}

/**
 * Default configuration for WebSocket services
 */
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketServiceConfig = {
  batching: {
    maxBatchSize: 10,
    maxBatchDelay: 50,
    priorityThreshold: 5,
    memoryThreshold: 85,
    compressionEnabled: true
  },
  memory: {
    warning: 70,
    critical: 85,
    emergency: 95
  },
  performance: {
    maxConnections: 10000,
    connectionTimeout: 30000,
    heartbeatInterval: 30000,
    messageQueueLimit: 1000
  },
  monitoring: {
    metricsInterval: 60000, // 1 minute
    logLevel: 'info',
    enablePerformanceTracking: true
  }
};

/**
 * Production configuration with optimized settings
 */
export const PRODUCTION_WEBSOCKET_CONFIG: WebSocketServiceConfig = {
  batching: {
    maxBatchSize: 15,
    maxBatchDelay: 30,
    priorityThreshold: 7,
    memoryThreshold: 80,
    compressionEnabled: true
  },
  memory: {
    warning: 65,
    critical: 80,
    emergency: 90
  },
  performance: {
    maxConnections: 15000,
    connectionTimeout: 60000,
    heartbeatInterval: 25000,
    messageQueueLimit: 2000
  },
  monitoring: {
    metricsInterval: 30000, // 30 seconds
    logLevel: 'warn',
    enablePerformanceTracking: true
  }
};

/**
 * Development configuration with verbose logging
 */
export const DEVELOPMENT_WEBSOCKET_CONFIG: WebSocketServiceConfig = {
  batching: {
    maxBatchSize: 5,
    maxBatchDelay: 100,
    priorityThreshold: 3,
    memoryThreshold: 90,
    compressionEnabled: false // Easier debugging
  },
  memory: {
    warning: 75,
    critical: 90,
    emergency: 98
  },
  performance: {
    maxConnections: 1000,
    connectionTimeout: 10000,
    heartbeatInterval: 60000,
    messageQueueLimit: 500
  },
  monitoring: {
    metricsInterval: 10000, // 10 seconds
    logLevel: 'debug',
    enablePerformanceTracking: true
  }
};

/**
 * WebSocket Service Manager - Coordinates all WebSocket services
 */
export class WebSocketServiceManager {
  private batchingService: BatchingService;
  private memoryService: MemoryAwareSocketService;
  private config: WebSocketServiceConfig;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<WebSocketServiceConfig> = {}) {
    this.config = this.mergeConfig(config);
    
    // Initialize services
    this.batchingService = new BatchingService(this.config.batching);
    this.memoryService = new MemoryAwareSocketService(
      this.config.memory,
      this.batchingService
    );

    this.setupEventHandlers();
  }

  /**
   * Initialize the WebSocket service manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('WebSocketServiceManager already initialized');
      return;
    }

    logger.info('Initializing WebSocket Service Manager', {
      component: 'WebSocketServiceManager',
      config: this.config
    });

    // Start monitoring if enabled
    if (this.config.monitoring.enablePerformanceTracking) {
      this.startPerformanceMonitoring();
    }

    this.isInitialized = true;

    logger.info('WebSocket Service Manager initialized successfully', {
      component: 'WebSocketServiceManager'
    });
  }

  /**
   * Get the batching service instance
   */
  getBatchingService(): BatchingService {
    return this.batchingService;
  }

  /**
   * Get the memory service instance
   */
  getMemoryService(): MemoryAwareSocketService {
    return this.memoryService;
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<WebSocketServiceConfig>): void {
    const oldConfig = { ...this.config };
    this.config = this.mergeConfig(newConfig);

    // Update service configurations
    if (newConfig.batching) {
      this.batchingService.updateConfig(newConfig.batching);
    }

    logger.info('WebSocket configuration updated', {
      component: 'WebSocketServiceManager',
      oldConfig,
      newConfig: this.config
    });
  }

  /**
   * Get current performance metrics from all services
   */
  getPerformanceMetrics() {
    return {
      batching: this.batchingService.getMetrics(),
      memory: {
        metrics: this.memoryService.getMemoryMetrics(),
        performance: this.memoryService.getPerformanceMetrics(),
        optimizationHistory: this.memoryService.getOptimizationHistory().slice(-10) // Last 10 optimizations
      },
      config: this.config
    };
  }

  /**
   * Handle connection registration
   */
  registerConnection(connectionId: string, userId: string): void {
    this.memoryService.registerConnection(connectionId, userId);
    
    logger.debug('Connection registered with service manager', {
      component: 'WebSocketServiceManager',
      connectionId,
      userId
    });
  }

  /**
   * Handle connection unregistration
   */
  unregisterConnection(connectionId: string): void {
    this.memoryService.unregisterConnection(connectionId);
    
    logger.debug('Connection unregistered from service manager', {
      component: 'WebSocketServiceManager',
      connectionId
    });
  }

  /**
   * Queue a message for batched delivery
   */
  queueMessage(
    userId: string,
    message: any,
    deliveryCallback: (batch: any[]) => Promise<void>
  ): boolean {
    return this.batchingService.queueMessage(userId, message, deliveryCallback);
  }

  /**
   * Force memory optimization
   */
  async forceMemoryOptimization(severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    await this.memoryService.forceOptimization(severity);
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket Service Manager', {
      component: 'WebSocketServiceManager'
    });

    // Stop monitoring
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Shutdown services
    await Promise.all([
      this.batchingService.shutdown(),
      this.memoryService.shutdown()
    ]);

    this.isInitialized = false;

    logger.info('WebSocket Service Manager shutdown complete', {
      component: 'WebSocketServiceManager'
    });
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: Partial<WebSocketServiceConfig>): WebSocketServiceConfig {
    const baseConfig = process.env.NODE_ENV === 'production' 
      ? PRODUCTION_WEBSOCKET_CONFIG 
      : process.env.NODE_ENV === 'development'
      ? DEVELOPMENT_WEBSOCKET_CONFIG
      : DEFAULT_WEBSOCKET_CONFIG;

    return {
      batching: { ...baseConfig.batching, ...config.batching },
      memory: { ...baseConfig.memory, ...config.memory },
      performance: { ...baseConfig.performance, ...config.performance },
      monitoring: { ...baseConfig.monitoring, ...config.monitoring }
    };
  }

  /**
   * Setup event handlers for service coordination
   */
  private setupEventHandlers(): void {
    // Handle memory pressure events
    this.memoryService.on('memoryPressureChange', (event) => {
      logger.info('Memory pressure change detected', {
        component: 'WebSocketServiceManager',
        event
      });

      // Adjust batching configuration based on memory pressure
      this.adjustBatchingForMemoryPressure(event.current);
    });

    // Handle connection drops
    this.memoryService.on('dropConnection', (connectionId) => {
      logger.warn('Connection dropped due to memory optimization', {
        component: 'WebSocketServiceManager',
        connectionId
      });
    });

    // Handle memory metrics
    this.memoryService.on('memoryMetrics', (metrics) => {
      if (this.config.monitoring.logLevel === 'debug') {
        logger.debug('Memory metrics update', {
          component: 'WebSocketServiceManager',
          metrics
        });
      }
    });
  }

  /**
   * Adjust batching configuration based on memory pressure
   */
  private adjustBatchingForMemoryPressure(pressureLevel: string): void {
    let batchingAdjustments: Partial<BatchingConfig> = {};

    switch (pressureLevel) {
      case 'emergency':
        batchingAdjustments = {
          maxBatchSize: 1,
          maxBatchDelay: 10,
          compressionEnabled: false // Reduce CPU overhead
        };
        break;
      case 'critical':
        batchingAdjustments = {
          maxBatchSize: Math.max(1, Math.floor((this.config.batching.maxBatchSize || 10) * 0.3)),
          maxBatchDelay: Math.max(10, Math.floor((this.config.batching.maxBatchDelay || 50) * 0.5)),
          compressionEnabled: true
        };
        break;
      case 'warning':
        batchingAdjustments = {
          maxBatchSize: Math.max(1, Math.floor((this.config.batching.maxBatchSize || 10) * 0.7)),
          maxBatchDelay: Math.max(20, Math.floor((this.config.batching.maxBatchDelay || 50) * 0.8)),
          compressionEnabled: true
        };
        break;
      case 'normal':
        // Reset to original configuration
        batchingAdjustments = { ...this.config.batching };
        break;
    }

    if (Object.keys(batchingAdjustments).length > 0) {
      this.batchingService.updateConfig(batchingAdjustments);
      
      logger.info('Batching configuration adjusted for memory pressure', {
        component: 'WebSocketServiceManager',
        pressureLevel,
        adjustments: batchingAdjustments
      });
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      
      logger.info('WebSocket performance metrics', {
        component: 'WebSocketServiceManager',
        metrics
      });

      // Check for performance issues
      this.checkPerformanceThresholds(metrics);
      
    }, this.config.monitoring.metricsInterval);

    logger.info('Performance monitoring started', {
      component: 'WebSocketServiceManager',
      interval: this.config.monitoring.metricsInterval
    });
  }

  /**
   * Check performance thresholds and trigger optimizations
   */
  private checkPerformanceThresholds(metrics: any): void {
    const memoryMetrics = metrics.memory.metrics;
    
    // Check connection count
    if (memoryMetrics.connectionCount > this.config.performance.maxConnections * 0.9) {
      logger.warn('Connection count approaching limit', {
        component: 'WebSocketServiceManager',
        currentConnections: memoryMetrics.connectionCount,
        limit: this.config.performance.maxConnections
      });
    }

    // Check message queue size
    if (memoryMetrics.messageQueueSize > this.config.performance.messageQueueLimit * 0.8) {
      logger.warn('Message queue size high', {
        component: 'WebSocketServiceManager',
        queueSize: memoryMetrics.messageQueueSize,
        limit: this.config.performance.messageQueueLimit
      });
    }

    // Check memory usage
    if (memoryMetrics.heapUsedPercentage > this.config.memory.warning!) {
      logger.warn('Memory usage above warning threshold', {
        component: 'WebSocketServiceManager',
        heapUsedPercentage: memoryMetrics.heapUsedPercentage,
        threshold: this.config.memory.warning
      });
    }
  }
}

// Export singleton instance
export const webSocketServiceManager = new WebSocketServiceManager();