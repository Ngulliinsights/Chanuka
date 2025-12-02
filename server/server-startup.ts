/**
 * Server Startup Module
 * 
 * Handles the proper initialization sequence for the server application
 * to prevent circular dependencies and ensure services start in correct order.
 */

import { logger } from '@shared/core';
import { initializeServerServices, shutdownServerServices } from '@server/core/services-init.ts';

/**
 * Initialize all server services and dependencies
 */
export async function initializeServer(): Promise<void> {
  logger.info('🚀 Starting server initialization...');

  try {
    // Initialize all server services in proper order
    await initializeServerServices();
    
    logger.info('✅ Server services initialized successfully');
  } catch (error) {
    logger.error('❌ Server initialization failed:', error);
    throw error;
  }
}

/**
 * Graceful server shutdown
 */
export async function shutdownServer(): Promise<void> {
  logger.info('🛑 Starting server shutdown...');

  try {
    await shutdownServerServices();
    logger.info('✅ Server shutdown completed');
  } catch (error) {
    logger.error('❌ Server shutdown failed:', error);
    throw error;
  }
}

/**
 * Setup process handlers for graceful shutdown
 */
export function setupGracefulShutdown(): void {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`📡 Received ${signal}, starting graceful shutdown...`);
    
    try {
      await shutdownServer();
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle various shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}
