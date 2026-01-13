/**
 * VALIDATION MIGRATOR - Type Validation Migration Utilities
 *
 * Utilities for migrating validation logic and schemas to standardized formats
 */

import { BaseEntity } from '../../schema/base-types';

// ============================================================================
// VALIDATION SCHEMA MIGRATION
// ============================================================================

export interface LegacyValidationSchema {
  fields: Record<string, {
    type: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customValidator?: (value: any) => boolean;
  }>;
  rules?: Array<(data: any) => boolean>;
}

export interface StandardValidationSchema {
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    constraints?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      min?: number;
      max?: number;
      custom?: (value: any) => boolean;
    };
  }>;
  additionalRules?: Array<{
    validator: (data: any) => boolean;
    message: string;
  }>;
}

export class ValidationSchemaMigrator {
  public migrateLegacySchema(legacySchema: LegacyValidationSchema): StandardValidationSchema {
    const standardSchema: StandardValidationSchema = {
      properties: {},
      additionalRules: [],
    };

    // Migrate field definitions
    for (const [fieldName, fieldConfig] of Object.entries(legacySchema.fields)) {
      standardSchema.properties[fieldName] = this.migrateFieldConfig(fieldConfig);
    }

    // Migrate rules
    if (legacySchema.rules) {
      standardSchema.additionalRules = legacySchema.rules.map((rule, index) => ({
        validator: rule,
        message: `Rule ${index + 1} failed`,
      }));
    }

    return standardSchema;
  }

  private migrateFieldConfig(fieldConfig: LegacyValidationSchema['fields'][string]): StandardValidationSchema['properties'][string] {
    const typeMap: Record<string, StandardValidationSchema['properties'][string]['type']> = {
      'string': 'string',
      'text': 'string',
      'str': 'string',
      'number': 'number',
      'num': 'number',
      'int': 'number',
      'integer': 'number',
      'boolean': 'boolean',
      'bool': 'boolean',
      'object': 'object',
      'obj': 'object',
      'array': 'array',
      'arr': 'array',
    };

    const standardType = typeMap[fieldConfig.type] || 'string';

    const result: StandardValidationSchema['properties'][string] = {
      type: standardType,
      required: fieldConfig.required || false,
      constraints: {},
    };

    // Migrate constraints
    if (fieldConfig.minLength !== undefined) {
      result.constraints!.minLength = fieldConfig.minLength;
    }

    if (fieldConfig.maxLength !== undefined) {
      result.constraints!.maxLength = fieldConfig.maxLength;
    }

    if (fieldConfig.pattern) {
      result.constraints!.pattern = fieldConfig.pattern;
    }

    if (fieldConfig.customValidator) {
      result.constraints!.custom = fieldConfig.customValidator;
    }

    return result;
  }

  public validateMigratedSchema(schema: StandardValidationSchema, data: any): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    // Validate required fields
    for (const [fieldName, fieldConfig] of Object.entries(schema.properties)) {
      if (fieldConfig.required && !(fieldName in data)) {
        errors[fieldName] = 'Field is required';
      }
    }

    // Validate field types and constraints
    for (const [fieldName, fieldConfig] of Object.entries(schema.properties)) {
      if (fieldName in data) {
        const validationError = this.validateField(data[fieldName], fieldConfig);
        if (validationError) {
          errors[fieldName] = validationError;
        }
      }
    }

