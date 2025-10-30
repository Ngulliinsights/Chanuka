import { schemaValidationService } from '@shared/schema';
import { logger  } from '../../shared/core/src/index.js';

/**
 * Demonstration script showing how to use the SchemaValidationService
 * This would be called during application startup or as part of health checks
 */
export async function demonstrateSchemaValidation() {
  logger.info('🔍 Starting database schema validation...', { component: 'Chanuka' });
  
  try {
    // 1. Validate the critical compliance_checks table
    logger.info('\n📋 Validating compliance_checks table...', { component: 'Chanuka' });
    const complianceResult = await schemaValidationService.validateComplianceChecksTable();
    
    if (!complianceResult.isValid) {
      logger.info('❌ Compliance checks table has issues:', { component: 'Chanuka' });
      if (complianceResult.missingColumns.length > 0) {
        console.log(`   Missing columns: ${complianceResult.missingColumns.join(', ')}`);
      }
      if (complianceResult.incorrectTypes.length > 0) {
        console.log(`   Type issues: ${complianceResult.incorrectTypes.length}`);
      }
      logger.info('   Recommendations:', { component: 'Chanuka' });
      complianceResult.recommendations.forEach(rec => console.log(`   - ${rec}`));
    } else {
      logger.info('✅ Compliance checks table schema is valid', { component: 'Chanuka' });
    }
    
    // 2. Generate comprehensive validation report
    logger.info('\n📊 Generating comprehensive validation report...', { component: 'Chanuka' });
    const report = await schemaValidationService.generateValidationReport();
    
    console.log(`\n📈 Schema Validation Report (${report.timestamp.toISOString()})`);
    console.log(`   Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`   Tables Validated: ${report.validatedTables}`);
    console.log(`   Invalid Tables: ${report.invalidTables}`);
    console.log(`   Total Issues: ${report.totalIssues}`);
    console.log(`   Critical Issues: ${report.criticalIssues}`);
    
    if (report.criticalIssues > 0) {
      logger.info('\n🚨 CRITICAL ISSUES DETECTED:', { component: 'Chanuka' });
      report.results
        .filter(r => !r.isValid && (r.missingColumns.includes('next_check') || r.missingColumns.includes('timestamp') || r.missingColumns.includes('ip_address')))
        .forEach(r => {
          console.log(`   Table: ${r.tableName}`);
          console.log(`   Missing: ${r.missingColumns.join(', ')}`);
        });
    }
    
    // 3. Show recommendations
    if (report.recommendations.length > 0) {
      logger.info('\n💡 Recommendations:', { component: 'Chanuka' });
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    // 4. Attempt automatic repair if issues found
    if (report.totalIssues > 0) {
      logger.info('\n🔧 Attempting automatic schema repair...', { component: 'Chanuka' });
      const repairResult = await schemaValidationService.repairSchema();
      
      if (repairResult.success) {
        logger.info('✅ Schema repair completed successfully', { component: 'Chanuka' });
        if (repairResult.repairedTables.length > 0) {
          console.log(`   Repaired tables: ${repairResult.repairedTables.join(', ')}`);
        }
      } else {
        logger.info('❌ Schema repair failed', { component: 'Chanuka' });
        repairResult.errors.forEach(error => console.log(`   Error: ${error}`));
      }
      
      if (repairResult.warnings.length > 0) {
        logger.info('⚠️  Warnings:', { component: 'Chanuka' });
        repairResult.warnings.forEach(warning => console.log(`   - ${warning}`));
      }
    }
    
    logger.info('\n✅ Schema validation demonstration completed', { component: 'Chanuka' });
    return report;
    
  } catch (error) {
    logger.error('❌ Schema validation failed:', { component: 'Chanuka' }, error);
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
    logger.error('❌ Schema health check failed:', { component: 'Chanuka' }, error);
    return false;
  }
}

/**
 * Function to be called by the security monitoring service before initialization
 */
export async function validateSchemaBeforeSecurityInit(): Promise<void> {
  logger.info('🔒 Validating database schema before security monitoring initialization...', { component: 'Chanuka' });
  
  const isHealthy = await quickSchemaHealthCheck();
  
  if (!isHealthy) {
    logger.info('🔧 Attempting to repair critical schema issues...', { component: 'Chanuka' });
    const repairResult = await schemaValidationService.repairSchema();
    
    if (!repairResult.success) {
      throw new Error('Critical database schema issues detected and automatic repair failed. Manual intervention required.');
    }
    
    logger.info('✅ Schema issues repaired successfully', { component: 'Chanuka' });
  }
  
  logger.info('✅ Database schema validation passed - security monitoring can proceed', { component: 'Chanuka' });
}












































