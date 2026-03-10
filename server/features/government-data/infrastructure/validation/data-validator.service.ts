/**
 * Government Data Validation Service
 * Comprehensive validation for government data integrity and quality
 */

import { logger } from '@server/infrastructure/observability';
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { GovernmentDataCreateInput, GovernmentDataUpdateInput } from '../../domain/repositories/government-data.repository';

// ==========================================================================
// Types
// ==========================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 quality score
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'length' | 'custom';
  validator: (value: any, data: any) => ValidationResult | Promise<ValidationResult>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

// ==========================================================================
// Data Validator Service
// ==========================================================================

export class DataValidatorService {
  private validationRules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Validate government data for creation
   */
  async validateCreate(data: GovernmentDataCreateInput): AsyncServiceResult<ValidationResult> {
    return safeAsync(async () => {
      const logContext = {
        component: 'DataValidatorService',
        operation: 'validateCreate',
        dataType: data.data_type,
        source: data.source,
      };
      logger.debug(logContext, 'Validating government data for creation');

      const result = await this.runValidation(data, 'create');
      
      logger.debug({
        ...logContext,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        score: result.score,
      }, 'Validation completed');

      return result;
    }, {
      service: 'DataValidatorService',
      operation: 'validateCreate',
      context: { dataType: data.data_type, source: data.source },
    });
  }

  /**
   * Validate government data for update
   */
  async validateUpdate(data: GovernmentDataUpdateInput): AsyncServiceResult<ValidationResult> {
    return safeAsync(async () => {
      const logContext = {
        component: 'DataValidatorService',
        operation: 'validateUpdate',
      };
      logger.debug(logContext, 'Validating government data for update');

      const result = await this.runValidation(data, 'update');
      
      logger.debug({
        ...logContext,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        score: result.score,
      }, 'Update validation completed');

      return result;
    }, {
      service: 'DataValidatorService',
      operation: 'validateUpdate',
    });
  }

  /**
   * Run validation rules against data
   */
  private async runValidation(data: any, context: 'create' | 'update'): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalScore = 100;

    // Get applicable rules
    const rules = this.getApplicableRules(data, context);

    // Run each validation rule
    for (const rule of rules) {
      try {
        const fieldValue = this.getFieldValue(data, rule.field);
        const ruleResult = await rule.validator(fieldValue, data);

        // Merge results
        errors.push(...ruleResult.errors);
        warnings.push(...ruleResult.warnings);

        // Adjust score based on errors
        if (ruleResult.errors.length > 0) {
          const penalty = this.getScorePenalty(rule.severity, ruleResult.errors.length);
          totalScore = Math.max(0, totalScore - penalty);
        }
      } catch (error) {
        logger.warn({
          component: 'DataValidatorService',
          rule: rule.field,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Validation rule failed');

        errors.push({
          field: rule.field,
          code: 'VALIDATION_RULE_ERROR',
          message: `Validation rule failed: ${rule.message}`,
          severity: 'medium',
        });
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      score: Math.round(totalScore),
    };
  }

  /**
   * Get applicable validation rules for the data and context
   */
  private getApplicableRules(data: any, context: 'create' | 'update'): ValidationRule[] {
    const dataType = data.data_type || 'default';
    const rules: ValidationRule[] = [];

    // Add general rules
    const generalRules = this.validationRules.get('general') || [];
    rules.push(...generalRules);

    // Add data type specific rules
    const typeRules = this.validationRules.get(dataType) || [];
    rules.push(...typeRules);

    // Filter rules based on context
    return rules.filter(rule => {
      if (context === 'update' && rule.type === 'required') {
        // Required fields are not enforced on updates
        return false;
      }
      return true;
    });
  }

  /**
   * Get field value using dot notation
   */
  private getFieldValue(data: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  /**
   * Calculate score penalty based on error severity
   */
  private getScorePenalty(severity: ValidationError['severity'], errorCount: number): number {
    const basePenalties = {
      low: 2,
      medium: 5,
      high: 15,
      critical: 30,
    };
    return basePenalties[severity] * errorCount;
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // General validation rules
    this.validationRules.set('general', [
      {
        field: 'data_type',
        type: 'required',
        severity: 'critical',
        message: 'Data type is required',
        validator: (value) => ({
          isValid: !!value && typeof value === 'string' && value.trim().length > 0,
          errors: !value ? [{
            field: 'data_type',
            code: 'REQUIRED_FIELD_MISSING',
            message: 'Data type is required',
            severity: 'critical' as const,
          }] : [],
          warnings: [],
          score: 100,
        }),
      },
      {
        field: 'source',
        type: 'required',
        severity: 'critical',
        message: 'Source is required',
        validator: (value) => ({
          isValid: !!value && typeof value === 'string' && value.trim().length > 0,
          errors: !value ? [{
            field: 'source',
            code: 'REQUIRED_FIELD_MISSING',
            message: 'Source is required',
            severity: 'critical' as const,
          }] : [],
          warnings: [],
          score: 100,
        }),
      },
      {
        field: 'title',
        type: 'length',
        severity: 'medium',
        message: 'Title should be between 10 and 500 characters',
        validator: (value) => {
          const errors: ValidationError[] = [];
          const warnings: ValidationWarning[] = [];

          if (value && typeof value === 'string') {
            if (value.length < 10) {
              warnings.push({
                field: 'title',
                code: 'TITLE_TOO_SHORT',
                message: 'Title is quite short, consider adding more descriptive text',
                suggestion: 'Aim for at least 10 characters',
              });
            }
            if (value.length > 500) {
              errors.push({
                field: 'title',
                code: 'TITLE_TOO_LONG',
                message: 'Title exceeds maximum length of 500 characters',
                severity: 'medium',
              });
            }
          }

          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: 100,
          };
        },
      },
      {
        field: 'content',
        type: 'required',
        severity: 'high',
        message: 'Content is required',
        validator: (value) => {
          const errors: ValidationError[] = [];
          const warnings: ValidationWarning[] = [];

          if (!value) {
            errors.push({
              field: 'content',
              code: 'REQUIRED_FIELD_MISSING',
              message: 'Content is required',
              severity: 'high',
            });
          } else {
            // Check content quality
            const contentStr = typeof value === 'string' ? value : JSON.stringify(value);
            if (contentStr.length < 50) {
              warnings.push({
                field: 'content',
                code: 'CONTENT_TOO_SHORT',
                message: 'Content appears to be very brief',
                suggestion: 'Consider adding more detailed information',
              });
            }
          }

          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: 100,
          };
        },
      },
      {
        field: 'external_id',
        type: 'format',
        severity: 'medium',
        message: 'External ID should be a valid identifier',
        validator: (value) => {
          const errors: ValidationError[] = [];
          const warnings: ValidationWarning[] = [];

          if (value && typeof value === 'string') {
            // Check for valid identifier format
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
              warnings.push({
                field: 'external_id',
                code: 'INVALID_ID_FORMAT',
                message: 'External ID contains special characters',
                suggestion: 'Use only letters, numbers, hyphens, and underscores',
              });
            }
            if (value.length > 255) {
              errors.push({
                field: 'external_id',
                code: 'ID_TOO_LONG',
                message: 'External ID exceeds maximum length of 255 characters',
                severity: 'medium',
              });
            }
          }

          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: 100,
          };
        },
      },
    ]);

