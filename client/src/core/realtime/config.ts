/**
 * Real-time Configuration
 * 
 * Default configuration for WebSocket and real-time features
 */

import { WebSocketConfig, RealTimeConfig } from './types';

export const defaultWebSocketConfig: WebSocketConfig = {
  url: process.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  protocols: ['civic-engagement-v1'],
  heartbeat: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000    // 5 seconds
  },
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delay: 2000,     // 2 seconds
    backoff: 'exponential'
  },
  message: {
    compression: false, // Disable for now, can enable with proper implementation
    batching: true,
    batchSize: 10,
    batchInterval: 1000 // 1 second
  },
  security: {
    validateOrigin: true,
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://civic-engagement.app'
    ]
  }
};

export const defaultRealTimeConfig: RealTimeConfig = {
  websocket: defaultWebSocketConfig,
  bills: {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 2000,
    heartbeatInterval: 30000,
    batchUpdateInterval: 1000,
    maxBatchSize: 50
  },
  community: {
    typingIndicatorTimeout: 3000, // 3 seconds
    maxConcurrentSubscriptions: 20,
    enablePresence: true
  },
  notifications: {
    maxQueueSize: 100,
    persistOffline: true,
    enablePush: false // Disable push notifications by default
  }
};

// Environment-specific configurations
export const getWebSocketConfig = (): WebSocketConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  const config = { ...defaultWebSocketConfig };

  if (isDevelopment) {
    // Development-specific settings
    config.url = 'ws://localhost:3001/ws';
    config.heartbeat.interval = 15000; // More frequent heartbeats in dev
    config.reconnect.delay = 1000;     // Faster reconnection in dev
    config.security.validateOrigin = false; // Relaxed security in dev
  }

  if (isProduction) {
    // Production-specific settings
    config.url = process.env.VITE_WS_URL || 'wss://api.civic-engagement.app/ws';
    config.message.compression = true;  // Enable compression in production
    config.security.validateOrigin = true;
    config.security.allowedOrigins = [
      'https://civic-engagement.app',
      'https://www.civic-engagement.app'
    ];
  }

  return config;
};

export const getRealTimeConfig = (): RealTimeConfig => {
  return {
    ...defaultRealTimeConfig,
    websocket: getWebSocketConfig()
  };
};