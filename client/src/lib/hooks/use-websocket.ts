/**
 * WebSocket Hook
 * Provides WebSocket functionality with React hooks
 */

import { useEffect, useState, useCallback } from 'react';

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const sendMessage = useCallback((message: unknown) => {
    // Send message implementation
    console.log('Sending message:', message);
  }, []);

  useEffect(() => {
    // WebSocket connection logic
    setIsConnected(true);
    
    return () => {
      setIsConnected(false);
    };
  }, [options.url]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}

export default useWebSocket;
