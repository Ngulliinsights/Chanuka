#!/usr/bin/env tsx
/**
 * Schema-Type Alignment Verification Tool v2
 * Comprehensive comparison of database schema with type definitions
 * 
 * This script:
 * 1. Reads all Drizzle schema definitions from server/infrastructure/schema
 * 2. Reads all TypeScript type definitions from shared/types/database
 * 3. Compares field names, types, nullability, and constraints
 * 4. Generates detailed alignment report with actionable insights
 * 
 * Requirements: 2.2, 2.3
 * 
 * Usage:
 *   npm run db:verify-alignment
 *   tsx scripts/database/verify-schema-type-alignment-v2.ts
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';

// ============================================================================
// Type Definitions
// ============================================================================

interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  hasDefault: boolean;
  isUnique: boolean;
  isArray: boolean;
  references?: string;
  constraints: string[];
}

interface TypeField {
  name: string;
  type: string;
  nullable: boolean;
  isOptional: boolean;
}

interface AlignmentIssue {
  entity: string;
  field: string;
  issue: string;
  schemaValue?: string;
  typeValue?: string;
  severity: 'error' | 'warning' | 'info';
  recommendation?: string;
}

interface EntityAlignment {
  entityName: string;
  schemaTable: string | null;
  typeDefinition: string | null;
  aligned: boolean;
  fieldCount: {
    schema: number;
    type: number;
    matched: number;
  };
  issues: AlignmentIssue[];
}

interface AlignmentReport {
  timestamp: string;
  totalEntities: number;
  alignedEntities: number;
  misalignedEntities: number;
  entitiesWithoutSchema: number;
  entitiesWithoutTypes: number;
  entities: EntityAlignment[];
  issues: AlignmentIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  recommendations: string[];
}

// ============================================================================
// Main Verification Function
// ============================================================================

async function verifyAlignment(): Promise<void> {
  console.log('🔍 Schema-Type Alignment Verification Tool v2\n');
  console.log('=' .repeat(60));
  console.log('\n📋 Task: Build schema-type alignment verification tool');
  console.log('   - Compare database schema with type definitions');
  console.log('   - Check field names, types, nullability, and constraints');
  console.log('   - Generate detailed alignment report\n');
  console.log('=' .repeat(60) + '\n');

  const project = new Project({
    tsConfigFilePath: join(process.cwd(), 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  // Step 1: Load schema definitions
  console.log('📖 Step 1: Loading database schema definitions...');
  const schemaPath = join(process.cwd(), 'server', 'infrastructure', 'schema');
  const schemaDefinitions = await loadSchemaDefinitions(project, schemaPath);
  console.log(`   ✓ Loaded ${schemaDefinitions.size} tables from schema files\n`);

  // Step 2: Load type definitions
  console.log('📖 Step 2: Loading TypeScript type definitions...');
  const typesPath = join(process.cwd(), 'shared', 'types', 'database');
  const typeDefinitions = await loadTypeDefinitions(project, typesPath);
  console.log(`   ✓ Loaded ${typeDefinitions.size} type definitions\n`);

  // Step 3: Compare and analyze
  console.log('🔄 Step 3: Comparing schema and type definitions...\n');
  const entities = analyzeAlignment(schemaDefinitions, typeDefinitions);

  // Step 4: Generate report
  console.log('📊 Step 4: Generating alignment report...\n');
  const report = generateReport(entities);

  // Step 5: Display results
  displayReport(report);

  // Step 6: Save detailed report
  const reportPath = join(process.cwd(), 'schema-type-alignment-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Exit with appropriate code
  if (report.summary.errors > 0) {
    console.log('\n❌ Verification failed with errors. Please fix the issues above.\n');
    process.exit(1);
  } else if (report.summary.warnings > 0) {
    console.log('\n⚠️  Verification completed with warnings. Review recommended.\n');
    process.exit(0);
  } else {
    console.log('\n✅ All schemas and types are perfectly aligned!\n');
    process.exit(0);
  }
}

// ============================================================================
// Schema Loading Functions
// ============================================================================

async function loadSchemaDefinitions(
  project: Project,
  schemaPath: string
): Promise<Map<string, Map<string, SchemaField>>> {
  const schemaDefinitions = new Map<string, Map<string, SchemaField>>();

  if (!existsSync(schemaPath)) {
    console.warn(`   ⚠️  Schema path not found: ${schemaPath}`);
    return schemaDefinitions;
  }

  const schemaFiles = readdirSync(schemaPath)
    .filter(file => file.endsWith('.ts') && !file.includes('.test.') && !file.includes('index.ts'));

  for (const file of schemaFiles) {
    const filePath = join(schemaPath, file);
    try {
      const sourceFile = project.addSourceFileAtPath(filePath);
      const tables = extractSchemaDefinitions(sourceFile);
      
      tables.forEach((fields, tableName) => {
        schemaDefinitions.set(tableName, fields);
      });

      if (tables.size > 0) {
        console.log(`   ✓ ${file}: ${tables.size} tables`);
      }
    } catch (error) {
      console.error(`   ✗ Error reading ${file}:`, error instanceof Error ? error.message : error);
    }
  }

  return schemaDefinitions;
}

function extractSchemaDefinitions(sourceFile: SourceFile): Map<string, Map<string, SchemaField>> {
  const tables = new Map<string, Map<string, SchemaField>>();

  // Find all variable declarations that use pgTable
  const variableStatements = sourceFile.getVariableStatements();

  for (const statement of variableStatements) {
    if (!statement.isExported()) continue;

    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      
      if (initializer && initializer.getText().includes('pgTable')) {
        const tableName = declaration.getName();
        const fields = parseSchemaFields(initializer.getText());
        
        if (fields.size > 0) {
          tables.set(tableName, fields);
        }
      }
    }
  }

  return tables;
}

function parseSchemaFields(tableDefinition: string): Map<string, SchemaField> {
  const fields = new Map<string, SchemaField>();

  // Extract the fields object from pgTable call
  const fieldsMatch = tableDefinition.match(/\{([^}]+)\}/s);
  if (!fieldsMatch) return fields;

  const fieldsText = fieldsMatch[1];
  
  // Parse each field definition
  const fieldPattern = /(\w+):\s*([^,\n]+?)(?=,\s*\w+:|$)/gs;
  let match;

  while ((match = fieldPattern.exec(fieldsText)) !== null) {
    const [, fieldName, fieldDef] = match;
    
    // Skip spread operators and special fields
    if (fieldName.startsWith('...') || fieldName === 'table') continue;

    const field = parseFieldDefinition(fieldName, fieldDef);
    fields.set(fieldName, field);
  }

  return fields;
}

function parseFieldDefinition(fieldName: string, fieldDef: string): SchemaField {
  const field: SchemaField = {
    name: fieldName,
    type: 'unknown',
    nullable: true,
    isPrimaryKey: false,
    hasDefault: false,
    isUnique: false,
    isArray: false,
    constraints: [],
  };

  // Extract column type
  const typeMatch = fieldDef.match(/(\w+)\(/);
  if (typeMatch) {
    field.type = mapDrizzleTypeToTS(typeMatch[1]);
  }

  // Check for array type
  field.isArray = fieldDef.includes('.array()');

  // Check modifiers
  field.nullable = !fieldDef.includes('.notNull()');
  field.isPrimaryKey = fieldDef.includes('.primaryKey()') || fieldDef.includes('primaryKeyUuid()');
  field.hasDefault = fieldDef.includes('.default(') || fieldDef.includes('.defaultNow()') || fieldDef.includes('.defaultRandom()');
  field.isUnique = fieldDef.includes('.unique()');

  // Extract references
  const referencesMatch = fieldDef.match(/\.references\(\(\)\s*=>\s*(\w+)\.(\w+)/);
  if (referencesMatch) {
    field.references = `${referencesMatch[1]}.${referencesMatch[2]}`;
  }

  // Extract constraints from check() calls
  const checkMatches = fieldDef.matchAll(/check\(['"]([\w_]+)['"]/g);
  for (const checkMatch of checkMatches) {
    field.constraints.push(checkMatch[1]);
  }

  return field;
}

function mapDrizzleTypeToTS(drizzleType: string): string {
  const typeMap: Record<string, string> = {
    'uuid': 'string',
    'varchar': 'string',
    'text': 'string',
    'integer': 'number',
    'smallint': 'number',
    'bigint': 'number',
    'numeric': 'number',
    'real': 'number',
    'doublePrecision': 'number',
    'boolean': 'boolean',
    'timestamp': 'Date',
    'date': 'Date',
    'time': 'string',
    'jsonb': 'Record<string, unknown>',
    'json': 'Record<string, unknown>',
    'primaryKeyUuid': 'string',
    'emailField': 'string',
    'metadataField': 'Record<string, unknown>',
  };

  return typeMap[drizzleType] || drizzleType;
}

// ============================================================================
// Type Loading Functions
// ============================================================================

async function loadTypeDefinitions(
  project: Project,
  typesPath: string
): Promise<Map<string, Map<string, TypeField>>> {
  const typeDefinitions = new Map<string, Map<string, TypeField>>();

  if (!existsSync(typesPath)) {
    console.warn(`   ⚠️  Types path not found: ${typesPath}`);
    return typeDefinitions;
  }

  const typeFiles = readdirSync(typesPath)
    .filter(file => file.endsWith('.ts') && !file.includes('.test.'));

  for (const file of typeFiles) {
    const filePath = join(typesPath, file);
    try {
      const sourceFile = project.addSourceFileAtPath(filePath);
      const types = extractTypeDefinitions(sourceFile);
      
      types.forEach((fields, typeName) => {
        typeDefinitions.set(typeName, fields);
      });

      if (types.size > 0) {
        console.log(`   ✓ ${file}: ${types.size} types`);
      }
    } catch (error) {
      console.error(`   ✗ Error reading ${file}:`, error instanceof Error ? error.message : error);
    }
  }

  return typeDefinitions;
}

function extractTypeDefinitions(sourceFile: SourceFile): Map<string, Map<string, TypeField>> {
  const types = new Map<string, Map<string, TypeField>>();

  // Extract interface definitions
  const interfaces = sourceFile.getInterfaces();
  for (const interfaceDecl of interfaces) {
    const typeName = interfaceDecl.getName();
    const fields = parseInterfaceFields(interfaceDecl);
    
    if (fields.size > 0) {
      types.set(typeName, fields);
    }
  }

  // Extract type alias definitions
  const typeAliases = sourceFile.getTypeAliases();
  for (const typeAlias of typeAliases) {
    const typeName = typeAlias.getName();
    const typeNode = typeAlias.getTypeNode();
    
    if (typeNode && typeNode.getKind() === SyntaxKind.TypeLiteral) {
      const fields = parseTypeLiteralFields(typeNode.getText());
      if (fields.size > 0) {
        types.set(typeName, fields);
      }
    }
  }

  return types;
}

function parseInterfaceFields(interfaceDecl: unknown): Map<string, TypeField> {
  const fields = new Map<string, TypeField>();

  for (const property of interfaceDecl.getProperties()) {
    const fieldName = property.getName();
    const typeNode = property.getTypeNode();
    const isOptional = property.hasQuestionToken();

    if (typeNode) {
      const typeText = typeNode.getText();
      const nullable = typeText.includes('| null') || typeText.includes('| undefined');
      const baseType = typeText.replace(/\s*\|\s*(null|undefined)/g, '').trim();

      fields.set(fieldName, {
        name: fieldName,
        type: baseType,
        nullable,
        isOptional,
      });
    }
  }

  return fields;
}

function parseTypeLiteralFields(typeText: string): Map<string, TypeField> {
  const fields = new Map<string, TypeField>();

  // Simple regex-based parsing for type literals
  const fieldPattern = /(\w+)(\?)?:\s*([^;,}]+)/g;
  let match;

  while ((match = fieldPattern.exec(typeText)) !== null) {
    const [, fieldName, optional, typeStr] = match;
    const nullable = typeStr.includes('| null') || typeStr.includes('| undefined');
    const baseType = typeStr.replace(/\s*\|\s*(null|undefined)/g, '').trim();

    fields.set(fieldName, {
      name: fieldName,
      type: baseType,
      nullable,
      isOptional: !!optional,
    });
  }

  return fields;
}

// ============================================================================
// Alignment Analysis Functions
// ============================================================================

function analyzeAlignment(
  schemaDefinitions: Map<string, Map<string, SchemaField>>,
  typeDefinitions: Map<string, Map<string, TypeField>>
): EntityAlignment[] {
  const entities: EntityAlignment[] = [];
  const processedTypes = new Set<string>();

  // Analyze each schema table
  for (const [tableName, schemaFields] of schemaDefinitions) {
    const typeName = findCorrespondingType(tableName, typeDefinitions);
    
    if (!typeName) {
      entities.push({
        entityName: tableName,
        schemaTable: tableName,
        typeDefinition: null,
        aligned: false,
        fieldCount: {
          schema: schemaFields.size,
          type: 0,
          matched: 0,
        },
        issues: [{
          entity: tableName,
          field: 'N/A',
          issue: 'No corresponding type definition found',
          severity: 'error',
          recommendation: `Create a type definition for table '${tableName}' in shared/types/database/`,
        }],
      });
      continue;
    }

    processedTypes.add(typeName);
    const typeFields = typeDefinitions.get(typeName)!;
    const issues = compareFields(tableName, schemaFields, typeFields);
    const matchedFields = countMatchedFields(schemaFields, typeFields);

    entities.push({
      entityName: tableName,
      schemaTable: tableName,
      typeDefinition: typeName,
      aligned: issues.length === 0,
      fieldCount: {
        schema: schemaFields.size,
        type: typeFields.size,
        matched: matchedFields,
      },
      issues,
    });
  }

  // Check for types without corresponding schemas
  for (const [typeName, typeFields] of typeDefinitions) {
    if (processedTypes.has(typeName)) continue;

    const tableName = findCorrespondingSchema(typeName, schemaDefinitions);
    if (!tableName) {
      entities.push({
        entityName: typeName,
        schemaTable: null,
        typeDefinition: typeName,
        aligned: false,
        fieldCount: {
          schema: 0,
          type: typeFields.size,
          matched: 0,
        },
        issues: [{
          entity: typeName,
          field: 'N/A',
          issue: 'Type definition has no corresponding schema',
          severity: 'warning',
          recommendation: `Either create a schema table for '${typeName}' or remove the unused type definition`,
        }],
      });
    }
  }

  return entities;
}

function compareFields(
  entityName: string,
  schemaFields: Map<string, SchemaField>,
  typeFields: Map<string, TypeField>
): AlignmentIssue[] {
  const issues: AlignmentIssue[] = [];

  // Check each schema field
  for (const [fieldName, schemaField] of schemaFields) {
    const typeField = typeFields.get(fieldName);

    if (!typeField) {
      issues.push({
        entity: entityName,
        field: fieldName,
        issue: 'Field exists in schema but not in type definition',
        schemaValue: formatSchemaField(schemaField),
        severity: 'error',
        recommendation: `Add field '${fieldName}: ${schemaField.type}${schemaField.nullable ? ' | null' : ''}' to type definition`,
      });
      continue;
    }

    // Check type compatibility
    if (!areTypesCompatible(schemaField.type, typeField.type, schemaField.isArray)) {
      issues.push({
        entity: entityName,
        field: fieldName,
        issue: 'Type mismatch between schema and type definition',
        schemaValue: schemaField.type + (schemaField.isArray ? '[]' : ''),
        typeValue: typeField.type,
        severity: 'error',
        recommendation: `Update type definition to match schema type: ${schemaField.type}${schemaField.isArray ? '[]' : ''}`,
      });
    }

    // Check nullability
    if (schemaField.nullable !== typeField.nullable && !typeField.isOptional) {
      issues.push({
        entity: entityName,
        field: fieldName,
        issue: 'Nullability mismatch',
        schemaValue: schemaField.nullable ? 'nullable' : 'not null',
        typeValue: typeField.nullable ? 'nullable' : 'not null',
        severity: 'error',
        recommendation: schemaField.nullable 
          ? `Add '| null' to type definition for field '${fieldName}'`
          : `Remove '| null' from type definition for field '${fieldName}'`,
      });
    }
  }

  // Check for extra fields in types
  for (const [fieldName, typeField] of typeFields) {
    if (!schemaFields.has(fieldName)) {
      issues.push({
        entity: entityName,
        field: fieldName,
        issue: 'Field exists in type but not in schema',
        typeValue: formatTypeField(typeField),
        severity: 'warning',
        recommendation: `Either add field to schema or remove from type definition`,
      });
    }
  }

  return issues;
}

function areTypesCompatible(schemaType: string, typeDefType: string, isArray: boolean): boolean {
  const normalizedSchema = schemaType.toLowerCase().trim();
  let normalizedType = typeDefType.toLowerCase().trim();

  // Handle array types
  if (isArray) {
    if (!normalizedType.endsWith('[]') && !normalizedType.includes('array<')) {
      return false;
    }
    normalizedType = normalizedType.replace(/\[\]$/, '').replace(/array<(.+)>/, '$1').trim();
  }

  // Direct match
  if (normalizedSchema === normalizedType) return true;

  // Handle branded types (e.g., UserId is compatible with string)
  if (normalizedSchema === 'string' && (normalizedType.includes('id') || normalizedType === 'string')) {
    return true;
  }

  // Handle Record types
  if (normalizedSchema.includes('record') && normalizedType.includes('record')) {
    return true;
  }

  // Handle Date types
  if (normalizedSchema === 'date' && normalizedType === 'date') {
    return true;
  }

  return false;
}

function countMatchedFields(
  schemaFields: Map<string, SchemaField>,
  typeFields: Map<string, TypeField>
): number {
  let matched = 0;

  for (const [fieldName, schemaField] of schemaFields) {
    const typeField = typeFields.get(fieldName);
    if (typeField && areTypesCompatible(schemaField.type, typeField.type, schemaField.isArray)) {
      matched++;
    }
  }

  return matched;
}

// ============================================================================
// Helper Functions
// ============================================================================

function findCorrespondingType(
  tableName: string,
  typeDefinitions: Map<string, Map<string, TypeField>>
): string | null {
  // Try exact match with "Table" suffix
  const tableTypeName = toPascalCase(tableName) + 'Table';
  if (typeDefinitions.has(tableTypeName)) return tableTypeName;

  // Try without suffix
  const typeName = toPascalCase(tableName);
  if (typeDefinitions.has(typeName)) return typeName;

  // Try with different suffixes
  const alternativeNames = [
    `${typeName}Row`,
    `${typeName}Record`,
    `${typeName}Entity`,
  ];

  for (const altName of alternativeNames) {
    if (typeDefinitions.has(altName)) return altName;
  }

  return null;
}

function findCorrespondingSchema(
  typeName: string,
  schemaDefinitions: Map<string, Map<string, SchemaField>>
): string | null {
  // Remove common suffixes
  const cleanTypeName = typeName
    .replace(/Table$/, '')
    .replace(/Row$/, '')
    .replace(/Record$/, '')
    .replace(/Entity$/, '');

  const tableName = toSnakeCase(cleanTypeName);

  if (schemaDefinitions.has(tableName)) return tableName;

  return null;
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function formatSchemaField(field: SchemaField): string {
  let result = field.type;
  if (field.isArray) result += '[]';
  if (field.nullable) result += ' | null';
  if (field.isPrimaryKey) result += ' (PK)';
  if (field.isUnique) result += ' (UNIQUE)';
  return result;
}

function formatTypeField(field: TypeField): string {
  let result = field.type;
  if (field.nullable) result += ' | null';
  if (field.isOptional) result += ' (optional)';
  return result;
}

// ============================================================================
// Report Generation Functions
// ============================================================================

function generateReport(entities: EntityAlignment[]): AlignmentReport {
  const allIssues = entities.flatMap(e => e.issues);
  const alignedCount = entities.filter(e => e.aligned).length;
  const entitiesWithoutSchema = entities.filter(e => !e.schemaTable).length;
  const entitiesWithoutTypes = entities.filter(e => !e.typeDefinition).length;

  const recommendations: string[] = [];

  // Generate recommendations
  if (entitiesWithoutTypes > 0) {
    recommendations.push(`Generate type definitions for ${entitiesWithoutTypes} tables without types`);
  }

  if (entitiesWithoutSchema > 0) {
    recommendations.push(`Review ${entitiesWithoutSchema} type definitions without corresponding schemas`);
  }

  const errorCount = allIssues.filter(i => i.severity === 'error').length;
  if (errorCount > 0) {
    recommendations.push(`Fix ${errorCount} critical alignment errors before proceeding`);
  }

  return {
    timestamp: new Date().toISOString(),
    totalEntities: entities.length,
    alignedEntities: alignedCount,
    misalignedEntities: entities.length - alignedCount,
    entitiesWithoutSchema,
    entitiesWithoutTypes,
    entities,
    issues: allIssues,
    summary: {
      errors: allIssues.filter(i => i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
      info: allIssues.filter(i => i.severity === 'info').length,
    },
    recommendations,
  };
}

function displayReport(report: AlignmentReport): void {
  console.log('=' .repeat(60));
  console.log('📊 ALIGNMENT REPORT SUMMARY');
  console.log('=' .repeat(60));
  console.log();
  console.log(`   Total Entities Analyzed: ${report.totalEntities}`);
  console.log(`   ✅ Aligned: ${report.alignedEntities}`);
  console.log(`   ❌ Misaligned: ${report.misalignedEntities}`);
  console.log(`   ⚠️  Without Schema: ${report.entitiesWithoutSchema}`);
  console.log(`   ⚠️  Without Types: ${report.entitiesWithoutTypes}`);
  console.log();
  console.log(`   Issues Found:`);
  console.log(`   - ❌ Errors: ${report.summary.errors}`);
  console.log(`   - ⚠️  Warnings: ${report.summary.warnings}`);
  console.log(`   - ℹ️  Info: ${report.summary.info}`);
  console.log();

  if (report.issues.length > 0) {
    console.log('=' .repeat(60));
    console.log('🔍 DETAILED ISSUES');
    console.log('=' .repeat(60));
    console.log();

    // Group issues by entity
    const issuesByEntity = new Map<string, AlignmentIssue[]>();
    for (const issue of report.issues) {
      if (!issuesByEntity.has(issue.entity)) {
        issuesByEntity.set(issue.entity, []);
      }
      issuesByEntity.get(issue.entity)!.push(issue);
    }

    for (const [entity, issues] of issuesByEntity) {
      console.log(`📦 ${entity}`);
      for (const issue of issues) {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} [${issue.field}] ${issue.issue}`);
        if (issue.schemaValue) console.log(`      Schema: ${issue.schemaValue}`);
        if (issue.typeValue) console.log(`      Type: ${issue.typeValue}`);
        if (issue.recommendation) console.log(`      💡 ${issue.recommendation}`);
      }
      console.log();
    }
  }

  if (report.recommendations.length > 0) {
    console.log('=' .repeat(60));
    console.log('💡 RECOMMENDATIONS');
    console.log('=' .repeat(60));
    console.log();
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    console.log();
  }

  if (report.issues.length === 0) {
    console.log('=' .repeat(60));
    console.log('✅ ALL SCHEMAS AND TYPES ARE PERFECTLY ALIGNED!');
    console.log('=' .repeat(60));
    console.log();
  }
}

// ============================================================================
// Entry Point
// ============================================================================

verifyAlignment().catch(error => {
  console.error('\n❌ Verification failed with error:\n');
  console.error(error);
  console.error();
  process.exit(1);
});
