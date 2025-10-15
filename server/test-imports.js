// Test script to verify import paths are working
logger.info('🧪 Testing import paths...', { component: 'Chanuka' });

try {
  logger.info('📦 Testing db.ts import...', { component: 'Chanuka' });
  const dbModule = await import('./db.ts');
  logger.info('✅ db.ts imported successfully', { component: 'Chanuka' });
  logger.info('📊 Available exports:', { component: 'Chanuka' }, Object.keys(dbModule));
} catch (error) {
  logger.error('❌ Failed to import db.ts:', { component: 'Chanuka' }, error.message);
}

try {
  logger.info('📦 Testing fallback service import...', { component: 'Chanuka' });
  const fallbackModule = await import('./services/fallback-service.ts');
  logger.info('✅ fallback-service.ts imported successfully', { component: 'Chanuka' });
  logger.info('📊 Available exports:', { component: 'Chanuka' }, Object.keys(fallbackModule));
} catch (error) {
  logger.error('❌ Failed to import fallback-service.ts:', { component: 'Chanuka' }, error.message);
}

try {
  logger.info('📦 Testing database service import...', { component: 'Chanuka' });
  const databaseModule = await import('./services/database-service.ts');
  logger.info('✅ database-service.ts imported successfully', { component: 'Chanuka' });
  logger.info('📊 Available exports:', { component: 'Chanuka' }, Object.keys(databaseModule));
} catch (error) {
  logger.error('❌ Failed to import database-service.ts:', { component: 'Chanuka' }, error.message);
}

logger.info('✅ Import path test completed', { component: 'Chanuka' });