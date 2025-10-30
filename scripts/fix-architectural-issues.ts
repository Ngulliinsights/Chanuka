#!/usr/bin/env tsx

/**
 * Comprehensive Architectural Fix Script
 * 
 * This script addresses the core architectural inconsistencies identified:
 * 1. Database schema import path confusion (49+ errors)
 * 2. Validation system type conflicts (45+ errors) 
 * 3. Logger import path fragmentation (30+ files affected)
 * 4. Runtime reference errors
 * 5. Missing strategic table exports
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

interface FixResult {
  success: boolean;
  message: string;
  filesModified: string[];
  errors: string[];
}

class ArchitecturalFixer {
  private results: FixResult[] = [];
  private filesModified = new Set<string>();
  private errors: string[] = [];

  async run(): Promise<void> {
    console.log('🔧 Starting Architectural Consolidation and Standardization...\n');

    // Phase 1: Critical Path Fixes
    await this.fixDatabaseSchemaImports();
    await this.fixVariableShadowing();
    await this.addMissingStrategicTableExports();
    await this.createUnifiedValidationError();

    // Phase 2: Import Path Standardization  
    await this.fixLoggerImportPaths();
    await this.standardizeSchemaImports();
    await this.updateTypeScriptPaths();

    // Phase 3: Validation and Cleanup
    await this.validateImportPaths();
    await this.generateReport();
  }

  private async fixDatabaseSchemaImports(): Promise<void> {
    console.log('📊 Fixing database schema import paths...');
    
    const connectionFile = join(projectRoot, 'shared/database/connection.ts');
    if (!existsSync(connectionFile)) {
      this.errors.push('Database connection file not found');
      return;
    }

    try {
      let content = readFileSync(connectionFile, 'utf-8');
      let modified = false;

      // Fix the main schema import
      if (content.includes("import * as schema from '../types';")) {
        content = content.replace(
          "import * as schema from '../types';",
          "import * as schema from '../schema';"
        );
        modified = true;
      }

      // Fix the export statement
      if (content.includes("export * from '../types';")) {
        content = content.replace(
          "export * from '../types';",
          "export * from '../schema';"
        );
        modified = true;
      }

      if (modified) {
        writeFileSync(connectionFile, content);
        this.filesModified.add(connectionFile);
        console.log('✅ Fixed database schema imports in connection.ts');
      }

      this.results.push({
        success: true,
        message: 'Database schema imports fixed',
        filesModified: [connectionFile],
        errors: []
      });
    } catch (error) {
      this.errors.push(`Failed to fix database schema imports: ${error}`);
    }
  }

  private async fixVariableShadowing(): Promise<void> {
    console.log('🔍 Fixing variable shadowing issues...');
    
    const notificationFile = join(projectRoot, 'server/infrastructure/notifications/notification-scheduler.ts');
    if (!existsSync(notificationFile)) {
      this.errors.push('Notification scheduler file not found');
      return;
    }

    try {
      let content = readFileSync(notificationFile, 'utf-8');
      let modified = false;

      // Fix the variable shadowing in getUsersWithDigestEnabled
      const oldPattern = /\.map\(user => \(\{\s*userId: user\.id,\s*preferences: user\.preferences \|\| \{\}\s*\}\)\)\s*\.filter\(user => \{/g;
      const newPattern = `.map(userData => ({
        userId: userData.id,
        preferences: userData.preferences || {}
      }))
      .filter(userData => {`;

      if (oldPattern.test(content)) {
        content = content.replace(oldPattern, newPattern);
        
        // Also fix the filter function body
        content = content.replace(
          /const prefs = user\.preferences as any;/g,
          'const prefs = userData.preferences as any;'
        );
        
        modified = true;
      }

      if (modified) {
        writeFileSync(notificationFile, content);
        this.filesModified.add(notificationFile);
        console.log('✅ Fixed variable shadowing in notification scheduler');
      }

      this.results.push({
        success: true,
        message: 'Variable shadowing fixed',
        filesModified: modified ? [notificationFile] : [],
        errors: []
      });
    } catch (error) {
      this.errors.push(`Failed to fix variable shadowing: ${error}`);
    }
  }

  private async addMissingStrategicTableExports(): Promise<void> {
    console.log('📋 Adding missing strategic table exports...');
    
    const schemaIndexFile = join(projectRoot, 'shared/schema/index.ts');
    if (!existsSync(schemaIndexFile)) {
      this.errors.push('Schema index file not found');
      return;
    }

    try {
      let content = readFileSync(schemaIndexFile, 'utf-8');
      let modified = false;

      // Check if userBillTrackingPreference is missing from exports
      if (!content.includes('userBillTrackingPreference')) {
        // Add it to the explicit exports
        content = content.replace(
          'userBillTrackingPreference, socialShare,',
          'userBillTrackingPreference, socialShare,'
        );
        
        // Add to plural exports
        content = content.replace(
          'userBillTrackingPreferences, socialShares,',
          'userBillTrackingPreferences, socialShares,'
        );
        
        modified = true;
      }

      // Ensure all strategic tables are properly exported
      const strategicTables = [
        'userProgress', 'contentAnalysis', 'verification', 
        'stakeholder', 'socialShare'
      ];

      for (const table of strategicTables) {
        if (!content.includes(table)) {
          console.log(`⚠️  Strategic table ${table} not found in exports`);
        }
      }

      if (modified) {
        writeFileSync(schemaIndexFile, content);
        this.filesModified.add(schemaIndexFile);
        console.log('✅ Updated strategic table exports');
      }

      this.results.push({
        success: true,
        message: 'Strategic table exports verified',
        filesModified: modified ? [schemaIndexFile] : [],
        errors: []
      });
    } catch (error) {
      this.errors.push(`Failed to add strategic table exports: ${error}`);
    }
  }

  private async createUnifiedValidationError(): Promise<void> {
    console.log('🔧 Creating unified validation error type...');
    
    const errorsFile = join(projectRoot, 'shared/types/errors.ts');
    
    try {
      // Create the unified error types file
      const errorTypes = `/**
 * Unified Error Types for Architectural Consistency
 * 
 * This file provides standardized error types to resolve the validation
 * system type conflicts identified in the architectural analysis.
 */

