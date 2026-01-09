#!/usr/bin/env tsx
/**
 * Database Reset Script - Fixed Version
 * Safely resets the database schema and applies clean migrations
 */

/**
 * @deprecated Use reset.ts instead
 *
 * This is the "fixed" version. All fixes are integrated into reset.ts.
 * Use reset.ts which includes all improvements from this version.
 *
 * Migration path:
 *   Old: tsx scripts/database/reset-database-fixed.ts
 *   New: npm run db:reset
 *
 * See: scripts/database/DEPRECATION_NOTICE.md
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function resetDatabase() {
  console.log('🔄 Starting database reset...');

  try {
    // Step 1: Drop all existing tables
    console.log('📋 Dropping existing tables...');

    // Get all table names first
    const tables = await db.execute(sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);

    console.log(`Found ${tables.length} tables to drop`);

    // Drop each table individually
    for (const table of tables) {
      try {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`));
        console.log(`  ✅ Dropped table: ${table.tablename}`);
      } catch (error) {
        console.log(`  ⚠️  Could not drop table ${table.tablename}: ${error}`);
      }
    }

    // Drop migration tracking table specifically
    try {
      await db.execute(sql`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE`);
      console.log('  ✅ Dropped migration tracking table');
    } catch (error) {
      console.log('  ⚠️  Migration table already gone or inaccessible');
    }

    console.log('✅ All existing tables dropped');

    // Step 2: Clean up migration files
    console.log('🧹 Cleaning up migration files...');
    await cleanupMigrationFiles();

    // Step 3: Run fresh migrations
    console.log('🚀 Running fresh migrations...');
    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('✅ Fresh migrations applied');
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }

    // Step 4: Verify schema
    console.log('🔍 Verifying schema...');
    await verifySchema();

    console.log('🎉 Database reset completed successfully!');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function cleanupMigrationFiles() {
  const drizzleDir = path.join(process.cwd(), 'drizzle');

  if (!fs.existsSync(drizzleDir)) {
    console.log('  ⚠️  Drizzle directory not found, skipping cleanup');
    return;
  }

  const files = fs.readdirSync(drizzleDir);

  // Keep only the latest comprehensive migration and meta files
  const filesToKeep = [
    '0021_clean_comprehensive_schema.sql',
    'README.md',
    'meta'
  ];

  let removedCount = 0;
  for (const file of files) {
    if (!filesToKeep.includes(file) && file.endsWith('.sql')) {
      const filePath = path.join(drizzleDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`  ✅ Removed conflicting migration: ${file}`);
        removedCount++;
      } catch (error) {
        console.log(`  ⚠️  Could not remove ${file}: ${error}`);
      }
    }
  }

  console.log(`  📊 Removed ${removedCount} conflicting migration files`);

  // Update meta journal to reflect clean state
  const metaDir = path.join(drizzleDir, 'meta');
  if (fs.existsSync(metaDir)) {
    const journalPath = path.join(metaDir, '_journal.json');
    const cleanJournal = {
      version: "6",
      dialect: "postgresql",
      entries: [
        {
          idx: 0,
          version: "6",
          when: Date.now(),
          tag: "0021_clean_comprehensive_schema",
          breakpoints: true
        }
      ]
    };
    fs.writeFileSync(journalPath, JSON.stringify(cleanJournal, null, 2));
    console.log('  ✅ Updated migration journal');
  }
}

async function verifySchema() {
  try {
    // Check that essential tables exist
    const essentialTables = [
      'users',
      'sessions',
      'bills',
      'sponsors',
      'comments',
      'user_profiles',
      'bill_engagement',
      'compliance_checks'
    ];

    let existingTables = 0;
    for (const table of essentialTables) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${table}
        );
      `);

      const exists = result[0]?.exists;
      if (exists) {
        console.log(`  ✅ Table '${table}' exists`);
        existingTables++;
      } else {
        console.log(`  ❌ Table '${table}' missing`);
      }
    }

    // Check for proper constraints
    const constraintCheck = await db.execute(sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
      ORDER BY tc.table_name, tc.constraint_type;
    `);

    console.log(`  📊 Found ${constraintCheck.length} constraints`);
    console.log(`  📊 ${existingTables}/${essentialTables.length} essential tables exist`);

    if (existingTables === essentialTables.length) {
      console.log('  🎉 Schema verification passed!');
    } else {
      console.log('  ⚠️  Some tables are missing - check migration');
    }

  } catch (error) {
    console.error('Schema verification failed:', error);
    throw error;
  }
}

// Run the reset if called directly
if (process.argv[1] && process.argv[1].includes('reset-database-fixed')) {
  console.log('🚀 Starting database reset process...');
  resetDatabase()
    .then(() => {
      console.log('✅ Database reset completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database reset failed:', error);
      process.exit(1);
    });
}

export { resetDatabase };
