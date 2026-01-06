/**
 * Real-time Optimization - Realtime Feature
 *
 * Optimizes WebSocket connections and real-time updates to minimize bandwidth usage
 */

export interface ConnectionMetrics {
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  averageLatency: number;
  connectionUptime: number;
  reconnections: number;
}

export interface OptimizationConfig {
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

export interface MessageBatch {
  messages: string[];
  timestamp: number;
  size: number;
}

export interface DeltaState {
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

  static getInstance(): RealtimeOptimizer {
    if (!RealtimeOptimizer.instance) {
      RealtimeOptimizer.instance = new RealtimeOptimizer();
    }
    return RealtimeOptimizer.instance;
  }

  constructor() {
    this.config = {
      enableCompression: true,
      enableBatching: true,
      batchInterval: 100,
      maxBatchSize: 10,
      enableThrottling: true,
      throttleInterval: 50,
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
  }

  optimizeMessage(message: string, channel: string): string {
    if (!this.isOptimizing) return message;

    let optimizedMessage = message;

    // Apply delta compression if enabled
    if (this.config.enableDeltaUpdates) {
      optimizedMessage = this.applyDeltaCompression(optimizedMessage, channel);
    }

    // Apply general compression if enabled
    if (this.config.enableCompression) {
      optimizedMessage = this.compressMessage(optimizedMessage);
    }

    return optimizedMessage;
  }

  batchMessage(message: string, callback: (batch: string[]) => void): void {
    if (!this.config.enableBatching) {
      callback([message]);
      return;
    }

    this.messageBatch.messages.push(message);
    this.messageBatch.size += message.length;

    // Send batch if it reaches max size or interval
    if (this.messageBatch.messages.length >= this.config.maxBatchSize ||
        this.messageBatch.size > 1024 * 10) { // 10KB limit
      this.flushBatch(callback);
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch(callback);
      }, this.config.batchInterval);
    }
  }

  private flushBatch(callback: (batch: string[]) => void): void {
    if (this.messageBatch.messages.length > 0) {
      callback([...this.messageBatch.messages]);
      this.messageBatch.messages = [];
      this.messageBatch.size = 0;
      this.messageBatch.timestamp = Date.now();
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private applyDeltaCompression(message: string, channel: string): string {
    try {
      const data = JSON.parse(message);
      const deltaState = this.deltaStates.get(channel);

      if (!deltaState) {
        // First message, store as baseline
        this.deltaStates.set(channel, {
          lastSnapshot: data,
          lastUpdateTime: Date.now()
        });
        return message;
      }

      // Calculate delta
      const delta = this.calculateDelta(deltaState.lastSnapshot, data);

      // Update state
      deltaState.lastSnapshot = data;
      deltaState.lastUpdateTime = Date.now();

      // Return delta if it's smaller
      const deltaMessage = JSON.stringify({ __delta: true, ...delta });
      return deltaMessage.length < message.length ? deltaMessage : message;
    } catch {
      return message;
    }
  }

  private calculateDelta(oldData: any, newData: any): any {
    const delta: any = {};

    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        delta[key] = newData[key];
      }
    }

    return delta;
  }

  private compressMessage(message: string): string {
    // Simple compression - in real implementation, use proper compression library
    if (message.length < 100) return message;

    // Basic string compression (placeholder)
    return message.replace(/\s+/g, ' ').trim();
  }

  updateMetrics(type: 'sent' | 'received', size: number, latency?: number): void {
    if (type === 'sent') {
      this.metrics.messagesSent++;
      this.metrics.bytesSent += size;
    } else {
      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += size;
    }

    if (latency !== undefined) {
      this.metrics.averageLatency =
        (this.metrics.averageLatency + latency) / 2;
    }
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  getOptimizationStats(): {
    compressionRatio: number;
    batchEfficiency: number;
    deltaEfficiency: number;
  } {
    return {
      compressionRatio: this.metrics.bytesSent > 0 ?
        1 - (this.metrics.bytesSent / (this.metrics.messagesSent * 100)) : 0,
      batchEfficiency: this.messageBatch.messages.length / this.config.maxBatchSize,
      deltaEfficiency: this.deltaStates.size > 0 ? 0.3 : 0 // Placeholder
    };
  }

  configure(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  startOptimization(): void {
    this.isOptimizing = true;
  }

  stopOptimization(): void {
    this.isOptimizing = false;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
  }
}

export const realtimeOptimizer = RealtimeOptimizer.getInstance();