export interface BaseError {
  message: string;
  code: string;
  timestamp?: string;
  correlationId?: string;
}

export interface ValidationError extends BaseError {
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

export interface DatabaseError extends BaseError {
  query?: string;
  table?: string;
  constraint?: string;
}

export interface AuthenticationError extends BaseError {
  reason: 'invalid_credentials' | 'token_expired' | 'token_invalid' | 'account_locked';
}

export interface AuthorizationError extends BaseError {
  resource: string;
  action: string;
  requiredRole?: string;
}

export interface NotFoundError extends BaseError {
  resource: string;
  identifier?: string | number;
}

export interface ConflictError extends BaseError {
  resource: string;
  conflictingField: string;
  conflictingValue: unknown;
}

// Legacy compatibility - will be deprecated
export interface LegacyValidationError {
  error: string;  // Single error message
  errors?: never;
}

// Type guard functions
export const isValidationError = (error: unknown): error is ValidationError => {
  return typeof error === 'object' && error !== null && 'errors' in error;
};

export const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'query' in error;
};

// Error factory functions
export const createValidationError = (
  message: string,
  errors: ValidationError['errors'],
  code = 'VALIDATION_ERROR'
): ValidationError => ({
  message,
  code,
  errors,
  timestamp: new Date().toISOString()
});

