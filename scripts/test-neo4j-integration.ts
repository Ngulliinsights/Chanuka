/**
 * Neo4j Integration Test Script
 * 
 * Verifies that the refactored graph module structure works correctly
 * by testing imports and basic functionality.
 */

import { logger } from '../server/infrastructure/observability/core/logger';

async function testNeo4jIntegration(): Promise<void> {
  console.log('========================================');
  console.log('  Neo4j Integration Test');
  console.log('========================================\n');

  let hasErrors = false;

  try {
    // Test 1: Verify core module imports
    console.log('1. Testing core module imports...');
    try {
      const coreModule = await import('../server/infrastructure/database/graph/core/index.js');
      console.log('   ✓ Core module imports successfully');
      console.log(`   - Exports: ${Object.keys(coreModule).length} items`);
    } catch (error) {
      console.error('   ✗ Core module import failed:', error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    // Test 2: Verify query module imports
    console.log('\n2. Testing query module imports...');
    try {
      const queryModule = await import('../server/infrastructure/database/graph/query/index.js');
      console.log('   ✓ Query module imports successfully');
      console.log(`   - Exports: ${Object.keys(queryModule).length} items`);
    } catch (error) {
      console.error('   ✗ Query module import failed:', error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    // Test 3: Verify utils module imports
    console.log('\n3. Testing utils module imports...');
    try {
      const utilsModule = await import('../server/infrastructure/database/graph/utils/index.js');
      console.log('   ✓ Utils module imports successfully');
      console.log(`   - Exports: ${Object.keys(utilsModule).length} items`);
    } catch (error) {
      console.error('   ✗ Utils module import failed:', error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    // Test 4: Verify analytics module imports
    console.log('\n4. Testing analytics module imports...');
    try {
      const analyticsModule = await import('../server/infrastructure/database/graph/analytics/index.js');
      console.log('   ✓ Analytics module imports successfully');
      console.log(`   - Exports: ${Object.keys(analyticsModule).length} items`);
    } catch (error) {
      console.error('   ✗ Analytics module import failed:', error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    // Test 5: Verify sync module imports
    console.log('\n5. Testing sync module imports...');
    try {
      const syncModule = await import('../server/infrastructure/database/graph/sync/index.js');
      console.log('   ✓ Sync module imports successfully');
      console.log(`   - Exports: ${Object.keys(syncModule).length} items`);
    } catch (error) {
      console.error('   ✗ Sync module import failed:', error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    // Test 6: Verify config module imports
    console.log('\n6. Testing config module imports...');
    try {
      const configModule = await import('../server/infrastructure/database/graph/config/index.js');
      console.log('   ✓ Config module imports successfully');
      console.log(`   - Exports: ${Object.keys(configModule).length} items`);
    } catch (error) {
      console.error('   ✗ Config module import failed:', error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    // Test 7: Verify main barrel export
    console.log('\n7. Testing main barrel export...');
    try {
      const graphModule = await import('../server/infrastructure/database/graph/index.js');
      console.log('   ✓ Main barrel export imports successfully');
      console.log(`   - Total exports: ${Object.keys(graphModule).length} items`);
    } catch (error) {
      console.error('   ✗ Main barrel export import failed:', error instanceof Error ? error.message : String(error));
      hasErrors = true;
    }

    console.log('\n========================================');
    if (hasErrors) {
      console.log('  ✗ Integration Test FAILED');
      console.log('========================================\n');
      process.exit(1);
    } else {
      console.log('  ✓ Integration Test PASSED');
      console.log('========================================\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n✗ Unexpected error during integration test:', error);
    process.exit(1);
  }
}

// Run the test
testNeo4jIntegration();
