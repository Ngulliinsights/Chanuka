// Barrel exports for shared/schema
export * from "./schema";
export * from "./enum";
export * from "./types";
export * from "./validation";

// Note: `searchVector` column is represented as text in TypeScript schema
// and the true tsvector column + GIN index are created via SQL migrations.
export * from "./searchVectorMigration";
