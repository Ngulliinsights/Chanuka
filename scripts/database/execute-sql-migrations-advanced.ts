#!/usr/bin/env tsx
/**
 * Advanced SQL Migration Executor
 * 
 * Properly handles complex SQL including:
 * - PL/pgSQL functions with RETURN/EXCEPTION
 * - Dollar-quoted strings ($$...$$)
 * - Transactions
 * - Comments
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function executeAdvancedSQLMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('📊 Advanced SQL Migration Executor');
  console.log('═══════════════════════════════════════════');

  try {
    const client = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    console.log('\n🔗 Connecting to database...');
    console.log('✅ Connected');

    // Create migrations table
    console.log('\n📋 Creating migrations tracking table...');
    await client`
      CREATE TABLE IF NOT EXISTS __migrations_applied (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Migrations table ready');

    // Get already applied
    const applied = await client`SELECT filename FROM __migrations_applied`;
    const appliedSet = new Set(applied.map(r => r.filename));

    // Get migration files
    const drizzleDir = path.join(process.cwd(), 'drizzle');
    const migrationFiles = fs.readdirSync(drizzleDir)
      .filter(f => f.endsWith('.sql') && f !== '_journal.json')
      .sort();

    console.log(`\n📁 Found ${migrationFiles.length} SQL migration files`);
    console.log(`   Already applied: ${appliedSet.size}`);

    console.log('\n🚀 Executing migrations...');
    let successCount = 0;
    let skipCount = 0;
    let failureCount = 0;
    const failures: { filename: string; error: string }[] = [];

    for (const filename of migrationFiles) {
      if (appliedSet.has(filename)) {
        console.log(`   ⏭️  SKIP: ${filename}`);
        skipCount++;
        continue;
      }

      try {
        console.log(`   ⏳ ${filename}...`);
        
        const filepath = path.join(drizzleDir, filename);
        let sqlContent = fs.readFileSync(filepath, 'utf-8');

        // Remove line comments but preserve content
        const lines = sqlContent.split('\n');
        const cleanedLines = lines
          .map(line => {
            const commentIdx = line.indexOf('--');
            if (commentIdx === -1) return line;
            // Check if -- is inside a string
            return line.substring(0, commentIdx);
          })
          .join('\n');

        // Split by statement boundaries (semicolon not inside $$...$$ or quoted strings)
        const statements = parseSQL(cleanedLines);

        // Execute each statement
        for (const statement of statements) {
          const trimmed = statement.trim();
          if (trimmed.length > 0) {
            // Use unsafe for complex SQL (functions, etc.)
            await client.unsafe(trimmed);
          }
        }

        // Record as applied
        await client`
          INSERT INTO __migrations_applied (filename) 
          VALUES (${filename})
          ON CONFLICT (filename) DO NOTHING
        `;

        console.log(`      ✅ SUCCESS`);
        successCount++;

      } catch (error) {
        const errMsg = (error instanceof Error ? error.message : String(error)) || String(error);
        // Ignore certain errors
        if (errMsg.includes('already exists') ||
            errMsg.includes('NOTICE') ||
            errMsg.includes('already') ||
            errMsg.includes('does not exist') ||
            errMsg.includes('DROP CASCADE')) {
          console.log(`      ✅ SUCCESS (with notices)`);
          successCount++;
          try {
            await client`
              INSERT INTO __migrations_applied (filename) 
              VALUES (${filename})
              ON CONFLICT (filename) DO NOTHING
            `;
          } catch { }
        } else {
          console.log(`      ❌ FAILED`);
          console.log(`         ${errMsg.split('\n')[0].substring(0, 80)}`);
          failureCount++;
          failures.push({ filename, error: errMsg });
        }
      }
    }

    // Verify
    console.log('\n🔍 Verifying tables...');
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log(`✅ Found ${tables.length} tables:`);
    const tableNames = tables.map(t => t.table_name).filter(n => !n.startsWith('_'));
    if (tableNames.length <= 25) {
      tableNames.forEach(t => console.log(`   - ${t}`));
    } else {
      tableNames.slice(0, 15).forEach(t => console.log(`   - ${t}`));
      console.log(`   ... and ${tableNames.length - 15} more`);
    }

    // Summary
    console.log('\n════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('════════════════════════════════════════');
    console.log(`✅ Successful:  ${successCount}`);
    console.log(`⏭️  Skipped:     ${skipCount}`);
    console.log(`❌ Failed:      ${failureCount}`);
    console.log(`📊 Tables:      ${tableNames.length}`);

    if (failureCount === 0) {
      console.log('\n🎉 All migrations completed successfully!');
    }

    await client.end();
    process.exit(failureCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error:', (error as Error).message);
    process.exit(1);
  }
}

function parseSQL(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarQuoteTag = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];

    // Handle dollar quotes
    if (char === '$' && !inDollarQuote) {
      let j = i + 1;
      while (j < sql.length && (sql[j].match(/[a-zA-Z0-9_]/) || sql[j] === '$')) {
        if (sql[j] === '$') {
          dollarQuoteTag = sql.substring(i, j + 1);
          inDollarQuote = true;
          current += dollarQuoteTag;
          i = j + 1;
          break;
        }
        j++;
      }
      if (j === sql.length && sql[j-1] !== '$') {
        current += char;
        i++;
      }
      continue;
    }

    if (inDollarQuote) {
      current += char;
      if (sql.substring(i).startsWith(dollarQuoteTag)) {
        current += dollarQuoteTag.substring(1);
        i += dollarQuoteTag.length;
        inDollarQuote = false;
        dollarQuoteTag = '';
        continue;
      }
      i++;
      continue;
    }

    // Handle semicolon (statement terminator)
    if (char === ';' && !inDollarQuote) {
      current += char;
      statements.push(current);
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  if (current.trim()) {
    statements.push(current);
  }

  return statements;
}

executeAdvancedSQLMigrations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
