#!/usr/bin/env node

/**
 * Test script to validate the current schema validation service implementation
 */

import { schemaValidationService } from './schema-validation-service.js';

async function testSchemaValidation() {
  console.log('🔍 Testing Schema Validation Service...\n');

  try {
    // Test 1: Validate compliance_checks table specifically
    console.log('1. Testing compliance_checks table validation...');
    const complianceResult = await schemaValidationService.validateComplianceChecksTable();
    console.log('   Result:', {
      isValid: complianceResult.isValid,
      missingColumns: complianceResult.missingColumns,
      recommendations: complianceResult.recommendations.slice(0, 2) // Show first 2 recommendations
    });

    // Test 2: Validate all security monitoring tables
    console.log('\n2. Testing all security monitoring tables...');
    const allResults = await schemaValidationService.validateAllTables();
    console.log(`   Validated ${allResults.length} tables:`);
    allResults.forEach(result => {
      console.log(`   - ${result.tableName}: ${result.isValid ? '✅ Valid' : '❌ Invalid'} (${result.missingColumns.length} missing columns)`);
    });

    // Test 3: Generate comprehensive report
    console.log('\n3. Generating comprehensive validation report...');
    const report = await schemaValidationService.generateValidationReport();
    console.log('   Report Summary:', {
      overallStatus: report.overallStatus,
      validatedTables: report.validatedTables,
      invalidTables: report.invalidTables,
      totalIssues: report.totalIssues,
      criticalIssues: report.criticalIssues
    });

    // Test 4: Test schema repair functionality
    console.log('\n4. Testing schema repair functionality...');
    const repairResult = await schemaValidationService.repairSchema();
    console.log('   Repair Result:', {
      success: repairResult.success,
      repairedTables: repairResult.repairedTables,
      errors: repairResult.errors.slice(0, 2) // Show first 2 errors if any
    });

    console.log('\n✅ Schema validation service test completed successfully!');

  } catch (error) {
    console.error('\n❌ Schema validation test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSchemaValidation().catch(console.error);