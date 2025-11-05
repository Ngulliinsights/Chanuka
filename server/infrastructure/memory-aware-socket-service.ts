// ============================================================================
// MEMORY AWARE SOCKET SERVICE - Advanced Memory Management
// ============================================================================
// Implements intelligent memory monitoring and optimization for WebSocket connections
// Provides automatic memory optimization triggers and connection management

import { EventEmitter } from 'events';
import { logger } from '../../shared/core/src/observability/logging/index.js';
import { BatchingService, BatchableMessage } from './batching-service.js';

// cSpell:ignore Batchable BatchableMessage

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedPercentage: number;
  connectionCount: number;
  messageQueueSize: number;
  bufferSize: number;
  timestamp: number;
}

export interface MemoryThresholds {
  warning: number;      // 70%
  critical: number;     // 85%
  emergency: number;    // 95%
}

export interface OptimizationAction {
  type: 'reduce_connections' | 'clear_buffers' | 'compress_messages' | 'gc_force' | 'shed_load';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  timestamp: number;
  metricsBeforeOptimization?: MemoryMetrics;
  metricsAfterOptimization?: MemoryMetrics;
}

export interface ConnectionInfo {
  id: string;
  userId: string;
  lastActivity: number;
  messageCount: number;
  bufferSize: number;
  priority: number;
  createdAt: number;
}

export interface ServiceConfig {
  // Allow either a nested `thresholds` object or top-level shorthand properties
  thresholds?: Partial<MemoryThresholds>;
  // shorthand top-level threshold properties (convenience for callers/tests)
  warning?: number;
  critical?: number;
  emergency?: number;
  monitoringIntervalMs?: number;
  idleTimeoutMs?: number;
  maxOptimizationHistorySize?: number;
  emergencyLoadSheddingPercentage?: number;
}

/**
 * Memory monitoring and optimization service for WebSocket connections.
 * This service continuously monitors memory usage and automatically triggers
 * optimization strategies when memory pressure increases beyond defined thresholds.
 */
export class MemoryAwareSocketService extends EventEmitter {
  private readonly memoryThresholds: MemoryThresholds;
  private readonly batchingService: BatchingService;
  private readonly connections: Map<string, ConnectionInfo> = new Map();
  private readonly messageBuffers: Map<string, BatchableMessage[]> = new Map();
  private readonly config: Required<ServiceConfig>;
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcTimer: NodeJS.Timeout | null = null;
  private optimizationHistory: OptimizationAction[] = [];
  private isOptimizing = false;
  private isShuttingDown = false;

  // Memory pressure tracking
  private currentPressureLevel: 'normal' | 'warning' | 'critical' | 'emergency' = 'normal';
  private consecutiveHighMemoryReadings = 0;

  // Performance tracking with atomic operations
  private performanceMetrics = {
    optimizationsTriggered: 0,
    connectionsDropped: 0,
    buffersCleared: 0,
    gcForced: 0,
    memoryReclaimed: 0,
    lastOptimizationTimestamp: 0
  };

  constructor(
    config: ServiceConfig = {},
    batchingService?: BatchingService
  ) {
    super();

    // Set configuration with sensible defaults
    const thresholdsFromConfig: Partial<MemoryThresholds> = {
      warning: config.thresholds?.warning ?? config.warning,
      critical: config.thresholds?.critical ?? config.critical,
      emergency: config.thresholds?.emergency ?? config.emergency
    };

    // Use an explicit cast to satisfy strict TS config shape enforcement
    this.config = ({
      thresholds: thresholdsFromConfig,
      // expose shorthand properties on the final config as well
      warning: thresholdsFromConfig.warning,
      critical: thresholdsFromConfig.critical,
      emergency: thresholdsFromConfig.emergency,
      monitoringIntervalMs: config.monitoringIntervalMs || 30000,
      idleTimeoutMs: config.idleTimeoutMs || 300000,
      maxOptimizationHistorySize: config.maxOptimizationHistorySize || 100,
      emergencyLoadSheddingPercentage: config.emergencyLoadSheddingPercentage || 0.1
    } as unknown) as Required<ServiceConfig>;

    this.memoryThresholds = {
      warning: this.config.thresholds.warning || 70,
      critical: this.config.thresholds.critical || 85,
      emergency: this.config.thresholds.emergency || 95
    };

    // Validate thresholds to ensure they make logical sense
    this.validateThresholds();

    this.batchingService = batchingService || new BatchingService();

    // Start monitoring
    this.startMemoryMonitoring();

    logger.info('MemoryAwareSocketService initialized', {
      component: 'MemoryAwareSocketService',
      thresholds: this.memoryThresholds,
      config: this.config
    });
  }

