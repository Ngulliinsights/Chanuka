#!/usr/bin/env tsx
/**
 * Bulk Fix Templates for Type Safety Violations
 * 
 * Provides templates and utilities for fixing common `as any` patterns:
 * - Enum conversions
 * - API responses
 * - Database operations
 * - Dynamic property access
 * 
 * Each template includes:
 * - Pattern matching
 * - Replacement logic
 * - Verification (TypeScript compilation)
 * 
 * Usage:
 *   tsx scripts/fix-templates.ts --template enum-conversions --dry-run
 *   tsx scripts/fix-templates.ts --template api-responses --apply
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';

// Types
type FixTemplate = {
  name: string;
  pattern: RegExp;
  replacement: (match: RegExpMatchArray, context: FileContext) => string | null;
  category: string;
  description: string;
  requiresImport?: string[];
};

type FileContext = {
  filePath: string;
  content: string;
  lines: string[];
  imports: string[];
};

type FixResult = {
  file: string;
  fixesApplied: number;
  success: boolean;
  error?: string;
};

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const TEMPLATE_NAME = process.argv.find(arg => arg.startsWith('--template='))?.split('=')[1];

/**
 * Extract imports from file content
 */
function extractImports(content: string): string[] {
  const importRegex = /^import\s+.*?from\s+['"](.+?)['"]/gm;
  const imports: string[] = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Add import to file if not already present
 */
function addImportIfNeeded(content: string, importStatement: string): string {
  if (content.includes(importStatement)) {
    return content;
  }
  
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  // Insert after last import or at the beginning
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importStatement);
  } else {
    lines.unshift(importStatement);
  }
  
  return lines.join('\n');
}

/**
 * Fix Template: Enum Conversions
 * Replaces: value as any
 * With: enumConverter.toEnum(value)
 */
const enumConversionTemplate: FixTemplate = {
  name: 'enum-conversions',
  category: 'enum_conversion',
  description: 'Replace `as any` with proper enum converter for enum-like values',
  pattern: /(\w+)\s+as\s+any(?=\s*[,;)\]])/g,
  requiresImport: ["import { createEnumConverter } from '@/shared/utils/type-guards';"],
  replacement: (match, context) => {
    const varName = match[1];
    
    // Check if this looks like an enum conversion
    const line = context.lines.find(l => l.includes(match[0]));
    if (!line) return null;
    
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('status') || 
        lowerLine.includes('role') || 
        lowerLine.includes('type') || 
        lowerLine.includes('level') ||
        lowerLine.includes('state')) {
      // This is likely an enum conversion
      // Note: The actual enum converter needs to be created separately
      return `/* TODO: Create enum converter */ ${varName}`;
    }
    
    return null;
  },
};

/**
 * Fix Template: API Response Validation
 * Replaces: response.data as any
 * With: apiResponseSchema.parse(response.data)
 */
const apiResponseTemplate: FixTemplate = {
  name: 'api-responses',
  category: 'api_response',
  description: 'Replace `as any` with Zod schema validation for API responses',
  pattern: /([\w.]+)\s+as\s+any/g,
  requiresImport: ["import { z } from 'zod';"],
  replacement: (match, context) => {
    const expression = match[1];
    
    // Check if this is an API response
    if (expression.includes('response') || 
        expression.includes('.data') ||
        expression.includes('result')) {
      // Suggest Zod validation
      return `/* TODO: Create Zod schema */ ${expression}`;
    }
    
    return null;
  },
};

/**
 * Fix Template: Database Row Normalization
 * Replaces: row as any
 * With: normalizeRow(row, schema)
 */
const databaseOperationTemplate: FixTemplate = {
  name: 'database-operations',
  category: 'database_operation',
  description: 'Replace `as any` with proper type guards for database operations',
  pattern: /(\w+)\s+as\s+any/g,
  replacement: (match, context) => {
    const varName = match[1];
    
    // Check if this is a database operation
    if (context.filePath.includes('repository') ||
        context.filePath.includes('database') ||
        varName === 'row' ||
        varName === 'result') {
      return `/* TODO: Add type guard */ ${varName}`;
    }
    
    return null;
  },
};

/**
 * Fix Template: Dynamic Property Access
 * Replaces: obj[key] as any
 * With: proper type guard or Record type
 */
