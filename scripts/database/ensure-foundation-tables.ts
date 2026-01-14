#!/usr/bin/env tsx
/**
 * Check Migration Status and Re-run Foundation Migration
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAndFix() {
  const connectionString = process.env.DATABASE_URL;

  try {
    const client = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    console.log('📋 Checking migration status...\n');

    // Check what's in migrations table
    const applied = await client`SELECT filename FROM __migrations_applied ORDER BY applied_at`;
    console.log(`Applied migrations (${applied.length}):`);
    applied.forEach(m => console.log(`  - ${m.filename}`));

    // Check if foundation tables exist
    const foundationTables = ['users', 'bills', 'comments', 'sponsors'];
    const existingTables = await client`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    
    const tableNames = existingTables.map(t => t.table_name);
    console.log(`\n📊 Foundation tables status:`);
    let foundationExists = false;
    foundationTables.forEach(tbl => {
      const exists = tableNames.includes(tbl);
      console.log(`  ${exists ? '✅' : '❌'} ${tbl}`);
      if (exists) foundationExists = true;
    });

    if (!foundationExists) {
      console.log('\n⚠️  Foundation tables missing! Applying foundation migration...\n');
      
      // Read and execute foundation migration
      const foundationSQL = fs.readFileSync(
        path.join(process.cwd(), 'drizzle', '0001_create_foundation_tables_optimized.sql'),
        'utf-8'
      );

      // Parse and execute
      const statements = foundationSQL.split(';').filter(s => s.trim().length > 0);
      let count = 0;
      for (const stmt of statements) {
        try {
          await client.unsafe(stmt + ';');
          count++;
        } catch (err) {
          const msg = (err as any).message || '';
          if (!msg.includes('already exists') && !msg.includes('NOTICE')) {
            console.error('Error in statement:', (err as Error).message);
          }
        }
      }

      console.log(`✅ Executed ${count} statements from foundation migration`);

      // Verify
      const newTables = await client`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      console.log(`\n✅ Tables now present (${newTables.length}):`);
      newTables.forEach(t => console.log(`   - ${t.table_name}`));
    } else {
      console.log('\n✅ Foundation tables already exist');
    }

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

checkAndFix().catch(err => {
  console.error('Unhandled:', err);
  process.exit(1);
});
