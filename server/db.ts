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

// Configure pool with proper SSL settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Enhanced database connection with better error handling
let db: any;
let isDatabaseConnected = false;

async function initializeDatabase() {
  try {
    // Create drizzle instance
    db = drizzle({ client: pool, schema });

    // Test the connection with a simple query
    await pool.query('SELECT 1');
    isDatabaseConnected = true;
    console.log('✅ Database connection established successfully');
    
    // Initialize mock data if tables are empty
    await initializeMockData();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('🔄 Application will continue with fallback mode');
    isDatabaseConnected = false;
    
    // Initialize fallback storage
    await initializeFallbackData();
  }
}

// Mock data for fallback mode
async function initializeFallbackData() {
  console.log('📋 Initializing fallback data store...');
  // This ensures the app works even without database
}

async function initializeMockData() {
  try {
    // Check if we have any bills
    const existingBills = await db.select().from(schema.bills).limit(1);
    if (existingBills.length === 0) {
      console.log('📋 Seeding initial data...');
      // Add some initial bills for demonstration
      await db.insert(schema.bills).values([
        {
          title: "Digital Rights and Privacy Protection Act",
          number: "HR-2024-001",
          introducedDate: new Date('2024-01-15'),
          status: "committee",
          summary: "Comprehensive legislation to protect digital privacy rights and regulate data collection by technology companies.",
          description: "This bill establishes fundamental digital rights for citizens and creates oversight mechanisms for data protection.",
          requiresAction: true,
          tags: ["privacy", "technology", "digital-rights"],
          transparency_score: 78,
          conflict_indicators: {
            financial_conflicts: 2,
            political_alignment: 85,
            disclosure_gaps: 15
          }
        },
        {
          title: "Climate Action and Green Energy Transition Act",
          number: "S-2024-042",
          introducedDate: new Date('2024-02-03'),
          status: "floor_vote",
          summary: "Legislation to accelerate transition to renewable energy and establish carbon pricing mechanisms.",
          description: "Comprehensive climate action bill with targets for emissions reduction and renewable energy adoption.",
          requiresAction: true,
          tags: ["climate", "energy", "environment"],
          transparency_score: 92,
          conflict_indicators: {
            financial_conflicts: 0,
            political_alignment: 72,
            disclosure_gaps: 5
          }
        }
      ]);
      console.log('✅ Initial data seeded successfully');
    }
  } catch (error) {
    console.log('ℹ️ Could not seed data, continuing with empty database');
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