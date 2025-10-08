import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Diagnostic logging for SSL authentication debugging
console.log('🔍 Drizzle Config Diagnostics:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL starts with postgres:', process.env.DATABASE_URL?.startsWith('postgres'));
console.log('DATABASE_URL contains sslmode:', process.env.DATABASE_URL?.includes('sslmode'));
if (process.env.DATABASE_URL?.includes('sslmode')) {
  const sslmode = process.env.DATABASE_URL.match(/sslmode=([^&\s]+)/)?.[1];
  console.log('SSL mode in URL:', sslmode);
}

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
});
