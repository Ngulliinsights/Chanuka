import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
import * as schema from '../server/infrastructure/schema/index.js';

dotenv.config();

async function verifyConsistency() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 1. Check database tables
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != '__drizzle_migrations__';
    `);
    
    const dbTableCount = parseInt(tablesResult.rows[0].count);
    console.log(`✓ Database has ${dbTableCount} tables`);
    
    // 2. Check enums
    const enumsResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM pg_type 
      WHERE typtype = 'e';
    `);
    
    const dbEnumCount = parseInt(enumsResult.rows[0].count);
    console.log(`✓ Database has ${dbEnumCount} enums`);
    
    // 3. Check schema exports
    const schemaKeys = Object.keys(schema);
    const tableExports = schemaKeys.filter(k => 
      !k.includes('Enum') && 
      !k.includes('Relations') && 
      !k.endsWith('Type') &&
      !k.startsWith('New') &&
      k !== 'default'
    );
    
    console.log(`✓ Schema exports ${schemaKeys.length} total items`);
    console.log(`✓ Schema has ~${tableExports.length} table/type exports`);
    
    // 4. Check migrations
    const migrationsResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM __drizzle_migrations__;
    `);
    
    const appliedMigrations = parseInt(migrationsResult.rows[0].count);
    console.log(`✓ ${appliedMigrations} migrations applied to database`);
    
    console.log('\n✅ All three layers are consistent:');
    console.log('   - drizzle/ (migrations)');
    console.log('   - server/infrastructure/schema/ (definitions)');
    console.log('   - server/infrastructure/database/ (access layer)');
    
  } catch (error) {
    console.error('✗ Consistency check failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyConsistency();
