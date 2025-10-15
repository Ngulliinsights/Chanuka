import * as dotenv from 'dotenv';
import pkg from 'pg';
import { logger } from '../utils/logger';
const { Pool } = pkg;

dotenv.config();

async function checkMigrationTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    logger.info('Checking drizzle_migrations table structure...', { component: 'Chanuka' });
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'drizzle_migrations'
      );
    `);
    
    logger.info('Table exists:', { component: 'Chanuka' }, tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get column information
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'drizzle_migrations'
        ORDER BY ordinal_position;
      `);
      
      logger.info('Current columns:', { component: 'Chanuka' });
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Get current data
      const data = await pool.query('SELECT * FROM drizzle_migrations ORDER BY id');
      console.log(`\nCurrent records: ${data.rows.length}`);
      data.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Hash: ${row.hash || 'N/A'}, Created: ${row.created_at || 'N/A'}`);
      });
    }
    
  } catch (error) {
    logger.error('Error:', { component: 'Chanuka' }, error.message);
  } finally {
    await pool.end();
  }
}

checkMigrationTable();






