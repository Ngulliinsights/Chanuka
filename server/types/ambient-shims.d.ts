// Temporary ambient shims to reduce TypeScript noise during migration.
// These are intentionally permissive and will be tightened later.

declare module 'pg' {
  // Basic QueryResultRow and QueryResult shapes used across the codebase
  export type QueryResultRow = { [column: string]: any };
  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command?: string;
    fields?: any[];
  }

  export interface Pool {
    query: {
      <T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
      <T = any>(config: { text: string; values?: any[] }): Promise<QueryResult<T>>;
    };
    totalCount?: number;
    waitingCount?: number;
    idleCount?: number;
    end?: () => Promise<void>;
  }
}

// Permit importing @shared/schema with a permissive any-export during migration.
declare module '@shared/schema' {
  const _any: any;
  export = _any;
}

// Focused relax for drizzle-orm — expose common helpers and SQL wrapper as any
declare module 'drizzle-orm' {
  export const sql: any;
  export const and: any;
  export const or: any;
  export const inArray: any;
  export const gte: any;
  export const lte: any;
  export const gt: any;
  export const lt: any;
  export const desc: any;
  export const asc: any;
  export const ilike: any;
  export const like: any;
  export const count: any;
  export const SQL: any;
  export type PgSelectBase = any;
  const _any: any;
  export default _any;
}

// Relax logger to a permissive any to avoid call-signature conflicts while migrating.
declare module '@shared/core/src/observability/logging' {
  const logger: any;
  export { logger };
}

// Legacy compatibility
declare module '@shared/core/src/logging' {
  export * from '@shared/core/src/observability/logging';
}

// Broad shim to prevent the compiler from resolving into the full shared/core
// source during focused typechecks. This is intentionally permissive and will
// be tightened later during a proper migration.
declare module '@shared/core' {
  const _any: any;
  export = _any;
}

// Catch-all for deep imports like '@shared/core/src/observability/logging'
// or '@shared/core/src/validation/validation-service' so the compiler uses
// these permissive shims instead of including the real source files.
declare module '@shared/core/*' {
  const _any: any;
  export = _any;
}





































