#!/usr/bin/env ts-node

/**
 * Database Schema Verification - SimpleTool
 * 
 * Verifies that all tables, enums, and indexes were created correctly.
 * Usage: npx ts-node scripts/database/verify-schema.ts
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TableInfo {
  name: string;
  column_count: number;
  index_count: number;
}

interface VerificationResult {
  tables: TableInfo[];
  enums: string[];
  indexes: string[];
  totalTableCount: number;
  totalIndexCount: number;
  success: boolean;
}

const ROOT_DIR = path.join(__dirname, '../../');
const ENV_FILE = path.join(ROOT_DIR, '.env.local');

// Expected tables from migration
const EXPECTED_TABLES = [
  'users',
  'bills',
  'communities',
  'comments',
  'bill_tracking',
  'community_membership',
  'sessions',
  'audit_log',
  'notifications',
  'verifications',
];

const EXPECTED_ENUMS = [
  'chamber',
  'party',
  'bill_status',
  'user_role',
  'kenyan_county',
  'anonymity_level',
];

/**
 * Load database configuration
 */
function loadDatabaseConfig(): Record<string, string> {
  if (fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    return envContent.split('\n').reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
      return acc;
    }, {} as Record<string, string>);
  }
  return {};
}

/**
 * Run SQL query and return results
 */
async function runQuery(connectionString: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const psql = spawn('psql', [
      connectionString,
      '-c',
      query,
      '-t', // Tuples only (no headers/footers)
    ]);

    let output = '';
    let errorOutput = '';

    psql.stdout.on('data', (data) => {
      output += data.toString();
    });

    psql.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    psql.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Query failed: ${errorOutput}`));
      }
    });

    psql.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Verify schema
 */
async function verifySchema(): Promise<VerificationResult> {
  const envVars = loadDatabaseConfig();
  const dbUrl = envVars.DATABASE_URL || `postgresql://postgres:postgres@localhost:5432/simpletool`;
  
  console.log('🔍 Verifying database schema...\n');

  try {
    // Check tables
    console.log('📋 Checking tables...');
    const tablesQuery = `
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tablesOutput = await runQuery(dbUrl, tablesQuery);
    const tables = tablesOutput.split('\n').filter(t => t);

    // Check enums
    console.log('📊 Checking enums...');
    const enumsQuery = `
      SELECT t.typname FROM pg_type t 
      WHERE t.typtype = 'e' 
      AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY t.typname;
    `;
    const enumsOutput = await runQuery(dbUrl, enumsQuery);
    const enums = enumsOutput.split('\n').filter(e => e);

    // Check indexes
    console.log('🔑 Checking indexes...');
    const indexesQuery = `
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname NOT LIKE 'pg_toast%'
      ORDER BY indexname;
    `;
    const indexesOutput = await runQuery(dbUrl, indexesQuery);
    const indexes = indexesOutput.split('\n').filter(i => i);

    // Get table details
    const tableDetails: TableInfo[] = [];
    for (const table of tables) {
      if (table) {
        const colCountQuery = `
          SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_name = '${table}';
        `;
        const colCount = parseInt(await runQuery(dbUrl, colCountQuery));

        const idxCountQuery = `
          SELECT COUNT(*) FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND tablename = '${table}';
        `;
        const idxCount = parseInt(await runQuery(dbUrl, idxCountQuery));

        tableDetails.push({
          name: table,
          column_count: colCount,
          index_count: idxCount,
        });
      }
    }

    // Verify results
    const result: VerificationResult = {
      tables: tableDetails,
      enums,
      indexes,
      totalTableCount: tables.length,
      totalIndexCount: indexes.length,
      success: true,
    };

    return result;
  } catch (error) {
    console.error('❌ Error verifying schema:', error instanceof Error ? error.message : error);
    return {
      tables: [],
      enums: [],
      indexes: [],
      totalTableCount: 0,
      totalIndexCount: 0,
      success: false,
    };
  }
}

/**
 * Print verification report
 */
function printReport(result: VerificationResult): void {
  if (!result.success) {
    console.error('\n❌ Schema verification failed!');
    return;
  }

  console.log('\n✅ Schema Verification Report\n');
  console.log('═'.repeat(60));

  // Tables
  console.log('\n📋 TABLES:');
  console.log('─'.repeat(60));
  
  if (result.tables.length > 0) {
    console.log('┌─ Found Tables ─────────────────────────────────────────┐');
    result.tables.forEach((table) => {
      const expected = EXPECTED_TABLES.includes(table.name) ? '✓' : '?';
      console.log(`│ ${expected} ${table.name.padEnd(20)} │ Cols: ${table.column_count.toString().padStart(2)}  Idx: ${table.index_count.toString().padStart(2)} │`);
    });
    console.log('└──────────────────────────────────────────────────────────┘');

    // Check for missing tables
    const missingTables = EXPECTED_TABLES.filter(t => !result.tables.map(x => x.name).includes(t));
    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('\n✓ All expected tables created');
    }
  } else {
    console.log('❌ No tables found!');
  }

  // Enums
  console.log('\n📊 ENUMS:');
  console.log('─'.repeat(60));
  
  if (result.enums.length > 0) {
    console.log('┌─ Found Enums ──────────────────────────────────────────┐');
    result.enums.forEach((enumName) => {
      const expected = EXPECTED_ENUMS.includes(enumName) ? '✓' : '?';
      console.log(`│ ${expected} ${enumName.padEnd(52)} │`);
    });
    console.log('└──────────────────────────────────────────────────────────┘');

    // Check for missing enums
    const missingEnums = EXPECTED_ENUMS.filter(e => !result.enums.includes(e));
    if (missingEnums.length > 0) {
      console.log(`\n⚠️  Missing enums: ${missingEnums.join(', ')}`);
    } else {
      console.log('\n✓ All expected enums created');
    }
  } else {
    console.log('❌ No enums found!');
  }

  // Indexes
  console.log('\n🔑 INDEXES:');
  console.log('─'.repeat(60));
  console.log(`Total indexes created: ${result.totalIndexCount}`);
  console.log('\nSample indexes:');
  result.indexes.slice(0, 10).forEach((idx) => {
    console.log(`  • ${idx}`);
  });
  if (result.indexes.length > 10) {
    console.log(`  ... and ${result.indexes.length - 10} more`);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY:');
  console.log(`  Tables:  ${result.totalTableCount}/${EXPECTED_TABLES.length} expected`);
  console.log(`  Enums:   ${result.enums.length}/${EXPECTED_ENUMS.length} expected`);
  console.log(`  Indexes: ${result.totalIndexCount}`);
  console.log('═'.repeat(60));

  // Overall status
  const allTablesOK = result.tables.length === EXPECTED_TABLES.length;
  const allEnumsOK = result.enums.length === EXPECTED_ENUMS.length;
  
  if (allTablesOK && allEnumsOK && result.totalIndexCount > 0) {
    console.log('\n✅ Schema verification PASSED! Database is ready to use.');
  } else {
    console.log('\n⚠️  Schema verification has issues. Please check above.');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const result = await verifySchema();
    printReport(result);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
