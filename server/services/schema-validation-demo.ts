import { schemaValidationService } from './schema-validation-service.js';

/**
 * Demonstration script showing how to use the SchemaValidationService
 * This would be called during application startup or as part of health checks
 */
export async function demonstrateSchemaValidation() {
  console.log('🔍 Starting database schema validation...');
  
  try {
    // 1. Validate the critical compliance_checks table
    console.log('\n📋 Validating compliance_checks table...');
    const complianceResult = await schemaValidationService.validateComplianceChecksTable();
    
    if (!complianceResult.isValid) {
      console.log('❌ Compliance checks table has issues:');
      if (complianceResult.missingColumns.length > 0) {
        console.log(`   Missing columns: ${complianceResult.missingColumns.join(', ')}`);
      }
      if (complianceResult.incorrectTypes.length > 0) {
        console.log(`   Type issues: ${complianceResult.incorrectTypes.length}`);
      }
      console.log('   Recommendations:');
      complianceResult.recommendations.forEach(rec => console.log(`   - ${rec}`));
    } else {
      console.log('✅ Compliance checks table schema is valid');
    }
    
    // 2. Generate comprehensive validation report
    console.log('\n📊 Generating comprehensive validation report...');
    const report = await schemaValidationService.generateValidationReport();
    
    console.log(`\n📈 Schema Validation Report (${report.timestamp.toISOString()})`);
    console.log(`   Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`   Tables Validated: ${report.validatedTables}`);
    console.log(`   Invalid Tables: ${report.invalidTables}`);
    console.log(`   Total Issues: ${report.totalIssues}`);
    console.log(`   Critical Issues: ${report.criticalIssues}`);
    
    if (report.criticalIssues > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED:');
      report.results
        .filter(r => !r.isValid && (r.missingColumns.includes('next_check') || r.missingColumns.includes('timestamp') || r.missingColumns.includes('ip_address')))
        .forEach(r => {
          console.log(`   Table: ${r.tableName}`);
          console.log(`   Missing: ${r.missingColumns.join(', ')}`);
        });
    }
    
    // 3. Show recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    // 4. Attempt automatic repair if issues found
    if (report.totalIssues > 0) {
      console.log('\n🔧 Attempting automatic schema repair...');
      const repairResult = await schemaValidationService.repairSchema();
      
      if (repairResult.success) {
        console.log('✅ Schema repair completed successfully');
        if (repairResult.repairedTables.length > 0) {
          console.log(`   Repaired tables: ${repairResult.repairedTables.join(', ')}`);
        }
      } else {
        console.log('❌ Schema repair failed');
        repairResult.errors.forEach(error => console.log(`   Error: ${error}`));
      }
      
      if (repairResult.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        repairResult.warnings.forEach(warning => console.log(`   - ${warning}`));
      }
    }
    
    console.log('\n✅ Schema validation demonstration completed');
    return report;
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    throw error;
  }
}

/**
 * Quick health check function that can be called during application startup
 */
export async function quickSchemaHealthCheck(): Promise<boolean> {
  try {
    const complianceResult = await schemaValidationService.validateComplianceChecksTable();
    
    // Check for critical issues that would prevent the security monitoring service from working
    const hasCriticalIssues = complianceResult.missingColumns.includes('next_check') || !complianceResult.isValid;
    
    if (hasCriticalIssues) {
      console.warn('⚠️  Critical database schema issues detected. Security monitoring may not function properly.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Schema health check failed:', error);
    return false;
  }
}

/**
 * Function to be called by the security monitoring service before initialization
 */
export async function validateSchemaBeforeSecurityInit(): Promise<void> {
  console.log('🔒 Validating database schema before security monitoring initialization...');
  
  const isHealthy = await quickSchemaHealthCheck();
  
  if (!isHealthy) {
    console.log('🔧 Attempting to repair critical schema issues...');
    const repairResult = await schemaValidationService.repairSchema();
    
    if (!repairResult.success) {
      throw new Error('Critical database schema issues detected and automatic repair failed. Manual intervention required.');
    }
    
    console.log('✅ Schema issues repaired successfully');
  }
  
  console.log('✅ Database schema validation passed - security monitoring can proceed');
}