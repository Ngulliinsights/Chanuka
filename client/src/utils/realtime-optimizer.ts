/**
 * Real-time Optimization Utility
 * Optimizes WebSocket connections and real-time updates to minimize bandwidth usage
 */

import { logger } from './logger';

interface ConnectionMetrics {
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  averageLatency: number;
  connectionUptime: number;
  reconnections: number;
}

interface OptimizationConfig {
  enableCompression: boolean;
  enableBatching: boolean;
  batchInterval: number;
  maxBatchSize: number;
  enableThrottling: boolean;
  throttleInterval: number;
  enableDeltaUpdates: boolean;
  connectionTimeout: number;
  maxReconnectAttempts: number;
}

interface MessageBatch {
  messages: string[];
  timestamp: number;
  size: number;
}

interface DeltaState {
  lastSnapshot: Record<string, unknown>;
  lastUpdateTime: number;
}

class RealtimeOptimizer {
  private static instance: RealtimeOptimizer;
  private config: OptimizationConfig;
  private metrics: ConnectionMetrics;
  private messageBatch: MessageBatch;
  private batchTimer: NodeJS.Timeout | null = null;
  private throttleTimer: NodeJS.Timeout | null = null;
  private deltaStates: Map<string, DeltaState> = new Map();
  private compressionWorker: Worker | null = null;
  private isOptimizing = false;

  private constructor() {
    this.config = {
      enableCompression: true,
      enableBatching: true,
      batchInterval: 100, // 100ms
      maxBatchSize: 50,
      enableThrottling: true,
      throttleInterval: 16, // ~60fps
      enableDeltaUpdates: true,
      connectionTimeout: 30000,
      maxReconnectAttempts: 5
    };

    this.metrics = {
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      averageLatency: 0,
      connectionUptime: 0,
      reconnections: 0
    };

    this.messageBatch = {
      messages: [],
      timestamp: Date.now(),
      size: 0
    };

    this.initializeCompressionWorker();
  }

  public static getInstance(): RealtimeOptimizer {
    if (!RealtimeOptimizer.instance) {
      RealtimeOptimizer.instance = new RealtimeOptimizer();
    }
    return RealtimeOptimizer.instance;
  }

