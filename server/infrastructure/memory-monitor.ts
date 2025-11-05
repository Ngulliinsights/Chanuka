/**
 * Memory Monitor for Socket.IO Service
 * 
 * Provides memory management and connection monitoring capabilities
 * with automatic optimization triggers.
 */

import { EventEmitter } from 'events';
import { logger } from '@shared/core/observability/logging/index.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedPercent: number;
  timestamp: Date;
}

interface ConnectionMetrics {
  activeConnections: number;
  totalConnections: number;
  connectionsPerSecond: number;
  disconnectionsPerSecond: number;
  averageConnectionDuration: number;
  timestamp: Date;
}

interface MemoryThresholds {
  warning: number;    // 75%
  critical: number;   // 85%
  emergency: number;  // 95%
}

interface OptimizationAction {
  type: 'cleanup' | 'gc' | 'throttle' | 'disconnect';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  executed: boolean;
  timestamp: Date;
}

// ============================================================================
// MEMORY MONITOR
// ============================================================================

export class MemoryMonitor extends EventEmitter {
  private metrics: MemoryMetrics[] = [];
  private connectionMetrics: ConnectionMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private optimizationActions: OptimizationAction[] = [];
  
  private readonly thresholds: MemoryThresholds = {
    warning: 75,
    critical: 85,
    emergency: 95
  };

