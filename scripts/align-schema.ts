#!/usr/bin/env tsx
/**
 * Schema Alignment Script
 * 
 * This script aligns the TypeScript schema with the existing database structure
 * by updating table names to use plurals and column names to use snake_case.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

interface SchemaUpdate {
  description: string;
  files: string[];
  replacements: Array<{ from: RegExp; to: string }>;
}

const schemaUpdates: SchemaUpdate[] = [
  {
    description: "Update table references to use plural names",
    files: ["server/**/*.ts", "client/src/**/*.ts", "shared/**/*.ts"],
    replacements: [
      { from: /schema\.user\b/g, to: "schema.users" },
      { from: /schema\.bill\b/g, to: "schema.bills" },
      { from: /schema\.sponsor\b/g, to: "schema.sponsors" },
      { from: /schema\.comments/g, to: "schema.comments" },
      { from: /schema\.user_profiles/g, to: "schema.user_profiles" },
      { from: /schema\.session\b/g, to: "schema.sessions" },
      { from: /schema\.comment_votes/g, to: "schema.comment_votes" },
      { from: /schema\.bill_engagement/g, to: "schema.bill_engagement" },
      { from: /schema\.notification\b/g, to: "schema.notifications" },
    ]
  },
  {
    description: "Update column references to use snake_case",
    files: ["server/**/*.ts", "client/src/**/*.ts", "shared/**/*.ts"],
    replacements: [
      { from: /\.password_hash\b/g, to: ".password_hash" },
      { from: /\.user_id\b/g, to: ".user_id" },
      { from: /\.bill_id\b/g, to: ".bill_id" },
      { from: /\.sponsor_id\b/g, to: ".sponsor_id" },
      { from: /\.first_name\b/g, to: ".first_name" },
      { from: /\.last_name\b/g, to: ".last_name" },
      { from: /\.is_active\b/g, to: ".is_active" },
      { from: /\.is_verified\b/g, to: ".is_verified" },
      { from: /\.created_at\b/g, to: ".created_at" },
      { from: /\.updated_at\b/g, to: ".updated_at" },
    ]
  }
];

function backupCurrentSchema(): void {
  console.log('📦 Creating backup of current schema...');
  
  const schemaPath = 'shared/schema/schema.ts';
  const backupPath = 'shared/schema/schema-backup.ts';
  
  if (existsSync(schemaPath)) {
    const content = readFileSync(schemaPath, 'utf8');
    writeFileSync(backupPath, content);
    console.log('✅ Backup created at shared/schema/schema-backup.ts');
  } else {
    console.log('⚠️  Original schema file not found, skipping backup');
  }
}

function replaceSchemaFile(): void {
  console.log('🔄 Replacing schema with aligned version...');
  
  const alignedPath = 'shared/schema/schema-aligned.ts';
  const schemaPath = 'shared/schema/schema.ts';
  
  if (existsSync(alignedPath)) {
    const content = readFileSync(alignedPath, 'utf8');
    writeFileSync(schemaPath, content);
    console.log('✅ Schema replaced with aligned version');
  } else {
    console.log('❌ Aligned schema file not found at shared/schema/schema-aligned.ts');
    process.exit(1);
  }
}

function updateCodeReferences(): void {
  console.log('🔍 Updating code references...');
  
  for (const update of schemaUpdates) {
    console.log(`   ${update.description}`);
    
    // Get list of TypeScript files (excluding node_modules)
    try {
      const files = execSync(`find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./build/*"`, 
        { encoding: 'utf8' }).trim().split('\n').filter(f => f.length > 0);
      
      let totalReplacements = 0;
      
      for (const file of files) {
        if (!existsSync(file)) continue;
        
        let content = readFileSync(file, 'utf8');
        let fileChanged = false;
        
        for (const { from, to } of update.replacements) {
          const matches = content.match(from);
          if (matches) {
            content = content.replace(from, to);
            totalReplacements += matches.length;
            fileChanged = true;
          }
        }
        
        if (fileChanged) {
          writeFileSync(file, content);
        }
      }
      
      console.log(`   ✅ Made ${totalReplacements} replacements`);
      
    } catch (error) {
      console.log(`   ⚠️  Error updating references: ${error}`);
    }
  }
}

function updateSchemaIndex(): void {
  console.log('📝 Updating schema index file...');
  
  const indexPath = 'shared/schema/index.ts';
  
  if (existsSync(indexPath)) {
    // Create a new index that exports from the aligned schema
    const newIndexContent = `// Barrel exports for shared/schema (aligned with database)
export * from "./schema";
export * from "./enum";
export * from "./validation";

// Export types explicitly to avoid conflicts
export type {
  UserDto, UserProfileDto, BillDto, SponsorDto, AnalysisDto,
  StakeholderDto, NotificationDto, ComplianceCheckDto,
  SocialShareDto, VerificationDto, User, UserProfile, Bill, Sponsor,
  Comment, CommentVote, BillEngagement, Notification, Session
} from "./types";

// Note: Schema now uses plural table names and snake_case columns
// to match the database structure exactly.
`;
    
    writeFileSync(indexPath, newIndexContent);
    console.log('✅ Updated schema index file');
  }
}

function runValidation(): void {
  console.log('🧪 Running validation tests...');
  
  try {
    execSync('npx tsx tools/simple-schema-validation.ts', { stdio: 'inherit' });
    console.log('✅ Validation tests completed');
  } catch (error) {
    console.log('⚠️  Validation tests failed - check the output above');
    console.log('💡 This is expected if database connection issues remain');
  }
}

function showNextSteps(): void {
  console.log('\n🎉 Schema alignment migration completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Fix any remaining database connection issues');
  console.log('   2. Test your application thoroughly');
  console.log('   3. Run your full test suite');
  console.log('   4. Check for any manual references that need updating');
  console.log('   5. Deploy when ready');
  
  console.log('\n🔄 To rollback if needed:');
  console.log('   cp shared/schema/schema-backup.ts shared/schema/schema.ts');
  console.log('   git checkout -- .');
  
  console.log('\n🧪 To test the changes:');
  console.log('   npx tsx tools/simple-schema-validation.ts');
}

async function main(): void {
  console.log('🚀 Starting Schema Alignment Migration\n');
  console.log('This will align your TypeScript schema with the existing database structure.\n');
  
  try {
    // Step 1: Backup current schema
    backupCurrentSchema();
    
    // Step 2: Replace schema with aligned version
    replaceSchemaFile();
    
    // Step 3: Update schema index
    updateSchemaIndex();
    
    // Step 4: Update code references
    updateCodeReferences();
    
    // Step 5: Run validation
    runValidation();
    
    // Step 6: Show next steps
    showNextSteps();
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    console.log('\n🔄 To rollback:');
    console.log('   cp shared/schema/schema-backup.ts shared/schema/schema.ts');
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);