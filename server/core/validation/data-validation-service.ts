import pkg from 'pg';
import { logger } from '@shared/core';
const { Pool } = pkg;
import type { Pool as PoolType } from 'pg';

export interface ValidationRule {
  name: string;
  description: string;
  query: string;
  severity: 'error' | 'warning' | 'info';
  threshold?: number;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  count?: number;
  details?: any[];
}

export interface ValidationSummary {
  totalRules: number;
  passed: number;
  warnings: number;
  errors: number;
  results: ValidationResult[];
}

export class DataValidationService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
  }

  /**
   * Define validation rules for database integrity
   */
  private getValidationRules(): ValidationRule[] {
    return [
      // Foreign key integrity checks
      {
        name: 'orphaned_bill_comments',
        description: 'Check for bill comments without corresponding bills',
        query: `
          SELECT bc.id, bc.bill_id, bc.content
          FROM bill_comments bc
          LEFT JOIN bills b ON bc.bill_id = b.id
          WHERE b.id IS NULL
        `,
        severity: 'error'
      },
      {
        name: 'orphaned_bill_engagement',
        description: 'Check for bill engagement records without corresponding bills',
        query: `
          SELECT be.id, be.bill_id, be.user_id
          FROM bill_engagement be
          LEFT JOIN bills b ON be.bill_id = b.id
          WHERE b.id IS NULL
        `,
        severity: 'error'
      },
      {
        name: 'orphaned_user_profiles',
        description: 'Check for user profiles without corresponding users',
        query: `
          SELECT up.id, up.user_id
          FROM user_profiles up
          LEFT JOIN users u ON up.user_id = u.id
          WHERE u.id IS NULL
        `,
        severity: 'error'
      },
      {
        name: 'orphaned_notifications',
        description: 'Check for notifications without corresponding users',
        query: `
          SELECT n.id, n.user_id, n.type
          FROM notifications n
          LEFT JOIN users u ON n.user_id = u.id
          WHERE u.id IS NULL
        `,
        severity: 'error'
      },
      {
        name: 'orphaned_bill_sponsorships',
        description: 'Check for bill sponsorships without corresponding bills or sponsors',
        query: `
          SELECT bs.id, bs.bill_id, bs.sponsor_id
          FROM bill_sponsorships bs
          LEFT JOIN bills b ON bs.bill_id = b.id
          LEFT JOIN sponsors s ON bs.sponsor_id = s.id
          WHERE b.id IS NULL OR s.id IS NULL
        `,
        severity: 'error'
      },

      // Data consistency checks
      {
        name: 'bills_without_titles',
        description: 'Check for bills without titles',
        query: `
          SELECT id, bill_number, status
          FROM bills
          WHERE title IS NULL OR title = ''
        `,
        severity: 'warning'
      },
      {
        name: 'users_without_names',
        description: 'Check for users without names',
        query: `
          SELECT id, email, role
          FROM users
          WHERE name IS NULL OR name = ''
        `,
        severity: 'warning'
      },
      {
        name: 'bills_with_future_dates',
        description: 'Check for bills with future introduced dates',
        query: `
          SELECT id, title, introduced_date
          FROM bills
          WHERE introduced_date > NOW()
        `,
        severity: 'warning'
      },
      {
        name: 'negative_engagement_scores',
        description: 'Check for negative engagement scores',
        query: `
          SELECT id, bill_id, user_id, engagement_score
          FROM bill_engagement
          WHERE engagement_score < 0
        `,
        severity: 'warning'
      },

      // Performance and optimization checks
      {
        name: 'bills_without_search_vectors',
        description: 'Check for bills without search vectors (if search is enabled)',
        query: `
          SELECT id, title
          FROM bills
          WHERE search_vector IS NULL
          LIMIT 10
        `,
        severity: 'info'
      },
      {
        name: 'inactive_users_with_recent_activity',
        description: 'Check for inactive users with recent activity',
        query: `
          SELECT u.id, u.email, u.is_active, u.last_login_at
          FROM users u
          WHERE u.is_active = false
          AND u.last_login_at > NOW() - INTERVAL '30 days'
        `,
        severity: 'warning'
      },

      // Security and data quality checks
      {
        name: 'users_without_password_hash',
        description: 'Check for users without password hashes',
        query: `
          SELECT id, email, role
          FROM users
          WHERE password_hash IS NULL OR password_hash = ''
        `,
        severity: 'error'
      },
      {
        name: 'duplicate_user_emails',
        description: 'Check for duplicate user email addresses',
        query: `
          SELECT email, COUNT(*) as count
          FROM users
          WHERE email IS NOT NULL
          GROUP BY email
          HAVING COUNT(*) > 1
        `,
        severity: 'error'
      },
      {
        name: 'bills_with_excessive_view_counts',
        description: 'Check for bills with suspiciously high view counts',
        query: `
          SELECT id, title, view_count
          FROM bills
          WHERE view_count > 100000
        `,
        severity: 'warning',
        threshold: 5
      },

      // Content moderation checks
      {
        name: 'unmoderated_flagged_content',
        description: 'Check for flagged content awaiting moderation',
        query: `
          SELECT content_type, content_id, flag_reasons, created_at
          FROM moderation_queue
          WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '24 hours'
        `,
        severity: 'warning'
      },
      {
        name: 'high_priority_moderation_queue',
        description: 'Check for high priority items in moderation queue',
        query: `
          SELECT id, content_type, content_id, priority, created_at
          FROM moderation_queue
          WHERE status = 'pending'
          AND priority >= 4
        `,
        severity: 'error'
      },

      // Analytics and reporting checks
      {
        name: 'stale_analytics_data',
        description: 'Check for stale analytics data',
        query: `
          SELECT MAX(date) as latest_date
          FROM analytics_daily_summary
          WHERE date < CURRENT_DATE - INTERVAL '2 days'
        `,
        severity: 'warning'
      },
      {
        name: 'missing_user_activity_summaries',
        description: 'Check for users missing recent activity summaries',
        query: `
          SELECT u.id, u.email, MAX(uas.date) as latest_activity
          FROM users u
          LEFT JOIN user_activity_summary uas ON u.id = uas.user_id
          WHERE u.is_active = true
          AND u.last_login_at > NOW() - INTERVAL '7 days'
          GROUP BY u.id, u.email
          HAVING MAX(uas.date) IS NULL OR MAX(uas.date) < CURRENT_DATE - INTERVAL '3 days'
          LIMIT 10
        `,
        severity: 'info'
      }
    ];
  }

  /**
   * Run a single validation rule
   */
  async runValidationRule(rule: ValidationRule): Promise<ValidationResult> {
    try {
      const result = await this.pool.query(rule.query);
      const count = result.rows.length;
      
      let passed = true;
      let message = `${rule.description}: OK`;

      if (count > 0) {
        if (rule.severity === 'error') {
          passed = false;
          message = `${rule.description}: Found ${count} issue(s)`;
        } else if (rule.severity === 'warning') {
          passed = rule.threshold ? count <= rule.threshold : false;
          message = `${rule.description}: Found ${count} issue(s)${rule.threshold ? ` (threshold: ${rule.threshold})` : ''}`;
        } else {
          message = `${rule.description}: Found ${count} item(s)`;
        }
      }

      return {
        rule: rule.name,
        passed,
        severity: rule.severity,
        message,
        count,
        details: result.rows.slice(0, 5) // Limit details to first 5 rows
      };
    } catch (error) {
      return {
        rule: rule.name,
        passed: false,
        severity: 'error',
        message: `${rule.description}: Validation failed - ${error instanceof Error ? error.message : String(error)}`,
        count: 0
      };
    }
  }

  /**
   * Run all validation rules
   */
  async runAllValidations(): Promise<ValidationSummary> {
    const rules = this.getValidationRules();
    const results: ValidationResult[] = [];

    console.log(`Running ${rules.length} validation rules...`);

    for (const rule of rules) {
      console.log(`Checking: ${rule.description}`);
      const result = await this.runValidationRule(rule);
      results.push(result);
    }

    const summary: ValidationSummary = {
      totalRules: rules.length,
      passed: results.filter(r => r.passed).length,
      warnings: results.filter(r => r.severity === 'warning' && !r.passed).length,
      errors: results.filter(r => r.severity === 'error' && !r.passed).length,
      results
    };

    return summary;
  }

  /**
   * Run specific validation rules by name
   */
  async runSpecificValidations(ruleNames: string[]): Promise<ValidationSummary> {
    const allRules = this.getValidationRules();
    const rules = allRules.filter(rule => ruleNames.includes(rule.name));
    
    if (rules.length === 0) {
      throw new Error(`No validation rules found matching: ${ruleNames.join(', ')}`);
    }

    const results: ValidationResult[] = [];

    for (const rule of rules) {
      const result = await this.runValidationRule(rule);
      results.push(result);
    }

    const summary: ValidationSummary = {
      totalRules: rules.length,
      passed: results.filter(r => r.passed).length,
      warnings: results.filter(r => r.severity === 'warning' && !r.passed).length,
      errors: results.filter(r => r.severity === 'error' && !r.passed).length,
      results
    };

    return summary;
  }

  /**
   * Get list of available validation rules
   */
  getAvailableRules(): { name: string; description: string; severity: string }[] {
    return this.getValidationRules().map(rule => ({
      name: rule.name,
      description: rule.description,
      severity: rule.severity
    }));
  }

  /**
   * Fix common data integrity issues automatically
   */
  async autoFixIssues(dryRun: boolean = true): Promise<{ fixed: number; errors: string[] }> {
    const fixes: { description: string; query: string }[] = [
      {
        description: 'Remove orphaned bill comments',
        query: `
          DELETE FROM bill_comments
          WHERE id IN (
            SELECT bc.id
            FROM bill_comments bc
            LEFT JOIN bills b ON bc.bill_id = b.id
            WHERE b.id IS NULL
          )
        `
      },
      {
        description: 'Remove orphaned bill engagement records',
        query: `
          DELETE FROM bill_engagement
          WHERE id IN (
            SELECT be.id
            FROM bill_engagement be
            LEFT JOIN bills b ON be.bill_id = b.id
            WHERE b.id IS NULL
          )
        `
      },
      {
        description: 'Remove orphaned user profiles',
        query: `
          DELETE FROM user_profiles
          WHERE id IN (
            SELECT up.id
            FROM user_profiles up
            LEFT JOIN users u ON up.user_id = u.id
            WHERE u.id IS NULL
          )
        `
      },
      {
        description: 'Remove orphaned notifications',
        query: `
          DELETE FROM notifications
          WHERE id IN (
            SELECT n.id
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE u.id IS NULL
          )
        `
      }
    ];

    let fixed = 0;
    const errors: string[] = [];

    for (const fix of fixes) {
      try {
        if (dryRun) {
          // Count what would be fixed
          const countQuery = fix.query.replace(/DELETE FROM/, 'SELECT COUNT(*) as count FROM');
          const result = await this.pool.query(countQuery);
          const count = parseInt(result.rows[0]?.count || '0');
          if (count > 0) {
            console.log(`Would fix: ${fix.description} (${count} records)`);
            fixed += count;
          }
        } else {
          const result = await this.pool.query(fix.query);
          const rowCount = result.rowCount || 0;
          if (rowCount > 0) {
            console.log(`Fixed: ${fix.description} (${rowCount} records)`);
            fixed += rowCount;
          }
        }
      } catch (error) {
        const errorMsg = `Failed to fix ${fix.description}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { fixed, errors };
  }
}











































