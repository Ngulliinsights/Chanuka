/**
 * Rate Limiting Configuration
 * 
 * Endpoint-specific rate limiting for Phase 1 features
 */

import rateLimit from 'express-rate-limit';
import { logger } from '@server/infrastructure/observability';

/**
 * Rate limit for expensive NLP operations
 */
export const nlpRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many NLP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for NLP endpoint', {
      component: 'RateLimitMiddleware',
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: 60,
    });
  },
});

/**
 * Rate limit for pretext detection analysis
 */
export const pretextAnalysisRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many analysis requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for pretext analysis', {
      component: 'RateLimitMiddleware',
      ip: req.ip,
      userId: req.user?.id,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Analysis rate limit exceeded. Please try again later',
      retryAfter: 60,
    });
  },
});

/**
 * Rate limit for recommendation generation
 */
export const recommendationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many recommendation requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limit for clustering operations
 */
export const clusteringRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute (expensive operation)
  message: 'Too many clustering requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for clustering', {
      component: 'RateLimitMiddleware',
      ip: req.ip,
      billId: req.params.billId,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Clustering is an expensive operation. Please try again later',
      retryAfter: 60,
    });
  },
});

/**
 * Rate limit for feature flag updates
 */
export const featureFlagUpdateRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 updates per minute
  message: 'Too many flag update requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});

/**
 * Rate limit for cache operations
 */
export const cacheOperationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 cache operations per minute
  message: 'Too many cache operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limit (fallback)
 */
export const generalApiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
