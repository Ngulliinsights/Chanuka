import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Please check your .env file.");
}

export default defineConfig({
  out: "./drizzle",
  schema: [
    "./server/infrastructure/schema/foundation.ts",
    "./server/infrastructure/schema/citizen_participation.ts",
    "./server/infrastructure/schema/parliamentary_process.ts",
    "./server/infrastructure/schema/safeguards.ts",
    "./server/infrastructure/schema/feature_flags.ts",
    "./server/infrastructure/schema/enum.ts"
  ],
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
  // Type generation configuration
  introspect: {
    casing: 'preserve', // Preserve snake_case from database
  },
  // Enable type generation output
  // Types will be generated in shared/types/database via our custom script
});













































