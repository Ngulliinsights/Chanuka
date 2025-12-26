import { logger } from '@shared/core';
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const createLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    },
    // Trust the Intrusion Detection Service if it already flagged this IP
    skip: (req) => req.headers['x-trusted-proxy'] === 'true'
  });
};

export const standardRateLimits = {
  // Strict limits for sensitive endpoints
  auth: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 login attempts
    message: 'Too many login attempts. Please try again later.'
  }),
  
  // Higher limits for search/browsing
  search: createLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 1 search per second
    message: 'Search rate limit exceeded.'
  }),

  // General API baseline
  api: createLimiter({
    windowMs: 1 * 60 * 1000,
    max: 300,
    message: 'API rate limit exceeded.'
  })
};