import { logger } from '../infrastructure/observability';

logger.info('Test message', { meta: 'data' });
logger.error('Error message', { component: 'test' }, { error: new Error() });
logger.warn('', { empty: true });
