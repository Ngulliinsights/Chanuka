#!/usr/bin/env ts-node

/**
 * Database Migration Runner - SimpleTool
 * 
 * Runs all pending migrations to set up the database schema.
 * Usage: npx ts-node scripts/database/run-migrations.ts
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const ROOT_DIR = path.join(__dirname, '../../');
const DRIZZLE_DIR = path.join(ROOT_DIR, 'drizzle');
const ENV_FILE = path.join(ROOT_DIR, '.env.local');

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Load database configuration from environment
 */
function loadDatabaseConfig(): DatabaseConfig {
  // Load .env.local
  if (fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    const envVars = envContent.split('\n').reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as Record<string, string>);
    
    // Parse connection string if available
    const dbUrl = envVars.DATABASE_URL || process.env.DATABASE_URL;
    if (dbUrl) {
      const url = new URL(dbUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.replace('/', ''),
        user: url.username,
        password: url.password,
      };
    }
  }

  // Fallback to environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'simpletool',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

/**
 * Run migrations using psql
 */
async function runMigrations(): Promise<void> {
  const config = loadDatabaseConfig();
  
  console.log('🔄 Starting database migration...');
  console.log(`📦 Database: ${config.database} at ${config.host}:${config.port}`);

  return new Promise((resolve, reject) => {
    // Build connection string for psql
    const connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;

    // List all SQL files in drizzle directory
    const migrationFiles = fs.readdirSync(DRIZZLE_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.warn('⚠️  No migration files found in drizzle directory');
      resolve();
      return;
    }

    console.log(`📄 Found ${migrationFiles.length} migration file(s):`);
    migrationFiles.forEach(file => console.log(`  - ${file}`));

    // Run each migration file
    let completed = 0;
    let failed = false;

    const runNext = (index: number) => {
      if (index >= migrationFiles.length) {
        if (failed) {
          reject(new Error('Migration failed'));
        } else {
          console.log('✅ All migrations completed successfully!');
          resolve();
        }
        return;
      }

      const migrationFile = migrationFiles[index];
      const migrationPath = path.join(DRIZZLE_DIR, migrationFile);
      
      console.log(`\n▶️  Running: ${migrationFile}`);

      const psql = spawn('psql', [
        connectionString,
        '-f',
        migrationPath,
      ], {
        stdio: ['inherit', 'inherit', 'inherit'],
      });

      psql.on('close', (code) => {
        if (code === 0) {
          completed++;
          console.log(`✓ Migration ${completed}/${migrationFiles.length} complete`);
          runNext(index + 1);
        } else {
          console.error(`❌ Migration failed with code ${code}`);
          failed = true;
          runNext(index + 1);
        }
      });

      psql.on('error', (error) => {
        console.error('Error running psql:', error.message);
        failed = true;
        runNext(index + 1);
      });
    };

    runNext(0);
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
