#!/usr/bin/env tsx

/**
 * Database Connection Test Script
 * 
 * This script tests the connection to your Neon PostgreSQL database
 * and validates that all configurations are working properly.
 */

import { config } from 'dotenv';
import { database, pool } from '../../shared/database/connection.js';
import { monitorPoolHealth } from '../../shared/database/pool.js';
import { logger } from '@shared/core';

// Load environment variables
config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Basic connection test
    console.log('📡 Testing basic connection...');
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    
    if (result.rows.length > 0) {
      console.log('✅ Database connection successful!');
      console.log(`   Current time: ${result.rows[0].current_time}`);
      console.log(`   PostgreSQL version: ${result.rows[0].postgres_version}`);
    }

    // Test 2: Test Drizzle ORM connection
    console.log('\n🔧 Testing Drizzle ORM connection...');
    const drizzleResult = await database.execute('SELECT 1 as test_value');
    console.log('✅ Drizzle ORM connection successful!');
    console.log(`   Test query result: ${drizzleResult.rows[0]?.test_value}`);

    // Test 3: Check database schema
    console.log('\n📋 Checking database schema...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${tablesResult.rows.length} tables in the database:`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    // Test 4: Pool health monitoring
    console.log('\n🏥 Checking pool health...');
    const healthStatus = await monitorPoolHealth();
    
    Object.entries(healthStatus).forEach(([poolName, status]) => {
      const healthIcon = status.isHealthy ? '✅' : '❌';
      console.log(`   ${healthIcon} ${poolName} pool: ${status.isHealthy ? 'Healthy' : 'Unhealthy'}`);
      console.log(`      Connections: ${status.totalConnections}/${status.totalConnections + status.waitingClients}`);
      console.log(`      Circuit breaker: ${status.circuitBreakerState}`);
      console.log(`      Utilization: ${status.utilizationPercentage.toFixed(1)}%`);
    });

    // Test 5: Test environment variables
    console.log('\n🌍 Checking environment configuration...');
    const envChecks = [
      { name: 'DATABASE_URL', value: process.env.DATABASE_URL, required: true },
      { name: 'NODE_ENV', value: process.env.NODE_ENV, required: false },
      { name: 'JWT_SECRET', value: process.env.JWT_SECRET ? '[SET]' : undefined, required: true },
      { name: 'SESSION_SECRET', value: process.env.SESSION_SECRET ? '[SET]' : undefined, required: true },
    ];

    envChecks.forEach(({ name, value, required }) => {
      if (value) {
        console.log(`   ✅ ${name}: ${name.includes('SECRET') ? '[CONFIGURED]' : value}`);
      } else if (required) {
        console.log(`   ❌ ${name}: Missing (required)`);
      } else {
        console.log(`   ⚠️  ${name}: Not set (optional)`);
      }
    });

    console.log('\n🎉 Database connection test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run migrations: npm run db:migrate');
    console.log('   2. Seed database: npm run db:seed');
    console.log('   3. Start development server: npm run dev');

  } catch (error) {
    console.error('\n❌ Database connection test failed!');
    console.error('Error details:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        console.error('\n💡 Troubleshooting tips:');
        console.error('   - Check your DATABASE_URL in .env file');
        console.error('   - Verify your internet connection');
        console.error('   - Ensure Neon database is running');
      } else if (error.message.includes('authentication')) {
        console.error('\n💡 Troubleshooting tips:');
        console.error('   - Verify your database credentials');
        console.error('   - Check if your Neon database password is correct');
        console.error('   - Ensure your IP is whitelisted in Neon console');
      } else if (error.message.includes('SSL')) {
        console.error('\n💡 Troubleshooting tips:');
        console.error('   - Neon requires SSL connections');
        console.error('   - Check your connection string includes sslmode=require');
      }
    }
    
    process.exit(1);
  } finally {
    // Clean up connections
    try {
      await pool.end();
      console.log('\n🔌 Database connections closed.');
    } catch (cleanupError) {
      console.error('Error closing connections:', cleanupError);
    }
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
  try {
    await pool.end();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
  try {
    await pool.end();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseConnection().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}



























