/**
 * USSD Middleware
 * 
 * Express middleware for USSD request processing
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@server/infrastructure/observability';
import { ussdValidator } from './ussd.validator';

/**
 * Rate limiting middleware for USSD requests
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  // TODO: Implement proper rate limiting with Redis
  // For now, just pass through
  next();
}

/**
 * Request validation middleware
 */
export function validateUSSDRequest(req: Request, res: Response, next: NextFunction): void {
  const logContext = { component: 'USSDMiddleware', operation: 'validateUSSDRequest' };

  try {
    const ussdRequest = {
      sessionId: req.body.sessionId || req.body.session_id || '',
      serviceCode: req.body.serviceCode || req.body.service_code || '',
      phoneNumber: req.body.phoneNumber || req.body.phone_number || '',
      text: req.body.text || ''
    };

    const validation = ussdValidator.validateRequest(ussdRequest);

    if (!validation.valid) {
      logger.warn({ ...logContext, errors: validation.errors }, 'Invalid USSD request');
      res.status(400).send('END Invalid request');
      return;
    }

    // Normalize phone number
    if (ussdRequest.phoneNumber) {
      req.body.phoneNumber = ussdValidator.normalizePhoneNumber(ussdRequest.phoneNumber);
    }

    next();
  } catch (error) {
    logger.error({ ...logContext, error }, 'Error validating USSD request');
    res.status(500).send('END Service error');
  }
}

/**
 * Logging middleware for USSD requests
 */
export function logUSSDRequest(req: Request, _res: Response, next: NextFunction): void {
  logger.info(
    {
      component: 'USSDMiddleware',
      sessionId: req.body.sessionId || req.body.session_id,
      phoneNumber: req.body.phoneNumber || req.body.phone_number,
      text: req.body.text
    },
    'USSD request received'
  );
  next();
}

/**
 * Error handling middleware for USSD
 */
export function ussdErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({ component: 'USSDMiddleware', error: err }, 'USSD error');
  res.status(500).send('END Service temporarily unavailable');
}
