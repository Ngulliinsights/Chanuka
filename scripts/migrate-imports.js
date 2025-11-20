#!/usr/bin/env node
/*
 Simple import migration script
 Replaces deep relative imports that target top-level folders with path aliases:
  - shared/* -> @shared/*
  - utils|core|types|hooks|features|components|store|services|pages|test-utils -> @client/<folder>/*

Run from project root: node scripts/migrate-imports.js
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['client', 'server', 'shared'];
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];

const clientTopLevel = new Set(['utils','core','types','hooks','features','components','store','services','pages','test-utils','lib']);

function isTextFile(file) {
  return EXTS.some(e => file.endsWith(e));
}

function migrateImportPath(importPath) {
  // Only handle relative imports
  if (!importPath.startsWith('.')) return null;

  // Normalize and split
  const parts = importPath.split('/').filter(Boolean);
  // Drop leading ../ or ./ segments
  let idx = 0;
  while (idx < parts.length && (parts[idx] === '.' || parts[idx] === '..')) idx++;
  if (idx >= parts.length) return null;

  const top = parts[idx];
  const rest = parts.slice(idx + 1).join('/');

  if (top === 'shared') {
    return rest ? `@shared/${rest}` : '@shared';
  }

  if (clientTopLevel.has(top)) {
    return rest ? `@client/${top}/${rest}` : `@client/${top}`;
  }

  return null;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updated = content;

  // Patterns: import ... from '...'; require('...'); import('...')
  const regex = /(import\s+[^'"\n]+from\s+|import\s*\(|require\()(['"])([^'"\)]+)\2/g;
  updated = updated.replace(regex, (m, pfx, quote, imp) => {
    const migrated = migrateImportPath(imp);
    if (migrated) {
      return m.replace(imp, migrated);
    }
    return m;
  });

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Updated imports in: ${path.relative(ROOT, filePath)}`);
  }
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build' || item === 'coverage') continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (stat.isFile() && isTextFile(full)) {
      processFile(full);
    }
  }
}

function main() {
  console.log('Starting import migration...');
  for (const d of SCAN_DIRS) {
    const full = path.join(ROOT, d);
    scanDir(full);
  }
  console.log('Migration complete.');
}

main();
