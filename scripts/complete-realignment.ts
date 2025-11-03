#!/usr/bin/env tsx
/**
 * Complete Schema Realignment Script
 * 
 * This script fixes ALL remaining camelCase references to use snake_case
 * consistently throughout the codebase.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface FixPattern {
  description: string;
  pattern: RegExp;
  replacement: string;
}

// Comprehensive list of ALL camelCase to snake_case conversions needed
const columnFixes: FixPattern[] = [
  // User table columns
  { description: "Fix password_hash → password_hash", pattern: /password_hash/g, replacement: "password_hash" },
  { description: "Fix first_name → first_name", pattern: /first_name/g, replacement: "first_name" },
  { description: "Fix last_name → last_name", pattern: /last_name/g, replacement: "last_name" },
  { description: "Fix is_active → is_active", pattern: /is_active/g, replacement: "is_active" },
  { description: "Fix is_verified → is_verified", pattern: /is_verified/g, replacement: "is_verified" },
  { description: "Fix last_login_at → last_login_at", pattern: /last_login_at/g, replacement: "last_login_at" },
  { description: "Fix created_at → created_at", pattern: /created_at/g, replacement: "created_at" },
  { description: "Fix updated_at → updated_at", pattern: /updated_at/g, replacement: "updated_at" },
  
  // Foreign key columns
  { description: "Fix user_id → user_id", pattern: /user_id/g, replacement: "user_id" },
  { description: "Fix bill_id → bill_id", pattern: /bill_id/g, replacement: "bill_id" },
  { description: "Fix sponsor_id → sponsor_id", pattern: /sponsor_id/g, replacement: "sponsor_id" },
  { description: "Fix comment_id → comment_id", pattern: /comment_id/g, replacement: "comment_id" },
  { description: "Fix parent_id → parent_id", pattern: /parent_id/g, replacement: "parent_id" },
  
  // Bill table columns
  { description: "Fix bill_number → bill_number", pattern: /bill_number/g, replacement: "bill_number" },
  { description: "Fix full_text → full_text", pattern: /full_text/g, replacement: "full_text" },
  { description: "Fix last_action_date → last_action_date", pattern: /last_action_date/g, replacement: "last_action_date" },
  { description: "Fix introduced_date → introduced_date", pattern: /introduced_date/g, replacement: "introduced_date" },
  { description: "Fix view_count → view_count", pattern: /view_count/g, replacement: "view_count" },
  { description: "Fix share_count → share_count", pattern: /share_count/g, replacement: "share_count" },
  { description: "Fix comment_count → comment_count", pattern: /comment_count/g, replacement: "comment_count" },
  { description: "Fix engagement_score → engagement_score", pattern: /engagement_score/g, replacement: "engagement_score" },
  { description: "Fix complexity_score → complexity_score", pattern: /complexity_score/g, replacement: "complexity_score" },
  { description: "Fix search_vector → search_vector", pattern: /search_vector/g, replacement: "search_vector" },
  
  // Profile table columns
  { description: "Fix avatar_url → avatar_url", pattern: /avatar_url/g, replacement: "avatar_url" },
  { description: "Fix display_name → display_name", pattern: /display_name/g, replacement: "display_name" },
  { description: "Fix reputation_score → reputation_score", pattern: /reputation_score/g, replacement: "reputation_score" },
  { description: "Fix is_public → is_public", pattern: /is_public/g, replacement: "is_public" },
  { description: "Fix privacy_settings → privacy_settings", pattern: /privacy_settings/g, replacement: "privacy_settings" },
  
  // Comment table columns
  { description: "Fix parent_id → parent_id", pattern: /parent_id/g, replacement: "parent_id" },
  { description: "Fix is_expert_opinion → is_expert_opinion", pattern: /is_expert_opinion/g, replacement: "is_expert_opinion" },
  { description: "Fix expert_credentials → expert_credentials", pattern: /expert_credentials/g, replacement: "expert_credentials" },
  { description: "Fix is_flagged → is_flagged", pattern: /is_flagged/g, replacement: "is_flagged" },
  { description: "Fix moderation_status → moderation_status", pattern: /moderation_status/g, replacement: "moderation_status" },
  { description: "Fix is_deleted → is_deleted", pattern: /is_deleted/g, replacement: "is_deleted" },
  { description: "Fix vote_type → vote_type", pattern: /vote_type/g, replacement: "vote_type" },
  
  // Session table columns
  { description: "Fix expires_at → expires_at", pattern: /expires_at/g, replacement: "expires_at" },
  { description: "Fix refresh_token_hash → refresh_token_hash", pattern: /refresh_token_hash/g, replacement: "refresh_token_hash" },
  { description: "Fix refresh_token_expires_at → refresh_token_expires_at", pattern: /refresh_token_expires_at/g, replacement: "refresh_token_expires_at" },
  { description: "Fix ip_address → ip_address", pattern: /ip_address/g, replacement: "ip_address" },
  { description: "Fix user_agent → user_agent", pattern: /user_agent/g, replacement: "user_agent" },
  
  // Engagement table columns
  { description: "Fix engagement_type → engagement_type", pattern: /engagement_type/g, replacement: "engagement_type" },
  { description: "Fix engagement_data → engagement_data", pattern: /engagement_data/g, replacement: "engagement_data" },
  { description: "Fix last_engaged_at → last_engaged_at", pattern: /last_engaged_at/g, replacement: "last_engaged_at" },
  
  // Notification table columns
  { description: "Fix is_read → is_read", pattern: /is_read/g, replacement: "is_read" },
  { description: "Fix read_at → read_at", pattern: /read_at/g, replacement: "read_at" },
  
  // Sponsor table columns
  { description: "Fix photo_url → photo_url", pattern: /photo_url/g, replacement: "photo_url" },
  { description: "Fix conflict_level → conflict_level", pattern: /conflict_level/g, replacement: "conflict_level" },
  { description: "Fix financial_exposure → financial_exposure", pattern: /financial_exposure/g, replacement: "financial_exposure" },
  { description: "Fix voting_alignment → voting_alignment", pattern: /voting_alignment/g, replacement: "voting_alignment" },
  { description: "Fix transparency_score → transparency_score", pattern: /transparency_score/g, replacement: "transparency_score" },
  
  // Verification table columns
  { description: "Fix user_role → user_role", pattern: /user_role/g, replacement: "user_role" },
  { description: "Fix verification_type → verification_type", pattern: /verification_type/g, replacement: "verification_type" },
  { description: "Fix verification_status → verification_status", pattern: /verification_status/g, replacement: "verification_status" },
  { description: "Fix verification_data → verification_data", pattern: /verification_data/g, replacement: "verification_data" },
  { description: "Fix verified_by → verified_by", pattern: /verified_by/g, replacement: "verified_by" },
  { description: "Fix verified_at → verified_at", pattern: /verified_at/g, replacement: "verified_at" },
  
  // Analysis table columns
  { description: "Fix analysis_type → analysis_type", pattern: /analysis_type/g, replacement: "analysis_type" },
  { description: "Fix model_version → model_version", pattern: /model_version/g, replacement: "model_version" },
  { description: "Fix is_approved → is_approved", pattern: /is_approved/g, replacement: "is_approved" },
  { description: "Fix approved_by → approved_by", pattern: /approved_by/g, replacement: "approved_by" },
  
  // Content analysis columns
  { description: "Fix content_type → content_type", pattern: /content_type/g, replacement: "content_type" },
  { description: "Fix content_id → content_id", pattern: /content_id/g, replacement: "content_id" },
  { description: "Fix toxicity_score → toxicity_score", pattern: /toxicity_score/g, replacement: "toxicity_score" },
  { description: "Fix spam_score → spam_score", pattern: /spam_score/g, replacement: "spam_score" },
  { description: "Fix sentiment_score → sentiment_score", pattern: /sentiment_score/g, replacement: "sentiment_score" },
  { description: "Fix readability_score → readability_score", pattern: /readability_score/g, replacement: "readability_score" },
  { description: "Fix analyzed_at → analyzed_at", pattern: /analyzed_at/g, replacement: "analyzed_at" },
  
  // Social share columns
  { description: "Fix shared_at → shared_at", pattern: /shared_at/g, replacement: "shared_at" },
  
  // Progress columns
  { description: "Fix achievement_type → achievement_type", pattern: /achievement_type/g, replacement: "achievement_type" },
  { description: "Fix achievement_value → achievement_value", pattern: /achievement_value/g, replacement: "achievement_value" },
  { description: "Fix unlocked_at → unlocked_at", pattern: /unlocked_at/g, replacement: "unlocked_at" },
  
  // Tracking preference columns
  { description: "Fix tracking_types → tracking_types", pattern: /tracking_types/g, replacement: "tracking_types" },
  { description: "Fix alert_frequency → alert_frequency", pattern: /alert_frequency/g, replacement: "alert_frequency" },
  { description: "Fix alert_channels → alert_channels", pattern: /alert_channels/g, replacement: "alert_channels" },
  
  // Security columns
  { description: "Fix event_type → event_type", pattern: /event_type/g, replacement: "event_type" },
  { description: "Fix source_ip → source_ip", pattern: /source_ip/g, replacement: "source_ip" },
  { description: "Fix event_data → event_data", pattern: /event_data/g, replacement: "event_data" },
  
  // Compliance columns
  { description: "Fix check_type → check_type", pattern: /check_type/g, replacement: "check_type" },
  { description: "Fix entity_type → entity_type", pattern: /entity_type/g, replacement: "entity_type" },
  { description: "Fix entity_id → entity_id", pattern: /entity_id/g, replacement: "entity_id" },
  { description: "Fix last_checked → last_checked", pattern: /last_checked/g, replacement: "last_checked" },
  { description: "Fix next_check → next_check", pattern: /next_check/g, replacement: "next_check" },
];

// Table name fixes (in case any were missed)
const tableFixes: FixPattern[] = [
  { description: "Fix user_profiles → user_profiles", pattern: /user_profiles/g, replacement: "user_profiles" },
  { description: "Fix comments → comments", pattern: /comments/g, replacement: "comments" },
  { description: "Fix comment_votes → comment_votes", pattern: /comment_votes/g, replacement: "comment_votes" },
  { description: "Fix bill_engagement → bill_engagement", pattern: /bill_engagement/g, replacement: "bill_engagement" },
  { description: "Fix social_share → social_share", pattern: /social_share/g, replacement: "social_share" },
  { description: "Fix user_progress → user_progress", pattern: /user_progress/g, replacement: "user_progress" },
  { description: "Fix bill_tag → bill_tag", pattern: /bill_tag/g, replacement: "bill_tag" },
  { description: "Fix bill_sponsorship → bill_sponsorship", pattern: /bill_sponsorship/g, replacement: "bill_sponsorship" },
  { description: "Fix user_interest → user_interest", pattern: /user_interest/g, replacement: "user_interest" },
  { description: "Fix content_report → content_report", pattern: /content_report/g, replacement: "content_report" },
  { description: "Fix moderation_action → moderation_action", pattern: /moderation_action/g, replacement: "moderation_action" },
];

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', 'dist', 'build', '.git', '.next', 'coverage'].includes(item)) {
          findTypeScriptFiles(fullPath, files);
        }
      } else if (stat.isFile() && ['.ts', '.tsx', '.js', '.jsx'].includes(extname(item))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`⚠️  Error reading directory ${dir}: ${error}`);
  }
  
  return files;
}

function applyFixes(fixes: FixPattern[], description: string): number {
  console.log(`\n🔧 ${description}`);
  
  const files = findTypeScriptFiles('.');
  let totalChanges = 0;
  let filesChanged = 0;
  
  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf8');
      const originalContent = content;
      let fileChanges = 0;
      
      for (const fix of fixes) {
        const matches = content.match(fix.pattern);
        if (matches) {
          content = content.replace(fix.pattern, fix.replacement);
          fileChanges += matches.length;
        }
      }
      
      if (content !== originalContent) {
        writeFileSync(file, content);
        filesChanged++;
        totalChanges += fileChanges;
      }
    } catch (error) {
      console.log(`   ⚠️  Error processing ${file}: ${error}`);
    }
  }
  
  console.log(`   ✅ Updated ${filesChanged} files with ${totalChanges} changes`);
  return totalChanges;
}

function fixSpecificValidationFile(): void {
  console.log('\n🔧 Fixing specific validation script issues...');
  
  const validationFile = 'tools/validate-schema-congruence.ts';
  
  try {
    let content = readFileSync(validationFile, 'utf8');
    
    // Fix specific issues in the validation script
    const specificFixes = [
      { from: /testData\.sponsor_id/g, to: 'testData.sponsor_id' },
      { from: /testData\.user_id/g, to: 'testData.user_id' },
      { from: /testData\.bill_id/g, to: 'testData.bill_id' },
      { from: /password_hash:/g, to: 'password_hash:' },
      { from: /\.password_hash/g, to: '.password_hash' },
      { from: /sponsor_id:/g, to: 'sponsor_id:' },
      { from: /\.sponsor_id/g, to: '.sponsor_id' },
      { from: /schema\.bills\.sponsor_id/g, to: 'schema.bills.sponsor_id' },
      { from: /schema\.bills\.sponsor_id/g, to: 'schema.bills.sponsor_id' }, // Ensure consistency
      { from: /schema\.users\.id/g, to: 'schema.users.id' },
      { from: /up\."user_id"/g, to: 'up."user_id"' },
    ];
    
    let changes = 0;
    for (const fix of specificFixes) {
      const matches = content.match(fix.from);
      if (matches) {
        content = content.replace(fix.from, fix.to);
        changes += matches.length;
      }
    }
    
    if (changes > 0) {
      writeFileSync(validationFile, content);
      console.log(`   ✅ Fixed ${changes} specific issues in validation script`);
    } else {
      console.log(`   ✅ No specific fixes needed in validation script`);
    }
    
  } catch (error) {
    console.log(`   ⚠️  Error fixing validation script: ${error}`);
  }
}

function validateSchemaConsistency(): void {
  console.log('\n🔍 Validating schema consistency...');
  
  try {
    const schemaFile = 'shared/schema/schema.ts';
    const content = readFileSync(schemaFile, 'utf8');
    
    // Check for any remaining camelCase column names in schema definitions
    const camelCasePatterns = [
      /user_id[^_]/g,
      /bill_id[^_]/g,
      /sponsor_id[^_]/g,
      /password_hash[^_]/g,
      /first_name[^_]/g,
      /last_name[^_]/g,
      /created_at[^_]/g,
      /updated_at[^_]/g,
    ];
    
    let issuesFound = 0;
    for (const pattern of camelCasePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        issuesFound += matches.length;
      }
    }
    
    if (issuesFound === 0) {
      console.log('   ✅ Schema file appears consistent with snake_case naming');
    } else {
      console.log(`   ⚠️  Found ${issuesFound} potential camelCase issues in schema`);
    }
    
  } catch (error) {
    console.log(`   ⚠️  Error validating schema: ${error}`);
  }
}

async function main(): void {
  console.log('🚀 Starting Complete Schema Realignment\n');
  console.log('This will fix ALL remaining camelCase references to use snake_case consistently.\n');
  
  try {
    // Apply column name fixes
    const columnChanges = applyFixes(columnFixes, 'Fixing column name references (camelCase → snake_case)');
    
    // Apply table name fixes
    const tableChanges = applyFixes(tableFixes, 'Fixing table name references');
    
    // Fix specific validation script issues
    fixSpecificValidationFile();
    
    // Validate schema consistency
    validateSchemaConsistency();
    
    const totalChanges = columnChanges + tableChanges;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPLETE REALIGNMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Changes Made: ${totalChanges}`);
    console.log(`Column Name Fixes: ${columnChanges}`);
    console.log(`Table Name Fixes: ${tableChanges}`);
    
    if (totalChanges > 0) {
      console.log('\n✅ Realignment completed successfully!');
      console.log('\n🧪 Next steps:');
      console.log('   1. Test the validation: npx tsx tools/simple-schema-validation.ts');
      console.log('   2. Run comprehensive validation: npx tsx tools/validate-schema-congruence.ts');
      console.log('   3. Check for any compilation errors: npx tsc --noEmit');
    } else {
      console.log('\n✅ No changes needed - schema appears to be already aligned!');
    }
    
    console.log('\n🎯 Expected outcome:');
    console.log('   • All column references use snake_case consistently');
    console.log('   • All table references use plural names consistently');
    console.log('   • No more mixed naming conventions');
    console.log('   • Database operations should work correctly');
    
  } catch (error) {
    console.error('💥 Realignment script failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);