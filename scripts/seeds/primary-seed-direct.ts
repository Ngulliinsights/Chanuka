#!/usr/bin/env tsx
/**
 * Chanuka Platform — Primary Seed Script (Direct Connection)
 * 
 * Uses direct pg Pool connection to avoid module initialization issues
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Create pool directly
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_N2W7AykvnlEu@ep-silent-sunset-a21i1qik-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 20
});

// Create drizzle instance
const db = drizzle(pool);

// Import schemas
import { users, user_profiles, sponsors, bills } from '@server/infrastructure/schema/foundation';
import { comments, bill_engagement, notifications } from '@server/infrastructure/schema/citizen_participation';
import {
  constitutional_provisions,
  constitutional_analyses,
  legal_precedents,
  expert_review_queue,
} from '@server/infrastructure/schema/constitutional_intelligence';

console.log('✓ Database connection established');
console.log('✓ Starting primary seed...');

// Now run the seed (you can copy the seed logic from primary-seed-aligned.ts)
async function main() {
  try {
    console.log('🌱 Primary seed with direct connection');
    console.log('📊 Testing query...');
    
    const result = await db.select().from(users).limit(1);
    console.log(`✓ Found ${result.length} existing users`);
    
    console.log('\n✅ Connection test successful!');
    console.log('You can now copy the seed logic from primary-seed-aligned.ts');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
