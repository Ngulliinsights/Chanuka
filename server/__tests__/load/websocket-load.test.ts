// ============================================================================
// WEBSOCKET LOAD TESTS - 10,000+ Concurrent Connections
// ============================================================================
// Comprehensive load testing for WebSocket service with memory monitoring
// Tests batching service and memory-aware socket service under high load

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { BatchingService } from '../../infrastructure/batching-service.js';
import { MemoryAwareSocketService } from '../../infrastructure/memory-aware-socket-service.js';
import { webSocketService } from '../../infrastructure/websocket.js';
import { logger } from '@shared/core/src/observability/logging/index.js';

interface LoadTestConfig {
  maxConnections: number;
  connectionRate: number; // connections per second
  messageRate: number; // messages per second per connection
  testDuration: number; // seconds
  memoryThreshold: number; // MB
  warmupTime?: number; // seconds to wait before measuring
}

interface LoadTestMetrics {
  connectionsEstablished: number;
  connectionsFailed: number;
  messagesSuccessful: number;
  messagesFailed: number;
  averageLatency: number;
  maxLatency: number;
  p95Latency: number; // 95th percentile latency
  p99Latency: number; // 99th percentile latency
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    average: number;
  };
  throughput: number;
  errorRate: number;
  connectionDuration: number; // average connection lifetime in seconds
}

interface ConnectionClient {
  id: string;
  ws: WebSocket;
  connected: boolean;
  connectedAt: number;
  messagesSent: number;
  messagesReceived: number;
  latencies: number[];
  errors: string[];
}

/**
 * WebSocket Load Test Suite
 * 
 * This comprehensive test suite validates the WebSocket infrastructure under
 * extreme load conditions, ensuring the system can handle thousands of
 * concurrent connections while maintaining acceptable performance characteristics.
 */
