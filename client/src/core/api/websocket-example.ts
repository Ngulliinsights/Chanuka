/**
 * WebSocket API Server Example
 * 
 * Example of how to initialize and use the WebSocket API server
 */

import { createServer } from 'http';
import express from 'express';
import { webSocketAPIServer, defaultMessageHandlers } from './websocket';
import { BillTrackingService } from '../services/bill-tracking';
import { CommunityService } from '../services/community';
import { NotificationService } from '../services/notifications';

// ============================================================================
// Server Setup
// ============================================================================

async function setupWebSocketServer() {
  // Create Express app and HTTP server
  const app = express();
  const server = createServer(app);

  // Initialize WebSocket API server
  webSocketAPIServer['server'] = server; // Set the server instance
  await webSocketAPIServer.initialize();

  // Register default message handlers
  Object.entries(defaultMessageHandlers).forEach(([type, handler]) => {
    webSocketAPIServer.registerMessageHandler(type, handler);
  });

  // Register custom message handlers
  registerCustomHandlers();

  // Start the HTTP server
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
    console.log(`🔗 WebSocket API available at ws://localhost:${PORT}/api/ws`);
  });

  return server;
}

// ============================================================================
// Custom Message Handlers
// ============================================================================

function registerCustomHandlers() {
  // Bill tracking handler
  webSocketAPIServer.registerMessageHandler('bill_subscribe', async (connection, message) => {
    try {
      const { billIds } = message.data;
      
      if (!Array.isArray(billIds)) {
        throw new Error('billIds must be an array');
      }

      // Subscribe to bills through bill tracking service
      const billService = new BillTrackingService();
      
      for (const billId of billIds) {
        await billService.subscribeToUpdates(billId, connection.userId);
        webSocketAPIServer.subscribeToTopic(connection.id, `bill:${billId}`);
      }

      console.log(`📋 User ${connection.userId} subscribed to bills:`, billIds);
      
      // Send confirmation
      connection.ws.send(JSON.stringify({
        type: 'bill_subscribed',
        data: { billIds },
        requestId: message.requestId
      }));

    } catch (error) {
      console.error('❌ Error subscribing to bills:', error);
      connection.ws.send(JSON.stringify({
        type: 'error',
        data: { 
          code: 4004,
          message: 'Failed to subscribe to bills',
          details: error.message
        },
        requestId: message.requestId
      }));
    }
  });

  // Community discussion handler
  webSocketAPIServer.registerMessageHandler('discussion_join', async (connection, message) => {
    try {
      const { billId } = message.data;
      
      // Join discussion through community service
      const communityService = new CommunityService();
      await communityService.joinDiscussion(billId, connection.userId);
      
      // Subscribe to discussion updates
      webSocketAPIServer.subscribeToTopic(connection.id, `discussion:${billId}`);
      
      console.log(`💬 User ${connection.userId} joined discussion for bill ${billId}`);
      
      // Send confirmation
      connection.ws.send(JSON.stringify({
        type: 'discussion_joined',
        data: { billId },
        requestId: message.requestId
      }));

    } catch (error) {
      console.error('❌ Error joining discussion:', error);
      connection.ws.send(JSON.stringify({
        type: 'error',
        data: { 
          code: 4004,
          message: 'Failed to join discussion',
          details: error.message
        },
        requestId: message.requestId
      }));
    }
  });

  // Typing indicator handler
  webSocketAPIServer.registerMessageHandler('typing_indicator', async (connection, message) => {
    try {
      const { billId, isTyping, parentId } = message.data;
      
      // Broadcast typing indicator to other users in the discussion
      webSocketAPIServer.broadcastToTopic(
        `discussion:${billId}`,
        {
          type: 'typing_indicator',
          data: {
            userId: connection.userId,
            billId,
            parentId,
            isTyping,
            timestamp: new Date().toISOString()
          }
        },
        connection.userId // Exclude the sender
      );

    } catch (error) {
      console.error('❌ Error handling typing indicator:', error);
    }
  });

  // Comment handler
  webSocketAPIServer.registerMessageHandler('comment', async (connection, message) => {
    try {
      const { billId, text, parentId } = message.data;
      
      // Create comment through community service
      const communityService = new CommunityService();
      const comment = await communityService.createComment({
        billId,
        userId: connection.userId,
        text,
        parentId
      });

      // Broadcast comment to all users in the discussion
      webSocketAPIServer.broadcastToTopic(
        `discussion:${billId}`,
        {
          type: 'comment',
          data: {
            ...comment,
            action: 'created'
          }
        }
      );

      console.log(`💬 Comment created by user ${connection.userId} for bill ${billId}`);

    } catch (error) {
      console.error('❌ Error creating comment:', error);
      connection.ws.send(JSON.stringify({
        type: 'error',
        data: { 
          code: 4004,
          message: 'Failed to create comment',
          details: error.message
        },
        requestId: message.requestId
      }));
    }
  });
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

function setupGracefulShutdown(server: any) {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    // Stop accepting new connections
    server.close(() => {
      console.log('🔌 HTTP server closed');
    });

    // Close WebSocket connections
    await webSocketAPIServer.shutdown();
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    console.log('🚀 Starting WebSocket API Server...\n');
    
    const server = await setupWebSocketServer();
    setupGracefulShutdown(server);
    
    console.log('\n✅ WebSocket API Server started successfully!');
    console.log('📊 Stats endpoint: http://localhost:3001/api/stats');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
if (require.main === module) {
  main();
}

// Export for testing
export { setupWebSocketServer, registerCustomHandlers };