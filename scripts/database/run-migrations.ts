import * as dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { logger } from '../../shared/core/src/observability/logging';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon serverless
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

async function runMigrations() {
  logger.info('🚀 Starting database migrations...', { component: 'Chanuka' });

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  // Diagnostic logging for SSL authentication debugging
  logger.info('🔍 Migration Script Diagnostics:', { component: 'Chanuka' });
  logger.info('NODE_ENV:', { component: 'Chanuka' }, process.env.NODE_ENV);
  logger.info('DATABASE_URL exists:', { component: 'Chanuka' }, !!process.env.DATABASE_URL);
  logger.info('DATABASE_URL starts with postgres:', { component: 'Chanuka' }, process.env.DATABASE_URL?.startsWith('postgres'));
  logger.info('DATABASE_URL contains sslmode:', { component: 'Chanuka' }, process.env.DATABASE_URL?.includes('sslmode'));
  if (process.env.DATABASE_URL?.includes('sslmode')) {
    const sslmode = process.env.DATABASE_URL.match(/sslmode=([^&\s]+)/)?.[1];
    logger.info('SSL mode in URL:', { component: 'Chanuka' }, sslmode);
  }
  logger.info('Using Neon serverless pool', { component: 'Chanuka' });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Get all SQL migration files
    const migrationsDir = path.join(process.cwd(), 'drizzle');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure proper order

    console.log(`Found ${migrationFiles.length} migration files`);

    // The migrations table will be created by the first migration file
    // So we don't need to create it here

    for (const filename of migrationFiles) {
      // Generate a simple hash for the filename
      const hash = createHash('sha1').update(filename).digest('hex');

      // Check if migration already executed (try both hash and filename approaches)
      let result;
      try {
        result = await pool.query(
          'SELECT 1 FROM drizzle_migrations WHERE hash = $1',
          [hash]
        );
      } catch (error) {
        // If hash column doesn't exist, the table might not be created yet
        // This is expected for the first migration
        result = { rows: [] };
      }

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        continue;
      }

      console.log(`📄 Executing ${filename}...`);

      // Read and execute the migration
      const migrationPath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await pool.query('BEGIN');
        await pool.query(sql);
        
        // Record the migration (try to use hash column if it exists)
        try {
          await pool.query(
            'INSERT INTO drizzle_migrations (hash) VALUES ($1)',
            [hash]
          );
        } catch (insertError) {
          // If hash column doesn't exist, this might be the first migration
          // Just continue - the table structure will be set up by the migration itself
          console.log(`Note: Could not record migration in tracking table: ${insertError.message}`);
        }
        
        await pool.query('COMMIT');
        console.log(`✅ Successfully executed ${filename}`);
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`❌ Failed to execute ${filename}:`, error.message);
        throw error;
      }
    }

    logger.info('🎉 All migrations completed successfully!', { component: 'Chanuka' });
  } catch (error) {
    logger.error('💥 Migration failed:', { component: 'Chanuka' }, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    logger.info('Migration process completed', { component: 'Chanuka' });
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration process failed:', { component: 'Chanuka' }, error);
    process.exit(1);
  });






