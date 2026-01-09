#!/usr/bin/env tsx
/**
 * Interactive Database Reset Runner
 * Safely resets the database with proper environment variable loading
 */

/**
 * @deprecated Use reset.ts instead
 *
 * This was a wrapper for reset-database.ts. Use reset.ts directly via npm scripts.
 *
 * Migration path:
 *   Old: tsx scripts/database/run-reset.ts
 *   New: npm run db:reset
 *
 * See: scripts/database/DEPRECATION_NOTICE.md
 */

import * as readline from 'readline';
import { config } from 'dotenv';
import { resetDatabase } from './reset-database';
import { runHealthCheck, displayResults } from './health-check';

// Load environment variables
config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function runInteractiveReset() {
  console.log('🔄 Chanuka Platform Database Reset');
  console.log('==================================');
  console.log('');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    console.error('Please ensure DATABASE_URL is set in your .env file');
    console.error('Current working directory:', process.cwd());
    console.error('Looking for .env file at:', `${process.cwd()}/.env`);

    try {
      const fs = await import('fs');
      if (fs.existsSync('.env')) {
        console.log('✅ .env file exists');
        const envContent = fs.readFileSync('.env', 'utf8');
        if (envContent.includes('DATABASE_URL')) {
          console.log('✅ DATABASE_URL found in .env file');
          console.log('❌ But it may not be properly formatted or loaded');
          console.log('💡 Make sure DATABASE_URL is not commented out and has a valid value');
        } else {
          console.log('❌ DATABASE_URL not found in .env file');
        }
      } else {
        console.log('❌ .env file does not exist');
      }
    } catch (error) {
      console.error('Error checking .env file:', error);
    }

    process.exit(1);
  }

  console.log('✅ DATABASE_URL loaded successfully');
  console.log('');

  // Show warning
  console.log('⚠️  WARNING: This will completely reset your database!');
  console.log('All existing data will be lost.');
  console.log('');

  // Ask for confirmation
  const answer = await askQuestion('Are you sure you want to continue? (y/N): ');

  if (!answer.toLowerCase().startsWith('y')) {
    console.log('❌ Database reset cancelled');
    rl.close();
    process.exit(0);
  }

  console.log('');
  console.log('🚀 Starting database reset process...');

  try {
    // Step 1: Run the reset
    console.log('📋 Step 1: Running database reset...');
    await resetDatabase();
    console.log('✅ Database reset completed');

    // Step 2: Run health check
    console.log('');
    console.log('📋 Step 2: Running health check...');
    const healthResults = await runHealthCheck();
    const healthPassed = await displayResults(healthResults);

    if (healthPassed) {
      console.log('✅ Health check passed');
    } else {
      console.log('⚠️  Health check found issues - please review above');
    }

    console.log('');
    console.log('🎉 Database reset process completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start your server: npm run dev');
    console.log('2. The application should now work without database errors');
    console.log('3. You can create a new user account to test functionality');

  } catch (error) {
    console.error('❌ Database reset process failed:', error);
    console.log('');
    console.log('💡 Troubleshooting tips:');
    console.log('1. Check that your DATABASE_URL is correct');
    console.log('2. Ensure you have network access to the database');
    console.log('3. Verify database permissions');
    console.log('4. Try running the individual scripts manually:');
    console.log('   - npx tsx scripts/database/reset-database.ts');
    console.log('   - npx tsx scripts/database/health-check.ts');

    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runInteractiveReset()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { runInteractiveReset };
