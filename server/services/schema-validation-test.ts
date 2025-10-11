#!/usr/bin/env node

/**
 * Test script to validate the current schema validation service implementation
 */

import { schemaValidationService } from './schema-validation-service.js';
import { logger } from '../utils/logger';

async function testSchemaValidation() {
  logger.info('🔍 Testing Schema Validation Service...\n', { component: 'SimpleTool' });

  try {
    // Test 1: Validate compliance_checks table specifically
    logger.info('1. Testing compliance_checks table validation...', { component: 'SimpleTool' });
    const complianceResult = await schemaValidationService.validateComplianceChecksTable();
    logger.info('   Result:', { component: 'SimpleTool' }, {
      isValid: complianceResult.isValid,
      missingColumns: complianceResult.missingColumns,
      recommendations: complianceResult.recommendations.slice(0, 2) // Show first 2 recommendations
    });

    // Test 2: Validate all security monitoring tables
    logger.info('\n2. Testing all security monitoring tables...', { component: 'SimpleTool' });
    const allResults = await schemaValidationService.validateAllTables();
    console.log(`   Validated ${allResults.length} tables:`);
    allResults.forEach(result => {
      console.log(`   - ${result.tableName}: ${result.isValid ? '✅ Valid' : '❌ Invalid'} (${result.missingColumns.length} missing columns)`);
    });

    // Test 3: Generate comprehensive report
    logger.info('\n3. Generating comprehensive validation report...', { component: 'SimpleTool' });
    const report = await schemaValidationService.generateValidationReport();
    logger.info('   Report Summary:', { component: 'SimpleTool' }, {
      overallStatus: report.overallStatus,
      validatedTables: report.validatedTables,
      invalidTables: report.invalidTables,
      totalIssues: report.totalIssues,
      criticalIssues: report.criticalIssues
    });

    // Test 4: Test schema repair functionality
    logger.info('\n4. Testing schema repair functionality...', { component: 'SimpleTool' });
    const repairResult = await schemaValidationService.repairSchema();
    logger.info('   Repair Result:', { component: 'SimpleTool' }, {
      success: repairResult.success,
      repairedTables: repairResult.repairedTables,
      errors: repairResult.errors.slice(0, 2) // Show first 2 errors if any
    });

    logger.info('\n✅ Schema validation service test completed successfully!', { component: 'SimpleTool' });

  } catch (error) {
    logger.error('\n❌ Schema validation test failed:', { component: 'SimpleTool' }, error);
    process.exit(1);
  }
}

// Run the test
testSchemaValidation().catch(console.error);






