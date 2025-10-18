import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Diagnostic logging for SSL authentication debugging
// DEPRECATED: Use shared/core logger instead
// import { logger } from './shared/core/src/logging';
// logger.info('🔍 Drizzle Config Diagnostics:', { component: 'Chanuka' });
// logger.info('NODE_ENV:', { component: 'Chanuka' }, process.env.NODE_ENV);
// logger.info('DATABASE_URL exists:', { component: 'Chanuka' }, !!process.env.DATABASE_URL);
// logger.info('DATABASE_URL starts with postgres:', { component: 'Chanuka' }, process.env.DATABASE_URL?.startsWith('postgres'));
// logger.info('DATABASE_URL contains sslmode:', { component: 'Chanuka' }, process.env.DATABASE_URL?.includes('sslmode'));
// if (process.env.DATABASE_URL?.includes('sslmode')) {
//   const sslmode = process.env.DATABASE_URL.match(/sslmode=([^&\s]+)/)?.[1];
//   logger.info('SSL mode in URL:', { component: 'Chanuka' }, sslmode);
// }

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
});







