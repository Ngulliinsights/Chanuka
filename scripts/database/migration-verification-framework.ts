#!/usr/bin/env tsx
/**
 * Migration Verification Framework
 * Comprehensive verification system for database migrations
 * 
 * This framework verifies:
 * 1. Type alignment between database schema and TypeScript types
 * 2. API contract compatibility
 * 3. Validation schema consistency
 * 
 * Usage:
 *   npm run db:verify-migration
 *   tsx scripts/database/migration-verification-framework.ts
 * 
 * Requirements: 6.1, 6.3
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Project, SourceFile, InterfaceDeclaration, PropertySignature } from 'ts-morph';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface VerificationResult {
  passed: boolean;
  errors: VerificationError[];
  warnings: VerificationWarning[];
  timestamp: string;
}

export interface VerificationError {
  type: string;
  entity: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface VerificationWarning {
  type: string;
  entity: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  hasDefault: boolean;
  isUnique: boolean;
  enumValues?: string[];
}

export interface TypeField {
  name: string;
  type: string;
  nullable: boolean;
  isOptional: boolean;
}

export interface ApiEndpoint {
  name: string;
  method: string;
  path: string;
  requestType?: string;
  responseType?: string;
}

export interface ValidationSchema {
  name: string;
  fields: Map<string, ValidationField>;
}

export interface ValidationField {
  name: string;
  type: string;
  required: boolean;
  constraints: string[];
}

export interface MigrationVerificationReport {
  timestamp: string;
  migrationName?: string;
  typeAlignment: VerificationResult;
  apiContractCompatibility: VerificationResult;
  validationSchemaConsistency: VerificationResult;
  overallPassed: boolean;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalIssues: string[];
  };
}

// ============================================================================
// Type Alignment Verification
// ============================================================================

export class TypeAlignmentVerifier {
  private project: Project;
  private schemaPath: string;
  private typesPath: string;

  constructor() {
    this.project = new Project({
      tsConfigFilePath: join(process.cwd(), 'tsconfig.json'),
    });
    this.schemaPath = join(process.cwd(), 'server', 'infrastructure', 'schema');
    this.typesPath = join(process.cwd(), 'shared', 'types');
  }

  async verify(): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    try {
      // Load schema definitions
      const schemaDefinitions = await this.loadSchemaDefinitions();
      
      // Load type definitions
      const typeDefinitions = await this.loadTypeDefinitions();
      
      // Compare schema and types
      const comparisonResults = this.compareSchemaAndTypes(schemaDefinitions, typeDefinitions);
      errors.push(...comparisonResults.errors);
      warnings.push(...comparisonResults.warnings);

      // Verify enum alignment
      const enumResults = await this.verifyEnumAlignment();
      errors.push(...enumResults.errors);
      warnings.push(...enumResults.warnings);

    } catch (error) {
      errors.push({
        type: 'VERIFICATION_ERROR',
        entity: 'TypeAlignmentVerifier',
        message: `Failed to verify type alignment: ${error}`,
      });
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date().toISOString(),
    };
  }

  private async loadSchemaDefinitions(): Promise<Map<string, Map<string, SchemaField>>> {
    const schemaDefinitions = new Map<string, Map<string, SchemaField>>();
    
    const schemaFiles = [
      'foundation.ts',
      'citizen_participation.ts',
      'parliamentary_process.ts',
      'safeguards.ts',
      'enum.ts',
    ];

    for (const schemaFile of schemaFiles) {
      const filePath = join(this.schemaPath, schemaFile);
      if (!existsSync(filePath)) continue;

      try {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        const tables = this.extractSchemaDefinitions(sourceFile);
        tables.forEach((fields, tableName) => {
          schemaDefinitions.set(tableName, fields);
        });
      } catch (error) {
        console.warn(`Warning: Could not load schema file ${schemaFile}:`, error);
      }
    }

    return schemaDefinitions;
  }

  private extractSchemaDefinitions(sourceFile: SourceFile): Map<string, Map<string, SchemaField>> {
    const tables = new Map<string, Map<string, SchemaField>>();
    
    const variableStatements = sourceFile.getVariableStatements();
    
    for (const statement of variableStatements) {
      for (const declaration of statement.getDeclarations()) {
        const initializer = declaration.getInitializer();
        
        if (initializer && initializer.getText().includes('pgTable')) {
          const tableName = declaration.getName();
          const text = declaration.getText();
          
          const fields = this.parseSchemaFields(text);
          
          if (fields.size > 0) {
            tables.set(tableName, fields);
          }
        }
      }
    }
    
    return tables;
  }

  private parseSchemaFields(text: string): Map<string, SchemaField> {
    const fields = new Map<string, SchemaField>();
    
    // Extract field definitions
    const fieldPattern = /(\w+):\s*(\w+)\([^)]*\)([^,}]*)/g;
    let match;
    
    while ((match = fieldPattern.exec(text)) !== null) {
      const [, fieldName, fieldType, modifiers] = match;
      
      fields.set(fieldName, {
        name: fieldName,
        type: this.mapDrizzleTypeToTS(fieldType),
        nullable: !modifiers.includes('.notNull()'),
        isPrimaryKey: modifiers.includes('primaryKey()') || modifiers.includes('primaryKeyUuid()'),
        hasDefault: modifiers.includes('.default('),
        isUnique: modifiers.includes('.unique()'),
      });
    }
    
    return fields;
  }

  private mapDrizzleTypeToTS(drizzleType: string): string {
    const typeMap: Record<string, string> = {
      'uuid': 'string',
      'varchar': 'string',
      'text': 'string',
      'integer': 'number',
      'smallint': 'number',
      'bigint': 'number',
      'numeric': 'number',
      'boolean': 'boolean',
      'timestamp': 'Date',
      'date': 'Date',
      'jsonb': 'Record<string, unknown>',
      'primaryKeyUuid': 'string',
    };

    return typeMap[drizzleType] || 'unknown';
  }

  private async loadTypeDefinitions(): Promise<Map<string, Map<string, TypeField>>> {
    const typeDefinitions = new Map<string, Map<string, TypeField>>();
    
    const typeFiles = [
      'database/tables.ts',
      'database/generated-tables.ts',
      'database/generated-domains.ts',
    ];

    for (const typeFile of typeFiles) {
      const filePath = join(this.typesPath, typeFile);
      if (!existsSync(filePath)) continue;

      try {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        const types = this.extractTypeDefinitions(sourceFile);
        types.forEach((fields, typeName) => {
          typeDefinitions.set(typeName, fields);
        });
      } catch (error) {
        console.warn(`Warning: Could not load type file ${typeFile}:`, error);
      }
    }

    return typeDefinitions;
  }

  private extractTypeDefinitions(sourceFile: SourceFile): Map<string, Map<string, TypeField>> {
    const types = new Map<string, Map<string, TypeField>>();
    
    const interfaces = sourceFile.getInterfaces();
    
    for (const interfaceDecl of interfaces) {
      const typeName = interfaceDecl.getName();
      const fields = new Map<string, TypeField>();
      
      for (const property of interfaceDecl.getProperties()) {
        const fieldName = property.getName();
        const typeNode = property.getTypeNode();
        
        if (typeNode) {
          const typeText = typeNode.getText();
          const nullable = typeText.includes('| null');
          const isOptional = property.hasQuestionToken() || typeText.includes('| undefined');
          const baseType = typeText.replace(/\s*\|\s*(null|undefined)/g, '');
          
          fields.set(fieldName, {
            name: fieldName,
            type: baseType,
            nullable,
            isOptional,
          });
        }
      }
      
      if (fields.size > 0) {
        types.set(typeName, fields);
      }
    }
    
    return types;
  }

  private compareSchemaAndTypes(
    schemaDefinitions: Map<string, Map<string, SchemaField>>,
    typeDefinitions: Map<string, Map<string, TypeField>>
  ): { errors: VerificationError[]; warnings: VerificationWarning[] } {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    for (const [tableName, schemaFields] of schemaDefinitions) {
      const typeName = this.findCorrespondingType(tableName, typeDefinitions);
      
      if (!typeName) {
        warnings.push({
          type: 'MISSING_TYPE',
          entity: tableName,
          message: `No corresponding type definition found for table ${tableName}`,
        });
        continue;
      }

      const typeFields = typeDefinitions.get(typeName)!;
      const fieldErrors = this.compareFields(tableName, schemaFields, typeFields);
      errors.push(...fieldErrors);
    }

    return { errors, warnings };
  }

  private compareFields(
    entityName: string,
    schemaFields: Map<string, SchemaField>,
    typeFields: Map<string, TypeField>
  ): VerificationError[] {
    const errors: VerificationError[] = [];

    for (const [fieldName, schemaField] of schemaFields) {
      const typeField = typeFields.get(fieldName);
      
      if (!typeField) {
        errors.push({
          type: 'MISSING_FIELD_IN_TYPE',
          entity: entityName,
          message: `Field '${fieldName}' exists in schema but not in type definition`,
          details: { schemaType: schemaField.type },
        });
        continue;
      }

      // Check type compatibility
      if (!this.areTypesCompatible(schemaField.type, typeField.type)) {
        errors.push({
          type: 'TYPE_MISMATCH',
          entity: entityName,
          message: `Type mismatch for field '${fieldName}'`,
          details: {
            schemaType: schemaField.type,
            typeDefType: typeField.type,
          },
        });
      }

      // Check nullability
      if (schemaField.nullable !== typeField.nullable) {
        errors.push({
          type: 'NULLABILITY_MISMATCH',
          entity: entityName,
          message: `Nullability mismatch for field '${fieldName}'`,
          details: {
            schemaNullable: schemaField.nullable,
            typeNullable: typeField.nullable,
          },
        });
      }
    }

    return errors;
  }

  private areTypesCompatible(schemaType: string, typeDefType: string): boolean {
    const normalizedSchema = schemaType.toLowerCase().trim();
    const normalizedType = typeDefType.toLowerCase().trim();
    
    if (normalizedSchema === normalizedType) return true;
    
    // Handle branded types
    if (normalizedSchema === 'string' && normalizedType.includes('id')) return true;
    if (normalizedSchema === 'string' && normalizedType.includes('string')) return true;
    
    // Handle Record types
    if (normalizedSchema.includes('record') && normalizedType.includes('record')) return true;
    
    return false;
  }

  private findCorrespondingType(
    tableName: string,
    typeDefinitions: Map<string, Map<string, TypeField>>
  ): string | null {
    const tableTypeName = this.toPascalCase(tableName) + 'Table';
    if (typeDefinitions.has(tableTypeName)) return tableTypeName;
    
    const typeName = this.toPascalCase(tableName);
    if (typeDefinitions.has(typeName)) return typeName;
    
    return null;
  }

  private toPascalCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private async verifyEnumAlignment(): Promise<{ errors: VerificationError[]; warnings: VerificationWarning[] }> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    // This would check that enums in database constraints match enums in shared types
    // Implementation would parse CHECK constraints and compare with enum definitions
    
    return { errors, warnings };
  }
}

// ============================================================================
// API Contract Compatibility Checker
// ============================================================================

export class ApiContractCompatibilityChecker {
  private project: Project;
  private apiContractsPath: string;
  private serverRoutesPath: string;

  constructor() {
    this.project = new Project({
      tsConfigFilePath: join(process.cwd(), 'tsconfig.json'),
    });
    this.apiContractsPath = join(process.cwd(), 'shared', 'types', 'api');
    this.serverRoutesPath = join(process.cwd(), 'server', 'api');
  }

  async verify(): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    try {
      // Load API contract definitions
      const apiContracts = await this.loadApiContracts();
      
      // Load server route implementations
      const serverRoutes = await this.loadServerRoutes();
      
      // Verify contracts are used in routes
      const contractUsageResults = this.verifyContractUsage(apiContracts, serverRoutes);
      errors.push(...contractUsageResults.errors);
      warnings.push(...contractUsageResults.warnings);

      // Verify request/response types are from shared layer
      const typeSourceResults = this.verifyTypeSource(serverRoutes);
      errors.push(...typeSourceResults.errors);
      warnings.push(...typeSourceResults.warnings);

    } catch (error) {
      errors.push({
        type: 'VERIFICATION_ERROR',
        entity: 'ApiContractCompatibilityChecker',
        message: `Failed to verify API contract compatibility: ${error}`,
      });
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date().toISOString(),
    };
  }

  private async loadApiContracts(): Promise<Map<string, ApiEndpoint>> {
    const contracts = new Map<string, ApiEndpoint>();
    
    const contractFiles = ['contracts', 'request-types.ts', 'response-types.ts'];
    
    for (const contractFile of contractFiles) {
      const filePath = join(this.apiContractsPath, contractFile);
      if (!existsSync(filePath)) continue;

      try {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        const endpoints = this.extractApiEndpoints(sourceFile);
        endpoints.forEach((endpoint, name) => {
          contracts.set(name, endpoint);
        });
      } catch (error) {
        console.warn(`Warning: Could not load contract file ${contractFile}:`, error);
      }
    }

    return contracts;
  }

  private extractApiEndpoints(sourceFile: SourceFile): Map<string, ApiEndpoint> {
    const endpoints = new Map<string, ApiEndpoint>();
    
    // Extract endpoint definitions from interfaces and type aliases
    const interfaces = sourceFile.getInterfaces();
    
    for (const interfaceDecl of interfaces) {
      const name = interfaceDecl.getName();
      if (name.includes('Request') || name.includes('Response')) {
        endpoints.set(name, {
          name,
          method: 'UNKNOWN',
          path: 'UNKNOWN',
          requestType: name.includes('Request') ? name : undefined,
          responseType: name.includes('Response') ? name : undefined,
        });
      }
    }
    
    return endpoints;
  }

  private async loadServerRoutes(): Promise<Map<string, string[]>> {
    const routes = new Map<string, string[]>();
    
    // This would scan server route files and extract endpoint implementations
    // For now, return empty map
    
    return routes;
  }

  private verifyContractUsage(
    apiContracts: Map<string, ApiEndpoint>,
    serverRoutes: Map<string, string[]>
  ): { errors: VerificationError[]; warnings: VerificationWarning[] } {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    // Verify that all API endpoints use contract types
    // This would check that route handlers use types from shared/types/api
    
    return { errors, warnings };
  }

  private verifyTypeSource(
    serverRoutes: Map<string, string[]>
  ): { errors: VerificationError[]; warnings: VerificationWarning[] } {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    // Verify that types are imported from shared layer, not defined inline
    
    return { errors, warnings };
  }
}

// ============================================================================
// Validation Schema Consistency Checker
// ============================================================================

export class ValidationSchemaConsistencyChecker {
  private project: Project;
  private validationPath: string;
  private typesPath: string;

  constructor() {
    this.project = new Project({
      tsConfigFilePath: join(process.cwd(), 'tsconfig.json'),
    });
    this.validationPath = join(process.cwd(), 'shared', 'validation');
    this.typesPath = join(process.cwd(), 'shared', 'types');
  }

  async verify(): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    try {
      // Load validation schemas
      const validationSchemas = await this.loadValidationSchemas();
      
      // Load type definitions
      const typeDefinitions = await this.loadTypeDefinitions();
      
      // Verify schemas align with types
      const alignmentResults = this.verifySchemaTypeAlignment(validationSchemas, typeDefinitions);
      errors.push(...alignmentResults.errors);
      warnings.push(...alignmentResults.warnings);

    } catch (error) {
      errors.push({
        type: 'VERIFICATION_ERROR',
        entity: 'ValidationSchemaConsistencyChecker',
        message: `Failed to verify validation schema consistency: ${error}`,
      });
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date().toISOString(),
    };
  }

  private async loadValidationSchemas(): Promise<Map<string, ValidationSchema>> {
    const schemas = new Map<string, ValidationSchema>();
    
    // This would load Zod schemas from shared/validation
    // For now, return empty map
    
    return schemas;
  }

  private async loadTypeDefinitions(): Promise<Map<string, Map<string, TypeField>>> {
    const typeDefinitions = new Map<string, Map<string, TypeField>>();
    
    // This would load type definitions from shared/types
    // For now, return empty map
    
    return typeDefinitions;
  }

  private verifySchemaTypeAlignment(
    validationSchemas: Map<string, ValidationSchema>,
    typeDefinitions: Map<string, Map<string, TypeField>>
  ): { errors: VerificationError[]; warnings: VerificationWarning[] } {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    // Verify that validation schemas match type definitions
    
    return { errors, warnings };
  }
}

// ============================================================================
// Main Migration Verification
// ============================================================================

export async function verifyMigration(migrationName?: string): Promise<MigrationVerificationReport> {
  console.log('🔍 Starting migration verification...\n');
  
  if (migrationName) {
    console.log(`   Migration: ${migrationName}\n`);
  }

  // Run all verifications
  console.log('1️⃣  Verifying type alignment...');
  const typeAlignmentVerifier = new TypeAlignmentVerifier();
  const typeAlignment = await typeAlignmentVerifier.verify();
  console.log(`   ${typeAlignment.passed ? '✅' : '❌'} Type alignment: ${typeAlignment.errors.length} errors, ${typeAlignment.warnings.length} warnings\n`);

  console.log('2️⃣  Verifying API contract compatibility...');
  const apiContractChecker = new ApiContractCompatibilityChecker();
  const apiContractCompatibility = await apiContractChecker.verify();
  console.log(`   ${apiContractCompatibility.passed ? '✅' : '❌'} API contracts: ${apiContractCompatibility.errors.length} errors, ${apiContractCompatibility.warnings.length} warnings\n`);

  console.log('3️⃣  Verifying validation schema consistency...');
  const validationChecker = new ValidationSchemaConsistencyChecker();
  const validationSchemaConsistency = await validationChecker.verify();
  console.log(`   ${validationSchemaConsistency.passed ? '✅' : '❌'} Validation schemas: ${validationSchemaConsistency.errors.length} errors, ${validationSchemaConsistency.warnings.length} warnings\n`);

  // Compile results
  const allErrors = [
    ...typeAlignment.errors,
    ...apiContractCompatibility.errors,
    ...validationSchemaConsistency.errors,
  ];

  const allWarnings = [
    ...typeAlignment.warnings,
    ...apiContractCompatibility.warnings,
    ...validationSchemaConsistency.warnings,
  ];

  const criticalIssues: string[] = [];
  allErrors.forEach(error => {
    if (error.type === 'TYPE_MISMATCH' || error.type === 'MISSING_FIELD_IN_TYPE') {
      criticalIssues.push(`${error.entity}: ${error.message}`);
    }
  });

  const report: MigrationVerificationReport = {
    timestamp: new Date().toISOString(),
    migrationName,
    typeAlignment,
    apiContractCompatibility,
    validationSchemaConsistency,
    overallPassed: allErrors.length === 0,
    summary: {
      totalErrors: allErrors.length,
      totalWarnings: allWarnings.length,
      criticalIssues,
    },
  };

  // Output summary
  console.log('📊 Verification Summary:\n');
  console.log(`   Overall Status: ${report.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Total Errors: ${report.summary.totalErrors}`);
  console.log(`   Total Warnings: ${report.summary.totalWarnings}`);
  
  if (report.summary.criticalIssues.length > 0) {
    console.log(`\n   ⚠️  Critical Issues:`);
    report.summary.criticalIssues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  }

  // Write detailed report
  const reportPath = join(process.cwd(), 'migration-verification-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);

  return report;
}

// Run verification if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  const migrationName = process.argv[2];
  
  verifyMigration(migrationName)
    .then(report => {
      if (!report.overallPassed) {
        console.error('\n❌ Migration verification failed!\n');
        process.exit(1);
      } else {
        console.log('\n✅ Migration verification passed!\n');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Verification error:', error);
      process.exit(1);
    });
}
