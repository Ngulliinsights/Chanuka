// Import unified database connections and schema
import { 
  database, 
  readDatabase, 
  writeDatabase, 
  pool, 
  getDatabase,
  withTransaction 
} from '../shared/database/connection.js';

// Import all schema types and tables
import * as schema from "../shared/schema.js";
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
} from '../shared/schema.js';

// Use the unified database connection
const db = database;
let isDatabaseConnected = false;

async function initializeDatabase() {
  try {
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
      // Add some initial bills for demonstration (matching actual schema)
      await db.insert(schema.bills).values([
        {
          title: "Digital Rights and Privacy Protection Act",
          billNumber: "HR-2024-001",
          introducedDate: new Date('2024-01-15'),
          status: "committee",
          summary: "Comprehensive legislation to protect digital privacy rights and regulate data collection by technology companies.",
          description: "This bill establishes fundamental digital rights for citizens and creates oversight mechanisms for data protection.",
          content: "Full text of the Digital Rights and Privacy Protection Act...",
          category: "technology",
          tags: ["privacy", "technology", "digital-rights"],
          viewCount: 0,
          shareCount: 0,
          complexityScore: 7,
          constitutionalConcerns: {
            concerns: ["First Amendment implications", "Commerce Clause considerations"],
            severity: "medium"
          },
          stakeholderAnalysis: {
            primary_beneficiaries: ["citizens", "privacy advocates"],
            potential_opponents: ["tech companies", "data brokers"],
            economic_impact: "moderate"
          }
        },
        {
          title: "Climate Action and Green Energy Transition Act",
          billNumber: "S-2024-042",
          introducedDate: new Date('2024-02-03'),
          status: "introduced",
          summary: "Legislation to accelerate transition to renewable energy and establish carbon pricing mechanisms.",
          description: "Comprehensive climate action bill with targets for emissions reduction and renewable energy adoption.",
          content: "Full text of the Climate Action and Green Energy Transition Act...",
          category: "environment",
          tags: ["climate", "energy", "environment"],
          viewCount: 0,
          shareCount: 0,
          complexityScore: 9,
          constitutionalConcerns: {
            concerns: ["Interstate Commerce regulation", "Federal vs State authority"],
            severity: "low"
          },
          stakeholderAnalysis: {
            primary_beneficiaries: ["environmental groups", "renewable energy sector"],
            potential_opponents: ["fossil fuel industry", "traditional utilities"],
            economic_impact: "significant"
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