import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";
import {
  bills,
  users,
  billComments,
  userProfiles,
  billEngagement,
  notifications,
  analysis,
  sponsors,
  sponsorAffiliations,
  billSponsorships,
  sponsorTransparency,
  billSectionConflicts
} from '../shared/schema';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Enhanced database connection with better error handling
let db: any;
let isDatabaseConnected = false;

async function initializeDatabase() {
  try {
    db = drizzle({ client: pool, schema });

    // Test the connection
    await db.select().from(schema.bills).limit(1);
    isDatabaseConnected = true;
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('🔄 Application will continue with fallback mode');
    isDatabaseConnected = false;
  }
}

// Initialize database connection
initializeDatabase().catch(console.error);

export { isDatabaseConnected, db };

export { 
  bills, 
  users, 
  billComments, 
  userProfiles,
  billEngagement,
  notifications,
  analysis,
  sponsors,
  sponsorAffiliations,
  billSponsorships,
  sponsorTransparency,
  billSectionConflicts
};