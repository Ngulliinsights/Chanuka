// Minimal global shims to reduce TypeScript noise during incremental refactors.
// These are pragmatic, temporary declarations — we'll replace with precise types later.

declare module 'mysql2' {
  const mysql: any;
  export = mysql;
}

declare module 'mysql2/promise' {
  const mysql: any;
  export = mysql;
}

declare module '@shared/*' {
  const whatever: any;
  export = whatever;
}

declare module '@/*' {
  const whatever: any;
  export = whatever;
}

// Allow importing .ts/.js extension re-exports without errors in this repo
declare module '*/*.ts' {
  const v: any;
  export = v;
}

// Provide a fallback type for 'drizzle-orm' exports we don't fully type yet
declare module 'drizzle-orm' {
  export const sql: any;
  export type SQL = any;
  export const and: any;
  export const or: any;
  export const desc: any;
  export const eq: any;
  export const inArray: any;
}
