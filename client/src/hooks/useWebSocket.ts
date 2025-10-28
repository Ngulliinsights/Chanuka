import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@shared/core';

interface WebSocketMessage {
  type: 'connected' | 'subscribed' | 'unsubscribed' | 'bill_update' | 'notification' | 'error' | 'pong';
  billId?: number;
  update?: {
    type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
    data: any;
    timestamp: string;
  };
  notification?: {
    type: string;
    title: string;
    message: string;
    data?: any;
  };
  message?: string;
  data?: any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  url?: string;
  token?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  reconnectAttempts: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = `ws://${window.location.hostname}:${window.location.port || '4200'}/ws`,
    token,
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    debug = false
  } = options;

  // Core WebSocket and timer references
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Message handlers stored in a ref to avoid triggering re-renders
  const messageHandlers = useRef<Map<string, (message: WebSocketMessage) => void>>(new Map());
  
  // Track component mount status to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Flag to prevent reconnection after manual disconnect
  const shouldReconnectRef = useRef(true);
  
  // Store subscribers in a ref to avoid stale closure issues in reconnection
  const subscribersRef = useRef<Set<number>>(new Set());

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    reconnectAttempts: 0
  });

  // Expose subscribers as state for reactivity when needed
  const [subscribers, setSubscribers] = useState<Set<number>>(new Set());

  // Logging helper that respects debug flag
  const log = useCallback((...args: any[]) => {
    if (debug) {
      logger.info('[WebSocket]', { component: 'Chanuka' }, ...args);
    }
  }, [debug]);

  // Safe state updater that only runs when component is mounted
  const safeSetState = useCallback((updater: (prev: WebSocketState) => WebSocketState) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  // Clear all timers and intervals to prevent memory leaks
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  // Enhanced heartbeat with pong verification
  const startHeartbeat = useCallback(() => {
    clearTimers();

    pingIntervalRef.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ type: 'ping' }));
          log('Ping sent');

          // Set timeout for pong response - if no pong received, connection may be dead
          pongTimeoutRef.current = setTimeout(() => {
            log('Pong timeout - connection may be dead');
            // Close the connection to trigger reconnection
            ws.current?.close(4000, 'Heartbeat timeout');
          }, 5000); // Wait 5 seconds for pong response

        } catch (error) {
          logger.error('Failed to send ping:', { component: 'Chanuka' }, error);
          ws.current?.close(4000, 'Ping failed');
        }
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, clearTimers, log]);

  // Resubscribe to all tracked bills after reconnection
  const resubscribeToAllBills = useCallback(() => {
    // Use ref instead of state to get current subscribers without closure issues
    subscribersRef.current.forEach(billId => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ 
            type: 'subscribe', 
            data: { billId } 
          }));
          log(`Resubscribed to bill ${billId}`);
        } catch (error) {
          console.error(`Failed to resubscribe to bill ${billId}:`, error);
        }
      }
    });
  }, [log]);

  // Clean disconnect that prevents reconnection
  const disconnect = useCallback(() => {
    log('Disconnecting...');
    shouldReconnectRef.current = false;
    clearTimers();

    if (ws.current) {
      // Remove all event listeners to prevent any callbacks
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.onopen = null;
      
      // Close connection with normal closure code
      if (ws.current.readyState === WebSocket.OPEN || 
          ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close(1000, 'Manual disconnect');
      }
      ws.current = null;
    }

    safeSetState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
      error: null
    }));
  }, [clearTimers, safeSetState, log]);

  // Main connection function with comprehensive error handling
  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (ws.current?.readyState === WebSocket.OPEN || 
        ws.current?.readyState === WebSocket.CONNECTING) {
      log('Connection already exists, skipping...');
      return;
    }

    // Validate authentication token
    if (!token) {
      console.warn('WebSocket connection requires authentication token');
      safeSetState(prev => ({
        ...prev,
        error: 'Authentication token required',
        isConnecting: false
      }));
      return;
    }

    // Enable reconnection for this connection attempt
    shouldReconnectRef.current = true;
    
    log('Connecting...');
    safeSetState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Clean up any existing connection first
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      // Construct authenticated WebSocket URL
      const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
      ws.current = new WebSocket(wsUrl);

      // Handle successful connection
      ws.current.onopen = () => {
        log('Connected successfully');
        safeSetState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0
        }));

        // Start heartbeat monitoring
        startHeartbeat();

        // Restore all bill subscriptions
        resubscribeToAllBills();
      };

      // Handle incoming messages
      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle pong responses to clear timeout
          if (message.type === 'pong') {
            if (pongTimeoutRef.current) {
              clearTimeout(pongTimeoutRef.current);
              pongTimeoutRef.current = null;
            }
            log('Pong received');
            return;
          }

          log('Message received:', message.type);
          safeSetState(prev => ({ ...prev, lastMessage: message }));

          // Notify all registered handlers
          messageHandlers.current.forEach(handler => {
            try {
              handler(message);
            } catch (error) {
              logger.error('Error in message handler:', { component: 'Chanuka' }, error);
            }
          });

        } catch (error) {
          logger.error('Error parsing WebSocket message:', { component: 'Chanuka' }, error);
        }
      };

      // Handle connection closure
      ws.current.onclose = (event) => {
        log('Connection closed:', event.code, event.reason);
        clearTimers();

        safeSetState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));

        // Determine if we should attempt reconnection
        // Normal closures (1000, 1001) or manual disconnect should not reconnect
        const isNormalClosure = event.code === 1000 || event.code === 1001;
        const shouldAttemptReconnect = !isNormalClosure && 
                                       shouldReconnectRef.current && 
                                       isMountedRef.current;

        if (shouldAttemptReconnect) {
          safeSetState(prev => {
            // Check if we haven't exceeded max attempts
            if (prev.reconnectAttempts < maxReconnectAttempts) {
              const newAttempts = prev.reconnectAttempts + 1;
              
              // Exponential backoff with cap at 8x base interval
              const backoffDelay = reconnectInterval * Math.min(Math.pow(2, newAttempts - 1), 8);

              log(`Scheduling reconnection attempt ${newAttempts}/${maxReconnectAttempts} in ${backoffDelay}ms`);

              reconnectTimeoutRef.current = setTimeout(() => {
                connect();
              }, backoffDelay);

              return { ...prev, reconnectAttempts: newAttempts };
            } else {
              logger.error('Max reconnection attempts reached', { component: 'Chanuka' });
              return {
                ...prev,
                error: 'Failed to reconnect after multiple attempts'
              };
            }
          });
        }
      };

      // Handle connection errors
      ws.current.onerror = (error) => {
        logger.error('WebSocket error:', { component: 'Chanuka' }, error);
        safeSetState(prev => ({
          ...prev,
          error: 'Connection error',
          isConnecting: false
        }));
      };

    } catch (error) {
      logger.error('Failed to create WebSocket connection:', { component: 'Chanuka' }, error);
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect',
        isConnecting: false
      }));
    }
  }, [url, token, maxReconnectAttempts, reconnectInterval, 
      startHeartbeat, resubscribeToAllBills, clearTimers, safeSetState, log]);

  // Send a message through the WebSocket
  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        logger.error('Failed to send message:', { component: 'Chanuka' }, error);
        return false;
      }
    }
    log('Cannot send message - WebSocket not open. State:', ws.current?.readyState);
    return false;
  }, [log]);

  // Subscribe to updates for a specific bill
  const subscribeToBill = useCallback((billId: number) => {
    const success = sendMessage({ type: 'subscribe', data: { billId } });
    if (success) {
      // Update both ref (for reconnection) and state (for reactivity)
      subscribersRef.current.add(billId);
      setSubscribers(prev => new Set(prev).add(billId));
      log(`Subscribed to bill ${billId}`);
    }
    return success;
  }, [sendMessage, log]);

  // Unsubscribe from updates for a specific bill
  const unsubscribeFromBill = useCallback((billId: number) => {
    const success = sendMessage({ type: 'unsubscribe', data: { billId } });
    if (success) {
      // Update both ref and state
      subscribersRef.current.delete(billId);
      setSubscribers(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });
      log(`Unsubscribed from bill ${billId}`);
    }
    return success;
  }, [sendMessage, log]);

  // Register a message handler with automatic cleanup
  const addMessageHandler = useCallback((id: string, handler: (message: WebSocketMessage) => void) => {
    messageHandlers.current.set(id, handler);
    log(`Message handler registered: ${id}`);

    // Return cleanup function
    return () => {
      messageHandlers.current.delete(id);
      log(`Message handler removed: ${id}`);
    };
  }, [log]);

  // Effect for initial connection on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoConnect && token) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      clearTimers();
      
      if (ws.current) {
        ws.current.close(1000, 'Component unmounted');
        ws.current = null;
      }
    };
  }, [autoConnect]); // Only depend on autoConnect flag

  // Effect to handle token changes - reconnect with new token
  useEffect(() => {
    // Skip on initial mount (empty string or undefined token)
    if (!token) return;

    // CRITICAL FIX: Use refs to avoid circular dependencies
    const currentConnect = () => {
      // Prevent duplicate connections
      if (ws.current?.readyState === WebSocket.OPEN || 
          ws.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      if (!token) {
        safeSetState(prev => ({
          ...prev,
          error: 'Authentication token required',
          isConnecting: false
        }));
        return;
      }

      shouldReconnectRef.current = true;
      safeSetState(prev => ({ ...prev, isConnecting: true, error: null }));

      try {
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }

        const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          safeSetState(prev => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            error: null,
            reconnectAttempts: 0
          }));
          startHeartbeat();
          resubscribeToAllBills();
        };

        // Set up other event handlers...
        ws.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            if (message.type === 'pong') {
              if (pongTimeoutRef.current) {
                clearTimeout(pongTimeoutRef.current);
                pongTimeoutRef.current = null;
              }
              return;
            }
            safeSetState(prev => ({ ...prev, lastMessage: message }));
            messageHandlers.current.forEach(handler => handler(message));
          } catch (error) {
            logger.error('Failed to parse WebSocket message:', { component: 'Chanuka' }, error);
          }
        };

        ws.current.onerror = (error) => {
          logger.error('WebSocket error:', { component: 'Chanuka' }, error);
          safeSetState(prev => ({ ...prev, error: 'Connection error' }));
        };

        ws.current.onclose = (event) => {
          clearTimers();
          safeSetState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
          
          if (shouldReconnectRef.current && event.code !== 1000) {
            safeSetState(prev => {
              const newAttempts = prev.reconnectAttempts + 1;
              if (newAttempts <= maxReconnectAttempts) {
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current && shouldReconnectRef.current) {
                    currentConnect();
                  }
                }, reconnectInterval);
              }
              return { ...prev, reconnectAttempts: newAttempts };
            });
          }
        };

      } catch (error) {
        logger.error('Failed to create WebSocket connection:', { component: 'Chanuka' }, error);
        safeSetState(prev => ({ ...prev, error: 'Failed to connect', isConnecting: false }));
      }
    };

    const currentDisconnect = () => {
      shouldReconnectRef.current = false;
      clearTimers();

      if (ws.current) {
        ws.current.onclose = null;
        ws.current.onerror = null;
        ws.current.onmessage = null;
        ws.current.onopen = null;
        
        if (ws.current.readyState === WebSocket.OPEN || 
            ws.current.readyState === WebSocket.CONNECTING) {
          ws.current.close(1000, 'Manual disconnect');
        }
        ws.current = null;
      }

      safeSetState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        reconnectAttempts: 0,
        error: null
      }));
    };

    // If already connected, reconnect with new token
    if (state.isConnected) {
      currentDisconnect();
      
      // Small delay to ensure clean disconnect before reconnecting
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          currentConnect();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
    // If not connected but autoConnect is enabled, connect with new token
    else if (autoConnect) {
      currentConnect();
    }
  }, [token]); // CRITICAL FIX: Only depend on token to prevent circular dependencies

  return {
    // Connection state
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,

    // Last received message
    lastMessage: state.lastMessage,

    // Connection control methods
    connect,
    disconnect,

    // Message sending
    sendMessage,

    // Bill subscription management
    subscribeToBill,
    unsubscribeFromBill,
    subscribedBills: Array.from(subscribers),

    // Message handler registration
    addMessageHandler
  };
}












