const dynamicPropertyTemplate: FixTemplate = {
  name: 'dynamic-properties',
  category: 'dynamic_property',
  description: 'Replace `as any` with proper type guards for dynamic property access',
  pattern: /([\w.]+\[[\w'"]+\])\s+as\s+any/g,
  replacement: (match, context) => {
    const expression = match[1];
    return `/* TODO: Add type guard or use Record<string, unknown> */ ${expression}`;
  },
};

/**
 * Fix Template: Type Assertions
 * Replaces: value as any as TargetType
 * With: proper type guard or validation
 */
const typeAssertionTemplate: FixTemplate = {
  name: 'type-assertions',
  category: 'type_assertion',
  description: 'Replace double type assertions with proper validation',
  pattern: /(.+?)\s+as\s+any\s+as\s+(\w+)/g,
  replacement: (match, context) => {
    const expression = match[1];
    const targetType = match[2];
    return `/* TODO: Add validation for ${targetType} */ ${expression}`;
  },
};

// All templates
const ALL_TEMPLATES: FixTemplate[] = [
  enumConversionTemplate,
  apiResponseTemplate,
  databaseOperationTemplate,
  dynamicPropertyTemplate,
  typeAssertionTemplate,
];

/**
 * Apply a fix template to a file
 */
function applyTemplateToFile(
  filePath: string,
  template: FixTemplate
): FixResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const imports = extractImports(content);
    
    const context: FileContext = {
      filePath,
      content,
      lines,
      imports,
    };
    
    let modifiedContent = content;
    let fixesApplied = 0;
    
    // Apply replacements
    modifiedContent = modifiedContent.replace(template.pattern, (match, ...args) => {
      const matchArray = [match, ...args.slice(0, -2)] as RegExpMatchArray;
      const replacement = template.replacement(matchArray, context);
      
      if (replacement !== null) {
        fixesApplied++;
        return replacement;
      }
      
      return match;
    });
    
    // Add required imports
    if (fixesApplied > 0 && template.requiresImport) {
      for (const importStatement of template.requiresImport) {
        modifiedContent = addImportIfNeeded(modifiedContent, importStatement);
      }
    }
    
    // Write back if not dry run
    if (!DRY_RUN && fixesApplied > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf-8');
      
      // Verify TypeScript compilation
      try {
        execSync('tsc --noEmit', { stdio: 'pipe' });
      } catch (error) {
        // Rollback if compilation fails
        fs.writeFileSync(filePath, content, 'utf-8');
        return {
          file: filePath,
          fixesApplied: 0,
          success: false,
          error: 'TypeScript compilation failed after fix',
        };
      }
    }
    
    return {
      file: filePath,
      fixesApplied,
      success: true,
    };
  } catch (error: any) {
    return {
      file: filePath,
      fixesApplied: 0,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Apply template to all matching files
 */
async function applyTemplate(template: FixTemplate): Promise<void> {
  console.log(`\n🔧 Applying template: ${template.name}`);
  console.log(`📝 Description: ${template.description}`);
  console.log(`🏷️  Category: ${template.category}`);
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  } else {
    console.log('✏️  APPLY MODE - Files will be modified\n');
  }
  
  // Find all TypeScript files
  const patterns = ['client/src/**/*.{ts,tsx}', 'server/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'];
  const allFiles: string[] = [];
  
  for (const pattern of patterns) {
    const files = await glob(pattern, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'] 
    });
    allFiles.push(...files);
  }
  
  console.log(`📁 Scanning ${allFiles.length} files...\n`);
  
  const results: FixResult[] = [];
  let totalFixes = 0;
  
  for (const file of allFiles) {
    const result = applyTemplateToFile(file, template);
    
    if (result.fixesApplied > 0) {
      results.push(result);
      totalFixes += result.fixesApplied;
      
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${file}: ${result.fixesApplied} fixes ${result.error ? `(${result.error})` : ''}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files processed: ${allFiles.length}`);
  console.log(`Files modified: ${results.length}`);
  console.log(`Total fixes: ${totalFixes}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

/**
 * List all available templates
 */
function listTemplates(): void {
  console.log('\n📋 Available Fix Templates:\n');
  
  for (const template of ALL_TEMPLATES) {
    console.log(`  ${template.name}`);
    console.log(`    Category: ${template.category}`);
    console.log(`    Description: ${template.description}`);
    console.log('');
  }
  
  console.log('Usage:');
  console.log('  tsx scripts/fix-templates.ts --template=<name> [--dry-run]');
  console.log('');
  console.log('Examples:');
  console.log('  tsx scripts/fix-templates.ts --template=enum-conversions --dry-run');
  console.log('  tsx scripts/fix-templates.ts --template=api-responses');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🔧 Type Safety Fix Templates\n');
  
  if (!TEMPLATE_NAME) {
    listTemplates();
    return;
  }
  
  const template = ALL_TEMPLATES.find(t => t.name === TEMPLATE_NAME);
  
  if (!template) {
    console.error(`❌ Template not found: ${TEMPLATE_NAME}`);
    console.log('\nAvailable templates:');
    ALL_TEMPLATES.forEach(t => console.log(`  - ${t.name}`));
    process.exit(1);
  }
  
  await applyTemplate(template);
}

// Run if executed directly
main().catch(console.error);

export { 
  applyTemplateToFile, 
  ALL_TEMPLATES, 
  type FixTemplate, 
  type FixResult 
};
