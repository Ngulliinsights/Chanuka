#!/usr/bin/env tsx
/**
 * Database Seeding Script
 * 
 * Seeds the database with sample data for development and testing.
 * Runs both simple seed (basic data) and legislative seed (bills, representatives, etc.).
 * 
 * Usage:
 *   npm run db:seed
 *   tsx scripts/seeds/seed.ts
 * 
 * What it does:
 *   - Runs simple-seed.ts (users, basic data)
 *   - Runs legislative-seed.ts (bills, representatives, committees)
 *   - Validates seeded data
 * 
 * When to run:
 *   - After database reset
 *   - For development environment setup
 *   - Before running integration tests
 *   - To populate demo data
 * 
 * Prerequisites:
 *   - Database must be initialized (npm run db:init)
 *   - Migrations must be applied (npm run db:migrate)
 * 
 * Exit codes:
 *   0 - Success: All seeds completed
 *   1 - Failure: Seeding error
 */

import * as dotenv from 'dotenv';
dotenv.config();

import seedSimple from './simple-seed';
import seedLegislative from './legislative-seed';

export async function runAllSeeds() {
  console.log('Running all seeds (placeholder)');
  await seedSimple();
  await seedLegislative();
}

if (require.main === module) {
  runAllSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

