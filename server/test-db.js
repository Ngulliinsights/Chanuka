// Simple test script to verify database connection
import { db, isDatabaseConnected, fallbackService, getConnectionStatus } from './db.ts';
import { logger } from '../utils/logger.js';

logger.info('🧪 Testing database connection...', { component: 'SimpleTool' });

// Test connection status
const status = getConnectionStatus();
logger.info('📊 Connection Status:', { component: 'SimpleTool' }, status);

// Test fallback service
const fallbackStatus = fallbackService.getStatus();
logger.info('📋 Fallback Service Status:', { component: 'SimpleTool' }, fallbackStatus);

// Test fallback data
const bills = fallbackService.getBills();
logger.info('📄 Sample Bills:', { component: 'SimpleTool' }, bills.length, 'bills available');

if (bills.length > 0) {
  logger.info('📄 First Bill:', { component: 'SimpleTool' }, bills[0].title);
}

// Test users
const users = fallbackService.getUsers();
logger.info('👥 Sample Users:', { component: 'SimpleTool' }, users.length, 'users available');

logger.info('✅ Database service test completed', { component: 'SimpleTool' });
console.log(`🔗 Database Connected: ${isDatabaseConnected}`);