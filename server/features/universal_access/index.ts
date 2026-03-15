/**
 * Universal Access Module
 * 
 * Provides USSD-based access to legislative information for feature phones
 * Ensures universal access regardless of device or connectivity
 */

export { ussdService } from './application/ussd.service';
export { ussdController } from './presentation/http/controller';
export { ussdValidator } from './application/ussd.validator';
export { ussdAnalytics } from './application/ussd.analytics';
export { USSD_CONFIG, USSD_MENUS } from './application/ussd.config';

export * from './domain/ussd.types';
export { default as ussdRoutes } from './presentation/http/routes';

// Re-export middleware
export {
  rateLimitMiddleware,
  validateUSSDRequest,
  logUSSDRequest,
  ussdErrorHandler
} from './infrastructure/ussd.middleware';
