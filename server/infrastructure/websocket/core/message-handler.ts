/**
 * MessageHandler - Handles WebSocket message processing and broadcasting
 * 
 * This class processes incoming WebSocket messages, validates them, routes them
 * to appropriate handlers, and manages message broadcasting to subscribers.
 * Includes deduplication, error handling, and integration with subscription
 * and queue management systems.
 */

import type { 
  AuthenticatedWebSocket, 
  IMessageHandler,
  IOperationQueueManager,
  ISubscriptionManager,
  QueueOperation,
  WebSocketMessage} from '../types';
import { LRUCache } from '../utils';
import { OPERATION_PRIORITIES } from './operation-queue-manager';

/**
 * Message validation error types
 */
export class MessageValidationError extends Error {
  constructor(message: string, public readonly messageType?: string) {
    super(message);
    this.name = 'MessageValidationError';
  }
}

/**
 * Message processing error types
 */
export class MessageProcessingError extends Error {
  constructor(message: string, public readonly messageType?: string) {
    super(message);
    this.name = 'MessageProcessingError';
  }
}

export class MessageHandler implements IMessageHandler {
   private subscriptionManager: ISubscriptionManager;
   private operationQueueManager: IOperationQueueManager;
   private dedupeCache: LRUCache<string, boolean>;
   private dedupeWindow: number;
   private messageBuffer = new Map<AuthenticatedWebSocket, Array<Record<string, unknown>>>();
   private flushTimers = new Map<AuthenticatedWebSocket, NodeJS.Timeout>();

  constructor(
    subscriptionManager: ISubscriptionManager,
    operationQueueManager: IOperationQueueManager,
    options: {
      dedupeCacheSize?: number;
      dedupeWindow?: number;
    } = {}
  ) {
    this.subscriptionManager = subscriptionManager;
    this.operationQueueManager = operationQueueManager;

    // Initialize deduplication cache
    this.dedupeCache = new LRUCache<string, boolean>(options.dedupeCacheSize || 5000);
    this.dedupeWindow = options.dedupeWindow || 5000; // 5 seconds
  }

