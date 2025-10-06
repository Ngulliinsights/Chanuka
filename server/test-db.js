// Simple test script to verify database connection
import { db, isDatabaseConnected, fallbackService, getConnectionStatus } from './db.ts';

console.log('🧪 Testing database connection...');

// Test connection status
const status = getConnectionStatus();
console.log('📊 Connection Status:', status);

// Test fallback service
const fallbackStatus = fallbackService.getStatus();
console.log('📋 Fallback Service Status:', fallbackStatus);

// Test fallback data
const bills = fallbackService.getBills();
console.log('📄 Sample Bills:', bills.length, 'bills available');

if (bills.length > 0) {
  console.log('📄 First Bill:', bills[0].title);
}

// Test users
const users = fallbackService.getUsers();
console.log('👥 Sample Users:', users.length, 'users available');

console.log('✅ Database service test completed');
console.log(`🔗 Database Connected: ${isDatabaseConnected}`);