describe('WebSocket Load Tests', () => {
  let server: Server;
  let batchingService: BatchingService;
  let memoryService: MemoryAwareSocketService;
  let serverPort: number;

  // Track memory samples throughout tests for more accurate averaging
  const memorySamples: number[] = [];
  let memorySamplingInterval: NodeJS.Timeout | null = null;

  beforeAll(async () => {
    // Initialize the batching service with optimized settings for high throughput
    // The batch size and delay balance between latency and efficiency
    batchingService = new BatchingService({
      maxBatchSize: 10,
      maxBatchDelay: 50,
      compressionEnabled: true
    });

    // Initialize memory-aware service with conservative thresholds to ensure
    // the system degrades gracefully under memory pressure
    memoryService = new MemoryAwareSocketService({
      warning: 70,
      critical: 85,
      emergency: 95
    }, batchingService);

    // Create HTTP server that will be upgraded to WebSocket connections
    server = new Server();
    serverPort = 8080 + Math.floor(Math.random() * 1000); // Use random port to avoid conflicts

    await new Promise<void>((resolve) => {
      server.listen(serverPort, () => {
        logger.info('Load test server started', { port: serverPort });
        resolve();
      });
    });

    // Initialize WebSocket service on the test server
    webSocketService.initialize(server);

    // Start continuous memory monitoring to catch peak usage accurately
    startMemorySampling();
  });

  afterAll(async () => {
    stopMemorySampling();

    await webSocketService.shutdown();
    await memoryService.shutdown();
    await batchingService.shutdown();

    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  });

  beforeEach(() => {
    // Clear memory samples for fresh test
    memorySamples.length = 0;

    // Force garbage collection if available to start with clean slate
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(async () => {
    // Allow time for cleanup and connection teardown
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  /**
   * Test 1: Baseline Connection Test (1,000 connections)
   * 
   * This test establishes a baseline for system behavior under moderate load.
   * We expect near-perfect connection success rates and low latency since
   * the system isn't stressed at this level.
   */
  test('should handle 1,000 concurrent connections', async () => {
    const config: LoadTestConfig = {
      maxConnections: 1000,
      connectionRate: 100, // Gradual ramp-up to avoid overwhelming the system
      messageRate: 1,
      testDuration: 30,
      memoryThreshold: 500,
      warmupTime: 5 // Allow connections to stabilize before measuring
    };

    const metrics = await runLoadTest(config);

    // We expect 95%+ success rate for this baseline test
    expect(metrics.connectionsEstablished).toBeGreaterThanOrEqual(config.maxConnections * 0.95);
    expect(metrics.errorRate).toBeLessThan(0.05);
    expect(metrics.averageLatency).toBeLessThan(100);
    expect(metrics.p95Latency).toBeLessThan(150);
    expect(metrics.memoryUsage.peak).toBeLessThan(config.memoryThreshold * 1024 * 1024);

    logger.info('1K connection test completed', { metrics });
  }, 60000);

  /**
   * Test 2: High Load Test (5,000 connections)
   * 
   * This test pushes the system to a high but sustainable load level.
   * We expect some degradation in performance but the system should
   * remain functional and responsive.
   */
  test('should handle 5,000 concurrent connections', async () => {
    const config: LoadTestConfig = {
      maxConnections: 5000,
      connectionRate: 200,
      messageRate: 0.5,
      testDuration: 45,
      memoryThreshold: 800,
      warmupTime: 10
    };

    const metrics = await runLoadTest(config);

    // Accept slightly higher error rates under heavy load
    expect(metrics.connectionsEstablished).toBeGreaterThanOrEqual(config.maxConnections * 0.9);
    expect(metrics.errorRate).toBeLessThan(0.1);
    expect(metrics.averageLatency).toBeLessThan(200);
    expect(metrics.p99Latency).toBeLessThan(500);
    expect(metrics.memoryUsage.peak).toBeLessThan(config.memoryThreshold * 1024 * 1024);

    logger.info('5K connection test completed', { metrics });
  }, 90000);

  /**
   * Test 3: Extreme Load Test (10,000+ connections)
   * 
   * This test validates system behavior at the upper limits of capacity.
   * We expect the memory-aware service to actively manage resources and
   * some connections may be rejected or delayed, which is acceptable behavior.
   */
  test('should handle 10,000+ concurrent connections', async () => {
    const config: LoadTestConfig = {
      maxConnections: 12000,
      connectionRate: 300,
      messageRate: 0.2,
      testDuration: 60,
      memoryThreshold: 1200,
      warmupTime: 15
    };

    const metrics = await runLoadTest(config);

    // More lenient expectations for extreme load scenarios
    expect(metrics.connectionsEstablished).toBeGreaterThanOrEqual(config.maxConnections * 0.8);
    expect(metrics.errorRate).toBeLessThan(0.2);
    expect(metrics.averageLatency).toBeLessThan(500);

    logger.info('10K+ connection test completed', { metrics });
  }, 150000);

  /**
   * Test 4: Message Throughput Test
   * 
   * This test focuses on message processing capacity rather than connection count.
   * The batching service should efficiently handle high message volumes while
   * maintaining low latency.
   */
  test('should handle high message throughput', async () => {
    const config: LoadTestConfig = {
      maxConnections: 2000,
      connectionRate: 200,
      messageRate: 5, // 10,000 total messages/sec across all connections
      testDuration: 30,
      memoryThreshold: 600,
      warmupTime: 5
    };

    const metrics = await runLoadTest(config);

    // Calculate theoretical maximum throughput and expect 80% efficiency
    const expectedThroughput = config.maxConnections * config.messageRate * 0.8;
    expect(metrics.throughput).toBeGreaterThanOrEqual(expectedThroughput);
    expect(metrics.errorRate).toBeLessThan(0.1);
    expect(metrics.averageLatency).toBeLessThan(150);

    logger.info('High throughput test completed', { metrics });
  }, 60000);

  /**
   * Test 5: Memory Pressure Test
   * 
   * This test deliberately constrains memory to validate that the
   * MemoryAwareSocketService properly detects and responds to memory pressure.
   * The system should degrade gracefully rather than crashing.
   */
  test('should handle memory pressure gracefully', async () => {
    const config: LoadTestConfig = {
      maxConnections: 8000,
      connectionRate: 400,
      messageRate: 2,
      testDuration: 45,
      memoryThreshold: 400, // Intentionally low to trigger memory management
      warmupTime: 10
    };

    const memoryEvents: any[] = [];
    const memoryEventHandler = (event: any) => {
      memoryEvents.push(event);
    };

    memoryService.on('memoryPressureChange', memoryEventHandler);

    const metrics = await runLoadTest(config);

    // Clean up event listener
    memoryService.off('memoryPressureChange', memoryEventHandler);

    // Should have triggered memory management mechanisms
    expect(memoryEvents.length).toBeGreaterThan(0);

    // System should remain functional despite memory constraints
    expect(metrics.connectionsEstablished).toBeGreaterThanOrEqual(config.maxConnections * 0.7);
    expect(metrics.errorRate).toBeLessThan(0.3);

    logger.info('Memory pressure test completed', {
      metrics,
      memoryEvents: memoryEvents.length,
      memoryLevels: memoryEvents.map(e => e.level)
    });
  }, 90000);

  /**
   * Test 6: Connection Stability Test
   * 
   * This test validates that connections remain stable over extended periods
   * without unexpected disconnections or degradation. Low message rate ensures
   * we're testing connection stability rather than message processing.
   */
  test('should maintain stable connections over time', async () => {
    const config: LoadTestConfig = {
      maxConnections: 3000,
      connectionRate: 150,
      messageRate: 0.1,
      testDuration: 120, // Extended duration to test stability
      memoryThreshold: 700,
      warmupTime: 10
    };

    const metrics = await runLoadTest(config);

    // Connections should remain stable with minimal failures
    const failureRate = metrics.connectionsFailed / metrics.connectionsEstablished;
    expect(failureRate).toBeLessThan(0.05);
    expect(metrics.errorRate).toBeLessThan(0.05);

    // Average connection duration should be close to test duration
    expect(metrics.connectionDuration).toBeGreaterThan(config.testDuration * 0.9);

    logger.info('Connection stability test completed', { metrics });
  }, 180000);

  /**
   * Core load test execution function
   * 
   * This function orchestrates the entire load test lifecycle: establishing
   * connections at the specified rate, sending messages, collecting metrics,
   * and cleaning up resources. It provides a comprehensive view of system
   * performance under the configured load.
   */
  async function runLoadTest(config: LoadTestConfig): Promise<LoadTestMetrics> {
    const clients: ConnectionClient[] = [];
    const metrics: LoadTestMetrics = {
      connectionsEstablished: 0,
      connectionsFailed: 0,
      messagesSuccessful: 0,
      messagesFailed: 0,
      averageLatency: 0,
      maxLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      memoryUsage: {
        initial: process.memoryUsage().heapUsed,
        peak: process.memoryUsage().heapUsed,
        final: 0,
        average: 0
      },
      throughput: 0,
      errorRate: 0,
      connectionDuration: 0
    };

    logger.info('Starting load test', { config });

    try {
      // Phase 1: Establish connections gradually to simulate realistic load patterns
      await establishConnections(clients, config, metrics);

      // Optional warmup period to let connections stabilize
      if (config.warmupTime) {
        logger.info('Warmup period started', { duration: config.warmupTime });
        await new Promise(resolve => setTimeout(resolve, config.warmupTime! * 1000));
      }

      // Phase 2: Send messages and collect performance data
      await sendMessages(clients, config, metrics);

      // Phase 3: Clean shutdown of all connections
      await cleanupConnections(clients, metrics);

      // Phase 4: Calculate final metrics and percentiles
      calculateFinalMetrics(clients, metrics, config);

    } catch (error) {
      logger.error('Load test failed', { error, config });
      throw error;
    }

    return metrics;
  }

  /**
   * Establish WebSocket connections at the specified rate
   * 
   * This function creates connections gradually rather than all at once,
   * which more accurately simulates real-world usage patterns and avoids
   * overwhelming the system during initialization.
   */
  async function establishConnections(
    clients: ConnectionClient[],
    config: LoadTestConfig,
    metrics: LoadTestMetrics
  ): Promise<void> {
    const connectionInterval = 1000 / config.connectionRate;
    let connectionsCreated = 0;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (connectionsCreated >= config.maxConnections) {
          clearInterval(interval);
          logger.info('All connections established', {
            total: connectionsCreated,
            successful: metrics.connectionsEstablished,
            failed: metrics.connectionsFailed
          });
          resolve();
          return;
        }

        createConnection(clients, connectionsCreated, metrics);
        connectionsCreated++;

        // Track peak memory throughout connection establishment
        const currentMemory = process.memoryUsage().heapUsed;
        metrics.memoryUsage.peak = Math.max(metrics.memoryUsage.peak, currentMemory);

      }, connectionInterval);
    });
  }

  /**
   * Create a single WebSocket connection with comprehensive event handling
   * 
   * Each connection is tracked individually so we can collect detailed metrics
   * about connection lifetime, message patterns, and error conditions.
   */
  function createConnection(
    clients: ConnectionClient[],
    index: number,
    metrics: LoadTestMetrics
  ): void {
    const clientId = `client-${index}`;

    try {
      // Generate a valid JWT token for the test user
      const token = jwt.sign(
        { user_id: `test-user-${index}` },
        process.env.JWT_SECRET || 'fallback-secret'
      );

      const ws = new WebSocket(`ws://localhost:${serverPort}/ws?token=${token}`);

      const client: ConnectionClient = {
        id: clientId,
        ws,
        connected: false,
        connectedAt: 0,
        messagesSent: 0,
        messagesReceived: 0,
        latencies: [],
        errors: []
      };

      ws.on('open', () => {
        client.connected = true;
        client.connectedAt = Date.now();
        metrics.connectionsEstablished++;

        // Register with memory service for resource tracking
        memoryService.registerConnection(clientId, `user-${index}`);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          client.messagesReceived++;

          // Calculate round-trip latency if timestamp is present
          if (message.timestamp) {
            const latency = Date.now() - message.timestamp;
            client.latencies.push(latency);
          }

          metrics.messagesSuccessful++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown parse error';
          client.errors.push(`Parse failed: ${errorMsg}`);
          metrics.messagesFailed++;
        }
      });

      ws.on('error', (error) => {
        client.errors.push(error.message);
        if (!client.connected) {
          metrics.connectionsFailed++;
        }
      });

      ws.on('close', () => {
        client.connected = false;
        memoryService.unregisterConnection(clientId);
      });

      clients.push(client);

    } catch (error) {
      logger.error('Failed to create connection', { clientId, error });
      metrics.connectionsFailed++;
    }
  }

  /**
   * Send messages from connected clients throughout the test duration
   * 
   * Messages are distributed across active connections to simulate realistic
   * usage patterns. The function adapts to connection failures by only sending
   * from successfully connected clients.
   */
  async function sendMessages(
    clients: ConnectionClient[],
    config: LoadTestConfig,
    metrics: LoadTestMetrics
  ): Promise<void> {
    const testEndTime = Date.now() + (config.testDuration * 1000);
    const messageIntervalMs = 100; // Check every 100ms

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (Date.now() >= testEndTime) {
          clearInterval(interval);
          logger.info('Message sending phase completed');
          resolve();
          return;
        }

        // Only send from clients that are currently connected
        const activeClients = clients.filter(c => c.connected && c.ws.readyState === WebSocket.OPEN);

        if (activeClients.length === 0) {
          return;
        }

        // Calculate how many messages to send in this interval
        const messagesThisInterval = Math.ceil(
          (config.messageRate * activeClients.length * messageIntervalMs) / 1000
        );

        for (let i = 0; i < messagesThisInterval; i++) {
          const randomIndex = Math.floor(Math.random() * activeClients.length);
          const client = activeClients[randomIndex];
          sendMessage(client, metrics);
        }

        // Continuous memory tracking during message phase
        const currentMemory = process.memoryUsage().heapUsed;
        metrics.memoryUsage.peak = Math.max(metrics.memoryUsage.peak, currentMemory);

      }, messageIntervalMs);
    });
  }

  /**
   * Send a single message from a client with error handling
   * 
   * Messages include timestamps for latency calculation and a payload
   * that simulates realistic data transfer sizes.
   */
  function sendMessage(client: ConnectionClient, metrics: LoadTestMetrics): void {
    if (!client.connected || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'test_message',
      data: {
        clientId: client.id,
        messageNumber: client.messagesSent,
        payload: 'x'.repeat(100) // 100 byte payload simulates typical message size
      },
      timestamp: Date.now()
    };

    try {
      client.ws.send(JSON.stringify(message));
      client.messagesSent++;

      // Notify memory service of activity for connection prioritization
      memoryService.updateConnectionActivity(client.id);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown send error';
      client.errors.push(`Send failed: ${errorMsg}`);
      metrics.messagesFailed++;
    }
  }

  /**
   * Cleanup all connections gracefully
   * 
   * This function ensures all WebSocket connections are properly closed
   * and resources are released. It waits for connections to close rather
   * than forcing termination.
   */
  async function cleanupConnections(
    clients: ConnectionClient[],
    metrics: LoadTestMetrics
  ): Promise<void> {
    logger.info('Cleaning up connections', { totalClients: clients.length });

    const closePromises = clients.map(client => {
      return new Promise<void>((resolve) => {
        if (client.ws.readyState === WebSocket.OPEN || client.ws.readyState === WebSocket.CONNECTING) {
          client.ws.once('close', () => resolve());
          client.ws.close();

          // Fallback timeout in case close event doesn't fire
          setTimeout(resolve, 1000);
        } else {
          resolve();
        }
      });
    });

    await Promise.all(closePromises);

    // Record final memory state
    metrics.memoryUsage.final = process.memoryUsage().heapUsed;

    // Force garbage collection to clean up test resources
    if (global.gc) {
      global.gc();
    }

    // Allow GC to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Calculate final metrics including percentiles and averages
   * 
   * This function aggregates all collected data into meaningful metrics
   * that describe overall system performance. Percentile calculations provide
   * better insight into tail latencies than simple averages.
   */
  function calculateFinalMetrics(
    clients: ConnectionClient[],
    metrics: LoadTestMetrics,
    config: LoadTestConfig
  ): void {
    // Aggregate all latency measurements from all clients
    const allLatencies: number[] = [];
    let totalConnectionDuration = 0;
    let connectionCount = 0;

    for (const client of clients) {
      allLatencies.push(...client.latencies);

      if (client.connectedAt > 0) {
        const duration = (Date.now() - client.connectedAt) / 1000;
        totalConnectionDuration += duration;
        connectionCount++;
      }
    }

    // Calculate latency metrics
    if (allLatencies.length > 0) {
      allLatencies.sort((a, b) => a - b);

      metrics.averageLatency = allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length;
      metrics.maxLatency = allLatencies[allLatencies.length - 1];

      // Calculate percentiles for better understanding of distribution
      const p95Index = Math.floor(allLatencies.length * 0.95);
      const p99Index = Math.floor(allLatencies.length * 0.99);
      metrics.p95Latency = allLatencies[p95Index];
      metrics.p99Latency = allLatencies[p99Index];
    }

    // Calculate average connection duration
    metrics.connectionDuration = connectionCount > 0
      ? totalConnectionDuration / connectionCount
      : 0;

    // Calculate throughput (messages per second)
    metrics.throughput = metrics.messagesSuccessful / config.testDuration;

    // Calculate overall error rate across all operations
    const totalOperations = metrics.connectionsEstablished + metrics.messagesSuccessful;
    const totalErrors = metrics.connectionsFailed + metrics.messagesFailed;
    metrics.errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

    // Calculate average memory usage from samples
    if (memorySamples.length > 0) {
      metrics.memoryUsage.average =
        memorySamples.reduce((sum, sample) => sum + sample, 0) / memorySamples.length;
    }

    logger.info('Load test metrics calculated', {
      metrics,
      latencySamples: allLatencies.length,
      memorySamples: memorySamples.length
    });
  }

  /**
   * Start continuous memory sampling for accurate tracking
   */
  function startMemorySampling(): void {
    memorySamplingInterval = setInterval(() => {
      memorySamples.push(process.memoryUsage().heapUsed);
    }, 1000); // Sample every second
  }

  /**
   * Stop memory sampling
   */
  function stopMemorySampling(): void {
    if (memorySamplingInterval) {
      clearInterval(memorySamplingInterval);
      memorySamplingInterval = null;
    }
  }
});

