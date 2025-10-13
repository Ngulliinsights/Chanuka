// Ambient module declarations to help TypeScript language server resolve internal modules

declare module '../../infrastructure/cache/cache-service' {
  import type * as cs from '../../infrastructure/cache/cache-service.js';
  const cacheService: any;
  export { cacheService };
  export const CACHE_KEYS: any;
  export const CACHE_TTL: any;
}

declare module '../../infrastructure/database/database-service' {
  const databaseService: any;
  export { databaseService };
}

declare module '../../infrastructure/notifications/notification-channels' {
  const notificationChannelService: any;
  export { notificationChannelService };
}

declare module './user-profile' {
  const userProfileService: any;
  export { userProfileService };
}

declare module '../../middleware/auth' {
  import type { Request, Response, NextFunction } from 'express';
  export type AuthenticatedRequest = Request & { user?: any };
  export const authenticateToken: any;
  export const requireRole: any;
}

declare module '../../utils/api-response' {
  export const ApiSuccess: any;
  export const ApiError: any;
  export const ApiValidationError: any;
  export const ApiResponseWrapper: any;
}

// Shared path alias
declare module '@shared/*' {
  const whatever: any;
  export default whatever;
}

// Generic logger declaration for internal imports
declare module '../utils/logger' {
  export const logger: any;
  export default logger;
}

declare module '@shared/utils/logger' {
  export const logger: any;
  export default logger;
}
