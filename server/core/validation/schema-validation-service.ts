import { getDbInstance, readDatabase } from '../../infrastructure/database/index.js';
import { sql } from 'drizzle-orm';
import { logger   } from '../../../shared/core/src/index.js';
import { validationMetricsCollector } from './validation-metrics.js';
import {
  complianceChecks,
  securityAuditLogs,
  threatIntelligence
} from '@/shared/schema';

export interface ValidationResult {
  tableName: string;
  isValid: boolean;
  missingColumns: string[];
  incorrectTypes: ColumnTypeIssue[];
  recommendations: string[];
}

export interface ColumnTypeIssue {
  columnName: string;
  expectedType: string;
  actualType: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RepairResult {
  success: boolean;
  repairedTables: string[];
  errors: string[];
  warnings: string[];
}

export interface SchemaValidationReport {
  overallStatus: 'valid' | 'invalid' | 'warning';
  validatedTables: number;
  invalidTables: number;
  totalIssues: number;
  criticalIssues: number;
  results: ValidationResult[];
  recommendations: string[];
  timestamp: Date;
}

/**
 * Service for validating database schema integrity and detecting mismatches
 * between expected schema and actual database structure.
 * 
 * This service specifically addresses database schema inconsistencies that prevent
 * the security monitoring service from functioning properly, with focus on the
 * compliance_checks table and related security monitoring tables.
 */
export class SchemaValidationService {
  private static instance: SchemaValidationService;

  public static getInstance(): SchemaValidationService {
    if (!SchemaValidationService.instance) {
      SchemaValidationService.instance = new SchemaValidationService();
    }
    return SchemaValidationService.instance;
  }

  /**
    * Validate the compliance_checks table specifically for missing next_check column
    */
   async validateComplianceChecksTable(): Promise<ValidationResult> {
     const endMetric = validationMetricsCollector.startValidation('SchemaValidationService', 'validateComplianceChecksTable');
     const tableName = 'compliance_checks';
     const result: ValidationResult = {
       tableName,
       isValid: true,
       missingColumns: [],
       incorrectTypes: [],
       recommendations: []
     };

    try {
      // Check if table exists
      const tableExists = await this.checkTableExists(tableName);
      if (!tableExists) {
        result.isValid = false;
        result.recommendations.push(`Table '${tableName}' does not exist. Run database migrations to create it.`);
        return result;
      }

      // Get current table structure
  const columns = await this.getTableColumns(tableName);
      const columnNames = columns.map(col => col.column_name);

      // Expected columns for compliance_checks table
      const expectedColumns = [
        'id',
        'check_name', 
        'check_type',
        'description',
        'status',
        'last_checked',
        'next_check', // This is the missing column causing issues
        'findings',
        'remediation',
        'priority',
        'automated',
        'created_at',
        'updated_at'
      ];

      // Check for missing columns
      for (const expectedCol of expectedColumns) {
        if (!columnNames.includes(expectedCol)) {
          result.missingColumns.push(expectedCol);
          result.isValid = false;
        }
      }

      // Validate specific column types
      const typeValidations = [
        { column: 'next_check', expectedType: 'timestamp without time zone' },
        { column: 'last_checked', expectedType: 'timestamp without time zone' },
        { column: 'status', expectedType: 'text' },
        { column: 'check_type', expectedType: 'text' },
        { column: 'priority', expectedType: 'text' }
      ];

      for (const validation of typeValidations) {
        const column = columns.find(col => col.column_name === validation.column);
        if (column && column.data_type !== validation.expectedType) {
          result.incorrectTypes.push({
            columnName: validation.column,
            expectedType: validation.expectedType,
            actualType: column.data_type,
            severity: validation.column === 'next_check' ? 'high' : 'medium'
          });
          result.isValid = false;
        }
      }

      // Generate recommendations
      if (result.missingColumns.length > 0) {
        result.recommendations.push(
          `Add missing columns to ${tableName}: ${result.missingColumns.join(', ')}`
        );
        
        if (result.missingColumns.includes('next_check')) {
          result.recommendations.push(
            `Critical: Add next_check column with: ALTER TABLE ${tableName} ADD COLUMN next_check TIMESTAMP;`
          );
        }
      }

      if (result.incorrectTypes.length > 0) {
        result.recommendations.push(
          `Fix column types in ${tableName}: ${result.incorrectTypes.map(t => `${t.columnName} (${t.actualType} -> ${t.expectedType})`).join(', ')}`
        );
      }

      if (result.isValid) {
        result.recommendations.push(`Table '${tableName}' schema is valid and matches expected structure.`);
      }

    } catch (error) {
      console.error(`Error validating ${tableName} table:`, error);
      result.isValid = false;
      result.recommendations.push(`Error validating table: ${error instanceof Error ? error.message : new Error(String(error)).message}`);
    }

    endMetric(result.isValid, result.isValid ? undefined : 'schema_validation_failed', 'system');

    return result;
  }

