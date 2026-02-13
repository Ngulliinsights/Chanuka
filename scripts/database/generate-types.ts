#!/usr/bin/env tsx
/**
 * Type Generation Script
 * Generates TypeScript types from Drizzle schema definitions
 * 
 * This script:
 * 1. Uses Drizzle's built-in type inference ($inferSelect, $inferInsert)
 * 2. Generates database table types from schema definitions
 * 3. Transforms database types to domain types (snake_case → camelCase)
 * 4. Outputs types to shared/types/database/
 * 
 * Usage:
 *   npm run db:generate-types
 *   tsx scripts/database/generate-types.ts
 * 
 * Requirements: 1.2, 2.1
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Project, SourceFile, VariableDeclaration, SyntaxKind } from 'ts-morph';

interface TableInfo {
  name: string;
  exportName: string;
  columns: ColumnInfo[];
  hasRelations: boolean;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: string;
  defaultValue?: string;
}

interface EnumInfo {
  name: string;
  values: string[];
}

/**
 * Main type generation function
 */
async function generateTypes() {
  console.log('🔄 Starting type generation from Drizzle schemas...\n');

  const project = new Project({
    tsConfigFilePath: join(process.cwd(), 'server', 'tsconfig.json'),
  });

  // Load schema files from drizzle.config.ts
  const schemaPath = join(process.cwd(), 'server', 'infrastructure', 'schema');
  const schemaFiles = [
    'foundation.ts',
    'citizen_participation.ts',
    'parliamentary_process.ts',
    'safeguards.ts',
    'enum.ts',
  ];

  const tables: TableInfo[] = [];
  const enums: EnumInfo[] = [];

  for (const schemaFile of schemaFiles) {
    const filePath = join(schemaPath, schemaFile);
    console.log(`📖 Reading schema: ${schemaFile}`);
    
    try {
      const sourceFile = project.addSourceFileAtPath(filePath);
      
      // Extract tables
      const extractedTables = extractTablesFromSchema(sourceFile);
      tables.push(...extractedTables);
      
      // Extract enums
      const extractedEnums = extractEnumsFromSchema(sourceFile);
      enums.push(...extractedEnums);
      
      console.log(`   ✓ Found ${extractedTables.length} tables, ${extractedEnums.length} enums`);
    } catch (error) {
      console.error(`   ✗ Error reading ${schemaFile}:`, error);
    }
  }

  console.log(`\n📊 Total tables found: ${tables.length}`);
  console.log(`📊 Total enums found: ${enums.length}\n`);

  // Generate database types using Drizzle's $inferSelect
  const databaseTypes = generateDatabaseTypes(tables, enums);
  
  // Generate domain types (transformed from database types)
  const domainTypes = generateDomainTypes(tables);

  // Write output files
  const outputDir = join(process.cwd(), 'shared', 'types', 'database');
  mkdirSync(outputDir, { recursive: true });

  const generatedTablesPath = join(outputDir, 'generated-tables.ts');
  writeFileSync(generatedTablesPath, databaseTypes);
  console.log(`✅ Generated database types: ${generatedTablesPath}`);

  const generatedDomainsPath = join(outputDir, 'generated-domains.ts');
  writeFileSync(generatedDomainsPath, domainTypes);
  console.log(`✅ Generated domain types: ${generatedDomainsPath}`);

  console.log('\n✨ Type generation complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Review generated types in shared/types/database/');
  console.log('   2. Update shared/types/database/index.ts to export generated types');
  console.log('   3. Run npm run db:verify-schema-alignment to verify alignment\n');
}

/**
 * Extract table information from a schema source file
 */
function extractTablesFromSchema(sourceFile: SourceFile): TableInfo[] {
  const tables: TableInfo[] = [];

  // Find all variable statements (const/let/var declarations)
  const variableStatements = sourceFile.getVariableStatements();

  for (const statement of variableStatements) {
    const isExported = statement.isExported();
    
    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      
      // Check if this is a pgTable call
      if (initializer) {
        const initText = initializer.getText();
        if (initText.includes('pgTable(') || initText.includes('pgTable (')) {
          const tableName = declaration.getName();
          const columns = extractColumnsFromTable(declaration);
          
          if (isExported && columns.length > 0) {
            tables.push({
              name: tableName,
              exportName: tableName,
              columns,
              hasRelations: false,
            });
          }
        }
      }
    }
  }

  return tables;
}

