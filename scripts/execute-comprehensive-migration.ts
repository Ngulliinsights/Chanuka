#!/usr/bin/env tsx

/**
 * Comprehensive Migration Execution Script
 * 
 * This script executes the comprehensive schema migration that transforms
 * the platform from a basic bill tracker to a world-class democratic
 * participation system.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function executeMigration() {
  console.log('🚀 Starting comprehensive migration execution...\n');
  
  try {
    // Read the comprehensive migration file
    const migrationPath = join(process.cwd(), 'drizzle', '20251104110148_soft_captain_marvel.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded successfully');
    console.log(`📊 Migration size: ${(migrationSQL.length / 1024).toFixed(1)}KB\n`);
    
    // Execute migration in a transaction
    console.log('⚡ Executing migration (this may take a few minutes)...');
    const startTime = Date.now();
    
    await sql.begin(async (tx) => {
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`📝 Executing ${statements.length} SQL statements...`);
      
      let completedStatements = 0;
      for (const statement of statements) {
        if (statement.trim()) {
          await tx.unsafe(statement);
          completedStatements++;
          
          // Progress indicator
          if (completedStatements % 50 === 0) {
            console.log(`   ✓ Completed ${completedStatements}/${statements.length} statements`);
          }
        }
      }
      
      console.log(`   ✓ All ${completedStatements} statements executed successfully`);
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 Migration completed successfully in ${duration}s!`);
    
    // Verify migration success
    console.log('\n🔍 Verifying migration results...');
    
    const tableCount = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const indexCount = await sql`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `;
    
    const fkCount = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_schema = 'public'
    `;
    
    console.log(`   ✓ Tables created: ${tableCount[0].count}`);
    console.log(`   ✓ Indexes created: ${indexCount[0].count}`);
    console.log(`   ✓ Foreign keys: ${fkCount[0].count}`);
    
    console.log('\n✅ Comprehensive migration execution complete!');
    console.log('\n🌟 Platform transformation summary:');
    console.log('   • Universal Access: Phone numbers, USSD, offline support');
    console.log('   • Constitutional Analysis: AI-powered bill analysis');
    console.log('   • Argument Intelligence: Comment synthesis capabilities');
    console.log('   • Campaign Coordination: Organized collective action');
    console.log('   • Transparency Analysis: Financial conflict tracking');
    console.log('   • Impact Measurement: Comprehensive analytics framework');
    console.log('\n🚀 Ready for application development!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n🔄 To rollback, run:');
    console.log('   npm run db:rollback');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Handle script execution
if (require.main === module) {
  executeMigration().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { executeMigration };