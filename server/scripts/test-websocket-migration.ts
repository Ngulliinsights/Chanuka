#!/usr/bin/env tsx
// ============================================================================
// SIMPLE WEBSOCKET MIGRATION TEST
// ============================================================================
// Simple test to validate Socket.IO migration without full database setup

import { logger } from '@server/infrastructure/observability';
import { createServer } from 'http';
import { Server } from 'socket.io';

/**
 * Simple Socket.IO WebSocket Service for testing
 */
class SimpleSocketIOService {
  private io: Server | null = null;
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesSent: 0,
    errors: 0
  };

  async initialize(httpServer: unknown): Promise<void> {
    logger.info('Initializing simple Socket.IO service for testing');

    this.io = new Server(httpServer, {
      path: '/socket.io',
      cors: {
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Simple connection handler without authentication for testing
    this.io.on('connection', (socket) => {
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      logger.info({
        socketId: socket.id,
        activeConnections: this.metrics.activeConnections
      }, 'New Socket.IO connection');

      socket.emit('connected', {
        message: 'Socket.IO connection established',
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('disconnect', () => {
        this.metrics.activeConnections--;
        logger.info({
          socketId: socket.id,
          activeConnections: this.metrics.activeConnections
        }, 'Socket.IO connection disconnected');
      });

      socket.on('test_message', (data) => {
        socket.emit('test_response', {
          received: data,
          timestamp: new Date().toISOString()
        });
        this.metrics.messagesSent++;
      });
    });

    logger.info('Simple Socket.IO service initialized successfully');
  }

  getMetrics() {
    return { ...this.metrics };
  }

  async shutdown(): Promise<void> {
    if (this.io) {
      this.io.close();
    }
    logger.info('Simple Socket.IO service shutdown complete');
  }
}

/**
 * Test Socket.IO deployment
 */
async function testSocketIODeployment(): Promise<void> {
  logger.info('🚀 Starting simple Socket.IO deployment test');

  try {
    // Create HTTP server
    const server = createServer();
    const port = 3001;

    await new Promise<void>((resolve, reject) => {
      server.listen(port, (error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    logger.info(`🌐 HTTP server started on port ${port}`);

    // Initialize Socket.IO service
    const socketIOService = new SimpleSocketIOService();
    await socketIOService.initialize(server);

    // Display success information
    const metrics = socketIOService.getMetrics();
    
    logger.info('✅ Socket.IO deployment test completed successfully', {
      metrics,
      endpoint: `http://localhost:${port}/socket.io`
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SOCKET.IO DEPLOYMENT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📡 Socket.IO Endpoint: http://localhost:${port}/socket.io`);
    console.log(`🔗 Total Connections: ${metrics.totalConnections}`);
    console.log(`📡 Active Connections: ${metrics.activeConnections}`);
    console.log(`📤 Messages Sent: ${metrics.messagesSent}`);
    console.log(`❌ Errors: ${metrics.errors}`);
    console.log('\n✅ Socket.IO service is running and ready for connections!');
    console.log('📋 Test with a Socket.IO client:');
    console.log('   const socket = io("http://localhost:3001");');
    console.log('   socket.emit("test_message", { data: "hello" });');
    console.log('\n🔧 Development mode: Server will keep running for testing');
    console.log('Press Ctrl+C to stop the server');
    console.log('='.repeat(60) + '\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down Socket.IO test server...');
      
      await socketIOService.shutdown();
      
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      
      logger.info('✅ Server shutdown complete');
      process.exit(0);
    });

    // Keep process alive for testing
    return new Promise(() => {});

  } catch (error) {
    logger.error('❌ Socket.IO deployment test failed', {}, error);
    throw error;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  testSocketIODeployment()
    .catch((error) => {
      logger.error('💥 Socket.IO deployment test failed', {}, error);
      process.exit(1);
    });
}

export { testSocketIODeployment };
