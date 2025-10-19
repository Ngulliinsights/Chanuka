import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Please check your .env file.");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // Neon requires SSL in production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: true,
  // Neon-optimized migration settings
  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations__',
    schema: 'public',
  },
});












































