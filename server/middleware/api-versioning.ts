/**
 * API Versioning Middleware
 * 
 * Provides URL-based API versioning with:
 * - Version extraction from URL path (/api/v1/, /api/v2/)
 * - Version validation
 * - Deprecation warnings
 * - Default version fallback
 * - Version negotiation
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@server/infrastructure/observability';

export interface ApiVersionConfig {
  /**
   * Current API version (default version for unversioned requests)
   */
  currentVersion: string;

  /**
   * Supported API versions
   */
  supportedVersions: string[];

  /**
   * Deprecated versions with deprecation dates
   */
  deprecatedVersions?: Map<string, Date>;

  /**
   * Sunset versions (will be removed soon)
   */
  sunsetVersions?: Map<string, Date>;

  /**
   * Strict mode - reject requests with unsupported versions
   * If false, falls back to current version
   */
  strictMode?: boolean;

  /**
   * Enable deprecation warnings in response headers
   */
  enableDeprecationWarnings?: boolean;
}

const DEFAULT_CONFIG: ApiVersionConfig = {
  currentVersion: 'v1',
  supportedVersions: ['v1'],
  deprecatedVersions: new Map(),
  sunsetVersions: new Map(),
  strictMode: false,
  enableDeprecationWarnings: true,
};

/**
 * Extract API version from request path
 * 
 * Supports formats:
 * - /api/v1/resource
 * - /api/v2/resource
 * - /v1/api/resource (alternative format)
 */
function extractVersion(path: string): string | null {
  // Match /api/v{number}/ or /v{number}/api/
  const match = path.match(/\/(?:api\/)?(v\d+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Create API versioning middleware
 */
export function createApiVersioningMiddleware(config: Partial<ApiVersionConfig> = {}) {
  const fullConfig: ApiVersionConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    deprecatedVersions: config.deprecatedVersions || DEFAULT_CONFIG.deprecatedVersions,
    sunsetVersions: config.sunsetVersions || DEFAULT_CONFIG.sunsetVersions,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract version from URL
    const requestedVersion = extractVersion(req.path);

    // Determine effective version
    let effectiveVersion: string;

    if (!requestedVersion) {
      // No version specified - use current version
      effectiveVersion = fullConfig.currentVersion;
      logger.debug(
        { component: 'ApiVersioning', path: req.path },
        `No version specified, using default: ${effectiveVersion}`
      );
    } else if (!fullConfig.supportedVersions.includes(requestedVersion)) {
      // Unsupported version
      if (fullConfig.strictMode) {
        logger.warn(
          { component: 'ApiVersioning', requestedVersion, path: req.path },
          'Unsupported API version requested'
        );
        return res.status(400).json({
          error: 'Unsupported API version',
          requestedVersion,
          supportedVersions: fullConfig.supportedVersions,
          currentVersion: fullConfig.currentVersion,
        });
      } else {
        // Fall back to current version
        effectiveVersion = fullConfig.currentVersion;
        logger.warn(
          { component: 'ApiVersioning', requestedVersion, fallback: effectiveVersion },
          'Unsupported version, falling back to current'
        );
      }
    } else {
      effectiveVersion = requestedVersion;
    }

    // Attach version to request
    (req as any).apiVersion = effectiveVersion;

    // Add version header to response
    res.setHeader('X-API-Version', effectiveVersion);

    // Check for deprecated versions
    if (fullConfig.enableDeprecationWarnings) {
      const deprecationDate = fullConfig.deprecatedVersions?.get(effectiveVersion);
      if (deprecationDate) {
        const daysUntilDeprecation = Math.ceil(
          (deprecationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        res.setHeader('Deprecation', deprecationDate.toUTCString());
        res.setHeader(
          'Sunset',
          deprecationDate.toUTCString()
        );
        res.setHeader(
          'Link',
          `</api/${fullConfig.currentVersion}>; rel="successor-version"`
        );

        logger.warn(
          {
            component: 'ApiVersioning',
            version: effectiveVersion,
            deprecationDate: deprecationDate.toISOString(),
            daysRemaining: daysUntilDeprecation,
          },
          'Deprecated API version used'
        );
      }

      // Check for sunset versions
      const sunsetDate = fullConfig.sunsetVersions?.get(effectiveVersion);
      if (sunsetDate) {
        const daysUntilSunset = Math.ceil(
          (sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        res.setHeader('Sunset', sunsetDate.toUTCString());
        res.setHeader(
          'Link',
          `</api/${fullConfig.currentVersion}>; rel="successor-version"`
        );

        logger.error(
          {
            component: 'ApiVersioning',
            version: effectiveVersion,
            sunsetDate: sunsetDate.toISOString(),
            daysRemaining: daysUntilSunset,
          },
          'Sunset API version used - will be removed soon'
        );
      }
    }

    // Log version usage for analytics
    logger.info(
      {
        component: 'ApiVersioning',
        version: effectiveVersion,
        path: req.path,
        method: req.method,
      },
      'API version used'
    );

    return next();
  };
}

/**
 * Create version-specific route handler
 * 
 * Allows defining different handlers for different API versions
 * 
 * @example
 * ```typescript
 * app.get('/api/users', versionedHandler({
 *   v1: (req, res) => res.json({ users: getUsersV1() }),
 *   v2: (req, res) => res.json({ users: getUsersV2(), meta: {} }),
 * }));
 * ```
 */
export function versionedHandler(handlers: Record<string, (req: Request, res: Response, next: NextFunction) => void | Promise<void>>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = (req as any).apiVersion || 'v1';
    const handler = handlers[version];

    if (!handler) {
      logger.error(
        { component: 'ApiVersioning', version, availableVersions: Object.keys(handlers) },
        'No handler for API version'
      );
      return res.status(500).json({
        error: 'Internal server error',
        message: `No handler available for API version ${version}`,
      });
    }

    return handler(req, res, next);
  };
}

/**
 * Middleware to require specific API version
 * 
 * @example
 * ```typescript
 * app.use('/api/v2/advanced', requireVersion('v2'));
 * ```
 */
export function requireVersion(requiredVersion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = (req as any).apiVersion;

    if (version !== requiredVersion) {
      logger.warn(
        { component: 'ApiVersioning', required: requiredVersion, actual: version },
        'API version mismatch'
      );
      return res.status(400).json({
        error: 'API version mismatch',
        required: requiredVersion,
        actual: version,
        message: `This endpoint requires API version ${requiredVersion}`,
      });
    }

    return next();
  };
}

/**
 * Get API version from request
 */
export function getApiVersion(req: Request): string {
  return (req as any).apiVersion || 'v1';
}

/**
 * Example configuration for production use
 */
export const productionVersionConfig: ApiVersionConfig = {
  currentVersion: 'v1',
  supportedVersions: ['v1'],
  deprecatedVersions: new Map(),
  sunsetVersions: new Map(),
  strictMode: false,
  enableDeprecationWarnings: true,
};

/**
 * Example: Deprecate v1 in 6 months
 */
export function deprecateVersion(_version: string, monthsUntilDeprecation: number): Date {
  const deprecationDate = new Date();
  deprecationDate.setMonth(deprecationDate.getMonth() + monthsUntilDeprecation);
  return deprecationDate;
}
