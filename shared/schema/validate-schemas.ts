// ============================================================================
// SCHEMA VALIDATION SCRIPT
// ============================================================================
// Quick validation to ensure all schemas compile correctly

// Import all schemas to check for TypeScript errors (sorted)
import * as advancedDiscovery from "./advanced_discovery";
import * as argumentIntelligence from "./argument_intelligence";
import * as advocacyCoordination from "./advocacy_coordination";
import * as citizenParticipation from "./citizen_participation";
import * as constitutionalIntelligence from "./constitutional_intelligence";
import * as expertVerification from "./expert_verification";
import * as foundation from "./foundation";
import * as impactMeasurement from "./impact_measurement";
import * as parliamentaryProcess from "./parliamentary_process";
import * as realTimeEngagement from "./real_time_engagement";
import * as transparencyAnalysis from "./transparency_analysis";
import * as transparencyIntelligence from "./transparency_intelligence";
import * as universalAccess from "./universal_access";

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
  transparencyIntelligence,
  expertVerification,
  advancedDiscovery,
  realTimeEngagement,
  mainSchema
};

console.log(`✅ Validated ${Object.keys(schemas).length} schema modules`);

// Count tables
let totalTables = 0;
// Type guard to detect Drizzle table objects by checking `_.name` metadata
function hasTableShape(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const o = value as Record<PropertyKey, unknown>;
  if (!('_' in o)) return false;
  const meta = o['_'] as unknown;
  if (typeof meta !== 'object' || meta === null) return false;
  const mm = meta as Record<PropertyKey, unknown>;
  return typeof mm['name'] === 'string' || typeof mm['name'] === 'number';
}

Object.entries(schemas).forEach(([name, schema]) => {
  const s = schema as Record<string, unknown>;
  const tableCount = Object.keys(s).filter((key) =>
    key !== 'default' &&
    !key.includes('Relations') &&
    !key.includes('Enum') &&
    hasTableShape(s[key])
  ).length;
  
  if (tableCount > 0) {
    console.log(`  ${name}: ${tableCount} tables`);
    totalTables += tableCount;
  }
});

console.log(`✅ Total tables across all domains: ${totalTables}`);
console.log("🎉 Schema validation completed successfully!");

export { schemas };


