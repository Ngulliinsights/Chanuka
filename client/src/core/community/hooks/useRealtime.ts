/**
 * Realtime Hook
 * 
 * Dedicated hook for real-time WebSocket functionality,
 * can be used independently or as part of unified community hooks.
 */

import { useEffect, useState, useCallback } from 'react';

import { WebSocketManager } from '../services/websocket-manager';
import type { WebSocketEvents } from '../types';

interface UseRealtimeOptions {
  autoConnect?: boolean;
  rooms?: string[];
}

interface UseRealtimeReturn {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  emit: <K extends keyof WebSocketEvents>(event: K, data: WebSocketEvents[K]) => void;
  on: <K extends keyof WebSocketEvents>(
    event: K, 
    handler: (data: WebSocketEvents[K]) => void
  ) => () => void;
}

export function useRealtime({
  autoConnect = true,
  rooms = [],
}: UseRealtimeOptions = {}): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [wsManager] = useState(() => WebSocketManager.getInstance());

  // Connect on mount if autoConnect is enabled
  useEffect(() => {
    if (autoConnect) {
      wsManager.connect().then(() => {
        setIsConnected(true);
        
        // Join initial rooms
        rooms.forEach(room => {
          wsManager.joinRoom(room);
        });
      }).catch(error => {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
      });
    }

    // Set up connection status monitoring
    const checkConnection = () => {
      setIsConnected(wsManager.isConnected());
    };

    const interval = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(interval);
      if (autoConnect) {
        wsManager.disconnect();
      }
    };
  }, [wsManager, autoConnect, rooms]);

  const connect = useCallback(async () => {
    try {
      await wsManager.connect();
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnected(false);
      throw error;
    }
  }, [wsManager]);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
    setIsConnected(false);
  }, [wsManager]);

  const joinRoom = useCallback((room: string) => {
    wsManager.joinRoom(room);
  }, [wsManager]);

  const leaveRoom = useCallback((room: string) => {
    wsManager.leaveRoom(room);
  }, [wsManager]);

  const emit = useCallback(<K extends keyof WebSocketEvents>(
    event: K, 
    data: WebSocketEvents[K]
  ) => {
    wsManager.emit(event, data);
  }, [wsManager]);

  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K, 
    handler: (data: WebSocketEvents[K]) => void
  ) => {
    return wsManager.on(event, handler);
  }, [wsManager]);

  return {
    isConnected,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    emit,
    on,
  };
}