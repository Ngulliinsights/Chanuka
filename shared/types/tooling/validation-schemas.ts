// ============================================================================
// VALIDATION SCHEMAS CODE GENERATION
// ============================================================================
// System for generating validation schemas from TypeScript types

import { GeneratedType, SchemaDefinition, SchemaField, SchemaFieldType } from './type-generation';

/**
 * Validation schema types supported
 */
export type ValidationSchemaType = 'zod' | 'joi' | 'yup' | 'ajv' | 'custom';

/**
 * Validation schema configuration
 */
export interface ValidationSchemaConfig {
  schemaType: ValidationSchemaType;
  outputDir: string;
  importPath?: string;
  generateRuntimeValidation?: boolean;
  generateTypeGuards?: boolean;
  strictMode?: boolean;
  coerceTypes?: boolean;
}

/**
 * Generated validation schema
 */
export interface GeneratedValidationSchema {
  name: string;
  content: string;
  filePath: string;
  schemaType: ValidationSchemaType;
  dependencies: string[];
  metadata: {
    sourceType: string;
    generatedAt: string;
    version: string;
  };
}

/**
 * Validation schema generation result
 */
export interface ValidationSchemaGenerationResult {
  success: boolean;
  generatedSchemas: GeneratedValidationSchema[];
  warnings: string[];
  errors: string[];
  stats: {
    totalSchemas: number;
    totalFields: number;
    generationTimeMs: number;
  };
}

/**
 * Validation schema service interface
 */
