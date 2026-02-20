#!/usr/bin/env tsx
/**
 * Database Migration Generator
 * 
 * Generates new migration files from schema changes using Drizzle ORM.
 * Compares current schema with database state and creates timestamped migration files.
 * 
 * Usage:
 *   npm run db:generate
 *   tsx scripts/database/generate-migration.ts
 * 
 * What it does:
 *   - Compares Drizzle schema with current database state
 *   - Generates SQL migration statements
 *   - Creates timestamped migration file in drizzle/ directory
 *   - Validates generated migration syntax
 * 
 * When to run:
 *   - After modifying Drizzle schema files
 *   - Before committing schema changes
 *   - As part of development workflow
 * 
 * Output:
 *   - Migration file: drizzle/<timestamp>_<name>.sql
 *   - Migration metadata: drizzle/meta/<timestamp>_snapshot.json
 */

// File: generate-migrations.ts
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Pool, PoolConfig } from 'pg';

// ============================================================================
// Constants
// ============================================================================

const MIGRATIONS_DIR = './drizzle';
const DEFAULT_MIGRATION_NAME = 'init_schema';

const LogPrefix = {
  INFO: '[INFO]',
  ERROR: '[ERROR]',
  SUCCESS: '[SUCCESS]',
  WARN: '[WARN]',
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

interface Migration {
  id: number;
  name: string;
  sql: string;
}

interface MigrationResult {
  success: boolean;
  migrationPath?: string;
  message?: string;
  error?: string;
}

interface DatabaseConnection {
  pool: Pool;
  db: ReturnType<typeof drizzle>;
}

interface ProcessArgs {
  shouldRun: boolean;
  shouldGenerate: boolean;
}

// ============================================================================
// AggregateError Polyfill
// ============================================================================

function initializeAggregateErrorPolyfill(): void {
  if (typeof AggregateError === 'undefined') {
    class CustomAggregateError extends Error {
      errors: Error[];

      constructor(errors: Error[], message?: string) {
        super(message || 'Multiple errors occurred');
        this.name = 'AggregateError';
        this.errors = errors;

        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, CustomAggregateError);
        }
      }
    }

    (globalThis as any).AggregateError = CustomAggregateError;
  }
}

// ============================================================================
// Logging Utilities
// ============================================================================

const logger = {
  info: (message: string): void => console.log(`${LogPrefix.INFO} ${message}`),
  error: (message: string, error?: unknown): void => {
    console.error(`${LogPrefix.ERROR} ${message}`);
    if (error) {
      console.error(error);
    }
  },
  success: (message: string): void => console.log(`${LogPrefix.SUCCESS} ${message}`),
  warn: (message: string): void => console.warn(`${LogPrefix.WARN} ${message}`),
};

// ============================================================================
// SQL Schema Generation
// ============================================================================

class SchemaGenerator {
  private static generateEnumsSQL(): string {
    return `
-- ============================================================================
-- Custom Enum Types
-- ============================================================================

CREATE TYPE "influence_level" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "importance_level" AS ENUM ('critical', 'important', 'normal');
CREATE TYPE "vote_type" AS ENUM ('yes', 'no', 'abstain');
CREATE TYPE "bill_status" AS ENUM ('draft', 'introduced', 'committee', 'passed', 'enacted', 'failed');
`;
  }

