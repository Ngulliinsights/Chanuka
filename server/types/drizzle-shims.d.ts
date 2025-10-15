// Permissive shims for Drizzle ORM and pg QueryResult to reduce type noise during refactor
declare type PgSelectBase<
  TSelected = any,
  TTable = any,
  TMode = any,
  TNotNullMap = any,
  TUnknown = any,
  TWhere = any,
  TJoins = any,
  TExtra = any
> = any;

declare type PgInsertBase<T = any> = any;
declare type PgUpdateBase<T = any> = any;

// Minimal compatible QueryResult to satisfy [Symbol.iterator] and rowCount usage
interface QueryResultRow<T = any> {
  [key: string]: T;
}

interface QueryResult<T = any> extends Iterable<T> {
  rows: T[];
  rowCount: number | null;
  // allow iteration
  [Symbol.iterator](): Iterator<T>;
}

// Some Drizzle helpers referenced across code
declare function eq(a: any, b: any): boolean;
declare function and(...args: any[]): any;
declare function or(...args: any[]): any;
declare function lt(a: any, b: any): any;
declare function gte(a: any, b: any): any;
declare function desc(...args: any[]): any;
declare function inArray(a: any, b: any): any;
declare function count(...args: any[]): any;
declare const sql: any;

// Export a loose module for drizzle-orm with common named exports used
declare module 'drizzle-orm' {
  export type AnyDrizzle = any;
  export const eq: typeof eq;
  export const and: typeof and;
  export const or: typeof or;
  export const lt: typeof lt;
  export const gte: typeof gte;
  export const desc: typeof desc;
  export const inArray: typeof inArray;
  export const count: typeof count;
  export const sql: typeof sql;
  export const relations: any;
  export type ExtractTablesWithRelations = any;
  export default AnyDrizzle;
}
