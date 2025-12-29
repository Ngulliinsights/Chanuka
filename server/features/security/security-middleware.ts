import { logger } from '@shared/core';
import cors from 'cors';
import { NextFunction,Request, Response } from 'express';
import helmet from 'helmet';

import { intrusionDetectionService } from './intrusion-detection-service';

/**
 * The Unified Security Gate
 * Applies headers, checks intrusion detection, and sanitizes input.
 */

// 1. Standard Helmet Configuration
export const secureHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Harden this for prod
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// 2. Intelligent Firewall Middleware
export const firewallMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await intrusionDetectionService.analyzeRequest(req);
    
    if (result.action === 'block') {
      logger.warn(`Firewall blocked request from ${req.ip}: ${result.reason}`);
      res.status(403).json({ 
        error: 'Access Denied', 
        message: 'Your request triggered a security rule.',
        requestId: req.headers['x-request-id'] 
      });
      return;
    }

    next();
  } catch (error) {
    // Fail Open (Allow) to prevent blocking legitimate users on service error
    // But log heavily
    logger.error('Firewall analysis failed', { error });
    next();
  }
};

// 3. Consolidated Export
export const securityMiddleware = [
  secureHeaders,
  cors({ origin: process.env.CLIENT_URL, credentials: true }),
  firewallMiddleware
];

