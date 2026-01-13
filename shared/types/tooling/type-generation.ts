// ============================================================================
// AUTOMATED TYPE GENERATION FROM SCHEMAS
// ============================================================================
// System for generating TypeScript types from database schemas and other sources

import { BaseEntity, SoftDeletable, FullAuditEntity } from '../../core/base';
import { LoadingOperation, LoadingState } from '../../domains/loading';

/**
 * Schema definition for type generation
 * Represents the structure of a database table or API resource
 */
export interface SchemaDefinition {
  name: string;
  description?: string;
  fields: SchemaField[];
  relationships?: SchemaRelationship[];
  extends?: string | string[];
  metadata?: Record<string, unknown>;
}

/**
 * Individual field definition in a schema
 */
export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  constraints?: FieldConstraint[];
  validation?: FieldValidation;
}

/**
 * Supported field types for schema definitions
 */
export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'uuid'
  | 'json'
  | 'array'
  | 'reference'
  | 'enum';

/**
 * Field constraints for validation
 */
export interface FieldConstraint {
  type: ConstraintType;
  value?: unknown;
  message?: string;
}

/**
 * Supported constraint types
 */
export type ConstraintType =
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'unique'
  | 'primary'
  | 'notNull';

/**
 * Field validation rules
 */
export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: string; // Custom validation function name
}

/**
 * Relationship definition between schemas
 */
export interface SchemaRelationship {
  type: RelationshipType;
  target: string;
  field: string;
  required?: boolean;
  cardinality?: RelationshipCardinality;
}

/**
 * Relationship types
 */
export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

/**
 * Relationship cardinality
 */
export type RelationshipCardinality = 'single' | 'array' | 'optional';

/**
 * Type generation configuration
 */
export interface TypeGenerationConfig {
  source: 'database' | 'api' | 'graphql' | 'manual';
  outputDir: string;
  baseTypesDir?: string;
  generateValidation?: boolean;
  generateDocumentation?: boolean;
  generateExamples?: boolean;
  overwrite?: boolean;
  prefix?: string;
  suffix?: string;
}

/**
 * Generated type result
 */
export interface GeneratedType {
  name: string;
  content: string;
  filePath: string;
  dependencies: string[];
  metadata: {
    source: string;
    generatedAt: string;
    version: string;
  };
}

/**
 * Type generation result
 */
export interface TypeGenerationResult {
  success: boolean;
  generatedTypes: GeneratedType[];
  warnings: string[];
  errors: string[];
  stats: {
    totalTypes: number;
    totalFields: number;
    totalRelationships: number;
    generationTimeMs: number;
  };
}

/**
 * Type generation service interface
 */
export interface TypeGenerationService {
  generateFromSchema(schema: SchemaDefinition, config: TypeGenerationConfig): Promise<TypeGenerationResult>;
  generateFromDatabase(connectionString: string, config: TypeGenerationConfig): Promise<TypeGenerationResult>;
  generateFromAPI(spec: unknown, config: TypeGenerationConfig): Promise<TypeGenerationResult>;
  validateGeneratedTypes(types: GeneratedType[]): Promise<ValidationResult>;
}

/**
 * Validation result for generated types
 */
export interface ValidationResult {
  valid: boolean;
  errors: TypeValidationError[];
  warnings: TypeValidationWarning[];
}

/**
 * Type validation error
 */
export interface TypeValidationError {
  typeName: string;
  fieldName?: string;
  message: string;
  severity: 'error' | 'critical';
  code: string;
}

/**
 * Type validation warning
 */
export interface TypeValidationWarning {
  typeName: string;
  fieldName?: string;
  message: string;
  severity: 'warning' | 'info';
  code: string;
}

/**
 * Base type generator class
 */
export abstract class BaseTypeGenerator implements TypeGenerationService {
  protected baseTypes: Record<string, string> = {};
  protected generatedTypes: GeneratedType[] = [];

  constructor() {
    this.initializeBaseTypes();
  }

  protected initializeBaseTypes(): void {
    // Load base types from the core system
    this.baseTypes['BaseEntity'] = this.generateTypeFromInterface(BaseEntity);
    this.baseTypes['SoftDeletable'] = this.generateTypeFromInterface(SoftDeletable);
    this.baseTypes['FullAuditEntity'] = this.generateTypeFromInterface(FullAuditEntity);
  }

  protected generateTypeFromInterface(iface: object): string {
    // Convert interface to TypeScript type definition
    const lines: string[] = [];

    for (const [key, value] of Object.entries(iface)) {
      const type = typeof value;
      lines.push(`  ${key}: ${type};`);
    }

    return lines.join('\n');
  }