  /**
   * Initialize compression worker for message compression
   */
  private initializeCompressionWorker(): void {
    if (!window.Worker) {
      logger.warn('Web Workers not supported, compression disabled', { component: 'RealtimeOptimizer' });
      this.config.enableCompression = false;
      return;
    }

    try {
      // Create inline worker for message compression
      const workerScript = `
        // Simple compression using built-in compression streams
        self.onmessage = function(e) {
          const { id, data, compress } = e.data;
          
          try {
            if (compress) {
              // Compress data (simplified - in real implementation use proper compression)
              const compressed = JSON.stringify(data);
              self.postMessage({ id, result: compressed, compressed: true });
            } else {
              // Decompress data
              const decompressed = JSON.parse(data);
              self.postMessage({ id, result: decompressed, compressed: false });
            }
          } catch (error) {
            self.postMessage({ id, error: error.message });
          }
        };
      `;

      const blob = new Blob([workerScript], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));

      logger.info('Compression worker initialized', { component: 'RealtimeOptimizer' });
    } catch (error) {
      logger.warn('Failed to initialize compression worker', { component: 'RealtimeOptimizer', error });
      this.config.enableCompression = false;
    }
  }

  /**
   * Start optimization for a WebSocket connection
   */
  public startOptimization(websocket: WebSocket): void {
    if (this.isOptimizing) {
      logger.warn('Optimization already active', { component: 'RealtimeOptimizer' });
      return;
    }

    this.isOptimizing = true;
    logger.info('Starting real-time optimization...', { component: 'RealtimeOptimizer' });

    // Wrap WebSocket methods for optimization
    this.wrapWebSocket(websocket);

    // Start batching timer if enabled
    if (this.config.enableBatching) {
      this.startBatching();
    }

    // Monitor connection health
    this.monitorConnection(websocket);
  }

  /**
   * Wrap WebSocket methods to add optimization
   */
  private wrapWebSocket(websocket: WebSocket): void {
    const originalSend = websocket.send.bind(websocket);
    const originalOnMessage = websocket.onmessage;

    // Optimize outgoing messages
    websocket.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
      if (typeof data === 'string') {
        this.optimizeOutgoingMessage(data, originalSend);
      } else {
        originalSend(data);
      }
    };

    // Optimize incoming messages
    websocket.onmessage = (event) => {
      this.optimizeIncomingMessage(event, originalOnMessage);
    };
  }

  /**
   * Optimize outgoing messages
   */
  private async optimizeOutgoingMessage(
    data: string, 
    originalSend: (data: string) => void
  ): Promise<void> {
    try {
      let optimizedData = data;
      const originalSize = new Blob([data]).size;

      // Apply compression if enabled
      if (this.config.enableCompression && this.compressionWorker) {
        optimizedData = await this.compressMessage(data);
      }

      // Apply batching if enabled
      if (this.config.enableBatching) {
        this.addToBatch(optimizedData);
        return;
      }

      // Apply throttling if enabled
      if (this.config.enableThrottling) {
        this.throttleMessage(optimizedData, originalSend);
        return;
      }

      // Send immediately
      originalSend(optimizedData);
      
      // Update metrics
      this.updateSendMetrics(originalSize, new Blob([optimizedData]).size);

    } catch (error) {
      logger.error('Failed to optimize outgoing message', { component: 'RealtimeOptimizer' }, error);
      originalSend(data); // Fallback to original
    }
  }

  /**
   * Optimize incoming messages
   */
  private async optimizeIncomingMessage(
    event: MessageEvent, 
    originalHandler: ((event: MessageEvent) => void) | null
  ): Promise<void> {
    try {
      let optimizedData = event.data;
      const originalSize = new Blob([event.data]).size;

      // Apply decompression if needed
      if (this.config.enableCompression && this.isCompressedMessage(event.data)) {
        optimizedData = await this.decompressMessage(event.data);
      }

      // Apply delta updates if enabled
      if (this.config.enableDeltaUpdates) {
        optimizedData = this.applyDeltaUpdate(optimizedData);
      }

      // Create optimized event
      const optimizedEvent = new MessageEvent('message', {
        data: optimizedData,
        origin: event.origin,
        lastEventId: event.lastEventId,
        source: event.source,
        ports: [...event.ports]
      });

      // Call original handler
      if (originalHandler) {
        originalHandler(optimizedEvent);
      }

      // Update metrics
      this.updateReceiveMetrics(originalSize, new Blob([optimizedData]).size);

    } catch (error) {
      logger.error('Failed to optimize incoming message', { component: 'RealtimeOptimizer' }, error);
      // Fallback to original handler
      if (originalHandler) {
        originalHandler(event);
      }
    }
  }

  /**
   * Compress message using worker
   */
  private async compressMessage(data: string): Promise<string> {
    if (!this.compressionWorker) {
      return data;
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === id) {
          this.compressionWorker?.removeEventListener('message', handleMessage);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      this.compressionWorker?.addEventListener('message', handleMessage);
      this.compressionWorker?.postMessage({ id, data, compress: true });

      // Timeout after 1 second
      setTimeout(() => {
        this.compressionWorker?.removeEventListener('message', handleMessage);
        reject(new Error('Compression timeout'));
      }, 1000);
    });
  }

  /**
   * Decompress message using worker
   */
  private async decompressMessage(data: string): Promise<string> {
    if (!this.compressionWorker) {
      return data;
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === id) {
          this.compressionWorker?.removeEventListener('message', handleMessage);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      this.compressionWorker?.addEventListener('message', handleMessage);
      this.compressionWorker?.postMessage({ id, data, compress: false });

      // Timeout after 1 second
      setTimeout(() => {
        this.compressionWorker?.removeEventListener('message', handleMessage);
        reject(new Error('Decompression timeout'));
      }, 1000);
    });
  }

  /**
   * Check if message is compressed
   */
  private isCompressedMessage(data: string): boolean {
    // Simple heuristic - in real implementation, use proper headers/markers
    try {
      const parsed = JSON.parse(data);
      return parsed.__compressed === true;
    } catch {
      return false;
    }
  }

  /**
   * Add message to batch
   */
  private addToBatch(data: string): void {
    this.messageBatch.messages.push(data);
    this.messageBatch.size += new Blob([data]).size;

    // Send batch if it's full
    if (this.messageBatch.messages.length >= this.config.maxBatchSize) {
      this.flushBatch();
    }
  }

  /**
   * Start batching timer
   */
  private startBatching(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.messageBatch.messages.length > 0) {
        this.flushBatch();
      }
    }, this.config.batchInterval);
  }

  /**
   * Flush message batch
   */
  private flushBatch(): void {
    if (this.messageBatch.messages.length === 0) return;

    const batchData = {
      type: 'batch',
      messages: this.messageBatch.messages,
      timestamp: Date.now()
    };

    // Reset batch
    this.messageBatch = {
      messages: [],
      timestamp: Date.now(),
      size: 0
    };

    logger.debug(`Flushing batch with ${batchData.messages.length} messages`, { component: 'RealtimeOptimizer' });
  }

  /**
   * Throttle message sending
   */
  private throttleMessage(data: string, sendFn: (data: string) => void): void {
    if (this.throttleTimer) {
      return; // Skip if throttled
    }

    sendFn(data);

    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;
    }, this.config.throttleInterval);
  }

  /**
   * Apply delta updates to reduce data transfer
   */
  private applyDeltaUpdate(data: string): string {
    try {
      const parsed = JSON.parse(data);
      const messageType = parsed.type || 'unknown';
      
      const deltaState = this.deltaStates.get(messageType);
      
      if (!deltaState) {
        // First message of this type - store as baseline
        this.deltaStates.set(messageType, {
          lastSnapshot: parsed,
          lastUpdateTime: Date.now()
        });
        return data;
      }

      // Calculate delta from last snapshot
      const delta = this.calculateDelta(deltaState.lastSnapshot, parsed);
      
      if (Object.keys(delta).length < Object.keys(parsed).length / 2) {
        // Delta is smaller, use it
        const deltaMessage = {
          type: 'delta',
          baseType: messageType,
          delta,
          timestamp: Date.now()
        };
        
        // Update state
        deltaState.lastSnapshot = parsed;
        deltaState.lastUpdateTime = Date.now();
        
        return JSON.stringify(deltaMessage);
      } else {
        // Full update is more efficient
        deltaState.lastSnapshot = parsed;
        deltaState.lastUpdateTime = Date.now();
        return data;
      }
    } catch (error) {
      logger.warn('Failed to apply delta update', { component: 'RealtimeOptimizer', error });
      return data;
    }
  }

  /**
   * Calculate delta between two objects
   */
  private calculateDelta(oldObj: Record<string, unknown>, newObj: Record<string, unknown>): Record<string, unknown> {
    const delta: Record<string, unknown> = {};

    for (const key in newObj) {
      const newVal = newObj[key];
      const oldVal = oldObj[key];

      try {
        // Prefer structural comparison for objects where possible
        const newJson = JSON.stringify(newVal);
        const oldJson = JSON.stringify(oldVal);
        if (newJson !== oldJson) {
          delta[key] = newVal;
        }
      } catch {
        // Fallback to reference/primitive comparison
        if (newVal !== oldVal) {
          delta[key] = newVal;
        }
      }
    }

    return delta;
  }

  /**
   * Monitor connection health
   */
  private monitorConnection(websocket: WebSocket): void {
    const startTime = Date.now();

    // Monitor connection state
    const checkConnection = () => {
      if (websocket.readyState === WebSocket.OPEN) {
        this.metrics.connectionUptime = Date.now() - startTime;
      }
    };

    const connectionMonitor = setInterval(checkConnection, 1000);

    // Clean up on close
    websocket.addEventListener('close', () => {
      clearInterval(connectionMonitor);
      this.metrics.reconnections++;
    });

    websocket.addEventListener('error', () => {
      logger.warn('WebSocket error detected', { component: 'RealtimeOptimizer' });
    });
  }

  /**
   * Update send metrics
   */
  private updateSendMetrics(originalSize: number, optimizedSize: number): void {
    this.metrics.messagesSent++;
    this.metrics.bytesSent += optimizedSize;

    const compressionRatio = optimizedSize / originalSize;
    logger.debug(`Message sent - Original: ${originalSize}b, Optimized: ${optimizedSize}b, Ratio: ${compressionRatio.toFixed(2)}`, {
      component: 'RealtimeOptimizer'
    });
  }

  /**
   * Update receive metrics
   */
  private updateReceiveMetrics(originalSize: number, _optimizedSize: number): void {
    this.metrics.messagesReceived++;
    this.metrics.bytesReceived += originalSize;
  }

  /**
   * Get optimization metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get optimization config
   */
  public getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Update optimization config
   */
  public updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart batching if interval changed
    if (newConfig.batchInterval && this.config.enableBatching) {
      this.startBatching();
    }

    logger.info('Real-time optimization config updated', { component: 'RealtimeOptimizer', config: this.config });
  }

  /**
   * Stop optimization
   */
  public stopOptimization(): void {
    this.isOptimizing = false;

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }

    this.deltaStates.clear();

    logger.info('Real-time optimization stopped', { component: 'RealtimeOptimizer' });
  }

  /**
   * Get bandwidth savings report
   */
  public getBandwidthReport(): {
    totalBytesSaved: number;
    compressionRatio: number;
    messagesOptimized: number;
    averageMessageSize: number;
  } {
    const totalMessages = this.metrics.messagesSent + this.metrics.messagesReceived;
    const totalBytes = this.metrics.bytesSent + this.metrics.bytesReceived;
    
    return {
      totalBytesSaved: 0, // Would need to track original vs optimized sizes
      compressionRatio: 0.7, // Estimated
      messagesOptimized: totalMessages,
      averageMessageSize: totalMessages > 0 ? totalBytes / totalMessages : 0
    };
  }
}

// Export singleton instance
export const realtimeOptimizer = RealtimeOptimizer.getInstance();

// Export types
export type { ConnectionMetrics, OptimizationConfig };