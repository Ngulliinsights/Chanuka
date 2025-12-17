#!/usr/bin/env node

/**
 * Validation script to test the functional validator setup
 * This script checks that all dependencies are available and the validator can run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validateSetup() {
  console.log('🔍 Validating Functional Validator Setup...\n');

  // Check if functional_validator.js exists
const validatorPath = path.join(path.dirname(__dirname), 'functional_validator.js');
if (!fs.existsSync(validatorPath)) {
  console.error('❌ functional_validator.js not found');
  process.exit(1);
}
console.log('✅ functional_validator.js found');

// Check if required dependencies are available
try {
  await import('@playwright/test');
  console.log('✅ Playwright dependency available');
} catch (error) {
  console.error('❌ Playwright not found. Run: npm install');
  process.exit(1);
}

try {
  await import('chalk');
  console.log('✅ Chalk dependency available');
} catch (error) {
  console.log('⚠️  Chalk not found (optional for colored output). Run: npm install chalk');
}

// Check if docs directory exists
const docsPath = path.join(path.dirname(__dirname), 'docs');
if (!fs.existsSync(docsPath)) {
  fs.mkdirSync(docsPath, { recursive: true });
  console.log('✅ Created docs directory');
} else {
  console.log('✅ Docs directory exists');
}

// Check npm scripts
const packageJsonPath = path.join(path.dirname(__dirname), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const requiredScripts = [
    'validate:functional',
    'validate:functional:debug',
    'validate:functional:parallel',
    'validate:functional:staging'
  ];
  
  let allScriptsPresent = true;
  for (const script of requiredScripts) {
    if (scripts[script]) {
      console.log(`✅ npm script '${script}' configured`);
    } else {
      console.error(`❌ npm script '${script}' missing`);
      allScriptsPresent = false;
    }
  }
  
  if (!allScriptsPresent) {
    console.error('\n❌ Some npm scripts are missing. Please check package.json');
    process.exit(1);
  }
} else {
  console.error('❌ package.json not found');
  process.exit(1);
}

  console.log('\n🎉 Functional Validator setup is complete!');
  console.log('\nTo use the validator:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Run validation: npm run validate:functional');
  console.log('3. Check the report in: docs/functional-validation.md');
}

// Run the validation
validateSetup().catch(error => {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
});