// Test script to verify import paths are working
logger.info('🧪 Testing import paths...', { component: 'SimpleTool' });

try {
  logger.info('📦 Testing db.ts import...', { component: 'SimpleTool' });
  const dbModule = await import('./db.ts');
  logger.info('✅ db.ts imported successfully', { component: 'SimpleTool' });
  logger.info('📊 Available exports:', { component: 'SimpleTool' }, Object.keys(dbModule));
} catch (error) {
  logger.error('❌ Failed to import db.ts:', { component: 'SimpleTool' }, error.message);
}

try {
  logger.info('📦 Testing fallback service import...', { component: 'SimpleTool' });
  const fallbackModule = await import('./services/fallback-service.ts');
  logger.info('✅ fallback-service.ts imported successfully', { component: 'SimpleTool' });
  logger.info('📊 Available exports:', { component: 'SimpleTool' }, Object.keys(fallbackModule));
} catch (error) {
  logger.error('❌ Failed to import fallback-service.ts:', { component: 'SimpleTool' }, error.message);
}

try {
  logger.info('📦 Testing database service import...', { component: 'SimpleTool' });
  const databaseModule = await import('./services/database-service.ts');
  logger.info('✅ database-service.ts imported successfully', { component: 'SimpleTool' });
  logger.info('📊 Available exports:', { component: 'SimpleTool' }, Object.keys(databaseModule));
} catch (error) {
  logger.error('❌ Failed to import database-service.ts:', { component: 'SimpleTool' }, error.message);
}

logger.info('✅ Import path test completed', { component: 'SimpleTool' });