  private static generateTablesSQL(): string {
    return `
-- ============================================================================
-- Core Tables
-- ============================================================================

-- Trojan Bill Analysis
CREATE TABLE "trojan_bill_analysis" (
  "bill_id" UUID PRIMARY KEY REFERENCES "bills" ("id") ON DELETE CASCADE,
  "bill_name" VARCHAR(500),
  "trojan_risk_score" NUMERIC(5,2),
  "stated_purpose" TEXT,
  "hidden_provisions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "detection_method" VARCHAR(50),
  "detection_date" DATE,
  "detection_confidence" NUMERIC(3,2),
  "public_alert_issued" BOOLEAN NOT NULL DEFAULT false,
  "outcome" VARCHAR(50),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_trojan_bill_analysis_risk_score" ON "trojan_bill_analysis" ("trojan_risk_score");
CREATE INDEX "idx_trojan_bill_analysis_detection_method" ON "trojan_bill_analysis" ("detection_method");
CREATE INDEX "idx_trojan_bill_analysis_outcome" ON "trojan_bill_analysis" ("outcome");
CREATE INDEX "idx_trojan_bill_analysis_detection_date" ON "trojan_bill_analysis" ("detection_date");
CREATE INDEX "idx_trojan_bill_analysis_hidden_provisions" ON "trojan_bill_analysis" USING gin ("hidden_provisions");

-- Hidden Provisions
CREATE TABLE "hidden_provisions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "trojan_bill_analysis" ("bill_id") ON DELETE CASCADE,
  "provision_text" TEXT,
  "provision_location" VARCHAR(50),
  "hidden_agenda" VARCHAR(500),
  "power_type" VARCHAR(100),
  "affected_rights" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "affected_institutions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "severity" VARCHAR(20),
  "detected_by" VARCHAR(100),
  "evidence" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_hidden_provisions_bill_severity" ON "hidden_provisions" ("bill_id", "severity");
CREATE INDEX "idx_hidden_provisions_power_type" ON "hidden_provisions" ("power_type");
CREATE INDEX "idx_hidden_provisions_severity" ON "hidden_provisions" ("severity");
CREATE INDEX "idx_hidden_provisions_affected_rights" ON "hidden_provisions" USING gin ("affected_rights");
CREATE INDEX "idx_hidden_provisions_affected_institutions" ON "hidden_provisions" USING gin ("affected_institutions");
CREATE INDEX "idx_hidden_provisions_text" ON "hidden_provisions" ("provision_text");

-- Trojan Techniques
CREATE TABLE "trojan_techniques" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "trojan_bill_analysis" ("bill_id") ON DELETE CASCADE,
  "technique_type" VARCHAR(50),
  "description" TEXT,
  "example" TEXT,
  "effectiveness_rating" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_trojan_techniques_type" ON "trojan_techniques" ("technique_type");
CREATE INDEX "idx_trojan_techniques_effectiveness" ON "trojan_techniques" ("effectiveness_rating");
CREATE INDEX "idx_trojan_techniques_bill_type" ON "trojan_techniques" ("bill_id", "technique_type");

-- Detection Signals
CREATE TABLE "detection_signals" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "trojan_bill_analysis" ("bill_id") ON DELETE CASCADE,
  "signal_type" VARCHAR(50),
  "signal_value" NUMERIC(10,4),
  "signal_description" TEXT,
  "contributes_to_risk" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_detection_signals_bill_type" ON "detection_signals" ("bill_id", "signal_type");
CREATE INDEX "idx_detection_signals_value" ON "detection_signals" ("signal_value");
CREATE INDEX "idx_detection_signals_contributes" ON "detection_signals" ("contributes_to_risk");
CREATE INDEX "idx_detection_signals_description" ON "detection_signals" ("signal_description");

-- Elite Knowledge Scores
CREATE TABLE "elite_knowledge_scores" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "elite_group" VARCHAR(100) NOT NULL,
  "knowledge_score" NUMERIC(5,2),
  "confidence_level" NUMERIC(3,2),
  "assessment_method" VARCHAR(50),
  "assessed_by" VARCHAR(100),
  "assessment_date" DATE,
  "evidence_sources" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_elite_knowledge_scores_bill" ON "elite_knowledge_scores" ("bill_id");
CREATE INDEX "idx_elite_knowledge_scores_group" ON "elite_knowledge_scores" ("elite_group");
CREATE INDEX "idx_elite_knowledge_scores_score" ON "elite_knowledge_scores" ("knowledge_score");

-- Participation Quality Audits
CREATE TABLE "participation_quality_audits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "audit_period_start" DATE NOT NULL,
  "audit_period_end" DATE NOT NULL,
  "total_participants" INTEGER NOT NULL DEFAULT 0,
  "quality_score" NUMERIC(5,2),
  "diversity_score" NUMERIC(5,2),
  "engagement_depth_score" NUMERIC(5,2),
  "influence_effectiveness_score" NUMERIC(5,2),
  "audit_methodology" VARCHAR(100),
  "audited_by" VARCHAR(100),
  "audit_findings" TEXT,
  "recommendations" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_participation_quality_audits_bill" ON "participation_quality_audits" ("bill_id");
CREATE INDEX "idx_participation_quality_audits_period" ON "participation_quality_audits" ("audit_period_start", "audit_period_end");
CREATE INDEX "idx_participation_quality_audits_score" ON "participation_quality_audits" ("quality_score");

-- Political Appointments
CREATE TABLE "political_appointments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "person_name" VARCHAR(255) NOT NULL,
  "position" VARCHAR(255) NOT NULL,
  "institution" VARCHAR(255) NOT NULL,
  "sponsor_id" UUID REFERENCES "sponsors" ("id") ON DELETE SET NULL,
  "ethnicity" VARCHAR(50),
  "home_county" VARCHAR(50),
  "gender" VARCHAR(20),
  "appointing_government" VARCHAR(100) NOT NULL,
  "appointment_date" DATE NOT NULL,
  "departure_date" DATE,
  "education_level" VARCHAR(100),
  "relevant_experience_years" SMALLINT,
  "previous_positions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "appointment_type" VARCHAR(50),
  "party_affiliation" VARCHAR(50),
  "political_relationship" VARCHAR(255),
  "performance_rating" NUMERIC(3,2),
  "corruption_allegations" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_appointments_govt_ethnicity" ON "political_appointments" ("appointing_government", "ethnicity");
CREATE INDEX "idx_appointments_institution" ON "political_appointments" ("institution");
CREATE INDEX "idx_appointments_ethnicity_county" ON "political_appointments" ("ethnicity", "home_county");
CREATE INDEX "idx_appointments_type" ON "political_appointments" ("appointment_type");

-- Infrastructure Tenders
CREATE TABLE "infrastructure_tenders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_name" VARCHAR(255) NOT NULL,
  "project_type" VARCHAR(100) NOT NULL,
  "contracting_authority" VARCHAR(255) NOT NULL,
  "tender_value" NUMERIC(15,2) NOT NULL,
  "final_cost" NUMERIC(15,2),
  "cost_overrun_percentage" NUMERIC(5,2),
  "winning_company" VARCHAR(255) NOT NULL,
  "company_owners" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "beneficial_owners_disclosed" BOOLEAN NOT NULL DEFAULT false,
  "government_at_time" VARCHAR(100) NOT NULL,
  "tender_date" DATE NOT NULL,
  "project_county" VARCHAR(50),
  "coalition_stronghold" BOOLEAN,
  "project_status" VARCHAR(50),
  "completion_percentage" NUMERIC(5,2),
  "corruption_allegations" BOOLEAN NOT NULL DEFAULT false,
  "investigated" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_tenders_govt_county" ON "infrastructure_tenders" ("government_at_time", "project_county");
CREATE INDEX "idx_tenders_status" ON "infrastructure_tenders" ("project_status");
CREATE INDEX "idx_tenders_corruption" ON "infrastructure_tenders" ("corruption_allegations") WHERE "corruption_allegations" = true;

-- Ethnic Advantage Scores
CREATE TABLE "ethnic_advantage_scores" (
  "community" VARCHAR(100) PRIMARY KEY,
  "colonial_era_score" NUMERIC(5,2),
  "kenyatta_era_score" NUMERIC(5,2),
  "moi_era_score" NUMERIC(5,2),
  "kibaki_era_score" NUMERIC(5,2),
  "uhuru_era_score" NUMERIC(5,2),
  "ruto_era_score" NUMERIC(5,2),
  "education_level_current" NUMERIC(5,2),
  "income_current" NUMERIC(15,2),
  "poverty_rate" NUMERIC(5,2),
  "infrastructure_access" NUMERIC(5,2),
  "cumulative_advantage_score" NUMERIC(5,2) NOT NULL,
  "deficit_score" NUMERIC(6,2),
  "last_updated" DATE NOT NULL DEFAULT NOW(),
  "methodology_version" VARCHAR(20),
  "data_sources" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_advantage_deficit" ON "ethnic_advantage_scores" ("deficit_score");
CREATE INDEX "idx_advantage_cumulative" ON "ethnic_advantage_scores" ("cumulative_advantage_score");

-- Strategic Infrastructure Projects
CREATE TABLE "strategic_infrastructure_projects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_name" VARCHAR(255) NOT NULL UNIQUE,
  "project_code" VARCHAR(50) NOT NULL UNIQUE,
  "project_type" VARCHAR(50) NOT NULL,
  "initiating_government" VARCHAR(100) NOT NULL,
  "initiating_president" VARCHAR(100),
  "current_government" VARCHAR(100),
  "continued_by_successor" BOOLEAN,
  "governments_spanned" SMALLINT NOT NULL DEFAULT 1,
  "planned_start_date" DATE,
  "actual_start_date" DATE,
  "planned_completion_date" DATE,
  "actual_completion_date" DATE,
  "project_status" VARCHAR(50) NOT NULL,
  "completion_percentage" NUMERIC(5,2),
  "abandoned" BOOLEAN NOT NULL DEFAULT false,
  "abandonment_date" DATE,
  "abandonment_reason" TEXT,
  "abandonment_government" VARCHAR(100),
  "initial_budget" NUMERIC(18,2),
  "total_spent" NUMERIC(18,2),
  "legal_protection" BOOLEAN NOT NULL DEFAULT false,
  "protection_mechanism" TEXT,
  "ppp_structure" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_infra_status" ON "strategic_infrastructure_projects" ("project_status");
CREATE INDEX "idx_infra_continued" ON "strategic_infrastructure_projects" ("continued_by_successor");
CREATE INDEX "idx_infra_abandoned" ON "strategic_infrastructure_projects" ("abandoned") WHERE "abandoned" = true;
`;
  }

