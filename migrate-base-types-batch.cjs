const fs = require('fs');
const path = require('path');

// Configuration
const SCHEMA_DIR = 'shared/schema';
const EXCLUDED_FILES = ['enum.ts', 'base-types.ts', 'index.ts', 'citizen_participation.ts', 'constitutional_intelligence.ts'];
const BASE_TYPES_IMPORT = 'from "./base-types"';

// Pattern replacements with more flexible whitespace handling
const PATTERNS = [
  {
    name: 'primaryKeyUuid',
    regex: /id:\s*uuid\("id"\)\s*\.primaryKey\(\)\s*\.default\(sql`gen_random_uuid\(\)`\)\s*,?/g,
    replacement: '...primaryKeyUuid(),'
  },
  {
    name: 'auditFields',
    regex: /created_at:\s*timestamp\("created_at",?\s*\{\s*withTimezone:\s*true\s*\}\)\s*\.notNull\(\)\s*\.defaultNow\(\)\s*,\s*updated_at:\s*timestamp\("updated_at",?\s*\{\s*withTimezone:\s*true\s*\}\)\s*\.notNull\(\)\s*\.defaultNow\(\)\s*,?/g,
    replacement: '...auditFields(),'
  },
  {
    name: 'metadataField',
    regex: /metadata:\s*jsonb\("metadata"\)\s*\.default\(sql`'\{\}'::jsonb`\)\s*\.notNull\(\)\s*,?/g,
    replacement: '...metadataField(),'
  }
];

// Get list of schema files to process
function getSchemaFiles() {
  return fs.readdirSync(SCHEMA_DIR)
    .filter(f => f.endsWith('.ts') && !EXCLUDED_FILES.includes(f))
    .map(f => path.join(SCHEMA_DIR, f));
}

// Apply pattern transformations to content
function applyTransformations(content) {
  let transformed = content;
  const usedHelpers = new Set();

  PATTERNS.forEach(({ name, regex, replacement }) => {
    if (regex.test(transformed)) {
      transformed = transformed.replace(regex, replacement);
      usedHelpers.add(name);
    }
  });

  return { transformed, usedHelpers };
}

// Insert base-types import after the last existing import
function insertImport(content, helpers) {
  if (helpers.size === 0) return content;

  const importMatches = content.match(/import\s+[^;]+\s+from\s+['"][^'"]+['"];?\s*$/gm);

  if (!importMatches || importMatches.length === 0) {
    // No imports found, add at the beginning
    const importLine = `import { ${Array.from(helpers).join(', ')} } from "./base-types";\n\n`;
    return importLine + content;
  }

  const lastImport = importMatches[importMatches.length - 1];
  const lastIndex = content.lastIndexOf(lastImport);
  const insertPoint = lastIndex + lastImport.length;

  const importLine = `\nimport { ${Array.from(helpers).join(', ')} } from "./base-types";`;

  return content.slice(0, insertPoint) + importLine + content.slice(insertPoint);
}

// Process a single file
function processFile(filePath) {
  const filename = path.basename(filePath);

  try {
    const originalContent = fs.readFileSync(filePath, 'utf-8');

    // Skip if already migrated
    if (originalContent.includes(BASE_TYPES_IMPORT)) {
      return { filename, status: 'skipped', reason: 'already migrated' };
    }

    // Apply transformations
    const { transformed, usedHelpers } = applyTransformations(originalContent);

    // Check if any changes were made
    if (transformed === originalContent) {
      return { filename, status: 'unchanged', reason: 'no patterns found' };
    }

    // Insert import statement
    const finalContent = insertImport(transformed, usedHelpers);

    // Write back to file
    fs.writeFileSync(filePath, finalContent);

    const linesRemoved = originalContent.split('\n').length - finalContent.split('\n').length;

    return {
      filename,
      status: 'migrated',
      linesRemoved,
      helpers: Array.from(usedHelpers)
    };
  } catch (error) {
    return {
      filename,
      status: 'error',
      error: error.message
    };
  }
}

// Main execution
function main() {
  console.log('🔄 Starting schema migration...\n');

  const files = getSchemaFiles();
  const results = files.map(processFile);

  // Print results
  results.forEach(result => {
    switch (result.status) {
      case 'migrated':
        const linesDiff = result.linesRemoved > 0
          ? `-${result.linesRemoved}`
          : `+${Math.abs(result.linesRemoved)}`;
        console.log(`✓ ${result.filename} (${linesDiff} lines, using: ${result.helpers.join(', ')})`);
        break;
      case 'skipped':
        console.log(`⊘ ${result.filename} (${result.reason})`);
        break;
      case 'unchanged':
        console.log(`○ ${result.filename} (${result.reason})`);
        break;
      case 'error':
        console.log(`✗ ${result.filename} (error: ${result.error})`);
        break;
    }
  });

  // Summary statistics
  const migrated = results.filter(r => r.status === 'migrated');
  const totalLinesRemoved = migrated.reduce((sum, r) => sum + r.linesRemoved, 0);
  const skipped = results.filter(r => r.status === 'skipped').length;
  const unchanged = results.filter(r => r.status === 'unchanged').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Migration complete!`);
  console.log(`   Migrated: ${migrated.length} files`);
  console.log(`   Skipped: ${skipped} files (already migrated)`);
  console.log(`   Unchanged: ${unchanged} files (no patterns found)`);
  if (errors > 0) console.log(`   Errors: ${errors} files`);
  console.log(`   Lines removed: ${totalLinesRemoved}`);
  console.log('='.repeat(50));
}

main();