  protected generateTypeName(schemaName: string, config: TypeGenerationConfig): string {
    let name = schemaName;

    if (config.prefix) {
      name = `${config.prefix}${name}`;
    }

    if (config.suffix) {
      name = `${name}${config.suffix}`;
    }

    return name;
  }

  protected generateTypeContent(schema: SchemaDefinition, config: TypeGenerationConfig): string {
    const typeName = this.generateTypeName(schema.name, config);
    const lines: string[] = [];

    // Add header comment
    lines.push(`/**`);
    lines.push(` * ${schema.description || `Generated type for ${schema.name}`}`);
    lines.push(` * Generated from: ${config.source}`);
    lines.push(` * Generated at: ${new Date().toISOString()}`);
    lines.push(` */`);
    lines.push(`export interface ${typeName} {`);

    // Add extends clause if needed
    if (schema.extends) {
      const extendsClause = Array.isArray(schema.extends)
        ? schema.extends.join(', ')
        : schema.extends;
      lines.push(`  extends ${extendsClause} {`);
    }

    // Add fields
    schema.fields.forEach(field => {
      const fieldType = this.mapSchemaFieldType(field.type);
      const isOptional = !field.required ? '?' : '';
      lines.push(`  ${field.name}${isOptional}: ${fieldType};`);
    });

    // Close the interface
    lines.push('}');

    return lines.join('\n');
  }

  protected mapSchemaFieldType(fieldType: SchemaFieldType): string {
    const typeMap: Record<SchemaFieldType, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'Date',
      'datetime': 'Date',
      'uuid': 'string',
      'json': 'Record<string, unknown>',
      'array': 'unknown[]',
      'reference': 'string',
      'enum': 'string'
    };

    return typeMap[fieldType] || 'unknown';
  }

  // Abstract methods to be implemented by concrete generators
  abstract generateFromSchema(schema: SchemaDefinition, config: TypeGenerationConfig): Promise<TypeGenerationResult>;
  abstract generateFromDatabase(connectionString: string, config: TypeGenerationConfig): Promise<TypeGenerationResult>;
  abstract generateFromAPI(spec: unknown, config: TypeGenerationConfig): Promise<TypeGenerationResult>;
  abstract validateGeneratedTypes(types: GeneratedType[]): Promise<ValidationResult>;
}

/**
 * Default implementation of type generator
 */