  private static generateIndexesSQL(): string {
    return `
-- ============================================================================
-- Additional Query Optimization Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS "bill_created_at_idx" ON "bills" ("created_at");
CREATE INDEX IF NOT EXISTS "user_created_at_idx" ON "users" ("created_at");
CREATE INDEX IF NOT EXISTS "comment_created_at_idx" ON "bill_comments" ("created_at");
CREATE INDEX IF NOT EXISTS "stakeholder_created_at_idx" ON "stakeholders" ("created_at");
`;
  }

  private static generateFunctionsAndTriggersSQL(): string {
    return `
-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Automatic updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON "bills"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_analysis_updated_at
  BEFORE UPDATE ON "bill_analysis"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholders_updated_at
  BEFORE UPDATE ON "stakeholders"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholder_impacts_updated_at
  BEFORE UPDATE ON "stakeholder_impacts"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_comments_updated_at
  BEFORE UPDATE ON "bill_comments"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_flags_updated_at
  BEFORE UPDATE ON "user_flags"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_engagement_updated_at
  BEFORE UPDATE ON "bill_engagement"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trojan_bill_analysis_updated_at
  BEFORE UPDATE ON "trojan_bill_analysis"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hidden_provisions_updated_at
  BEFORE UPDATE ON "hidden_provisions"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trojan_techniques_updated_at
  BEFORE UPDATE ON "trojan_techniques"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_detection_signals_updated_at
  BEFORE UPDATE ON "detection_signals"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elite_knowledge_scores_updated_at
  BEFORE UPDATE ON "elite_knowledge_scores"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participation_quality_audits_updated_at
  BEFORE UPDATE ON "participation_quality_audits"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_political_appointments_updated_at
  BEFORE UPDATE ON "political_appointments"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_infrastructure_tenders_updated_at
  BEFORE UPDATE ON "infrastructure_tenders"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ethnic_advantage_scores_updated_at
  BEFORE UPDATE ON "ethnic_advantage_scores"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategic_infrastructure_projects_updated_at
  BEFORE UPDATE ON "strategic_infrastructure_projects"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;
  }

  static generateCompleteSchema(): string {
    return [
      this.generateEnumsSQL(),
      this.generateTablesSQL(),
      this.generateIndexesSQL(),
      this.generateFunctionsAndTriggersSQL(),
    ].join('\n');
  }
}

// ============================================================================
// Database Connection Management
// ============================================================================

class DatabaseManager {
  static initializeConnection(): DatabaseConnection {
    dotenv.config();

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    const poolConfig: PoolConfig = {
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    const pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client', err);
      process.exit(1);
    });

    const db = drizzle(pool);

    return { pool, db };
  }

  static async closeConnection(pool: Pool): Promise<void> {
    try {
      await pool.end();
      logger.info('Database connection closed successfully');
    } catch (error) {
      logger.error('Error closing database connection', error);
      throw error;
    }
  }
}

// ============================================================================
// Migration File Management
// ============================================================================

class MigrationFileManager {
  private readonly migrationsDir: string;

  constructor(migrationsDir: string = MIGRATIONS_DIR) {
    this.migrationsDir = resolve(migrationsDir);
  }

  ensureDirectoryExists(): void {
    if (!existsSync(this.migrationsDir)) {
      try {
        mkdirSync(this.migrationsDir, { recursive: true });
        logger.success(`Created migrations directory: ${this.migrationsDir}`);
      } catch (error) {
        logger.error('Failed to create migrations directory', error);
        throw new AggregateError(
          [error as Error],
          'Failed to create migrations directory'
        );
      }
    }
  }

  generateMigrationFileName(baseName: string = DEFAULT_MIGRATION_NAME): string {
    const timestamp = new Date().getTime();
    return `${timestamp}_${baseName}.sql`;
  }

  async writeMigrationFile(fileName: string, content: string): Promise<string> {
    const filePath = join(this.migrationsDir, fileName);

    try {
      writeFileSync(filePath, content, 'utf8');
      logger.success(`Migration file generated: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Failed to write migration file', error);
      throw new AggregateError(
        [error as Error],
        'Failed to write migration file'
      );
    }
  }
}

