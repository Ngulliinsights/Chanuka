import { schemaValidationService } from './schema-validation-service.js';
import { logger } from '../utils/logger';

/**
 * Demonstration script showing how to use the SchemaValidationService
 * This would be called during application startup or as part of health checks
 */
export async function demonstrateSchemaValidation() {
  logger.info('🔍 Starting database schema validation...', { component: 'SimpleTool' });
  
  try {
    // 1. Validate the critical compliance_checks table
    logger.info('\n📋 Validating compliance_checks table...', { component: 'SimpleTool' });
    const complianceResult = await schemaValidationService.validateComplianceChecksTable();
    
    if (!complianceResult.isValid) {
      logger.info('❌ Compliance checks table has issues:', { component: 'SimpleTool' });
      if (complianceResult.missingColumns.length > 0) {
        console.log(`   Missing columns: ${complianceResult.missingColumns.join(', ')}`);
      }
      if (complianceResult.incorrectTypes.length > 0) {
        console.log(`   Type issues: ${complianceResult.incorrectTypes.length}`);
      }
      logger.info('   Recommendations:', { component: 'SimpleTool' });
      complianceResult.recommendations.forEach(rec => console.log(`   - ${rec}`));
    } else {
      logger.info('✅ Compliance checks table schema is valid', { component: 'SimpleTool' });
    }
    
    // 2. Generate comprehensive validation report
    logger.info('\n📊 Generating comprehensive validation report...', { component: 'SimpleTool' });
    const report = await schemaValidationService.generateValidationReport();
    
    console.log(`\n📈 Schema Validation Report (${report.timestamp.toISOString()})`);
    console.log(`   Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`   Tables Validated: ${report.validatedTables}`);
    console.log(`   Invalid Tables: ${report.invalidTables}`);
    console.log(`   Total Issues: ${report.totalIssues}`);
    console.log(`   Critical Issues: ${report.criticalIssues}`);
    
    if (report.criticalIssues > 0) {
      logger.info('\n🚨 CRITICAL ISSUES DETECTED:', { component: 'SimpleTool' });
      report.results
        .filter(r => !r.isValid && (r.missingColumns.includes('next_check') || r.missingColumns.includes('timestamp') || r.missingColumns.includes('ip_address')))
        .forEach(r => {
          console.log(`   Table: ${r.tableName}`);
          console.log(`   Missing: ${r.missingColumns.join(', ')}`);
        });
    }
    
    // 3. Show recommendations
    if (report.recommendations.length > 0) {
      logger.info('\n💡 Recommendations:', { component: 'SimpleTool' });
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    // 4. Attempt automatic repair if issues found
    if (report.totalIssues > 0) {
      logger.info('\n🔧 Attempting automatic schema repair...', { component: 'SimpleTool' });
      const repairResult = await schemaValidationService.repairSchema();
      
      if (repairResult.success) {
        logger.info('✅ Schema repair completed successfully', { component: 'SimpleTool' });
        if (repairResult.repairedTables.length > 0) {
          console.log(`   Repaired tables: ${repairResult.repairedTables.join(', ')}`);
        }
      } else {
        logger.info('❌ Schema repair failed', { component: 'SimpleTool' });
        repairResult.errors.forEach(error => console.log(`   Error: ${error}`));
      }
      
      if (repairResult.warnings.length > 0) {
        logger.info('⚠️  Warnings:', { component: 'SimpleTool' });
        repairResult.warnings.forEach(warning => console.log(`   - ${warning}`));
      }
    }
    
    logger.info('\n✅ Schema validation demonstration completed', { component: 'SimpleTool' });
    return report;
    
  } catch (error) {
    logger.error('❌ Schema validation failed:', { component: 'SimpleTool' }, error);
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
    logger.error('❌ Schema health check failed:', { component: 'SimpleTool' }, error);
    return false;
  }
}

/**
 * Function to be called by the security monitoring service before initialization
 */
export async function validateSchemaBeforeSecurityInit(): Promise<void> {
  logger.info('🔒 Validating database schema before security monitoring initialization...', { component: 'SimpleTool' });
  
  const isHealthy = await quickSchemaHealthCheck();
  
  if (!isHealthy) {
    logger.info('🔧 Attempting to repair critical schema issues...', { component: 'SimpleTool' });
    const repairResult = await schemaValidationService.repairSchema();
    
    if (!repairResult.success) {
      throw new Error('Critical database schema issues detected and automatic repair failed. Manual intervention required.');
    }
    
    logger.info('✅ Schema issues repaired successfully', { component: 'SimpleTool' });
  }
  
  logger.info('✅ Database schema validation passed - security monitoring can proceed', { component: 'SimpleTool' });
}