    // Bill-specific validation rules
    this.validationRules.set('bill', [
      {
        field: 'content.bill_number',
        type: 'format',
        severity: 'high',
        message: 'Bill number should follow standard format',
        validator: (value, data) => {
          const errors: ValidationError[] = [];
          const warnings: ValidationWarning[] = [];

          const billNumber = data.content?.bill_number || data.external_id;
          if (billNumber && typeof billNumber === 'string') {
            // Check for standard Kenyan bill number format
            const billNumberPattern = /^(National Assembly|Senate) Bill No\. \d+ of \d{4}$/i;
            if (!billNumberPattern.test(billNumber)) {
              warnings.push({
                field: 'content.bill_number',
                code: 'NON_STANDARD_FORMAT',
                message: 'Bill number does not follow standard Kenyan format',
                suggestion: 'Expected format: "National Assembly Bill No. X of YYYY"',
              });
            }
          }

          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: 100,
          };
        },
      },
      {
        field: 'content.sponsor',
        type: 'required',
        severity: 'medium',
        message: 'Bill sponsor information is recommended',
        validator: (value, data) => {
          const warnings: ValidationWarning[] = [];

          const sponsor = data.content?.sponsor;
          if (!sponsor) {
            warnings.push({
              field: 'content.sponsor',
              code: 'MISSING_SPONSOR_INFO',
              message: 'Bill sponsor information is missing',
              suggestion: 'Include sponsor name and details for better tracking',
            });
          }

          return {
            isValid: true,
            errors: [],
            warnings,
            score: 100,
          };
        },
      },
    ]);

    // Legal document specific rules
    this.validationRules.set('legal_document', [
      {
        field: 'content.citation',
        type: 'format',
        severity: 'medium',
        message: 'Legal citation should follow standard format',
        validator: (value, data) => {
          const warnings: ValidationWarning[] = [];

          const citation = data.content?.citation;
          if (citation && typeof citation === 'string') {
            // Basic citation format check
            if (!/\[\d{4}\]/.test(citation)) {
              warnings.push({
                field: 'content.citation',
                code: 'NON_STANDARD_CITATION',
                message: 'Citation does not appear to follow standard format',
                suggestion: 'Include year in brackets, e.g., [2024]',
              });
            }
          }

          return {
            isValid: true,
            errors: [],
            warnings,
            score: 100,
          };
        },
      },
    ]);

    logger.info({
      component: 'DataValidatorService',
      ruleCount: Array.from(this.validationRules.values()).reduce((sum, rules) => sum + rules.length, 0),
    }, 'Initialized validation rules');
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(dataType: string, rule: ValidationRule): void {
    const existingRules = this.validationRules.get(dataType) || [];
    existingRules.push(rule);
    this.validationRules.set(dataType, existingRules);

    logger.debug({
      component: 'DataValidatorService',
      dataType,
      field: rule.field,
    }, 'Added custom validation rule');
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalRules: number;
    rulesByType: Record<string, number>;
    rulesBySeverity: Record<string, number>;
  } {
    let totalRules = 0;
    const rulesByType: Record<string, number> = {};
    const rulesBySeverity: Record<string, number> = {};

    for (const [dataType, rules] of this.validationRules.entries()) {
      totalRules += rules.length;
      rulesByType[dataType] = rules.length;

      for (const rule of rules) {
        rulesBySeverity[rule.severity] = (rulesBySeverity[rule.severity] || 0) + 1;
      }
    }

    return {
      totalRules,
      rulesByType,
      rulesBySeverity,
    };
  }
}

// Export singleton instance
export const dataValidatorService = new DataValidatorService();