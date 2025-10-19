import * as dotenv from 'dotenv';
import pkg from 'pg';
import { logger } from '../../shared/core/src/observability/logging';
const { Pool } = pkg;

dotenv.config();

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    logger.info('Checking current database schema...', { component: 'Chanuka' });
    
    // Get all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\nFound ${tables.rows.length} tables:`);
    
    for (const table of tables.rows) {
      console.log(`\n📋 Table: ${table.table_name}`);
      
      // Get columns for each table
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table.table_name]);
      
      columns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'nullable' : 'not null';
        const defaultVal = col.column_default ? ` default: ${col.column_default}` : '';
        console.log(`  - ${col.column_name}: ${col.data_type} (${nullable}${defaultVal})`);
      });
    }
    
  } catch (error) {
    logger.error('Error:', { component: 'Chanuka' }, error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();











































