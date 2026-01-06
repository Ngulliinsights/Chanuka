#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Find all TypeScript/TSX files
const files = glob.sync('src/**/*.{ts,tsx}', { cwd: process.cwd() });

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Pattern to match malformed imports like:
  // import {
  // import React from 'react';
  const malformedImportPattern = /import\s*{\s*\nimport\s+React\s+from\s+['"]react['"];\s*\n/g;

  if (malformedImportPattern.test(content)) {
    console.log(`Fixing malformed imports in: ${file}`);

    // Fix the pattern by moving React import to the top
    content = content.replace(malformedImportPattern, 'import React from \'react\';\nimport {\n');

    fs.writeFileSync(filePath, content);
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files with malformed import statements.`);