  /**
   * Validate all security monitoring related tables
   */
  async validateAllTables(): Promise<ValidationResult[]> {
    const tablesToValidate = [
      'compliance_checks',
      'security_audit_logs', 
      'threat_intelligence',
      'security_alerts',
      'security_config'
    ];

    const results: ValidationResult[] = [];

    for (const tableName of tablesToValidate) {
      try {
        let result: ValidationResult;
        
        if (tableName === 'compliance_checks') {
          result = await this.validateComplianceChecksTable();
        } else {
          result = await this.validateGenericTable(tableName);
        }
        
        results.push(result);
      } catch (error) {
        console.error(`Error validating table ${tableName}:`, error);
        results.push({
          tableName,
          isValid: false,
          missingColumns: [],
          incorrectTypes: [],
          recommendations: [`Error validating table: ${error instanceof Error ? error.message : new Error(String(error)).message}`]
        });
      }
    }

    return results;
  }

  /**
   * Generate comprehensive schema validation report
   */
  async generateValidationReport(): Promise<SchemaValidationReport> {
    const results = await this.validateAllTables();
    
    const validatedTables = results.length;
    const invalidTables = results.filter(r => !r.isValid).length;
    const totalIssues = results.reduce((sum, r) => sum + r.missingColumns.length + r.incorrectTypes.length, 0);
    const criticalIssues = results.reduce((sum, r) => 
      sum + r.incorrectTypes.filter(t => t.severity === 'high').length + 
      (r.missingColumns.includes('next_check') ? 1 : 0), 0
    );

    const overallRecommendations = this.generateOverallRecommendations(results);
    
    let overallStatus: 'valid' | 'invalid' | 'warning' = 'valid';
    if (criticalIssues > 0) {
      overallStatus = 'invalid';
    } else if (totalIssues > 0) {
      overallStatus = 'warning';
    }

    return {
      overallStatus,
      validatedTables,
      invalidTables,
      totalIssues,
      criticalIssues,
      results,
      recommendations: overallRecommendations,
      timestamp: new Date()
    };
  }

