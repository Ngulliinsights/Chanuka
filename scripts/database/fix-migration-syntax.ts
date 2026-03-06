#!/usr/bin/env tsx
/**
 * Fix Migration SQL Syntax
 * 
 * Converts inline INDEX declarations to separate CREATE INDEX statements
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationPath = path.join(
  __dirname,
  '../../server/infrastructure/database/migrations/20260306_mwanga_stack_schema.sql'
);

console.log('📄 Reading migration file...');
let content = fs.readFileSync(migrationPath, 'utf-8');

// Remove all inline INDEX declarations and collect them
const indexes: string[] = [];
let tableNameMatch: RegExpMatchArray | null = null;
let currentTable = '';

// Process line by line
const lines = content.split('\n');
const fixedLines: string[] = [];
let inTable = false;
let skipComma = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track current table
  if (line.match(/CREATE TABLE IF NOT EXISTS (\w+)/)) {
    tableNameMatch = line.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    currentTable = tableNameMatch ? tableNameMatch[1] : '';
    inTable = true;
  }
  
  // Check if this is an INDEX line
  if (line.trim().startsWith('INDEX idx_')) {
    const indexMatch = line.match(/INDEX (idx_\w+) \(([^)]+)\)/);
    if (indexMatch && currentTable) {
      const indexName = indexMatch[1];
      const columns = indexMatch[2];
      indexes.push(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${currentTable} (${columns});`);
      skipComma = true;
      continue; // Skip this line
    }
  }
  
  // Check if this is a comment about indexes
  if (line.trim().startsWith('-- Indexes')) {
    continue; // Skip index comments
  }
  
  // Remove trailing comma if we just skipped an INDEX
  if (skipComma && line.trim() === ');') {
    // Look back and remove trailing comma from previous non-empty line
    for (let j = fixedLines.length - 1; j >= 0; j--) {
      if (fixedLines[j].trim() && !fixedLines[j].trim().startsWith('--')) {
        fixedLines[j] = fixedLines[j].replace(/,\s*$/, '');
        break;
      }
    }
    skipComma = false;
    inTable = false;
  }
  
  fixedLines.push(line);
}

// Join lines and add indexes at the end (before triggers)
const triggerIndex = fixedLines.findIndex(line => 
  line.includes('Trigger to update updated_at timestamps')
);

if (triggerIndex > 0) {
  const beforeTriggers = fixedLines.slice(0, triggerIndex);
  const afterTriggers = fixedLines.slice(triggerIndex);
  
  const indexSection = [
    '',
    '-- ============================================================================',
    '-- Indexes (created separately for PostgreSQL compatibility)',
    '-- ============================================================================',
    '',
    ...indexes,
    ''
  ];
  
  const finalContent = [
    ...beforeTriggers,
    ...indexSection,
    ...afterTriggers
  ].join('\n');
  
  fs.writeFileSync(migrationPath, finalContent, 'utf-8');
  console.log(`✅ Fixed migration file with ${indexes.length} indexes`);
} else {
  console.error('❌ Could not find trigger section');
  process.exit(1);
}