  /**
   * Validates that memory thresholds are in logical order.
   * Warning < Critical < Emergency, and all values are between 0 and 100.
   */
  private validateThresholds(): void {
    const { warning, critical, emergency } = this.memoryThresholds;

    if (warning >= critical || critical >= emergency) {
      throw new Error('Memory thresholds must be in order: warning < critical < emergency');
    }

    if (warning < 0 || emergency > 100) {
      throw new Error('Memory thresholds must be between 0 and 100');
    }
  }

  /**
   * Register a new WebSocket connection for monitoring.
   * This adds the connection to our tracking system and initializes its message buffer.
   */
  registerConnection(connectionId: string, userId: string, priority: number = 1): void {
    if (this.isShuttingDown) {
      logger.warn('Cannot register connection during shutdown', {
        component: 'MemoryAwareSocketService',
        connectionId
      });
      return;
    }

    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      userId,
      lastActivity: Date.now(),
      messageCount: 0,
      bufferSize: 0,
      priority: Math.max(1, Math.min(10, priority)), // Clamp priority between 1-10
      createdAt: Date.now()
    };

    this.connections.set(connectionId, connectionInfo);
    this.messageBuffers.set(connectionId, []);

    logger.debug('Connection registered', {
      component: 'MemoryAwareSocketService',
      connectionId,
      userId,
      priority: connectionInfo.priority,
      totalConnections: this.connections.size
    });

