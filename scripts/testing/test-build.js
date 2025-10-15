// Quick test to verify app can build
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';

try {
  logger.info('Testing client build...', { component: 'Chanuka' });
  execSync('npm run build:client', { stdio: 'inherit', timeout: 60000 });
  logger.info('✅ Build successful!', { component: 'Chanuka' });
} catch (error) {
  logger.error('❌ Build failed:', { component: 'Chanuka' }, error.message);
  process.exit(1);
}