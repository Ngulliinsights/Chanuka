// ============================================================================
// FEATURE FLAGS MIDDLEWARE - Request-level flag evaluation
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { FeatureFlagService } from '../domain/service';
import { logger } from '@server/infrastructure/observability';

const service = new FeatureFlagService();

/**
 * Middleware to check if a feature flag is enabled
 * Usage: router.get('/path', requireFeatureFlag('flagName'), handler)
 */
export function requireFeatureFlag(flagName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = {
        userId: req.user?.id,
        userAttributes: req.user,
        environment: process.env.NODE_ENV
      };

      const result = await service.isEnabled(flagName, context);

      if (!result.enabled) {
        logger.warn({
          component: 'FeatureFlagMiddleware',
          flagName,
          userId: context.userId,
          reason: result.reason
        }, 'Feature flag disabled');

        res.status(403).json({
          success: false,
          error: 'This feature is not available',
          reason: result.reason
        });
        return;
      }

      // Attach flag result to request for use in handlers
      (req as any).featureFlag = result;
      next();
    } catch (error) {
      logger.error({
        component: 'FeatureFlagMiddleware',
        flagName,
        error
      }, 'Failed to evaluate feature flag');

      // Fail open - allow request to proceed if flag evaluation fails
      next();
    }
  };
}

/**
 * Middleware to attach feature flag evaluation to request
 * Does not block the request, just adds flag info
 * Usage: router.get('/path', attachFeatureFlag('flagName'), handler)
 */
export function attachFeatureFlag(flagName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = {
        userId: req.user?.id,
        userAttributes: req.user,
        environment: process.env.NODE_ENV
      };

      const result = await service.isEnabled(flagName, context);
      (req as any).featureFlag = result;
    } catch (error) {
      logger.error({
        component: 'FeatureFlagMiddleware',
        flagName,
        error
      }, 'Failed to evaluate feature flag');
    }

    next();
  };
}

/**
 * Middleware to evaluate multiple flags and attach to request
 * Usage: router.get('/path', attachFeatureFlags(['flag1', 'flag2']), handler)
 */
export function attachFeatureFlags(flagNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = {
        userId: req.user?.id,
        userAttributes: req.user,
        environment: process.env.NODE_ENV
      };

      const flags: Record<string, any> = {};
      for (const flagName of flagNames) {
        flags[flagName] = await service.isEnabled(flagName, context);
      }

      (req as any).featureFlags = flags;
    } catch (error) {
      logger.error({
        component: 'FeatureFlagMiddleware',
        error
      }, 'Failed to evaluate feature flags');
    }

    next();
  };
}
