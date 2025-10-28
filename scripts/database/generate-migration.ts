// File: generate-migrations.ts
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { Pool } from 'pg';
import { logger } from '@shared/core/utils/browser-logger'';

// Polyfill AggregateError if not available
if (typeof AggregateError === 'undefined') {
  class CustomAggregateError extends Error {
    errors: Error[];

    constructor(errors: Error[], message?: string) {
      super(message || 'Multiple errors occurred');
      this.name = 'AggregateError';
      this.errors = errors;

      // Maintain proper stack trace
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, CustomAggregateError);
      }
    }
  }

  (globalThis as any).AggregateError = CustomAggregateError;
}

export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export async function generateMigration(migration: Migration, directory: string): Promise<void> {
  try {
    // Create migrations directory if it doesn't exist
    await mkdir(directory, { recursive: true });

    const fileName = `${migration.id}_${migration.name}.sql`;
    const filePath = join(directory, fileName);

    await writeFile(filePath, migration.sql);
  } catch (error) {
    throw new AggregateError(
      [error as Error],
      'MigrationGenerationError: Failed to generate migration file',
    );
  }
}

// Export the polyfilled AggregateError for use in other modules
export { AggregateError };

/**
 * Migration generation result interface
 */
interface MigrationResult {
  success: boolean;
  migrationPath?: string;
  message?: string;
  error?: string;
}

/**
 * Initialize environment and database connection
 */
function initializeEnvironment(): { pool: Pool; db: ReturnType<typeof drizzle> } {
  // Load environment variables
  dotenv.config();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  // Initialize PostgreSQL connection pool with proper error handling
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Test the connection
  pool.on('error', err => {
    logger.error('Unexpected error on idle client', { component: 'Chanuka' }, err);
    process.exit(-1);
  });

  // Initialize Drizzle ORM
  const db = drizzle(pool);

  return { pool, db };
}

/**
 * Ensure migrations directory exists
 */
function ensureMigrationsDirectory(dirPath: string): void {
  if (!existsSync(dirPath)) {
    try {
      mkdirSync(dirPath, { recursive: true });
      console.log(`Created migrations directory: ${dirPath}`);
    } catch (error) {
      logger.error('Failed to create migrations directory', error);
      throw new AggregateError([error], 'MigrationDirectoryCreationError');
    }
  }
}

/**
 * Generate SQL for database schema
 */