  private readonly maxMetricsHistory = 100;
  private readonly monitoringIntervalMs = 10000; // 10 seconds

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for memory monitoring
   */
  private setupEventHandlers(): void {
    this.on('memory:warning', (metrics: MemoryMetrics) => {
      logger.warn('Memory usage warning threshold reached', {
        component: 'MemoryMonitor',
        heapUsedPercent: metrics.heapUsedPercent.toFixed(2) + '%',
        heapUsed: `${(metrics.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        threshold: this.thresholds.warning + '%'
      });
      this.triggerOptimization('low');
    });

    this.on('memory:critical', (metrics: MemoryMetrics) => {
      logger.error('Memory usage critical threshold reached', {
        component: 'MemoryMonitor',
        heapUsedPercent: metrics.heapUsedPercent.toFixed(2) + '%',
        heapUsed: `${(metrics.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        threshold: this.thresholds.critical + '%'
      });
      this.triggerOptimization('high');
    });

    this.on('memory:emergency', (metrics: MemoryMetrics) => {
      logger.error('🚨 EMERGENCY: Memory usage emergency threshold reached', {
        component: 'MemoryMonitor',
        heapUsedPercent: metrics.heapUsedPercent.toFixed(2) + '%',
        heapUsed: `${(metrics.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        threshold: this.thresholds.emergency + '%'
      });
      this.triggerOptimization('critical');
    });

    this.on('optimization:triggered', (action: OptimizationAction) => {
      logger.info(`Memory optimization triggered: ${action.type}`, {
        component: 'MemoryMonitor',
        severity: action.severity,
        description: action.description
      });
    });
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Memory monitoring already started', {
        component: 'MemoryMonitor'
      });
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.monitoringIntervalMs);

    logger.info('Memory monitoring started', {
      component: 'MemoryMonitor',
      interval: this.monitoringIntervalMs,
      thresholds: this.thresholds
    });
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Memory monitoring stopped', {
      component: 'MemoryMonitor'
    });
  }

  /**
   * Collect current memory metrics
   */
  private collectMetrics(): void {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const metrics: MemoryMetrics = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      heapUsedPercent,
      timestamp: new Date()
    };

    // Add to metrics history
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Check thresholds and emit events
    this.checkThresholds(metrics);
  }

  /**
   * Check memory thresholds and emit appropriate events
   */
  private checkThresholds(metrics: MemoryMetrics): void {
    if (metrics.heapUsedPercent >= this.thresholds.emergency) {
      this.emit('memory:emergency', metrics);
    } else if (metrics.heapUsedPercent >= this.thresholds.critical) {
      this.emit('memory:critical', metrics);
    } else if (metrics.heapUsedPercent >= this.thresholds.warning) {
      this.emit('memory:warning', metrics);
    }
  }

  /**
   * Record connection metrics
   */
  recordConnectionMetrics(activeConnections: number, totalConnections: number): void {
    const now = new Date();
    
    // Calculate rates if we have previous metrics
    let connectionsPerSecond = 0;
    let disconnectionsPerSecond = 0;
    let averageConnectionDuration = 0;

    if (this.connectionMetrics.length > 0) {
      const lastMetrics = this.connectionMetrics[this.connectionMetrics.length - 1];
      const timeDiff = (now.getTime() - lastMetrics.timestamp.getTime()) / 1000;
      
      if (timeDiff > 0) {
        const connectionDiff = totalConnections - lastMetrics.totalConnections;
        const activeDiff = activeConnections - lastMetrics.activeConnections;
        
        connectionsPerSecond = Math.max(0, connectionDiff / timeDiff);
        disconnectionsPerSecond = Math.max(0, (connectionDiff - activeDiff) / timeDiff);
        
        // Simple average connection duration estimate
        if (activeConnections > 0) {
          averageConnectionDuration = (Date.now() - lastMetrics.timestamp.getTime()) / activeConnections;
        }
      }
    }

    const connectionMetrics: ConnectionMetrics = {
      activeConnections,
      totalConnections,
      connectionsPerSecond,
      disconnectionsPerSecond,
      averageConnectionDuration,
      timestamp: now
    };

    this.connectionMetrics.push(connectionMetrics);
    if (this.connectionMetrics.length > this.maxMetricsHistory) {
      this.connectionMetrics.shift();
    }
  }

  /**
   * Trigger memory optimization based on severity
   */
  private triggerOptimization(severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const actions: OptimizationAction[] = [];

    switch (severity) {
      case 'low':
        actions.push({
          type: 'cleanup',
          description: 'Clean up stale connections and cached data',
          severity,
          executed: false,
          timestamp: new Date()
        });
        break;

      case 'medium':
        actions.push({
          type: 'cleanup',
          description: 'Aggressive cleanup of cached data',
          severity,
          executed: false,
          timestamp: new Date()
        });
        actions.push({
          type: 'gc',
          description: 'Force garbage collection',
          severity,
          executed: false,
          timestamp: new Date()
        });
        break;

      case 'high':
        actions.push({
          type: 'cleanup',
          description: 'Emergency cleanup of all non-essential data',
          severity,
          executed: false,
          timestamp: new Date()
        });
        actions.push({
          type: 'gc',
          description: 'Force garbage collection',
          severity,
          executed: false,
          timestamp: new Date()
        });
        actions.push({
          type: 'throttle',
          description: 'Throttle new connections',
          severity,
          executed: false,
          timestamp: new Date()
        });
        break;

      case 'critical':
        actions.push({
          type: 'cleanup',
          description: 'Critical emergency cleanup',
          severity,
          executed: false,
          timestamp: new Date()
        });
        actions.push({
          type: 'gc',
          description: 'Force garbage collection',
          severity,
          executed: false,
          timestamp: new Date()
        });
        actions.push({
          type: 'throttle',
          description: 'Severely throttle new connections',
          severity,
          executed: false,
          timestamp: new Date()
        });
        actions.push({
          type: 'disconnect',
          description: 'Disconnect idle connections',
          severity,
          executed: false,
          timestamp: new Date()
        });
        break;
    }

    // Execute actions and emit events
    for (const action of actions) {
      this.executeOptimizationAction(action);
      this.optimizationActions.push(action);
      this.emit('optimization:triggered', action);
    }

    // Keep only recent optimization actions
    if (this.optimizationActions.length > 50) {
      this.optimizationActions = this.optimizationActions.slice(-25);
    }
  }

  /**
   * Execute optimization action
   */
  private executeOptimizationAction(action: OptimizationAction): void {
    try {
      switch (action.type) {
        case 'cleanup':
          this.performCleanup(action.severity);
          break;
        case 'gc':
          this.forceGarbageCollection();
          break;
        case 'throttle':
          this.emit('throttle:connections', { severity: action.severity });
          break;
        case 'disconnect':
          this.emit('disconnect:idle', { severity: action.severity });
          break;
      }
      action.executed = true;
    } catch (error) {
      logger.error(`Failed to execute optimization action: ${action.type}`, {
        component: 'MemoryMonitor',
        error: error instanceof Error ? error.message : String(error)
      });
      action.executed = false;
    }
  }

  /**
   * Perform cleanup based on severity
   */
  private performCleanup(severity: 'low' | 'medium' | 'high' | 'critical'): void {
    // Emit cleanup event for services to handle
    this.emit('cleanup:requested', { severity });
    
    logger.info(`Cleanup performed with severity: ${severity}`, {
      component: 'MemoryMonitor'
    });
  }

  /**
   * Force garbage collection if available
   */
  private forceGarbageCollection(): void {
    if (global.gc) {
      const memBefore = process.memoryUsage();
      global.gc();
      const memAfter = process.memoryUsage();
      
      const freed = memBefore.heapUsed - memAfter.heapUsed;
      
      logger.info('Forced garbage collection completed', {
        component: 'MemoryMonitor',
        freedMemory: `${(freed / 1024 / 1024).toFixed(2)} MB`,
        heapBefore: `${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapAfter: `${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`
      });
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc)', {
        component: 'MemoryMonitor'
      });
    }
  }

  /**
   * Get current memory metrics
   */
  getCurrentMetrics(): MemoryMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get memory metrics history
   */
  getMetricsHistory(): MemoryMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get connection metrics history
   */
  getConnectionMetricsHistory(): ConnectionMetrics[] {
    return [...this.connectionMetrics];
  }

  /**
   * Get optimization actions history
   */
  getOptimizationHistory(): OptimizationAction[] {
    return [...this.optimizationActions];
  }

  /**
   * Get memory usage trend (increasing, decreasing, stable)
   */
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' | 'unknown' {
    if (this.metrics.length < 5) {
      return 'unknown';
    }

    const recent = this.metrics.slice(-5);
    const first = recent[0].heapUsedPercent;
    const last = recent[recent.length - 1].heapUsedPercent;
    const diff = last - first;

    if (Math.abs(diff) < 2) {
      return 'stable';
    } else if (diff > 0) {
      return 'increasing';
    } else {
      return 'decreasing';
    }
  }

