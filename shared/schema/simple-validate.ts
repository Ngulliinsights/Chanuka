// ============================================================================
// SIMPLE SCHEMA VALIDATION SCRIPT
// ============================================================================
// Quick validation to ensure all schemas compile correctly without dependencies

console.log("🔍 Starting schema validation...");

try {
  // Import all schemas to check for TypeScript errors
  console.log("📦 Importing foundation schema...");
  const foundation = require("./foundation");
  
  console.log("📦 Importing citizen participation schema...");
  const citizenParticipation = require("./citizen_participation");
  
  console.log("📦 Importing parliamentary process schema...");
  const parliamentaryProcess = require("./parliamentary_process");
  
  console.log("📦 Importing constitutional intelligence schema...");
  const constitutionalIntelligence = require("./constitutional_intelligence");
  
  console.log("📦 Importing argument intelligence schema...");
  const argumentIntelligence = require("./argument_intelligence");
  
  console.log("📦 Importing advocacy coordination schema...");
  const advocacyCoordination = require("./advocacy_coordination");
  
  console.log("📦 Importing universal access schema...");
  const universalAccess = require("./universal_access");
  
  console.log("📦 Importing transparency analysis schema...");
  const transparencyAnalysis = require("./transparency_analysis");
  
  console.log("📦 Importing impact measurement schema...");
  const impactMeasurement = require("./impact_measurement");
  
  console.log("📦 Importing transparency intelligence schema...");
  const transparencyIntelligence = require("./transparency_intelligence");
  
  console.log("📦 Importing expert verification schema...");
  const expertVerification = require("./expert_verification");
  
  console.log("📦 Importing advanced discovery schema...");
  const advancedDiscovery = require("./advanced_discovery");
  
  console.log("📦 Importing real-time engagement schema...");
  const realTimeEngagement = require("./real_time_engagement");
  
  console.log("📦 Importing main index...");
  const mainSchema = require("./index");

  console.log("✅ All schemas imported successfully!");

  // Basic validation
  const schemas = {
    foundation,
    citizenParticipation,
    parliamentaryProcess,
    constitutionalIntelligence,
    argumentIntelligence,
    advocacyCoordination,
    universalAccess,
    transparencyAnalysis,
    impactMeasurement,
    transparencyIntelligence,
    expertVerification,
    advancedDiscovery,
    realTimeEngagement,
    mainSchema
  };

  console.log(`✅ Validated ${Object.keys(schemas).length} schema modules`);

  // Count tables
  let totalTables = 0;
  Object.entries(schemas).forEach(([name, schema]) => {
    if (name === 'mainSchema') return; // Skip main schema as it re-exports
    
    const tableCount = Object.keys(schema).filter(key => 
      key !== 'default' && 
      !key.includes('Relations') && 
      !key.includes('Enum') &&
      typeof (schema as any)[key] === 'object' &&
      (schema as any)[key]?._.name
    ).length;
    
    if (tableCount > 0) {
      console.log(`  ${name}: ${tableCount} tables`);
      totalTables += tableCount;
    }
  });

  console.log(`✅ Total tables across all domains: ${totalTables}`);
  console.log("🎉 Schema validation completed successfully!");

} catch (error) {
  console.error("❌ Schema validation failed:", error);
  process.exit(1);
}

