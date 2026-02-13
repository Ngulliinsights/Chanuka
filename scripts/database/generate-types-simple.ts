#!/usr/bin/env tsx
/**
 * Simplified Type Generation Script
 * Generates TypeScript types from Drizzle schema using direct imports
 * 
 * This approach uses Drizzle's built-in $inferSelect and $inferInsert
 * to generate types directly from schema definitions.
 * 
 * Usage:
 *   npm run db:generate-types
 *   tsx scripts/database/generate-types-simple.ts
 * 
 * Requirements: 1.2, 2.1
 */

import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Main type generation function
 */
async function generateTypes() {
  console.log('🔄 Starting type generation from Drizzle schemas...\n');

  const schemaPath = join(process.cwd(), 'server', 'infrastructure', 'schema');
  const schemaFiles = readdirSync(schemaPath).filter(f => f.endsWith('.ts') && !f.includes('test'));

  // Extract table names from schema files
  const tableNames: string[] = [];
  
  for (const file of schemaFiles) {
    const filePath = join(schemaPath, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Find exported pgTable declarations
    const tableMatches = content.matchAll(/export\s+const\s+(\w+)\s*=\s*pgTable\(/g);
    for (const match of tableMatches) {
      tableNames.push(match[1]);
    }
  }

  console.log(`📊 Found ${tableNames.length} tables: ${tableNames.join(', ')}\n`);

  // Generate database types file
  const databaseTypes = generateDatabaseTypesFile(tableNames);
  
  // Write output
  const outputDir = join(process.cwd(), 'shared', 'types', 'database');
  mkdirSync(outputDir, { recursive: true });

  const generatedPath = join(outputDir, 'generated-tables.ts');
  writeFileSync(generatedPath, databaseTypes);
  console.log(`✅ Generated database types: ${generatedPath}\n`);

  console.log('✨ Type generation complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Review generated types in shared/types/database/generated-tables.ts');
  console.log('   2. Types are automatically exported via index.ts');
  console.log('   3. Use these types in your repositories and services\n');
}

/**
 * Generate the database types file using Drizzle's type inference
 */
function generateDatabaseTypesFile(tableNames: string[]): string {
  const timestamp = new Date().toISOString();
  
  const header = `/**
 * Generated Database Table Types
 * Auto-generated from Drizzle schema definitions using $inferSelect and $inferInsert
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run 'npm run db:generate-types' to regenerate
 * 
 * Generated: ${timestamp}
 * 
 * This file uses Drizzle's built-in type inference to ensure database types
 * stay synchronized with schema definitions. Each table gets two types:
 * - *Table: The full row type (from $inferSelect)
 * - *TableInsert: The insert type (from $inferInsert, omits auto-generated fields)
 */

// Import all schema definitions
import * as schema from '../../../server/infrastructure/schema';

// Import branded types for entity IDs
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

  // Generate type definitions for each table
  const typeDefinitions = tableNames.map(tableName => {
    const typeName = toPascalCase(tableName);
    
    return `/**
 * ${tableName} table type (database representation)
 * Inferred from Drizzle schema: schema.${tableName}
 * 
 * This type represents a complete row from the ${tableName} table.
 * All fields use snake_case to match PostgreSQL conventions.
 */
export type ${typeName}Table = typeof schema.${tableName}.$inferSelect;

/**
 * ${tableName} insert type (for creating new records)
 * Inferred from Drizzle schema: schema.${tableName}
 * 
 * This type is used when inserting new rows. It omits auto-generated
 * fields like id, created_at, and updated_at.
 */
export type ${typeName}TableInsert = typeof schema.${tableName}.$inferInsert;`;
  }).join('\n\n');

  const utilityTypes = `

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extract update type (all fields optional except id)
 * Use this for partial updates to existing records.
 */
export type UpdateType<T> = Partial<Omit<T, 'id' | 'created_at'>> & Pick<T, 'id'>;

/**
 * Extract the type of a single column from a table type
 */
export type ColumnType<T, K extends keyof T> = T[K];

/**
 * Make specific fields required in a type
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific fields optional in a type
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
`;

  return header + typeDefinitions + utilityTypes;
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

// Run the generator
generateTypes().catch(error => {
  console.error('❌ Type generation failed:', error);
  process.exit(1);
});
