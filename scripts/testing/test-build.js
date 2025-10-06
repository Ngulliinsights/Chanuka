// Quick test to verify app can build
import { execSync } from 'child_process';

try {
  console.log('Testing client build...');
  execSync('npm run build:client', { stdio: 'inherit', timeout: 60000 });
  console.log('✅ Build successful!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}