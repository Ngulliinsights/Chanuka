// Simple test to check validation imports
const { ValidationService, userRegistrationSchema } = require('./dist/validation');

logger.info('ValidationService:', { component: 'SimpleTool' }, typeof ValidationService);
logger.info('userRegistrationSchema:', { component: 'SimpleTool' }, typeof userRegistrationSchema);

if (userRegistrationSchema && typeof userRegistrationSchema.extend === 'function') {
  logger.info('✅ userRegistrationSchema.extend is available', { component: 'SimpleTool' });
} else {
  logger.info('❌ userRegistrationSchema.extend is not available', { component: 'SimpleTool' });
  logger.info('userRegistrationSchema methods:', { component: 'SimpleTool' }, Object.getOwnPropertyNames(userRegistrationSchema));
}

try {
  const service = new ValidationService();
  logger.info('✅ ValidationService can be instantiated', { component: 'SimpleTool' });
} catch (error) {
  logger.info('❌ ValidationService instantiation failed:', { component: 'SimpleTool' }, error.message);
}