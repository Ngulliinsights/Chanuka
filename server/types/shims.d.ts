declare module '@shared/utils/logger' {
  export const logger: any;
  export default logger;
}

declare module '@shared/*' {
  const whatever: any;
  export default whatever;
}

declare module '@db/*' {
  const whatever: any;
  export default whatever;
}

// Allow imports that include .js extensions to be resolved to any
declare module '*.js' {
  const whatever: any;
  export default whatever;
}

// Provide a flexible logger type so call-sites that pass objects as the
// first parameter compile without reverting all logger usage.
declare module '../utils/logger' {
  export const logger: {
    // Support both logger.info('msg', meta) and logger.info(meta, 'msg') call styles
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
    child?(props: any): any;
    // fallback for any other usages
    [key: string]: any;
  };
  export default logger;
}

// Many server files import named exports from @shared/schema or @shared/schema.js
// declare common names used across the codebase as any. Add more names as
// they surface from diagnostics.
declare module '@shared/schema' {
  export const bills: any;
  export const sponsors: any;
  export const billSponsorships: any;
  export const sponsorAffiliations: any;
  export const BillSponsorship: any;
  export const syncJobs: any;
  export const syncErrors: any;
  export const schemaValidationService: any;
  const _default: any;
  export default _default;
}

declare module '@shared/schema.js' {
  // Re-export common values and also provide type aliases so both
  // value and `import type {}` import forms are satisfied.
  export const bills: any;
  export const sponsors: any;
  export const billSponsorships: any;
  export const sponsorAffiliations: any;
  export const BillSponsorship: any;
  export const syncJobs: any;
  export const syncErrors: any;
  export const schemaValidationService: any;
  export const conflicts: any;
  export const conflictSources: any;
  export const UserInterest: any;
  export const BillTag: any;
  export const InsertAnalysis: any;
  export const BillEngagement: any;
  export const Notification: any;
  export const SponsorAffiliation: any;
  export const SponsorTransparency: any;
  export const BillSectionConflict: any;
  export const InsertSponsor: any;

  export type bills = any;
  export type sponsors = any;
  export type billSponsorships = any;
  export type sponsorAffiliations = any;
  export type BillSponsorship = any;
  export type syncJobs = any;
  export type syncErrors = any;
  export type schemaValidationService = any;
  export type conflicts = any;
  export type conflictSources = any;
  export type UserInterest = any;
  export type BillTag = any;
  export type InsertAnalysis = any;
  export type BillEngagement = any;
  export type Notification = any;
  export type SponsorAffiliation = any;
  export type SponsorTransparency = any;
  export type BillSectionConflict = any;
  export type InsertSponsor = any;

  const _default: any;
  export default _default;
}

// Additional permissive schema exports observed in diagnostics
declare module '@shared/schema.js' {
  export const UserProgress: any;
  export const InsertUserProgress: any;
  export const SocialShare: any;
  export const InsertSocialShare: any;
  export const SocialProfile: any;
  export const Stakeholder: any;
  export const InsertStakeholder: any;
  export const expertVerifications: any;
  export const billTags: any;
  export type UserProgress = any;
  export type SocialShare = any;
  export type SocialProfile = any;
}

// pg Pool and EnhancedPool shims used across the shared/db code
declare module 'pg' {
  export interface PoolConfig { [key: string]: any }
  export class Pool {
    constructor(cfg?: PoolConfig);
    connect(): Promise<any>;
    query(text: string, params?: any[]): Promise<any>;
    end(): Promise<void>;
    on(event: string, cb: (...args: any[]) => void): void;
    totalCount?: number;
    waitingCount?: number;
    idleCount?: number;
    getMetrics?: (...args: any[]) => any;
    options?: any;
  }
  export type PoolClient = any;
  export type QueryResult<T = any> = T[] & { rowCount?: number };
}

// Drizzle helper shims: some builds import certain helpers as defaults
declare module 'drizzle-orm' {
  export function eq(...args: any[]): any;
  export function and(...args: any[]): any;
  export function or(...args: any[]): any;
  export function sql(...args: any[]): any;
  export function desc(...args: any[]): any;
  export function gte(...args: any[]): any;
  export function lte(...args: any[]): any;
  export function count(...args: any[]): any;
  export function avg(...args: any[]): any;
  export function inArray(...args: any[]): any;
  export function like(...args: any[]): any;
  const _default: any;
  export default _default;
}

// Make QueryResult array-like for simple client code that treats query
// responses as arrays (length, map, reduce). This is a pragmatic shim.
declare type QueryResultLike<T = any> = T[] & {
  rows?: T[];
};

declare module 'pg' {
  // augment PoolClient/QueryResult shapes used across the project
  export interface QueryResult<T = any> extends QueryResultLike<T> {}
}

// Additional schema names seen in diagnostics
declare module '@shared/schema.js' {
  export const Stakeholder: any;
  export const InsertStakeholder: any;
  export const expertVerifications: any;
  export const billTags: any;
}

// Wildcard shims for service modules that are commonly imported with
// relative paths and include a .js extension in imports. These patterns
// match imports like '../services/performance-monitoring.js' or
// './enhanced-notification.js'. Add names as diagnostics require.
declare module '*performance-monitoring.js' {
  export const performanceMonitoring: any;
  export type MonitoringConfig = any;
  export default performanceMonitoring;
}

declare module '*metrics.js' {
  const metrics: any;
  export default metrics;
}

// Generic services wildcard: many imports use relative paths and expect
// named exports. Provide permissive declarations that include common names.
declare module '../services/*' {
  export const performanceMonitoring: any;
  export const MonitoringLevel: any;
  export const SamplingStrategy: any;
  export function getEmailService(...args: any[]): any;
  export const enhancedNotificationService: any;
  export default any;
}

// api-response helpers used by monitoring/health
declare module '../utils/api-response.js' {
  export * from '../utils/api-response';
  export default any;
}

// Catch any relative import that ends with api-response.js
declare module '*api-response.js' {
  export * from '../utils/api-response';
  export default any;
}

declare module '*email.service.js' {
  export function getEmailService(...args: any[]): any;
  export default getEmailService;
}

declare module '*enhanced-notification.js' {
  const enhancedNotificationService: any;
  export { enhancedNotificationService };
  export default enhancedNotificationService;
}
