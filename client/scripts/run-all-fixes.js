#!/usr/bin/env node

/**
 * Master script to run all automated fixes
 * Executes all fix scripts in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');

// Import individual fix modules
const { removeUnusedImports } = require('./fix-unused-imports');
const { fixLucideIcons } = require('./fix-lucide-icons');
const { fixButtonVariants } = require('./fix-button-variants');
const { fixComponentProps } = require('./fix-component-props');

/**
 * Run a command and handle errors
 */
function runCommand(command, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.dirname(__dirname)
    });
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting automated client bug fixes...\n');
  console.log('This will fix the following issues:');
  console.log('  • Unused imports and variables');
  console.log('  • Missing/incorrect Lucide React icons');
  console.log('  • Button component variant issues');
  console.log('  • Component prop type mismatches');
  console.log('  • Code formatting\n');

  const startTime = Date.now();
  let totalFixed = 0;

  // Step 1: Fix unused imports (cleans up code first)
  console.log('📝 Step 1: Removing unused imports and variables...');
  try {
    const { getAllTsFiles } = require('./fix-unused-imports');
    const files = getAllTsFiles(path.join(__dirname, '../src'));
    let fixedCount = 0;

    for (const file of files) {
      if (removeUnusedImports(file)) {
        fixedCount++;
      }
    }

    console.log(`✅ Fixed unused imports in ${fixedCount} files`);
    totalFixed += fixedCount;
  } catch (error) {
    console.error('❌ Step 1 failed:', error.message);
  }

  // Step 2: Fix Lucide React icons
  console.log('\n🎨 Step 2: Fixing Lucide React icon imports...');
  try {
    const { getAllTsFiles } = require('./fix-lucide-icons');
    const files = getAllTsFiles(path.join(__dirname, '../src'));
    let fixedCount = 0;

    for (const file of files) {
      if (fixLucideIcons(file)) {
        fixedCount++;
      }
    }

    console.log(`✅ Fixed Lucide icons in ${fixedCount} files`);
    totalFixed += fixedCount;
  } catch (error) {
    console.error('❌ Step 2 failed:', error.message);
  }

  // Step 3: Fix Button variants
  console.log('\n🔘 Step 3: Fixing Button component variants...');
  try {
    const { getAllComponentFiles } = require('./fix-button-variants');
    const files = getAllComponentFiles(path.join(__dirname, '../src'));
    let fixedCount = 0;

    for (const file of files) {
      if (fixButtonVariants(file)) {
        fixedCount++;
      }
    }

    console.log(`✅ Fixed Button variants in ${fixedCount} files`);
    totalFixed += fixedCount;
  } catch (error) {
    console.error('❌ Step 3 failed:', error.message);
  }

  // Step 4: Fix component props
  console.log('\n⚙️  Step 4: Fixing component prop issues...');
  try {
    const { getAllComponentFiles } = require('./fix-component-props');
    const files = getAllComponentFiles(path.join(__dirname, '../src'));
    let fixedCount = 0;

    for (const file of files) {
      if (fixComponentProps(file)) {
        fixedCount++;
      }
    }

    console.log(`✅ Fixed component props in ${fixedCount} files`);
    totalFixed += fixedCount;
  } catch (error) {
    console.error('❌ Step 4 failed:', error.message);
  }

  // Step 5: Format code
  console.log('\n🎨 Step 5: Formatting code...');
  const formatSuccess = runCommand('npm run format', 'Code formatting');

  // Step 6: Run type check to see remaining issues
  console.log('\n🔍 Step 6: Running type check to verify fixes...');
  const typeCheckSuccess = runCommand('npm run type-check', 'TypeScript type checking');

  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 AUTOMATED FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total time: ${duration} seconds`);
  console.log(`📁 Total files fixed: ${totalFixed}`);
  console.log(`🎨 Code formatting: ${formatSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`🔍 Type checking: ${typeCheckSuccess ? '✅ Success' : '⚠️  Some issues remain'}`);

  if (!typeCheckSuccess) {
    console.log('\n📋 NEXT STEPS:');
    console.log('  • Review remaining TypeScript errors');
    console.log('  • Some complex issues may need manual fixes');
    console.log('  • Run individual fix scripts for specific issues');
    console.log('  • Check the build with: npm run build');
  }

  console.log('\n🚀 Automated fixes complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
c
