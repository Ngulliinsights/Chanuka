import { privacyFacade } from '@server/infrastructure/privacy';
import { logger } from '@server/infrastructure/observability';
import { AuthenticatedRequest, PrivacyRequest } from '@server/middleware/auth-types';
import { NextFunction,Request, Response } from 'express';

export interface PrivacyConsent {
  analytics: boolean;
  marketing: boolean;
  research: boolean;
  personalization: boolean;
}

export interface PrivacyRequestWithConsent extends AuthenticatedRequest {
  privacyConsent?: PrivacyConsent;
}

/**
 * Middleware to check user consent for data processing
 */
export const checkDataProcessingConsent = (requiredConsent: keyof PrivacyConsent) => {
  return async (req: PrivacyRequestWithConsent, res: Response, next: NextFunction) => {
    try {
      // Skip consent check for unauthenticated users
      if (!req.user) {
        return next();
      }

      const user_id = req.user.id;
      const preferences = await privacyFacade.getPrivacyPreferences(user_id);

      // Attach privacy consent to request
      req.privacyConsent = preferences.dataProcessing;

      // Check if user has given consent for the required processing
      if (!preferences.dataProcessing[requiredConsent]) { // Log the consent violation
        logger.warn({
          user_id,
          action: 'consent.violation.detected',
          resource: 'data_processing',
          requiredConsent,
          endpoint: req.originalUrl,
          method: req.method,
          ip_address: req.ip || 'unknown',
        }, 'Data processing consent violation');

        return res.status(403).json({
          error: 'Data processing consent required',
          message: `This operation requires consent for ${requiredConsent} data processing`,
          consentType: requiredConsent,
          currentConsent: preferences.dataProcessing[requiredConsent],
          code: 'CONSENT_REQUIRED'
        });
      }

      next();
    } catch (error) {
      logger.error({ component: 'Chanuka', error: error instanceof Error ? error.message : String(error) }, 'Error checking data processing consent');
      // Allow request to continue on error to avoid breaking functionality
      next();
    }
  };
};

/**
 * Middleware to check user consent for data sharing
 */
export const checkDataSharingConsent = (requiredSharing: 'publicProfile' | 'shareEngagement' | 'shareComments' | 'shareVotingHistory') => {
  return async (req: PrivacyRequestWithConsent, res: Response, next: NextFunction) => {
    try {
      // Skip consent check for unauthenticated users
      if (!req.user) {
        return next();
      }

      const user_id = req.user.id;
      const preferences = await privacyFacade.getPrivacyPreferences(user_id);

      // Check if user has given consent for the required sharing
      if (!preferences.dataSharing[requiredSharing]) {
        return res.status(403).json({
          error: 'Data sharing consent required',
          message: `This operation requires consent for ${requiredSharing}`,
          consentType: requiredSharing,
          currentConsent: preferences.dataSharing[requiredSharing],
          code: 'SHARING_CONSENT_REQUIRED'
        });
      }

      next();
    } catch (error) {
      logger.error({ component: 'Chanuka', error: error instanceof Error ? error.message : String(error) }, 'Error checking data sharing consent');
      // Allow request to continue on error to avoid breaking functionality
      next();
    }
  };
};

/**
 * Middleware to log data access for audit purposes
 */
export const logDataAccess = (dataType: string, sensitivityLevel: 'low' | 'medium' | 'high' = 'medium') => { return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user_id = req.user?.id || 'anonymous';
      const startTime = Date.now();

      // Log the data access
      logger.info({
        user_id,
        action: 'data.accessed',
        resource: dataType,
        endpoint: req.originalUrl,
        method: req.method,
        sensitivityLevel,
        ip_address: req.ip || 'unknown',
      }, 'Data access logged');

      // Add response time logging
      const originalSend = res.send;
      res.send = function(data) { const responseTime = Date.now() - startTime;

        // Log response details for high sensitivity data
        if (sensitivityLevel === 'high') {
          logger.info({
            user_id,
            action: 'data.response.sent',
            resource: dataType,
            endpoint: req.originalUrl,
            responseTime,
            statusCode: res.statusCode,
            dataSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
            ip_address: req.ip || 'unknown',
          }, 'High sensitivity data response sent');
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error({ component: 'Chanuka', error: error instanceof Error ? error.message : String(error) }, 'Error logging data access');
      // Allow request to continue on error
      next();
    }
  };
};

