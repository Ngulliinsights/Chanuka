import { logger } from '../infrastructure/observability';

logger.info({ meta: 'data' }, 'Test message');
logger.error({ component: 'test', error: new Error() }, 'Error message');
logger.warn({ empty: true }, '');
