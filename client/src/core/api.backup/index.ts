// Barrel export for all API-related modules
export * from './cache';
export * from './client';
export * from './config';
export * from './errors';
export * from './registry';
export * from './types';
export * from './websocket';

// Re-export commonly used instances
export { globalApiClient } from './client';
export { globalCache } from './cache';
export { globalConfig } from './config';
export { globalErrorHandler } from './errors';
export { globalServiceLocator } from './registry';
export { globalWebSocketPool } from './websocket';