function generateSchemaSQL(): string {
  // SQL for enums
  const enumsSQL = `
-- Create custom enum types
CREATE TYPE "influence_level" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "importance_level" AS ENUM ('critical', 'important', 'normal');
CREATE TYPE "vote_type" AS ENUM ('yes', 'no', 'abstain');
CREATE TYPE "bill_status" AS ENUM ('draft', 'introduced', 'committee', 'passed', 'enacted', 'failed');
`;

  // SQL for tables
  const tablesSQL = `
-- Users table
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "expertise" TEXT,
  "onboarding_completed" BOOLEAN DEFAULT false,
  "google_id" TEXT UNIQUE,
  "email" TEXT UNIQUE,
  "avatar_url" TEXT,
  "reputation" INTEGER DEFAULT 0,
  "last_active" TIMESTAMP DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "username_idx" ON "users" ("username");
CREATE INDEX "email_idx" ON "users" ("email");
CREATE INDEX "last_active_idx" ON "users" ("last_active");

-- User interests table
CREATE TABLE "user_interests" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "interest" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "user_interest_idx" ON "user_interests" ("user_id", "interest");

-- User social profiles table
CREATE TABLE "user_social_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "platform" TEXT NOT NULL,
  "profile_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "user_platform_idx" ON "user_social_profiles" ("user_id", "platform");

-- Bills table
CREATE TABLE "bills" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" bill_status NOT NULL DEFAULT 'draft',
  "proposed_date" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_updated" TIMESTAMP NOT NULL DEFAULT NOW(),
  "content" TEXT NOT NULL,
  "view_count" INTEGER DEFAULT 0,
  "share_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "bill_status_idx" ON "bills" ("status");
CREATE INDEX "proposed_date_idx" ON "bills" ("proposed_date");
CREATE INDEX "view_count_idx" ON "bills" ("view_count");

-- Bill tags table
CREATE TABLE "bill_tags" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "tag" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "bill_tag_idx" ON "bill_tags" ("bill_id", "tag");
CREATE INDEX "tag_idx" ON "bill_tags" ("tag");

-- Bill analysis table
CREATE TABLE "bill_analysis" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "brief_summary" TEXT,
  "standard_summary" TEXT,
  "comprehensive_summary" TEXT,
  "constitutional_confidence" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "bill_analysis_idx" ON "bill_analysis" ("bill_id");

-- Bill key provisions table
CREATE TABLE "bill_key_provisions" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "impact" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "bill_provision_idx" ON "bill_key_provisions" ("bill_id");

-- Bill timeline table
CREATE TABLE "bill_timeline" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "event_date" TIMESTAMP NOT NULL,
  "event" TEXT NOT NULL,
  "importance" importance_level NOT NULL DEFAULT 'normal',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "bill_timeline_idx" ON "bill_timeline" ("bill_id", "event_date");

-- Stakeholders table
CREATE TABLE "stakeholders" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "organization" TEXT NOT NULL,
  "influence" influence_level DEFAULT 'medium',
  "sector" TEXT,
  "biography" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "office" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "stakeholder_name_idx" ON "stakeholders" ("name");
CREATE INDEX "organization_idx" ON "stakeholders" ("organization");
CREATE INDEX "sector_idx" ON "stakeholders" ("sector");

-- Bill-Stakeholder relationship table
CREATE TABLE "bill_stakeholders" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "bill_stakeholder_idx" ON "bill_stakeholders" ("bill_id", "stakeholder_id");

-- Stakeholder relationships table
CREATE TABLE "stakeholder_relationships" (
  "id" SERIAL PRIMARY KEY,
  "stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id") ON DELETE CASCADE,
  "related_stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id"),
  "relationship_type" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "relationship_idx" ON "stakeholder_relationships" ("stakeholder_id", "related_stakeholder_id");

-- Stakeholder impacts table
CREATE TABLE "stakeholder_impacts" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id") ON DELETE CASCADE,
  "impact" influence_level NOT NULL,
  "analysis" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "bill_stakeholder_impact_idx" ON "stakeholder_impacts" ("bill_id", "stakeholder_id");

-- Stakeholder votes table
CREATE TABLE "stakeholder_votes" (
  "id" SERIAL PRIMARY KEY,
  "stakeholder_id" INTEGER NOT NULL REFERENCES "stakeholders" ("id") ON DELETE CASCADE,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "vote" vote_type NOT NULL,
  "vote_date" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "stakeholder_vote_idx" ON "stakeholder_votes" ("stakeholder_id", "bill_id");

-- Bill comments table
CREATE TABLE "bill_comments" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "expertise" TEXT,
  "verified_claims" INTEGER DEFAULT 0,
  "endorsements" INTEGER DEFAULT 0,
  "parent_id" INTEGER REFERENCES "bill_comments" ("id") ON DELETE SET NULL,
  "is_highlighted" BOOLEAN DEFAULT false,
  "sentiment" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "bill_comment_idx" ON "bill_comments" ("bill_id");
CREATE INDEX "user_comment_idx" ON "bill_comments" ("user_id");
CREATE INDEX "parent_comment_idx" ON "bill_comments" ("parent_id");

-- User progress table
CREATE TABLE "user_progress" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "achievement_type" TEXT NOT NULL,
  "achievement_value" INTEGER NOT NULL,
  "level" INTEGER,
  "badge" TEXT,
  "description" TEXT,
  "unlocked_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "user_achievement_idx" ON "user_progress" ("user_id", "achievement_type");

-- User flagged content table
CREATE TABLE "user_flags" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "content_type" TEXT NOT NULL,
  "content_id" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "user_flag_idx" ON "user_flags" ("user_id");
CREATE INDEX "content_flag_idx" ON "user_flags" ("content_type", "content_id");

-- Bill engagement metrics table
CREATE TABLE "bill_engagement" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "view_count" INTEGER DEFAULT 0,
  "comment_count" INTEGER DEFAULT 0,
  "share_count" INTEGER DEFAULT 0,
  "engagement_score" FLOAT DEFAULT 0,
  "last_engaged" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "bill_user_engagement_idx" ON "bill_engagement" ("bill_id", "user_id");
CREATE INDEX "engagement_score_idx" ON "bill_engagement" ("engagement_score");

-- Bill supporters table
CREATE TABLE "bill_supporters" (
  "id" SERIAL PRIMARY KEY,
  "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "support_level" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "bill_supporter_idx" ON "bill_supporters" ("bill_id", "user_id");
`;

  // SQL for additional indexes
  const indexesSQL = `
-- Additional indexes for query optimization
CREATE INDEX "bill_created_at_idx" ON "bills" ("created_at");
CREATE INDEX "user_created_at_idx" ON "users" ("created_at");
CREATE INDEX "comment_created_at_idx" ON "bill_comments" ("created_at");
CREATE INDEX "stakeholder_created_at_idx" ON "stakeholders" ("created_at");
`;

  // SQL for triggers and functions
  const functionsSQL = `
-- Function and triggers to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
BEFORE UPDATE ON "bills"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_analysis_updated_at
BEFORE UPDATE ON "bill_analysis"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholders_updated_at
BEFORE UPDATE ON "stakeholders"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholder_impacts_updated_at
BEFORE UPDATE ON "stakeholder_impacts"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_comments_updated_at
BEFORE UPDATE ON "bill_comments"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_flags_updated_at
BEFORE UPDATE ON "user_flags"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_engagement_updated_at
BEFORE UPDATE ON "bill_engagement"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

  // Combine all SQL parts
  return [enumsSQL, tablesSQL, indexesSQL, functionsSQL].join('\n');
}

/**
 * Generate migration file
 */
async function generateMigrationFile(): Promise<MigrationResult> {
  logger.info('Generating SQL migration...', { component: 'Chanuka' });

  try {
    // Ensure migrations directory exists
    const migrationsDir = resolve('./drizzle');
    ensureMigrationsDirectory(migrationsDir);

    // Create migration file name with timestamp
    const timestamp = new Date().getTime();
    const migrationName = `${timestamp}_init_schema`;
    const migrationFilePath = resolve(migrationsDir, `${migrationName}.sql`);

    // Generate SQL schema
    const fullSQL = generateSchemaSQL();

    // Write the migration file
    writeFileSync(migrationFilePath, fullSQL);
    console.log(`Migration file generated at: ${migrationFilePath}`);

    return {
      success: true,
      migrationPath: migrationFilePath,
      message: 'Migration file generated successfully',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Migration SQL generation failed', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Run the migration against the database
 */
async function runMigration(db: ReturnType<typeof drizzle>, pool: Pool): Promise<MigrationResult> {
  logger.info('Running migration...', { component: 'Chanuka' });

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    logger.info('Migration completed successfully', { component: 'Chanuka' });

    return {
      success: true,
      message: 'Migration completed successfully',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error running migration:', { component: 'Chanuka' }, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    await pool.end();
  }
}

/**
 * Print usage instructions
 */
function printUsage(): void {
  console.log(`
Usage:
  npm run generate-migrations [options]

Options:
  --confirm, -c    Generate migration and immediately apply it to the database
  --generate, -g   Only generate migration file without applying
  --help, -h       Show this help message
`);
}

/**
 * Process command line arguments
 */
function processArgs(): { shouldRun: boolean; shouldGenerate: boolean } {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  return {
    shouldRun: args.includes('--confirm') || args.includes('-c'),
    shouldGenerate: args.includes('--generate') || args.includes('-g') || args.length === 0,
  };
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const { shouldRun, shouldGenerate } = processArgs();

    if (shouldGenerate) {
      const generationResult = await generateMigrationFile();
      if (!generationResult.success) {
        logger.error('Migration generation failed', generationResult.error);
        process.exit(1);
      }

      if (!shouldRun) {
        console.log(
          'Migration file generated. Run with --confirm or -c flag to apply the migration.',
        );
        return;
      }
    }

    if (shouldRun) {
      const { pool, db } = initializeEnvironment();
      const migrationResult = await runMigration(db, pool);

      if (!migrationResult.success) {
        logger.error('Migration execution failed.', { component: 'Chanuka' });
        process.exit(1);
      }
    }
  } catch (error) {
    logger.error('Fatal error:', { component: 'Chanuka' }, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Execute main function with proper error handling
main()
  .then(() => {
    logger.info('Process completed successfully.', { component: 'Chanuka' });
    process.exit(0);
  })
  .catch(error => {
    console.error(
      'Unhandled error in main process:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });













