    // Validate additional rules
    if (schema.additionalRules) {
      for (const [index, rule] of schema.additionalRules.entries()) {
        if (!rule.validator(data)) {
          errors[`rule_${index}`] = rule.message;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  private validateField(value: any, fieldConfig: StandardValidationSchema['properties'][string]): string | null {
    // Type validation
    switch (fieldConfig.type) {
      case 'string':
        if (typeof value !== 'string') {
          return 'Must be a string';
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return 'Must be a number';
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return 'Must be a boolean';
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return 'Must be an object';
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return 'Must be an array';
        }
        break;
    }

    // Constraint validation
    if (fieldConfig.constraints) {
      if (fieldConfig.type === 'string') {
        if (fieldConfig.constraints.minLength !== undefined &&
            value.length < fieldConfig.constraints.minLength) {
          return `Must be at least ${fieldConfig.constraints.minLength} characters`;
        }

        if (fieldConfig.constraints.maxLength !== undefined &&
            value.length > fieldConfig.constraints.maxLength) {
          return `Must be at most ${fieldConfig.constraints.maxLength} characters`;
        }

        if (fieldConfig.constraints.pattern && !new RegExp(fieldConfig.constraints.pattern).test(value)) {
          return 'Does not match required pattern';
        }
      }

      if (fieldConfig.type === 'number') {
        if (fieldConfig.constraints.min !== undefined && value < fieldConfig.constraints.min) {
          return `Must be at least ${fieldConfig.constraints.min}`;
        }

        if (fieldConfig.constraints.max !== undefined && value > fieldConfig.constraints.max) {
          return `Must be at most ${fieldConfig.constraints.max}`;
        }
      }

      if (fieldConfig.constraints.custom && !fieldConfig.constraints.custom(value)) {
        return 'Does not satisfy custom validation';
      }
    }

    return null;
  }
}

// ============================================================================
// VALIDATION RULE MIGRATION
// ============================================================================

export interface LegacyValidationRule {
  condition: string | ((data: any) => boolean);
  errorMessage: string;
  severity?: 'warn' | 'error';
}

export interface StandardValidationRule {
  validator: (data: any) => boolean;
  message: string;
  severity: 'warn' | 'error';
  code?: string;
}

export class ValidationRuleMigrator {
  public migrateLegacyRules(legacyRules: LegacyValidationRule[]): StandardValidationRule[] {
    return legacyRules.map(rule => this.migrateLegacyRule(rule));
  }

  private migrateLegacyRule(legacyRule: LegacyValidationRule): StandardValidationRule {
    let validator: (data: any) => boolean;

    if (typeof legacyRule.condition === 'function') {
      validator = legacyRule.condition;
    } else {
      // Simple condition parsing (could be enhanced with a proper parser)
      validator = (data: any) => {
        try {
          // Simple evaluation - in production, use a proper expression parser
          return eval(legacyRule.condition);
        } catch (error) {
          console.warn(`Failed to evaluate condition: ${legacyRule.condition}`, error);
          return false;
        }
      };
    }

    return {
      validator,
      message: legacyRule.errorMessage,
      severity: legacyRule.severity || 'error',
      code: this.generateRuleCode(legacyRule.errorMessage),
    };
  }

  private generateRuleCode(message: string): string {
    return 'VAL_' + message
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .substring(0, 20);
  }

  public createValidationRuleSet(rules: StandardValidationRule[]): {
    validate: (data: any) => { isValid: boolean; errors: StandardValidationRule[] };
    getRules: () => StandardValidationRule[];
  } {
    return {
      validate: (data: any) => {
        const failedRules = rules.filter(rule => !rule.validator(data));
        return {
          isValid: failedRules.length === 0,
          errors: failedRules,
        };
      },
      getRules: () => [...rules],
    };
  }
}

// ============================================================================
// VALIDATION MIGRATION UTILITIES
// ============================================================================

export class ValidationMigrationUtils {
  private schemaMigrator: ValidationSchemaMigrator;
  private ruleMigrator: ValidationRuleMigrator;

  constructor() {
    this.schemaMigrator = new ValidationSchemaMigrator();
    this.ruleMigrator = new ValidationRuleMigrator();
  }

  public migrateCompleteValidationSystem(legacySystem: {
    schemas?: LegacyValidationSchema[];
    rules?: LegacyValidationRule[];
  }): {
    standardSchemas: StandardValidationSchema[];
    standardRules: StandardValidationRule[];
  } {
    return {
      standardSchemas: legacySystem.schemas
        ? legacySystem.schemas.map(s => this.schemaMigrator.migrateLegacySchema(s))
        : [],
      standardRules: legacySystem.rules
        ? this.ruleMigrator.migrateLegacyRules(legacySystem.rules)
        : [],
    };
  }

  public createMigratedValidator(
    schema: StandardValidationSchema,
    rules: StandardValidationRule[]
  ): (data: any) => { isValid: boolean; errors: Record<string, string> } {
    return (data: any) => {
      const schemaValidation = this.schemaMigrator.validateMigratedSchema(schema, data);
      const ruleValidation = this.ruleMigrator.createValidationRuleSet(rules).validate(data);

      const allErrors: Record<string, string> = { ...schemaValidation.errors };

      // Add rule errors
      ruleValidation.errors.forEach((error, index) => {
        allErrors[`rule_${index}`] = error.message;
      });

      return {
        isValid: schemaValidation.isValid && ruleValidation.isValid,
        errors: allErrors,
      };
    };
  }

  public generateValidationDocumentation(
    schema: StandardValidationSchema,
    rules: StandardValidationRule[]
  ): string {
    let documentation = '# Validation Documentation\n\n';

    documentation += '## Schema Properties\n\n';
    for (const [fieldName, fieldConfig] of Object.entries(schema.properties)) {
      documentation += `### ${fieldName}\n`;
      documentation += `- Type: ${fieldConfig.type}\n`;
      documentation += `- Required: ${fieldConfig.required}\n`;

      if (fieldConfig.constraints) {
        documentation += '- Constraints:\n';
        for (const [constraint, value] of Object.entries(fieldConfig.constraints)) {
          if (constraint !== 'custom') {
            documentation += `  - ${constraint}: ${value}\n`;
          }
        }
      }

      documentation += '\n';
    }

    documentation += '## Validation Rules\n\n';
    rules.forEach((rule, index) => {
      documentation += `### Rule ${index + 1} (${rule.severity})\n`;
      documentation += `- Message: ${rule.message}\n`;
      if (rule.code) {
        documentation += `- Code: ${rule.code}\n`;
      }
      documentation += '\n';
    });

    return documentation;
  }
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const ValidationMigrator = {
  ValidationSchemaMigrator,
  ValidationRuleMigrator,
  ValidationMigrationUtils,
};

export type {
  LegacyValidationSchema,
  StandardValidationSchema,
  LegacyValidationRule,
  StandardValidationRule,
};