export interface ValidationSchemaService {
  generateFromTypeDefinition(typeDef: GeneratedType, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult>;
  generateFromSchemaDefinition(schema: SchemaDefinition, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult>;
  generateFromTypeScriptInterface(iface: object, name: string, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult>;
  validateGeneratedSchemas(schemas: GeneratedValidationSchema[]): Promise<SchemaValidationResult>;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
}

/**
 * Schema validation error
 */
export interface SchemaValidationError {
  schemaName: string;
  fieldName?: string;
  message: string;
  severity: 'error' | 'critical';
  code: string;
}

/**
 * Schema validation warning
 */
export interface SchemaValidationWarning {
  schemaName: string;
  fieldName?: string;
  message: string;
  severity: 'warning' | 'info';
  code: string;
}

/**
 * Base validation schema generator
 */
export abstract class BaseValidationSchemaGenerator implements ValidationSchemaService {
  protected schemaType: ValidationSchemaType;

  constructor(schemaType: ValidationSchemaType) {
    this.schemaType = schemaType;
  }

  protected getImportStatement(config: ValidationSchemaConfig): string {
    const importPath = config.importPath ?? this.getDefaultImportPath(config.schemaType);

    switch (config.schemaType) {
      case 'zod':
        return `import { z } from '${importPath}'`;
      case 'joi':
        return `import Joi from '${importPath}'`;
      case 'yup':
        return `import * as yup from '${importPath}'`;
      case 'ajv':
        return `import Ajv from '${importPath}'`;
      case 'custom':
        return `// Custom validation schema`;
      default:
        return `// Unknown schema type`;
    }
  }

  protected getDefaultImportPath(schemaType: ValidationSchemaType): string {
    const importPaths: Record<ValidationSchemaType, string> = {
      'zod': 'zod',
      'joi': 'joi',
      'yup': 'yup',
      'ajv': 'ajv',
      'custom': ''
    };

    return importPaths[schemaType];
  }

  protected mapTypeToSchemaType(fieldType: string, schemaType: ValidationSchemaType): string {
    const typeMappings: Record<ValidationSchemaType, Record<string, string>> = {
      'zod': {
        'string': 'z.string()',
        'number': 'z.number()',
        'boolean': 'z.boolean()',
        'Date': 'z.date()',
        'Record<string, unknown>': 'z.record(z.unknown())',
        'unknown[]': 'z.array(z.unknown())',
        'unknown': 'z.unknown()'
      },
      'joi': {
        'string': 'Joi.string()',
        'number': 'Joi.number()',
        'boolean': 'Joi.boolean()',
        'Date': 'Joi.date()',
        'Record<string, unknown>': 'Joi.object()',
        'unknown[]': 'Joi.array()',
        'unknown': 'Joi.any()'
      },
      'yup': {
        'string': 'yup.string()',
        'number': 'yup.number()',
        'boolean': 'yup.boolean()',
        'Date': 'yup.date()',
        'Record<string, unknown>': 'yup.object()',
        'unknown[]': 'yup.array()',
        'unknown': 'yup.mixed()'
      },
      'ajv': {
        'string': '{ type: "string" }',
        'number': '{ type: "number" }',
        'boolean': '{ type: "boolean" }',
        'Date': '{ type: "string", format: "date-time" }',
        'Record<string, unknown>': '{ type: "object" }',
        'unknown[]': '{ type: "array" }',
        'unknown': '{}'
      },
      'custom': {
        'string': 'string',
        'number': 'number',
        'boolean': 'boolean',
        'Date': 'Date',
        'Record<string, unknown>': 'object',
        'unknown[]': 'array',
        'unknown': 'any'
      }
    };

    return typeMappings[schemaType][fieldType] ?? typeMappings[schemaType]['unknown'];
  }

  protected addFieldValidation(field: SchemaField, schemaType: ValidationSchemaType, baseSchema: string): string {
    if (!field.validation && (!field.constraints || field.constraints.length === 0)) {
      return baseSchema;
    }

    const validations: string[] = [];

    // Add constraints
    if (field.constraints) {
      field.constraints.forEach(constraint => {
        switch (constraint.type) {
          case 'min':
            if (schemaType === 'zod') {
              validations.push(`.min(${constraint.value})`);
            } else if (schemaType === 'joi') {
              validations.push(`.min(${constraint.value})`);
            } else if (schemaType === 'yup') {
              validations.push(`.min(${constraint.value})`);
            }
            break;
          case 'max':
            if (schemaType === 'zod') {
              validations.push(`.max(${constraint.value})`);
            } else if (schemaType === 'joi') {
              validations.push(`.max(${constraint.value})`);
            } else if (schemaType === 'yup') {
              validations.push(`.max(${constraint.value})`);
            }
            break;
          case 'minLength':
            if (schemaType === 'zod') {
              validations.push(`.min(${constraint.value}, "${constraint.message ?? 'Too short'}")`);
            } else if (schemaType === 'joi') {
              validations.push(`.min(${constraint.value})`);
            } else if (schemaType === 'yup') {
              validations.push(`.min(${constraint.value}, "${constraint.message ?? 'Too short'}")`);
            }
            break;
          case 'maxLength':
            if (schemaType === 'zod') {
              validations.push(`.max(${constraint.value}, "${constraint.message ?? 'Too long'}")`);
            } else if (schemaType === 'joi') {
              validations.push(`.max(${constraint.value})`);
            } else if (schemaType === 'yup') {
              validations.push(`.max(${constraint.value}, "${constraint.message ?? 'Too long'}")`);
            }
            break;
          case 'pattern':
            if (schemaType === 'zod') {
              validations.push(`.regex(new RegExp('${constraint.value}'), "${constraint.message ?? 'Invalid format'}")`);
            } else if (schemaType === 'joi') {
              validations.push(`.pattern(new RegExp('${constraint.value}'))`);
            } else if (schemaType === 'yup') {
              validations.push(`.matches(new RegExp('${constraint.value}'), "${constraint.message ?? 'Invalid format'}")`);
            }
            break;
        }
      });
    }

    // Add validation rules
    if (field.validation) {
      if (field.validation.required && schemaType !== 'ajv') {
        validations.unshift('.required()');
      }
    }

    if (validations.length === 0) {
      return baseSchema;
    }

    return baseSchema + validations.join('');
  }

  // Abstract methods to be implemented by concrete generators
  abstract generateFromTypeDefinition(typeDef: GeneratedType, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult>;
  abstract generateFromSchemaDefinition(schema: SchemaDefinition, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult>;
  abstract generateFromTypeScriptInterface(iface: object, name: string, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult>;
  abstract validateGeneratedSchemas(schemas: GeneratedValidationSchema[]): Promise<SchemaValidationResult>;
}

/**
 * Zod schema generator implementation
 */
export class ZodSchemaGenerator extends BaseValidationSchemaGenerator {
  constructor() {
    super('zod');
  }

  async generateFromTypeDefinition(typeDef: GeneratedType, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult> {
    const startTime = Date.now();
    const result: ValidationSchemaGenerationResult = {
      success: true,
      generatedSchemas: [],
      warnings: [],
      errors: [],
      stats: {
        totalSchemas: 0,
        totalFields: 0,
        generationTimeMs: 0
      }
    };

    try {
      // Parse the type definition to extract fields
      const fields = this.parseTypeDefinition(typeDef.content);

      if (fields.length === 0) {
        result.warnings.push('No fields found in type definition');
        result.stats.generationTimeMs = Date.now() - startTime;
        return result;
      }

      const schemaContent = this.generateZodSchema(typeDef.name, fields, config);
      const filePath = `${config.outputDir}/${typeDef.name}.schema.ts`;

      const generatedSchema: GeneratedValidationSchema = {
        name: `${typeDef.name}Schema`,
        content: schemaContent,
        filePath: filePath,
        schemaType: 'zod',
        dependencies: ['zod', typeDef.name],
        metadata: {
          sourceType: 'type-definition',
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      result.generatedSchemas.push(generatedSchema);
      result.stats.totalSchemas = 1;
      result.stats.totalFields = fields.length;
      result.stats.generationTimeMs = Date.now() - startTime;

    } catch (error) {
      result.success = false;
      result.errors.push(`Schema generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.stats.generationTimeMs = Date.now() - startTime;
    }

    return result;
  }

  protected parseTypeDefinition(content: string): SchemaField[] {
    // Simple parser to extract fields from TypeScript interface
    const fieldRegex = /\s+(\w+)\??:\s*([^;]+);/g;
    const fields: SchemaField[] = [];

    let match;
    while ((match = fieldRegex.exec(content)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2]?.trim() ?? 'unknown';
      const isRequired = !match[0].includes('?');

      fields.push({
        name: fieldName ?? 'unknown',
        type: this.inferSchemaFieldType(fieldType),
        required: isRequired,
        description: `Field ${fieldName}`
      });
    }

    return fields;
  }

  protected inferSchemaFieldType(fieldType: string): SchemaFieldType {
    if (fieldType.includes('string')) return 'string';
    if (fieldType.includes('number')) return 'number';
    if (fieldType.includes('boolean')) return 'boolean';
    if (fieldType.includes('Date')) return 'date';
    if (fieldType.includes('Record') || fieldType.includes('{')) return 'json';
    if (fieldType.includes('[]')) return 'array';
    return 'string';
  }

  protected generateZodSchema(name: string, fields: SchemaField[], config: ValidationSchemaConfig): string {
    const lines: string[] = [];

    // Add import
    lines.push(this.getImportStatement(config));
    lines.push('');

    // Add schema definition
    lines.push(`/**`);
    lines.push(` * Zod validation schema for ${name}`);
    lines.push(` * Generated at: ${new Date().toISOString()}`);
    lines.push(` */`);
    lines.push(`export const ${name}Schema = z.object({`);

    // Add fields
    fields.forEach(field => {
      const baseSchema = this.mapTypeToSchemaType(field.type, 'zod');
      const validatedSchema = this.addFieldValidation(field, 'zod', baseSchema);
      const isOptional = !field.required ? '.optional()' : '';
      lines.push(`  ${field.name}: ${validatedSchema}${isOptional},`);
    });

    lines.push('});');
    lines.push('');

    // Add type extraction
    lines.push(`export type ${name} = z.infer<typeof ${name}Schema>;`);

    return lines.join('\n');
  }

  async generateFromSchemaDefinition(schema: SchemaDefinition, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult> {
    const startTime = Date.now();
    const result: ValidationSchemaGenerationResult = {
      success: true,
      generatedSchemas: [],
      warnings: [],
      errors: [],
      stats: {
        totalSchemas: 0,
        totalFields: 0,
        generationTimeMs: 0
      }
    };

    try {
      const schemaContent = this.generateZodSchema(schema.name, schema.fields, config);
      const filePath = `${config.outputDir}/${schema.name}.schema.ts`;

      const generatedSchema: GeneratedValidationSchema = {
        name: `${schema.name}Schema`,
        content: schemaContent,
        filePath: filePath,
        schemaType: 'zod',
        dependencies: ['zod'],
        metadata: {
          sourceType: 'schema-definition',
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      result.generatedSchemas.push(generatedSchema);
      result.stats.totalSchemas = 1;
      result.stats.totalFields = schema.fields.length;
      result.stats.generationTimeMs = Date.now() - startTime;

    } catch (error) {
      result.success = false;
      result.errors.push(`Schema generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.stats.generationTimeMs = Date.now() - startTime;
    }

    return result;
  }

  async generateFromTypeScriptInterface(iface: object, name: string, config: ValidationSchemaConfig): Promise<ValidationSchemaGenerationResult> {
    const fields: SchemaField[] = [];

    for (const [key, value] of Object.entries(iface)) {
      const fieldType = this.inferSchemaFieldType(typeof value);
      fields.push({
        name: key,
        type: fieldType,
        required: true,
        description: `Field ${key}`
      });
    }

    return this.generateFromSchemaDefinition({ name, fields }, config);
  }

  async validateGeneratedSchemas(schemas: GeneratedValidationSchema[]): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Basic validation
    const schemaNames = new Set<string>();

    for (const schema of schemas) {
      if (schemaNames.has(schema.name)) {
        result.valid = false;
        result.errors.push({
          schemaName: schema.name,
          message: `Duplicate schema name: ${schema.name}`,
          severity: 'error',
          code: 'DUPLICATE_SCHEMA'
        });
      }
      schemaNames.add(schema.name);

      // Check content is not empty
      if (!schema.content || schema.content.trim().length === 0) {
        result.valid = false;
        result.errors.push({
          schemaName: schema.name,
          message: `Empty schema content for ${schema.name}`,
          severity: 'error',
          code: 'EMPTY_SCHEMA'
        });
      }
    }

    return result;
  }
}

/**
 * Validation schema factory
 */
export function createValidationSchemaGenerator(schemaType: ValidationSchemaType = 'zod'): ValidationSchemaService {
  switch (schemaType) {
    case 'zod':
      return new ZodSchemaGenerator();
    case 'joi':
    case 'yup':
    case 'ajv':
    case 'custom':
    default:
      // For other types, return a basic implementation
      return new ZodSchemaGenerator(); // Default to Zod
  }
}

/**
 * Validation schema utilities
 */
const ValidationSchemaUtils = {

  /**
   * Create a basic validation schema configuration
   */
  createDefaultConfig(outputDir: string, schemaType: ValidationSchemaType = 'zod'): ValidationSchemaConfig {
    return {
      schemaType,
      outputDir,
      importPath: schemaType,
      generateRuntimeValidation: true,
      generateTypeGuards: true,
      strictMode: true,
      coerceTypes: false
    };
  },

  /**
   * Generate a complete validation schema from a type
   */
  async generateCompleteValidation(typeDef: GeneratedType, config: ValidationSchemaConfig = ValidationSchemaUtils.createDefaultConfig('shared/types/validation')): Promise<ValidationSchemaGenerationResult> {
    const generator = createValidationSchemaGenerator(config.schemaType);
    return generator.generateFromTypeDefinition(typeDef, config);
  }
};
