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
    "./shared/schema/trojan_bill_detection.ts",
    "./shared/schema/political_economy.ts",
    "./shared/schema/citizen_participation.ts",
    "./shared/schema/participation_oversight.ts",
    "./shared/schema/constitutional_intelligence.ts",
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













































