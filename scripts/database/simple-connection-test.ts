#!/usr/bin/env tsx

/**
 * Simple Database Connection Test
 * 
 * Tests the basic connection to Neon PostgreSQL without complex dependencies
 */

import { config } from 'dotenv';
import pg from 'pg';

// Load environment variables
config();

const { Pool } = pg;

async function testConnection() {
  console.log('🔍 Testing Neon PostgreSQL connection...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.error('Please check your .env file.');
    process.exit(1);
  }

  console.log('📡 Connecting to database...');
  console.log(`   URL: ${process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Neon
    max: 1, // Just one connection for testing
  });

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to Neon PostgreSQL!');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Query executed successfully!');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].postgres_version.split(' ')[0]} ${result.rows[0].postgres_version.split(' ')[1]}`);

    // Test database info
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database_name,
        current_user as username,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `);
    
    console.log('\n📋 Database Information:');
    console.log(`   Database: ${dbInfo.rows[0].database_name}`);
    console.log(`   User: ${dbInfo.rows[0].username}`);
    console.log(`   Server: ${dbInfo.rows[0].server_ip || 'N/A'}:${dbInfo.rows[0].server_port || 'N/A'}`);

    // Test schema
    const schemaInfo = await client.query(`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`   Tables: ${schemaInfo.rows[0].table_count} in public schema`);

    client.release();

    console.log('\n🎉 Database connection test successful!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run db:migrate (to create tables)');
    console.log('   2. Run: npm run db:seed (to add sample data)');
    console.log('   3. Run: npm run dev (to start the application)');

  } catch (error) {
    console.error('\n❌ Database connection failed!');
    
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      
      // Provide specific troubleshooting based on error type
      if (error.message.includes('ENOTFOUND')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Check your internet connection');
        console.error('   - Verify the Neon database hostname in DATABASE_URL');
        console.error('   - Ensure your Neon database is active (not suspended)');
      } else if (error.message.includes('authentication failed')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Verify your database username and password');
        console.error('   - Check if your Neon database credentials are correct');
        console.error('   - Ensure your DATABASE_URL format is correct');
      } else if (error.message.includes('SSL') || error.message.includes('ssl')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Neon requires SSL connections');
        console.error('   - Ensure your DATABASE_URL includes sslmode=require');
        console.error('   - Check SSL configuration in your connection');
      } else if (error.message.includes('timeout')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Check your internet connection stability');
        console.error('   - Verify Neon database is not suspended');
        console.error('   - Try again in a few moments');
      }
    }
    
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Connection closed.');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down...');
  process.exit(0);
});

// Run the test
testConnection().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});





