  /**
   * Get memory health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical' | 'emergency';
    currentUsage: number;
    trend: string;
    lastOptimization?: Date;
    recommendations: string[];
  } {
    const current = this.getCurrentMetrics();
    if (!current) {
      return {
        status: 'healthy',
        currentUsage: 0,
        trend: 'unknown',
        recommendations: ['Start memory monitoring']
      };
    }

    let status: 'healthy' | 'warning' | 'critical' | 'emergency' = 'healthy';
    if (current.heapUsedPercent >= this.thresholds.emergency) {
      status = 'emergency';
    } else if (current.heapUsedPercent >= this.thresholds.critical) {
      status = 'critical';
    } else if (current.heapUsedPercent >= this.thresholds.warning) {
      status = 'warning';
    }

    const trend = this.getMemoryTrend();
    const lastOptimization = this.optimizationActions.length > 0 
      ? this.optimizationActions[this.optimizationActions.length - 1].timestamp 
      : undefined;

    const recommendations: string[] = [];
    if (status !== 'healthy') {
      recommendations.push('Consider reducing connection limits');
      recommendations.push('Implement more aggressive cleanup policies');
    }
    if (trend === 'increasing') {
      recommendations.push('Monitor for memory leaks');
      recommendations.push('Consider restarting service if trend continues');
    }

    return {
      status,
      currentUsage: current.heapUsedPercent,
      trend,
      lastOptimization,
      recommendations
    };
  }

  /**
   * Update memory thresholds
   */
  updateThresholds(thresholds: Partial<MemoryThresholds>): void {
    Object.assign(this.thresholds, thresholds);
    
    logger.info('Memory thresholds updated', {
      component: 'MemoryMonitor',
      thresholds: this.thresholds
    });
  }

  /**
   * Reset metrics and optimization history
   */
  reset(): void {
    this.metrics.length = 0;
    this.connectionMetrics.length = 0;
    this.optimizationActions.length = 0;
    
    logger.info('Memory monitor reset', {
      component: 'MemoryMonitor'
    });
  }
}

// Export singleton instance
export const memoryMonitor = new MemoryMonitor();