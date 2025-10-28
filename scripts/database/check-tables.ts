import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTables() {
  const client = postgres(process.env.DATABASE_URL!, { 
    ssl: { rejectUnauthorized: false },
    max: 1 
  });
  
  try {
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('Existing tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    // Check for specific missing tables
    const requiredTables = ['user', 'session', 'security_audit_log', 'bill', 'notification'];
    const existingTableNames = tables.map(t => t.table_name);
    
    console.log('\nMissing required tables:');
    requiredTables.forEach(table => {
      if (!existingTableNames.includes(table)) {
        console.log(`  ❌ ${table}`);
      } else {
        console.log(`  ✅ ${table}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await client.end();
  }
}

checkTables();