  /**
   * Handle incoming WebSocket message
   * @param ws The WebSocket connection
   * @param message The incoming message
   */
  async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    try {
      // Validate message structure
      if (!this.validateMessage(message)) {
        throw new MessageValidationError('Invalid message format', message.type);
      }

      // Check for duplicate messages
      if (this.isDuplicateMessage(message)) {
        // eslint-disable-next-line no-console
        console.warn('Duplicate message detected, ignoring:', message.messageId);
        return;
      }

      // Route message to appropriate handler
      await this.routeMessage(ws, message);

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error handling message:', error);
      await this.sendErrorResponse(ws, message, error);
    }
  }

  /**
   * Validate message structure and content
   * @param message The message to validate
   * @returns true if message is valid
   */
  validateMessage(message: WebSocketMessage): boolean {
    if (!message || typeof message !== 'object') {
      return false;
    }

    // Check required fields
    if (!message.type || typeof message.type !== 'string') {
      return false;
    }

    // Validate message type
    const validTypes = [
      'subscribe', 'unsubscribe', 'ping', 'pong', 'auth',
      'get_preferences', 'update_preferences', 'batch_subscribe', 'batch_unsubscribe'
    ];
    
    if (!validTypes.includes(message.type)) {
      return false;
    }

    // Validate data based on message type
    return this.validateMessageData(message);
  }

  /**
   * Broadcast message to all subscribers of a bill
   * @param billId The bill ID to broadcast to
   * @param message The message to broadcast
   */
  broadcastToSubscribers(billId: number, message: Record<string, unknown>): void {
    try {
      // Get all subscribers for the bill
      const subscribers = this.subscriptionManager.getSubscribers(billId);
      
      if (subscribers.length === 0) {
        return;
      }

      // Create broadcast operation
      const operation: QueueOperation = {
        type: 'broadcast',
        priority: OPERATION_PRIORITIES.NORMAL,
        data: {
          billId,
          message,
          subscribers: subscribers.map(ws => ws.connectionId).filter(Boolean),
        },
        timestamp: Date.now(),
      };

      // Queue the broadcast operation
      const queued = this.operationQueueManager.enqueue(operation);
      if (!queued) {
        // eslint-disable-next-line no-console
        console.warn('Failed to queue broadcast operation for bill:', billId);
        // Fallback to direct broadcast
        this.directBroadcast(subscribers, message);
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error broadcasting to subscribers:', error);
    }
  }

  /**
   * Route message to appropriate handler based on type
   * @param ws The WebSocket connection
   * @param message The message to route
   */
  private async routeMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(ws, message);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(ws, message);
        break;
      case 'batch_subscribe':
        await this.handleBatchSubscribe(ws, message);
        break;
      case 'batch_unsubscribe':
        await this.handleBatchUnsubscribe(ws, message);
        break;
      case 'ping':
        await this.handlePing(ws, message);
        break;
      case 'pong':
        await this.handlePong(ws, message);
        break;
      case 'auth':
        await this.handleAuth(ws, message);
        break;
      case 'get_preferences':
        await this.handleGetPreferences(ws, message);
        break;
      case 'update_preferences':
        await this.handleUpdatePreferences(ws, message);
        break;
      default:
        throw new MessageProcessingError(`Unknown message type: ${message.type}`, message.type);
    }
  }

  /**
   * Handle subscribe message
   * @param ws The WebSocket connection
   * @param message The subscribe message
   */
  private async handleSubscribe(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    const billId = message.data?.bill_id;
    
    if (!billId || typeof billId !== 'number') {
      throw new MessageValidationError('Invalid bill_id for subscribe message');
    }

    // Execute subscription directly
    this.subscriptionManager.subscribe(ws, billId);

    // Also queue operation for processing pipeline
    const operation: QueueOperation = {
      type: 'subscribe',
      priority: OPERATION_PRIORITIES.HIGH,
      data: {
        ws,
        billId,
        messageId: message.messageId,
      },
      timestamp: Date.now(),
    };

    this.operationQueueManager.enqueue(operation);

    // Send confirmation
    await this.sendResponse(ws, {
      type: 'subscribe_confirmation',
      data: { bill_id: billId },
      messageId: message.messageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle unsubscribe message
   * @param ws The WebSocket connection
   * @param message The unsubscribe message
   */
  private async handleUnsubscribe(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    const billId = message.data?.bill_id;
    
    if (!billId || typeof billId !== 'number') {
      throw new MessageValidationError('Invalid bill_id for unsubscribe message');
    }

    // Execute unsubscription directly
    this.subscriptionManager.unsubscribe(ws, billId);

    // Also queue operation for processing pipeline
    const operation: QueueOperation = {
      type: 'unsubscribe',
      priority: OPERATION_PRIORITIES.HIGH,
      data: {
        ws,
        billId,
        messageId: message.messageId,
      },
      timestamp: Date.now(),
    };

    this.operationQueueManager.enqueue(operation);

    // Send confirmation
    await this.sendResponse(ws, {
      type: 'unsubscribe_confirmation',
      data: { bill_id: billId },
      messageId: message.messageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle batch subscribe message
   * @param ws The WebSocket connection
   * @param message The batch subscribe message
   */
  private async handleBatchSubscribe(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    const billIds = message.data?.bill_ids;
    
    if (!Array.isArray(billIds) || billIds.length === 0) {
      throw new MessageValidationError('Invalid bill_ids for batch_subscribe message');
    }

    // Validate all bill IDs
    for (const billId of billIds) {
      if (typeof billId !== 'number') {
        throw new MessageValidationError(`Invalid bill_id in batch: ${billId}`);
      }
    }

    // Use subscription manager's batch subscribe
    this.subscriptionManager.batchSubscribe(ws, billIds);

    // Send confirmation
    await this.sendResponse(ws, {
      type: 'batch_subscribe_confirmation',
      data: { bill_ids: billIds },
      messageId: message.messageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle batch unsubscribe message
   * @param ws The WebSocket connection
   * @param message The batch unsubscribe message
   */
  private async handleBatchUnsubscribe(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    const billIds = message.data?.bill_ids;
    
    if (!Array.isArray(billIds) || billIds.length === 0) {
      throw new MessageValidationError('Invalid bill_ids for batch_unsubscribe message');
    }

    // Validate all bill IDs
    for (const billId of billIds) {
      if (typeof billId !== 'number') {
        throw new MessageValidationError(`Invalid bill_id in batch: ${billId}`);
      }
    }

    // Use subscription manager's batch unsubscribe
    this.subscriptionManager.batchUnsubscribe(ws, billIds);

    // Send confirmation
    await this.sendResponse(ws, {
      type: 'batch_unsubscribe_confirmation',
      data: { bill_ids: billIds },
      messageId: message.messageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle ping message
   * @param ws The WebSocket connection
   * @param message The ping message
   */
  private async handlePing(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    // Update connection alive status
    ws.isAlive = true;
    ws.lastPing = Date.now();

    // Send pong response
    await this.sendResponse(ws, {
      type: 'pong',
      messageId: message.messageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle pong message
   * @param ws The WebSocket connection
   * @param _message The pong message (unused)
   */
  private async handlePong(ws: AuthenticatedWebSocket, _message: WebSocketMessage): Promise<void> {
    // Update connection alive status
    ws.isAlive = true;
    ws.lastPing = Date.now();
  }

  /**
   * Handle authentication message
   * @param ws The WebSocket connection
   * @param message The auth message
   */
  private async handleAuth(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    const token = message.data?.token;
    
    if (!token || typeof token !== 'string') {
      throw new MessageValidationError('Invalid token for auth message');
    }

    // This would integrate with the ConnectionManager for authentication
    // For now, we simulate successful authentication
    ws.user_id = 'authenticated_user'; // This would be set by ConnectionManager

    // Send confirmation
    await this.sendResponse(ws, {
      type: 'auth_confirmation',
      data: { authenticated: true },
      messageId: message.messageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle get preferences message
   * @param ws The WebSocket connection
   * @param _message The get preferences message (unused)
   */
  private async handleGetPreferences(ws: AuthenticatedWebSocket, _message: WebSocketMessage): Promise<void> {
    // This would integrate with user preferences system
    // For now, we return default preferences
    const preferences = {
      updateFrequency: 'immediate',
      notificationTypes: ['status_change', 'new_comment', 'amendment', 'voting_scheduled'],
    };

    await this.sendResponse(ws, {
      type: 'preferences_response',
      data: { preferences },
      messageId: _message.messageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle update preferences message
   * @param ws The WebSocket connection
   * @param message The update preferences message
   */
  private async handleUpdatePreferences(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    const preferences = message.data?.preferences;
    
    if (!preferences || typeof preferences !== 'object') {
      throw new MessageValidationError('Invalid preferences for update_preferences message');
    }

    // This would integrate with user preferences system
    // For now, we simulate successful update

    await this.sendResponse(ws, {
      type: 'preferences_updated',
      data: { success: true },
      messageId: message.messageId,
      timestamp: Date.now(),
    });
  }

  /**
   * Validate message data based on message type
   * @param message The message to validate
   * @returns true if message data is valid
   */
  private validateMessageData(message: WebSocketMessage): boolean {
    switch (message.type) {
      case 'subscribe':
      case 'unsubscribe':
        return message.data?.bill_id !== undefined && typeof message.data.bill_id === 'number';
      
      case 'batch_subscribe':
      case 'batch_unsubscribe': {
        const billIds = message.data?.bill_ids;
        return Array.isArray(billIds) && billIds.length > 0;
      }
      
      case 'auth':
        return message.data?.token !== undefined && typeof message.data.token === 'string';
      
      case 'update_preferences':
        return message.data?.preferences !== undefined && typeof message.data.preferences === 'object';
      
      case 'ping':
      case 'pong':
      case 'get_preferences':
        return true; // These don't require specific data
      
      default:
        return false;
    }
  }

  /**
   * Check if message is a duplicate based on messageId and timestamp
   * @param message The message to check
   * @returns true if message is a duplicate
   */
  private isDuplicateMessage(message: WebSocketMessage): boolean {
    if (!message.messageId) {
      return false; // Can't dedupe without messageId
    }

    const cacheKey = message.messageId;
    
    // Check if we've seen this message recently
    if (this.dedupeCache.has(cacheKey)) {
      return true;
    }

    // Add to cache (not a duplicate)
    this.dedupeCache.set(cacheKey, true);
    
    // Clean up expired entries after the deduplication window
    setTimeout(() => {
      this.dedupeCache.delete(cacheKey);
    }, this.dedupeWindow);

    return false;
  }

  /**
   * Send response message to WebSocket connection
   * @param ws The WebSocket connection
   * @param response The response message
   */
  private async sendResponse(ws: AuthenticatedWebSocket, response: Record<string, unknown>): Promise<void> {
    if (ws.readyState !== ws.OPEN) {
      return;
    }

    try {
      const responseStr = JSON.stringify(response);
      ws.send(responseStr);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending response:', error);
    }
  }

  /**
   * Send error response to WebSocket connection
   * @param ws The WebSocket connection
   * @param originalMessage The original message that caused the error
   * @param error The error that occurred
   */
  private async sendErrorResponse(
    ws: AuthenticatedWebSocket, 
    originalMessage: WebSocketMessage, 
    error: unknown
  ): Promise<void> {
    const errorResponse = {
      type: 'error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        originalType: originalMessage?.type,
      },
      messageId: originalMessage?.messageId,
      timestamp: Date.now(),
    };

    await this.sendResponse(ws, errorResponse);
  }

  /**
   * Direct broadcast to subscribers (fallback when queue is full)
   * @param subscribers Array of WebSocket connections
   * @param message The message to broadcast
   */
  private directBroadcast(subscribers: AuthenticatedWebSocket[], message: Record<string, unknown>): void {
    const messageStr = JSON.stringify(message);
    
    for (const ws of subscribers) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error in direct broadcast:', error);
        }
      }
    }
  }

  /**
   * Clean up resources for a WebSocket connection
   * @param ws The WebSocket connection to clean up
   */
  cleanup(ws: AuthenticatedWebSocket): void {
    // Clear message buffer
    this.messageBuffer.delete(ws);
    
    // Clear flush timer
    const timer = this.flushTimers.get(ws);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(ws);
    }
    
    // Clean up subscriptions
    this.subscriptionManager.cleanup(ws);
  }

  /**
   * Get statistics for monitoring
   * @returns Object with message handler statistics
   */
  getStats(): {
    dedupeCacheSize: number;
    messageBufferSize: number;
    activeFlushTimers: number;
  } {
    return {
      dedupeCacheSize: this.dedupeCache.size(),
      messageBufferSize: this.messageBuffer.size,
      activeFlushTimers: this.flushTimers.size,
    };
  }
}