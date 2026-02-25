import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

async function checkDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check if tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`✓ Database connected successfully`);
    console.log(`✓ Found ${result.rows.length} tables`);
    
    if (result.rows.length > 0) {
      console.log('\nFirst 10 tables:');
      result.rows.slice(0, 10).forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    // Check enums
    const enumResult = await pool.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      ORDER BY typname;
    `);
    
    console.log(`\n✓ Found ${enumResult.rows.length} enums`);
    
  } catch (error) {
    console.error('✗ Database check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