  /**
   * Attempt to repair common schema issues automatically
   */
  async repairSchema(): Promise<RepairResult> {
    const result: RepairResult = {
      success: true,
      repairedTables: [],
      errors: [],
      warnings: []
    };

    try {
      // First validate to identify issues
      const validationResults = await this.validateAllTables();
      
      for (const validation of validationResults) {
        if (!validation.isValid) {
          try {
            const repaired = await this.repairTable(validation);
            if (repaired) {
              result.repairedTables.push(validation.tableName);
            }
          } catch (error) {
            result.errors.push(`Failed to repair ${validation.tableName}: ${error instanceof Error ? error.message : new Error(String(error)).message}`);
            result.success = false;
          }
        }
      }

      if (result.errors.length > 0) {
        result.warnings.push('Some tables could not be automatically repaired. Manual intervention may be required.');
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Schema repair failed: ${error instanceof Error ? error.message : new Error(String(error)).message}`);
    }

    return result;
  }

  /**
   * Private helper methods
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
  const database = readDatabase;
      const result = await database.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        );
      `);
      
      return result.rows[0]?.exists === true;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  private async getTableColumns(tableName: string): Promise<any[]> {
    try {
  const database = readDatabase;
      const result = await database.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `);
      
      return result.rows;
    } catch (error) {
      console.error(`Error getting columns for table ${tableName}:`, error);
      return [];
    }
  }

  private async validateGenericTable(tableName: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      tableName,
      isValid: true,
      missingColumns: [],
      incorrectTypes: [],
      recommendations: []
    };

    try {
      // Check if table exists
      const tableExists = await this.checkTableExists(tableName);
      if (!tableExists) {
        result.isValid = false;
        result.recommendations.push(`Table '${tableName}' does not exist. Run database migrations to create it.`);
        return result;
      }

      // Get current table structure
      const columns = await this.getTableColumns(tableName);
      
      // Perform table-specific validations
      switch (tableName) {
        case 'security_audit_logs':
          return await this.validateSecurityAuditLogsTable(result, columns);
        case 'threat_intelligence':
          return await this.validateThreatIntelligenceTable(result, columns);
        case 'security_alerts':
          return await this.validateSecurityAlertsTable(result, columns);
        case 'security_config':
          return await this.validateSecurityConfigTable(result, columns);
        default:
          result.recommendations.push(`Generic validation for table '${tableName}' - structure appears valid.`);
          return result;
      }

    } catch (error) {
      console.error(`Error validating ${tableName} table:`, error);
      result.isValid = false;
      result.recommendations.push(`Error validating table: ${error instanceof Error ? error.message : new Error(String(error)).message}`);
    }

    return result;
  }

  private async validateSecurityAuditLogsTable(result: ValidationResult, columns: any[]): Promise<ValidationResult> {
    const columnNames = columns.map(col => col.column_name);
    const expectedColumns = ['id', 'event_type', 'user_id', 'ip_address', 'user_agent', 'resource', 'action', 'result', 'severity', 'details', 'session_id', 'timestamp', 'created_at'];

    for (const expectedCol of expectedColumns) {
      if (!columnNames.includes(expectedCol)) {
        result.missingColumns.push(expectedCol);
        result.isValid = false;
      }
    }

    if (result.missingColumns.includes('timestamp')) {
      result.recommendations.push('Critical: Add timestamp column to security_audit_logs table');
    }

    return result;
  }

  private async validateThreatIntelligenceTable(result: ValidationResult, columns: any[]): Promise<ValidationResult> {
    const columnNames = columns.map(col => col.column_name);
    const expectedColumns = ['id', 'ip_address', 'threat_type', 'severity', 'source', 'description', 'first_seen', 'last_seen', 'occurrences', 'blocked', 'is_active', 'expires_at', 'metadata', 'created_at', 'updated_at'];

    for (const expectedCol of expectedColumns) {
      if (!columnNames.includes(expectedCol)) {
        result.missingColumns.push(expectedCol);
        result.isValid = false;
      }
    }

    if (result.missingColumns.includes('ip_address')) {
      result.recommendations.push('Critical: Add ip_address column to threat_intelligence table');
    }

    return result;
  }

  private async validateSecurityAlertsTable(result: ValidationResult, columns: any[]): Promise<ValidationResult> {
    const columnNames = columns.map(col => col.column_name);
    const expectedColumns = ['id', 'alert_type', 'severity', 'title', 'message', 'source', 'status', 'assigned_to', 'metadata', 'acknowledged_at', 'resolved_at', 'created_at', 'updated_at'];

    for (const expectedCol of expectedColumns) {
      if (!columnNames.includes(expectedCol)) {
        result.missingColumns.push(expectedCol);
        result.isValid = false;
      }
    }

    return result;
  }

  private async validateSecurityConfigTable(result: ValidationResult, columns: any[]): Promise<ValidationResult> {
    const columnNames = columns.map(col => col.column_name);
    const expectedColumns = ['id', 'config_key', 'config_value', 'description', 'updated_by', 'updated_at'];

    for (const expectedCol of expectedColumns) {
      if (!columnNames.includes(expectedCol)) {
        result.missingColumns.push(expectedCol);
        result.isValid = false;
      }
    }

    return result;
  }

  private async repairTable(validation: ValidationResult): Promise<boolean> {
    if (validation.tableName === 'compliance_checks' && validation.missingColumns.includes('next_check')) {
      try {
  const database = readDatabase;
        await database.execute(sql`
          ALTER TABLE compliance_checks
          ADD COLUMN IF NOT EXISTS next_check TIMESTAMP;
        `);
        logger.info('✅ Added next_check column to compliance_checks table', { component: 'Chanuka' });
        return true;
      } catch (error) {
        logger.error('❌ Failed to add next_check column:', { component: 'Chanuka' }, error);
        throw error;
      }
    }

    if (validation.tableName === 'security_audit_logs' && validation.missingColumns.includes('timestamp')) {
      try {
  const database = readDatabase;
        await database.execute(sql`
          ALTER TABLE security_audit_logs
          ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);
        logger.info('✅ Added timestamp column to security_audit_logs table', { component: 'Chanuka' });
        return true;
      } catch (error) {
        logger.error('❌ Failed to add timestamp column:', { component: 'Chanuka' }, error);
        throw error;
      }
    }

    if (validation.tableName === 'threat_intelligence' && validation.missingColumns.includes('ip_address')) {
      try {
  const database = readDatabase;
        await database.execute(sql`
          ALTER TABLE threat_intelligence
          ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT '';
        `);
        logger.info('✅ Added ip_address column to threat_intelligence table', { component: 'Chanuka' });
        return true;
      } catch (error) {
        logger.error('❌ Failed to add ip_address column:', { component: 'Chanuka' }, error);
        throw error;
      }
    }

    return false;
  }

  private generateOverallRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    const invalidTables = results.filter(r => !r.isValid);
    const criticalIssues = results.filter(r => 
      r.missingColumns.includes('next_check') || 
      r.missingColumns.includes('timestamp') || 
      r.missingColumns.includes('ip_address')
    );

    if (criticalIssues.length > 0) {
      recommendations.push('CRITICAL: Run database migrations immediately to fix missing columns that prevent core functionality');
    }

    if (invalidTables.length > 0) {
      recommendations.push(`${invalidTables.length} tables have schema issues that need attention`);
    }

    if (results.every(r => r.isValid)) {
      recommendations.push('All validated tables have correct schema structure');
    } else {
      recommendations.push('Consider running automatic schema repair or manual migrations to fix identified issues');
    }

    return recommendations;
  }
}

// Export singleton instance
export const schemaValidationService = SchemaValidationService.getInstance();






































