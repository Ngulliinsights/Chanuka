import { logger } from '@server/infrastructure/observability';
import compression from 'compression';
import cors from 'cors';
import { Express, NextFunction,Request, Response } from 'express';
import helmet from 'helmet';

// 3. Core Logic wrappers
import { boomErrorMiddleware } from './boom-error-middleware';
import { requestLogger } from './logging-middleware'; // We will create this

// API Contract Validation
export * from './api-contract-validation';

// Validation Middleware
export * from './validation-middleware';
// 2. Security & Intelligence// From previous step (Helmet/Firewall)
import { privacyMiddleware } from './privacy-middleware';
import { standardRateLimits } from './rate-limiter';
// 1. Critical Infrastructure (Fail fast)
import { checkServiceAvailability } from './service-availability';

export const configureMiddleware = (app: Express) => {
  logger.info('🔧 Initializing middleware pipeline...', { component: 'Middleware' });

  // A. Panic Switch (If server is dying, stop here)
  app.use(checkServiceAvailability);

  // B. Basic Hygiene
  app.use(compression());
  app.use(requestLogger); // Async structured logging
  
  // C. Security Layer (The Firewall)
  // This includes Helmet, CORS, and Intrusion Detection
  app.use(securityMiddleware);

  // D. Privacy Layer (Anonymization)
  // MUST come after Intrusion Detection so we can log threats with real IPs before anonymizing
  app.use(privacyMiddleware);

  // E. Flood Protection (Rate Limiting)
  // We apply different limits to different paths
  app.use('/api/auth', standardRateLimits.auth);
  app.use('/api/search', standardRateLimits.search);
  app.use('/api', standardRateLimits.api); // Fallback for other API routes

  // F. Body Parsing (Only after security checks pass)
  // Large payloads are blocked by Intrusion Detection before parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  logger.info('✅ Middleware pipeline configured', { component: 'Middleware' });
};