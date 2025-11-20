import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { privacyService } from '@server/features/privacy/privacy-service.ts';
import { auditLogger } from '../infrastructure/monitoring/audit-log.js';
import { logger   } from '@shared/core/src/index.js';

export interface PrivacyRequest extends AuthenticatedRequest {
  privacyConsent?: {
    analytics: boolean;
    marketing: boolean;
    research: boolean;
    personalization: boolean;
  };
}

/**
 * Middleware to check user consent for data processing
 */
export const checkDataProcessingConsent = (requiredConsent: keyof PrivacyRequest['privacyConsent']) => {
  return async (req: PrivacyRequest, res: Response, next: NextFunction) => {
    try {
      // Skip consent check for unauthenticated users
      if (!req.user) {
        return next();
      }

      const user_id = req.user.id;
      const preferences = await privacyService.getPrivacyPreferences(user_id);
      
      // Attach privacy consent to request
      req.privacyConsent = preferences.dataProcessing;

      // Check if user has given consent for the required processing
      if (!preferences.dataProcessing[requiredConsent]) { // Log the consent violation
        await auditLogger.log({
          user_id,
          action: 'consent.violation.detected',
          resource: 'data_processing',
          details: {
            requiredConsent,
            userConsent: preferences.dataProcessing,
            endpoint: req.originalUrl,
            method: req.method
           },
          ip_address: req.ip || 'unknown',
          user_agent: req.headers['user-agent'] || 'unknown',
          severity: 'medium'
        });

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
      logger.error('Error checking data processing consent:', { component: 'Chanuka' }, error);
      // Allow request to continue on error to avoid breaking functionality
      next();
    }
  };
};

/**
 * Middleware to check user consent for data sharing
 */
export const checkDataSharingConsent = (requiredSharing: 'publicProfile' | 'shareEngagement' | 'shareComments' | 'shareVotingHistory') => {
  return async (req: PrivacyRequest, res: Response, next: NextFunction) => {
    try {
      // Skip consent check for unauthenticated users
      if (!req.user) {
        return next();
      }

      const user_id = req.user.id;
      const preferences = await privacyService.getPrivacyPreferences(user_id);

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
      logger.error('Error checking data sharing consent:', { component: 'Chanuka' }, error);
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
      await auditLogger.log({
        user_id,
        action: 'data.accessed',
        resource: dataType,
        details: {
          endpoint: req.originalUrl,
          method: req.method,
          sensitivityLevel,
          query: req.query,
          params: req.params
         },
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown',
        severity: sensitivityLevel
      });

      // Add response time logging
      const originalSend = res.send;
      res.send = function(data) { const responseTime = Date.now() - startTime;
        
        // Log response details for high sensitivity data
        if (sensitivityLevel === 'high') {
          auditLogger.log({
            user_id,
            action: 'data.response.sent',
            resource: dataType,
            details: {
              endpoint: req.originalUrl,
              responseTime,
              statusCode: res.statusCode,
              dataSize: typeof data === 'string' ? data.length : JSON.stringify(data).length
             },
            ip_address: req.ip || 'unknown',
            user_agent: req.headers['user-agent'] || 'unknown',
            severity: 'high'
          }).catch(console.error);
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Error logging data access:', { component: 'Chanuka' }, error);
      // Allow request to continue on error
      next();
    }
  };
};

/**
 * Middleware to enforce cookie consent
 */
export const enforceCookieConsent = (cookieType: 'analytics' | 'marketing' | 'preferences') => {
  return async (req: PrivacyRequest, res: Response, next: NextFunction) => {
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
        const preferences = await privacyService.getPrivacyPreferences(user_id);
        
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
      logger.error('Error enforcing cookie consent:', { component: 'Chanuka' }, error);
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
export const validateDataRetention = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    const user_id = req.user.id;
    const preferences = await privacyService.getPrivacyPreferences(user_id);

    // Add retention preferences to request for use by other middleware/routes
    (req as any).dataRetentionPrefs = preferences.dataRetention;

    next();
  } catch (error) {
    logger.error('Error validating data retention:', { component: 'Chanuka' }, error);
    next();
  }
};

/**
 * Middleware to anonymize IP addresses for privacy
 */
export const anonymizeIP = (req: Request, res: Response, next: NextFunction) => {
  const originalIP = req.ip || req.connection.remoteAddress || '';
  
  // Anonymize IPv4 addresses (remove last octet)
  if (originalIP.includes('.')) {
    const parts = originalIP.split('.');
    if (parts.length === 4) {
      (req as any).ip = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  // Anonymize IPv6 addresses (remove last 64 bits)
  else if (originalIP.includes(':')) {
    const parts = originalIP.split(':');
    if (parts.length >= 4) {
      (req as any).ip = `${parts.slice(0, 4).join(':')}::`;
    }
  }

  next();
};













































