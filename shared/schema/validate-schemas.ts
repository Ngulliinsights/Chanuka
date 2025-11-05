// ============================================================================
// SCHEMA VALIDATION SCRIPT
// ============================================================================
// Quick validation to ensure all schemas compile correctly

// Import all schemas to check for TypeScript errors
import * as foundation from "./foundation";
import * as citizenParticipation from "./citizen_participation";
import * as parliamentaryProcess from "./parliamentary_process";
import * as constitutionalIntelligence from "./constitutional_intelligence";
import * as argumentIntelligence from "./argument_intelligence";
import * as advocacyCoordination from "./advocacy_coordination";
import * as universalAccess from "./universal_access";
import * as transparencyAnalysis from "./transparency_analysis";
import * as impactMeasurement from "./impact_measurement";

// Import the main index to ensure all exports work
import * as mainSchema from "./index";

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
  mainSchema
};

console.log(`✅ Validated ${Object.keys(schemas).length} schema modules`);

// Count tables
let totalTables = 0;
Object.entries(schemas).forEach(([name, schema]) => {
  const tableCount = Object.keys(schema).filter(key => 
    key !== 'default' && 
    !key.includes('Relations') && 
    !key.includes('Enum') &&
    typeof schema[key] === 'object' &&
    schema[key]?._.name
  ).length;
  
  if (tableCount > 0) {
    console.log(`  ${name}: ${tableCount} tables`);
    totalTables += tableCount;
  }
});

console.log(`✅ Total tables across all domains: ${totalTables}`);
console.log("🎉 Schema validation completed successfully!");

export { schemas };