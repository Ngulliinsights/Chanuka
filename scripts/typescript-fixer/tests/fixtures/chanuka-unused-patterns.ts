/**
 * Test fixtures representing actual Chanuka project patterns with unused variables and imports
 * These patterns are based on common issues found in the Chanuka codebase
 */

// Example 1: Unused shared/core imports
export const unusedSharedCoreImports = `
import { logger, ApiSuccess, cacheKeys } from '@shared/core';
import { ValidationError } from '@shared/core/validation';
import { PerformanceMonitor } from '@shared/core/performance';

export function handleRequest(req: any, res: any) {
  // Only using ApiSuccess, logger and others are unused
  return ApiSuccess(res, { message: 'success' });
}
`;

// Example 2: Mixed used and unused imports from shared/core
export const mixedSharedCoreImports = `
import { 
  logger, 
  ApiSuccess, 
  ApiError, 
  cacheKeys, 
  ValidationError,
  PerformanceMonitor 
} from '@shared/core';

export function processData(data: any) {
  try {
    // Using logger and ApiSuccess
    logger.info('Processing data');
    return ApiSuccess(null, data);
  } catch (error) {
    // Using ApiError
    return ApiError(null, { code: 'ERROR', message: 'Failed' });
  }
  // cacheKeys, ValidationError, PerformanceMonitor are unused
}
`;

// Example 3: Unused database service imports
export const unusedDatabaseImports = `
import { databaseService } from '@server/infrastructure/database';
import { eq, and, desc } from 'drizzle-orm';
import { users, bills } from '@server/infrastructure/schema';

export function getUserCount() {
  // Only using a simple query, other imports unused
  return 42;
}
`;

// Example 4: Express.js middleware with unused parameters
export const expressMiddlewareUnusedParams = `
import { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/core';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // req and next are unused, should be prefixed with underscore
  logger.info('Auth middleware called');
  res.status(401).json({ error: 'Unauthorized' });
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // err and req are unused, should be prefixed with underscore
  res.status(500).json({ error: 'Internal server error' });
  next();
}
`;

// Example 5: Unused variables in service functions
export const unusedVariablesInServices = `
import { logger } from '@shared/core';
import { databaseService } from '@server/infrastructure/database';

export async function getUserProfile(user_id: string) {
  const startTime = Date.now(); // Unused variable
  const cacheKey = \`user_profile_\${ user_id }\`; // Unused variable
  const metadata = { source: 'database', timestamp: Date.now() }; // Unused variable
  
  logger.info(\`Fetching user profile for \${user_id}\`);
  
  const user = await databaseService.query('SELECT * FROM users WHERE id = ?', [user_id]);
  return user;
}
`;

// Example 6: Unused imports in validation middleware
export const unusedValidationImports = `
import { 
  ValidationError, 
  validateRequest, 
  ValidationService,
  createValidator 
} from '@shared/core/validation';
import { Request, Response, NextFunction } from 'express';

export function simpleValidation(req: Request, res: Response, next: NextFunction) {
  // Only using basic validation, other imports unused
  if (!req.body.email) {
    throw new ValidationError('Email is required');
  }
  next();
}
`;

// Example 7: Unused API response utilities
export const unusedApiResponseUtils = `
import { 
  ApiSuccess, 
  ApiError, 
  ApiValidationError,
  ApiNotFound,
  ApiResponseWrapper 
} from '@shared/core/utils/api';

export function getUser(req: any, res: any) {
  const user = { id: 1, name: 'John' };
  
  if (user) {
    // Only using ApiSuccess
    return ApiSuccess(res, user);
  }
  
  // Other API utilities are unused
}
`;

// Example 8: Unused caching utilities
export const unusedCachingUtils = `
import { 
  CacheManager, 
  CacheFactory, 
  cacheKeys,
  CACHE_KEYS 
} from '@shared/core/caching';
import { logger } from '@shared/core';

export function simpleFunction() {
  logger.info('Simple function called');
  // All caching utilities are unused
  return 'result';
}
`;

// Example 9: Unused performance monitoring
export const unusedPerformanceUtils = `
import { 
  PerformanceMonitor, 
  measurePerformance,
  PerformanceMetrics 
} from '@shared/core/performance';
import { logger } from '@shared/core';

export function quickOperation() {
  logger.info('Quick operation');
  return Math.random();
  // Performance utilities are unused
}
`;

// Example 10: Complex nested imports with mixed usage
export const complexNestedImports = `
import { logger } from '@shared/core/observability/logging';
import { 
  ErrorHandler, 
  ErrorBoundary, 
  createErrorHandler 
} from '@shared/core/observability/error-management';
import { 
  MetricsCollector, 
  PerformanceMetrics 
} from '@shared/core/observability/metrics';
import { 
  HealthChecker, 
  HealthStatus 
} from '@shared/core/observability/health';

export class ServiceManager {
  private errorHandler: ErrorHandler;
  
  constructor() {
    this.errorHandler = createErrorHandler();
    // logger, ErrorBoundary, MetricsCollector, PerformanceMetrics, 
    // HealthChecker, HealthStatus are unused
  }
  
  handleError(error: Error) {
    this.errorHandler.handle(error);
  }
}
`;

// Example 11: Unused function parameters in callbacks
export const unusedCallbackParams = `
export function processItems(items: any[], callback: (item: any, index: number, array: any[]) => void) {
  items.forEach((item, index, array) => {
    // index and array parameters are unused in the callback
    callback(item, index, array);
  });
}

export function handleAsyncOperation(data: any, onSuccess: (result: any) => void, onError: (error: Error) => void) {
  try {
    const result = processData(data);
    onSuccess(result);
  } catch (error) {
    // error parameter might be unused in some cases
    onError(error as Error);
  }
}

function processData(data: any) {
  return data;
}
`;

// Example 12: Unused destructured imports
export const unusedDestructuredImports = `
import { 
  logger,
  ApiSuccess,
  ApiError,
  ValidationError,
  cacheKeys,
  PerformanceMonitor
} from '@shared/core';

export function handleUserRegistration(userData: any) {
  try {
    logger.info('Registering user');
    
    if (!userData.email) {
      throw new ValidationError('Email required');
    }
    
    // Process registration
    return { success: true };
    
    // ApiSuccess, ApiError, cacheKeys, PerformanceMonitor are unused
  } catch (error) {
    logger.error('Registration failed', error);
    throw error;
  }
}
`;