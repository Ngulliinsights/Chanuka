#!/usr/bin/env tsx
/**
 * Test database connection
 */

import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

async function testConnection() {
  const connectionString = 'postgresql://neondb_owner:npg_N2W7AykvnlEu@ep-silent-sunset-a21i1qik-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';
  
  console.log('Testing connection with:', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const result = await pool.query('SELECT current_user, current_database(), version()');
    console.log('✓ Connection successful!');
    console.log('User:', result.rows[0].current_user);
    console.log('Database:', result.rows[0].current_database);
    console.log('Version:', result.rows[0].version.split('\n')[0]);
    
    // Test table query
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename 
      LIMIT 10
    `);
    console.log('\nFirst 10 tables:');
    tables.rows.forEach(row => console.log('  -', row.tablename));
    
  } catch (error) {
    console.error('✗ Connection failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
