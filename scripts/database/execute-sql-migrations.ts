#!/usr/bin/env tsx
/**
 * Direct SQL Migration Executor
 * 
 * Executes SQL migration files directly against the database
 * Perfect for custom SQL migrations that aren't Drizzle-generated
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface MigrationRecord {
  timestamp: string;
  filename: string;
  status: 'success' | 'failed';
  error?: string;
}

async function executeSQLMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('📊 Direct SQL Migration Executor');
  console.log('═══════════════════════════════════════════');

  try {
    // Connect to database
    console.log('\n🔗 Connecting to database...');
    const client = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    console.log('✅ Connected to database');

    // Get all SQL migration files
    const drizzleDir = path.join(process.cwd(), 'drizzle');
    const migrationFiles = fs.readdirSync(drizzleDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort by name to ensure order

    console.log(`\n📁 Found ${migrationFiles.length} SQL migration files`);

    // Create migrations table if it doesn't exist
    console.log('\n📋 Creating migrations tracking table...');
    await client`
      CREATE TABLE IF NOT EXISTS __migrations_applied (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Migrations table ready');

    // Get list of already applied migrations
    const applied = await client`SELECT filename FROM __migrations_applied`;
    const appliedSet = new Set(applied.map(r => r.filename));

    console.log(`   Already applied: ${appliedSet.size} migrations`);

    // Execute each migration file
    console.log('\n🚀 Executing migrations...');
    let successCount = 0;
    let skipCount = 0;
    let failureCount = 0;
    const failures: MigrationRecord[] = [];

    for (const filename of migrationFiles) {
      const filepath = path.join(drizzleDir, filename);
      
      // Skip if already applied
      if (appliedSet.has(filename)) {
        console.log(`   ⏭️  SKIP: ${filename} (already applied)`);
        skipCount++;
        continue;
      }

      try {
        console.log(`   ⏳ Executing: ${filename}...`);
        
        // Read SQL file
        const sql = fs.readFileSync(filepath, 'utf-8');
        
        // Split by semicolon and filter empty statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        // Execute each statement
        for (const statement of statements) {
          try {
            await client.unsafe(statement + ';');
          } catch (err) {
            // Some errors are okay (like "IF NOT EXISTS")
            const errMsg = (err as any).message || '';
            if (!errMsg.includes('already exists') && 
                !errMsg.includes('NOTICE') &&
                !errMsg.includes('already') &&
                !errMsg.includes('does not exist')) {
              throw err;
            }
          }
        }

        // Record as applied
        await client`
          INSERT INTO __migrations_applied (filename) 
          VALUES (${filename})
          ON CONFLICT (filename) DO NOTHING
        `;

        console.log(`   ✅ SUCCESS: ${filename}`);
        successCount++;

      } catch (error) {
        console.log(`   ❌ FAILED: ${filename}`);
        const errMsg = (error as Error).message;
        console.log(`      Error: ${errMsg.split('\n')[0]}`);
        failureCount++;
        failures.push({
          timestamp: new Date().toISOString(),
          filename,
          status: 'failed',
          error: errMsg
        });
      }
    }

    // Verify tables created
    console.log('\n🔍 Verifying tables...');
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log(`✅ Found ${tables.length} tables in public schema`);
    if (tables.length > 0 && tables.length <= 20) {
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    } else if (tables.length > 20) {
      tables.slice(0, 10).forEach(t => console.log(`   - ${t.table_name}`));
      console.log(`   ... and ${tables.length - 10} more`);
    }

    // Summary
    console.log('\n════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('════════════════════════════════════════');
    console.log(`✅ Successful:  ${successCount}`);
    console.log(`⏭️  Skipped:     ${skipCount}`);
    console.log(`❌ Failed:      ${failureCount}`);
    console.log(`📊 Tables:      ${tables.length}`);

    if (failures.length > 0) {
      console.log('\n⚠️  FAILED MIGRATIONS:');
      failures.forEach(f => {
        console.log(`   - ${f.filename}`);
        console.log(`     ${f.error?.split('\n')[0]}`);
      });
    }

    if (failureCount === 0) {
      console.log('\n🎉 All migrations completed successfully!');
    } else {
      console.log(`\n⚠️  ${failureCount} migrations failed - check errors above`);
    }

    await client.end();
    process.exit(failureCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

executeSQLMigrations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
