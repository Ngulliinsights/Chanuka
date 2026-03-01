/**
 * Community MVP Migration Script
 * Runs database migrations for the Community feature
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';

const MIGRATIONS = [
  {
    name: 'Create comments table',
    file: 'server/infrastructure/database/migrations/20260301_create_comments_table.sql',
  },
  {
    name: 'Create argument_analysis table',
    file: 'server/infrastructure/database/migrations/20260301_create_argument_analysis_table.sql',
  },
  {
    name: 'Seed mock community data',
    file: 'server/infrastructure/database/migrations/20260301_seed_mock_community_data.sql',
  },
];

async function runMigrations() {
  logger.info('🚀 Starting Community MVP migrations...');

  try {
    // Check database connection
    await pool.query('SELECT 1');
    logger.info('✅ Database connection verified');

    // Run each migration
    for (const migration of MIGRATIONS) {
      logger.info(`📝 Running: ${migration.name}`);
      
      try {
        const sqlPath = join(process.cwd(), migration.file);
        const sql = readFileSync(sqlPath, 'utf-8');
        
        await pool.query(sql);
        
        logger.info(`✅ Completed: ${migration.name}`);
      } catch (error) {
        logger.error(`❌ Failed: ${migration.name}`, error as Error);
        
        // Continue with other migrations even if one fails
        // (e.g., table might already exist)
        if (error instanceof Error && error.message.includes('already exists')) {
          logger.warn(`⚠️  Skipping: ${migration.name} (already exists)`);
        } else {
          throw error;
        }
      }
    }

    // Verify tables were created
    logger.info('🔍 Verifying tables...');
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('comments', 'argument_analysis')
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(r => r.table_name);
    logger.info(`✅ Tables found: ${tables.join(', ')}`);

    // Check for seed data
    const commentsCount = await pool.query('SELECT COUNT(*) FROM comments');
    const analysisCount = await pool.query('SELECT COUNT(*) FROM argument_analysis');
    
    logger.info(`📊 Data counts:`);
    logger.info(`   - Comments: ${commentsCount.rows[0].count}`);
    logger.info(`   - Analyses: ${analysisCount.rows[0].count}`);

    logger.info('🎉 All migrations completed successfully!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Start your server: npm run dev');
    logger.info('2. Test endpoints: curl http://localhost:3000/api/community/bills/BILL_ID/comments');
    logger.info('3. See INTEGRATION_GUIDE.md for more testing instructions');

  } catch (error) {
    logger.error('❌ Migration failed:', error as Error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