/**
 * Extract enum information from a schema source file
 */
function extractEnumsFromSchema(sourceFile: SourceFile): EnumInfo[] {
  const enums: EnumInfo[] = [];

  const variableStatements = sourceFile.getVariableStatements();

  for (const statement of variableStatements) {
    const isExported = statement.isExported();
    
    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      
      if (initializer && initializer.getText().includes('pgEnum')) {
        const enumName = declaration.getName();
        const values = extractEnumValues(initializer.getText());
        
        if (isExported && values.length > 0) {
          enums.push({
            name: enumName,
            values,
          });
        }
      }
    }
  }

  return enums;
}

/**
 * Extract enum values from pgEnum declaration
 */
function extractEnumValues(text: string): string[] {
  const match = text.match(/\[(.*?)\]/s);
  if (!match) return [];
  
  const valuesText = match[1];
  return valuesText
    .split(',')
    .map(v => v.trim().replace(/['"]/g, ''))
    .filter(v => v.length > 0);
}

/**
 * Extract column information from a table declaration
 * Enhanced to better parse Drizzle schema definitions
 */
function extractColumnsFromTable(declaration: VariableDeclaration): ColumnInfo[] {
  const columns: ColumnInfo[] = [];
  
  const initializer = declaration.getInitializer();
  if (!initializer) return columns;

  // Get the call expression (pgTable(...))
  const callExpressions = initializer.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  // Find the pgTable call
  const pgTableCall = callExpressions.find(call => {
    const expr = call.getExpression();
    return expr.getText() === 'pgTable';
  });

  if (!pgTableCall) return columns;

  const args = pgTableCall.getArguments();
  if (args.length < 2) return columns;

  // Second argument is the columns object
  const columnsObject = args[1];
  if (!columnsObject.isKind(SyntaxKind.ObjectLiteralExpression)) return columns;

  // Parse each property (column) in the object
  for (const property of columnsObject.getProperties()) {
    if (!property.isKind(SyntaxKind.PropertyAssignment)) continue;

    const columnName = property.getName();
    const columnInit = property.getInitializer();
    if (!columnInit) continue;

    const columnText = columnInit.getText();
    
    // Determine column type from the function call
    const typeMatch = columnText.match(/^(\w+)\(/);
    const drizzleType = typeMatch ? typeMatch[1] : 'unknown';
    
    columns.push({
      name: columnName,
      type: mapDrizzleTypeToTS(drizzleType),
      nullable: !columnText.includes('.notNull()'),
      isPrimaryKey: columnText.includes('.primaryKey()') || drizzleType === 'primaryKeyUuid',
      isForeignKey: columnText.includes('.references('),
      defaultValue: extractDefaultValue(columnText),
    });
  }

  return columns;
}

/**
 * Extract default value from column definition
 */
function extractDefaultValue(columnText: string): string | undefined {
  if (columnText.includes('.default(')) {
    const match = columnText.match(/\.default\((.*?)\)/);
    return match ? match[1] : undefined;
  }
  if (columnText.includes('.defaultNow()')) {
    return 'NOW()';
  }
  if (columnText.includes('.defaultRandom()')) {
    return 'UUID()';
  }
  return undefined;
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
    // Enum types will be handled separately
    'userRoleEnum': 'string',
    'billStatusEnum': 'string',
    'chamberEnum': 'string',
    'partyEnum': 'string',
    'kenyanCountyEnum': 'string',
    'anonymityLevelEnum': 'string',
  };

  return typeMap[drizzleType] || 'unknown';
}

/**
 * Generate database table type definitions
 * Uses Drizzle's $inferSelect pattern for type safety
 */
function generateDatabaseTypes(tables: TableInfo[], enums: EnumInfo[]): string {
  const timestamp = new Date().toISOString();
  
  const header = `/**
 * Generated Database Table Types
 * Auto-generated from Drizzle schema definitions
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run 'npm run db:generate-types' to regenerate
 * 
 * Generated: ${timestamp}
 * 
 * This file uses Drizzle's type inference to ensure database types
 * stay synchronized with schema definitions.
 */

// Import schema definitions for type inference
import * as schema from '../../../server/infrastructure/schema';

// Import branded types
import type {
  UserId,
  BillId,
  CommitteeId,
  CommentId,
  VoteId,
  SessionId,
  NotificationId,
  AmendmentId,
  ActionId,
  SponsorId,
  ArgumentId,
  ArgumentEvidenceId,
  BillTimelineEventId,
  BillCommitteeAssignmentId,
  LegislatorId,
} from '../core/branded';

// ============================================================================
// Database Table Types (Inferred from Drizzle Schema)
// ============================================================================

`;

  // Generate type aliases using Drizzle's $inferSelect
  const typeDefinitions = tables.map(table => {
    const typeName = toPascalCase(table.name) + 'Table';
    
    return `/**
 * ${table.name} table type (database representation)
 * Inferred from Drizzle schema definition
 * Maps to the '${table.name}' table in PostgreSQL
 */
export type ${typeName} = typeof schema.${table.exportName}.$inferSelect;

/**
 * ${table.name} insert type (for creating new records)
 * Omits auto-generated fields like id, created_at, updated_at
 */
export type ${typeName}Insert = typeof schema.${table.exportName}.$inferInsert;`;
  }).join('\n\n');

  const utilityTypes = `

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extract insert type (omits auto-generated fields)
 * @deprecated Use the specific *Insert types instead
 */
export type InsertType<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Extract update type (all fields optional except id)
 */
export type UpdateType<T> = Partial<Omit<T, 'id' | 'created_at'>> & Pick<T, 'id'>;

/**
 * Extract the type of a single column from a table type
 */
export type ColumnType<T, K extends keyof T> = T[K];
`;

  return header + typeDefinitions + utilityTypes;
}

/**
 * Generate domain type definitions
 * Transforms database types (snake_case) to domain types (camelCase)
 */
function generateDomainTypes(tables: TableInfo[]): string {
  const timestamp = new Date().toISOString();
  
  const header = `/**
 * Generated Domain Types
 * Transformed from database types for application use
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run 'npm run db:generate-types' to regenerate
 * 
 * Generated: ${timestamp}
 * 
 * Domain types use camelCase naming convention and are optimized
 * for use in application logic, while database types use snake_case
 * to match PostgreSQL conventions.
 */

import type {
  UserId,
  BillId,
  CommitteeId,
  CommentId,
  VoteId,
  SessionId,
  NotificationId,
  AmendmentId,
  ActionId,
  SponsorId,
  ArgumentId,
  ArgumentEvidenceId,
  BillTimelineEventId,
  BillCommitteeAssignmentId,
  LegislatorId,
} from '../core/branded';

// ============================================================================
// Domain Types (Application Layer)
// ============================================================================

`;

  const typeDefinitions = tables.map(table => {
    const interfaceName = toPascalCase(table.name);
    const columns = table.columns.map(col => {
      // Transform snake_case to camelCase for domain types
      const domainName = toCamelCase(col.name);
      const nullable = col.nullable ? ' | null' : '';
      
      // Add JSDoc comment for clarity
      const comment = col.name !== domainName ? `  /** Database column: ${col.name} */\n` : '';
      
      return `${comment}  ${domainName}: ${col.type}${nullable};`;
    }).join('\n');

    return `/**
 * ${table.name} domain type
 * Application-level representation of ${table.name}
 * 
 * Transformed from database table with camelCase naming
 */
export interface ${interfaceName} {
${columns}
}`;
  }).join('\n\n');

  const transformerNote = `

// ============================================================================
// Transformation Utilities
// ============================================================================

/**
 * NOTE: Transformation functions between database and domain types
 * should be implemented in shared/utils/transformers/
 * 
 * Example:
 * - UserDbToDomain: Transformer<UserTable, User>
 * - BillDbToDomain: Transformer<BillTable, Bill>
 */
`;

  return header + typeDefinitions + transformerNote;
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
 * Convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// Run the generator
generateTypes().catch(error => {
  console.error('❌ Type generation failed:', error);
  process.exit(1);
});
