// Quick test to verify app can build
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';

try {
  logger.info('Testing client build...', { component: 'SimpleTool' });
  execSync('npm run build:client', { stdio: 'inherit', timeout: 60000 });
  logger.info('✅ Build successful!', { component: 'SimpleTool' });
} catch (error) {
  logger.error('❌ Build failed:', { component: 'SimpleTool' }, error.message);
  process.exit(1);
}