/**
 * Middleware to enforce cookie consent
 */
export const enforceCookieConsent = (cookieType: 'analytics' | 'marketing' | 'preferences') => {
  return async (req: PrivacyRequestWithConsent, res: Response, next: NextFunction) => {
    try {
      // Check for cookie consent in request headers or cookies
      const cookieConsent = req.cookies?.cookieConsent;

      if (cookieConsent) {
        const consent = JSON.parse(cookieConsent);
        if (!consent[cookieType]) {
          return res.status(403).json({
            error: 'Cookie consent required',
            message: `This operation requires consent for ${cookieType} cookies`,
            cookieType,
            code: 'COOKIE_CONSENT_REQUIRED'
          });
        }
      } else if (req.user) { // Check user's privacy preferences for authenticated users
        const user_id = req.user.id;
        const preferences = await privacyFacade.getPrivacyPreferences(user_id);

        if (!preferences.cookies[cookieType]) {
          return res.status(403).json({
            error: 'Cookie consent required',
            message: `This operation requires consent for ${cookieType } cookies`,
            cookieType,
            currentConsent: preferences.cookies[cookieType],
            code: 'COOKIE_CONSENT_REQUIRED'
          });
        }
      }

      next();
    } catch (error) {
      logger.error({ component: 'Chanuka', error: error instanceof Error ? error.message : String(error) }, 'Error enforcing cookie consent');
      // Allow request to continue on error
      next();
    }
  };
};

/**
 * Middleware to add privacy headers to responses
 */
export const addPrivacyHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add privacy-related headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add data processing transparency header
  res.setHeader('X-Data-Processing', 'GDPR-Compliant');

  // Add cache control for sensitive data
  if (req.originalUrl.includes('/privacy/') || req.originalUrl.includes('/profile/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Middleware to validate data retention compliance
 */
export const validateDataRetention = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    const user_id = req.user.id;
    const preferences = await privacyFacade.getPrivacyPreferences(user_id);

    // Add retention preferences to request for use by other middleware/routes
    (req as PrivacyRequest).dataRetentionPrefs = {
      retainActivityLogs: preferences.dataRetention?.keepComments ?? true,
      retainSearchHistory: true,
      retainEngagementData: preferences.dataRetention?.keepEngagementHistory ?? true,
      retentionPeriodDays: (preferences.dataRetention?.retentionPeriodMonths ?? 12) * 30,
    };

    next();
  } catch (error) {
    logger.error({ component: 'Chanuka', error: error instanceof Error ? error.message : String(error) }, 'Error validating data retention');
    next();
  }
};

/**
 * Middleware to anonymize IP addresses for privacy
 */
export const anonymizeIP = (req: Request, _res: Response, next: NextFunction) => {
  const originalIP = req.ip || (req.connection as { remoteAddress?: string } | undefined)?.remoteAddress || '';

  // Anonymize IPv4 addresses (remove last octet)
  if (originalIP.includes('.')) {
    const parts = originalIP.split('.');
    if (parts.length === 4) {
      // Type-safe IP assignment
      Object.defineProperty(req, 'ip', {
        value: `${parts[0]}.${parts[1]}.${parts[2]}.0`,
        writable: true,
        configurable: true
      });
    }
  }
  // Anonymize IPv6 addresses (remove last 64 bits)
  else if (originalIP.includes(':')) {
    const parts = originalIP.split(':');
    if (parts.length >= 4) {
      // Type-safe IP assignment
      Object.defineProperty(req, 'ip', {
        value: `${parts.slice(0, 4).join(':')}::`,
        writable: true,
        configurable: true
      });
    }
  }

  next();
};