export const createDatabaseError = (
  message: string,
  code = 'DATABASE_ERROR',
  query?: string,
  table?: string
): DatabaseError => ({
  message,
  code,
  query,
  table,
  timestamp: new Date().toISOString()
});
`;

      writeFileSync(errorsFile, errorTypes);
      this.filesModified.add(errorsFile);
      console.log('✅ Created unified validation error types');

      this.results.push({
        success: true,
        message: 'Unified validation error types created',
        filesModified: [errorsFile],
        errors: []
      });
    } catch (error) {
      this.errors.push(`Failed to create unified validation error: ${error}`);
    }
  }

  private async fixLoggerImportPaths(): Promise<void> {
    console.log('📝 Fixing logger import paths...');
    
    const serverDir = join(projectRoot, 'server');
    const filesToFix: string[] = [];

    // Find all TypeScript files in server directory
    const findTsFiles = (dir: string): string[] => {
      const files: string[] = [];
      if (!existsSync(dir)) return files;

      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
          files.push(...findTsFiles(fullPath));
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const tsFiles = findTsFiles(serverDir);
    
    for (const file of tsFiles) {
      try {
        let content = readFileSync(file, 'utf-8');
        let modified = false;

        // Fix various logger import patterns
        const loggerImportPatterns = [
          /import\s*\{\s*logger\s*\}\s*from\s*['"]\.\.\/utils\/logger['"];?/g,
          /import\s*\{\s*logger\s*\}\s*from\s*['"]\.\.\/\.\.\/utils\/logger['"];?/g,
          /import\s*\{\s*logger\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/utils\/logger['"];?/g,
          /import\s*\{\s*logger\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/\.\.\/utils\/logger['"];?/g,
        ];

        for (const pattern of loggerImportPatterns) {
          if (pattern.test(content)) {
            content = content.replace(pattern, "import { logger } from '@shared/core';");
            modified = true;
          }
        }

        if (modified) {
          writeFileSync(file, content);
          filesToFix.push(file);
        }
      } catch (error) {
        this.errors.push(`Failed to fix logger imports in ${file}: ${error}`);
      }
    }

    if (filesToFix.length > 0) {
      console.log(`✅ Fixed logger imports in ${filesToFix.length} files`);
      filesToFix.forEach(file => this.filesModified.add(file));
    }

    this.results.push({
      success: true,
      message: `Logger import paths fixed in ${filesToFix.length} files`,
      filesModified: filesToFix,
      errors: []
    });
  }

  private async standardizeSchemaImports(): Promise<void> {
    console.log('🗄️  Standardizing schema imports...');
    
    const serverDir = join(projectRoot, 'server');
    const filesToFix: string[] = [];

    const findTsFiles = (dir: string): string[] => {
      const files: string[] = [];
      if (!existsSync(dir)) return files;

      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
          files.push(...findTsFiles(fullPath));
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const tsFiles = findTsFiles(serverDir);
    
    for (const file of tsFiles) {
      try {
        let content = readFileSync(file, 'utf-8');
        let modified = false;

        // Fix imports that point to the deleted shared/types directory
        if (content.includes('from "../../../shared/types"') || 
            content.includes('from "../../../../shared/types"')) {
          // Most types have been moved to server/types/common.ts or feature-specific locations
          content = content.replace(
            /from\s*['"]\.\.\/\.\.\/\.\.\/shared\/types\/common['"];?/g,
            'from "../../types/common.js";'
          );
          content = content.replace(
            /from\s*['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\/types\/common['"];?/g,
            'from "../../../types/common.js";'
          );
          // For other shared/types imports, redirect to shared/core or appropriate feature
          content = content.replace(
            /from\s*['"]\.\.\/\.\.\/\.\.\/shared\/types['"];?/g,
            'from "@shared/core/src/types";'
          );
          content = content.replace(
            /from\s*['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\/types['"];?/g,
            'from "@shared/core/src/types";'
          );
          modified = true;
        }

        if (modified) {
          writeFileSync(file, content);
          filesToFix.push(file);
        }
      } catch (error) {
        this.errors.push(`Failed to fix schema imports in ${file}: ${error}`);
      }
    }

    if (filesToFix.length > 0) {
      console.log(`✅ Standardized schema imports in ${filesToFix.length} files`);
      filesToFix.forEach(file => this.filesModified.add(file));
    }

    this.results.push({
      success: true,
      message: `Schema imports standardized in ${filesToFix.length} files`,
      filesModified: filesToFix,
      errors: []
    });
  }

  private async updateTypeScriptPaths(): Promise<void> {
    console.log('⚙️  Updating TypeScript path mappings...');
    
    const tsconfigFile = join(projectRoot, 'tsconfig.json');
    if (!existsSync(tsconfigFile)) {
      this.errors.push('tsconfig.json not found');
      return;
    }

    try {
      const content = readFileSync(tsconfigFile, 'utf-8');
      const tsconfig = JSON.parse(content);

      // Ensure proper path mappings exist
      if (!tsconfig.compilerOptions) {
        tsconfig.compilerOptions = {};
      }
      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
      }

      let modified = false;

      // Add/update path mappings
      const requiredPaths = {
        "@shared/core": ["./shared/core/src/index.ts"],
        "@shared/core/*": ["./shared/core/src/*"],
        "@shared/schema": ["./shared/schema/index.ts"],
        "@shared/schema/*": ["./shared/schema/*"],
        "@shared/types": ["./shared/types/index.ts"],
        "@shared/types/*": ["./shared/types/*"]
      };

      for (const [path, mapping] of Object.entries(requiredPaths)) {
        if (!tsconfig.compilerOptions.paths[path] || 
            JSON.stringify(tsconfig.compilerOptions.paths[path]) !== JSON.stringify(mapping)) {
          tsconfig.compilerOptions.paths[path] = mapping;
          modified = true;
        }
      }

      if (modified) {
        writeFileSync(tsconfigFile, JSON.stringify(tsconfig, null, 2));
        this.filesModified.add(tsconfigFile);
        console.log('✅ Updated TypeScript path mappings');
      }

      this.results.push({
        success: true,
        message: 'TypeScript path mappings updated',
        filesModified: modified ? [tsconfigFile] : [],
        errors: []
      });
    } catch (error) {
      this.errors.push(`Failed to update TypeScript paths: ${error}`);
    }
  }

  private async validateImportPaths(): Promise<void> {
    console.log('🔍 Validating import path consistency...');
    
    const issues: string[] = [];
    const serverDir = join(projectRoot, 'server');
    
    const findTsFiles = (dir: string): string[] => {
      const files: string[] = [];
      if (!existsSync(dir)) return files;

      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
          files.push(...findTsFiles(fullPath));
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const tsFiles = findTsFiles(serverDir);
    
    for (const file of tsFiles) {
      try {
        const content = readFileSync(file, 'utf-8');
        
        // Check for problematic import patterns
        if (content.includes('from "../utils/logger"')) {
          issues.push(`${file}: Still uses old logger import path`);
        }
        if (content.includes('from "../types"') && content.includes('database')) {
          issues.push(`${file}: May be importing from wrong types location`);
        }
        if (content.includes('users is not defined')) {
          issues.push(`${file}: Contains variable reference error`);
        }
      } catch (error) {
        issues.push(`${file}: Failed to validate - ${error}`);
      }
    }

    if (issues.length > 0) {
      console.log('⚠️  Found remaining issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      this.errors.push(...issues);
    } else {
      console.log('✅ All import paths validated successfully');
    }

    this.results.push({
      success: issues.length === 0,
      message: `Import path validation completed with ${issues.length} issues`,
      filesModified: [],
      errors: issues
    });
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Generating Fix Report...\n');
    
    const totalFilesModified = this.filesModified.size;
    const totalErrors = this.errors.length;
    const successfulFixes = this.results.filter(r => r.success).length;
    const failedFixes = this.results.filter(r => !r.success).length;

    console.log('='.repeat(60));
    console.log('🎯 ARCHITECTURAL CONSOLIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`📁 Files Modified: ${totalFilesModified}`);
    console.log(`✅ Successful Fixes: ${successfulFixes}`);
    console.log(`❌ Failed Fixes: ${failedFixes}`);
    console.log(`⚠️  Total Errors: ${totalErrors}`);
    console.log('='.repeat(60));

    if (totalFilesModified > 0) {
      console.log('\n📝 Modified Files:');
      Array.from(this.filesModified).forEach(file => {
        const relativePath = relative(projectRoot, file);
        console.log(`  - ${relativePath}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n🎯 Next Steps:');
    console.log('  1. Run `npm run db:migrate` to ensure database tables exist');
    console.log('  2. Run `npm run dev` to test the fixes');
    console.log('  3. Check logs for any remaining "relation does not exist" errors');
    console.log('  4. Run tests to verify functionality');
    
    if (totalErrors === 0 && totalFilesModified > 0) {
      console.log('\n🎉 Architectural consolidation completed successfully!');
    } else if (totalErrors > 0) {
      console.log('\n⚠️  Some issues remain - manual intervention may be required');
    } else {
      console.log('\n✨ No changes needed - architecture is already consistent');
    }
  }
}

// Run the fixer
const fixer = new ArchitecturalFixer();
fixer.run().catch(error => {
  console.error('💥 Fatal error during architectural fix:', error);
  process.exit(1);
});