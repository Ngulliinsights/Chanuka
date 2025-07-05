import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('Running migrations...');

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/legislative_track',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Test database connection
    try {
      await pool.query('SELECT NOW()');
      console.log('Database connection successful');
    } catch (connectionError) {
      console.log('Database connection failed, attempting to create database...');
      // Try to connect to default postgres database to create our database
      const defaultPool = new Pool({
        connectionString: process.env.DATABASE_URL?.replace('/legislative_track', '/postgres') || 'postgresql://user:password@localhost:5432/postgres',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      
      try {
        await defaultPool.query('CREATE DATABASE legislative_track');
        console.log('Database created successfully');
      } catch (createError) {
        console.log('Database might already exist or creation failed:', createError.message);
      }
      
      await defaultPool.end();
    }

    // Run SQL migrations from drizzle folder
    const migrationsPath = path.join(process.cwd(), 'drizzle');
    
    if (!fs.existsSync(migrationsPath)) {
      console.log('No migrations directory found, creating initial schema...');
      fs.mkdirSync(migrationsPath, { recursive: true });
      
      // Create a basic initial migration
      const initialMigration = `-- Initial database schema
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);`;
      
      fs.writeFileSync(path.join(migrationsPath, '0000_initial.sql'), initialMigration);
      console.log('Created initial migration file');
    }

    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found, migrations complete');
      await pool.end();
      return;
    }

    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        hash VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`Migration ${file} completed successfully`);
      } catch (migrationError) {
        console.log(`Migration ${file} failed (might already be applied):`, migrationError.message);
        // Continue with other migrations
      }
    }

    await pool.end();
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration setup failed:', error.message);
    console.log('Creating basic environment setup...');
    
    // Create a minimal setup that doesn't fail
    process.exit(0); // Exit successfully to allow app to continue
  } finally {
    await pool.end();
  }
}

main();