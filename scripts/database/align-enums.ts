#!/usr/bin/env tsx
/**
 * Enum Alignment Script
 * Audits and aligns enum definitions between database schema and shared types
 * 
 * This script:
 * 1. Audits all enum definitions in database constraints (pgEnum)
 * 2. Compares with enum definitions in shared/types/core/enums.ts
 * 3. Identifies mismatches and missing enums
 * 4. Generates alignment report
 * 
 * Usage:
 *   npm run db:align-enums
 *   tsx scripts/database/align-enums.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface EnumDefinition {
  name: string;
  values: string[];
  source: 'database' | 'types';
  location: string;
}

interface EnumMismatch {
  enumName: string;
  issue: string;
  databaseValues?: string[];
  typeValues?: string[];
  missingInDatabase?: string[];
  missingInTypes?: string[];
  severity: 'error' | 'warning' | 'info';
}

interface AlignmentReport {
  timestamp: string;
  totalEnums: number;
  alignedEnums: number;
  misalignedEnums: number;
  mismatches: EnumMismatch[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Main alignment function
 */
async function alignEnums() {
  console.log('🔍 Starting enum alignment audit...\n');

  // Extract database enums
  console.log('📖 Reading database enum definitions...');
  const databaseEnums = extractDatabaseEnums();
  console.log(`   ✓ Found ${databaseEnums.length} database enums\n`);

  // Extract type enums
  console.log('📖 Reading shared type enum definitions...');
  const typeEnums = extractTypeEnums();
  console.log(`   ✓ Found ${typeEnums.length} type enums\n`);

  // Compare enums
  console.log('🔄 Comparing enum definitions...\n');
  const mismatches = compareEnums(databaseEnums, typeEnums);

  // Generate report
  const report: AlignmentReport = {
    timestamp: new Date().toISOString(),
    totalEnums: Math.max(databaseEnums.length, typeEnums.length),
    alignedEnums: databaseEnums.length + typeEnums.length - mismatches.length,
    misalignedEnums: mismatches.length,
    mismatches,
    summary: {
      errors: mismatches.filter(m => m.severity === 'error').length,
      warnings: mismatches.filter(m => m.severity === 'warning').length,
      info: mismatches.filter(m => m.severity === 'info').length,
    },
  };

  // Output report
  console.log('📊 Enum Alignment Report:\n');
  console.log(`   Total Enums: ${report.totalEnums}`);
  console.log(`   Aligned: ${report.alignedEnums}`);
  console.log(`   Misaligned: ${report.misalignedEnums}`);
  console.log(`\n   Issues:`);
  console.log(`   - Errors: ${report.summary.errors}`);
  console.log(`   - Warnings: ${report.summary.warnings}`);
  console.log(`   - Info: ${report.summary.info}`);

  if (mismatches.length > 0) {
    console.log('\n⚠️  Enum Alignment Issues Found:\n');
    mismatches.forEach(mismatch => {
      const icon = mismatch.severity === 'error' ? '❌' : mismatch.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${mismatch.enumName}: ${mismatch.issue}`);
      
      if (mismatch.missingInDatabase && mismatch.missingInDatabase.length > 0) {
        console.log(`   Missing in database: ${mismatch.missingInDatabase.join(', ')}`);
      }
      if (mismatch.missingInTypes && mismatch.missingInTypes.length > 0) {
        console.log(`   Missing in types: ${mismatch.missingInTypes.join(', ')}`);
      }
      console.log('');
    });
  } else {
    console.log('\n✅ All enums are aligned!');
  }

  // Write detailed report to file
  const reportPath = join(process.cwd(), 'enum-alignment-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);

  // Generate migration suggestions if needed
  if (mismatches.length > 0) {
    generateMigrationSuggestions(mismatches);
  }

  // Exit with error code if there are errors
  if (report.summary.errors > 0) {
    console.log('❌ Enum alignment check failed. Please fix the errors above.\n');
    process.exit(1);
  }
}

/**
 * Extract enum definitions from database schema files
 */
function extractDatabaseEnums(): EnumDefinition[] {
  const enums: EnumDefinition[] = [];
  const schemaPath = join(process.cwd(), 'server', 'infrastructure', 'schema', 'enum.ts');
  
  try {
    const content = readFileSync(schemaPath, 'utf-8');
    
    // Match pgEnum definitions
    const enumPattern = /export const (\w+) = pgEnum\('(\w+)',\s*\[([\s\S]*?)\]\);/g;
    let match;
    
    while ((match = enumPattern.exec(content)) !== null) {
      const [, constName, dbName, valuesStr] = match;
      
      // Extract values - handle inline comments and multi-line format
      // Split by comma first, then clean each value
      const values = valuesStr
        .split(',')
        .map(item => {
          // Remove inline comments (everything after //)
          const withoutComment = item.split('//')[0].trim();
          // Remove quotes
          return withoutComment.replace(/['"]/g, '').trim();
        })
        .filter(v => v.length > 0 && !v.startsWith('//'));
      
      enums.push({
        name: constName,
        values,
        source: 'database',
        location: schemaPath,
      });
    }
  } catch (error) {
    console.error(`Error reading database enums: ${error}`);
  }
  
  return enums;
}

/**
 * Extract enum definitions from shared types
 */
function extractTypeEnums(): EnumDefinition[] {
  const enums: EnumDefinition[] = [];
  const typesPath = join(process.cwd(), 'shared', 'types', 'core', 'enums.ts');
  
  try {
    const content = readFileSync(typesPath, 'utf-8');
    
    // Match TypeScript enum definitions
    const enumPattern = /export enum (\w+) \{([\s\S]*?)\}/g;
    let match;
    
    while ((match = enumPattern.exec(content)) !== null) {
      const [, enumName, membersStr] = match;
      
      // Extract values
      const values = membersStr
        .split(',')
        .map(line => {
          const valueMatch = line.match(/=\s*['"]([^'"]+)['"]/);
          return valueMatch ? valueMatch[1] : null;
        })
        .filter((v): v is string => v !== null);
      
      enums.push({
        name: enumName,
        values,
        source: 'types',
        location: typesPath,
      });
    }
  } catch (error) {
    console.error(`Error reading type enums: ${error}`);
  }
  
  return enums;
}

/**
 * Compare database and type enums
 */
function compareEnums(
  databaseEnums: EnumDefinition[],
  typeEnums: EnumDefinition[]
): EnumMismatch[] {
  const mismatches: EnumMismatch[] = [];
  
  // Create maps for easier lookup
  const dbEnumMap = new Map(databaseEnums.map(e => [normalizeEnumName(e.name), e]));
  const typeEnumMap = new Map(typeEnums.map(e => [normalizeEnumName(e.name), e]));
  
  // Check database enums against type enums
  for (const dbEnum of databaseEnums) {
    const normalizedName = normalizeEnumName(dbEnum.name);
    const typeEnum = typeEnumMap.get(normalizedName);
    
    if (!typeEnum) {
      mismatches.push({
        enumName: dbEnum.name,
        issue: 'Database enum has no corresponding type enum',
        databaseValues: dbEnum.values,
        severity: 'error',
      });
      continue;
    }
    
    // Compare values
    const dbValues = new Set(dbEnum.values.map(v => v.toLowerCase()));
    const typeValues = new Set(typeEnum.values.map(v => v.toLowerCase()));
    
    const missingInDb = typeEnum.values.filter(v => !dbValues.has(v.toLowerCase()));
    const missingInTypes = dbEnum.values.filter(v => !typeValues.has(v.toLowerCase()));
    
    if (missingInDb.length > 0 || missingInTypes.length > 0) {
      mismatches.push({
        enumName: dbEnum.name,
        issue: 'Enum values mismatch between database and types',
        databaseValues: dbEnum.values,
        typeValues: typeEnum.values,
        missingInDatabase: missingInDb.length > 0 ? missingInDb : undefined,
        missingInTypes: missingInTypes.length > 0 ? missingInTypes : undefined,
        severity: 'error',
      });
    }
  }
  
  // Check for type enums without database enums
  for (const typeEnum of typeEnums) {
    const normalizedName = normalizeEnumName(typeEnum.name);
    if (!dbEnumMap.has(normalizedName)) {
      mismatches.push({
        enumName: typeEnum.name,
        issue: 'Type enum has no corresponding database enum',
        typeValues: typeEnum.values,
        severity: 'warning',
      });
    }
  }
  
  return mismatches;
}

/**
 * Normalize enum name for comparison
 * Handles different naming conventions (e.g., userRoleEnum vs UserRole)
 */
function normalizeEnumName(name: string): string {
  return name
    .replace(/Enum$/i, '')
    .replace(/_/g, '')
    .toLowerCase();
}

/**
 * Generate migration suggestions for fixing enum mismatches
 */
function generateMigrationSuggestions(mismatches: EnumMismatch[]) {
  console.log('💡 Migration Suggestions:\n');
  
  for (const mismatch of mismatches) {
    if (mismatch.severity !== 'error') continue;
    
    console.log(`For ${mismatch.enumName}:`);
    
    if (mismatch.missingInDatabase && mismatch.missingInDatabase.length > 0) {
      console.log('  Add to database schema:');
      console.log(`  ALTER TYPE ${toSnakeCase(mismatch.enumName)} ADD VALUE IF NOT EXISTS '${mismatch.missingInDatabase[0]}';`);
    }
    
    if (mismatch.missingInTypes && mismatch.missingInTypes.length > 0) {
      console.log('  Add to shared/types/core/enums.ts:');
      mismatch.missingInTypes.forEach(value => {
        const enumKey = toPascalCase(value);
        console.log(`  ${enumKey} = '${value}',`);
      });
    }
    
    console.log('');
  }
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// Run the alignment
alignEnums().catch(error => {
  console.error('❌ Enum alignment failed:', error);
  process.exit(1);
});
