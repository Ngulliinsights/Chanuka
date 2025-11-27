import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from '@shared/shared/database/pool.js';

async function checkTables() {
  try {
    console.log('Checking tables in public schema...');
    const result = await pool.query("SELECT table_name FROM pg_tables WHERE schema_name = 'public'");
    console.log('Tables in public schema:', result.rows);
    if (result.rows.length === 0) {
      console.log('✅ All tables have been dropped successfully.');
    } else {
      console.log('⚠️ Some tables still exist:', result.rows.map(r => r.table_name));
    }
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await pool.end();
  }
}

checkTables();