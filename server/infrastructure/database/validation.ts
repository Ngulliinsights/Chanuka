/**
 * Database Data Validation and Integrity System
 * 
 * Provides comprehensive data validation:
 * - Schema validation
 * - Data integrity checks
 * - Constraint validation
 * - Referential integrity
 * - Data quality monitoring
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '@shared/core/src/index.js';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  table: string;
  column?: string;
  type: 'not_null' | 'unique' | 'foreign_key' | 'check' | 'format' | 'range' | 'custom';
  constraint?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  table: string;
  column?: string;
  passed: boolean;
  violationCount: number;
  violations: ValidationViolation[];
  executionTime: number;
  timestamp: Date;
}

export interface ValidationViolation {
  rowId?: string;
  column?: string;
  value?: any;
  expectedValue?: any;
  message: string;
}

export interface DataQualityReport {
  timestamp: Date;
  overallScore: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  criticalViolations: number;
  results: ValidationResult[];
  recommendations: string[];
}

export interface IntegrityCheckResult {
  checkType: string;
  table: string;
  passed: boolean;
  issueCount: number;
  issues: IntegrityIssue[];
}

export interface IntegrityIssue {
  type: 'orphaned_record' | 'missing_reference' | 'duplicate_key' | 'invalid_data';
  table: string;
  column?: string;
  rowId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class DatabaseValidation {
  private pool: Pool;
  private validationRules: ValidationRule[] = [];

  constructor(pool: Pool) {
    this.pool = pool;
    this.setupDefaultValidationRules();
  }

  /**
   * Run all validation rules
   */
  async runValidation(): Promise<DataQualityReport> {
    const startTime = Date.now();
    
    logger.info('Starting database validation', {
      component: 'DatabaseValidation',
      rulesCount: this.validationRules.filter(r => r.enabled).length
    });

    const results: ValidationResult[] = [];
    const enabledRules = this.validationRules.filter(r => r.enabled);

    for (const rule of enabledRules) {
      try {
        const result = await this.runValidationRule(rule);
        results.push(result);
      } catch (error) {
        logger.error(`Validation rule ${rule.id} failed`, {
          component: 'DatabaseValidation',
          error: error instanceof Error ? error.message : String(error)
        });

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          table: rule.table,
          column: rule.column,
          passed: false,
          violationCount: 0,
          violations: [{
            message: `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`
          }],
          executionTime: 0,
          timestamp: new Date()
        });
      }
    }

    const passedRules = results.filter(r => r.passed).length;
    const failedRules = results.length - passedRules;
    const criticalViolations = results
      .filter(r => !r.passed)
      .filter(r => {
        const rule = this.validationRules.find(vr => vr.id === r.ruleId);
        return rule?.severity === 'critical';
      }).length;

    const overallScore = results.length > 0 ? (passedRules / results.length) * 100 : 100;
    const recommendations = this.generateRecommendations(results);

    const report: DataQualityReport = {
      timestamp: new Date(),
      overallScore,
      totalRules: results.length,
      passedRules,
      failedRules,
      criticalViolations,
      results,
      recommendations
    };

    logger.info('Database validation completed', {
      component: 'DatabaseValidation',
      duration: `${Date.now() - startTime}ms`,
      overallScore: `${overallScore.toFixed(1)}%`,
      failedRules,
      criticalViolations
    });

    return report;
  }

  /**
   * Run a specific validation rule
   */
  async runValidationRule(rule: ValidationRule): Promise<ValidationResult> {
    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      let violations: ValidationViolation[] = [];

      switch (rule.type) {
        case 'not_null':
          violations = await this.checkNotNull(client, rule);
          break;
        case 'unique':
          violations = await this.checkUnique(client, rule);
          break;
        case 'foreign_key':
          violations = await this.checkForeignKey(client, rule);
          break;
        case 'check':
          violations = await this.checkConstraint(client, rule);
          break;
        case 'format':
          violations = await this.checkFormat(client, rule);
          break;
        case 'range':
          violations = await this.checkRange(client, rule);
          break;
        case 'custom':
          violations = await this.checkCustom(client, rule);
          break;
        default:
          throw new Error(`Unknown validation rule type: ${rule.type}`);
      }

      const result: ValidationResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        table: rule.table,
        column: rule.column,
        passed: violations.length === 0,
        violationCount: violations.length,
        violations,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };

      return result;

    } finally {
      client.release();
    }
  }

  /**
   * Check NOT NULL constraints
   */
  private async checkNotNull(client: PoolClient, rule: ValidationRule): Promise<ValidationViolation[]> {
    if (!rule.column) {
      throw new Error('Column is required for NOT NULL validation');
    }

    const result = await client.query(`
      SELECT id, ${rule.column}
      FROM ${rule.table}
      WHERE ${rule.column} IS NULL
      LIMIT 100
    `);

    return result.rows.map(row => ({
      rowId: row.id,
      column: rule.column,
      value: null,
      message: `NULL value found in ${rule.column}`
    }));
  }

  /**
   * Check UNIQUE constraints
   */
  private async checkUnique(client: PoolClient, rule: ValidationRule): Promise<ValidationViolation[]> {
    if (!rule.column) {
      throw new Error('Column is required for UNIQUE validation');
    }

    const result = await client.query(`
      SELECT ${rule.column}, COUNT(*) as count
      FROM ${rule.table}
      WHERE ${rule.column} IS NOT NULL
      GROUP BY ${rule.column}
      HAVING COUNT(*) > 1
      LIMIT 100
    `);

    return result.rows.map(row => ({
      column: rule.column,
      value: row[rule.column!],
      message: `Duplicate value '${row[rule.column!]}' found ${row.count} times`
    }));
  }

  /**
   * Check foreign key constraints
   */
  private async checkForeignKey(client: PoolClient, rule: ValidationRule): Promise<ValidationViolation[]> {
    if (!rule.constraint) {
      throw new Error('Constraint definition is required for foreign key validation');
    }

    // Parse constraint: "column REFERENCES table(column)"
    const match = rule.constraint.match(/(\w+)\s+REFERENCES\s+(\w+)\((\w+)\)/i);
    if (!match) {
      throw new Error('Invalid foreign key constraint format');
    }

    const [, fkColumn, refTable, refColumn] = match;

    const result = await client.query(`
      SELECT t1.id, t1.${fkColumn}
      FROM ${rule.table} t1
      LEFT JOIN ${refTable} t2 ON t1.${fkColumn} = t2.${refColumn}
      WHERE t1.${fkColumn} IS NOT NULL AND t2.${refColumn} IS NULL
      LIMIT 100
    `);

    return result.rows.map(row => ({
      rowId: row.id,
      column: fkColumn,
      value: row[fkColumn],
      message: `Foreign key violation: ${row[fkColumn]} not found in ${refTable}.${refColumn}`
    }));
  }

  /**
   * Check custom constraints
   */
  private async checkConstraint(client: PoolClient, rule: ValidationRule): Promise<ValidationViolation[]> {
    if (!rule.constraint) {
      throw new Error('Constraint SQL is required for check validation');
    }

    const result = await client.query(`
      SELECT id, *
      FROM ${rule.table}
      WHERE NOT (${rule.constraint})
      LIMIT 100
    `);

    return result.rows.map(row => ({
      rowId: row.id,
      message: `Check constraint violation: ${rule.constraint}`
    }));
  }

  /**
   * Check format constraints (regex, email, etc.)
   */
  private async checkFormat(client: PoolClient, rule: ValidationRule): Promise<ValidationViolation[]> {
    if (!rule.column || !rule.constraint) {
      throw new Error('Column and constraint pattern are required for format validation');
    }

    const result = await client.query(`
      SELECT id, ${rule.column}
      FROM ${rule.table}
      WHERE ${rule.column} IS NOT NULL 
        AND ${rule.column} !~ $1
      LIMIT 100
    `, [rule.constraint]);

    return result.rows.map(row => ({
      rowId: row.id,
      column: rule.column,
      value: row[rule.column!],
      message: `Format violation: '${row[rule.column!]}' does not match pattern ${rule.constraint}`
    }));
  }

  /**
   * Check range constraints
   */
  private async checkRange(client: PoolClient, rule: ValidationRule): Promise<ValidationViolation[]> {
    if (!rule.column || !rule.constraint) {
      throw new Error('Column and range constraint are required for range validation');
    }

    // Parse range: "min,max" or ">min" or "<max"
    let whereClause: string;
    let params: any[] = [];

    if (rule.constraint.includes(',')) {
      const [min, max] = rule.constraint.split(',').map(v => parseFloat(v.trim()));
      whereClause = `${rule.column} < $1 OR ${rule.column} > $2`;
      params = [min, max];
    } else if (rule.constraint.startsWith('>')) {
      const min = parseFloat(rule.constraint.substring(1));
      whereClause = `${rule.column} <= $1`;
      params = [min];
    } else if (rule.constraint.startsWith('<')) {
      const max = parseFloat(rule.constraint.substring(1));
      whereClause = `${rule.column} >= $1`;
      params = [max];
    } else {
      throw new Error('Invalid range constraint format');
    }

    const result = await client.query(`
      SELECT id, ${rule.column}
      FROM ${rule.table}
      WHERE ${rule.column} IS NOT NULL AND (${whereClause})
      LIMIT 100
    `, params);

    return result.rows.map(row => ({
      rowId: row.id,
      column: rule.column,
      value: row[rule.column!],
      message: `Range violation: '${row[rule.column!]}' is outside allowed range ${rule.constraint}`
    }));
  }

  /**
   * Check custom validation logic
   */
  private async checkCustom(client: PoolClient, rule: ValidationRule): Promise<ValidationViolation[]> {
    if (!rule.constraint) {
      throw new Error('Custom SQL query is required for custom validation');
    }

    const result = await client.query(rule.constraint);

    return result.rows.map(row => ({
      rowId: row.id || row.row_id,
      column: row.column,
      value: row.value,
      message: row.message || `Custom validation failed: ${rule.name}`
    }));
  }

  /**
   * Run comprehensive integrity checks
   */
  async runIntegrityChecks(): Promise<IntegrityCheckResult[]> {
    logger.info('Starting database integrity checks', {
      component: 'DatabaseValidation'
    });

    const results: IntegrityCheckResult[] = [];

    // Check for orphaned records
    results.push(...await this.checkOrphanedRecords());

    // Check for missing references
    results.push(...await this.checkMissingReferences());

    // Check for duplicate primary keys
    results.push(...await this.checkDuplicateKeys());

    // Check Chanuka-specific integrity
    results.push(...await this.checkChanukaIntegrity());

    logger.info('Database integrity checks completed', {
      component: 'DatabaseValidation',
      totalChecks: results.length,
      failedChecks: results.filter(r => !r.passed).length
    });

    return results;
  }

  /**
   * Check for orphaned records
   */
  private async checkOrphanedRecords(): Promise<IntegrityCheckResult[]> {
    const client = await this.pool.connect();
    const results: IntegrityCheckResult[] = [];

    try {
      // Check for orphaned comments
      const orphanedComments = await client.query(`
        SELECT c.id, c.bill_id, c.user_id
        FROM comments c
        LEFT JOIN bills b ON c.bill_id = b.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE b.id IS NULL OR u.id IS NULL
        LIMIT 100
      `);

      results.push({
        checkType: 'orphaned_comments',
        table: 'comments',
        passed: orphanedComments.rows.length === 0,
        issueCount: orphanedComments.rows.length,
        issues: orphanedComments.rows.map(row => ({
          type: 'orphaned_record',
          table: 'comments',
          rowId: row.id,
          description: `Comment ${row.id} references non-existent bill ${row.bill_id} or user ${row.user_id}`,
          severity: 'high' as const
        }))
      });

      // Check for orphaned bill engagement
      const orphanedEngagement = await client.query(`
        SELECT be.id, be.bill_id, be.user_id
        FROM bill_engagement be
        LEFT JOIN bills b ON be.bill_id = b.id
        LEFT JOIN users u ON be.user_id = u.id
        WHERE b.id IS NULL OR u.id IS NULL
        LIMIT 100
      `);

      results.push({
        checkType: 'orphaned_engagement',
        table: 'bill_engagement',
        passed: orphanedEngagement.rows.length === 0,
        issueCount: orphanedEngagement.rows.length,
        issues: orphanedEngagement.rows.map(row => ({
          type: 'orphaned_record',
          table: 'bill_engagement',
          rowId: row.id,
          description: `Engagement ${row.id} references non-existent bill ${row.bill_id} or user ${row.user_id}`,
          severity: 'medium' as const
        }))
      });

    } finally {
      client.release();
    }

    return results;
  }

  /**
   * Check for missing references
   */
  private async checkMissingReferences(): Promise<IntegrityCheckResult[]> {
    const client = await this.pool.connect();
    const results: IntegrityCheckResult[] = [];

    try {
      // Check for bills without sponsors
      const billsWithoutSponsors = await client.query(`
        SELECT id, title, sponsor_id
        FROM bills
        WHERE sponsor_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM sponsors WHERE id = bills.sponsor_id)
        LIMIT 100
      `);

      results.push({
        checkType: 'missing_sponsors',
        table: 'bills',
        passed: billsWithoutSponsors.rows.length === 0,
        issueCount: billsWithoutSponsors.rows.length,
        issues: billsWithoutSponsors.rows.map(row => ({
          type: 'missing_reference',
          table: 'bills',
          column: 'sponsor_id',
          rowId: row.id,
          description: `Bill "${row.title}" references non-existent sponsor ${row.sponsor_id}`,
          severity: 'high' as const
        }))
      });

    } finally {
      client.release();
    }

    return results;
  }

  /**
   * Check for duplicate primary keys
   */
  private async checkDuplicateKeys(): Promise<IntegrityCheckResult[]> {
    const client = await this.pool.connect();
    const results: IntegrityCheckResult[] = [];

    try {
      // Get all tables with their primary key columns
      const tablesResult = await client.query(`
        SELECT 
          t.table_name,
          string_agg(c.column_name, ', ') as pk_columns
        FROM information_schema.tables t
        JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name
        JOIN information_schema.constraint_column_usage c ON tc.constraint_name = c.constraint_name
        WHERE t.table_schema = 'public' 
          AND tc.constraint_type = 'PRIMARY KEY'
        GROUP BY t.table_name
      `);

      for (const table of tablesResult.rows) {
        const duplicatesResult = await client.query(`
          SELECT ${table.pk_columns}, COUNT(*) as count
          FROM ${table.table_name}
          GROUP BY ${table.pk_columns}
          HAVING COUNT(*) > 1
          LIMIT 10
        `);

        results.push({
          checkType: 'duplicate_primary_keys',
          table: table.table_name,
          passed: duplicatesResult.rows.length === 0,
          issueCount: duplicatesResult.rows.length,
          issues: duplicatesResult.rows.map(row => ({
            type: 'duplicate_key',
            table: table.table_name,
            description: `Duplicate primary key found in ${table.table_name}: ${JSON.stringify(row)}`,
            severity: 'critical' as const
          }))
        });
      }

    } finally {
      client.release();
    }

    return results;
  }

  /**
   * Check Chanuka-specific data integrity
   */
  private async checkChanukaIntegrity(): Promise<IntegrityCheckResult[]> {
    const client = await this.pool.connect();
    const results: IntegrityCheckResult[] = [];

    try {
      // Check for bills with invalid status transitions
      const invalidStatusResult = await client.query(`
        SELECT id, title, status
        FROM bills
        WHERE status NOT IN ('drafted', 'introduced', 'committee', 'floor', 'passed', 'signed', 'vetoed', 'failed')
        LIMIT 100
      `);

      results.push({
        checkType: 'invalid_bill_status',
        table: 'bills',
        passed: invalidStatusResult.rows.length === 0,
        issueCount: invalidStatusResult.rows.length,
        issues: invalidStatusResult.rows.map(row => ({
          type: 'invalid_data',
          table: 'bills',
          column: 'status',
          rowId: row.id,
          description: `Bill "${row.title}" has invalid status: ${row.status}`,
          severity: 'medium' as const
        }))
      });

      // Check for users with invalid email formats
      const invalidEmailResult = await client.query(`
        SELECT id, email
        FROM users
        WHERE email IS NOT NULL 
          AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        LIMIT 100
      `);

      results.push({
        checkType: 'invalid_email_format',
        table: 'users',
        passed: invalidEmailResult.rows.length === 0,
        issueCount: invalidEmailResult.rows.length,
        issues: invalidEmailResult.rows.map(row => ({
          type: 'invalid_data',
          table: 'users',
          column: 'email',
          rowId: row.id,
          description: `User ${row.id} has invalid email format: ${row.email}`,
          severity: 'medium' as const
        }))
      });

      // Check for engagement metrics consistency
      const inconsistentMetricsResult = await client.query(`
        SELECT id, view_count, comment_count, share_count
        FROM bills
        WHERE view_count < 0 OR comment_count < 0 OR share_count < 0
        LIMIT 100
      `);

      results.push({
        checkType: 'negative_metrics',
        table: 'bills',
        passed: inconsistentMetricsResult.rows.length === 0,
        issueCount: inconsistentMetricsResult.rows.length,
        issues: inconsistentMetricsResult.rows.map(row => ({
          type: 'invalid_data',
          table: 'bills',
          rowId: row.id,
          description: `Bill ${row.id} has negative metrics: views=${row.view_count}, comments=${row.comment_count}, shares=${row.share_count}`,
          severity: 'low' as const
        }))
      });

    } finally {
      client.release();
    }

    return results;
  }

  /**
   * Setup default validation rules
   */
  private setupDefaultValidationRules(): void {
    this.validationRules = [
      // User validation rules
      {
        id: 'users_email_not_null',
        name: 'Users Email Not Null',
        description: 'All users must have an email address',
        table: 'users',
        column: 'email',
        type: 'not_null',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'users_email_format',
        name: 'Users Email Format',
        description: 'User emails must be valid format',
        table: 'users',
        column: 'email',
        type: 'format',
        constraint: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
        severity: 'high',
        enabled: true
      },
      {
        id: 'users_email_unique',
        name: 'Users Email Unique',
        description: 'User emails must be unique',
        table: 'users',
        column: 'email',
        type: 'unique',
        severity: 'critical',
        enabled: true
      },

      // Bill validation rules
      {
        id: 'bills_title_not_null',
        name: 'Bills Title Not Null',
        description: 'All bills must have a title',
        table: 'bills',
        column: 'title',
        type: 'not_null',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'bills_number_unique',
        name: 'Bills Number Unique',
        description: 'Bill numbers must be unique',
        table: 'bills',
        column: 'bill_number',
        type: 'unique',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'bills_engagement_positive',
        name: 'Bills Engagement Metrics Positive',
        description: 'Engagement metrics must be non-negative',
        table: 'bills',
        type: 'check',
        constraint: 'view_count >= 0 AND comment_count >= 0 AND share_count >= 0',
        severity: 'medium',
        enabled: true
      },

      // Comment validation rules
      {
        id: 'comments_content_not_null',
        name: 'Comments Content Not Null',
        description: 'All comments must have content',
        table: 'comments',
        column: 'content',
        type: 'not_null',
        severity: 'high',
        enabled: true
      },
      {
        id: 'comments_bill_reference',
        name: 'Comments Bill Reference',
        description: 'Comments must reference valid bills',
        table: 'comments',
        type: 'foreign_key',
        constraint: 'bill_id REFERENCES bills(id)',
        severity: 'critical',
        enabled: true
      },

      // Sponsor validation rules
      {
        id: 'sponsors_name_not_null',
        name: 'Sponsors Name Not Null',
        description: 'All sponsors must have a name',
        table: 'sponsors',
        column: 'name',
        type: 'not_null',
        severity: 'critical',
        enabled: true
      }
    ];
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    const failedResults = results.filter(r => !r.passed);

    if (failedResults.length === 0) {
      recommendations.push('All validation rules passed. Database integrity is excellent.');
      return recommendations;
    }

    // Group by severity
    const criticalFailures = failedResults.filter(r => {
      const rule = this.validationRules.find(vr => vr.id === r.ruleId);
      return rule?.severity === 'critical';
    });

    const highFailures = failedResults.filter(r => {
      const rule = this.validationRules.find(vr => vr.id === r.ruleId);
      return rule?.severity === 'high';
    });

    if (criticalFailures.length > 0) {
      recommendations.push(`URGENT: ${criticalFailures.length} critical validation failures require immediate attention`);
      recommendations.push('Review and fix critical data integrity issues before proceeding with operations');
    }

    if (highFailures.length > 0) {
      recommendations.push(`${highFailures.length} high-priority validation failures should be addressed soon`);
    }

    // Specific recommendations
    const emailFormatFailures = failedResults.find(r => r.ruleId === 'users_email_format');
    if (emailFormatFailures) {
      recommendations.push('Clean up invalid email addresses in user records');
    }

    const uniqueViolations = failedResults.filter(r => r.ruleId.includes('unique'));
    if (uniqueViolations.length > 0) {
      recommendations.push('Resolve duplicate data issues to maintain data integrity');
    }

    const foreignKeyViolations = failedResults.filter(r => r.ruleId.includes('reference'));
    if (foreignKeyViolations.length > 0) {
      recommendations.push('Fix broken references between related tables');
    }

    return recommendations;
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: Omit<ValidationRule, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.validationRules.push({
      ...rule,
      id
    });

    logger.info('Custom validation rule added', {
      component: 'DatabaseValidation',
      ruleId: id,
      ruleName: rule.name
    });

    return id;
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(ruleId: string): boolean {
    const index = this.validationRules.findIndex(r => r.id === ruleId);
    
    if (index >= 0) {
      this.validationRules.splice(index, 1);
      
      logger.info('Validation rule removed', {
        component: 'DatabaseValidation',
        ruleId
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Get validation rules
   */
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * Enable/disable validation rule
   */
  setValidationRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.validationRules.find(r => r.id === ruleId);
    
    if (rule) {
      rule.enabled = enabled;
      
      logger.info(`Validation rule ${enabled ? 'enabled' : 'disabled'}`, {
        component: 'DatabaseValidation',
        ruleId,
        ruleName: rule.name
      });
      
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
let databaseValidation: DatabaseValidation | null = null;

export function createDatabaseValidation(pool: Pool): DatabaseValidation {
  if (databaseValidation) {
    return databaseValidation;
  }
  
  databaseValidation = new DatabaseValidation(pool);
  return databaseValidation;
}

export function getDatabaseValidation(): DatabaseValidation {
  if (!databaseValidation) {
    throw new Error('Database validation not initialized. Call createDatabaseValidation() first.');
  }
  
  return databaseValidation;
}
