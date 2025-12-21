/**
 * WebSocket API Server Example
 * 
 * Example of how to initialize and use the WebSocket API server
 */

import { createServer } from 'http';



import express from 'express';



import type { WebSocketMessage } from './types/websocket';
import { WebSocketAPIServer, defaultMessageHandlers, type WebSocketConnection } from './websocket';
// import { BillTrackingService } from '../services/bill-tracking';
// import { CommunityService } from '../services/community';
// import { NotificationService } from '../services/notifications';

// ============================================================================
// Server Setup
// ============================================================================

// Mock services for example (replace with actual imports when available)
class BillTrackingService {
  async subscribeToUpdates(billId: string, userId: string): Promise<void> {
    console.log(`Subscribing user ${userId} to bill ${billId}`);
  }
}

class CommunityService {
  async joinDiscussion(billId: string, userId: string): Promise<void> {
    console.log(`User ${userId} joining discussion for bill ${billId}`);
  }

  async createComment(data: {
    billId: string;
    userId: string;
    text: string;
    parentId?: string;
  }): Promise<Record<string, unknown>> {
    console.log(`Creating comment for bill ${data.billId}`);
    return {
      id: `comment_${Date.now()}`,
      ...data,
      timestamp: new Date().toISOString()
    };
  }
}

// Type guard for message data
interface MessageData {
  billId?: string;
  billIds?: string[];
  isTyping?: boolean;
  parentId?: string;
  text?: string;
  [key: string]: unknown;
}

function isMessageData(data: unknown): data is MessageData {
  return typeof data === 'object' && data !== null;
}

async function setupWebSocketServer() {
  // Create Express app and HTTP server
  const app = express();
  const server = createServer(app);

  // Initialize WebSocket API server
  const webSocketAPIServer = new WebSocketAPIServer(server);
  await webSocketAPIServer.initialize();

  // Register default message handlers
  Object.entries(defaultMessageHandlers).forEach(([type, handler]) => {
    webSocketAPIServer.registerMessageHandler(type, handler);
  });

  // Register custom message handlers
  registerCustomHandlers(webSocketAPIServer);

  // Start the HTTP server
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
    console.log(`🔗 WebSocket API available at ws://localhost:${PORT}/api/ws`);
  });

  return { server, webSocketAPIServer };
}

// ============================================================================
// Custom Message Handlers
// ============================================================================

function registerCustomHandlers(webSocketAPIServer: WebSocketAPIServer) {
  // Bill tracking handler
  webSocketAPIServer.registerMessageHandler('bill_subscribe', async (connection: WebSocketConnection, message: WebSocketMessage) => {
    try {
      if (!isMessageData(message.data)) {
        throw new Error('Invalid message data');
      }
      
      const { billIds } = message.data;
      
      if (!Array.isArray(billIds)) {
        throw new Error('billIds must be an array');
      }

      if (!connection.userId) {
        throw new Error('User ID not found');
      }

      // Subscribe to bills through bill tracking service
      const billService = new BillTrackingService();
      
      for (const billId of billIds) {
        if (typeof billId === 'string') {
          await billService.subscribeToUpdates(billId, connection.userId);
          webSocketAPIServer.subscribeToTopic(connection.id, `bill:${billId}`);
        }
      }

      console.log(`📋 User ${connection.userId} subscribed to bills:`, billIds);
      
      // Send confirmation
      connection.ws.send(JSON.stringify({
        type: 'bill_subscribed',
        data: { billIds }
      }));

    } catch (error) {
      console.error('❌ Error subscribing to bills:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      connection.ws.send(JSON.stringify({
        type: 'error',
        data: { 
          code: 4004,
          message: 'Failed to subscribe to bills',
          details: errorMessage
        }
      }));
    }
  });

  // Community discussion handler
  webSocketAPIServer.registerMessageHandler('discussion_join', async (connection: WebSocketConnection, message: WebSocketMessage) => {
    try {
      if (!isMessageData(message.data)) {
        throw new Error('Invalid message data');
      }

      const { billId } = message.data;

      if (typeof billId !== 'string') {
        throw new Error('billId must be a string');
      }

      if (!connection.userId) {
        throw new Error('User ID not found');
      }
      
      // Join discussion through community service
      const communityService = new CommunityService();
      await communityService.joinDiscussion(billId, connection.userId);
      
      // Subscribe to discussion updates
      webSocketAPIServer.subscribeToTopic(connection.id, `discussion:${billId}`);
      
      console.log(`💬 User ${connection.userId} joined discussion for bill ${billId}`);
      
      // Send confirmation
      connection.ws.send(JSON.stringify({
        type: 'discussion_joined',
        data: { billId }
      }));

    } catch (error) {
      console.error('❌ Error joining discussion:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      connection.ws.send(JSON.stringify({
        type: 'error',
        data: { 
          code: 4004,
          message: 'Failed to join discussion',
          details: errorMessage
        }
      }));
    }
  });

  // Typing indicator handler
  webSocketAPIServer.registerMessageHandler('typing_indicator', async (connection: WebSocketConnection, message: WebSocketMessage) => {
    try {
      if (!isMessageData(message.data)) {
        throw new Error('Invalid message data');
      }

      const { billId, isTyping, parentId } = message.data;

      if (typeof billId !== 'string' || typeof isTyping !== 'boolean') {
        throw new Error('Invalid typing indicator data');
      }
      
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
  webSocketAPIServer.registerMessageHandler('comment', async (connection: WebSocketConnection, message: WebSocketMessage) => {
    try {
      if (!isMessageData(message.data)) {
        throw new Error('Invalid message data');
      }

      const { billId, text, parentId } = message.data;

      if (typeof billId !== 'string' || typeof text !== 'string') {
        throw new Error('billId and text are required');
      }

      if (!connection.userId) {
        throw new Error('User ID not found');
      }
      
      // Create comment through community service
      const communityService = new CommunityService();
      const comment = await communityService.createComment({
        billId,
        userId: connection.userId,
        text,
        parentId: typeof parentId === 'string' ? parentId : undefined
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      connection.ws.send(JSON.stringify({
        type: 'error',
        data: { 
          code: 4004,
          message: 'Failed to create comment',
          details: errorMessage
        }
      }));
    }
  });
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

function setupGracefulShutdown(
  server: ReturnType<typeof createServer>,
  webSocketAPIServer: WebSocketAPIServer
) {
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
    
    const { server, webSocketAPIServer } = await setupWebSocketServer();
    setupGracefulShutdown(server, webSocketAPIServer);
    
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