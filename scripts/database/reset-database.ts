#!/usr/bin/env tsx
/**
 * Database Reset Script
 * Safely resets the database schema and applies clean migrations
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

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function resetDatabase() {
  console.log('🔄 Starting database reset...');
  
  try {
    // Step 1: Drop all existing tables
    console.log('📋 Dropping existing tables...');
    
    const dropTablesQuery = `
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables in the public schema
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Drop all sequences
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        END LOOP;
        
        -- Drop all functions
        FOR r IN (SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
          EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || ' CASCADE';
        END LOOP;
      END $$;
    `;
    
    await db.execute(sql.raw(dropTablesQuery));
    console.log('✅ All existing tables dropped');
    
    // Step 2: Drop migration tracking table
    console.log('🗑️ Dropping migration tracking...');
    await db.execute(sql`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE`);
    console.log('✅ Migration tracking cleared');
    
    // Step 3: Clean up migration files (keep only the latest comprehensive one)
    console.log('🧹 Cleaning up migration files...');
    await cleanupMigrationFiles();
    
    // Step 4: Run fresh migrations
    console.log('🚀 Running fresh migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Fresh migrations applied');
    
    // Step 5: Verify schema
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
  const files = fs.readdirSync(drizzleDir);
  
  // Keep only the latest comprehensive migration and meta files
  const filesToKeep = [
    '0020_comprehensive_schema_normalization.sql',
    'README.md',
    'meta'
  ];
  
  for (const file of files) {
    if (!filesToKeep.includes(file) && file.endsWith('.sql')) {
      const filePath = path.join(drizzleDir, file);
      console.log(`  Removing conflicting migration: ${file}`);
      fs.unlinkSync(filePath);
    }
  }
  
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
          tag: "0020_comprehensive_schema_normalization",
          breakpoints: true
        }
      ]
    };
    fs.writeFileSync(journalPath, JSON.stringify(cleanJournal, null, 2));
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
      } else {
        console.log(`  ⚠️  Table '${table}' missing`);
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
    
  } catch (error) {
    console.error('Schema verification failed:', error);
    throw error;
  }
}

// Run the reset if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase()
    .then(() => {
      console.log('Database reset completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database reset failed:', error);
      process.exit(1);
    });
}

export { resetDatabase };