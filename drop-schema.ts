import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from './shared/database/pool.js';

async function dropAndRecreateSchema() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('Testing connection...');
    await pool.query('SELECT 1');
    console.log('Connection successful.');

    console.log('Dropping and recreating public schema...');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.log('Schema dropped and recreated successfully.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropAndRecreateSchema();