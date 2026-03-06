#!/usr/bin/env tsx
/**
 * Run MWANGA Stack Database Migration
 * 
 * This script runs the MWANGA Stack schema migration (20260306_mwanga_stack_schema.sql)
 * which creates 13 tables for ML/AI infrastructure.
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../../.env') });

async function runMwangaMigration() {
  console.log('🚀 Starting MWANGA Stack database migration...\n');

  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('📊 Database:', databaseUrl.split('@')[1]?.split('?')[0] || 'unknown');

  // Create database connection
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1, // Single connection for migration
  });

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      '../../server/infrastructure/database/migrations/20260306_mwanga_stack_schema.sql'
    );

    console.log('📄 Reading migration file:', migrationPath);
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Count tables to be created
    const tableMatches = migrationSql.match(/CREATE TABLE IF NOT EXISTS/g);
    const tableCount = tableMatches ? tableMatches.length : 0;

    console.log(`📦 Migration will create ${tableCount} tables:\n`);
    console.log('   1. ml_interactions');
    console.log('   2. conflict_graph_nodes');
    console.log('   3. conflict_graph_edges');
    console.log('   4. vector_embeddings');
    console.log('   5. sentiment_cache');
    console.log('   6. constitutional_analysis_cache');
    console.log('   7. trojan_bill_detections');
    console.log('   8. ml_model_metadata');
    console.log('   9. conflict_detection_cache');
    console.log('   10. engagement_predictions');
    console.log('   11. bill_summarization_cache');
    console.log('   12. content_classification_cache');
    console.log('   13. transparency_assessment_cache\n');

    // Check if tables already exist
    console.log('🔍 Checking for existing tables...');
    const existingTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'ml_interactions',
        'conflict_graph_nodes',
        'conflict_graph_edges',
        'vector_embeddings',
        'sentiment_cache',
        'constitutional_analysis_cache',
        'trojan_bill_detections',
        'ml_model_metadata',
        'conflict_detection_cache',
        'engagement_predictions',
        'bill_summarization_cache',
        'content_classification_cache',
        'transparency_assessment_cache'
      )
      ORDER BY table_name
    `);

    if (existingTablesResult.rows.length > 0) {
      console.log(`⚠️  Found ${existingTablesResult.rows.length} existing tables:`);
      existingTablesResult.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('\n   Migration will skip existing tables (CREATE TABLE IF NOT EXISTS)\n');
    } else {
      console.log('✅ No existing tables found - fresh installation\n');
    }

    // Run migration
    console.log('⚡ Executing migration...');
    const startTime = Date.now();

    await pool.query(migrationSql);

    const duration = Date.now() - startTime;
    console.log(`✅ Migration executed successfully in ${duration}ms\n`);

    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const verifyResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'ml_interactions',
        'conflict_graph_nodes',
        'conflict_graph_edges',
        'vector_embeddings',
        'sentiment_cache',
        'constitutional_analysis_cache',
        'trojan_bill_detections',
        'ml_model_metadata',
        'conflict_detection_cache',
        'engagement_predictions',
        'bill_summarization_cache',
        'content_classification_cache',
        'transparency_assessment_cache'
      )
      ORDER BY table_name
    `);

    console.log(`✅ Verified ${verifyResult.rows.length}/13 tables exist:\n`);
    verifyResult.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    if (verifyResult.rows.length < 13) {
      console.warn(`\n⚠️  Warning: Only ${verifyResult.rows.length}/13 tables were created`);
    }

    // Show table sizes
    console.log('\n📊 Table statistics:');
    const statsResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        'ml_interactions',
        'conflict_graph_nodes',
        'conflict_graph_edges',
        'vector_embeddings',
        'sentiment_cache',
        'constitutional_analysis_cache',
        'trojan_bill_detections',
        'ml_model_metadata',
        'conflict_detection_cache',
        'engagement_predictions',
        'bill_summarization_cache',
        'content_classification_cache',
        'transparency_assessment_cache'
      )
      ORDER BY tablename
    `);

    statsResult.rows.forEach((row: any) => {
      console.log(`   ${row.tablename}: ${row.size}`);
    });

    console.log('\n✅ MWANGA Stack migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Install Ollama: https://ollama.ai/download');
    console.log('   2. Pull Llama 3.2: ollama pull llama3.2');
    console.log('   3. Install ChromaDB: pip install chromadb');
    console.log('   4. Test analyzers: npm run test:ml');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
runMwangaMigration()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
