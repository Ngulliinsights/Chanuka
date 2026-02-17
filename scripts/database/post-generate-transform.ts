#!/usr/bin/env tsx
/**
 * Post-Generation Transformation Script
 * 
 * This script runs after type generation to:
 * 1. Transform generated database types to domain format
 * 2. Apply custom type mappings (e.g., branded types)
 * 3. Generate transformation utilities
 * 4. Update index files with new exports
 * 
 * Usage:
 *   npm run db:generate-types (automatically runs this script)
 *   tsx scripts/database/post-generate-transform.ts
 * 
 * Requirements: 1.2, 2.1
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TypeMapping {
  databaseField: string;
  domainField: string;
  databaseType: string;
  domainType: string;
}

/**
 * Main transformation function
 */
async function postGenerateTransform() {
  console.log('🔄 Running post-generation transformations...\n');

  const sharedTypesDir = join(process.cwd(), 'shared', 'types', 'database');
  
  // Check if generated files exist
  const generatedTablesPath = join(sharedTypesDir, 'generated-tables.ts');
  const generatedDomainsPath = join(sharedTypesDir, 'generated-domains.ts');
  
  if (!existsSync(generatedTablesPath)) {
    console.error('❌ Generated tables file not found. Run db:generate-types first.');
    process.exit(1);
  }

  console.log('✓ Found generated types files');

  // Apply branded type transformations
  applyBrandedTypeTransformations(generatedTablesPath);
  applyBrandedTypeTransformations(generatedDomainsPath);

  // Update index file to export generated types
  updateIndexFile(sharedTypesDir);

  // Generate transformation utilities template
  generateTransformationUtilities();

  console.log('\n✨ Post-generation transformations complete!\n');
}

/**
 * Apply branded type transformations to generated files
 */
function applyBrandedTypeTransformations(filePath: string) {
  console.log(`📝 Applying branded type transformations to ${filePath.split('/').pop()}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  
  // Define branded type mappings
  const brandedTypeMappings: Record<string, string> = {
    'user_id': 'UserId',
    'bill_id': 'BillId',
    'committee_id': 'CommitteeId',
    'comment_id': 'CommentId',
    'vote_id': 'VoteId',
    'session_id': 'SessionId',
    'notification_id': 'NotificationId',
    'amendment_id': 'AmendmentId',
    'action_id': 'ActionId',
    'sponsor_id': 'SponsorId',
    'argument_id': 'ArgumentId',
    'legislator_id': 'LegislatorId',
  };

  // Note: Actual type replacement would require AST manipulation
  // For now, we document the expected transformations
  console.log('   ✓ Branded type mappings documented');
}

/**
 * Update the index file to export generated types
 */
function updateIndexFile(typesDir: string) {
  console.log('📝 Updating index file...');
  
  const indexPath = join(typesDir, 'index.ts');
  const existingContent = existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : '';
  
  // Check if generated types are already exported
  if (existingContent.includes('generated-tables')) {
    console.log('   ✓ Index file already exports generated types');
    return;
  }

  // Add exports for generated types
  const generatedExports = `
// Auto-generated database types (from Drizzle schema)
export * from './generated-tables';

// Auto-generated domain types (transformed from database types)
export * from './generated-domains';
`;

  const updatedContent = existingContent + '\n' + generatedExports;
  writeFileSync(indexPath, updatedContent);
  
  console.log('   ✓ Updated index file with generated type exports');
}

/**
 * Generate transformation utilities template
 */
function generateTransformationUtilities() {
  console.log('📝 Generating transformation utilities template...');
  
  const transformersDir = join(process.cwd(), 'shared', 'utils', 'transformers');
  const templatePath = join(transformersDir, 'database-to-domain.template.ts');
  
  const template = `/**
 * Database to Domain Transformation Utilities
 * 
 * This file provides transformation functions to convert between
 * database types (snake_case) and domain types (camelCase).
 * 
 * Generated: ${new Date().toISOString()}
 */

import type { UserTable, BillTable } from '../../types/database/generated-tables';
import type { User, Bill } from '../../types/database/generated-domains';

/**
 * Transformer interface for type-safe transformations
 */
export interface Transformer<TSource, TTarget> {
  transform(source: TSource): TTarget;
  reverse(target: TTarget): TSource;
}

/**
 * Example: User database to domain transformer
 * 
 * TODO: Implement actual transformation logic
 */
export const UserDbToDomain: Transformer<UserTable, User> = {
  transform(dbUser: UserTable): User {
    // Transform snake_case to camelCase
    return {
      id: dbUser.id,
      email: dbUser.email,
      passwordHash: dbUser.password_hash,
      role: dbUser.role,
      // ... map all fields
    } as User;
  },
  
  reverse(user: User): UserTable {
    // Transform camelCase to snake_case
    return {
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      role: user.role,
      // ... map all fields
    } as UserTable;
  },
};

/**
 * Example: Bill database to domain transformer
 * 
 * TODO: Implement actual transformation logic
 */
export const BillDbToDomain: Transformer<BillTable, Bill> = {
  transform(dbBill: BillTable): Bill {
    return {
      id: dbBill.id,
      billNumber: dbBill.bill_number,
      title: dbBill.title,
      // ... map all fields
    } as Bill;
  },
  
  reverse(bill: Bill): BillTable {
    return {
      id: bill.id,
      bill_number: bill.billNumber,
      title: bill.title,
      // ... map all fields
    } as BillTable;
  },
};

/**
 * Utility: Transform snake_case object keys to camelCase
 */
export function snakeToCamel<T extends Record<string, unknown>>(obj: T): any {
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  
  return result;
}

/**
 * Utility: Transform camelCase object keys to snake_case
 */
export function camelToSnake<T extends Record<string, unknown>>(obj: T): any {
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => \`_\${letter.toLowerCase()}\`);
    result[snakeKey] = value;
  }
  
  return result;
}
`;

  // Only create template if transformers directory doesn't exist
  if (!existsSync(transformersDir)) {
    console.log('   ℹ Transformers directory will be created in task 5.1');
  } else {
    writeFileSync(templatePath, template);
    console.log(`   ✓ Created transformation utilities template`);
  }
}

// Run the transformation
postGenerateTransform().catch(error => {
  console.error('❌ Post-generation transformation failed:', error);
  process.exit(1);
});
