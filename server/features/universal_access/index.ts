/**
 * Universal Access Module
 * 
 * Provides USSD-based access to legislative information for feature phones
 * Ensures universal access regardless of device or connectivity
 */

export { ussdService } from './ussd.service';
export { ussdController } from './ussd.controller';
export { ussdValidator } from './ussd.validator';
export { ussdAnalytics } from './ussd.analytics';
export { USSD_CONFIG, USSD_MENUS } from './ussd.config';

export * from './ussd.types';
export { default as ussdRoutes } from './ussd.routes';

// Re-export middleware
export {
  rateLimitMiddleware,
  validateUSSDRequest,
  logUSSDRequest,
  ussdErrorHandler
} from './ussd.middleware';
