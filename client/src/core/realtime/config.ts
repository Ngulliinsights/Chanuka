/**
 * Real-time Configuration
 *
 * Default configuration for WebSocket and real-time features
 */

import { WebSocketConfig, RealTimeConfig } from './types';

export const defaultWebSocketConfig: WebSocketConfig = {
  url: process.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  protocols: ['civic-engagement-v1'],
  reconnect: true,
  reconnectInterval: 2000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  heartbeat: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
  },
  message: {
    maxSize: 1024 * 1024, // 1MB
    compression: false, // Disable for now, can enable with proper implementation
    batching: {
      enabled: true,
      maxSize: 10,
      flushInterval: 1000, // 1 second
    },
  },
  security: {
    encryption: false,
    validateOrigin: true,
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://civic-engagement.app',
    ],
  },
};

export const defaultRealTimeConfig: RealTimeConfig = {
  websocket: defaultWebSocketConfig,
  enableBillTracking: true,
  enableCommunityUpdates: true,
  enableNotifications: true,
  updateThrottleMs: 1000,
  bills: {
    pollingInterval: 30000,
    batchUpdates: true,
    autoReconnect: true,
  },
};

// Environment-specific configurations
export const getWebSocketConfig = (): WebSocketConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  const config = { ...defaultWebSocketConfig };

  if (isDevelopment) {
    // Development-specific settings
    config.url = 'ws://localhost:3001/ws';
    config.heartbeatInterval = 15000; // More frequent heartbeats in dev
    config.reconnectInterval = 1000; // Faster reconnection in dev
    if (config.security) {
      config.security.validateOrigin = false; // Relaxed security in dev
    }
  }

  if (isProduction) {
    // Production-specific settings
    config.url = process.env.VITE_WS_URL || 'wss://api.civic-engagement.app/ws';
    if (config.message) {
      config.message.compression = true; // Enable compression in production
    }
    if (config.security) {
      config.security.validateOrigin = true;
      config.security.allowedOrigins = [
        'https://civic-engagement.app',
        'https://www.civic-engagement.app',
      ];
    }
  }

  return config;
};

export const getRealTimeConfig = (): RealTimeConfig => {
  return {
    ...defaultRealTimeConfig,
    websocket: getWebSocketConfig(),
  };
};
