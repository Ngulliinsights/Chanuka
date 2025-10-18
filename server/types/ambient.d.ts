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

declare module '@shared/core/src/observability/logging' {
  export const logger: any;
  export default logger;
}

// Legacy compatibility
declare module '@shared/core/src/logging' {
  export * from '@shared/core/src/observability/logging';
}

// Extra declarations for runtime .js imports
declare module '../../middleware/auth.js' {
  import type { Request, Response, NextFunction } from 'express';
  export type AuthenticatedRequest = Request & { user?: any };
  export const authenticateToken: any;
  export const requireRole: any;
}

declare module '../../utils/api-response.js' {
  export const ApiSuccess: any;
  export const ApiError: any;
  export const ApiValidationError: any;
  export const ApiResponseWrapper: any;
}

declare module '../utils/logger.js' {
  export const logger: any;
  export default logger;
}

// Declarations for shared schema imports used across server files
declare module '../../../shared/schema' {
  const whatever: any;
  export = whatever;
}

declare module '../../../shared/schema.js' {
  const whatever: any;
  export = whatever;
}

declare module '../../features/security/security-audit-service.js' {
  export const securityAuditService: any;
}

declare module '../../../shared/schema.js' {
  const whatever: any;
  export = whatever;
}

// Declarations for top-level server runtime modules with .js extensions
declare module '../../db.js' {
  export const readDatabase: (() => any) | undefined;
  export let db: any;
  export const pool: (() => any) | undefined;
  export function ensureInitialized(): Promise<void>;
  export function withFallback<T>(operation: () => Promise<T>, fallbackData: T, context: string): Promise<{ data: T; source?: string; timestamp?: Date } | T>;
  export function closeDatabase(): Promise<void>;
  export { default as default } from '../../db.js';
}

declare module '../../utils/logger.js' {
  export const logger: any;
  export default logger;
}

declare module '../../infrastructure/cache/cache-service.js' {
  const cacheService: any;
  export default cacheService;
  export const CACHE_KEYS: any;
  export const CACHE_TTL: any;
}

// Extensionless module declarations (TypeScript resolves imports without .js extension)
declare module '../../db' {
  export const readDatabase: (() => any) | undefined;
  export let db: any;
  export const pool: (() => any) | undefined;
  export function ensureInitialized(): Promise<void>;
  export function withFallback<T>(operation: () => Promise<T>, fallbackData: T, context: string): Promise<{ data: T; source?: string; timestamp?: Date } | T>;
  export function closeDatabase(): Promise<void>;
}

declare module '../../utils/logger' {
  export const logger: any;
  export default logger;
}

declare module '../../infrastructure/cache/cache-service' {
  const cacheService: any;
  export default cacheService;
  export const CACHE_KEYS: any;
  export const CACHE_TTL: any;
}

// Allow default importing of any .js module as `any` to ease migration between runtime .js and TS types
declare module '*.js' {
  const value: any;
  export default value;
}

// Minimal named type exports to support server imports from shared schema
declare module '../../../shared/schema' {
  export type Bill = any;
  export type InsertBill = any;
  export type BillEngagement = any;

  export const bills: any;
  export const billComments: any;
  export const billEngagement: any;
  export const sponsors: any;
  const whatever: any;
  export default whatever;
}
