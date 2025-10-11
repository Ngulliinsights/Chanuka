// Simple test for the logger
console.log('Starting logger test...');

try {
  console.log('Direct console.log test');
  console.log('Importing logger...');
  const { logger } = await import('./server/utils/logger');
  console.log('Logger imported successfully');

  console.log('Testing logger...');

  logger.info('This is an info message', { component: 'test' });
  console.log('After logger.info');
  logger.warn('This is a warning', { component: 'test' });
  console.log('After logger.warn');
  logger.error('This is an error', { component: 'test' });
  console.log('After logger.error');
  logger.critical('This is critical', { component: 'test' });
  console.log('After logger.critical');

  console.log('Logger test completed');
} catch (error) {
  console.error('Error in logger test:', error);
}