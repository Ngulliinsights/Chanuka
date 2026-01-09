#!/usr/bin/env node
/**
 * Automated base-types migration script
 * Converts schema files to use base-types helpers for auditFields, primaryKeyUuid, metadataField
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SCHEMA_DIR = path.join(__dirname, 'shared/schema');

// Track migration statistics
const stats = {
  filesProcessed: 0,
  filesMigrated: 0,
  linesRemoved: 0,
  errors: []
};

/**
 * Migrate a single schema file
 */
function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    const filename = path.basename(filePath);

    // Skip if already migrated (has base-types import)
    if (content.includes('from "./base-types"')) {
      console.log(`✓ ${filename} (already migrated)`);
      stats.filesProcessed++;
      return;
    }

    // Skip non-schema files
    if (!filename.endsWith('.ts') || filename.startsWith('_') || filename === 'base-types.ts' || filename === 'enum.ts') {
      stats.filesProcessed++;
      return;
    }

    let migrated = false;

    // 1. Add base-types import if needed
    if (!content.includes('from "./base-types"')) {
      // Find the last import statement and add after it
      const lastImportMatch = content.match(/import[^;]+from ['"]\.[^'"]+['"];/g);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const importIndex = content.lastIndexOf(lastImport);
        const insertPos = importIndex + lastImport.length;

        // Check what helpers we'll need
        const needsAuditFields = /created_at:\s*timestamp\("created_at"[^;]*\.notNull\(\)\.defaultNow\(\),\s*updated_at:\s*timestamp\("updated_at"[^;]*\.notNull\(\)\.defaultNow\(\),/g.test(content);
        const needsPrimaryKeyUuid = /id:\s*uuid\("id"\)\.primaryKey\(\)\.default\(sql`gen_random_uuid\(\)`\),/g.test(content);
        const needsMetadataField = /metadata:\s*jsonb\("metadata"\)\.default\(sql`'\{\}'::jsonb`\)\.notNull\(\),/g.test(content);

        const helpers = [];
        if (needsAuditFields) helpers.push('auditFields');
        if (needsPrimaryKeyUuid) helpers.push('primaryKeyUuid');
        if (needsMetadataField) helpers.push('metadataField');

        if (helpers.length > 0) {
          const newImport = `import { ${helpers.join(', ')} } from "./base-types";`;
          content = content.slice(0, insertPos) + '\n' + newImport + content.slice(insertPos);
          migrated = true;
        }
      }
    }

    // 2. Replace id: uuid(...).primaryKey().default(sql`gen_random_uuid()`)
    // Match: id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    const primaryKeyPattern = /id:\s*uuid\("id"\)\.primaryKey\(\)\.default\(sql`gen_random_uuid\(\)`\),?/g;
    if (primaryKeyPattern.test(content)) {
      content = content.replace(primaryKeyPattern, '...primaryKeyUuid(),');
      migrated = true;
    }

    // 3. Replace created_at/updated_at pattern
    const auditPattern = /created_at:\s*timestamp\("created_at",\s*\{\s*withTimezone:\s*true\s*\}\)\.notNull\(\)\.defaultNow\(\),\s*updated_at:\s*timestamp\("updated_at",\s*\{\s*withTimezone:\s*true\s*\}\)\.notNull\(\)\.defaultNow\(\),?/g;
    if (auditPattern.test(content)) {
      content = content.replace(auditPattern, '...auditFields(),');
      migrated = true;
    }

    // 4. Replace metadata: jsonb("metadata").default(...) pattern
    // But keep named metadata fields (engagement_metadata, etc) as-is
    const metadataPattern = /metadata:\s*jsonb\("metadata"\)\.default\(sql`'\{\}'::jsonb`\)\.notNull\(\),?/g;
    if (metadataPattern.test(content)) {
      content = content.replace(metadataPattern, '...metadataField(),');
      migrated = true;
    }

    // 5. Calculate lines removed
    const originalLines = originalContent.split('\n').length;
    const newLines = content.split('\n').length;
    const linesRemoved = originalLines - newLines;

    if (migrated) {
      fs.writeFileSync(filePath, content);
      stats.filesMigrated++;
      stats.linesRemoved += linesRemoved;
      console.log(`✓ ${filename} (${linesRemoved > 0 ? `-${linesRemoved}` : '+' + Math.abs(linesRemoved)} lines)`);
    } else {
      console.log(`○ ${filename} (no changes needed)`);
    }
    stats.filesProcessed++;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`✗ ${path.basename(filePath)} - ${error.message}`);
    stats.filesProcessed++;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Starting base-types migration...\n');

  // Find all schema files (exclude base-types and enum)
  const schemaFiles = glob.sync(`${SCHEMA_DIR}/*.ts`)
    .filter(f => !f.endsWith('base-types.ts') && !f.endsWith('enum.ts') && !f.endsWith('index.ts'));

  // Process each file
  schemaFiles.forEach(migrateFile);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Migration Summary:`);
  console.log(`   Files processed:  ${stats.filesProcessed}`);
  console.log(`   Files migrated:   ${stats.filesMigrated}`);
  console.log(`   Lines removed:    ${stats.linesRemoved}`);
  if (stats.errors.length > 0) {
    console.log(`   Errors:           ${stats.errors.length}`);
    stats.errors.forEach(e => console.log(`     - ${e.file}: ${e.error}`));
  }
  console.log('='.repeat(60));
}

main();
