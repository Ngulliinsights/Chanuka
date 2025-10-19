// Simple test to check validation imports
const { ValidationService, userRegistrationSchema } = require('./dist/validation');

logger.info('ValidationService:', { component: 'Chanuka' }, typeof ValidationService);
logger.info('userRegistrationSchema:', { component: 'Chanuka' }, typeof userRegistrationSchema);

if (userRegistrationSchema && typeof userRegistrationSchema.extend === 'function') {
  logger.info('✅ userRegistrationSchema.extend is available', { component: 'Chanuka' });
} else {
  logger.info('❌ userRegistrationSchema.extend is not available', { component: 'Chanuka' });
  logger.info('userRegistrationSchema methods:', { component: 'Chanuka' }, Object.getOwnPropertyNames(userRegistrationSchema));
}

try {
  const service = new ValidationService();
  logger.info('✅ ValidationService can be instantiated', { component: 'Chanuka' });
} catch (error) {
  logger.info('❌ ValidationService instantiation failed:', { component: 'Chanuka' }, error.message);
}




































