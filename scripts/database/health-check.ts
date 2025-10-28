#!/usr/bin/env tsx
/**
 * Database Health Check Script
 * Verifies database schema integrity and service compatibility
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

interface HealthCheckResult {
  category: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

async function runHealthCheck(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];
  
  try {
    // 1. Basic connectivity
    await db.execute(sql`SELECT 1`);
    results.push({
      category: 'Connectivity',
      status: 'pass',
      message: 'Database connection successful'
    });
    
    // 2. Check essential tables exist
    const essentialTables = [
      'users', 'user_profiles', 'sessions', 'bills', 'sponsors', 
      'comments', 'bill_engagement', 'compliance_checks', 
      'notifications', 'alert_preferences'
    ];
    
    for (const table of essentialTables) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          );
        `);
        
        if (result[0]?.exists) {
          results.push({
            category: 'Schema',
            status: 'pass',
            message: `Table '${table}' exists`
          });
        } else {
          results.push({
            category: 'Schema',
            status: 'fail',
            message: `Table '${table}' missing`
          });
        }
      } catch (error) {
        results.push({
          category: 'Schema',
          status: 'fail',
          message: `Error checking table '${table}': ${error}`
        });
      }
    }
    
    // 3. Check constraints
    const constraintCheck = await db.execute(sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        COUNT(*) OVER() as total_constraints
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
      ORDER BY tc.table_name, tc.constraint_type;
    `);

    const constraintCount = (constraintCheck[0] as any)?.total_constraints || 0;
    results.push({
      category: 'Constraints',
      status: constraintCount > 20 ? 'pass' : 'warn',
      message: `Found ${constraintCount} constraints`,
      details: constraintCheck.slice(0, 10) // Show first 10
    });
    
    // 4. Check indexes
    // cspell:disable-next-line
    const indexCheck = await db.execute(sql`
      SELECT
        schemaname,
        tablename,
        indexname,
        COUNT(*) OVER() as total_indexes
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    const indexCount = (indexCheck[0] as any)?.total_indexes || 0;
    results.push({
      category: 'Indexes',
      status: indexCount > 15 ? 'pass' : 'warn',
      message: `Found ${indexCount} indexes`
    });
    
    // 5. Check for duplicate migration entries
    try {
      const migrationCheck = await db.execute(sql`
        SELECT tag, COUNT(*) as count
        FROM "__drizzle_migrations"
        GROUP BY tag
        HAVING COUNT(*) > 1;
      `);
      
      if (migrationCheck.length === 0) {
        results.push({
          category: 'Migrations',
          status: 'pass',
          message: 'No duplicate migration entries found'
        });
      } else {
        results.push({
          category: 'Migrations',
          status: 'warn',
          message: `Found ${migrationCheck.length} duplicate migration entries`,
          details: migrationCheck
        });
      }
    } catch (error) {
      results.push({
        category: 'Migrations',
        status: 'warn',
        message: 'Migration table not found or inaccessible'
      });
    }
    
    // 6. Test critical operations
    try {
      // Test user creation (rollback)
      await db.execute(sql`BEGIN`);
      const testUserId = crypto.randomUUID();
      await db.execute(sql`
        INSERT INTO users (id, email, password_hash) 
        VALUES (${testUserId}, 'test@example.com', 'test_hash')
      `);
      await db.execute(sql`ROLLBACK`);
      
      results.push({
        category: 'Operations',
        status: 'pass',
        message: 'User creation test successful'
      });
    } catch (error) {
      results.push({
        category: 'Operations',
        status: 'fail',
        message: `User creation test failed: ${error}`
      });
    }
    
    // 7. Check compliance_checks unique constraint
    try {
      const uniqueConstraintCheck = await db.execute(sql`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'compliance_checks'
        AND constraint_type = 'UNIQUE'
        AND table_schema = 'public';
      `);
      
      if (uniqueConstraintCheck.length > 0) {
        results.push({
          category: 'Compliance',
          status: 'pass',
          message: 'Compliance checks unique constraint exists'
        });
      } else {
        results.push({
          category: 'Compliance',
          status: 'fail',
          message: 'Compliance checks unique constraint missing'
        });
      }
    } catch (error) {
      results.push({
        category: 'Compliance',
        status: 'fail',
        message: `Compliance constraint check failed: ${error}`
      });
    }
    
  } catch (error) {
    results.push({
      category: 'General',
      status: 'fail',
      message: `Health check failed: ${error}`
    });
  }
  
  return results;
}

async function displayResults(results: HealthCheckResult[]) {
  console.log('\n🏥 Database Health Check Results\n');
  console.log('='.repeat(50));
  
  const categories = [...new Set(results.map(r => r.category))];
  
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passCount = categoryResults.filter(r => r.status === 'pass').length;
    const failCount = categoryResults.filter(r => r.status === 'fail').length;
    const warnCount = categoryResults.filter(r => r.status === 'warn').length;
    
    console.log(`\n📋 ${category}:`);
    console.log(`   ✅ Pass: ${passCount} | ❌ Fail: ${failCount} | ⚠️  Warn: ${warnCount}`);
    
    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`   ${icon} ${result.message}`);
      
      if (result.details && result.status !== 'pass') {
        console.log(`      Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }
  
  // Summary
  const totalPass = results.filter(r => r.status === 'pass').length;
  const totalFail = results.filter(r => r.status === 'fail').length;
  const totalWarn = results.filter(r => r.status === 'warn').length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Summary: ${totalPass} passed, ${totalFail} failed, ${totalWarn} warnings`);
  
  if (totalFail === 0) {
    console.log('🎉 Database health check passed!');
    return true;
  } else {
    console.log('💥 Database health check failed - issues need to be resolved');
    return false;
  }
}

// Run health check if called directly
if (process.argv[1] && process.argv[1].includes('health-check')) {
  runHealthCheck()
    .then(displayResults)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Health check error:', error);
      process.exit(1);
    })
    .finally(() => {
      client.end();
    });
}

export { runHealthCheck, displayResults };