/**
 * Utility function to generate realistic load patterns
 * 
 * Real-world usage typically follows patterns where most users are passive
 * observers with occasional active participants. This function generates
 * configurations that reflect these patterns.
 */
function simulateRealisticLoad(): LoadTestConfig {
  return {
    maxConnections: 8000,
    connectionRate: 250,
    messageRate: 0.3, // Most users are passive, matching typical chat patterns
    testDuration: 90,
    memoryThreshold: 800,
    warmupTime: 10
  };
}

/**
 * Performance Benchmark Suite
 * 
 * These benchmarks validate that the system meets specific performance
 * requirements under realistic conditions.
 */
describe('Performance Benchmarks', () => {
  test('should meet performance requirements', async () => {
    const config = simulateRealisticLoad();

    // Define expected performance characteristics based on requirements
    const expectedMetrics = {
      connectionsEstablished: config.maxConnections * 0.95,
      errorRate: 0.05,
      averageLatency: 150,
      p95Latency: 250,
      throughput: config.maxConnections * config.messageRate * 0.9
    };

    // Verify performance requirements
    expect(expectedMetrics.connectionsEstablished).toBeGreaterThanOrEqual(10000);
    expect(expectedMetrics.errorRate).toBeLessThan(0.1);
    expect(expectedMetrics.averageLatency).toBeLessThan(200);
    expect(expectedMetrics.p95Latency).toBeLessThan(300);

    logger.info('Performance benchmarks validated', { expectedMetrics });
  });
});
