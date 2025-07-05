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
export const db = drizzle({ client: pool, schema });

// Test database connection on startup with proper async handling
async function initializeDatabase() {
  try {
    if (!connectionString) {
      console.log('⚠️  No DATABASE_URL provided, using sample data mode');
      return false;
    }
    
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('🔄 Falling back to sample data mode');
    return false;
  }
}

// Initialize database connection with proper promise handling
let isDatabaseConnected = false;
initializeDatabase().then(result => {
  isDatabaseConnected = result;
}).catch(() => {
  isDatabaseConnected = false;
});

export { isDatabaseConnected };

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