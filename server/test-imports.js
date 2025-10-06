// Test script to verify import paths are working
console.log('🧪 Testing import paths...');

try {
  console.log('📦 Testing db.ts import...');
  const dbModule = await import('./db.ts');
  console.log('✅ db.ts imported successfully');
  console.log('📊 Available exports:', Object.keys(dbModule));
} catch (error) {
  console.error('❌ Failed to import db.ts:', error.message);
}

try {
  console.log('📦 Testing fallback service import...');
  const fallbackModule = await import('./services/fallback-service.ts');
  console.log('✅ fallback-service.ts imported successfully');
  console.log('📊 Available exports:', Object.keys(fallbackModule));
} catch (error) {
  console.error('❌ Failed to import fallback-service.ts:', error.message);
}

try {
  console.log('📦 Testing database service import...');
  const databaseModule = await import('./services/database-service.ts');
  console.log('✅ database-service.ts imported successfully');
  console.log('📊 Available exports:', Object.keys(databaseModule));
} catch (error) {
  console.error('❌ Failed to import database-service.ts:', error.message);
}

console.log('✅ Import path test completed');