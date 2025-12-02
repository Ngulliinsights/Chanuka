#!/usr/bin/env node

import fs from 'fs';

function fixReturnStatements(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix return res.status patterns
    content = content.replace(/return res\.status\(/g, 'res.status(');
    
    // Add return statements after the response calls
    content = content.replace(
      /res\.status\(\d+\)\.json\({[\s\S]*?}\);(?!\s*return)/g,
      (match) => match + '\n            return;'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed return statements in: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Fix the analytics controller wrapper
fixReturnStatements('utils/analytics-controller-wrapper.ts');