// ============================================================================
// Migration Operations
// ============================================================================

class MigrationService {
  private readonly fileManager: MigrationFileManager;

  constructor() {
    this.fileManager = new MigrationFileManager();
  }

  async generateMigrationFile(): Promise<MigrationResult> {
    logger.info('Generating SQL migration file...');

    try {
      this.fileManager.ensureDirectoryExists();

      const fileName = this.fileManager.generateMigrationFileName();
      const schema = SchemaGenerator.generateCompleteSchema();
      const filePath = await this.fileManager.writeMigrationFile(fileName, schema);

      return {
        success: true,
        migrationPath: filePath,
        message: 'Migration file generated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Migration generation failed', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async runMigration(): Promise<MigrationResult> {
    logger.info('Initializing database connection...');

    let connection: DatabaseConnection | null = null;

    try {
      connection = DatabaseManager.initializeConnection();
      logger.success('Database connection established');

      logger.info('Applying migrations...');
      await migrate(connection.db, { migrationsFolder: MIGRATIONS_DIR });
      logger.success('All migrations applied successfully');

      return {
        success: true,
        message: 'Migration completed successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Migration execution failed', error);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      if (connection) {
        await DatabaseManager.closeConnection(connection.pool);
      }
    }
  }
}

// ============================================================================
// CLI Argument Processing
// ============================================================================

class CommandLineParser {
  private readonly args: string[];

  constructor(args: string[] = process.argv.slice(2)) {
    this.args = args;
  }

  hasFlag(...flags: string[]): boolean {
    return flags.some((flag) => this.args.includes(flag));
  }

  parse(): ProcessArgs {
    if (this.hasFlag('--help', '-h')) {
      this.printUsage();
      process.exit(0);
    }

    return {
      shouldRun: this.hasFlag('--confirm', '-c'),
      shouldGenerate: this.hasFlag('--generate', '-g') || this.args.length === 0,
    };
  }

  private printUsage(): void {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     Database Migration Generator                           ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
  npm run generate-migrations [options]

Options:
  --generate, -g   Generate migration file only (default if no options)
  --confirm, -c    Generate and apply migration to database immediately
  --help, -h       Show this help message

Examples:
  npm run generate-migrations                    # Generate file only
  npm run generate-migrations --generate         # Generate file only
  npm run generate-migrations --confirm          # Generate and apply
  npm run generate-migrations -g                 # Short form: generate
  npm run generate-migrations -c                 # Short form: confirm

Notes:
  - Migration files are created in the ./drizzle directory
  - Use --confirm flag with caution in production environments
  - DATABASE_URL environment variable must be configured
`);
  }
}

// ============================================================================
// Main Application Entry Point
// ============================================================================

async function main(): Promise<void> {
  try {
    // Initialize polyfills
    initializeAggregateErrorPolyfill();

    // Parse command-line arguments
    const parser = new CommandLineParser();
    const { shouldRun, shouldGenerate } = parser.parse();

    // Initialize migration service
    const migrationService = new MigrationService();

    // Generate migration file
    if (shouldGenerate) {
      const result = await migrationService.generateMigrationFile();

      if (!result.success) {
        logger.error('Migration generation failed. Exiting.');
        process.exit(1);
      }

      if (!shouldRun) {
        logger.info('');
        logger.info('Migration file created successfully!');
        logger.info('To apply this migration, run:');
        logger.info('  npm run generate-migrations --confirm');
        return;
      }
    }

    // Apply migration to database
    if (shouldRun) {
      const result = await migrationService.runMigration();

      if (!result.success) {
        logger.error('Migration execution failed. Exiting.');
        process.exit(1);
      }
    }

    logger.success('All operations completed successfully! ✓');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Fatal error in migration process', error);
    console.error('\nStack trace:', error);
    process.exit(1);
  }
}

// ============================================================================
// Execute Main Function
// ============================================================================

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Unhandled error in main process', error);
      process.exit(1);
    });
}

// Export for testing or programmatic use
export {
  MigrationService,
  DatabaseManager,
  SchemaGenerator,
  CommandLineParser,
  MigrationFileManager,
};