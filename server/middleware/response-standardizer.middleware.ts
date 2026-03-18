/**
 * Response Standardizer Middleware
 * 
 * Automatically transforms all res.json() responses to the standard API format.
 * Ensures consistency across all endpoints without requiring individual updates.
 * 
 * Transforms:
 * - res.json(data) → { success: true, data }
 * - res.json({ error, code }) → { success: false, error: {...} }
 * - Preserves status codes and headers
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@server/infrastructure/observability';

const IGNORED_PATHS = [
  '/health',
  '/ping',
  '/metrics',
  '/docs',
  '/swagger',
];

const BINARY_MIME_TYPES = [
  'application/octet-stream',
  'application/pdf',
  'image/',
  'video/',
  'audio/',
];

interface StandardResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message: string;
    details?: unknown;
    statusCode?: number;
  };
  message?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export function responseStandardizer() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    // Override res.json to standardize responses
    res.json = function(data: unknown) {
      // Skip standardization for certain paths
      if (IGNORED_PATHS.some(path => req.path.startsWith(path))) {
        return originalJson.call(this, data);
      }

      // Skip binary/file responses
      const contentType = res.getHeader('content-type') as string;
      if (contentType && BINARY_MIME_TYPES.some(type => contentType.includes(type))) {
        return originalJson.call(this, data);
      }

      // If response is already in standard format, don't double-wrap
      if (isStandardResponse(data)) {
        return originalJson.call(this, data);
      }

      // If response is already a raw JSON API response from api-utils, pass through
      if (isApiUtilsResponse(data)) {
        return originalJson.call(this, data);
      }

      // Transform the response to standard format
      const statusCode = res.statusCode || 200;
      let standardResponse: StandardResponse;

      // Handle error responses (detect by structure)
      if (isErrorObject(data)) {
        standardResponse = {
          success: false,
          error: {
            message: getErrorMessage(data),
            code: getErrorCode(data),
            details: getErrorDetails(data),
            statusCode,
          },
          timestamp: new Date().toISOString(),
        };
        
        logger.debug(
          { path: req.path, method: req.method, statusCode, error: standardResponse.error },
          'Transformed error response'
        );
      } else {
        // Success response
        standardResponse = {
          success: statusCode < 400,
          data,
          timestamp: new Date().toISOString(),
        };

        if (statusCode >= 400) {
          standardResponse.success = false;
          standardResponse.error = {
            message: 'API Error',
            statusCode,
          };
        }

        logger.debug(
          { path: req.path, method: req.method, statusCode, dataType: typeof data },
          'Transformed success response'
        );
      }

      return originalJson.call(this, standardResponse);
    } as any;

    next();
  };
}

/**
 * Check if response is already in standard format
 */
function isStandardResponse(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as any;
  // Check if it has the success boolean field which indicates standard format
  if (typeof obj.success === 'boolean') return true;
  
  return false;
}

/**
 * Check if this is a response from the api-utils (which are already standardized)
 */
function isApiUtilsResponse(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as any;
  // ApiUtils responses have { success, data, metadata, timestamp }
  return typeof obj.success === 'boolean' && 
    ('data' in obj || 'error' in obj) &&
    'timestamp' in obj;
}

/**
 * Detect if data is an error object
 */
function isErrorObject(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as any;
  
  // Check for error properties
  return ('error' in obj && typeof obj.error === 'object') ||
    ('errorCode' in obj) ||
    ('code' in obj && obj.code && 'message' in obj) ||
    (obj instanceof Error);
}

/**
 * Extract error message
 */
function getErrorMessage(data: unknown): string {
  if (data instanceof Error) return data.message;
  
  if (!data || typeof data !== 'object') return 'Unknown error';
  
  const obj = data as any;
  return (
    obj.error?.message ||
    obj.message ||
    obj.errorMessage ||
    obj.error ||
    'Unknown error'
  );
}

/**
 * Extract error code
 */
function getErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  
  const obj = data as any;
  return obj.error?.code || obj.code || obj.errorCode;
}

/**
 * Extract error details
 */
function getErrorDetails(data: unknown): unknown {
  if (!data || typeof data !== 'object') return undefined;
  
  const obj = data as any;
  return obj.error?.details || obj.details || obj.validationErrors || obj.errors;
}

/**
 * Register the middleware in Express app
 */
export function registerResponseStandardizer(app: any) {
  // Apply early so it wraps all subsequent responses
  app.use(responseStandardizer());
}
