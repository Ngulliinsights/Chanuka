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
    "./shared/schema/foundation.ts",
    "./shared/schema/citizen_participation.ts", 
    "./shared/schema/parliamentary_process.ts",
    "./shared/schema/constitutional_intelligence.ts",
    "./shared/schema/argument_intelligence.ts",
    "./shared/schema/advocacy_coordination.ts",
    "./shared/schema/universal_access.ts",
    "./shared/schema/transparency_analysis.ts",
    "./shared/schema/impact_measurement.ts",
    "./shared/schema/integrity_operations.ts",
    "./shared/schema/platform_operations.ts",
    "./shared/schema/enum.ts"
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
});













