export class DefaultTypeGenerator extends BaseTypeGenerator {
  async generateFromSchema(schema: SchemaDefinition, config: TypeGenerationConfig): Promise<TypeGenerationResult> {
    const startTime = Date.now();
    const result: TypeGenerationResult = {
      success: true,
      generatedTypes: [],
      warnings: [],
      errors: [],
      stats: {
        totalTypes: 0,
        totalFields: 0,
        totalRelationships: 0,
        generationTimeMs: 0
      }
    };

    try {
      // Generate the main type
      const typeContent = this.generateTypeContent(schema, config);
      const typeName = this.generateTypeName(schema.name, config);
      const filePath = `${config.outputDir}/${typeName}.ts`;

      const generatedType: GeneratedType = {
        name: typeName,
        content: typeContent,
        filePath: filePath,
        dependencies: schema.extends ? (Array.isArray(schema.extends) ? schema.extends : [schema.extends]) : [],
        metadata: {
          source: config.source,
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      result.generatedTypes.push(generatedType);
      result.stats.totalTypes = 1;
      result.stats.totalFields = schema.fields.length;
      result.stats.totalRelationships = schema.relationships?.length || 0;

      // Generate relationship types if needed
      if (schema.relationships) {
        await this.generateRelationshipTypes(schema, config, result);
      }

      result.stats.generationTimeMs = Date.now() - startTime;
    } catch (error) {
      result.success = false;
      result.errors.push(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.stats.generationTimeMs = Date.now() - startTime;
    }

    return result;
  }

  protected async generateRelationshipTypes(
    schema: SchemaDefinition,
    config: TypeGenerationConfig,
    result: TypeGenerationResult
  ): Promise<void> {
    // Generate types for relationships
    for (const relationship of schema.relationships || []) {
      const relTypeName = `${this.generateTypeName(schema.name, config)}${relationship.type.charAt(0).toUpperCase() + relationship.type.slice(1)}`;

      const relTypeContent = this.generateRelationshipTypeContent(relationship, config);
      const filePath = `${config.outputDir}/${relTypeName}.ts`;

      const generatedType: GeneratedType = {
        name: relTypeName,
        content: relTypeContent,
        filePath: filePath,
        dependencies: [relationship.target],
        metadata: {
          source: config.source,
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      result.generatedTypes.push(generatedType);
      result.stats.totalTypes++;
    }
  }

  protected generateRelationshipTypeContent(relationship: SchemaRelationship, config: TypeGenerationConfig): string {
    const lines: string[] = [];
    const relTypeName = `${relationship.type.charAt(0).toUpperCase() + relationship.type.slice(1)}`;

    lines.push(`/**`);
    lines.push(` * Relationship type for ${relationship.type}`);
    lines.push(` * Target: ${relationship.target}`);
    lines.push(` * Field: ${relationship.field}`);
    lines.push(` */`);
    lines.push(`export interface ${relTypeName} {`);

    // Add relationship-specific fields
    lines.push(`  type: '${relationship.type}';`);
    lines.push(`  target: ${relationship.target};`);
    lines.push(`  field: '${relationship.field}';`);

    if (relationship.required) {
      lines.push(`  required: true;`);
    }

    if (relationship.cardinality) {
      lines.push(`  cardinality: '${relationship.cardinality}';`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  async generateFromDatabase(connectionString: string, config: TypeGenerationConfig): Promise<TypeGenerationResult> {
    // This would connect to a database and introspect the schema
    // For now, return a placeholder implementation
    return {
      success: false,
      generatedTypes: [],
      warnings: ['Database generation not yet implemented'],
      errors: ['Database generation requires a database connection'],
      stats: {
        totalTypes: 0,
        totalFields: 0,
        totalRelationships: 0,
        generationTimeMs: 0
      }
    };
  }

  async generateFromAPI(spec: unknown, config: TypeGenerationConfig): Promise<TypeGenerationResult> {
    // This would parse an API specification (OpenAPI, GraphQL, etc.)
    // For now, return a placeholder implementation
    return {
      success: false,
      generatedTypes: [],
      warnings: ['API generation not yet implemented'],
      errors: ['API generation requires a valid specification'],
      stats: {
        totalTypes: 0,
        totalFields: 0,
        totalRelationships: 0,
        generationTimeMs: 0
      }
    };
  }

  async validateGeneratedTypes(types: GeneratedType[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Basic validation - check for duplicate names
    const typeNames = new Set<string>();

    for (const type of types) {
      if (typeNames.has(type.name)) {
        result.valid = false;
        result.errors.push({
          typeName: type.name,
          message: `Duplicate type name: ${type.name}`,
          severity: 'error',
          code: 'DUPLICATE_TYPE'
        });
      }
      typeNames.add(type.name);

      // Check for missing dependencies
      if (type.dependencies && type.dependencies.length > 0) {
        const missingDeps = type.dependencies.filter(dep => !typeNames.has(dep));
        if (missingDeps.length > 0) {
          result.warnings.push({
            typeName: type.name,
            message: `Missing dependencies: ${missingDeps.join(', ')}`,
            severity: 'warning',
            code: 'MISSING_DEPENDENCY'
          });
        }
      }
    }

    return result;
  }
}

/**
 * Type generation utility functions
 */
export const TypeGenerationUtils = {

  /**
   * Create a schema definition from a TypeScript interface
   */
  createSchemaFromInterface<T>(name: string, iface: T, description?: string): SchemaDefinition {
    const fields: SchemaField[] = [];

    for (const [key, value] of Object.entries(iface)) {
      const fieldType = this.inferFieldType(value);
      fields.push({
        name: key,
        type: fieldType,
        required: true, // Simple inference - all fields required
        description: `Field ${key}`
      });
    }

    return {
      name,
      description,
      fields,
      relationships: []
    };
  },

  /**
   * Infer field type from a value
   */
  inferFieldType(value: unknown): SchemaFieldType {
    if (value === null || value === undefined) {
      return 'string';
    }

    switch (typeof value) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        if (value instanceof Date) {
          return 'datetime';
        }
        if (Array.isArray(value)) {
          return 'array';
        }
        return 'json';
      default:
        return 'string';
    }
  },

  /**
   * Generate a complete type generation configuration
   */
  createDefaultConfig(outputDir: string): TypeGenerationConfig {
    return {
      source: 'manual',
      outputDir,
      baseTypesDir: 'shared/types/core',
      generateValidation: true,
      generateDocumentation: true,
      generateExamples: false,
      overwrite: false,
      prefix: '',
      suffix: ''
    };
  }
};

/**
 * Type generation factory
 */
export function createTypeGenerator(): TypeGenerationService {
  return new DefaultTypeGenerator();
}
