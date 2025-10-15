// Simple test script to verify database connection
import { db, isDatabaseConnected, fallbackService, getConnectionStatus } from './db.ts';
import { logger } from '../utils/logger.js';

logger.info('🧪 Testing database connection...', { component: 'Chanuka' });

// Test connection status
const status = getConnectionStatus();
logger.info('📊 Connection Status:', { component: 'Chanuka' }, status);

// Test fallback service
const fallbackStatus = fallbackService.getStatus();
logger.info('📋 Fallback Service Status:', { component: 'Chanuka' }, fallbackStatus);

// Test fallback data
const bills = fallbackService.getBills();
logger.info('📄 Sample Bills:', { component: 'Chanuka' }, bills.length, 'bills available');

if (bills.length > 0) {
  logger.info('📄 First Bill:', { component: 'Chanuka' }, bills[0].title);
}

// Test users
const users = fallbackService.getUsers();
logger.info('👥 Sample Users:', { component: 'Chanuka' }, users.length, 'users available');

logger.info('✅ Database service test completed', { component: 'Chanuka' });
console.log(`🔗 Database Connected: ${isDatabaseConnected}`);