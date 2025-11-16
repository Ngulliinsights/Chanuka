// ============================================================================
// SIMPLE SCHEMA VALIDATION SCRIPT
// ============================================================================
// Quick validation to ensure all schemas compile correctly without dependencies

console.log("🔍 Starting schema validation...");

try {
  console.log("📦 Importing schemas...");
  
  // Try to compile the TypeScript files using tsc
  const { execSync } = require('child_process');
  
  console.log("🔨 Compiling TypeScript schemas...");
  
  // Check if we can compile the new schema files
  const schemaFiles = [
    'transparency_intelligence.ts',
    'expert_verification.ts', 
    'advanced_discovery.ts',
    'real_time_engagement.ts'
  ];
  
  for (const file of schemaFiles) {
    try {
      console.log(`  ✓ Checking ${file}...`);
      execSync(`npx tsc --noEmit --skipLibCheck shared/schema/${file}`, { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log(`  ✅ ${file} compiles successfully`);
    } catch (error) {
      console.error(`  ❌ ${file} has compilation errors:`, error.stdout?.toString() || error.message);
      throw error;
    }
  }
  
  console.log("🔨 Checking main index file...");
  try {
    execSync(`npx tsc --noEmit --skipLibCheck shared/schema/index.ts`, { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log("  ✅ index.ts compiles successfully");
  } catch (error) {
    console.error("  ❌ index.ts has compilation errors:", error.stdout?.toString() || error.message);
    throw error;
  }

  console.log("✅ All new schema files validated successfully!");
  console.log("🎉 Schema validation completed successfully!");

} catch (error) {
  console.error("❌ Schema validation failed:", error.message);
  process.exit(1);
}