    // Check if we're approaching connection limits
    this.checkConnectionLimits();
  }

  /**
   * Unregister a connection and clean up its associated resources.
   * This properly releases memory by removing buffers and connection info.
   */
  unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Clean up message buffer first to release memory
    const buffer = this.messageBuffers.get(connectionId);
    if (buffer) {
      buffer.length = 0; // Clear the array
    }

    this.connections.delete(connectionId);
    this.messageBuffers.delete(connectionId);

    logger.debug('Connection unregistered', {
      component: 'MemoryAwareSocketService',
      connectionId,
      userId: connection.userId,
      totalConnections: this.connections.size
    });
  }

  /**
   * Update the last activity timestamp for a connection.
   * This helps identify idle connections during optimization.
   */
  updateConnectionActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
      connection.messageCount++;
    }
  }

  /**
   * Set the priority level for a connection.
   * Higher priority connections are less likely to be dropped during optimization.
   */
  setConnectionPriority(connectionId: string, priority: number): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.priority = Math.max(1, Math.min(10, priority));
      
      logger.debug('Connection priority updated', {
        component: 'MemoryAwareSocketService',
        connectionId,
        priority: connection.priority
      });
    }
  }

  /**
   * Add a message to a connection's buffer.
   * Returns false if the buffer is full or connection doesn't exist.
   */
  bufferMessage(connectionId: string, message: BatchableMessage): boolean {
    const buffer = this.messageBuffers.get(connectionId);
    const connection = this.connections.get(connectionId);

    if (!buffer || !connection) {
      return false;
    }

    // Determine buffer size limit based on current memory pressure
    const maxBufferSize = this.getMaxBufferSize();
    
    if (buffer.length >= maxBufferSize) {
      // Drop oldest message when buffer is full (FIFO eviction)
      buffer.shift();
      
      logger.warn('Message buffer full, dropping oldest message', {
        component: 'MemoryAwareSocketService',
        connectionId,
        bufferSize: buffer.length,
        maxBufferSize,
        pressureLevel: this.currentPressureLevel
      });
    }

    buffer.push(message);
    connection.bufferSize = buffer.length;
    
    // Update activity since buffering a message counts as activity
    this.updateConnectionActivity(connectionId);

    return true;
  }

  /**
   * Retrieve and clear messages from a connection's buffer.
   * This is useful for batch processing messages.
   */
  flushBuffer(connectionId: string): BatchableMessage[] {
    const buffer = this.messageBuffers.get(connectionId);
    const connection = this.connections.get(connectionId);

    if (!buffer || !connection) {
      return [];
    }

    const messages = [...buffer];
    buffer.length = 0;
    connection.bufferSize = 0;

    return messages;
  }

  /**
   * Get current memory metrics snapshot.
   * This provides a complete picture of memory usage and connection state.
   */
  getMemoryMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const totalBufferSize = Array.from(this.messageBuffers.values())
      .reduce((total, buffer) => total + buffer.length, 0);

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      heapUsedPercentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      connectionCount: this.connections.size,
      messageQueueSize: totalBufferSize,
      bufferSize: totalBufferSize * 1024, // Rough estimate in bytes
      timestamp: Date.now()
    };
  }

  /**
   * Manually trigger memory optimization with specified severity.
   * This can be called externally when you detect memory issues.
   */
  async forceOptimization(severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    if (this.isOptimizing) {
      logger.warn('Optimization already in progress, skipping', {
        component: 'MemoryAwareSocketService'
      });
      return;
    }

    if (this.isShuttingDown) {
      logger.warn('Cannot optimize during shutdown', {
        component: 'MemoryAwareSocketService'
      });
      return;
    }

    this.isOptimizing = true;

    try {
      const beforeMetrics = this.getMemoryMetrics();
      
      logger.info('Starting forced memory optimization', {
        component: 'MemoryAwareSocketService',
        severity,
        beforeMetrics: {
          heapUsedPercentage: beforeMetrics.heapUsedPercentage.toFixed(2),
          connectionCount: beforeMetrics.connectionCount,
          messageQueueSize: beforeMetrics.messageQueueSize
        }
      });

      await this.performOptimization(severity, beforeMetrics);

      // Allow some time for GC to run before measuring again
      await this.delay(100);

      const afterMetrics = this.getMemoryMetrics();
      const memoryReclaimed = Math.max(0, beforeMetrics.heapUsed - afterMetrics.heapUsed);

      this.performanceMetrics.memoryReclaimed += memoryReclaimed;
      this.performanceMetrics.lastOptimizationTimestamp = Date.now();

      logger.info('Forced optimization completed', {
        component: 'MemoryAwareSocketService',
        memoryReclaimed: `${(memoryReclaimed / 1024 / 1024).toFixed(2)} MB`,
        afterMetrics: {
          heapUsedPercentage: afterMetrics.heapUsedPercentage.toFixed(2),
          connectionCount: afterMetrics.connectionCount,
          messageQueueSize: afterMetrics.messageQueueSize
        }
      });

    } catch (error) {
      logger.error('Error during forced optimization', {
        component: 'MemoryAwareSocketService',
        error
      });
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Get the history of optimization actions taken.
   * Useful for debugging and understanding optimization patterns.
   */
  getOptimizationHistory(): readonly OptimizationAction[] {
    return Object.freeze([...this.optimizationHistory]);
  }

  /**
   * Get current performance metrics.
   * Returns a copy to prevent external modification.
   */
  getPerformanceMetrics(): Readonly<typeof this.performanceMetrics> {
    return Object.freeze({ ...this.performanceMetrics });
  }

  /**
   * Get current memory pressure level.
   */
  getCurrentPressureLevel(): string {
    return this.currentPressureLevel;
  }

  /**
   * Shutdown the service gracefully.
   * Stops monitoring, cleans up resources, and shuts down dependencies.
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    logger.info('Shutting down MemoryAwareSocketService', {
      component: 'MemoryAwareSocketService'
    });

    // Stop monitoring interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Stop GC timer
    if (this.gcTimer) {
      clearTimeout(this.gcTimer);
      this.gcTimer = null;
    }

    // Wait for any ongoing optimization to complete
    let waitCount = 0;
    while (this.isOptimizing && waitCount < 50) {
      await this.delay(100);
      waitCount++;
    }

    // Clean up all connections and buffers
    for (const connectionId of this.connections.keys()) {
      this.unregisterConnection(connectionId);
    }

    // Shutdown batching service
    await this.batchingService.shutdown();

    // Remove all listeners to prevent memory leaks
    this.removeAllListeners();

    logger.info('MemoryAwareSocketService shutdown complete', {
      component: 'MemoryAwareSocketService',
      finalMetrics: this.getPerformanceMetrics()
    });
  }

  /**
   * Start periodic memory monitoring.
   * This runs in the background and triggers optimizations as needed.
   */
  private startMemoryMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.checkMemoryUsage().catch(error => {
          logger.error('Error in memory monitoring', {
            component: 'MemoryAwareSocketService',
            error
          });
        });
      }
    }, this.config.monitoringIntervalMs);

    logger.info('Memory monitoring started', {
      component: 'MemoryAwareSocketService',
      interval: `${this.config.monitoringIntervalMs}ms`
    });
  }

  /**
   * Check current memory usage and update pressure level.
   * Triggers automatic optimization when thresholds are exceeded.
   */
  private async checkMemoryUsage(): Promise<void> {
    const metrics = this.getMemoryMetrics();
    const heapPercentage = metrics.heapUsedPercentage;

    // Determine current pressure level based on thresholds
    const previousLevel = this.currentPressureLevel;
    
    if (heapPercentage >= this.memoryThresholds.emergency) {
      this.currentPressureLevel = 'emergency';
      this.consecutiveHighMemoryReadings++;
    } else if (heapPercentage >= this.memoryThresholds.critical) {
      this.currentPressureLevel = 'critical';
      this.consecutiveHighMemoryReadings++;
    } else if (heapPercentage >= this.memoryThresholds.warning) {
      this.currentPressureLevel = 'warning';
      this.consecutiveHighMemoryReadings++;
    } else {
      this.currentPressureLevel = 'normal';
      this.consecutiveHighMemoryReadings = 0;
    }

    // Emit event when pressure level changes
    if (previousLevel !== this.currentPressureLevel) {
      this.emit('memoryPressureChange', {
        previous: previousLevel,
        current: this.currentPressureLevel,
        metrics
      });

      logger.info('Memory pressure level changed', {
        component: 'MemoryAwareSocketService',
        previous: previousLevel,
        current: this.currentPressureLevel,
        heapPercentage: heapPercentage.toFixed(2),
        consecutiveReadings: this.consecutiveHighMemoryReadings
      });
    }

    // Trigger optimization if conditions are met
    if (this.shouldTriggerOptimization()) {
      await this.triggerAutomaticOptimization();
    }

    // Always emit metrics for external monitoring systems
    this.emit('memoryMetrics', metrics);
  }

  /**
   * Determine if optimization should be triggered based on current conditions.
   * Uses both pressure level and consecutive reading count to avoid false positives.
   */
  private shouldTriggerOptimization(): boolean {
    // Don't trigger if already optimizing or shutting down
    if (this.isOptimizing || this.isShuttingDown) {
      return false;
    }

    // Emergency: trigger immediately
    if (this.currentPressureLevel === 'emergency') {
      return true;
    }

    // Critical: trigger after 2 consecutive readings to confirm the issue
    if (this.currentPressureLevel === 'critical' && this.consecutiveHighMemoryReadings >= 2) {
      return true;
    }

    // Warning: trigger after 5 consecutive readings to avoid unnecessary optimization
    if (this.currentPressureLevel === 'warning' && this.consecutiveHighMemoryReadings >= 5) {
      return true;
    }

    return false;
  }

  /**
   * Trigger automatic optimization based on current pressure level.
   * Maps pressure levels to appropriate optimization severity.
   */
  private async triggerAutomaticOptimization(): Promise<void> {
    const severityMap = {
      emergency: 'critical' as const,
      critical: 'high' as const,
      warning: 'medium' as const,
      normal: 'low' as const
    };

    const severity = severityMap[this.currentPressureLevel];

    logger.warn('Triggering automatic memory optimization', {
      component: 'MemoryAwareSocketService',
      pressureLevel: this.currentPressureLevel,
      severity,
      consecutiveReadings: this.consecutiveHighMemoryReadings,
      connectionCount: this.connections.size
    });

    await this.forceOptimization(severity);
  }

  /**
   * Perform a series of optimization actions based on severity.
   * Higher severity levels trigger more aggressive optimization strategies.
   */
  private async performOptimization(
    severity: 'low' | 'medium' | 'high' | 'critical',
    beforeMetrics: MemoryMetrics
  ): Promise<void> {
    const actions: OptimizationAction[] = [];

    // Level 1 (All severities): Clear message buffers
    // This is the least disruptive action - pending messages are lost but connections remain
    if (severity === 'low' || severity === 'medium' || severity === 'high' || severity === 'critical') {
      actions.push(await this.clearMessageBuffers());
    }

    // Level 2 (Medium+): Optimize message batching
    // This reduces memory usage by adjusting batch parameters
    if (severity === 'medium' || severity === 'high' || severity === 'critical') {
      actions.push(await this.optimizeMessageBatching());
    }

    // Level 3 (High+): Drop idle connections
    // More aggressive - disconnects inactive users
    if (severity === 'high' || severity === 'critical') {
      actions.push(await this.dropIdleConnections());
    }

    // Level 4 (Critical only): Emergency measures
    // Most aggressive - forces GC and drops active connections if needed
    if (severity === 'critical') {
      actions.push(await this.forceGarbageCollection());
      actions.push(await this.emergencyLoadShedding());
    }

    // Allow time for garbage collection to run
    await this.delay(100);

    // Capture metrics after optimization
    const afterMetrics = this.getMemoryMetrics();
    
    // Add metrics to all actions
    actions.forEach(action => {
      action.metricsBeforeOptimization = beforeMetrics;
      action.metricsAfterOptimization = afterMetrics;
    });

    // Record actions in history
    this.optimizationHistory.push(...actions);
    this.performanceMetrics.optimizationsTriggered++;

    // Limit history size to prevent unbounded growth
    if (this.optimizationHistory.length > this.config.maxOptimizationHistorySize) {
      this.optimizationHistory = this.optimizationHistory.slice(-this.config.maxOptimizationHistorySize);
    }

    logger.info('Memory optimization completed', {
      component: 'MemoryAwareSocketService',
      severity,
      actionsPerformed: actions.length,
      actions: actions.map(a => a.type),
      memoryChange: {
        before: beforeMetrics.heapUsedPercentage.toFixed(2),
        after: afterMetrics.heapUsedPercentage.toFixed(2)
      }
    });
  }

  /**
   * Clear all message buffers to free up memory.
   * This is the gentlest optimization - no connections are dropped.
   */
  private async clearMessageBuffers(): Promise<OptimizationAction> {
    let buffersCleared = 0;
    let messagesCleared = 0;

    for (const [connectionId, buffer] of this.messageBuffers.entries()) {
      if (buffer.length > 0) {
        messagesCleared += buffer.length;
        buffer.length = 0; // Clear the array
        buffersCleared++;

        // Update connection buffer size tracking
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.bufferSize = 0;
        }
      }
    }

    this.performanceMetrics.buffersCleared += buffersCleared;

    return {
      type: 'clear_buffers',
      severity: 'low',
      description: `Cleared ${buffersCleared} message buffers (${messagesCleared} messages)`,
      impact: 'Pending messages lost, connections remain active',
      timestamp: Date.now()
    };
  }

  /**
   * Optimize batching service configuration for memory efficiency.
   * Reduces batch sizes and delays to lower memory footprint.
   */
  private async optimizeMessageBatching(): Promise<OptimizationAction> {
    // Reduce batch size and delay by 50% to use less memory
    this.batchingService.updateConfig({
      maxBatchSize: Math.max(1, Math.floor(10 * 0.5)),
      maxBatchDelay: Math.max(10, Math.floor(50 * 0.5)),
      compressionEnabled: true
    });

    return {
      type: 'compress_messages',
      severity: 'medium',
      description: 'Optimized message batching configuration for memory efficiency',
      impact: 'Reduced memory usage, slightly increased CPU usage for compression',
      timestamp: Date.now()
    };
  }

  /**
   * Drop idle connections to reduce memory usage.
   * Only drops low-priority connections that haven't been active recently.
   */
  private async dropIdleConnections(): Promise<OptimizationAction> {
    const now = Date.now();
    const idleThreshold = this.config.idleTimeoutMs;
    const connectionsToDrop: string[] = [];

    // Find connections that are both idle AND low priority
    for (const [connectionId, connection] of this.connections.entries()) {
      const isIdle = (now - connection.lastActivity) > idleThreshold;
      const isLowPriority = connection.priority < 5;
      
      if (isIdle && isLowPriority) {
        connectionsToDrop.push(connectionId);
      }
    }

    // Emit event for each connection to be dropped (actual disconnection happens externally)
    for (const connectionId of connectionsToDrop) {
      this.emit('dropConnection', {
        connectionId,
        reason: 'idle_timeout',
        severity: 'high'
      });
      this.unregisterConnection(connectionId);
    }

    this.performanceMetrics.connectionsDropped += connectionsToDrop.length;

    return {
      type: 'reduce_connections',
      severity: 'high',
      description: `Dropped ${connectionsToDrop.length} idle low-priority connections`,
      impact: 'Idle users disconnected, active and high-priority users unaffected',
      timestamp: Date.now()
    };
  }

  /**
   * Force garbage collection if available.
   * Requires Node.js to be started with --expose-gc flag.
   */
  private async forceGarbageCollection(): Promise<OptimizationAction> {
    if (global.gc) {
      global.gc();
      this.performanceMetrics.gcForced++;

      // Schedule another GC in 30 seconds if we're still under pressure
      if (this.gcTimer) {
        clearTimeout(this.gcTimer);
      }
      
      this.gcTimer = setTimeout(() => {
        if ((this.currentPressureLevel === 'critical' || 
             this.currentPressureLevel === 'emergency') && 
            global.gc && 
            !this.isShuttingDown) {
          global.gc();
          logger.debug('Scheduled garbage collection executed', {
            component: 'MemoryAwareSocketService'
          });
        }
      }, 30000);

      return {
        type: 'gc_force',
        severity: 'critical',
        description: 'Forced garbage collection executed successfully',
        impact: 'Temporary performance impact, memory reclaimed',
        timestamp: Date.now()
      };
    }

    return {
      type: 'gc_force',
      severity: 'critical',
      description: 'Garbage collection not available (start Node with --expose-gc)',
      impact: 'No action taken - GC flag not enabled',
      timestamp: Date.now()
    };
  }

  /**
   * Emergency load shedding - drop a percentage of connections.
   * This is the most aggressive strategy, used only in emergency situations.
   * Drops connections starting with lowest priority and least recent activity.
   */
  private async emergencyLoadShedding(): Promise<OptimizationAction> {
    const connectionsToShed = Math.ceil(
      this.connections.size * this.config.emergencyLoadSheddingPercentage
    );
    
    if (connectionsToShed === 0) {
      return {
        type: 'shed_load',
        severity: 'critical',
        description: 'No connections to shed (connection count too low)',
        impact: 'No action taken',
        timestamp: Date.now()
      };
    }

    const connectionIds = Array.from(this.connections.keys());
    
    // Sort connections by priority (ascending) and last activity (ascending)
    // This ensures we drop the least important, least active connections first
    connectionIds.sort((a, b) => {
      const connA = this.connections.get(a)!;
      const connB = this.connections.get(b)!;
      
      // First sort by priority (lower priority dropped first)
      if (connA.priority !== connB.priority) {
        return connA.priority - connB.priority;
      }
      
      // Then sort by last activity (older activity dropped first)
      return connA.lastActivity - connB.lastActivity;
    });

    // Drop the calculated number of connections
    const droppedConnections: string[] = [];
    for (let i = 0; i < connectionsToShed && i < connectionIds.length; i++) {
      const connectionId = connectionIds[i];
      if (!connectionId) continue; // guard against undefined when using --noUncheckedIndexedAccess

      droppedConnections.push(connectionId);

      this.emit('dropConnection', {
        connectionId,
        reason: 'emergency_load_shedding',
        severity: 'critical'
      });

      this.unregisterConnection(connectionId);
    }

    this.performanceMetrics.connectionsDropped += droppedConnections.length;

    return {
      type: 'shed_load',
      severity: 'critical',
      description: `Emergency load shedding: dropped ${droppedConnections.length} connections (${(this.config.emergencyLoadSheddingPercentage * 100).toFixed(0)}% of total)`,
      impact: 'Service degradation - users disconnected to prevent system failure',
      timestamp: Date.now()
    };
  }

  /**
   * Check if we've exceeded connection limits and trigger optimization if needed.
   */
  private checkConnectionLimits(): void {
    const maxConnections = this.getMaxConnections();
    
    if (this.connections.size > maxConnections) {
      logger.warn('Connection limit exceeded, scheduling optimization', {
        component: 'MemoryAwareSocketService',
        currentConnections: this.connections.size,
        maxConnections,
        pressureLevel: this.currentPressureLevel
      });

      // Trigger optimization asynchronously to avoid blocking registration
      setImmediate(() => {
        if (!this.isOptimizing && !this.isShuttingDown) {
          this.forceOptimization('medium').catch(error => {
            logger.error('Error during connection limit optimization', {
              component: 'MemoryAwareSocketService',
              error
            });
          });
        }
      });
    }
  }

  /**
   * Get maximum buffer size based on current memory pressure.
   * Higher pressure = smaller buffers to conserve memory.
   */
  private getMaxBufferSize(): number {
    switch (this.currentPressureLevel) {
      case 'emergency':
        return 1;
      case 'critical':
        return 5;
      case 'warning':
        return 20;
      default:
        return 50;
    }
  }

  /**
   * Get maximum allowed connections based on current memory pressure.
   * Higher pressure = fewer connections allowed.
   */
  private getMaxConnections(): number {
    switch (this.currentPressureLevel) {
      case 'emergency':
        return 1000;
      case 'critical':
        return 5000;
      case 'warning':
        return 8000;
      default:
        return 10000;
    }
  }

  /**
   * Utility function to create a promise-based delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection information for a specific connection.
   */
  getConnectionInfo(connectionId: string): ConnectionInfo | undefined {
    const connection = this.connections.get(connectionId);
    return connection ? { ...connection } : undefined;
  }

  /**
   * Get all active connections.
   * Returns a copy to prevent external modification.
   */
  getAllConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values()).map(conn => ({ ...conn }));
  }

  /**
   * Get connections sorted by priority and activity.
   * Useful for understanding which connections are most/least important.
   */
  getConnectionsByPriority(): ConnectionInfo[] {
    return this.getAllConnections().sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return b.lastActivity - a.lastActivity; // More recent activity first
    });
  }

  /**
   * Get buffer statistics across all connections.
   */
  getBufferStatistics(): {
    totalMessages: number;
    averageBufferSize: number;
    largestBuffer: number;
    emptyBuffers: number;
  } {
    let totalMessages = 0;
    let largestBuffer = 0;
    let emptyBuffers = 0;

    for (const buffer of this.messageBuffers.values()) {
      const bufferSize = buffer.length;
      totalMessages += bufferSize;
      
      if (bufferSize === 0) {
        emptyBuffers++;
      }
      
      if (bufferSize > largestBuffer) {
        largestBuffer = bufferSize;
      }
    }

    const activeConnections = this.connections.size;
    const averageBufferSize = activeConnections > 0 ? totalMessages / activeConnections : 0;

    return {
      totalMessages,
      averageBufferSize,
      largestBuffer,
      emptyBuffers
    };
  }

  /**
   * Health check method - returns service health status.
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical' | 'emergency';
    pressureLevel: string;
    metrics: MemoryMetrics;
    isOptimizing: boolean;
    consecutiveHighReadings: number;
  } {
    const metrics = this.getMemoryMetrics();
    
    let status: 'healthy' | 'degraded' | 'critical' | 'emergency';
    switch (this.currentPressureLevel) {
      case 'emergency':
        status = 'emergency';
        break;
      case 'critical':
        status = 'critical';
        break;
      case 'warning':
        status = 'degraded';
        break;
      default:
        status = 'healthy';
    }

    return {
      status,
      pressureLevel: this.currentPressureLevel,
      metrics,
      isOptimizing: this.isOptimizing,
      consecutiveHighReadings: this.consecutiveHighMemoryReadings
    };
  }
}