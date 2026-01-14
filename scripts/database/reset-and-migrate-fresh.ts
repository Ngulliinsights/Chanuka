#!/usr/bin/env tsx
/**
 * Fresh Database Setup - Complete Reset and Migration
 * 
 * WARNING: This DELETES all data and recreates schema from scratch
 * Safe to run during development only
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function resetAndMigrate() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('🔄 Starting fresh database setup...');
  console.log('⚠️  WARNING: This will DELETE all existing data');

  try {
    // Step 1: Reset migration journal to force fresh start
    console.log('\n📋 Step 1: Resetting migration journal...');
    const journalPath = path.join(process.cwd(), 'drizzle', 'meta', '_journal.json');
    const freshJournal = {
      version: '6',
      dialect: 'postgresql',
      entries: []
    };
    
    fs.writeFileSync(journalPath, JSON.stringify(freshJournal, null, 2));
    console.log('✅ Migration journal reset');

    // Step 2: Connect to database
    console.log('\n🔗 Step 2: Connecting to database...');
    const client = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    const db = drizzle(client);
    console.log('✅ Connected to database');

    // Step 3: Drop existing schema (CASCADE deletes everything)
    console.log('\n💥 Step 3: Dropping existing schema...');
    try {
      await client`DROP SCHEMA IF EXISTS public CASCADE`;
      await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
      console.log('✅ Existing schema dropped');
    } catch (err) {
      console.log('⚠️  Could not drop schema (may not exist):', (err as any).message);
    }

    // Step 4: Recreate public schema
    console.log('\n🏗️  Step 4: Recreating public schema...');
    await client`CREATE SCHEMA IF NOT EXISTS public`;
    console.log('✅ Public schema created');

    // Step 5: Run migrations
    console.log('\n📦 Step 5: Running migrations from scratch...');
    console.log('   This will apply all migrations in order');
    
    const migrationsFolder = path.join(process.cwd(), 'drizzle');
    console.log(`   Migrations folder: ${migrationsFolder}`);
    
    // List available migrations
    const migrationFiles = fs.readdirSync(migrationsFolder)
      .filter(f => f.endsWith('.sql') && f !== 'journal.json')
      .sort();
    
    console.log(`   Found ${migrationFiles.length} migration files:`);
    migrationFiles.slice(0, 5).forEach(f => console.log(`     - ${f}`));
    if (migrationFiles.length > 5) console.log(`     ... and ${migrationFiles.length - 5} more`);

    await migrate(db, { migrationsFolder });
    console.log('✅ All migrations applied successfully');

    // Step 6: Verify tables
    console.log('\n🔍 Step 6: Verifying tables created...');
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log(`✅ Found ${tables.length} tables:`);
    tables.slice(0, 10).forEach(t => console.log(`   - ${t.table_name}`));
    if (tables.length > 10) console.log(`   ... and ${tables.length - 10} more`);

    // Step 7: Summary
    console.log('\n════════════════════════════════════════');
    console.log('✅ Fresh database setup completed!');
    console.log('════════════════════════════════════════');
    console.log(`   Tables created: ${tables.length}`);
    console.log(`   Migrations applied: ${migrationFiles.length}`);
    console.log('\n📝 You can now:');
    console.log('   - Run: npm run db:seed (if available)');
    console.log('   - Start the server: npm start');
    console.log('   - Run tests: npm test');

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fresh database setup failed:');
    console.error((error as Error).message);
    if ((error as any).code) {
      console.error('Error code:', (error as any).code);
    }
    process.exit(1);
  }
}

resetAndMigrate().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
