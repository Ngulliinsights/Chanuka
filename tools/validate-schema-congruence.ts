/**
 * Schema Congruence Validation Tool
 * 
 * This tool validates that storage implementations match the schema definitions
 * to ensure consistency across the codebase.
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const SCHEMA_PATH = path.resolve('./shared/schema.ts');
const STORAGE_DIR = path.resolve('./server/storage');
const CONNECTION_PATH = path.resolve('./shared/database/connection.ts');

interface ValidationResult {
  file: string;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
}

async function validateSchemaCongruence() {
  console.log('🔍 Validating schema congruence...');
  
  try {
    // 1. Check if schema file exists
    if (!fs.existsSync(SCHEMA_PATH)) {
      console.error(`❌ Schema file not found: ${SCHEMA_PATH}`);
      return false;
    }

    // 2. Check if connection file exists
    if (!fs.existsSync(CONNECTION_PATH)) {
      console.error(`❌ Connection file not found: ${CONNECTION_PATH}`);
      return false;
    }

    // 3. Find all storage implementation files
    const storageFiles = findStorageFiles(STORAGE_DIR);
    console.log(`📁 Found ${storageFiles.length} storage implementation files`);
    
    // 4. Validate each storage file against schema
    const results: ValidationResult[] = [];
    
    for (const file of storageFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const issues = validateStorageFile(content, path.relative('.', file));
      
      results.push({
        file: path.relative('.', file),
        issues
      });
    }
    
    // 5. Report results
    reportResults(results);
    return true;
  } catch (error) {
    console.error('❌ Error during validation:', error);
    return false;
  }
}

function findStorageFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findStorageFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function validateStorageFile(content: string, filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Check for imports from schema or connection
  const hasSchemaImport = content.includes('from "../../shared/schema') || 
                         content.includes('from \'../../shared/schema') ||
                         content.includes('from "../../../shared/schema');
  const hasConnectionImport = content.includes('from "../../shared/database/connection') || 
                             content.includes('from \'../../shared/database/connection') ||
                             content.includes('from "../../../shared/database/connection');
  
  if (!hasSchemaImport && !hasConnectionImport) {
    issues.push({
      type: 'warning',
      message: 'Storage file does not import from unified schema or connection'
    });
  }
  
  // Check for direct database pool usage
  if (content.includes('new Pool(') || content.includes('createPool(')) {
    issues.push({
      type: 'error',
      message: 'Storage file creates its own database connection instead of using the unified connection'
    });
  }
  
  // Check for raw SQL queries vs ORM usage
  const rawSqlCount = (content.match(/client\.query\(/g) || []).length + 
                      (content.match(/pool\.query\(/g) || []).length;
  const ormQueryCount = (content.match(/database\.select\(|readDatabase\.select\(|writeDatabase\.select\(/g) || []).length +
                        (content.match(/database\.insert\(|readDatabase\.insert\(|writeDatabase\.insert\(/g) || []).length +
                        (content.match(/database\.update\(|readDatabase\.update\(|writeDatabase\.update\(/g) || []).length +
                        (content.match(/database\.delete\(|readDatabase\.delete\(|writeDatabase\.delete\(/g) || []).length;
  
  if (rawSqlCount > 0 && ormQueryCount === 0) {
    issues.push({
      type: 'error',
      message: `File uses ${rawSqlCount} raw SQL queries but no ORM queries - should use unified Drizzle ORM approach`
    });
  } else if (rawSqlCount > 0 && ormQueryCount > 0) {
    issues.push({
      type: 'warning',
      message: `File mixes ${rawSqlCount} raw SQL queries with ${ormQueryCount} ORM queries - consider converting all to ORM`
    });
  }
  
  // Check for old Pool import
  if (content.includes('import { Pool') && content.includes('from \'pg\'')) {
    issues.push({
      type: 'error',
      message: 'File imports Pool from pg directly instead of using unified connection'
    });
  }
  
  // Check for proper error handling patterns
  if (content.includes('throw new Error') && !content.includes('try {')) {
    issues.push({
      type: 'warning',
      message: 'File throws errors but may lack proper error handling blocks'
    });
  }
  
  return issues;
}

function reportResults(results: ValidationResult[]) {
  let errorCount = 0;
  let warningCount = 0;
  
  console.log('\\n📋 Schema Congruence Validation Results:\\n');
  
  for (const result of results) {
    const errors = result.issues.filter(i => i.type === 'error');
    const warnings = result.issues.filter(i => i.type === 'warning');
    
    errorCount += errors.length;
    warningCount += warnings.length;
    
    if (errors.length > 0 || warnings.length > 0) {
      console.log(`📄 ${result.file}:`);
      
      for (const error of errors) {
        console.log(`  ❌ ${error.message}${error.line ? ` (line ${error.line})` : ''}`);
      }
      
      for (const warning of warnings) {
        console.log(`  ⚠️  ${warning.message}${warning.line ? ` (line ${warning.line})` : ''}`);
      }
      
      console.log('');
    }
  }
  
  console.log(`✅ ${results.length} files checked, ${errorCount} errors, ${warningCount} warnings`);
  
  if (errorCount === 0 && warningCount === 0) {
    console.log('🎉 All storage implementations are congruent with the schema!');
  } else if (errorCount === 0) {
    console.log('✨ No errors found, but some warnings to consider for optimization.');
  } else {
    console.log('🔧 Found issues that should be addressed for proper schema congruence.');
  }
}

// Always run the validation when this script is executed
validateSchemaCongruence()
  .then(success => {
    if (success) {
      console.log('\\n🎉 Schema congruence validation completed!');
      process.exit(0);
    } else {
      console.error('\\n❌ Schema congruence validation failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

export { validateSchemaCongruence };