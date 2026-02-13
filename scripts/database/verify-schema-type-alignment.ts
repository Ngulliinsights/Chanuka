#!/usr/bin/env tsx
/**
 * Schema-Type Alignment Verification Tool
 * Compares database schema with type definitions to ensure synchronization
 * 
 * This script:
 * 1. Reads Drizzle schema definitions
 * 2. Reads TypeScript type definitions
 * 3. Compares field names, types, nullability, and constraints
 * 4. Generates detailed alignment report
 * 
 * Usage:
 *   npm run db:verify-schema-alignment
 *   tsx scripts/database/verify-schema-type-alignment.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Project, SourceFile, InterfaceDeclaration, PropertySignature } from 'ts-morph';

interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  hasDefault: boolean;
  isUnique: boolean;
}

interface TypeField {
  name: string;
  type: string;
  nullable: boolean;
}

interface AlignmentIssue {
  entity: string;
  field: string;
  issue: string;
  schemaValue?: string;
  typeValue?: string;
  severity: 'error' | 'warning' | 'info';
}

interface AlignmentReport {
  timestamp: string;
  totalEntities: number;
  alignedEntities: number;
  misalignedEntities: number;
  issues: AlignmentIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Main verification function
 */
async function verifyAlignment() {
  console.log('🔍 Starting schema-type alignment verification...\n');

  const project = new Project({
    tsConfigFilePath: join(process.cwd(), 'server', 'tsconfig.json'),
  });

  // Load schema files
  const schemaPath = join(process.cwd(), 'server', 'infrastructure', 'schema');
  const schemaFiles = [
    'foundation.ts',
    'citizen_participation.ts',
    'parliamentary_process.ts',
  ];

  // Load type files
  const typesPath = join(process.cwd(), 'shared', 'types');
  const typeFiles = [
    'database/tables.ts',
    'domains/legislative/bill.ts',
    'domains/authentication/user.ts',
  ];

  const issues: AlignmentIssue[] = [];
  const entitiesChecked = new Set<string>();

  // Extract schema definitions
  console.log('📖 Reading schema definitions...');
  const schemaDefinitions = new Map<string, Map<string, SchemaField>>();
  
  for (const schemaFile of schemaFiles) {
    const filePath = join(schemaPath, schemaFile);
    try {
      const sourceFile = project.addSourceFileAtPath(filePath);
      const tables = extractSchemaDefinitions(sourceFile);
      tables.forEach((fields, tableName) => {
        schemaDefinitions.set(tableName, fields);
        entitiesChecked.add(tableName);
      });
      console.log(`   ✓ Loaded ${tables.size} tables from ${schemaFile}`);
    } catch (error) {
      console.error(`   ✗ Error reading ${schemaFile}:`, error);
    }
  }

  // Extract type definitions
  console.log('\n📖 Reading type definitions...');
  const typeDefinitions = new Map<string, Map<string, TypeField>>();
  
  for (const typeFile of typeFiles) {
    const filePath = join(typesPath, typeFile);
    try {
      const sourceFile = project.addSourceFileAtPath(filePath);
      const types = extractTypeDefinitions(sourceFile);
      types.forEach((fields, typeName) => {
        typeDefinitions.set(typeName, fields);
      });
      console.log(`   ✓ Loaded ${types.size} types from ${typeFile}`);
    } catch (error) {
      console.error(`   ✗ Error reading ${typeFile}:`, error);
    }
  }

  // Compare schema and types
  console.log('\n🔄 Comparing schema and type definitions...\n');
  
  for (const [tableName, schemaFields] of schemaDefinitions) {
    // Find corresponding type (handle naming conventions)
    const typeName = findCorrespondingType(tableName, typeDefinitions);
    
    if (!typeName) {
      issues.push({
        entity: tableName,
        field: 'N/A',
        issue: 'No corresponding type definition found',
        severity: 'error',
      });
      continue;
    }

    const typeFields = typeDefinitions.get(typeName)!;
    
    // Compare fields
    const fieldIssues = compareFields(tableName, schemaFields, typeFields);
    issues.push(...fieldIssues);
  }

  // Check for types without corresponding schemas
  for (const [typeName, typeFields] of typeDefinitions) {
    const tableName = findCorrespondingSchema(typeName, schemaDefinitions);
    if (!tableName) {
      issues.push({
        entity: typeName,
        field: 'N/A',
        issue: 'Type definition has no corresponding schema',
        severity: 'warning',
      });
    }
  }

  // Generate report
  const report: AlignmentReport = {
    timestamp: new Date().toISOString(),
    totalEntities: entitiesChecked.size,
    alignedEntities: entitiesChecked.size - new Set(issues.map(i => i.entity)).size,
    misalignedEntities: new Set(issues.map(i => i.entity)).size,
    issues,
    summary: {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    },
  };

  // Output report
  console.log('📊 Alignment Report:\n');
  console.log(`   Total Entities: ${report.totalEntities}`);
  console.log(`   Aligned: ${report.alignedEntities}`);
  console.log(`   Misaligned: ${report.misalignedEntities}`);
  console.log(`\n   Issues:`);
  console.log(`   - Errors: ${report.summary.errors}`);
  console.log(`   - Warnings: ${report.summary.warnings}`);
  console.log(`   - Info: ${report.summary.info}`);

  if (issues.length > 0) {
    console.log('\n⚠️  Alignment Issues Found:\n');
    issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${icon} [${issue.entity}] ${issue.field}: ${issue.issue}`);
      if (issue.schemaValue) console.log(`   Schema: ${issue.schemaValue}`);
      if (issue.typeValue) console.log(`   Type: ${issue.typeValue}`);
    });
  } else {
    console.log('\n✅ All schemas and types are aligned!');
  }

  // Write detailed report to file
  const reportPath = join(process.cwd(), 'schema-alignment-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);

  // Exit with error code if there are errors
  if (report.summary.errors > 0) {
    process.exit(1);
  }
}

/**
 * Extract schema field definitions from a source file
 */
function extractSchemaDefinitions(sourceFile: SourceFile): Map<string, Map<string, SchemaField>> {
  const tables = new Map<string, Map<string, SchemaField>>();
  
  const variableStatements = sourceFile.getVariableStatements();
  
  for (const statement of variableStatements) {
    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      
      if (initializer && initializer.getText().includes('pgTable')) {
        const tableName = declaration.getName();
        const text = declaration.getText();
        
        // Extract fields (simplified parsing)
        const fields = new Map<string, SchemaField>();
        const fieldPattern = /(\w+):\s*(\w+)\([^)]*\)([^,}]*)/g;
        let match;
        
        while ((match = fieldPattern.exec(text)) !== null) {
          const [, fieldName, fieldType, modifiers] = match;
          
          fields.set(fieldName, {
            name: fieldName,
            type: mapDrizzleTypeToTS(fieldType),
            nullable: !modifiers.includes('.notNull()'),
            isPrimaryKey: modifiers.includes('primaryKey()') || modifiers.includes('primaryKeyUuid()'),
            hasDefault: modifiers.includes('.default('),
            isUnique: modifiers.includes('.unique()'),
          });
        }
        
        if (fields.size > 0) {
          tables.set(tableName, fields);
        }
      }
    }
  }
  
  return tables;
}

/**
 * Extract type field definitions from a source file
 */
function extractTypeDefinitions(sourceFile: SourceFile): Map<string, Map<string, TypeField>> {
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
        const nullable = typeText.includes('| null') || typeText.includes('| undefined');
        const baseType = typeText.replace(/\s*\|\s*(null|undefined)/g, '');
        
        fields.set(fieldName, {
          name: fieldName,
          type: baseType,
          nullable,
        });
      }
    }
    
    if (fields.size > 0) {
      types.set(typeName, fields);
    }
  }
  
  return types;
}

/**
 * Compare schema fields with type fields
 */
function compareFields(
  entityName: string,
  schemaFields: Map<string, SchemaField>,
  typeFields: Map<string, TypeField>
): AlignmentIssue[] {
  const issues: AlignmentIssue[] = [];
  
  // Check for missing fields in types
  for (const [fieldName, schemaField] of schemaFields) {
    const typeField = typeFields.get(fieldName);
    
    if (!typeField) {
      issues.push({
        entity: entityName,
        field: fieldName,
        issue: 'Field exists in schema but not in type definition',
        schemaValue: `${schemaField.type}${schemaField.nullable ? ' | null' : ''}`,
        severity: 'error',
      });
      continue;
    }
    
    // Check type compatibility
    if (!areTypesCompatible(schemaField.type, typeField.type)) {
      issues.push({
        entity: entityName,
        field: fieldName,
        issue: 'Type mismatch between schema and type definition',
        schemaValue: schemaField.type,
        typeValue: typeField.type,
        severity: 'error',
      });
    }
    
    // Check nullability
    if (schemaField.nullable !== typeField.nullable) {
      issues.push({
        entity: entityName,
        field: fieldName,
        issue: 'Nullability mismatch',
        schemaValue: schemaField.nullable ? 'nullable' : 'not null',
        typeValue: typeField.nullable ? 'nullable' : 'not null',
        severity: 'error',
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
        typeValue: `${typeField.type}${typeField.nullable ? ' | null' : ''}`,
        severity: 'warning',
      });
    }
  }
  
  return issues;
}

/**
 * Check if two types are compatible
 */
function areTypesCompatible(schemaType: string, typeDefType: string): boolean {
  // Normalize types
  const normalizedSchema = schemaType.toLowerCase().trim();
  const normalizedType = typeDefType.toLowerCase().trim();
  
  // Direct match
  if (normalizedSchema === normalizedType) return true;
  
  // Handle branded types (e.g., UserId is compatible with string)
  if (normalizedSchema === 'string' && normalizedType.includes('id')) return true;
  
  // Handle Record types
  if (normalizedSchema.includes('record') && normalizedType.includes('record')) return true;
  
  return false;
}

/**
 * Find corresponding type for a table name
 */
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
  
  return null;
}

/**
 * Find corresponding schema for a type name
 */
function findCorrespondingSchema(
  typeName: string,
  schemaDefinitions: Map<string, Map<string, SchemaField>>
): string | null {
  // Remove "Table" suffix if present
  const cleanTypeName = typeName.replace(/Table$/, '');
  const tableName = toSnakeCase(cleanTypeName);
  
  if (schemaDefinitions.has(tableName)) return tableName;
  
  return null;
}

/**
 * Map Drizzle column types to TypeScript types
 */
function mapDrizzleTypeToTS(drizzleType: string): string {
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

/**
 * Convert snake_case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Convert PascalCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// Run the verification
verifyAlignment().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
