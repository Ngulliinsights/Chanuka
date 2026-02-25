import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Please check your .env file.");
}

export default defineConfig({
  out: "./drizzle",
  schema: [
    // ============================================================================
    // CORE INFRASTRUCTURE - Required for all features
    // ============================================================================
    "./server/infrastructure/schema/enum.ts",
    "./server/infrastructure/schema/base-types.ts",
    // "./server/infrastructure/schema/integration.ts", // REMOVED: Duplicates users table from foundation.ts
    // "./server/infrastructure/schema/integration-extended.ts", // REMOVED: Duplicates tables from foundation.ts
    "./server/infrastructure/schema/validation-integration.ts",
    "./server/infrastructure/schema/schema-generators.ts",
    
    // ============================================================================
    // FOUNDATION - Core entities (CRITICAL)
    // ============================================================================
    "./server/infrastructure/schema/foundation.ts",
    
    // ============================================================================
    // CITIZEN PARTICIPATION - User engagement (CRITICAL)
    // ============================================================================
    "./server/infrastructure/schema/citizen_participation.ts",
    "./server/infrastructure/schema/participation_oversight.ts",
    
    // ============================================================================
    // PARLIAMENTARY PROCESS - Legislative workflow (HIGH PRIORITY)
    // ============================================================================
    "./server/infrastructure/schema/parliamentary_process.ts",
    
    // ============================================================================
    // INTELLIGENCE DOMAINS - AI-powered analysis (HIGH PRIORITY)
    // ============================================================================
    "./server/infrastructure/schema/constitutional_intelligence.ts",
    "./server/infrastructure/schema/argument_intelligence.ts",
    "./server/infrastructure/schema/analysis.ts",
    
    // ============================================================================
    // TRANSPARENCY - Financial tracking (HIGH PRIORITY)
    // ============================================================================
    "./server/infrastructure/schema/transparency_intelligence.ts",
    "./server/infrastructure/schema/transparency_analysis.ts",
    
    // ============================================================================
    // PLATFORM OPERATIONS - System management (CRITICAL)
    // ============================================================================
    "./server/infrastructure/schema/platform_operations.ts",
    "./server/infrastructure/schema/integration_monitoring.ts",
    "./server/infrastructure/schema/integrity_operations.ts",
    
    // ============================================================================
    // SECURITY & SAFEGUARDS - Protection systems (CRITICAL)
    // ============================================================================
    "./server/infrastructure/schema/safeguards.ts",
    "./server/infrastructure/schema/expert_verification.ts", // Required by safeguards.ts
    "./server/infrastructure/schema/feature_flags.ts",
    
    // ============================================================================
    // STRATEGIC FEATURES - Partially implemented (INCLUDE)
    // ============================================================================
    "./server/infrastructure/schema/universal_access.ts",
    "./server/infrastructure/schema/advocacy_coordination.ts",
    
    // ============================================================================
    // SEARCH SYSTEM - Semantic search with vector embeddings (READY)
    // ============================================================================
    "./server/infrastructure/schema/search_system.ts",
    
    // ============================================================================
    // ADVANCED DISCOVERY - Search intelligence & recommendations (READY)
    // ============================================================================
    "./server/infrastructure/schema/advanced_discovery.ts",
    
    // ============================================================================
    // WEBSOCKET - Real-time communication (OPTIONAL)
    // ============================================================================
    "./server/infrastructure/schema/websocket.ts",
    
    // ============================================================================
    // FUTURE FEATURES - Defer to later migrations (COMMENTED OUT)
    // ============================================================================
    // Uncomment these when features are ready for implementation:
    // "./server/infrastructure/schema/impact_measurement.ts",
    // "./server/infrastructure/schema/expert_verification.ts",
    // "./server/infrastructure/schema/advanced_discovery.ts",
    // "./server/infrastructure/schema/real_time_engagement.ts",
    // "./server/infrastructure/schema/market_intelligence.ts",
    // "./server/infrastructure/schema/political_economy.ts",
    // "./server/infrastructure/schema/accountability_ledger.ts",
    // "./server/infrastructure/schema/trojan_bill_detection.ts",  // "./server/infrastructure/schema/constitutional_compliance.ts",
    // "./server/infrastructure/schema/graph_sync.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // Neon requires SSL in production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: true,
  // Neon-optimized migration settings
  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations__',
    schema: 'public',
  },
  // Type generation configuration
  introspect: {
    casing: 'preserve', // Preserve snake_case from database
  },
  // Enable type generation output
  // Types will be generated in shared/types/database via our custom script
});













































