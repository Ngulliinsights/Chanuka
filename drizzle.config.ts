import { defineConfig } from "drizzle-kit";
// import { logger } from './server/utils/logger';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Diagnostic logging for SSL authentication debugging
// logger.info('🔍 Drizzle Config Diagnostics:', { component: 'SimpleTool' });
// logger.info('NODE_ENV:', { component: 'SimpleTool' }, process.env.NODE_ENV);
// logger.info('DATABASE_URL exists:', { component: 'SimpleTool' }, !!process.env.DATABASE_URL);
// logger.info('DATABASE_URL starts with postgres:', { component: 'SimpleTool' }, process.env.DATABASE_URL?.startsWith('postgres'));
// logger.info('DATABASE_URL contains sslmode:', { component: 'SimpleTool' }, process.env.DATABASE_URL?.includes('sslmode'));
// if (process.env.DATABASE_URL?.includes('sslmode')) {
//   const sslmode = process.env.DATABASE_URL.match(/sslmode=([^&\s]+)/)?.[1];
//   logger.info('SSL mode in URL:', { component: 'SimpleTool' }, sslmode);
// }

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
});







