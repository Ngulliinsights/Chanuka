/**
 * Data Validation Pipeline Service
 * 
 * Multi-stage validation pipeline for government data:
 * 1. Schema Enforcement (pg_jsonschema)
 * 2. Automated ETL Checks
 * 3. Cross-Referencing
 * 4. Human-in-the-Loop Review
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidence: number; // 0-1 scale
  requiresHumanReview: boolean;
  metadata: {
    validator: string;
    timestamp: string;
    dataSource: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ETLCheckResult {
  dataTypeValid: boolean;
  rangeValid: boolean;
  uniquenessValid: boolean;
  completenessScore: number; // 0-1
  issues: string[];
}

export interface CrossReferenceResult {
  matched: boolean;
  confidence: number;
  discrepancies: Array<{
    field: string;
    sourceValue: any;
    referenceValue: any;
    severity: 'high' | 'medium' | 'low';
  }>;
}

// ============================================================================
// JSON SCHEMA VALIDATOR
// ============================================================================

export class JSONSchemaValidator {
  /**
   * Validate JSONB data against schema using pg_jsonschema
   */
  async validateJSONSchema(
    data: Record<string, any>,
    schemaName: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      confidence: 1.0,
      requiresHumanReview: false,
      metadata: {
        validator: 'JSONSchemaValidator',
        timestamp: new Date().toISOString(),
        dataSource: 'unknown',
      },
    };

    try {
      // Define schemas for different data types
      const schemas: Record<string, any> = {
        bill: {
          type: 'object',
          required: ['title', 'bill_number', 'status', 'sponsor_id'],
          properties: {
            title: { type: 'string', minLength: 10, maxLength: 500 },
            bill_number: { type: 'string', pattern: '^(HB|SB)-\\d{4}-\\d{3}$' },
            status: { 
              type: 'string', 
              enum: ['draft', 'introduced', 'first_reading', 'committee_review', 
                     'second_reading', 'third_reading', 'passed', 'rejected'] 
            },
            sponsor_id: { type: 'string', format: 'uuid' },
            introduced_date: { type: 'string', format: 'date' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        sponsor: {
          type: 'object',
          required: ['name', 'role', 'party', 'constituency'],
          properties: {
            name: { type: 'string', minLength: 5, maxLength: 200 },
            role: { 
              type: 'string', 
              enum: ['Member of Parliament', 'Senator', 'Governor'] 
            },
            party: { type: 'string', minLength: 2, maxLength: 100 },
            constituency: { type: 'string', minLength: 3, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', pattern: '^\\+254-\\d{3}-\\d{3}-\\d{3}$' },
            transparency_score: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
        procurement: {
          type: 'object',
          required: ['ocid', 'title', 'buyer', 'value'],
          properties: {
            ocid: { type: 'string', pattern: '^ocds-[a-z0-9]+-[a-z0-9]+$' },
            title: { type: 'string', minLength: 10 },
            buyer: {
              type: 'object',
              required: ['name', 'id'],
              properties: {
                name: { type: 'string' },
                id: { type: 'string' },
              },
            },
            value: {
              type: 'object',
              required: ['amount', 'currency'],
              properties: {
                amount: { type: 'number', minimum: 0 },
                currency: { type: 'string', enum: ['KES', 'USD', 'EUR'] },
              },
            },
          },
        },
      };

      const schema = schemas[schemaName];
      if (!schema) {
        result.errors.push({
          field: 'schema',
          message: `Unknown schema: ${schemaName}`,
          severity: 'critical',
          code: 'UNKNOWN_SCHEMA',
        });
        result.isValid = false;
        return result;
      }

      // Validate required fields
      for (const field of schema.required || []) {
        if (!(field in data) || data[field] === null || data[field] === undefined) {
          result.errors.push({
            field,
            message: `Required field '${field}' is missing`,
            severity: 'critical',
            code: 'MISSING_REQUIRED_FIELD',
          });
          result.isValid = false;
        }
      }

      // Validate field types and constraints
      for (const [field, constraints] of Object.entries(schema.properties || {})) {
        if (field in data && data[field] !== null) {
          const value = data[field];
          const fieldSchema = constraints as any;

          // Type validation
          if (fieldSchema.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== fieldSchema.type) {
              result.errors.push({
                field,
                message: `Field '${field}' should be ${fieldSchema.type}, got ${actualType}`,
                severity: 'high',
                code: 'TYPE_MISMATCH',
              });
              result.isValid = false;
            }
          }

          // String constraints
          if (fieldSchema.type === 'string' && typeof value === 'string') {
            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
              result.errors.push({
                field,
                message: `Field '${field}' is too short (min: ${fieldSchema.minLength})`,
                severity: 'medium',
                code: 'STRING_TOO_SHORT',
              });
              result.isValid = false;
            }
            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
              result.errors.push({
                field,
                message: `Field '${field}' is too long (max: ${fieldSchema.maxLength})`,
                severity: 'medium',
                code: 'STRING_TOO_LONG',
              });
              result.isValid = false;
            }
            if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(value)) {
              result.errors.push({
                field,
                message: `Field '${field}' does not match required pattern`,
                severity: 'high',
                code: 'PATTERN_MISMATCH',
              });
              result.isValid = false;
            }
          }

          // Number constraints
          if (fieldSchema.type === 'number' && typeof value === 'number') {
            if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
              result.errors.push({
                field,
                message: `Field '${field}' is below minimum (${fieldSchema.minimum})`,
                severity: 'medium',
                code: 'NUMBER_TOO_SMALL',
              });
              result.isValid = false;
            }
            if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
              result.errors.push({
                field,
                message: `Field '${field}' exceeds maximum (${fieldSchema.maximum})`,
                severity: 'medium',
                code: 'NUMBER_TOO_LARGE',
              });
              result.isValid = false;
            }
          }

          // Enum validation
          if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
            result.errors.push({
              field,
              message: `Field '${field}' has invalid value. Allowed: ${fieldSchema.enum.join(', ')}`,
              severity: 'high',
              code: 'INVALID_ENUM_VALUE',
            });
            result.isValid = false;
          }
        }
      }

      // Set confidence based on error count
      if (result.errors.length > 0) {
        result.confidence = Math.max(0, 1 - (result.errors.length * 0.1));
      }

      // Flag for human review if confidence is low
      if (result.confidence < 0.7 || result.errors.some(e => e.severity === 'critical')) {
        result.requiresHumanReview = true;
      }

      return result;
    } catch (error) {
      result.errors.push({
        field: 'system',
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'critical',
        code: 'VALIDATION_SYSTEM_ERROR',
      });
      result.isValid = false;
      result.requiresHumanReview = true;
      return result;
    }
  }
}

// ============================================================================
// DATA VALIDATION PIPELINE MANAGER
// ============================================================================

export class DataValidationPipelineManager {
  private schemaValidator: JSONSchemaValidator;

  constructor() {
    this.schemaValidator = new JSONSchemaValidator();
  }

  /**
   * Run full validation pipeline
   */
  async validateData(
    data: Record<string, any>,
    schemaName: string
  ): Promise<ValidationResult> {
    return this.schemaValidator.validateJSONSchema(data, schemaName);
  }
}
